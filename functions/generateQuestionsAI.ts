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

    // Fetch context (limit to reduce tokens)
    let lessonContext = '';
    let topicContext = '';
    let targetLessonId = lessonId;
    let targetTopicId = topicId;

    if (lessonId) {
      const lessons = await base44.asServiceRole.entities.Lesson.filter({ id: lessonId });
      if (lessons.length > 0) {
        const lesson = lessons[0];
        lessonContext = (lesson.content || lesson.title || '').substring(0, 500);
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

    const generatePrompt = () => {
      const typesList = types.join(', ');
      
      return `Create ${count} math questions.
Topic: ${topicContext}
${lessonContext ? `Context: ${lessonContext}` : ''}
Types: ${typesList}
Difficulty: ${difficulty}
${regenerateFeedback ? `Feedback: ${regenerateFeedback}` : ''}

Return valid JSON:
{
  "questions": [
    {
      "prompt": "Question text",
      "correct_answer": "Simplified answer",
      "allowed_forms": ${JSON.stringify(allowedForms)},
      "difficulty": "${difficulty}",
      "explanation": "Solution steps",
      "type": "${types[0]}",
      "hint": "Optional"
    }
  ]
}

Rules:
- Simple numbers only
- Fractions simplified, no zero denominators
- Clear questions`;
    };

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      console.error('OPENAI_API_KEY not configured');
      return Response.json({ error: 'OPENAI_API_KEY not configured. Please set it in dashboard settings.' }, { status: 500 });
    }
    
    console.log('OpenAI API key found, proceeding with generation...');

    console.log('Making SINGLE OpenAI API call to generate ALL questions...');
    
    const makeOpenAICall = async (attemptNum) => {
      const backoffMs = attemptNum > 1 ? Math.pow(2, attemptNum - 1) * 1000 : 0;
      if (backoffMs > 0) {
        console.log(`Waiting ${backoffMs}ms before retry ${attemptNum}...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
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
            { role: 'user', content: generatePrompt() }
          ],
          temperature: 0.7,
          response_format: { type: 'json_object' }
        })
      });

      return response;
    };

    let questions = [];
    let lastError = null;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`Generation attempt ${attempt}/3...`);
      
      try {
        const response = await makeOpenAICall(attempt);

        if (!response.ok) {
          const errorText = await response.text();
          let errorJson = null;
          try {
            errorJson = JSON.parse(errorText);
          } catch (e) {}
          
          console.error(`OpenAI API error (${response.status}):`, errorText);
          
          if (response.status === 401) {
            return Response.json({ 
              error: 'Invalid OpenAI API key. Check settings.',
              code: 'invalid_api_key'
            }, { status: 500 });
          } else if (response.status === 429) {
            const errorType = errorJson?.error?.type || 'rate_limit';
            if (errorType === 'insufficient_quota') {
              console.error('Insufficient quota error');
              return Response.json({ 
                error: 'No OpenAI quota available on this key. Please add credits or use a different key.',
                code: 'insufficient_quota'
              }, { status: 429 });
            }
            console.error('Rate limit hit - attempt', attempt);
            lastError = { error: 'Rate limit exceeded. The AI is busy right now.', code: 'rate_limit' };
            if (attempt === 3) {
              return Response.json(lastError, { status: 429 });
            }
            continue;
          } else if (response.status === 404) {
            console.error('Model not found error');
            return Response.json({ 
              error: 'AI model unavailable. Please contact support.',
              code: 'model_not_found'
            }, { status: 500 });
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
            
            if (questions.length > 0) {
              break; // Success - exit retry loop
            }
          } else {
            console.error('Response not an array:', typeof questionArray);
          }
        } catch (e) {
          console.error('Parse error on attempt', attempt, ':', e.message);
          lastError = { error: 'Failed to parse AI response. Try again.', code: 'parse_error' };
        }
      } catch (error) {
        console.error('Request error on attempt', attempt, ':', error.message);
        lastError = { error: error.message, code: 'request_error' };
      }
    }

    if (questions.length === 0) {
      console.error('No valid questions generated after 3 attempts');
      const errorMsg = lastError?.error || 'Failed to generate valid questions after 3 attempts. Try again.';
      return Response.json({ 
        error: errorMsg,
        code: lastError?.code || 'generation_failed',
        attempts: 3
      }, { status: 500 });
    }

    console.log(`✓ Successfully generated ${questions.length} questions in ONE API call`);
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