import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import OpenAI from 'npm:openai';

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { studentEmail } = await req.json();

    if (!studentEmail) {
      return Response.json({ error: 'Student email required' }, { status: 400 });
    }

    // Fetch student data
    const [progress, quizAttempts, submissions, topics] = await Promise.all([
      base44.entities.StudentProgress.filter({ student_email: studentEmail }).then(r => r[0]),
      base44.entities.QuizAttempt.filter({ student_email: studentEmail }, '-completed_at', 20),
      base44.entities.AssignmentSubmission.filter({ student_email: studentEmail }, '-submitted_at', 20),
      base44.entities.Topic.list()
    ]);

    // Build performance summary
    const performanceData = {
      totalQuizzes: quizAttempts.length,
      avgAccuracy: progress?.accuracy_percent || 0,
      currentStreak: progress?.current_streak || 0,
      weakAreas: (progress?.weak_areas || []).map(id => topics.find(t => t.id === id)?.name || id),
      strongAreas: (progress?.strong_areas || []).map(id => topics.find(t => t.id === id)?.name || id),
      recentQuizzes: quizAttempts.slice(0, 5).map(q => ({
        accuracy: q.accuracy_percent,
        questions: q.questions_answered,
        date: q.completed_at
      })),
      assignments: submissions.map(s => ({
        status: s.status,
        score: s.percentage,
        feedback: s.teacher_feedback
      }))
    };

    const prompt = `Analyze this student's performance data and provide personalized feedback:

${JSON.stringify(performanceData, null, 2)}

Provide:
1. Overall assessment (2-3 sentences)
2. Specific strengths (2-3 points)
3. Areas for improvement (2-3 points with actionable advice)
4. Recommended next steps (3-4 specific actions)
5. Motivational message

Format as JSON:
{
  "overall": "string",
  "strengths": ["string"],
  "improvements": [{"area": "string", "advice": "string"}],
  "nextSteps": ["string"],
  "motivation": "string"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an experienced educator providing personalized, constructive feedback. Be encouraging but honest. Return ONLY valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7
    });

    const content = response.choices[0].message.content.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);

    return Response.json({ analysis, performanceData });
  } catch (error) {
    console.error('[ERROR]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});