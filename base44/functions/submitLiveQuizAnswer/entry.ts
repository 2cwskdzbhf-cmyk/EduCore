import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { sessionId, playerId, questionId, questionIndex, selectedOption, responseTimeMs } = await req.json();

    if (!sessionId || !playerId || !questionId || selectedOption === undefined) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get question to check correctness — try QuizQuestion first, fall back to LiveQuizQuestion
    let question = null;
    try {
      const qs = await base44.asServiceRole.entities.QuizQuestion.filter({ id: questionId });
      question = qs?.[0] || null;
    } catch {}

    if (!question) {
      try {
        const lqs = await base44.asServiceRole.entities.LiveQuizQuestion.filter({ id: questionId });
        question = lqs?.[0] || null;
      } catch {}
    }

    // If still not found by id, try fetching from session's cached current_question
    if (!question) {
      const sessions = await base44.asServiceRole.entities.LiveQuizSession.filter({ id: sessionId });
      const sess = sessions?.[0];
      if (sess?.current_question && (sess.current_question.id === questionId || !questionId)) {
        question = sess.current_question;
      }
    }

    if (!question) {
      return Response.json({ error: 'Question not found' }, { status: 404 });
    }

    // Support both MCQ (correct_index) and text-answer questions (correct_answer)
    const isCorrect = question.correct_index !== undefined && question.correct_index !== null
      ? question.correct_index === selectedOption
      : String(question.correct_answer || '').trim().toLowerCase() === String(selectedOption || '').trim().toLowerCase();

    // Get session for scoring settings
    const sessions = await base44.asServiceRole.entities.LiveQuizSession.filter({ id: sessionId });
    const session = sessions[0];

    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }

    // Calculate points
    const basePoints = session.settings?.base_points || 500;
    const roundMultiplierIncrement = session.settings?.round_multiplier_increment || 0.25;
    const timeLimit = session.settings?.time_per_question || 15000;
    
    const roundMultiplier = 1.0 + (questionIndex * roundMultiplierIncrement);
    
    let pointsAwarded = 0;
    if (isCorrect) {
      const speedBonus = Math.max(0, (timeLimit - responseTimeMs) / timeLimit) * 300; // Max 300 speed bonus
      pointsAwarded = Math.round((basePoints + speedBonus) * roundMultiplier);
    }

    // Save answer
    const answer = await base44.asServiceRole.entities.LiveQuizAnswer.create({
      session_id: sessionId,
      player_id: playerId,
      question_id: questionId,
      question_index: questionIndex,
      selected_option: selectedOption,
      is_correct: isCorrect,
      response_time_ms: responseTimeMs,
      points_awarded: pointsAwarded,
      round_multiplier: roundMultiplier
    });

    // Update player stats
    const players = await base44.asServiceRole.entities.LiveQuizPlayer.filter({ id: playerId });
    const player = players[0];

    if (player) {
      const newTotalPoints = (player.total_points || 0) + pointsAwarded;
      const newCorrectCount = isCorrect ? (player.correct_count || 0) + 1 : (player.correct_count || 0);
      const newQuestionsAnswered = (player.questions_answered || 0) + 1;
      const newStreak = isCorrect ? (player.current_streak || 0) + 1 : 0;
      const newLongestStreak = Math.max(player.longest_streak || 0, newStreak);
      
      // Update average response time
      const totalResponseTime = (player.average_response_time_ms || 0) * (player.questions_answered || 0) + responseTimeMs;
      const newAvgResponseTime = Math.round(totalResponseTime / newQuestionsAnswered);
      
      // Update fastest time if this is faster and correct
      let newFastestTime = player.fastest_answer_time_ms;
      if (isCorrect && (!newFastestTime || responseTimeMs < newFastestTime)) {
        newFastestTime = responseTimeMs;
      }

      await base44.asServiceRole.entities.LiveQuizPlayer.update(playerId, {
        total_points: newTotalPoints,
        correct_count: newCorrectCount,
        questions_answered: newQuestionsAnswered,
        average_response_time_ms: newAvgResponseTime,
        fastest_answer_time_ms: newFastestTime,
        current_streak: newStreak,
        longest_streak: newLongestStreak,
        last_seen: new Date().toISOString()
      });
    }

    return Response.json({ 
      answer,
      pointsAwarded,
      isCorrect,
      correctAnswer: question.correct_index ?? question.correct_answer ?? null
    });

  } catch (error) {
    console.error('Submit answer error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});