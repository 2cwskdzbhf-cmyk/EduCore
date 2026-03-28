import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const SUBTOPICS = [
  {
    name: 'Averages & Range',
    description: 'Mean, median, mode and range from lists and frequency tables',
    seedKeyPatterns: ['y7-stat-e-01', 'y7-stat-e-02', 'y7-stat-e-03', 'y7-stat-e-06', 'y7-stat-m-01', 'y8-stat-e-01', 'y8-stat-h-03'],
    keywords: ['mean', 'median', 'mode', 'range', 'average', 'middle value', 'most common'],
  },
  {
    name: 'Data Representation',
    description: 'Bar charts, pie charts, scatter graphs, histograms, frequency polygons',
    seedKeyPatterns: ['y7-stat-e-07', 'y8-stat-e-02', 'y8-stat-e-03', 'y8-stat-m-03', 'y9-stat-m-04', 'y10-stat-m-05'],
    keywords: ['chart', 'graph', 'histogram', 'bar', 'pie', 'scatter', 'diagram', 'plot', 'frequency polygon', 'cumulative'],
  },
  {
    name: 'Basic Probability',
    description: 'Probability scale, listing outcomes, theoretical probability',
    seedKeyPatterns: ['y7-stat-e-04', 'y7-stat-e-05', 'y7-stat-e-08', 'y7-stat-m-04', 'y8-stat-e-04', 'y9-stat-e-02', 'y11-stat-e-02'],
    keywords: ['probability', 'p(', 'likely', 'impossible', 'certain', 'fair', 'outcome', 'chance'],
  },
  {
    name: 'Combined & Conditional Probability',
    description: 'Tree diagrams, Venn diagrams, conditional probability, independent events',
    seedKeyPatterns: ['y7-stat-h-01', 'y8-stat-m-01', 'y8-stat-h-02', 'y9-stat-m-01', 'y9-stat-m-02', 'y9-stat-m-03', 'y10-stat-e-02', 'y10-stat-m-01', 'y10-stat-m-04', 'y10-stat-h-02', 'y11-stat-m-02'],
    keywords: ['tree diagram', 'venn', 'conditional', 'independent', 'mutually exclusive', 'p(a and b)', 'p(a or b)', 'intersection', 'union'],
  },
  {
    name: 'Sampling & Data Collection',
    description: 'Sampling methods, bias, stratified sampling, questionnaire design',
    seedKeyPatterns: ['y8-stat-h-01', 'y9-stat-h-01', 'y9-stat-m-05', 'y10-stat-m-02'],
    keywords: ['sample', 'bias', 'stratified', 'random', 'population', 'survey', 'questionnaire'],
  },
  {
    name: 'Spread & Distributions',
    description: 'IQR, standard deviation, box plots, normal distribution',
    seedKeyPatterns: ['y8-stat-m-04', 'y8-stat-m-05', 'y9-stat-h-02', 'y10-stat-e-01', 'y10-stat-h-03', 'y11-stat-e-01', 'y11-stat-h-04'],
    keywords: ['interquartile', 'iqr', 'quartile', 'standard deviation', 'box plot', 'spread', 'normal distribution', 'bell'],
  },
  {
    name: 'Expected Frequency & Relative Frequency',
    description: 'Expected frequency, relative frequency, experimental probability',
    seedKeyPatterns: ['y7-stat-m-02', 'y7-stat-m-05', 'y7-stat-h-02', 'y9-stat-e-01', 'y10-stat-m-03', 'y10-stat-m-05'],
    keywords: ['expected', 'relative frequency', 'experimental', 'frequency', 'trial', 'estimate'],
  },
  {
    name: 'Correlation & Regression',
    description: 'Scatter diagrams, lines of best fit, correlation coefficients, regression',
    seedKeyPatterns: ['y8-stat-m-02', 'y11-stat-h-05'],
    keywords: ['correlation', 'line of best fit', 'regression', 'scatter', 'pearson', 'positive correlation', 'negative correlation'],
  },
  {
    name: 'Advanced Statistics',
    description: 'Hypothesis testing, chi-squared, binomial distribution, expected value',
    seedKeyPatterns: ['y10-stat-h-01', 'y11-stat-m-01', 'y11-stat-m-03', 'y11-stat-m-04', 'y11-stat-h-01', 'y11-stat-h-02', 'y11-stat-h-03'],
    keywords: ['hypothesis', 'chi-squared', 'binomial', 'expected value', 'p-value', 'null hypothesis', 'significance'],
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
    let statsParent = allGlobalTopics.find(t => t.name === 'Statistics & Probability' && !t.parent_topic_id && t.subject_id === mathsSubject.id);
    if (!statsParent) {
      statsParent = await base44.asServiceRole.entities.GlobalTopic.create({
        subject_id: mathsSubject.id, subject_name: 'Maths', name: 'Statistics & Probability', order_index: 4,
        description: 'Data handling, averages, charts, probability, tree diagrams and distributions'
      });
    }

    const existingSubtopics = allGlobalTopics.filter(t => t.parent_topic_id === statsParent.id);
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
          parent_topic_id: statsParent.id, order_index: i + 1,
        });
        subtopicMap[def.name] = created.id;
      }
    }

    const parentQuestions = await base44.asServiceRole.entities.GlobalQuestion.filter(
      { global_topic_id: statsParent.id }, '-created_date', 2000
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
        assignedSubtopicId = subtopicMap['Basic Probability'];
        unmatched++;
      }

      await base44.asServiceRole.entities.GlobalQuestion.update(q.id, { global_topic_id: assignedSubtopicId });
      updated++;
    }

    return Response.json({
      success: true,
      statsParentId: statsParent.id,
      subtopicsCreated: Object.keys(subtopicMap).length,
      questionsUpdated: updated,
      unmatched,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});