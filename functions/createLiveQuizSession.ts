import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Generate random join code
function generateJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { quizSetId, settings = {} } = await req.json();

    if (!quizSetId) {
      return Response.json({ error: 'quizSetId required' }, { status: 400 });
    }

    // Verify quiz set exists and get question count
    const quizSets = await base44.asServiceRole.entities.QuizSet.filter({ id: quizSetId });
    const quizSet = quizSets[0];

    if (!quizSet) {
      return Response.json({ error: 'Quiz set not found' }, { status: 404 });
    }

    // Generate unique join code
    let joinCode = generateJoinCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await base44.asServiceRole.entities.LiveQuizSession.filter({ 
        join_code: joinCode,
        status: { $in: ['lobby', 'live', 'intermission'] }
      });
      if (!existing || existing.length === 0) break;
      joinCode = generateJoinCode();
      attempts++;
    }

    // Create session
    const session = await base44.asServiceRole.entities.LiveQuizSession.create({
      join_code: joinCode,
      host_email: user.email,
      quiz_set_id: quizSetId,
      status: 'lobby',
      current_question_index: -1,
      player_count: 0,
      settings: {
        time_per_question: settings.timePerQuestion || quizSet.time_limit_per_question || 15000,
        base_points: settings.basePoints || 500,
        round_multiplier_increment: settings.roundMultiplierIncrement || 0.25
      }
    });

    return Response.json({ 
      session,
      quizSet 
    });

  } catch (error) {
    console.error('Create session error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});