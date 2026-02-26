import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { materialUrl, materialType, questionCount = 5, difficulty = 'medium', topicId } = await req.json();

    if (!materialUrl) {
      return Response.json({ error: 'Material URL is required' }, { status: 400 });
    }

    // Fetch the material content
    let materialContent = '';
    
    if (materialType === 'text' || materialType === 'pdf' || materialType === 'document') {
      // For documents, extract text first
      const extractResponse = await base44.integrations.Core.InvokeLLM({
        prompt: `Extract and summarize the key learning points from this document. Focus on factual information, concepts, definitions, and important details that could be tested.`,
        file_urls: [materialUrl]
      });
      materialContent = extractResponse;
    } else {
      // For plain text or other formats
      const response = await fetch(materialUrl);
      materialContent = await response.text();
    }

    // Generate questions using AI
    const prompt = `Based on the following learning material, generate ${questionCount} multiple-choice quiz questions at ${difficulty} difficulty level.

Material:
${materialContent.substring(0, 3000)}

For each question, provide:
1. A clear, specific question prompt
2. Four answer options (labeled A, B, C, D)
3. The correct answer (specify which option)
4. A brief explanation of why that answer is correct

Format your response as a JSON array with this structure:
[
  {
    "prompt": "question text",
    "options": ["option A", "option B", "option C", "option D"],
    "correct_index": 0,
    "explanation": "why this is correct",
    "difficulty": "${difficulty}"
  }
]

Make questions that test understanding, not just memorization. Ensure all options are plausible.`;

    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt,
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

    const questions = aiResponse.questions || [];

    return Response.json({
      success: true,
      questions: questions.map(q => ({
        prompt: q.prompt,
        question_type: 'multiple_choice',
        options: q.options,
        correct_index: q.correct_index,
        correct_answer: q.options[q.correct_index],
        difficulty: q.difficulty || difficulty,
        explanation: q.explanation,
        tags: [],
        topic_id: topicId || null
      })),
      count: questions.length
    });

  } catch (error) {
    console.error('[GENERATE_QUESTIONS_ERROR]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});