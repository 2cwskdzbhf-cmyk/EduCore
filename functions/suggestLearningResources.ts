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

    // Fetch student learning data
    const [progress, learningPath, topics, subjects, reflections] = await Promise.all([
      base44.entities.StudentProgress.filter({ student_email: studentEmail }).then(r => r[0]),
      base44.entities.PracticeAttempt.filter({ student_email: studentEmail }, '-created_date', 10),
      base44.entities.Topic.list(),
      base44.entities.Subject.list(),
      base44.entities.StudentReflection.filter({ student_email: studentEmail }, '-created_date', 5)
    ]);

    const learningProfile = {
      weakAreas: (progress?.weak_areas || []).map(id => topics.find(t => t.id === id)?.name || id),
      weakSkills: progress?.weak_skills || [],
      strongAreas: (progress?.strong_areas || []).map(id => topics.find(t => t.id === id)?.name || id),
      topicMastery: progress?.topic_mastery || {},
      recentReflections: reflections.map(r => ({
        type: r.reflection_type,
        mood: r.mood,
        content: r.content?.substring(0, 200)
      })),
      accuracy: progress?.accuracy_percent || 0
    };

    const prompt = `Based on this student's learning profile, suggest personalized resources and activities:

${JSON.stringify(learningProfile, null, 2)}

Suggest 5-8 resources/activities covering:
1. Practice activities for weak areas
2. Challenge activities for strong areas
3. Interactive learning resources
4. Recommended videos/articles
5. Real-world application projects

Format as JSON array:
[
  {
    "title": "Resource title",
    "type": "practice|video|article|project|interactive",
    "description": "Why this helps",
    "targetArea": "Weak area or skill",
    "difficulty": "easy|medium|hard",
    "estimatedTime": "15 minutes"
  }
]`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an educational AI suggesting personalized learning resources. Be specific and practical. Return ONLY valid JSON array."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.8
    });

    const content = response.choices[0].message.content.trim();
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    const resources = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);

    return Response.json({ resources, learningProfile });
  } catch (error) {
    console.error('[ERROR]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});