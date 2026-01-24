import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Generate random join code (no confusing chars)
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

    // 1) Try to find the quiz set in BOTH entities
    let quizSet: any = null;
    let setType: 'QuizSet' | 'LiveQuizSet' | null = null;

    try {
      const quizSets = await base44.asServiceRole.entities.QuizSet.filter({ id: quizSetId });
      if (quizSets?.[0]) {
        quizSet = quizSets[0];
        setType = 'QuizSet';
      }
    } catch {}

    if (!quizSet) {
      try {
        const liveQuizSets = await base44.asServiceRole.entities.LiveQuizSet.filter({ id: quizSetId });
        if (liveQuizSets?.[0]) {
          quizSet = liveQuizSets[0];
          setType = 'LiveQuizSet';
        }
      } catch {}
    }

    if (!quizSet || !setType) {
      return Response.json({ error: 'Quiz set not found' }, { status: 404 });
    }

    // 2) Generate unique join code
    let joinCode = generateJoinCode();
    for (let attempts = 0; attempts < 10; attempts++) {
      const existing = await base44.asServiceRole.entities.LiveQuizSession.filter({
        join_code: joinCode,
        status: { $in: ['lobby', 'live', 'intermission'] }
      });
      if (!existing || existing.length === 0) break;
      joinCode = generateJoinCode();
    }

    // 3) Pull a sensible time-per-question fallback from different schemas
    const timeLimitFromSet =
      quizSet?.time_limit_per_question ??
      quizSet?.timePerQuestion ??
      quizSet?.time_per_question ??
      quizSet?.default_time_per_question ??
      null;

    const timePerQuestion =
      settings.timePerQuestion ??
      timeLimitFromSet ??
      15000;

    // 4) Create session with the CORRECT linkage field(s)
    //    - If the set is a QuizSet, store quiz_set_id.
    //    - If the set is a LiveQuizSet, store live_quiz_set_id.
    //    - ALSO store a universal "quiz_set_id" mirror so older frontends still work.
    const sessionPayload: any = {
      join_code: joinCode,
      host_email: user.email,
      status: 'lobby',
      current_question_index: -1,
      player_count: 0,

      // Universal mirror (helps your frontend find it even if it only checks quiz_set_id)
      quiz_set_id: quizSetId,

      settings: {
        time_per_question: timePerQuestion,
        base_points: settings.basePoints ?? 500,
        round_multiplier_increment: settings.roundMultiplierIncrement ?? 0.25
      }
    };

    if (setType === 'LiveQuizSet') {
      sessionPayload.live_quiz_set_id = quizSetId;
    }

    const session = await base44.asServiceRole.entities.LiveQuizSession.create(sessionPayload);

    return Response.json({
      session,
      quizSet,
      setType
    });

  } catch (error: any) {
    console.error('Create session error:', error);
    return Response.json({ error: error?.message ?? 'Unknown error' }, { status: 500 });
  }
});
