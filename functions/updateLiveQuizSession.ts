import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function safeFilter(entity: any, filter: any, order = 'order') {
  try {
    if (!entity?.filter) return [];
    const res = await entity.filter(filter, order);
    return Array.isArray(res) ? res : [];
  } catch {
    return [];
  }
}

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

// ✅ auto-discover any "*Question*" entity and try common linking fields
async function discoverQuestions(base44: any, ids: string[]) {
  const entities = base44.asServiceRole.entities || {};
  const names = Object.keys(entities);

  const questionEntityNames = names.filter((n) =>
    n.toLowerCase().includes('question')
  );

  const linkFields = [
    'quiz_id',
    'quiz_set_id',
    'live_quiz_set_id',
    'set_id',
    'session_id',
    'live_session_id',
  ];

  for (const entityName of questionEntityNames) {
    const entity = entities[entityName];
    for (const id of ids) {
      for (const field of linkFields) {
        const found = await safeFilter(entity, { [field]: id }, 'order');
        if (found.length) {
          return { entityName, field, id, questions: found };
        }
      }
    }
  }

  return { entityName: null, field: null, id: null, questions: [] };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { sessionId, action } = await req.json();
    if (!sessionId || !action) {
      return Response.json({ error: 'sessionId and action required' }, { status: 400 });
    }

    const sessions = await base44.asServiceRole.entities.LiveQuizSession.filter({ id: sessionId });
    const session = sessions?.[0];
    if (!session) return Response.json({ error: 'Session not found' }, { status: 404 });
    if (session.host_email !== user.email) return Response.json({ error: 'Not the host' }, { status: 403 });

    const now = new Date().toISOString();

    // ✅ Prefer questions already stored on session
    let questions =
      normalizeQuestions(session.questions) ||
      normalizeQuestions(session.questions_json) ||
      normalizeQuestions(session.quiz_questions) ||
      normalizeQuestions(session.items);

    // ✅ If not present, discover them in DB (works for manual-xxxx too)
    if (!questions || !questions.length) {
      const quizSetId =
        session.quiz_set_id ||
        session.live_quiz_set_id ||
        session.quiz_id ||
        session.set_id ||
        null;

      const ids = [quizSetId, sessionId].filter(Boolean);

      const discovered = await discoverQuestions(base44, ids);

      questions = discovered.questions;

      // ✅ cache them onto the session so future loads are instant + consistent
      if (questions.length) {
        await base44.asServiceRole.entities.LiveQuizSession.update(sessionId, {
          questions,
          questions_source_entity: discovered.entityName,
          questions_source_field: discovered.field,
          questions_source_id: discovered.id,
        });
      }
    }

    if ((action === 'start' || action === 'nextQuestion') && (!questions || !questions.length)) {
      return Response.json(
        {
          error: 'No questions found (even after auto-discovery).',
          debug: {
            hint: 'Upload the entity/table name that stores your manual questions if Base44 hides it from the SDK list.',
            quiz_set_id: session.quiz_set_id,
            live_quiz_set_id: session.live_quiz_set_id,
            sessionId,
          }
        },
        { status: 400 }
      );
    }

    let updates: any = {};

    if (action === 'start') {
      const q = questions[0];
      updates = {
        status: 'live',
        current_question_index: 0,
        question_started_at: now,
        started_at: session.started_at || now,
        current_question: q,
        current_question_id: q?.id ?? null,
      };
    } else if (action === 'nextQuestion') {
      const nextIndex = (session.current_question_index ?? -1) + 1;
      if (nextIndex >= questions.length) {
        updates = { status: 'ended', ended_at: now, end_reason: 'completed_all_questions' };
      } else {
        const q = questions[nextIndex];
        updates = {
          status: 'live',
          current_question_index: nextIndex,
          question_started_at: now,
          current_question: q,
          current_question_id: q?.id ?? null,
        };
      }
    } else if (action === 'showLeaderboard') {
      updates = { status: 'intermission' };
    } else if (action === 'end') {
      updates = { status: 'ended', ended_at: now };
    } else {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    const updatedSession = await base44.asServiceRole.entities.LiveQuizSession.update(sessionId, updates);
    return Response.json({ session: updatedSession });

  } catch (error: any) {
    console.error('updateLiveQuizSession error:', error);
    return Response.json({ error: error?.message ?? 'Unknown error' }, { status: 500 });
  }
});
