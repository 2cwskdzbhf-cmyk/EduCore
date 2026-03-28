import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { studentEmail, topicId, weakSkills = [], performanceData = {} } = await req.json();

    if (!studentEmail || !topicId) {
      return Response.json({ error: 'Student email and topic ID are required' }, { status: 400 });
    }

    // Fetch topic details
    const topics = await base44.asServiceRole.entities.Topic.filter({ id: topicId });
    const topic = topics[0];

    const subjects = await base44.asServiceRole.entities.Subject.filter({ id: topic?.subject_id });
    const subject = subjects[0];

    // Fetch student's recent performance
    const recentAttempts = await base44.asServiceRole.entities.QuizAttempt.filter(
      { student_email: studentEmail, topic_id: topicId },
      '-completed_at',
      5
    );

    const avgAccuracy = recentAttempts.length > 0
      ? recentAttempts.reduce((sum, a) => sum + a.accuracy_percent, 0) / recentAttempts.length
      : 0;

    // Build prompt for resource suggestions
    const prompt = `You are an educational expert helping a student who is struggling with a topic.

Subject: ${subject?.name || 'General'}
Topic: ${topic?.name || 'Unknown'}
Student's Recent Performance: ${Math.round(avgAccuracy)}% average accuracy
Weak Skills: ${weakSkills.join(', ') || 'Not specified'}
Recent Quiz Scores: ${recentAttempts.map(a => Math.round(a.accuracy_percent) + '%').join(', ')}

Suggest 5-7 personalized learning resources that would help this student improve. For each resource, provide:

1. Resource Type (video, article, practice, interactive, worksheet, game)
2. Title
3. Description (why it's helpful for this student)
4. Difficulty Level (beginner, intermediate, advanced)
5. Estimated Time (in minutes)
6. Focus Areas (specific skills this addresses)

Format as JSON with this structure.`;

    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          resources: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string" },
                title: { type: "string" },
                description: { type: "string" },
                url: { type: "string" },
                difficulty: { type: "string" },
                estimated_minutes: { type: "number" },
                focus_areas: {
                  type: "array",
                  items: { type: "string" }
                }
              }
            }
          },
          learning_path_suggestion: { type: "string" },
          motivation_message: { type: "string" }
        }
      }
    });

    return Response.json({
      success: true,
      topic: topic?.name,
      subject: subject?.name,
      current_performance: Math.round(avgAccuracy),
      resources: aiResponse.resources || [],
      learning_path: aiResponse.learning_path_suggestion || '',
      motivation: aiResponse.motivation_message || ''
    });

  } catch (error) {
    console.error('[RESOURCES_ERROR]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});