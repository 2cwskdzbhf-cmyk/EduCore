import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.user_type !== 'teacher')) {
      console.error('Unauthorized access attempt');
      return Response.json({ error: 'Unauthorized - Teacher access required' }, { status: 403 });
    }

    const body = await req.json();
    console.log('Request body:', JSON.stringify(body));
    
    const { lessonId, topicId, count = 15, difficulty = 'medium', types = ['fraction'], allowedForms = ['fraction', 'decimal', 'mixed', 'simplified'], regenerateIndex = null, regenerateFeedback = '' } = body;

    if (!lessonId && !topicId) {
      console.error('Missing lessonId and topicId');
      return Response.json({ error: 'Either lessonId or topicId required' }, { status: 400 });
    }

    console.log(`Generating ${count} questions for ${lessonId ? 'lesson:' + lessonId : 'topic:' + topicId}`);

    // Fetch context
    let lessonContext = '';
    let topicContext = '';
    let targetLessonId = lessonId;
    let targetTopicId = topicId;

    if (lessonId) {
      const lessons = await base44.asServiceRole.entities.Lesson.filter({ id: lessonId });
      if (lessons.length > 0) {
        const lesson = lessons[0];
        lessonContext = lesson.content || lesson.title || '';
        targetTopicId = lesson.topic_id;
        
        const topics = await base44.asServiceRole.entities.Topic.filter({ id: targetTopicId });
        if (topics.length > 0) {
          topicContext = topics[0].name || '';
        }
      }
    } else if (topicId) {
      const topics = await base44.asServiceRole.entities.Topic.filter({ id: topicId });
      if (topics.length > 0) {
        topicContext = topics[0].name || '';
      }
    }

    const generatePrompt = (index = null) => {
      const base = `You are a mathematics teacher creating practice questions.
Topic: ${topicContext}
${lessonContext ? `Lesson content: ${lessonContext.substring(0, 500)}` : ''}

Generate ${regenerateIndex !== null ? '1' : count} typed-answer maths questions suitable for students.
Question types: ${types.join(', ')}
Difficulty: ${difficulty}
Allowed answer forms: ${allowedForms.join(', ')}

${regenerateFeedback ? `IMPORTANT FEEDBACK: ${regenerateFeedback}\n` : ''}

Return ONLY valid JSON array (no markdown, no explanation):
[{
  "prompt": "Clear question text",
  "correct_answer": "Answer in simplest form (e.g., 1/2, not 2/4)",
  "allowed_forms": ["fraction", "decimal"],
  "difficulty": "easy|medium|hard",
  "explanation": "Step-by-step solution",
  "type": "fraction|percentage|ratio|algebra|indices"
}]

Rules:
- Use simple numbers (avoid large numbers)
- Ensure all fractions are valid (denominator ≠ 0)
- Answers must be mathematically correct
- Use clear, unambiguous language
- For fractions, always simplify the correct_answer`;

      return base;
    };

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      console.error('OPENAI_API_KEY not configured');
      return Response.json({ error: 'OPENAI_API_KEY not configured. Please set it in dashboard settings.' }, { status: 500 });
    }
    
    console.log('OpenAI API key found, proceeding with generation...');

    let attempts = 0;
    let questions = [];

    while (attempts < 3 && questions.length === 0) {
      attempts++;
      console.log(`Generation attempt ${attempts}/3...`);
      
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
            { role: 'user', content: generatePrompt() }
          ],
          temperature: 0.7,
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`OpenAI API error (${response.status}):`, errorText);
        
        if (response.status === 401) {
          return Response.json({ error: 'Invalid OpenAI API key. Please check your OPENAI_API_KEY in settings.' }, { status: 500 });
        } else if (response.status === 429) {
          return Response.json({ error: 'OpenAI rate limit exceeded. Please try again in a few moments.' }, { status: 500 });
        }
        
        throw new Error(`OpenAI API error (${response.status}): ${errorText.substring(0, 200)}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      console.log('OpenAI response received, parsing...');
      
      try {
        const parsed = JSON.parse(content);
        console.log('Parsed response:', JSON.stringify(parsed).substring(0, 200));
        
        const questionArray = parsed.questions || parsed.items || (Array.isArray(parsed) ? parsed : []);
        
        if (Array.isArray(questionArray)) {
          // Validate each question
          questions = questionArray.filter(q => {
            if (!q.prompt || !q.correct_answer) {
              console.log('Invalid question - missing prompt or answer:', q);
              return false;
            }
            
            // Basic fraction validation
            if (q.correct_answer.includes('/')) {
              const parts = q.correct_answer.split('/');
              if (parts.length === 2) {
                const den = parseInt(parts[1]);
                if (den === 0 || isNaN(den)) {
                  console.log('Invalid fraction - zero denominator:', q.correct_answer);
                  return false;
                }
              }
            }
            
            return true;
          }).slice(0, count);
          
          console.log(`Valid questions after filtering: ${questions.length}`);
        } else {
          console.error('Response not an array:', typeof questionArray);
        }
      } catch (e) {
        console.error('Parse error on attempt', attempts, ':', e.message);
      }
    }

    if (questions.length === 0) {
      console.error('No valid questions generated after 3 attempts');
      return Response.json({ 
        error: 'Failed to generate valid questions after 3 attempts. The AI may have returned invalid data. Please try again with different parameters.',
        attempts
      }, { status: 500 });
    }

    console.log(`Successfully generated ${questions.length} questions`);
    return Response.json({ 
      success: true, 
      questions,
      lessonId: targetLessonId,
      topicId: targetTopicId
    });
  } catch (error) {
    console.error('Unhandled error in generateQuestionsAI:', error);
    return Response.json({ 
      error: error.message || 'Unknown error occurred',
      details: error.stack?.substring(0, 300)
    }, { status: 500 });
  }
});