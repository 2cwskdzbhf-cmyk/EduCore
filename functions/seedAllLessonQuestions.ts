import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin only
    if (!user || (user.role !== 'admin' && user.user_type !== 'admin')) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all lessons
    let allLessons = await base44.entities.Lesson.list();
    if (!allLessons) allLessons = [];
    
    if (allLessons.length === 0) {
      return Response.json({ 
        success: true,
        error: 'No lessons found',
        totalLessons: 0,
        totalQuestionsCreated: 0,
        lessonStats: []
      }, { status: 200 });
    }

    // Get all topics for mapping
    let allTopics = await base44.entities.Topic.list();
    if (!allTopics) allTopics = [];
    
    const topicMap = {};
    for (let i = 0; i < allTopics.length; i++) {
      topicMap[allTopics[i].id] = allTopics[i];
    }

    let totalCreated = 0;
    const lessonStats = [];

    // Seeding templates
    const questionTemplates = {
      fractions: [
        { prompt: 'Simplify 6/8', answer: '3/4', explanation: 'Divide by 2' },
        { prompt: 'Simplify 10/15', answer: '2/3', explanation: 'Divide by 5' },
        { prompt: 'Add 1/2 + 1/4', answer: '3/4', explanation: '2/4 + 1/4 = 3/4' },
        { prompt: 'Add 1/3 + 1/3', answer: '2/3', explanation: 'Same denominator' },
        { prompt: 'Subtract 3/4 - 1/4', answer: '1/2', explanation: '(3-1)/4 = 2/4 = 1/2' },
        { prompt: 'Multiply 1/2 × 2/3', answer: '1/3', explanation: '(1×2)/(2×3) = 2/6 = 1/3' },
        { prompt: 'Multiply 1/2 × 3/4', answer: '3/8', explanation: '(1×3)/(2×4) = 3/8' },
        { prompt: 'Divide 1/2 ÷ 1/4', answer: '2', explanation: '1/2 × 4/1 = 4/2 = 2' },
        { prompt: '1/2 = ?/10', answer: '5', explanation: 'Multiply numerator and denominator by 5' },
        { prompt: '2/5 = ?/10', answer: '4', explanation: 'Multiply by 2' },
        { prompt: 'Convert 1/2 to decimal', answer: '0.5', explanation: '1 ÷ 2 = 0.5' },
        { prompt: 'Convert 3/4 to decimal', answer: '0.75', explanation: '3 ÷ 4 = 0.75' },
        { prompt: 'Convert 1/5 to decimal', answer: '0.2', explanation: '1 ÷ 5 = 0.2' },
        { prompt: 'Order from smallest: 1/4, 1/2, 3/4', answer: '1/4, 1/2, 3/4', explanation: '0.25, 0.5, 0.75' },
        { prompt: 'Is 2/6 equivalent to 1/3?', answer: 'Yes', explanation: 'Both equal 1/3 when simplified' }
      ],
      decimals: [
        { prompt: 'Round 3.456 to 1 decimal place', answer: '3.5', explanation: '3.456 → 3.5' },
        { prompt: 'Round 7.832 to 1 decimal place', answer: '7.8', explanation: '7.832 → 7.8' },
        { prompt: 'Add 1.5 + 2.3', answer: '3.8', explanation: '1.5 + 2.3 = 3.8' },
        { prompt: 'Add 3.2 + 1.8', answer: '5', explanation: '3.2 + 1.8 = 5.0' },
        { prompt: 'Subtract 5.7 - 2.3', answer: '3.4', explanation: '5.7 - 2.3 = 3.4' },
        { prompt: 'Subtract 8.4 - 3.2', answer: '5.2', explanation: '8.4 - 3.2 = 5.2' },
        { prompt: 'Multiply 2.5 × 4', answer: '10', explanation: '2.5 × 4 = 10' },
        { prompt: 'Multiply 3.2 × 2', answer: '6.4', explanation: '3.2 × 2 = 6.4' },
        { prompt: 'Divide 6.4 ÷ 2', answer: '3.2', explanation: '6.4 ÷ 2 = 3.2' },
        { prompt: 'Divide 9.6 ÷ 3', answer: '3.2', explanation: '9.6 ÷ 3 = 3.2' },
        { prompt: 'What is 0.25 × 100?', answer: '25', explanation: '0.25 = 25%' },
        { prompt: 'What is 0.5 × 100?', answer: '50', explanation: '0.5 = 50%' },
        { prompt: 'Order: 0.3, 0.5, 0.2', answer: '0.2, 0.3, 0.5', explanation: 'From smallest to largest' },
        { prompt: 'Is 0.25 less than 0.3?', answer: 'Yes', explanation: '0.25 < 0.3' },
        { prompt: 'Convert 0.75 to a fraction', answer: '3/4', explanation: '0.75 = 75/100 = 3/4' }
      ],
      percentages: [
        { prompt: 'What is 25% of 100?', answer: '25', explanation: '25/100 × 100 = 25' },
        { prompt: 'What is 50% of 200?', answer: '100', explanation: '50/100 × 200 = 100' },
        { prompt: 'What is 10% of 50?', answer: '5', explanation: '10/100 × 50 = 5' },
        { prompt: 'What is 20% of 80?', answer: '16', explanation: '20/100 × 80 = 16' },
        { prompt: 'Convert 1/2 to a percentage', answer: '50', explanation: '1/2 = 50%' },
        { prompt: 'Convert 1/4 to a percentage', answer: '25', explanation: '1/4 = 25%' },
        { prompt: 'Convert 3/4 to a percentage', answer: '75', explanation: '3/4 = 75%' },
        { prompt: 'Convert 1/5 to a percentage', answer: '20', explanation: '1/5 = 20%' },
        { prompt: 'Convert 50% to a fraction', answer: '1/2', explanation: '50% = 50/100 = 1/2' },
        { prompt: 'Convert 25% to a fraction', answer: '1/4', explanation: '25% = 25/100 = 1/4' },
        { prompt: 'Increase 100 by 10%', answer: '110', explanation: '100 + (10% of 100) = 110' },
        { prompt: 'Increase 80 by 20%', answer: '96', explanation: '80 + (20% of 80) = 96' },
        { prompt: 'Decrease 100 by 10%', answer: '90', explanation: '100 - (10% of 100) = 90' },
        { prompt: 'Decrease 80 by 20%', answer: '64', explanation: '80 - (20% of 80) = 64' },
        { prompt: 'Which is larger: 40% or 45%?', answer: '45%', explanation: '45% > 40%' }
      ],
      ratio: [
        { prompt: 'Simplify the ratio 6:8', answer: '3:4', explanation: 'Divide by 2' },
        { prompt: 'Simplify the ratio 10:15', answer: '2:3', explanation: 'Divide by 5' },
        { prompt: 'Simplify the ratio 4:6', answer: '2:3', explanation: 'Divide by 2' },
        { prompt: 'If the ratio is 2:3, what is it when scaled by 2?', answer: '4:6', explanation: 'Multiply both by 2' },
        { prompt: 'If the ratio is 3:4, what is it when scaled by 3?', answer: '9:12', explanation: 'Multiply both by 3' },
        { prompt: 'Share 100 in the ratio 1:1. First share?', answer: '50', explanation: '100 ÷ 2 = 50' },
        { prompt: 'Share 100 in the ratio 2:1. First share?', answer: '66.67', explanation: '2/(2+1) × 100 ≈ 67' },
        { prompt: 'Share 100 in the ratio 3:2. First share?', answer: '60', explanation: '3/(3+2) × 100 = 60' },
        { prompt: 'Is the ratio 4:6 equivalent to 2:3?', answer: 'Yes', explanation: 'Both simplify to 2:3' },
        { prompt: 'Is the ratio 3:5 equivalent to 6:10?', answer: 'Yes', explanation: 'Multiply first by 2' },
        { prompt: 'If ratio is 1:2 and first part is 5, second part is?', answer: '10', explanation: '1:2 means second is double' },
        { prompt: 'If ratio is 2:3 and first part is 8, second part is?', answer: '12', explanation: '8 ÷ 2 = 4, so 4 × 3 = 12' },
        { prompt: 'Simplify 12:18:30', answer: '2:3:5', explanation: 'Divide by 6' },
        { prompt: 'What does ratio 5:2 mean?', answer: '5/2', explanation: 'First is 2.5 times the second' },
        { prompt: 'The ratio of boys to girls is 3:2. If there are 12 boys, how many girls?', answer: '8', explanation: '3:2, 12:x → x=8' }
      ],
      algebra: [
        { prompt: 'Solve: 2x = 10', answer: '5', explanation: 'x = 10 ÷ 2 = 5' },
        { prompt: 'Solve: 3x = 15', answer: '5', explanation: 'x = 15 ÷ 3 = 5' },
        { prompt: 'Solve: 5x = 25', answer: '5', explanation: 'x = 25 ÷ 5 = 5' },
        { prompt: 'Solve: 4x = 12', answer: '3', explanation: 'x = 12 ÷ 4 = 3' },
        { prompt: 'If x = 2, find 3x + 1', answer: '7', explanation: '3(2) + 1 = 7' },
        { prompt: 'If x = 3, find 2x + 5', answer: '11', explanation: '2(3) + 5 = 11' },
        { prompt: 'If x = 4, find 5x - 3', answer: '17', explanation: '5(4) - 3 = 17' },
        { prompt: 'If x = 2, find x² + 1', answer: '5', explanation: '2² + 1 = 5' },
        { prompt: 'Expand: 2(x + 3)', answer: '2x + 6', explanation: 'Distribute the 2' },
        { prompt: 'Expand: 3(x + 4)', answer: '3x + 12', explanation: 'Distribute the 3' },
        { prompt: 'Simplify: 3x + 2x', answer: '5x', explanation: 'Combine like terms' },
        { prompt: 'Simplify: 5x - 2x + 3', answer: '3x + 3', explanation: 'Combine like terms' },
        { prompt: 'Simplify: 4x + 1 - 2x', answer: '2x + 1', explanation: 'Combine 4x and -2x' },
        { prompt: 'Factor: 2x + 4', answer: '2(x + 2)', explanation: 'Common factor is 2' },
        { prompt: 'Solve: x + 5 = 12', answer: '7', explanation: 'x = 12 - 5 = 7' }
      ],
      indices: [
        { prompt: 'Calculate: 2²', answer: '4', explanation: '2 × 2 = 4' },
        { prompt: 'Calculate: 2³', answer: '8', explanation: '2 × 2 × 2 = 8' },
        { prompt: 'Calculate: 3²', answer: '9', explanation: '3 × 3 = 9' },
        { prompt: 'Calculate: 4²', answer: '16', explanation: '4 × 4 = 16' },
        { prompt: 'Calculate: 5²', answer: '25', explanation: '5 × 5 = 25' },
        { prompt: 'Calculate: 10²', answer: '100', explanation: '10 × 10 = 100' },
        { prompt: 'Calculate: 2⁴', answer: '16', explanation: '2 × 2 × 2 × 2 = 16' },
        { prompt: 'Calculate: √4', answer: '2', explanation: 'Square root of 4 is 2' },
        { prompt: 'Calculate: √9', answer: '3', explanation: 'Square root of 9 is 3' },
        { prompt: 'Calculate: √16', answer: '4', explanation: 'Square root of 16 is 4' },
        { prompt: 'Calculate: √25', answer: '5', explanation: 'Square root of 25 is 5' },
        { prompt: 'Calculate: 3⁰', answer: '1', explanation: 'Any number to power 0 is 1' },
        { prompt: 'Simplify: 2³ × 2²', answer: '2⁵', explanation: 'Add exponents: 3 + 2 = 5' },
        { prompt: 'Simplify: 3⁴ ÷ 3²', answer: '3²', explanation: 'Subtract exponents: 4 - 2 = 2' },
        { prompt: 'Is 2⁵ = 32?', answer: 'Yes', explanation: '2 × 2 × 2 × 2 × 2 = 32' }
      ]
    };

    // Process each lesson
    for (let i = 0; i < allLessons.length; i++) {
      const lesson = allLessons[i];
      if (!lesson.topic_id) continue;

      const topicName = (topicMap[lesson.topic_id]?.name || '').toLowerCase();
      let templates = [];

      if (topicName.includes('fraction')) {
        templates = questionTemplates.fractions;
      } else if (topicName.includes('decimal')) {
        templates = questionTemplates.decimals;
      } else if (topicName.includes('percent')) {
        templates = questionTemplates.percentages;
      } else if (topicName.includes('ratio')) {
        templates = questionTemplates.ratio;
      } else if (topicName.includes('algebra')) {
        templates = questionTemplates.algebra;
      } else if (topicName.includes('indice')) {
        templates = questionTemplates.indices;
      } else {
        templates = questionTemplates.fractions;
      }

      // Create questions for this lesson
      for (let j = 0; j < templates.length; j++) {
        const template = templates[j];
        await base44.entities.QuestionBankItem.create({
          subject_id: topicMap[lesson.topic_id]?.subject_id || '',
          topic_id: lesson.topic_id,
          lesson_id: lesson.id,
          type: topicName.includes('fraction') ? 'fraction' : 
                 topicName.includes('decimal') ? 'decimal' :
                 topicName.includes('percent') ? 'percentage' :
                 topicName.includes('ratio') ? 'ratio' :
                 topicName.includes('algebra') ? 'algebra' : 'indices',
          prompt: template.prompt,
          correct_answer: template.answer,
          allowed_forms: ['fraction', 'decimal', 'integer', 'string'],
          difficulty: j < 5 ? 'easy' : j < 10 ? 'medium' : 'hard',
          tags: [topicName],
          explanation: template.explanation,
          teacher_email: user.email,
          is_active: true
        });
      }

      totalCreated += templates.length;
      lessonStats.push({
        lessonId: lesson.id,
        lessonName: lesson.title,
        topicName: topicMap[lesson.topic_id]?.name || '',
        questionCount: templates.length
      });
    }

    return Response.json({
      success: true,
      totalLessons: allLessons.length,
      totalQuestionsCreated: totalCreated,
      lessonStats
    });
  } catch (error) {
    console.error('Seed error:', error);
    console.error('Error stack:', error.stack);
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});