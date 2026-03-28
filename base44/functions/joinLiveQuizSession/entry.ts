import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { joinCode, nickname, studentEmail } = await req.json();

    if (!joinCode || !nickname) {
      return Response.json({ error: 'joinCode and nickname required' }, { status: 400 });
    }

    // Find active session
    const sessions = await base44.asServiceRole.entities.LiveQuizSession.filter({ 
      join_code: joinCode.toUpperCase(),
      status: { $in: ['lobby', 'live', 'intermission'] }
    });

    const session = sessions[0];
    if (!session) {
      return Response.json({ error: 'Session not found or ended' }, { status: 404 });
    }

    // Check if player already exists (reconnection)
    const existingPlayers = await base44.asServiceRole.entities.LiveQuizPlayer.filter({
      session_id: session.id,
      nickname: nickname
    });

    let player;
    if (existingPlayers && existingPlayers.length > 0) {
      // Reconnect existing player
      player = existingPlayers[0];
      await base44.asServiceRole.entities.LiveQuizPlayer.update(player.id, {
        connected: true,
        last_seen: new Date().toISOString()
      });
    } else {
      // Create new player
      player = await base44.asServiceRole.entities.LiveQuizPlayer.create({
        session_id: session.id,
        nickname: nickname,
        student_email: studentEmail || null,
        total_points: 0,
        correct_count: 0,
        questions_answered: 0,
        average_response_time_ms: 0,
        current_streak: 0,
        longest_streak: 0,
        connected: true,
        last_seen: new Date().toISOString()
      });

      // Update session player count
      await base44.asServiceRole.entities.LiveQuizSession.update(session.id, {
        player_count: (session.player_count || 0) + 1
      });
    }

    // Get quiz set info
    const quizSets = await base44.asServiceRole.entities.QuizSet.filter({ id: session.quiz_set_id });
    const quizSet = quizSets[0];

    return Response.json({ 
      session,
      player,
      quizSet
    });

  } catch (error) {
    console.error('Join session error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});