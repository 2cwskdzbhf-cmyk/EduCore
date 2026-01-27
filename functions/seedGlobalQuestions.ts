import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { pack } = await req.json();

    // Define seed packs
    const seedPacks = {
      'y7-maths-fractions': {
        year_group: 7,
        subject_id: 'maths',
        topic_id: 'fractions',
        difficulty: 'easy',
        count: 5,
        questions: [
          {
            seed_key: 'y7-fractions-easy-01',
            prompt: 'What is 1/4 + 1/4?',
            question_type: 'multiple_choice',
            options: ['1/2', '1/8', '2/4', '1/16'],
            correct_index: 0,
            difficulty: 'easy',
            explanation: '1/4 + 1/4 = 2/4 = 1/2'
          },
          {
            seed_key: 'y7-fractions-easy-02',
            prompt: 'Simplify 4/8',
            question_type: 'multiple_choice',
            options: ['1/2', '2/4', '1/4', '4/8'],
            correct_index: 0,
            difficulty: 'easy',
            explanation: '4/8 = 1/2 when simplified'
          },
          {
            seed_key: 'y7-fractions-medium-01',
            prompt: 'What is 2/3 + 1/6?',
            question_type: 'multiple_choice',
            options: ['5/6', '3/9', '1/2', '2/6'],
            correct_index: 0,
            difficulty: 'medium',
            explanation: '2/3 = 4/6, so 4/6 + 1/6 = 5/6'
          },
          {
            seed_key: 'y7-fractions-medium-02',
            prompt: 'What is 3/5 - 1/10?',
            question_type: 'multiple_choice',
            options: ['1/2', '2/5', '1/5', '3/10'],
            correct_index: 0,
            difficulty: 'medium',
            explanation: '3/5 = 6/10, so 6/10 - 1/10 = 5/10 = 1/2'
          },
          {
            seed_key: 'y7-fractions-hard-01',
            prompt: 'What is 2/3 × 3/4?',
            question_type: 'multiple_choice',
            options: ['1/2', '5/7', '6/12', '2/4'],
            correct_index: 0,
            difficulty: 'hard',
            explanation: '2/3 × 3/4 = 6/12 = 1/2'
          }
        ]
      },
      'y8-maths-algebra': {
        year_group: 8,
        subject_id: 'maths',
        topic_id: 'algebra',
        difficulty: 'medium',
        count: 5,
        questions: [
          {
            seed_key: 'y8-algebra-easy-01',
            prompt: 'Solve for x: x + 5 = 12',
            question_type: 'multiple_choice',
            options: ['7', '17', '5', '12'],
            correct_index: 0,
            difficulty: 'easy',
            explanation: 'x = 12 - 5 = 7'
          },
          {
            seed_key: 'y8-algebra-easy-02',
            prompt: 'Solve for x: 2x = 10',
            question_type: 'multiple_choice',
            options: ['5', '10', '20', '2'],
            correct_index: 0,
            difficulty: 'easy',
            explanation: 'x = 10 ÷ 2 = 5'
          },
          {
            seed_key: 'y8-algebra-medium-01',
            prompt: 'Solve for x: 3x + 4 = 19',
            question_type: 'multiple_choice',
            options: ['5', '15', '7', '23'],
            correct_index: 0,
            difficulty: 'medium',
            explanation: '3x = 19 - 4 = 15, so x = 5'
          },
          {
            seed_key: 'y8-algebra-medium-02',
            prompt: 'Simplify: 4x + 3x',
            question_type: 'multiple_choice',
            options: ['7x', '12x', '7', 'x'],
            correct_index: 0,
            difficulty: 'medium',
            explanation: '4x + 3x = 7x'
          },
          {
            seed_key: 'y8-algebra-hard-01',
            prompt: 'Solve for x: 2(x + 3) = 14',
            question_type: 'multiple_choice',
            options: ['4', '7', '5', '11'],
            correct_index: 0,
            difficulty: 'hard',
            explanation: '2x + 6 = 14, so 2x = 8, x = 4'
          }
        ]
      },
      'y7-science-biology': {
        year_group: 7,
        subject_id: 'science',
        topic_id: 'biology',
        difficulty: 'easy',
        count: 5,
        questions: [
          {
            seed_key: 'y7-biology-easy-01',
            prompt: 'What is the basic unit of life?',
            question_type: 'multiple_choice',
            options: ['Cell', 'Atom', 'Molecule', 'Organ'],
            correct_index: 0,
            difficulty: 'easy',
            explanation: 'The cell is the basic unit of life'
          },
          {
            seed_key: 'y7-biology-easy-02',
            prompt: 'Which process do plants use to make food?',
            question_type: 'multiple_choice',
            options: ['Photosynthesis', 'Respiration', 'Digestion', 'Absorption'],
            correct_index: 0,
            difficulty: 'easy',
            explanation: 'Plants use photosynthesis to convert sunlight into food'
          },
          {
            seed_key: 'y7-biology-medium-01',
            prompt: 'What are the three types of blood vessels?',
            question_type: 'multiple_choice',
            options: ['Arteries, veins, capillaries', 'Nerves, muscles, bones', 'Heart, lungs, liver', 'Red, white, platelets'],
            correct_index: 0,
            difficulty: 'medium',
            explanation: 'The circulatory system has arteries, veins, and capillaries'
          },
          {
            seed_key: 'y7-biology-medium-02',
            prompt: 'What is the function of red blood cells?',
            question_type: 'multiple_choice',
            options: ['Carry oxygen', 'Fight infection', 'Clot blood', 'Digest food'],
            correct_index: 0,
            difficulty: 'medium',
            explanation: 'Red blood cells carry oxygen around the body'
          },
          {
            seed_key: 'y7-biology-hard-01',
            prompt: 'Which organelle is responsible for energy production in cells?',
            question_type: 'multiple_choice',
            options: ['Mitochondria', 'Nucleus', 'Chloroplast', 'Ribosome'],
            correct_index: 0,
            difficulty: 'hard',
            explanation: 'Mitochondria are the powerhouse of the cell'
          }
        ]
      }
    };

    const packData = seedPacks[pack];
    if (!packData) {
      return Response.json({ error: 'Invalid pack name' }, { status: 400 });
    }

    // Check which questions already exist
    const existingQuestions = await base44.asServiceRole.entities.QuizQuestion.list('-created_date', 5000);
    const existingSeedKeys = new Set(existingQuestions.map(q => q.seed_key).filter(Boolean));

    let created = 0;
    let skipped = 0;
    const sampleIds = [];

    for (const questionData of packData.questions) {
      // Skip if already exists
      if (existingSeedKeys.has(questionData.seed_key)) {
        console.log(`⏭️  Skipping ${questionData.seed_key} - already exists`);
        skipped++;
        continue;
      }

      // Create the question in QuizQuestion entity
      const newQuestion = await base44.asServiceRole.entities.QuizQuestion.create({
        quiz_set_id: 'global-bank',
        prompt: questionData.prompt,
        question_type: questionData.question_type,
        options: questionData.options,
        correct_index: questionData.correct_index,
        difficulty: questionData.difficulty,
        explanation: questionData.explanation,
        year_group: packData.year_group,
        subject_id: packData.subject_id,
        topic_id: packData.topic_id,
        seed_key: questionData.seed_key,
        visibility: 'global',
        is_reusable: true,
        owner_email: 'system',
        order: 0,
        usage_count: 0,
        rating_count: 0
      });

      if (sampleIds.length < 3) {
        sampleIds.push(newQuestion.id);
      }

      created++;
      console.log(`✅ Created ${questionData.seed_key}`);
    }

    // Count total global questions
    const allQuestionsAfter = await base44.asServiceRole.entities.QuizQuestion.list('-created_date', 5000);
    const totalGlobal = allQuestionsAfter.filter(q => q.visibility === 'global').length;

    return Response.json({
      success: true,
      message: `Seeded ${pack} pack successfully`,
      created,
      skipped,
      total_global: totalGlobal,
      sample_ids: sampleIds
    });

  } catch (error) {
    console.error('❌ Seeding error:', error);
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});