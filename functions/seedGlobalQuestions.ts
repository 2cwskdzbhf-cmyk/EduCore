import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Define all available seed packs
const SEED_PACKS = {
  'y7-maths-fractions': {
    subject: 'Maths',
    topic: 'Fractions',
    year_group: 7,
    questions: [
      { seed_key: 'y7-maths-fractions-easy-01', prompt: 'What is 1/2 + 1/4?', options: ['1/6', '2/6', '3/4', '1/3'], correct_index: 2, difficulty: 'easy', explanation: '1/2 = 2/4, so 2/4 + 1/4 = 3/4', tags: ['fractions', 'addition'] },
      { seed_key: 'y7-maths-fractions-easy-02', prompt: 'Simplify 4/8', options: ['1/2', '2/4', '1/4', '4/16'], correct_index: 0, difficulty: 'easy', explanation: 'Divide both numerator and denominator by 4', tags: ['fractions', 'simplification'] },
      { seed_key: 'y7-maths-fractions-easy-03', prompt: 'What fraction of a pizza is left if you eat 2/8?', options: ['2/8', '6/8', '4/8', '8/8'], correct_index: 1, difficulty: 'easy', explanation: '8/8 - 2/8 = 6/8', tags: ['fractions', 'subtraction'] },
      { seed_key: 'y7-maths-fractions-easy-04', prompt: 'Which is larger: 1/3 or 1/4?', options: ['1/3', '1/4', 'Equal', 'Cannot determine'], correct_index: 0, difficulty: 'easy', explanation: '1/3 is larger because thirds are bigger than fourths', tags: ['fractions', 'comparing'] },
      { seed_key: 'y7-maths-fractions-easy-05', prompt: 'What is 2/5 of 10?', options: ['2', '4', '5', '8'], correct_index: 1, difficulty: 'easy', explanation: '2/5 × 10 = 20/5 = 4', tags: ['fractions', 'multiplication'] },
      { seed_key: 'y7-maths-fractions-medium-01', prompt: 'Calculate 3/4 - 2/5', options: ['1/9', '7/20', '5/9', '1/20'], correct_index: 1, difficulty: 'medium', explanation: 'Common denominator 20: 15/20 - 8/20 = 7/20', tags: ['fractions', 'subtraction'] },
      { seed_key: 'y7-maths-fractions-medium-02', prompt: 'Simplify 12/18 to lowest terms', options: ['2/3', '4/6', '6/9', '3/5'], correct_index: 0, difficulty: 'medium', explanation: 'GCD is 6: 12÷6 / 18÷6 = 2/3', tags: ['fractions', 'simplification'] },
      { seed_key: 'y7-maths-fractions-medium-03', prompt: 'What is 2/3 × 3/4?', options: ['1/2', '6/12', '5/7', '2/4'], correct_index: 0, difficulty: 'medium', explanation: '(2×3)/(3×4) = 6/12 = 1/2', tags: ['fractions', 'multiplication'] },
      { seed_key: 'y7-maths-fractions-medium-04', prompt: 'Convert 0.75 to a fraction in simplest form', options: ['7/10', '3/4', '75/100', '15/20'], correct_index: 1, difficulty: 'medium', explanation: '0.75 = 75/100 = 3/4', tags: ['fractions', 'decimals'] },
      { seed_key: 'y7-maths-fractions-medium-05', prompt: 'What is 5/6 - 1/3?', options: ['4/3', '1/2', '2/3', '1/6'], correct_index: 1, difficulty: 'medium', explanation: '5/6 - 2/6 = 3/6 = 1/2', tags: ['fractions', 'subtraction'] },
      { seed_key: 'y7-maths-fractions-hard-01', prompt: 'Calculate (2/3 ÷ 4/5) + 1/6', options: ['1', '13/15', '5/6', '7/9'], correct_index: 0, difficulty: 'hard', explanation: '2/3 × 5/4 = 5/6, then 5/6 + 1/6 = 1', tags: ['fractions', 'division', 'addition'] },
      { seed_key: 'y7-maths-fractions-hard-02', prompt: 'Express 2 3/4 as an improper fraction', options: ['11/4', '9/4', '7/4', '8/3'], correct_index: 0, difficulty: 'hard', explanation: '2×4 + 3 = 11, so 11/4', tags: ['fractions', 'mixed numbers'] },
      { seed_key: 'y7-maths-fractions-hard-03', prompt: 'What is 3/5 of 2/7?', options: ['6/35', '5/12', '1/2', '6/12'], correct_index: 0, difficulty: 'hard', explanation: '3/5 × 2/7 = 6/35', tags: ['fractions', 'multiplication'] },
      { seed_key: 'y7-maths-fractions-hard-04', prompt: 'Simplify: (3/4 + 1/6) ÷ 2/3', options: ['11/8', '7/6', '5/4', '13/12'], correct_index: 0, difficulty: 'hard', explanation: '9/12 + 2/12 = 11/12, then 11/12 × 3/2 = 11/8', tags: ['fractions', 'complex'] },
      { seed_key: 'y7-maths-fractions-hard-05', prompt: 'Which fraction is closest to 1?', options: ['7/8', '5/6', '9/10', '11/12'], correct_index: 3, difficulty: 'hard', explanation: '11/12 ≈ 0.917 is closest to 1', tags: ['fractions', 'comparing'] }
    ]
  },
  'y8-maths-algebra': {
    subject: 'Maths',
    topic: 'Algebra',
    year_group: 8,
    questions: [
      { seed_key: 'y8-maths-algebra-easy-01', prompt: 'Solve: x + 5 = 12', options: ['7', '17', '5', '12'], correct_index: 0, difficulty: 'easy', explanation: 'x = 12 - 5 = 7', tags: ['algebra', 'equations'] },
      { seed_key: 'y8-maths-algebra-easy-02', prompt: 'Simplify: 3x + 2x', options: ['5x', '6x', '5x²', '3x'], correct_index: 0, difficulty: 'easy', explanation: 'Combine like terms: 3x + 2x = 5x', tags: ['algebra', 'simplification'] },
      { seed_key: 'y8-maths-algebra-easy-03', prompt: 'What is 4 × x written as?', options: ['4x', 'x4', '4 + x', 'x/4'], correct_index: 0, difficulty: 'easy', explanation: 'Multiplication is written without the × symbol', tags: ['algebra', 'notation'] },
      { seed_key: 'y8-maths-algebra-easy-04', prompt: 'If x = 3, what is 2x?', options: ['5', '6', '23', '3'], correct_index: 1, difficulty: 'easy', explanation: '2 × 3 = 6', tags: ['algebra', 'substitution'] },
      { seed_key: 'y8-maths-algebra-easy-05', prompt: 'Solve: x - 4 = 6', options: ['10', '2', '24', '6'], correct_index: 0, difficulty: 'easy', explanation: 'x = 6 + 4 = 10', tags: ['algebra', 'equations'] },
      { seed_key: 'y8-maths-algebra-medium-01', prompt: 'Solve: 2x + 3 = 11', options: ['4', '7', '14', '8'], correct_index: 0, difficulty: 'medium', explanation: '2x = 11 - 3 = 8, so x = 4', tags: ['algebra', 'equations'] },
      { seed_key: 'y8-maths-algebra-medium-02', prompt: 'Expand: 3(x + 4)', options: ['3x + 12', '3x + 4', 'x + 12', '3x + 7'], correct_index: 0, difficulty: 'medium', explanation: '3 × x + 3 × 4 = 3x + 12', tags: ['algebra', 'expanding'] },
      { seed_key: 'y8-maths-algebra-medium-03', prompt: 'Simplify: 5x - 2x + 3', options: ['3x + 3', '7x + 3', '3x', '5x + 3'], correct_index: 0, difficulty: 'medium', explanation: '5x - 2x = 3x, then add 3', tags: ['algebra', 'simplification'] },
      { seed_key: 'y8-maths-algebra-medium-04', prompt: 'Solve: x/2 = 6', options: ['12', '3', '8', '4'], correct_index: 0, difficulty: 'medium', explanation: 'x = 6 × 2 = 12', tags: ['algebra', 'equations'] },
      { seed_key: 'y8-maths-algebra-medium-05', prompt: 'If x = 2, find 3x + 5', options: ['11', '10', '8', '35'], correct_index: 0, difficulty: 'medium', explanation: '3(2) + 5 = 6 + 5 = 11', tags: ['algebra', 'substitution'] },
      { seed_key: 'y8-maths-algebra-hard-01', prompt: 'Solve: 3x - 7 = 2x + 5', options: ['12', '2', '-2', '5'], correct_index: 0, difficulty: 'hard', explanation: '3x - 2x = 5 + 7, x = 12', tags: ['algebra', 'equations'] },
      { seed_key: 'y8-maths-algebra-hard-02', prompt: 'Expand and simplify: 2(x + 3) + 3(x - 1)', options: ['5x + 3', '5x + 9', '5x', '2x + 6'], correct_index: 0, difficulty: 'hard', explanation: '2x + 6 + 3x - 3 = 5x + 3', tags: ['algebra', 'expanding'] },
      { seed_key: 'y8-maths-algebra-hard-03', prompt: 'Solve: 4(x - 2) = 12', options: ['5', '3', '8', '2'], correct_index: 0, difficulty: 'hard', explanation: '4x - 8 = 12, 4x = 20, x = 5', tags: ['algebra', 'equations'] },
      { seed_key: 'y8-maths-algebra-hard-04', prompt: 'Simplify: 2x² + 3x + x² - x', options: ['3x² + 2x', '3x² + 4x', '2x² + 2x', '3x³'], correct_index: 0, difficulty: 'hard', explanation: 'Combine: 2x² + x² = 3x², 3x - x = 2x', tags: ['algebra', 'simplification'] },
      { seed_key: 'y8-maths-algebra-hard-05', prompt: 'Solve: (x + 3)/2 = 5', options: ['7', '13', '10', '8'], correct_index: 0, difficulty: 'hard', explanation: 'x + 3 = 10, x = 7', tags: ['algebra', 'equations'] }
    ]
  },
  'y7-science-biology': {
    subject: 'Science',
    topic: 'Biology',
    year_group: 7,
    questions: [
      { seed_key: 'y7-science-biology-easy-01', prompt: 'What do plants need for photosynthesis?', options: ['Sunlight, water, CO2', 'Only water', 'Only sunlight', 'Water and soil'], correct_index: 0, difficulty: 'easy', explanation: 'Plants need sunlight, water, and carbon dioxide for photosynthesis', tags: ['biology', 'photosynthesis'] },
      { seed_key: 'y7-science-biology-easy-02', prompt: 'What is the largest organ in the human body?', options: ['Skin', 'Liver', 'Heart', 'Brain'], correct_index: 0, difficulty: 'easy', explanation: 'The skin is the largest organ', tags: ['biology', 'human body'] },
      { seed_key: 'y7-science-biology-easy-03', prompt: 'Which part of the cell controls activities?', options: ['Nucleus', 'Membrane', 'Cytoplasm', 'Vacuole'], correct_index: 0, difficulty: 'easy', explanation: 'The nucleus controls cell activities', tags: ['biology', 'cells'] },
      { seed_key: 'y7-science-biology-easy-04', prompt: 'How many bones are in an adult human body?', options: ['106', '206', '306', '156'], correct_index: 1, difficulty: 'easy', explanation: 'Adults have 206 bones', tags: ['biology', 'skeleton'] },
      { seed_key: 'y7-science-biology-easy-05', prompt: 'What gas do plants produce during photosynthesis?', options: ['Carbon dioxide', 'Nitrogen', 'Oxygen', 'Hydrogen'], correct_index: 2, difficulty: 'easy', explanation: 'Plants produce oxygen during photosynthesis', tags: ['biology', 'photosynthesis'] },
      { seed_key: 'y7-science-biology-medium-01', prompt: 'What is the function of red blood cells?', options: ['Fight infection', 'Carry oxygen', 'Clot blood', 'Digest food'], correct_index: 1, difficulty: 'medium', explanation: 'Red blood cells carry oxygen to body tissues', tags: ['biology', 'blood'] },
      { seed_key: 'y7-science-biology-medium-02', prompt: 'Which organelle is responsible for energy production?', options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Golgi'], correct_index: 1, difficulty: 'medium', explanation: 'Mitochondria produce energy (ATP) for the cell', tags: ['biology', 'cells'] },
      { seed_key: 'y7-science-biology-medium-03', prompt: 'What type of organism is yeast?', options: ['Bacteria', 'Fungus', 'Plant', 'Animal'], correct_index: 1, difficulty: 'medium', explanation: 'Yeast is a single-celled fungus', tags: ['biology', 'microorganisms'] },
      { seed_key: 'y7-science-biology-medium-04', prompt: 'Which system removes waste from the body?', options: ['Digestive', 'Circulatory', 'Excretory', 'Nervous'], correct_index: 2, difficulty: 'medium', explanation: 'The excretory system removes waste products', tags: ['biology', 'body systems'] },
      { seed_key: 'y7-science-biology-medium-05', prompt: 'What is the role of chlorophyll in plants?', options: ['Store water', 'Absorb light', 'Transport nutrients', 'Produce seeds'], correct_index: 1, difficulty: 'medium', explanation: 'Chlorophyll absorbs light for photosynthesis', tags: ['biology', 'photosynthesis'] },
      { seed_key: 'y7-science-biology-hard-01', prompt: 'What is osmosis?', options: ['Active transport', 'Diffusion of water', 'Cell division', 'Protein synthesis'], correct_index: 1, difficulty: 'hard', explanation: 'Osmosis is the diffusion of water across a membrane', tags: ['biology', 'cells'] },
      { seed_key: 'y7-science-biology-hard-02', prompt: 'Which organ produces bile?', options: ['Pancreas', 'Liver', 'Stomach', 'Gallbladder'], correct_index: 1, difficulty: 'hard', explanation: 'The liver produces bile for fat digestion', tags: ['biology', 'digestion'] },
      { seed_key: 'y7-science-biology-hard-03', prompt: 'What is the function of the stomata in leaves?', options: ['Absorb water', 'Gas exchange', 'Store sugar', 'Produce chlorophyll'], correct_index: 1, difficulty: 'hard', explanation: 'Stomata allow gas exchange (CO2 in, O2 out)', tags: ['biology', 'plants'] },
      { seed_key: 'y7-science-biology-hard-04', prompt: 'Which type of cell lacks a nucleus?', options: ['Animal cell', 'Plant cell', 'Prokaryotic cell', 'Eukaryotic cell'], correct_index: 2, difficulty: 'hard', explanation: 'Prokaryotic cells (bacteria) lack a nucleus', tags: ['biology', 'cells'] },
      { seed_key: 'y7-science-biology-hard-05', prompt: 'What enzyme breaks down starch in the mouth?', options: ['Pepsin', 'Amylase', 'Lipase', 'Trypsin'], correct_index: 1, difficulty: 'hard', explanation: 'Amylase in saliva breaks down starch', tags: ['biology', 'digestion'] }
    ]
  }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { pack } = await req.json();

    if (!SEED_PACKS[pack]) {
      return Response.json({ 
        error: `Invalid pack "${pack}". Available: ${Object.keys(SEED_PACKS).join(', ')}` 
      }, { status: 400 });
    }

    const packData = SEED_PACKS[pack];

    // Find subject and topic
    const subjects = await base44.asServiceRole.entities.Subject.filter({ name: packData.subject });
    if (subjects.length === 0) {
      return Response.json({ error: `${packData.subject} subject not found` }, { status: 404 });
    }
    const subject = subjects[0];

    const topics = await base44.asServiceRole.entities.Topic.filter({ 
      subject_id: subject.id,
      name: packData.topic
    });
    if (topics.length === 0) {
      return Response.json({ error: `${packData.topic} topic not found` }, { status: 404 });
    }
    const topic = topics[0];

    // Check existing by seed_key (idempotent)
    const existingKeys = new Set();
    for (const q of packData.questions) {
      const existing = await base44.asServiceRole.entities.QuizQuestion.filter({ seed_key: q.seed_key });
      if (existing.length > 0) {
        existingKeys.add(q.seed_key);
      }
    }

    // Create only new questions
    const created = [];
    const skipped = [];

    for (const q of packData.questions) {
      if (existingKeys.has(q.seed_key)) {
        skipped.push(q.seed_key);
        continue;
      }

      const question = await base44.asServiceRole.entities.QuizQuestion.create({
        ...q,
        quiz_set_id: 'global-library',
        subject_id: subject.id,
        topic_id: topic.id,
        year_group: packData.year_group,
        visibility: 'global',
        is_reusable: true,
        question_type: 'multiple_choice',
        usage_count: 0,
        rating_count: 0,
        current_version: 1
      });
      created.push(question.id);
    }

    // Count total global questions
    const allGlobal = await base44.asServiceRole.entities.QuizQuestion.filter({ visibility: 'global' });

    return Response.json({
      success: true,
      pack,
      created: created.length,
      skipped: skipped.length,
      total_global: allGlobal.length,
      message: `✅ ${packData.subject} Year ${packData.year_group} - ${packData.topic}: ${created.length} created, ${skipped.length} skipped, ${allGlobal.length} total global`,
      sample_ids: created.slice(0, 3)
    });

  } catch (error) {
    console.error('Error seeding:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});