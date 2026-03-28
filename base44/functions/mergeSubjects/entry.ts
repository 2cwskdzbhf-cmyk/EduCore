import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    // Get all subjects
    const subjects = await base44.asServiceRole.entities.Subject.list();

    // Find "Maths" and "Mathematics"
    const mathsSubject = subjects.find(s => s.name === 'Maths');
    const mathematicsSubject = subjects.find(s => s.name === 'Mathematics');

    if (!mathsSubject) {
      return Response.json({ error: 'Maths subject not found' }, { status: 404 });
    }

    if (!mathematicsSubject) {
      return Response.json({ message: 'No Mathematics subject to merge', merged: 0 });
    }

    // Get all topics for Mathematics
    const mathematicsTopics = await base44.asServiceRole.entities.Topic.filter({
      subject_id: mathematicsSubject.id
    });

    // Get all questions for Mathematics
    const mathematicsQuestions = await base44.asServiceRole.entities.Question.filter({
      subject_id: mathematicsSubject.id
    });

    let topicsUpdated = 0;
    let questionsUpdated = 0;

    // Update topics to point to Maths
    for (const topic of mathematicsTopics) {
      await base44.asServiceRole.entities.Topic.update(topic.id, {
        subject_id: mathsSubject.id
      });
      topicsUpdated++;
    }

    // Update questions to point to Maths
    for (const question of mathematicsQuestions) {
      await base44.asServiceRole.entities.Question.update(question.id, {
        subject_id: mathsSubject.id
      });
      questionsUpdated++;
    }

    // Delete Mathematics subject
    await base44.asServiceRole.entities.Subject.delete(mathematicsSubject.id);

    return Response.json({
      success: true,
      message: 'Successfully merged Mathematics into Maths',
      subjects_deleted: 1,
      topics_updated: topicsUpdated,
      questions_updated: questionsUpdated
    });

  } catch (error) {
    console.error('Merge error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});