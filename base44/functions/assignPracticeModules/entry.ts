import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { student_email, topic_id, weak_areas, quiz_attempt_id } = payload;

    if (!student_email || !topic_id || !weak_areas) {
      return Response.json(
        { error: 'Missing required fields: student_email, topic_id, weak_areas' },
        { status: 400 }
      );
    }

    // Get topic info
    const topics = await base44.asServiceRole.entities.Topic.filter({ id: topic_id });
    const topic = topics?.[0];

    if (!topic) {
      return Response.json({ error: 'Topic not found' }, { status: 404 });
    }

    // Fetch or create a practice assignment for this student
    const assignments = await base44.asServiceRole.entities.Assignment.filter({
      teacher_email: 'ai-system@educore.internal',
      topic_id,
    });

    let assignment = assignments?.[0];

    // If no template assignment exists, create one
    if (!assignment) {
      assignment = await base44.asServiceRole.entities.Assignment.create({
        title: `${topic.name} - Catch-Up Practice (AI-Generated)`,
        description: `Personalized practice module for ${topic.name} based on quiz analysis`,
        instructions: `This module was automatically created based on your recent quiz performance. Focus on the areas where you struggled most.`,
        teacher_email: 'ai-system@educore.internal',
        subject_id: topic.subject_id || '',
        topic_id,
        assignment_type: 'practice',
        estimated_minutes: 45,
        difficulty: 'mixed',
        status: 'published',
        resources: [],
      });
    }

    // Create or update a submission for this student
    const existingSubmission = await base44.asServiceRole.entities.AssignmentSubmission.filter({
      assignment_id: assignment.id,
      student_email,
    });

    let submission;
    if (existingSubmission?.length > 0) {
      submission = existingSubmission[0];
    } else {
      submission = await base44.asServiceRole.entities.AssignmentSubmission.create({
        assignment_id: assignment.id,
        student_email,
        class_id: '', // Will be populated if needed
        status: 'not_started',
      });
    }

    // Create a catch-up lesson if it doesn't exist
    const lessons = await base44.asServiceRole.entities.Lesson.filter({
      topic_id,
    });

    let lesson = lessons?.[0];

    if (!lesson) {
      lesson = await base44.asServiceRole.entities.Lesson.create({
        topic_id,
        title: `${topic.name} - Review & Catch-Up`,
        content: `# ${topic.name} Review\n\nThis lesson focuses on the key concepts you found challenging:\n\n${weak_areas.map((area) => `- **${area}**: Review this concept carefully`).join('\n')}\n\nUse the practice questions below to test your understanding.`,
        content_type: 'mixed',
        order: 1,
        duration_minutes: 30,
        xp_reward: 50,
        skills_covered: weak_areas,
        learning_objectives: [`Master ${topic.name} fundamentals`, 'Improve weak areas identified in recent quiz'],
        is_active: true,
      });
    }

    // Update student progress with weak areas
    const progress = await base44.asServiceRole.entities.StudentProgress.filter({
      student_email,
    });

    if (progress?.length > 0) {
      const p = progress[0];
      const updated_weak_skills = Array.from(new Set([
        ...(p.weak_skills || []),
        ...weak_areas,
      ]));

      await base44.asServiceRole.entities.StudentProgress.update(p.id, {
        weak_skills: updated_weak_skills,
      });
    }

    return Response.json({
      success: true,
      assignment_id: assignment.id,
      lesson_id: lesson.id,
      submission_id: submission.id,
      weak_areas,
      message: `Created catch-up practice for ${weak_areas.join(', ')}`,
    });
  } catch (error) {
    console.error('Error in assignPracticeModules:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});