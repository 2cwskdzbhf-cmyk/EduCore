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
        lessonContext = lessons[0].content || lessons[0].title || '';
      }
    }
    
    if (topicId) {
      const topics = await base44.asServiceRole.entities.Topic.filter({ id: topicId });
      if (topics.length > 0) {
        topicContext = topics[0].name || '';
      }
    }

    const prompt = `You are a mathematics teacher creating ${count} live quiz questions for students.
Topic: ${topicContext}
${lessonContext ? `Lesson: ${lessonContext.substring(0, 800)}` : ''}

Difficulty: ${difficulty}
${regenerateFeedback ? `TEACHER FEEDBACK: ${regenerateFeedback}\n` : ''}

Generate ${count} typed-answer or short-answer questions (NOT multiple choice).
Return ONLY a valid JSON object with a "questions" array:

{
  "questions": [
    {
      "prompt": "Clear question text",
      "correct_answer": "Answer in simplest form",
      "allowed_forms": ["fraction", "decimal", "simplified"],
      "difficulty": "easy|medium|hard",
      "explanation": "Step-by-step solution",
      "type": "fraction|percentage|ratio|algebra|indices",
      "hint": "Optional hint"
    }
  ]
}

RULES:
- Use simple numbers, avoid complex calculations
- Ensure all answers are mathematically correct
- For fractions: always simplify, no zero denominators
- Clear, unambiguous questions
- Provide helpful explanations`;

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      console.error('OPENAI_API_KEY not set');
      return Response.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
    }

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
      console.error(`OpenAI error (${response.status}):`, errorText);
      
      if (response.status === 401) {
        return Response.json({ error: 'Invalid OpenAI API key' }, { status: 500 });
      } else if (response.status === 429) {
        return Response.json({ error: 'Rate limit exceeded. Try again in a moment.' }, { status: 500 });
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
      return Response.json({ error: 'No valid questions generated. Please try again.' }, { status: 500 });
    }

    console.log(`Generated ${questions.length} valid questions`);
    return Response.json({ success: true, questions });
  } catch (error) {
    console.error('Error in generateLiveQuizQuestionsAI:', error);
    return Response.json({ error: error.message || 'Failed to generate questions' }, { status: 500 });
  }
});