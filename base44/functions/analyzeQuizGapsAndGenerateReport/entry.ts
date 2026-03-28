import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import OpenAI from 'npm:openai';

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { quiz_attempt_id } = payload;

    if (!quiz_attempt_id) {
      return Response.json({ error: 'quiz_attempt_id is required' }, { status: 400 });
    }

    // Fetch the quiz attempt
    const attempts = await base44.asServiceRole.entities.QuizAttempt.filter({ id: quiz_attempt_id });
    if (!attempts || attempts.length === 0) {
      return Response.json({ error: 'Quiz attempt not found' }, { status: 404 });
    }

    const attempt = attempts[0];
    const { student_email, quiz_id, topic_id, answers, accuracy_percent, correct_answers, questions_answered } = attempt;

    // Fetch quiz details
    const quizzes = await base44.asServiceRole.entities.Quiz.filter({ id: quiz_id });
    const quiz = quizzes?.[0];

    // Fetch topic details
    const topics = await base44.asServiceRole.entities.Topic.filter({ id: topic_id });
    const topic = topics?.[0];

    // Fetch questions to get details about wrong answers
    let questionDetails = [];
    if (quiz?.question_ids?.length > 0) {
      const allQuestions = await base44.asServiceRole.entities.QuizQuestion.list();
      questionDetails = allQuestions.filter(q => quiz.question_ids.includes(q.id));
    }

    // Analyze wrong answers to identify weak areas
    const wrongAnswers = answers?.filter(a => !a.is_correct) || [];
    const weakTopics = new Map();

    for (const wrong of wrongAnswers) {
      const question = questionDetails.find(q => q.id === wrong.question_id);
      if (question) {
        const key = question.tags?.[0] || question.difficulty || 'general';
        weakTopics.set(key, (weakTopics.get(key) || 0) + 1);
      }
    }

    // Build context for AI analysis
    const analysisContext = `
Student Quiz Results:
- Student: ${student_email}
- Quiz: ${quiz?.title || 'Unknown'}
- Topic: ${topic?.name || 'Unknown'}
- Score: ${accuracy_percent}%
- Questions Answered: ${questions_answered}/${correct_answers} correct
- Weak Areas: ${Array.from(weakTopics.entries())
      .map(([k, v]) => `${k} (${v} errors)`)
      .join(', ')}

Incorrect Answers Analysis:
${wrongAnswers.map((w, i) => {
  const q = questionDetails.find(qu => qu.id === w.question_id);
  return `${i + 1}. ${q?.prompt || 'Unknown'} - Student answered: "${w.answer}", Correct: "${q?.correct_answer || q?.options?.[q.correct_index]}"`;
}).join('\n')}

Please provide:
1. Specific knowledge gaps identified
2. Recommended focus areas for improvement
3. Suggested practice topics (3-5 most critical)
4. Personalized learning recommendations
Return as JSON object with keys: gaps, focus_areas, recommended_topics, recommendations
    `.trim();

    // Call OpenAI to generate analysis
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an educational assessment expert. Analyze student quiz performance and identify specific knowledge gaps. Return ONLY valid JSON.',
        },
        {
          role: 'user',
          content: analysisContext,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const analysisText = completion.choices[0].message.content;
    
    // Parse AI response
    let analysis = {};
    try {
      // Extract JSON from response (handle cases where AI adds extra text)
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      }
    } catch {
      analysis = {
        gaps: Array.from(weakTopics.keys()),
        focus_areas: Array.from(weakTopics.keys()).slice(0, 3),
        recommended_topics: Array.from(weakTopics.keys()).slice(0, 3),
        recommendations: 'Review the weak areas identified above',
      };
    }

    // Store the report
    const report = await base44.asServiceRole.entities.QuizAttempt.update(quiz_attempt_id, {
      ai_analysis: {
        gaps: analysis.gaps || [],
        focus_areas: analysis.focus_areas || [],
        recommended_topics: analysis.recommended_topics || [],
        recommendations: analysis.recommendations || '',
        generated_at: new Date().toISOString(),
      },
    });

    // Trigger practice module assignment
    try {
      await base44.asServiceRole.functions.invoke('assignPracticeModules', {
        student_email,
        topic_id,
        weak_areas: analysis.focus_areas || Array.from(weakTopics.keys()),
        quiz_attempt_id,
      });
    } catch (err) {
      console.error('Failed to assign practice modules:', err);
    }

    return Response.json({
      success: true,
      report_id: quiz_attempt_id,
      analysis,
      message: 'Analysis complete and practice modules assigned',
    });
  } catch (error) {
    console.error('Error in analyzeQuizGapsAndGenerateReport:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});