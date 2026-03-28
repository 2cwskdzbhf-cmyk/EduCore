import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.user_type !== 'teacher')) {
      return Response.json({ error: 'Unauthorized - Teacher access required' }, { status: 403 });
    }

    const body = await req.json();
    const { lessonId, topicId, count = 10, difficulty = 'medium', regenerateFeedback = '' } = body;

    if (!topicId) {
      return Response.json({ error: 'topicId required' }, { status: 400 });
    }

    console.log(`Generating ${count} live quiz questions for topic:${topicId}`);

    // Fetch context
    let lessonContext = '';
    let topicContext = '';

    if (lessonId) {
      const lessons = await base44.asServiceRole.entities.Lesson.filter({ id: lessonId });
      if (lessons.length > 0) {
        const lesson = lessons[0];
        // Limit to 500 chars to reduce tokens
        lessonContext = (lesson.content || lesson.title || '').substring(0, 500);
      }
    }
    
    if (topicId) {
      const topics = await base44.asServiceRole.entities.Topic.filter({ id: topicId });
      if (topics.length > 0) {
        topicContext = topics[0].name || '';
      }
    }

    const prompt = `Create ${count} live quiz questions.
Topic: ${topicContext}
${lessonContext ? `Context: ${lessonContext}` : ''}
Difficulty: ${difficulty}
${regenerateFeedback ? `Feedback: ${regenerateFeedback}` : ''}

Return valid JSON:
{
  "questions": [
    {
      "prompt": "Question",
      "correct_answer": "Simplified answer",
      "allowed_forms": ["fraction", "decimal"],
      "difficulty": "${difficulty}",
      "explanation": "Solution",
      "type": "fraction",
      "hint": "Optional"
    }
  ]
}

Rules:
- Simple numbers
- Fractions simplified, no zero denominators
- Clear questions`;

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      console.error('OPENAI_API_KEY not set');
      return Response.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
    }

    console.log('Making SINGLE OpenAI API call to generate ALL questions...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a helpful mathematics teacher. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorJson = null;
      try {
        errorJson = JSON.parse(errorText);
      } catch (e) {}
      
      console.error(`OpenAI error (${response.status}):`, errorText);
      
      if (response.status === 401) {
        return Response.json({ error: 'Invalid OpenAI API key' }, { status: 500 });
      } else if (response.status === 429) {
        const errorType = errorJson?.error?.type || 'rate_limit';
        if (errorType === 'insufficient_quota') {
          console.error('Insufficient quota error');
          return Response.json({ error: 'No OpenAI quota available on this key. Add credits or use a different key.' }, { status: 429 });
        }
        console.error('Rate limit hit');
        return Response.json({ error: 'Rate limit exceeded. The AI is busy right now.' }, { status: 429 });
      } else if (response.status === 404) {
        console.error('Model not found');
        return Response.json({ error: 'AI model unavailable. Contact support.' }, { status: 500 });
      }
      
      return Response.json({ error: `OpenAI API error: ${response.status}` }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const parsed = JSON.parse(content);
    
    let questions = parsed.questions || parsed.items || (Array.isArray(parsed) ? parsed : []);
    
    // Validate
    questions = questions.filter(q => {
      if (!q.prompt || !q.correct_answer) return false;
      if (q.correct_answer.includes('/')) {
        const parts = q.correct_answer.split('/');
        if (parts.length === 2 && (parseInt(parts[1]) === 0 || isNaN(parseInt(parts[1])))) {
          return false;
        }
      }
      return true;
    }).slice(0, count);

    if (questions.length === 0) {
      console.error('No valid questions generated');
      return Response.json({ error: 'No valid questions generated. Try again.' }, { status: 500 });
    }

    console.log(`✓ Successfully generated ${questions.length} questions in ONE API call`);
    return Response.json({ success: true, questions });
  } catch (error) {
    console.error('Error in generateLiveQuizQuestionsAI:', error);
    return Response.json({ error: error.message || 'Failed to generate questions' }, { status: 500 });
  }
});