import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { submissionId, assignmentId, rubric } = await req.json();

    if (!submissionId) {
      return Response.json({ error: 'Submission ID is required' }, { status: 400 });
    }

    // Fetch submission
    const submission = await base44.asServiceRole.entities.AssignmentSubmission.filter({ id: submissionId });
    if (!submission || submission.length === 0) {
      return Response.json({ error: 'Submission not found' }, { status: 404 });
    }

    const submissionData = submission[0];

    // Fetch assignment details
    const assignment = await base44.asServiceRole.entities.Assignment.filter({ id: assignmentId || submissionData.assignment_id });
    const assignmentData = assignment?.[0];

    // Build feedback prompt
    let prompt = `You are an expert teacher providing constructive feedback on a student's assignment.

Assignment Type: ${assignmentData?.assignment_type || 'written'}
Assignment Instructions: ${assignmentData?.instructions || 'N/A'}

Student's Response:
${submissionData.written_response || 'No written response provided'}

`;

    if (rubric && rubric.length > 0) {
      prompt += `\nGrading Rubric:\n`;
      rubric.forEach(r => {
        prompt += `- ${r.criteria} (${r.max_points} points): ${r.description}\n`;
      });
    }

    prompt += `\nProvide comprehensive feedback that includes:
1. Strengths: What the student did well (2-3 specific points)
2. Areas for Improvement: What could be better (2-3 specific points with actionable suggestions)
3. Suggested Score: If rubric provided, suggest scores for each criterion
4. Overall Assessment: A brief summary and encouragement

Be constructive, specific, and encouraging. Focus on learning growth.`;

    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          strengths: {
            type: "array",
            items: { type: "string" }
          },
          improvements: {
            type: "array",
            items: { type: "string" }
          },
          rubric_scores: {
            type: "array",
            items: {
              type: "object",
              properties: {
                criteria: { type: "string" },
                score: { type: "number" },
                feedback: { type: "string" }
              }
            }
          },
          overall_feedback: { type: "string" },
          suggested_percentage: { type: "number" }
        }
      }
    });

    // Calculate total score if rubric provided
    let totalScore = 0;
    let maxScore = 0;
    
    if (aiResponse.rubric_scores && rubric) {
      aiResponse.rubric_scores.forEach((rs, idx) => {
        totalScore += rs.score || 0;
        maxScore += rubric[idx]?.max_points || 0;
      });
    }

    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : aiResponse.suggested_percentage || 0;

    return Response.json({
      success: true,
      feedback: {
        strengths: aiResponse.strengths || [],
        improvements: aiResponse.improvements || [],
        rubric_scores: aiResponse.rubric_scores || [],
        overall_feedback: aiResponse.overall_feedback || '',
        suggested_score: totalScore,
        max_score: maxScore,
        suggested_percentage: percentage
      }
    });

  } catch (error) {
    console.error('[FEEDBACK_ERROR]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});