import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Sub-topic definitions with seed_key patterns
const SUBTOPICS = [
  {
    name: 'Expressions & Like Terms',
    description: 'Simplifying, collecting like terms, substitution',
    seedKeyPatterns: ['alg-e-01', 'alg-e-06', 'alg-e-07', 'alg-e-08', 'alg-e-09', 'alg-e-02', 'alg-e-03', 'alg-e-04', 'alg-e-05', 'alg-e-10'],
    // Match by question content too
    keywords: ['simplify', 'like term', 'collect', 'evaluate', 'substitute', 'expression'],
  },
  {
    name: 'Expanding & Factorising',
    description: 'Expanding brackets, factorising expressions',
    seedKeyPatterns: ['y7-alg-m-04', 'y8-alg-e-01', 'y8-alg-e-03', 'y8-alg-m-02', 'y8-alg-m-05', 'y8-alg-h-02', 'y9-alg-e-02', 'y9-alg-e-03', 'y9-alg-m-06', 'y9-alg-m-09', 'y9-alg-h-05', 'y10-alg-m-03', 'y11-alg-m-04'],
    keywords: ['expand', 'factorise', 'factorize', 'brackets', 'foil', 'hcf'],
  },
  {
    name: 'Solving Equations',
    description: 'Linear and quadratic equations, rearranging',
    seedKeyPatterns: ['y7-alg-m-01', 'y7-alg-m-02', 'y7-alg-m-05', 'y7-alg-h-01', 'y7-alg-h-02', 'y7-alg-h-05', 'y8-alg-e-02', 'y8-alg-m-01', 'y8-alg-m-03', 'y8-alg-h-01', 'y8-alg-h-04', 'y9-alg-m-01', 'y9-alg-h-01', 'y9-alg-h-04', 'y10-alg-m-02', 'y10-alg-m-05', 'y10-alg-h-02', 'y11-alg-m-05'],
    keywords: ['solve', 'solution', 'equation', 'find x', 'find y', 'rearrange', 'subject'],
  },
  {
    name: 'Sequences & nth Term',
    description: 'Arithmetic and geometric sequences, nth term',
    seedKeyPatterns: ['y7-alg-m-03', 'y7-alg-m-07', 'y7-alg-m-08', 'y7-alg-h-04', 'y11-alg-e-01', 'y11-alg-e-02', 'y11-alg-e-05', 'y11-alg-m-02', 'y11-alg-m-03', 'y11-alg-m-06', 'y11-alg-m-07', 'y11-alg-h-04'],
    keywords: ['sequence', 'nth term', 'arithmetic', 'geometric', 'common difference', 'common ratio', 'term'],
  },
  {
    name: 'Straight Line Graphs',
    description: 'Gradient, y-intercept, equation of a line',
    seedKeyPatterns: ['y8-alg-e-05', 'y8-alg-e-06', 'y8-alg-m-04', 'y8-alg-m-08', 'y10-alg-e-03', 'y10-alg-h-01', 'y10-alg-m-06'],
    keywords: ['gradient', 'y-intercept', 'straight line', 'y = mx', 'perpendicular', 'parallel', 'graph'],
  },
  {
    name: 'Quadratics & Graphs',
    description: 'Quadratic equations, parabolas, completing the square',
    seedKeyPatterns: ['y8-alg-e-07', 'y8-alg-h-05', 'y8-alg-h-06', 'y9-alg-e-01', 'y9-alg-m-01', 'y9-alg-m-02', 'y9-alg-m-05', 'y10-alg-e-01', 'y10-alg-e-02', 'y10-alg-m-01', 'y10-alg-h-03', 'y10-alg-h-05', 'y10-alg-h-07', 'y11-alg-h-05', 'y11-alg-h-06'],
    keywords: ['quadratic', 'parabola', 'complete the square', 'discriminant', 'vertex', 'turning point', 'x²'],
  },
  {
    name: 'Simultaneous Equations',
    description: 'Solving pairs of equations simultaneously',
    seedKeyPatterns: ['y8-alg-m-06', 'y8-alg-h-03', 'y9-alg-m-03'],
    keywords: ['simultaneous', 'pair of equations', 'elimination', 'substitution method'],
  },
  {
    name: 'Indices & Surds',
    description: 'Powers, roots, surds, laws of indices',
    seedKeyPatterns: ['y8-alg-e-04', 'y8-alg-m-07', 'y9-alg-e-04', 'y9-alg-e-05', 'y9-alg-m-04', 'y9-alg-m-08', 'y10-alg-e-04', 'y10-alg-e-05', 'y10-alg-m-07', 'y10-alg-h-06', 'y11-alg-e-03', 'y11-alg-e-04'],
    keywords: ['indices', 'index', 'power', 'surd', 'root', 'simplify √', 'rationalise', 'laws of'],
  },
  {
    name: 'Algebraic Proof & Advanced',
    description: 'Proofs, algebraic fractions, functions',
    seedKeyPatterns: ['y9-alg-h-02', 'y9-alg-h-03', 'y10-alg-h-04', 'y11-alg-m-01', 'y11-alg-m-08', 'y11-alg-h-01', 'y11-alg-h-02', 'y11-alg-h-03', 'y11-alg-h-07', 'y11-alg-h-08', 'y11-alg-h-09', 'y11-alg-h-10'],
    keywords: ['prove', 'proof', 'algebraic fraction', 'function', 'inverse', 'binomial', 'logarithm'],
  },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    // 1. Find Maths subject
    const subjects = await base44.asServiceRole.entities.Subject.list();
    const mathsSubject = subjects.find(s =>
      s.name === 'Maths' || s.name === 'Mathematics'
    );
    if (!mathsSubject) return Response.json({ error: 'Maths subject not found' }, { status: 400 });

    // 2. Find or create Algebra parent topic
    const allGlobalTopics = await base44.asServiceRole.entities.GlobalTopic.list();
    let algebraParent = allGlobalTopics.find(t =>
      t.name.toLowerCase() === 'algebra' && !t.parent_topic_id
    );
    if (!algebraParent) {
      algebraParent = await base44.asServiceRole.entities.GlobalTopic.create({
        subject_id: mathsSubject.id,
        subject_name: 'Maths',
        name: 'Algebra',
        order_index: 2,
        description: 'Algebraic manipulation, equations, expressions, sequences and graphs'
      });
    }

    // 3. Create sub-topics (skip if already exist)
    const existingSubtopics = allGlobalTopics.filter(t => t.parent_topic_id === algebraParent.id);
    const subtopicMap = {}; // name -> id

    for (let i = 0; i < SUBTOPICS.length; i++) {
      const def = SUBTOPICS[i];
      const existing = existingSubtopics.find(t => t.name === def.name);
      if (existing) {
        subtopicMap[def.name] = existing.id;
      } else {
        const created = await base44.asServiceRole.entities.GlobalTopic.create({
          subject_id: mathsSubject.id,
          subject_name: 'Maths',
          name: def.name,
          description: def.description,
          parent_topic_id: algebraParent.id,
          order_index: i + 1,
        });
        subtopicMap[def.name] = created.id;
      }
    }

    // 4. Load all algebra questions
    const questions = await base44.asServiceRole.entities.GlobalQuestion.filter(
      { global_topic_id: algebraParent.id }, '-created_date', 2000
    );
    console.log('Questions loaded:', questions.length, 'first:', JSON.stringify(questions[0]));

    // 5. Assign each question to a sub-topic by seed_key matching first, then keyword
    let updated = 0;
    let unmatched = 0;

    for (const q of questions) {
      let assignedSubtopicId = null;

      // Try seed_key match first (most precise)
      if (q.seed_key) {
        for (const def of SUBTOPICS) {
          if (def.seedKeyPatterns.some(p => q.seed_key === p || q.seed_key.includes(p))) {
            assignedSubtopicId = subtopicMap[def.name];
            break;
          }
        }
      }

      // Fallback: keyword match in question text
      if (!assignedSubtopicId && q.question_text) {
        const text = q.question_text.toLowerCase();
        for (const def of SUBTOPICS) {
          if (def.keywords.some(kw => text.includes(kw.toLowerCase()))) {
            assignedSubtopicId = subtopicMap[def.name];
            break;
          }
        }
      }

      // Default: put unmatched under Expressions & Like Terms
      if (!assignedSubtopicId) {
        assignedSubtopicId = subtopicMap['Expressions & Like Terms'];
        unmatched++;
      }

      await base44.asServiceRole.entities.GlobalQuestion.update(q.id, {
        global_topic_id: assignedSubtopicId,
        topic_name: null // clear old field
      });
      updated++;
    }

    return Response.json({
      success: true,
      algebraParentId: algebraParent.id,
      subtopicsCreated: Object.keys(subtopicMap).length,
      questionsUpdated: updated,
      unmatched,
      subtopics: Object.entries(subtopicMap).map(([name, id]) => ({ name, id }))
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});