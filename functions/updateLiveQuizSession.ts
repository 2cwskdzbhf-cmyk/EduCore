import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function safeFilter(base44: any, entityName: string, filter: any, order = 'order') {
  try {
    const entity = base44.asServiceRole.entities?.[entityName];
    if (!entity?.filter) return [];
    const res = await entity.filter(filter, order);
    return Array.isArray(res) ? res : [];
  } catch {
    return [];
  }
}

async function loadQuestions(base44: any, session: any) {
  const quizSetId =
    session?.quiz_set_id ||
    session?.live_quiz_set_id ||
    session?.quizSetId ||
    session?.liveQuizSetId ||
    session?.quiz_id ||
    session?.set_id ||
    null;

  const candidateIds = [quizSetId, session?.id].filter(Boolean);

  for (const id of candidateIds) {
    let q = await safeFilter(base44, 'QuizQuestion', { quiz_id: id }, 'order');
    if (q.length) return q;

    q = await safeFilter(base44, 'QuizQuestion', { quiz_set_id: id }, 'order');
    if (q.length) return q;

    q = await safeFilter(base44, 'LiveQuizQuestion', { live_quiz_set_id: id }, 'order');
    if (q.length) return q;

    q = await safeFilter(base44, 'LiveQuizQuestion', { session_id: id }, 'order');
    if (q.length) return q;
  }

  return [];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { sessionId, action, data } = await req.json();

    if (!sessionId || !action) {
      return Response.json({ error: 'sessionId and action required' }, { status: 400 });
    }

    const sessions = await base44.asServiceRole.entities.LiveQuizSession.filter({ id: sessionId });
    const session = sessions?.[0];

    if (!session) return Response.json({ error: 'Session not found' }, { status: 404 });
    if (session.host_email !== user.email) return Response.json({ error: 'Not the host' }, { status: 403 });

    // Hard lock to stop double-advances
    if (session.is_transitioning && action !== 'end') {
      return Response.json({ error: 'Session transitioning' }, { status: 409 });
    }

    let updates: any = {};
    const now = new Date().toISOString();

    if (action === 'start' || action === 'nextQuestion') {
      // lock immediately
      await base44.asServiceRole.entities.LiveQuizSession.update(sessionId, {
        is_transitioning: true,
        last_transition_at: now
      });

      const questions = await loadQuestions(base44, session);
      if (!questions.length) {
        await base44.asServiceRole.entities.LiveQuizSession.update(sessionId, { is_transitioning: false });
        return Response.json({ error: 'No questions found for this session' }, { status: 400 });
      }

      const nextIndex = action === 'start' ? 0 : (session.current_question_index ?? -1) + 1;

      if (nextIndex >= questions.length) {
        updates = {
          status: 'ended',
          ended_at: now,
          end_reason: 'completed_all_questions',
          is_transitioning: false
        };
      } else {
        const q = questions[nextIndex];
        updates = {
          status: 'live',
          current_question_index: nextIndex,
          question_started_at: now,
          started_at: session.started_at || now,

          // ✅ push question so students never race-fetch
          current_question: q,
          current_question_id: q?.id ?? null,

          is_transitioning: false
        };
      }
    } else {
      switch (action) {
        case 'showLeaderboard':
          updates = { status: 'intermission' };
          break;

        case 'end':
          updates = { status: 'ended', ended_at: now, end_reason: data?.reason || 'ended' };
          break;

        default:
          return Response.json({ error: 'Invalid action' }, { status: 400 });
      }
    }

    const updatedSession = await base44.asServiceRole.entities.LiveQuizSession.update(sessionId, updates);
    return Response.json({ session: updatedSession });

  } catch (error: any) {
    console.error('Update session error:', error);
    return Response.json({ error: error?.message ?? 'Unknown error' }, { status: 500 });
  }
});
