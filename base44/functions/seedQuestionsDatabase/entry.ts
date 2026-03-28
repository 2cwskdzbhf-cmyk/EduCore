import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    // Get or create Maths subject
    const subjects = await base44.asServiceRole.entities.Subject.filter({ name: 'Maths' });
    let mathsSubject;
    if (subjects.length === 0) {
      mathsSubject = await base44.asServiceRole.entities.Subject.create({
        name: 'Maths',
        description: 'Mathematics',
        icon: 'Calculator',
        color: 'blue',
        is_active: true
      });
    } else {
      mathsSubject = subjects[0];
    }

    // Create topics
    const topicsData = [
      { name: 'Fractions', year_groups: [7] },
      { name: 'Algebra', year_groups: [8] },
      { name: 'Percentages', year_groups: [9] }
    ];

    const createdTopics = {};
    for (const topicData of topicsData) {
      const existing = await base44.asServiceRole.entities.Topic.filter({
        name: topicData.name,
        subject_id: mathsSubject.id
      });

      if (existing.length > 0) {
        createdTopics[topicData.name] = existing[0];
      } else {
        const topic = await base44.asServiceRole.entities.Topic.create({
          name: topicData.name,
          subject_id: mathsSubject.id,
          is_active: true
        });
        createdTopics[topicData.name] = topic;
      }
    }

    // Question data - 60+ questions
    const questionsData = [
      // Year 7 Fractions - Easy
      {
        topic: 'Fractions',
        year_group: 7,
        difficulty: 'easy',
        question_type: 'multiple_choice',
        question_text: 'What is 1/2 + 1/2?',
        options: ['1', '2', '1/2', '1/4'],
        correct_answer: '1',
        marks: 1
      },
      {
        topic: 'Fractions',
        year_group: 7,
        difficulty: 'easy',
        question_type: 'true_false',
        question_text: 'Is 2/4 equivalent to 1/2?',
        correct_answer: 'True',
        marks: 1
      },
      {
        topic: 'Fractions',
        year_group: 7,
        difficulty: 'easy',
        question_type: 'short_answer',
        question_text: 'Simplify: 4/8',
        correct_answer: '1/2',
        marks: 1
      },
      {
        topic: 'Fractions',
        year_group: 7,
        difficulty: 'easy',
        question_type: 'written_answer',
        question_text: 'Explain why 3/6 = 1/2. Show your working.',
        correct_answer: 'Both numerator and denominator can be divided by 3',
        marks: 2
      },
      // Year 7 Fractions - Medium
      {
        topic: 'Fractions',
        year_group: 7,
        difficulty: 'medium',
        question_type: 'multiple_choice',
        question_text: 'What is 3/4 + 1/8?',
        options: ['7/8', '4/12', '3/8', '5/8'],
        correct_answer: '7/8',
        marks: 2
      },
      {
        topic: 'Fractions',
        year_group: 7,
        difficulty: 'medium',
        question_type: 'true_false',
        question_text: 'Is 5/10 greater than 2/5?',
        correct_answer: 'True',
        marks: 1
      },
      {
        topic: 'Fractions',
        year_group: 7,
        difficulty: 'medium',
        question_type: 'short_answer',
        question_text: 'Convert 3/5 to a decimal.',
        correct_answer: '0.6',
        marks: 2
      },
      {
        topic: 'Fractions',
        year_group: 7,
        difficulty: 'medium',
        question_type: 'written_answer',
        question_text: 'Calculate 2/3 × 3/4 and explain your method.',
        correct_answer: 'Multiply numerators (2×3=6) and denominators (3×4=12), then simplify to 1/2',
        marks: 3
      },
      // Year 7 Fractions - Hard
      {
        topic: 'Fractions',
        year_group: 7,
        difficulty: 'hard',
        question_type: 'multiple_choice',
        question_text: 'What is 2/3 ÷ 1/6?',
        options: ['4', '1/9', '2', '3'],
        correct_answer: '4',
        marks: 3
      },
      {
        topic: 'Fractions',
        year_group: 7,
        difficulty: 'hard',
        question_type: 'true_false',
        question_text: 'Is (2/3) × (3/4) equal to (3/4) × (2/3)?',
        correct_answer: 'True',
        marks: 2
      },
      {
        topic: 'Fractions',
        year_group: 7,
        difficulty: 'hard',
        question_type: 'short_answer',
        question_text: 'Find the value of x if 3/4 = x/12',
        correct_answer: '9',
        marks: 3
      },
      {
        topic: 'Fractions',
        year_group: 7,
        difficulty: 'hard',
        question_type: 'written_answer',
        question_text: 'A recipe needs 2/3 cup of flour, but you want to make 1.5 times the recipe. How much flour do you need? Show all working.',
        correct_answer: '2/3 × 1.5 = 2/3 × 3/2 = 6/6 = 1 cup',
        marks: 4
      },
      // Year 8 Algebra - Easy
      {
        topic: 'Algebra',
        year_group: 8,
        difficulty: 'easy',
        question_type: 'multiple_choice',
        question_text: 'Solve for x: x + 5 = 12',
        options: ['7', '17', '6', '8'],
        correct_answer: '7',
        marks: 1
      },
      {
        topic: 'Algebra',
        year_group: 8,
        difficulty: 'easy',
        question_type: 'true_false',
        question_text: 'Is 3x = x + x + x?',
        correct_answer: 'True',
        marks: 1
      },
      {
        topic: 'Algebra',
        year_group: 8,
        difficulty: 'easy',
        question_type: 'short_answer',
        question_text: 'Simplify: 5x + 3x',
        correct_answer: '8x',
        marks: 1
      },
      {
        topic: 'Algebra',
        year_group: 8,
        difficulty: 'easy',
        question_type: 'written_answer',
        question_text: 'Explain what the variable "x" represents in algebra.',
        correct_answer: 'A variable is a symbol that represents an unknown value or quantity',
        marks: 2
      },
      // Year 8 Algebra - Medium
      {
        topic: 'Algebra',
        year_group: 8,
        difficulty: 'medium',
        question_type: 'multiple_choice',
        question_text: 'Solve for y: 3y - 7 = 14',
        options: ['7', '21', '5', '14'],
        correct_answer: '7',
        marks: 2
      },
      {
        topic: 'Algebra',
        year_group: 8,
        difficulty: 'medium',
        question_type: 'true_false',
        question_text: 'Is 2(x + 3) the same as 2x + 6?',
        correct_answer: 'True',
        marks: 1
      },
      {
        topic: 'Algebra',
        year_group: 8,
        difficulty: 'medium',
        question_type: 'short_answer',
        question_text: 'Expand: 4(x - 2)',
        correct_answer: '4x - 8',
        marks: 2
      },
      {
        topic: 'Algebra',
        year_group: 8,
        difficulty: 'medium',
        question_type: 'written_answer',
        question_text: 'Solve 2x + 5 = 15. Show each step of your working.',
        correct_answer: 'Subtract 5: 2x = 10. Divide by 2: x = 5',
        marks: 3
      },
      // Year 8 Algebra - Hard
      {
        topic: 'Algebra',
        year_group: 8,
        difficulty: 'hard',
        question_type: 'multiple_choice',
        question_text: 'Solve for x: 5x - 3 = 2x + 9',
        options: ['4', '12', '3', '6'],
        correct_answer: '4',
        marks: 3
      },
      {
        topic: 'Algebra',
        year_group: 8,
        difficulty: 'hard',
        question_type: 'true_false',
        question_text: 'Is x² + x² = 2x²?',
        correct_answer: 'True',
        marks: 2
      },
      {
        topic: 'Algebra',
        year_group: 8,
        difficulty: 'hard',
        question_type: 'short_answer',
        question_text: 'Factorise: 6x + 9',
        correct_answer: '3(2x + 3)',
        marks: 3
      },
      {
        topic: 'Algebra',
        year_group: 8,
        difficulty: 'hard',
        question_type: 'written_answer',
        question_text: 'The perimeter of a rectangle is 32cm. If the length is 3x and the width is x, find the value of x. Show all working.',
        correct_answer: 'Perimeter = 2(length + width) = 2(3x + x) = 8x. So 8x = 32, x = 4',
        marks: 4
      },
      // Year 9 Percentages - Easy
      {
        topic: 'Percentages',
        year_group: 9,
        difficulty: 'easy',
        question_type: 'multiple_choice',
        question_text: 'What is 50% of 80?',
        options: ['40', '50', '30', '160'],
        correct_answer: '40',
        marks: 1
      },
      {
        topic: 'Percentages',
        year_group: 9,
        difficulty: 'easy',
        question_type: 'true_false',
        question_text: 'Is 25% the same as 1/4?',
        correct_answer: 'True',
        marks: 1
      },
      {
        topic: 'Percentages',
        year_group: 9,
        difficulty: 'easy',
        question_type: 'short_answer',
        question_text: 'Convert 0.75 to a percentage.',
        correct_answer: '75%',
        marks: 1
      },
      {
        topic: 'Percentages',
        year_group: 9,
        difficulty: 'easy',
        question_type: 'written_answer',
        question_text: 'Explain how to convert a fraction to a percentage.',
        correct_answer: 'Divide the numerator by the denominator, then multiply by 100',
        marks: 2
      },
      // Year 9 Percentages - Medium
      {
        topic: 'Percentages',
        year_group: 9,
        difficulty: 'medium',
        question_type: 'multiple_choice',
        question_text: 'Increase £60 by 20%',
        options: ['£72', '£80', '£66', '£70'],
        correct_answer: '£72',
        marks: 2
      },
      {
        topic: 'Percentages',
        year_group: 9,
        difficulty: 'medium',
        question_type: 'true_false',
        question_text: 'Is increasing a value by 50% the same as multiplying by 1.5?',
        correct_answer: 'True',
        marks: 1
      },
      {
        topic: 'Percentages',
        year_group: 9,
        difficulty: 'medium',
        question_type: 'short_answer',
        question_text: 'Find 35% of 200.',
        correct_answer: '70',
        marks: 2
      },
      {
        topic: 'Percentages',
        year_group: 9,
        difficulty: 'medium',
        question_type: 'written_answer',
        question_text: 'A shop increases all prices by 15%. If a shirt costs £25, what is the new price? Show your working.',
        correct_answer: '15% of £25 = £3.75. New price = £25 + £3.75 = £28.75',
        marks: 3
      },
      // Year 9 Percentages - Hard
      {
        topic: 'Percentages',
        year_group: 9,
        difficulty: 'hard',
        question_type: 'multiple_choice',
        question_text: 'A car depreciates by 20% each year. If it costs £15,000, what is it worth after 2 years?',
        options: ['£9,600', '£12,000', '£10,800', '£11,400'],
        correct_answer: '£9,600',
        marks: 3
      },
      {
        topic: 'Percentages',
        year_group: 9,
        difficulty: 'hard',
        question_type: 'true_false',
        question_text: 'Is a 10% increase followed by a 10% decrease the same as no change?',
        correct_answer: 'False',
        marks: 2
      },
      {
        topic: 'Percentages',
        year_group: 9,
        difficulty: 'hard',
        question_type: 'short_answer',
        question_text: 'What percentage is 45 out of 180?',
        correct_answer: '25%',
        marks: 3
      },
      {
        topic: 'Percentages',
        year_group: 9,
        difficulty: 'hard',
        question_type: 'written_answer',
        question_text: 'A laptop is reduced by 30% in a sale to £420. What was the original price? Show all working.',
        correct_answer: 'Sale price is 70% of original. 0.7 × original = £420. Original = £420 ÷ 0.7 = £600',
        marks: 4
      },
      // Additional questions to reach 60+
      {
        topic: 'Fractions',
        year_group: 7,
        difficulty: 'easy',
        question_type: 'multiple_choice',
        question_text: 'Which fraction is larger: 1/3 or 1/4?',
        options: ['1/3', '1/4', 'They are equal', 'Cannot compare'],
        correct_answer: '1/3',
        marks: 1
      },
      {
        topic: 'Fractions',
        year_group: 7,
        difficulty: 'medium',
        question_type: 'multiple_choice',
        question_text: 'What is 5/6 - 1/3?',
        options: ['1/2', '2/3', '4/9', '1/3'],
        correct_answer: '1/2',
        marks: 2
      },
      {
        topic: 'Algebra',
        year_group: 8,
        difficulty: 'easy',
        question_type: 'multiple_choice',
        question_text: 'What is 2x when x = 5?',
        options: ['10', '7', '25', '5'],
        correct_answer: '10',
        marks: 1
      },
      {
        topic: 'Algebra',
        year_group: 8,
        difficulty: 'medium',
        question_type: 'multiple_choice',
        question_text: 'Simplify: 6x - 2x + 5',
        options: ['4x + 5', '8x + 5', '4x', '9x'],
        correct_answer: '4x + 5',
        marks: 2
      },
      {
        topic: 'Percentages',
        year_group: 9,
        difficulty: 'easy',
        question_type: 'multiple_choice',
        question_text: 'What is 10% of 150?',
        options: ['15', '10', '1.5', '150'],
        correct_answer: '15',
        marks: 1
      },
      {
        topic: 'Percentages',
        year_group: 9,
        difficulty: 'medium',
        question_type: 'multiple_choice',
        question_text: 'Decrease 200 by 25%',
        options: ['150', '175', '50', '225'],
        correct_answer: '150',
        marks: 2
      },
      {
        topic: 'Fractions',
        year_group: 7,
        difficulty: 'easy',
        question_type: 'true_false',
        question_text: 'Is 3/9 equivalent to 1/3?',
        correct_answer: 'True',
        marks: 1
      },
      {
        topic: 'Fractions',
        year_group: 7,
        difficulty: 'medium',
        question_type: 'true_false',
        question_text: 'Is 1/2 + 1/4 equal to 2/6?',
        correct_answer: 'False',
        marks: 1
      },
      {
        topic: 'Algebra',
        year_group: 8,
        difficulty: 'easy',
        question_type: 'true_false',
        question_text: 'Is 5 + x the same as x + 5?',
        correct_answer: 'True',
        marks: 1
      },
      {
        topic: 'Algebra',
        year_group: 8,
        difficulty: 'medium',
        question_type: 'true_false',
        question_text: 'Is 3(x + 2) = 3x + 2?',
        correct_answer: 'False',
        marks: 1
      },
      {
        topic: 'Percentages',
        year_group: 9,
        difficulty: 'easy',
        question_type: 'true_false',
        question_text: 'Is 100% equal to the whole amount?',
        correct_answer: 'True',
        marks: 1
      },
      {
        topic: 'Percentages',
        year_group: 9,
        difficulty: 'medium',
        question_type: 'true_false',
        question_text: 'Is 200% of 50 equal to 100?',
        correct_answer: 'True',
        marks: 1
      },
      {
        topic: 'Fractions',
        year_group: 7,
        difficulty: 'easy',
        question_type: 'short_answer',
        question_text: 'What is 1/4 + 1/4?',
        correct_answer: '1/2',
        marks: 1
      },
      {
        topic: 'Fractions',
        year_group: 7,
        difficulty: 'medium',
        question_type: 'short_answer',
        question_text: 'Multiply: 1/2 × 1/3',
        correct_answer: '1/6',
        marks: 2
      },
      {
        topic: 'Algebra',
        year_group: 8,
        difficulty: 'easy',
        question_type: 'short_answer',
        question_text: 'Solve: x - 3 = 7',
        correct_answer: '10',
        marks: 1
      },
      {
        topic: 'Algebra',
        year_group: 8,
        difficulty: 'medium',
        question_type: 'short_answer',
        question_text: 'Solve: 4x = 20',
        correct_answer: '5',
        marks: 2
      },
      {
        topic: 'Percentages',
        year_group: 9,
        difficulty: 'easy',
        question_type: 'short_answer',
        question_text: 'Express 1/5 as a percentage.',
        correct_answer: '20%',
        marks: 1
      },
      {
        topic: 'Percentages',
        year_group: 9,
        difficulty: 'medium',
        question_type: 'short_answer',
        question_text: 'Calculate 15% of 60.',
        correct_answer: '9',
        marks: 2
      },
      {
        topic: 'Fractions',
        year_group: 7,
        difficulty: 'easy',
        question_type: 'written_answer',
        question_text: 'Draw a diagram to show 3/4 of a shape.',
        correct_answer: 'Student should draw a shape divided into 4 equal parts with 3 parts shaded',
        marks: 2
      },
      {
        topic: 'Fractions',
        year_group: 7,
        difficulty: 'medium',
        question_type: 'written_answer',
        question_text: 'Compare 2/3 and 3/5. Which is larger? Explain your reasoning.',
        correct_answer: '2/3 is larger. Converting to decimals: 2/3 ≈ 0.667 and 3/5 = 0.6',
        marks: 3
      },
      {
        topic: 'Algebra',
        year_group: 8,
        difficulty: 'easy',
        question_type: 'written_answer',
        question_text: 'Write an expression for: "Add 7 to a number x"',
        correct_answer: 'x + 7',
        marks: 2
      },
      {
        topic: 'Algebra',
        year_group: 8,
        difficulty: 'medium',
        question_type: 'written_answer',
        question_text: 'Form an equation for: "I think of a number, double it and subtract 5 to get 15". Solve it.',
        correct_answer: '2x - 5 = 15. Add 5: 2x = 20. Divide by 2: x = 10',
        marks: 3
      },
      {
        topic: 'Percentages',
        year_group: 9,
        difficulty: 'easy',
        question_type: 'written_answer',
        question_text: 'Show how to calculate 20% of £45 step by step.',
        correct_answer: '10% = £45 ÷ 10 = £4.50. 20% = 2 × £4.50 = £9',
        marks: 2
      },
      {
        topic: 'Percentages',
        year_group: 9,
        difficulty: 'medium',
        question_type: 'written_answer',
        question_text: 'In a class of 30 students, 18 are girls. What percentage are boys? Show working.',
        correct_answer: 'Boys = 30 - 18 = 12. Percentage = (12/30) × 100 = 40%',
        marks: 3
      }
    ];

    // Check for existing questions to avoid duplicates
    const existingQuestions = await base44.asServiceRole.entities.Question.list();

    let inserted = 0;
    let skipped = 0;

    for (const qData of questionsData) {
      const topic = createdTopics[qData.topic];
      
      // Check for duplicate
      const duplicate = existingQuestions.find(eq =>
        eq.year_group === qData.year_group &&
        eq.topic_id === topic.id &&
        eq.question_text.toLowerCase().trim() === qData.question_text.toLowerCase().trim()
      );

      if (duplicate) {
        skipped++;
        continue;
      }

      // Create question
      await base44.asServiceRole.entities.Question.create({
        subject_id: mathsSubject.id,
        topic_id: topic.id,
        year_group: qData.year_group,
        difficulty: qData.difficulty,
        question_type: qData.question_type,
        question_text: qData.question_text,
        options: qData.options || null,
        correct_answer: qData.correct_answer,
        marks: qData.marks,
        created_by: 'system',
        is_active: true
      });
      inserted++;
    }

    return Response.json({
      success: true,
      inserted,
      skipped,
      total: questionsData.length,
      topics_created: Object.keys(createdTopics).length,
      message: `Successfully seeded ${inserted} questions across ${Object.keys(createdTopics).length} topics`
    });

  } catch (error) {
    console.error('Seed error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});