import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Question generators for each maths topic
const questionGenerators = {
  // Fractions - Simplifying
  'simplify-fractions': () => {
    const questions = [];
    const pairs = [
      { num: 2, den: 4, ans: '1/2' }, { num: 3, den: 6, ans: '1/2' }, { num: 4, den: 8, ans: '1/2' },
      { num: 6, den: 9, ans: '2/3' }, { num: 8, den: 12, ans: '2/3' }, { num: 10, den: 15, ans: '2/3' },
      { num: 4, den: 6, ans: '2/3' }, { num: 6, den: 8, ans: '3/4' }, { num: 9, den: 12, ans: '3/4' },
      { num: 10, den: 20, ans: '1/2' }, { num: 15, den: 20, ans: '3/4' }, { num: 12, den: 16, ans: '3/4' },
      { num: 18, den: 24, ans: '3/4' }, { num: 20, den: 25, ans: '4/5' }, { num: 16, den: 20, ans: '4/5' }
    ];
    pairs.forEach(p => {
      questions.push({
        prompt: `Simplify ${p.num}/${p.den}`,
        correct_answer: p.ans,
        explanation: `Divide both numerator and denominator by their greatest common divisor to get ${p.ans}`
      });
    });
    return questions;
  },

  // Fractions - Addition
  'add-fractions': () => {
    const questions = [];
    const problems = [
      { a: '1/2', b: '1/4', ans: '3/4' }, { a: '1/3', b: '1/6', ans: '1/2' }, { a: '2/5', b: '1/5', ans: '3/5' },
      { a: '1/4', b: '1/4', ans: '1/2' }, { a: '3/8', b: '1/8', ans: '1/2' }, { a: '2/3', b: '1/6', ans: '5/6' },
      { a: '1/2', b: '1/3', ans: '5/6' }, { a: '3/4', b: '1/8', ans: '7/8' }, { a: '2/5', b: '3/10', ans: '7/10' },
      { a: '1/6', b: '1/3', ans: '1/2' }, { a: '5/8', b: '1/4', ans: '7/8' }, { a: '2/3', b: '1/4', ans: '11/12' },
      { a: '3/5', b: '1/10', ans: '7/10' }, { a: '1/2', b: '2/5', ans: '9/10' }, { a: '3/4', b: '1/6', ans: '11/12' }
    ];
    problems.forEach(p => {
      questions.push({
        prompt: `Calculate ${p.a} + ${p.b}`,
        correct_answer: p.ans,
        explanation: `Find common denominator, add numerators: ${p.a} + ${p.b} = ${p.ans}`
      });
    });
    return questions;
  },

  // Decimals - Place Value
  'decimal-place-value': () => {
    const questions = [];
    const problems = [
      { q: 'What is 0.5 as a fraction?', ans: '1/2' }, { q: 'What is 0.25 as a fraction?', ans: '1/4' },
      { q: 'What is 0.75 as a fraction?', ans: '3/4' }, { q: 'What is 0.2 as a fraction?', ans: '1/5' },
      { q: 'What is 0.4 as a fraction?', ans: '2/5' }, { q: 'What is 0.6 as a fraction?', ans: '3/5' },
      { q: 'What is 0.8 as a fraction?', ans: '4/5' }, { q: 'What is 0.125 as a fraction?', ans: '1/8' },
      { q: 'What is 0.375 as a fraction?', ans: '3/8' }, { q: 'What is 0.625 as a fraction?', ans: '5/8' },
      { q: 'Round 3.67 to 1 decimal place', ans: '3.7' }, { q: 'Round 5.43 to 1 decimal place', ans: '5.4' },
      { q: 'Round 8.95 to 1 decimal place', ans: '9.0' }, { q: 'Round 2.34 to the nearest whole number', ans: '2' },
      { q: 'Round 7.8 to the nearest whole number', ans: '8' }
    ];
    problems.forEach(p => {
      questions.push({
        prompt: p.q,
        correct_answer: p.ans,
        explanation: `The answer is ${p.ans}`
      });
    });
    return questions;
  },

  // Percentages
  'percentages-basics': () => {
    const questions = [];
    const problems = [
      { q: 'Convert 1/2 to a percentage', ans: '50' }, { q: 'Convert 1/4 to a percentage', ans: '25' },
      { q: 'Convert 3/4 to a percentage', ans: '75' }, { q: 'Convert 1/5 to a percentage', ans: '20' },
      { q: 'Convert 2/5 to a percentage', ans: '40' }, { q: 'Convert 3/5 to a percentage', ans: '60' },
      { q: 'What is 50% of 100?', ans: '50' }, { q: 'What is 25% of 80?', ans: '20' },
      { q: 'What is 10% of 60?', ans: '6' }, { q: 'What is 20% of 50?', ans: '10' },
      { q: 'What is 75% of 40?', ans: '30' }, { q: 'Convert 0.5 to a percentage', ans: '50' },
      { q: 'Convert 0.25 to a percentage', ans: '25' }, { q: 'Convert 0.75 to a percentage', ans: '75' },
      { q: 'What is 30% of 200?', ans: '60' }
    ];
    problems.forEach(p => {
      questions.push({
        prompt: p.q,
        correct_answer: p.ans,
        explanation: `The answer is ${p.ans}%`
      });
    });
    return questions;
  },

  // Ratio
  'ratio-basics': () => {
    const questions = [];
    const problems = [
      { q: 'Simplify the ratio 2:4', ans: '1:2' }, { q: 'Simplify the ratio 3:6', ans: '1:2' },
      { q: 'Simplify the ratio 4:8', ans: '1:2' }, { q: 'Simplify the ratio 6:9', ans: '2:3' },
      { q: 'Simplify the ratio 8:12', ans: '2:3' }, { q: 'Simplify the ratio 10:15', ans: '2:3' },
      { q: 'Share 10 in the ratio 1:1', ans: '5' }, { q: 'Share 12 in the ratio 1:2 (first part)', ans: '4' },
      { q: 'Share 15 in the ratio 1:2 (first part)', ans: '5' }, { q: 'Share 20 in the ratio 1:3 (first part)', ans: '5' },
      { q: 'Share 24 in the ratio 1:2 (second part)', ans: '16' }, { q: 'Simplify 4:6', ans: '2:3' },
      { q: 'Simplify 9:12', ans: '3:4' }, { q: 'Simplify 15:20', ans: '3:4' }, { q: 'Simplify 18:24', ans: '3:4' }
    ];
    problems.forEach(p => {
      questions.push({
        prompt: p.q,
        correct_answer: p.ans,
        explanation: `The answer is ${p.ans}`
      });
    });
    return questions;
  },

  // Algebra - Solving
  'algebra-solving': () => {
    const questions = [];
    const problems = [
      { q: 'Solve: x + 5 = 12', ans: '7' }, { q: 'Solve: x - 3 = 10', ans: '13' },
      { q: 'Solve: 2x = 14', ans: '7' }, { q: 'Solve: 3x = 15', ans: '5' },
      { q: 'Solve: x/2 = 6', ans: '12' }, { q: 'Solve: x + 8 = 15', ans: '7' },
      { q: 'Solve: 4x = 20', ans: '5' }, { q: 'Solve: x - 7 = 8', ans: '15' },
      { q: 'Solve: 5x = 25', ans: '5' }, { q: 'Solve: x/3 = 4', ans: '12' },
      { q: 'Solve: 2x + 4 = 10', ans: '3' }, { q: 'Solve: 3x - 6 = 9', ans: '5' },
      { q: 'Solve: x + 10 = 20', ans: '10' }, { q: 'Solve: 2x = 18', ans: '9' },
      { q: 'Solve: x/4 = 5', ans: '20' }
    ];
    problems.forEach(p => {
      questions.push({
        prompt: p.q,
        correct_answer: p.ans,
        explanation: `Isolate x to get x = ${p.ans}`
      });
    });
    return questions;
  }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin' && user?.user_type !== 'teacher') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get all maths topics and lessons
    const subjects = await base44.asServiceRole.entities.Subject.filter({ name: 'Mathematics' });
    if (subjects.length === 0) {
      return Response.json({ error: 'Mathematics subject not found' }, { status: 404 });
    }

    const mathsSubject = subjects[0];
    const topics = await base44.asServiceRole.entities.Topic.filter({ subject_id: mathsSubject.id });
    const lessons = await base44.asServiceRole.entities.Lesson.filter({ 
      topic_id: { $in: topics.map(t => t.id) } 
    });

    // Map lesson titles to question generators
    const lessonTypeMap = {
      'Simplifying Fractions': 'simplify-fractions',
      'Adding Fractions': 'add-fractions',
      'Decimal Place Value': 'decimal-place-value',
      'Percentages': 'percentages-basics',
      'Ratio': 'ratio-basics',
      'Solving Equations': 'algebra-solving'
    };

    let created = 0;
    let skipped = 0;

    for (const lesson of lessons) {
      // Check if questions already exist
      const existing = await base44.asServiceRole.entities.QuestionBankItem.filter({
        lesson_id: lesson.id
      });

      if (existing.length >= 15) {
        skipped++;
        continue;
      }

      // Find matching generator
      let generator = null;
      for (const [key, gen] of Object.entries(lessonTypeMap)) {
        if (lesson.title.includes(key)) {
          generator = questionGenerators[gen];
          break;
        }
      }

      if (!generator) {
        // Default to fractions
        generator = questionGenerators['simplify-fractions'];
      }

      const questions = generator();

      // Create questions
      for (const q of questions) {
        await base44.asServiceRole.entities.QuestionBankItem.create({
          subject_id: mathsSubject.id,
          topic_id: lesson.topic_id,
          lesson_id: lesson.id,
          type: 'fraction',
          prompt: q.prompt,
          correct_answer: q.correct_answer,
          allowed_forms: ['fraction', 'decimal', 'mixed', 'simplified'],
          difficulty: 'medium',
          explanation: q.explanation,
          teacher_email: user.email,
          is_active: true
        });
        created++;
      }
    }

    return Response.json({ 
      success: true, 
      created,
      skipped,
      message: `Created ${created} questions, skipped ${skipped} lessons with existing questions`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});