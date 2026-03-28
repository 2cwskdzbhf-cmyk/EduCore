import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const SUBTOPICS = [
  {
    name: 'Integers & Place Value',
    description: 'Positive/negative numbers, ordering, rounding, significant figures',
    seedKeyPatterns: ['y7-num-e-04', 'y8-num-e-04'],
    keywords: ['round', 'integer', 'negative', 'place value', 'significant figure', 'decimal place', 'order'],
  },
  {
    name: 'Fractions, Decimals & Percentages',
    description: 'Converting between FDP, operations with fractions, percentage calculations',
    seedKeyPatterns: ['y7-num-e-01', 'y7-num-e-03', 'y7-num-e-06', 'y7-num-e-07', 'y7-num-e-08', 'y7-num-e-10', 'y7-num-m-01', 'y7-num-m-02', 'y7-num-m-03', 'y7-num-m-04', 'y7-num-m-06', 'y7-num-m-07', 'y7-num-h-02'],
    keywords: ['fraction', 'decimal', 'percent', '%', 'convert', 'equivalent', 'simplify', '1/2', '3/4', '0.'],
  },
  {
    name: 'Primes, Factors & Multiples',
    description: 'Prime numbers, HCF, LCM, product of prime factors',
    seedKeyPatterns: ['y7-num-e-02', 'y7-num-e-05', 'y7-num-e-09', 'y7-num-h-03', 'y11-num-h-02'],
    keywords: ['prime', 'factor', 'multiple', 'lcm', 'hcf', 'highest common', 'lowest common'],
  },
  {
    name: 'Ratio & Proportion',
    description: 'Simplifying ratios, dividing in a ratio, direct and inverse proportion',
    seedKeyPatterns: ['y7-num-m-05', 'y7-num-h-01'],
    keywords: ['ratio', 'proportion', 'share', 'direct', 'inverse', 'rate'],
  },
  {
    name: 'Powers, Roots & Indices',
    description: 'Square numbers, cube numbers, index laws, negative and fractional indices',
    seedKeyPatterns: ['y8-num-e-01', 'y8-num-e-02', 'y8-num-e-03', 'y8-num-e-05', 'y9-num-e-03', 'y10-num-e-01', 'y10-num-e-02', 'y11-num-e-02', 'y11-num-m-01'],
    keywords: ['power', 'root', 'square', 'cube', 'index', 'indices', '²', '³', '^', 'sqrt', '√'],
  },
  {
    name: 'Standard Form',
    description: 'Writing numbers in standard form, calculations in standard form',
    seedKeyPatterns: ['y8-num-m-01', 'y8-num-m-03', 'y8-num-m-06', 'y9-num-h-03', 'y9-num-m-03'],
    keywords: ['standard form', '× 10', 'ordinary number', 'scientific notation'],
  },
  {
    name: 'Percentages & Interest',
    description: 'Percentage increase/decrease, simple and compound interest, reverse percentages',
    seedKeyPatterns: ['y8-num-m-02', 'y8-num-m-05', 'y8-num-h-01', 'y8-num-h-02', 'y8-num-h-03'],
    keywords: ['interest', 'compound', 'simple interest', 'depreciate', 'increase', 'decrease', 'original price', 'multiplier'],
  },
  {
    name: 'Surds & Irrational Numbers',
    description: 'Rationalising, simplifying surds, irrational and rational numbers',
    seedKeyPatterns: ['y9-num-e-01', 'y9-num-e-02', 'y9-num-m-01', 'y9-num-m-04', 'y9-num-h-01', 'y9-num-h-02', 'y10-num-e-03', 'y10-num-m-03', 'y10-num-m-04', 'y10-num-h-01', 'y11-num-e-01', 'y11-num-m-02', 'y11-num-m-03', 'y11-num-h-01'],
    keywords: ['surd', 'irrational', 'rational', 'rationalise', '√', 'pi', 'π', 'simplify'],
  },
  {
    name: 'Bounds & Accuracy',
    description: 'Upper and lower bounds, error intervals, truncation',
    seedKeyPatterns: ['y10-num-m-01', 'y10-num-h-02'],
    keywords: ['bound', 'upper', 'lower', 'error interval', 'truncat', 'accuracy'],
  },
  {
    name: 'Recurring Decimals & Sequences',
    description: 'Converting recurring decimals to fractions, geometric series',
    seedKeyPatterns: ['y9-num-m-02', 'y11-num-h-03', 'y10-num-h-03'],
    keywords: ['recurring', 'repeating', 'sum to infinity', 'geometric series', '0.999'],
  },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const subjects = await base44.asServiceRole.entities.Subject.list();
    const mathsSubject = subjects.find(s => s.name === 'Maths' || s.name === 'Mathematics');
    if (!mathsSubject) return Response.json({ error: 'Maths subject not found' }, { status: 400 });

    const allGlobalTopics = await base44.asServiceRole.entities.GlobalTopic.list();
    let numberParent = allGlobalTopics.find(t => t.name === 'Number' && !t.parent_topic_id && t.subject_id === mathsSubject.id);
    if (!numberParent) {
      numberParent = await base44.asServiceRole.entities.GlobalTopic.create({
        subject_id: mathsSubject.id, subject_name: 'Maths', name: 'Number', order_index: 1,
        description: 'Number types, fractions, decimals, percentages, ratio, indices and surds'
      });
    }

    const existingSubtopics = allGlobalTopics.filter(t => t.parent_topic_id === numberParent.id);
    const subtopicMap = {};

    for (let i = 0; i < SUBTOPICS.length; i++) {
      const def = SUBTOPICS[i];
      const existing = existingSubtopics.find(t => t.name === def.name);
      if (existing) {
        subtopicMap[def.name] = existing.id;
      } else {
        const created = await base44.asServiceRole.entities.GlobalTopic.create({
          subject_id: mathsSubject.id, subject_name: 'Maths',
          name: def.name, description: def.description,
          parent_topic_id: numberParent.id, order_index: i + 1,
        });
        subtopicMap[def.name] = created.id;
      }
    }

    // Load all questions for the Number parent topic AND any already assigned to subtopics
    const allSubtopicIds = Object.values(subtopicMap);
    const parentQuestions = await base44.asServiceRole.entities.GlobalQuestion.filter(
      { global_topic_id: numberParent.id }, '-created_date', 2000
    );

    let updated = 0, unmatched = 0;

    for (const q of parentQuestions) {
      let assignedSubtopicId = null;

      if (q.seed_key) {
        for (const def of SUBTOPICS) {
          if (def.seedKeyPatterns.some(p => q.seed_key === p || q.seed_key.includes(p))) {
            assignedSubtopicId = subtopicMap[def.name];
            break;
          }
        }
      }

      if (!assignedSubtopicId && q.question_text) {
        const text = q.question_text.toLowerCase();
        for (const def of SUBTOPICS) {
          if (def.keywords.some(kw => text.includes(kw.toLowerCase()))) {
            assignedSubtopicId = subtopicMap[def.name];
            break;
          }
        }
      }

      if (!assignedSubtopicId) {
        assignedSubtopicId = subtopicMap['Fractions, Decimals & Percentages'];
        unmatched++;
      }

      await base44.asServiceRole.entities.GlobalQuestion.update(q.id, { global_topic_id: assignedSubtopicId });
      updated++;
    }

    return Response.json({
      success: true,
      numberParentId: numberParent.id,
      subtopicsCreated: Object.keys(subtopicMap).length,
      questionsUpdated: updated,
      unmatched,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});