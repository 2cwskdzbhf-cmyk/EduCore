import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const QUESTION_POOL = {
  fractions: [
    { prompt: 'Simplify 6/8', answer: '3/4' },
    { prompt: 'Simplify 10/15', answer: '2/3' },
    { prompt: 'Add 1/2 + 1/4', answer: '3/4' },
    { prompt: 'Add 1/3 + 1/3', answer: '2/3' },
    { prompt: 'Subtract 3/4 - 1/4', answer: '1/2' },
    { prompt: 'Multiply 1/2 × 2/3', answer: '1/3' },
    { prompt: 'Multiply 1/2 × 3/4', answer: '3/8' },
    { prompt: 'Divide 1/2 ÷ 1/4', answer: '2' },
    { prompt: '1/2 = ?/10', answer: '5' },
    { prompt: '2/5 = ?/10', answer: '4' },
    { prompt: 'Convert 1/2 to decimal', answer: '0.5' },
    { prompt: 'Convert 3/4 to decimal', answer: '0.75' },
    { prompt: 'Convert 1/5 to decimal', answer: '0.2' },
    { prompt: 'Order from smallest: 1/4, 1/2, 3/4', answer: '1/4, 1/2, 3/4' },
    { prompt: 'Is 2/6 equivalent to 1/3?', answer: 'Yes' }
  ],
  decimals: [
    { prompt: 'Round 3.456 to 1 decimal place', answer: '3.5' },
    { prompt: 'Add 1.5 + 2.3', answer: '3.8' },
    { prompt: 'Subtract 5.7 - 2.3', answer: '3.4' },
    { prompt: 'Multiply 2.5 × 4', answer: '10' },
    { prompt: 'Divide 6.4 ÷ 2', answer: '3.2' },
    { prompt: 'What is 0.25 × 100?', answer: '25' },
    { prompt: 'What is 0.5 × 100?', answer: '50' },
    { prompt: 'Order: 0.3, 0.5, 0.2', answer: '0.2, 0.3, 0.5' },
    { prompt: 'Is 0.25 less than 0.3?', answer: 'Yes' },
    { prompt: 'Convert 0.75 to a fraction', answer: '3/4' },
    { prompt: 'Add 3.2 + 1.8', answer: '5' },
    { prompt: 'Subtract 8.4 - 3.2', answer: '5.2' },
    { prompt: 'Multiply 3.2 × 2', answer: '6.4' },
    { prompt: 'Divide 9.6 ÷ 3', answer: '3.2' },
    { prompt: 'Round 7.832 to 1 decimal place', answer: '7.8' }
  ],
  percentages: [
    { prompt: 'What is 25% of 100?', answer: '25' },
    { prompt: 'What is 50% of 200?', answer: '100' },
    { prompt: 'What is 10% of 50?', answer: '5' },
    { prompt: 'What is 20% of 80?', answer: '16' },
    { prompt: 'Convert 1/2 to a percentage', answer: '50' },
    { prompt: 'Convert 1/4 to a percentage', answer: '25' },
    { prompt: 'Convert 3/4 to a percentage', answer: '75' },
    { prompt: 'Convert 1/5 to a percentage', answer: '20' },
    { prompt: 'Convert 50% to a fraction', answer: '1/2' },
    { prompt: 'Convert 25% to a fraction', answer: '1/4' },
    { prompt: 'Increase 100 by 10%', answer: '110' },
    { prompt: 'Increase 80 by 20%', answer: '96' },
    { prompt: 'Decrease 100 by 10%', answer: '90' },
    { prompt: 'Decrease 80 by 20%', answer: '64' },
    { prompt: 'Which is larger: 40% or 45%?', answer: '45%' }
  ]
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.user_type !== 'admin')) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { lessonId, type = 'fractions' } = body;

    if (!lessonId) {
      return Response.json({ error: 'lessonId required' }, { status: 400 });
    }

    const questions = QUESTION_POOL[type] || QUESTION_POOL.fractions;
    
    // Get lesson to find topic
    const lessons = await base44.entities.Lesson.filter({ id: lessonId });
    const lesson = lessons[0];
    if (!lesson) {
      return Response.json({ error: 'Lesson not found' }, { status: 404 });
    }

    // Build questions array
    const questionsToCreate = questions.map((q, idx) => ({
      subject_id: '',
      topic_id: lesson.topic_id,
      lesson_id: lessonId,
      type,
      prompt: q.prompt,
      correct_answer: q.answer,
      allowed_forms: ['fraction', 'decimal', 'integer', 'string'],
      difficulty: idx < 5 ? 'easy' : idx < 10 ? 'medium' : 'hard',
      tags: [type],
      explanation: '',
      teacher_email: user.email,
      is_active: true
    }));

    await base44.entities.QuestionBankItem.bulkCreate(questionsToCreate);

    return Response.json({
      success: true,
      lessonId,
      questionCount: questionsToCreate.length
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});