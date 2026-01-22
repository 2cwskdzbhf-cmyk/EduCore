import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lessonId, count = 5, difficulty = 'medium' } = await req.json();

    if (!lessonId) {
      return Response.json({ error: 'lessonId required' }, { status: 400 });
    }

    // Get lesson content
    const lessons = await base44.entities.Lesson.filter({ id: lessonId });
    const lesson = lessons[0];

    if (!lesson) {
      return Response.json({ error: 'Lesson not found' }, { status: 404 });
    }

    // Use AI to generate questions
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate ${count} multiple choice questions from this lesson content. 
      
Lesson: ${lesson.title}
Content: ${lesson.content}

Difficulty: ${difficulty}

Generate exactly ${count} questions with 4 answer options each. Make them clear, educational, and appropriate for the difficulty level.

Return as JSON array with this structure:
[
  {
    "prompt": "Question text?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_index": 0,
    "explanation": "Brief explanation of the answer",
    "difficulty": "${difficulty}"
  }
]`,
      response_json_schema: {
        type: "object",
        properties: {
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                prompt: { type: "string" },
                options: { type: "array", items: { type: "string" } },
                correct_index: { type: "number" },
                explanation: { type: "string" },
                difficulty: { type: "string" }
              }
            }
          }
        }
      }
    });

    return Response.json({ 
      questions: response.questions || [],
      lessonTitle: lesson.title 
    });

  } catch (error) {
    console.error('Generate questions error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});