import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function normalizeQuestions(raw: any): any[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

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

async function loadQuestionsFromDb(base44: any, session: any) {
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

    // Hard lock prevents double-click / race
    if (session.is_transitioning && action !== 'end') {
      return Response.json({ error: 'Session transitioning' }, { status: 409 });
    }

    const now = new Date().toISOString();

    // ✅ IMPORTANT: manual quizzes often store questions directly on the session
    // Try these common fields first:
    let questions =
      normalizeQuestions(session.questions) ||
      normalizeQuestions(session.questions_json) ||
      normalizeQuestions(session.quiz_questions) ||
      normalizeQuestions(session.items);

    // If host sent questions in the request (optional), store them:
    if (Array.isArray(data?.questions) && data.questions.length) {
      questions = data.questions;
      await base44.asServiceRole.entities.LiveQuizSession.update(sessionId, {
        questions: data.questions
      });
    }

    // Fallback: DB lookup for non-manual sets
    if (!questions || !questions.length) {
      questions = await loadQuestionsFromDb(base44, session);
    }

    if ((action === 'start' || action === 'nextQuestion') && (!questions || !questions.length)) {
      return Response.json(
        {
          error:
            'No questions found. For manual quizzes, store questions on LiveQuizSession.questions (array) or questions_json (string).',
          debug: {
            quizSetId:
              session?.quiz_set_id ||
              session?.live_quiz_set_id ||
              session?.quiz_id ||
              session?.set_id ||
              null
          }
        },
        { status: 400 }
      );
    }

    let updates: any = {};

    if (action === 'start') {
      const nextIndex = 0;
      const q = questions[nextIndex];

      updates = {
        status: 'live',
        current_question_index: nextIndex,
        question_started_at: now,
        started_at: session.started_at || now,

        // ✅ push the current question so students never “race fetch”
        current_question: q,
        current_question_id: q?.id ?? null,

        is_transitioning: false,
        last_transition_at: now
      };
    } else if (action === 'nextQuestion') {
      // lock first
      await base44.asServiceRole.entities.LiveQuizSession.update(sessionId, {
        is_transitioning: true,
        last_transition_at: now
      });

      const nextIndex = (session.current_question_index ?? -1) + 1;

      if (nextIndex >= questions.length) {
        updates = {
          status: 'ended',
          ended_at: now,
          end_reason: 'completed_all_questions',
          is_transitioning: false,
          last_transition_at: now
        };
      } else {
        const q = questions[nextIndex];
        updates = {
          status: 'live',
          current_question_index: nextIndex,
          question_started_at: now,

          current_question: q,
          current_question_id: q?.id ?? null,

          is_transitioning: false,
          last_transition_at: now
        };
      }
    } else if (action === 'showLeaderboard') {
      updates = { status: 'intermission' };
    } else if (action === 'end') {
      updates = { status: 'ended', ended_at: now, end_reason: data?.reason || 'ended' };
    } else {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    const updatedSession = await base44.asServiceRole.entities.LiveQuizSession.update(sessionId, updates);
    return Response.json({ session: updatedSession });

  } catch (error: any) {
    console.error('Update session error:', error);
    return Response.json({ error: error?.message ?? 'Unknown error' }, { status: 500 });
  }
});
