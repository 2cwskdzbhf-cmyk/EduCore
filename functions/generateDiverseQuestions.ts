import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import OpenAI from 'npm:openai';

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text, topic, questionTypes, count } = await req.json();

    if (!text && !topic) {
      return Response.json({ error: 'Text or topic required' }, { status: 400 });
    }

    const typesRequested = questionTypes || ['multiple_choice', 'matching', 'ordering', 'fill_in_blank'];
    const questionsPerType = Math.ceil((count || 10) / typesRequested.length);

    const prompt = `Generate ${questionsPerType} questions for each of these types: ${typesRequested.join(', ')}.

Content: ${text || `Topic: ${topic}`}

For each question type, follow these formats:

MULTIPLE_CHOICE:
{
  "type": "multiple_choice",
  "question": "Question text",
  "options": ["A", "B", "C", "D"],
  "correct_answer": "B",
  "explanation": "Why this is correct"
}

MATCHING:
{
  "type": "matching",
  "question": "Match the following",
  "pairs": [
    {"left": "Item 1", "right": "Match 1"},
    {"left": "Item 2", "right": "Match 2"}
  ],
  "explanation": "Explanation of matches"
}

ORDERING:
{
  "type": "ordering",
  "question": "Arrange in correct order",
  "items": ["Step 1", "Step 2", "Step 3", "Step 4"],
  "correct_order": [0, 1, 2, 3],
  "explanation": "Why this order"
}

FILL_IN_BLANK:
{
  "type": "fill_in_blank",
  "question": "Complete: The ____ is the powerhouse of the cell.",
  "answer": "mitochondria",
  "acceptable_answers": ["mitochondria", "mitochondrion"],
  "explanation": "Explanation"
}

Return ONLY a JSON array of questions, no other text.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert educator creating diverse, engaging questions. Return ONLY valid JSON array."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.8
    });

    const content = response.choices[0].message.content.trim();
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    const questions = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);

    return Response.json({ questions });
  } catch (error) {
    console.error('[ERROR]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});