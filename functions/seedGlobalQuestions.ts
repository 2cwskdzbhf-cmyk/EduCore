import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { pack } = await req.json();

    // Fetch subjects and topics to get IDs
    const subjects = await base44.asServiceRole.entities.Subject.list();
    const topics = await base44.asServiceRole.entities.Topic.list();

    const mathsSubject = subjects.find(s => s.name === 'Maths' || s.name === 'Mathematics');
    const scienceSubject = subjects.find(s => s.name === 'Science');
    
    const fractionsTopic = topics.find(t => t.name.toLowerCase().includes('fraction'));
    const algebraTopic = topics.find(t => t.name.toLowerCase().includes('algebra'));
    const biologyTopic = topics.find(t => t.name.toLowerCase().includes('biolog'));

    const seedPacks = {
      'y7-maths-fractions': [
        {
          seed_key: 'y7-maths-fractions-easy-01',
          subject_id: mathsSubject?.id,
          topic_id: fractionsTopic?.id,
          year_group: 7,
          difficulty: 'easy',
          question_type: 'mcq',
          question_text: 'What is 1/2 + 1/4?',
          choices: ['1/6', '3/4', '2/6', '1/3'],
          correct_answer: '3/4',
          explanation: '1/2 = 2/4, so 2/4 + 1/4 = 3/4'
        },
        {
          seed_key: 'y7-maths-fractions-easy-02',
          subject_id: mathsSubject?.id,
          topic_id: fractionsTopic?.id,
          year_group: 7,
          difficulty: 'easy',
          question_type: 'mcq',
          question_text: 'Simplify 4/8',
          choices: ['1/2', '2/4', '4/8', '8/16'],
          correct_answer: '1/2',
          explanation: 'Divide both numerator and denominator by 4'
        },
        {
          seed_key: 'y7-maths-fractions-medium-01',
          subject_id: mathsSubject?.id,
          topic_id: fractionsTopic?.id,
          year_group: 7,
          difficulty: 'medium',
          question_type: 'mcq',
          question_text: 'What is 2/3 × 3/4?',
          choices: ['1/2', '5/12', '6/12', '5/7'],
          correct_answer: '1/2',
          explanation: '(2×3)/(3×4) = 6/12 = 1/2'
        },
        {
          seed_key: 'y7-maths-fractions-medium-02',
          subject_id: mathsSubject?.id,
          topic_id: fractionsTopic?.id,
          year_group: 7,
          difficulty: 'medium',
          question_type: 'mcq',
          question_text: 'What is 3/5 - 1/5?',
          choices: ['2/5', '4/10', '2/10', '3/10'],
          correct_answer: '2/5',
          explanation: 'Same denominator, so just subtract numerators: 3 - 1 = 2'
        },
        {
          seed_key: 'y7-maths-fractions-hard-01',
          subject_id: mathsSubject?.id,
          topic_id: fractionsTopic?.id,
          year_group: 7,
          difficulty: 'hard',
          question_type: 'mcq',
          question_text: 'What is 2/3 ÷ 1/6?',
          choices: ['2', '3', '4', '5'],
          correct_answer: '4',
          explanation: '2/3 ÷ 1/6 = 2/3 × 6/1 = 12/3 = 4'
        }
      ],
      'y8-maths-algebra': [
        {
          seed_key: 'y8-maths-algebra-easy-01',
          subject_id: mathsSubject?.id,
          topic_id: algebraTopic?.id,
          year_group: 8,
          difficulty: 'easy',
          question_type: 'mcq',
          question_text: 'Solve: x + 5 = 12',
          choices: ['x = 5', 'x = 7', 'x = 12', 'x = 17'],
          correct_answer: 'x = 7',
          explanation: 'Subtract 5 from both sides: x = 12 - 5 = 7'
        },
        {
          seed_key: 'y8-maths-algebra-easy-02',
          subject_id: mathsSubject?.id,
          topic_id: algebraTopic?.id,
          year_group: 8,
          difficulty: 'easy',
          question_type: 'mcq',
          question_text: 'Simplify: 3x + 2x',
          choices: ['5x', '6x', '5x²', '3x²'],
          correct_answer: '5x',
          explanation: 'Add the coefficients: 3 + 2 = 5'
        },
        {
          seed_key: 'y8-maths-algebra-medium-01',
          subject_id: mathsSubject?.id,
          topic_id: algebraTopic?.id,
          year_group: 8,
          difficulty: 'medium',
          question_type: 'mcq',
          question_text: 'Solve: 2x - 3 = 11',
          choices: ['x = 4', 'x = 5', 'x = 7', 'x = 8'],
          correct_answer: 'x = 7',
          explanation: 'Add 3: 2x = 14, then divide by 2: x = 7'
        },
        {
          seed_key: 'y8-maths-algebra-medium-02',
          subject_id: mathsSubject?.id,
          topic_id: algebraTopic?.id,
          year_group: 8,
          difficulty: 'medium',
          question_type: 'mcq',
          question_text: 'Expand: 3(x + 2)',
          choices: ['3x + 2', '3x + 5', '3x + 6', 'x + 6'],
          correct_answer: '3x + 6',
          explanation: 'Multiply both terms: 3×x + 3×2 = 3x + 6'
        },
        {
          seed_key: 'y8-maths-algebra-hard-01',
          subject_id: mathsSubject?.id,
          topic_id: algebraTopic?.id,
          year_group: 8,
          difficulty: 'hard',
          question_type: 'mcq',
          question_text: 'Solve: 3(x - 2) = 15',
          choices: ['x = 5', 'x = 7', 'x = 9', 'x = 11'],
          correct_answer: 'x = 7',
          explanation: 'Expand: 3x - 6 = 15, add 6: 3x = 21, divide by 3: x = 7'
        }
      ],
      'y7-science-biology': [
        {
          seed_key: 'y7-science-biology-easy-01',
          subject_id: scienceSubject?.id,
          topic_id: biologyTopic?.id,
          year_group: 7,
          difficulty: 'easy',
          question_type: 'mcq',
          question_text: 'What is the basic unit of life?',
          choices: ['Atom', 'Cell', 'Organ', 'Tissue'],
          correct_answer: 'Cell',
          explanation: 'Cells are the smallest living units'
        },
        {
          seed_key: 'y7-science-biology-easy-02',
          subject_id: scienceSubject?.id,
          topic_id: biologyTopic?.id,
          year_group: 7,
          difficulty: 'easy',
          question_type: 'mcq',
          question_text: 'What process do plants use to make food?',
          choices: ['Respiration', 'Photosynthesis', 'Digestion', 'Circulation'],
          correct_answer: 'Photosynthesis',
          explanation: 'Plants use sunlight, water and CO2 to make glucose'
        },
        {
          seed_key: 'y7-science-biology-medium-01',
          subject_id: scienceSubject?.id,
          topic_id: biologyTopic?.id,
          year_group: 7,
          difficulty: 'medium',
          question_type: 'mcq',
          question_text: 'Which blood vessel carries blood away from the heart?',
          choices: ['Vein', 'Artery', 'Capillary', 'Valve'],
          correct_answer: 'Artery',
          explanation: 'Arteries carry oxygenated blood away from the heart'
        },
        {
          seed_key: 'y7-science-biology-medium-02',
          subject_id: scienceSubject?.id,
          topic_id: biologyTopic?.id,
          year_group: 7,
          difficulty: 'medium',
          question_type: 'mcq',
          question_text: 'What is the powerhouse of the cell?',
          choices: ['Nucleus', 'Mitochondria', 'Chloroplast', 'Ribosome'],
          correct_answer: 'Mitochondria',
          explanation: 'Mitochondria produce energy (ATP) for the cell'
        },
        {
          seed_key: 'y7-science-biology-hard-01',
          subject_id: scienceSubject?.id,
          topic_id: biologyTopic?.id,
          year_group: 7,
          difficulty: 'hard',
          question_type: 'mcq',
          question_text: 'What organelle controls what enters and leaves the cell?',
          choices: ['Cell wall', 'Cell membrane', 'Cytoplasm', 'Nucleus'],
          correct_answer: 'Cell membrane',
          explanation: 'The cell membrane is selectively permeable'
        }
      ]
    };

    const questions = seedPacks[pack];
    if (!questions) {
      return Response.json({ error: 'Invalid pack name' }, { status: 400 });
    }

    // Get existing global questions to check duplicates
    const existing = await base44.asServiceRole.entities.GlobalQuestion.list('-created_date', 5000);
    const existingSeedKeys = new Set(existing.map(q => q.seed_key));

    let created = 0;
    let skipped = 0;

    for (const q of questions) {
      if (existingSeedKeys.has(q.seed_key)) {
        skipped++;
        continue;
      }

      await base44.asServiceRole.entities.GlobalQuestion.create(q);
      created++;
    }

    // Verify
    const allGlobalQuestions = await base44.asServiceRole.entities.GlobalQuestion.list('-created_date', 5000);

    return Response.json({
      message: `Successfully seeded ${pack}`,
      created,
      skipped,
      total_global: allGlobalQuestions.length,
      sample_ids: allGlobalQuestions.slice(0, 3).map(q => q.id)
    });
  } catch (error) {
    console.error('Seeding error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});