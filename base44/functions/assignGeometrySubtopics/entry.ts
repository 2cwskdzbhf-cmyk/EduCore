import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const SUBTOPICS = [
  {
    name: 'Angles & Polygons',
    description: 'Angle rules, interior/exterior angles of polygons, parallel lines',
    seedKeyPatterns: ['y7-geo-e-01', 'y7-geo-e-04', 'y7-geo-e-07', 'y7-geo-e-08', 'y7-geo-m-02', 'y7-geo-m-04', 'y7-geo-m-05', 'y7-geo-m-06', 'y7-geo-h-01', 'y7-geo-h-02'],
    keywords: ['angle', 'polygon', 'interior', 'exterior', 'parallel', 'vertically opposite', 'straight line', 'triangle angles'],
  },
  {
    name: 'Area & Perimeter',
    description: 'Area and perimeter of 2D shapes including circles and sectors',
    seedKeyPatterns: ['y7-geo-e-02', 'y7-geo-e-05', 'y7-geo-m-01', 'y8-geo-e-01', 'y8-geo-e-03', 'y8-geo-m-03', 'y10-geo-m-05'],
    keywords: ['area', 'perimeter', 'circumference', 'sector', 'rectangle', 'triangle', 'circle'],
  },
  {
    name: 'Volume & Surface Area',
    description: 'Volume and surface area of 3D shapes: cuboid, cylinder, cone, sphere',
    seedKeyPatterns: ['y7-geo-e-06', 'y7-geo-m-03', 'y8-geo-h-01', 'y9-geo-m-04', 'y10-geo-e-02'],
    keywords: ['volume', 'surface area', 'cuboid', 'cylinder', 'cone', 'sphere', '3d', 'faces'],
  },
  {
    name: 'Properties of Shapes',
    description: 'Types of triangles, quadrilaterals, circles, 3D shapes',
    seedKeyPatterns: ['y7-geo-e-03', 'y8-geo-e-02', 'y8-geo-m-06'],
    keywords: ['equilateral', 'isosceles', 'rhombus', 'parallelogram', 'trapezium', 'diameter', 'radius', 'tangent'],
  },
  {
    name: 'Transformations',
    description: 'Reflection, rotation, translation, enlargement',
    seedKeyPatterns: ['y8-geo-e-04', 'y8-geo-m-04', 'y9-geo-m-05', 'y9-geo-m-06', 'y10-geo-h-02'],
    keywords: ['transform', 'reflect', 'rotate', 'translate', 'enlarge', 'scale factor', 'congruent', 'similar'],
  },
  {
    name: 'Pythagoras & Distance',
    description: 'Pythagoras theorem, distance between points, 3D Pythagoras',
    seedKeyPatterns: ['y8-geo-m-01', 'y8-geo-m-02', 'y8-geo-m-05', 'y8-geo-h-02', 'y8-geo-h-03'],
    keywords: ['pythagoras', 'hypotenuse', 'distance', 'midpoint', 'slant height'],
  },
  {
    name: 'Trigonometry',
    description: 'SOH CAH TOA, exact values, sine rule, cosine rule',
    seedKeyPatterns: ['y9-geo-e-01', 'y9-geo-e-02', 'y9-geo-e-03', 'y9-geo-e-04', 'y9-geo-m-01', 'y9-geo-m-02', 'y9-geo-h-01', 'y10-geo-e-01', 'y10-geo-m-01', 'y11-geo-e-01', 'y11-geo-m-01', 'y11-geo-m-02', 'y11-geo-m-03', 'y11-geo-h-01', 'y11-geo-h-02'],
    keywords: ['sin', 'cos', 'tan', 'trigonometry', 'soh cah toa', 'sine rule', 'cosine rule', 'angle of elevation'],
  },
  {
    name: 'Circle Theorems',
    description: 'Angle in semicircle, cyclic quadrilateral, tangent, alternate segment',
    seedKeyPatterns: ['y9-geo-m-03', 'y10-geo-h-01', 'y10-geo-h-03', 'y10-geo-m-04', 'y11-geo-e-02'],
    keywords: ['circle theorem', 'tangent', 'chord', 'cyclic', 'semicircle', 'alternate segment', 'inscribed'],
  },
  {
    name: 'Vectors',
    description: 'Column vectors, adding/subtracting vectors, vector geometry',
    seedKeyPatterns: ['y9-geo-m-05', 'y11-geo-h-03'],
    keywords: ['vector', 'column vector', 'displacement', 'resultant', 'OA', 'OB'],
  },
  {
    name: 'Bearings & Loci',
    description: 'Three-figure bearings, scale drawings, loci and construction',
    seedKeyPatterns: ['y10-geo-m-02'],
    keywords: ['bearing', 'loci', 'locus', 'construction', 'compass', 'north', 'scale drawing'],
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
    let geoParent = allGlobalTopics.find(t => t.name === 'Geometry & Measures' && !t.parent_topic_id && t.subject_id === mathsSubject.id);
    if (!geoParent) {
      geoParent = await base44.asServiceRole.entities.GlobalTopic.create({
        subject_id: mathsSubject.id, subject_name: 'Maths', name: 'Geometry & Measures', order_index: 3,
        description: 'Shapes, area, volume, angles, Pythagoras, trigonometry, transformations and vectors'
      });
    }

    const existingSubtopics = allGlobalTopics.filter(t => t.parent_topic_id === geoParent.id);
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
          parent_topic_id: geoParent.id, order_index: i + 1,
        });
        subtopicMap[def.name] = created.id;
      }
    }

    const parentQuestions = await base44.asServiceRole.entities.GlobalQuestion.filter(
      { global_topic_id: geoParent.id }, '-created_date', 2000
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
        assignedSubtopicId = subtopicMap['Area & Perimeter'];
        unmatched++;
      }

      await base44.asServiceRole.entities.GlobalQuestion.update(q.id, { global_topic_id: assignedSubtopicId });
      updated++;
    }

    return Response.json({
      success: true,
      geoParentId: geoParent.id,
      subtopicsCreated: Object.keys(subtopicMap).length,
      questionsUpdated: updated,
      unmatched,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});