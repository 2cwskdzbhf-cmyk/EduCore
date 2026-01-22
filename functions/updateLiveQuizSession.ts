import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId, action, data } = await req.json();

    if (!sessionId || !action) {
      return Response.json({ error: 'sessionId and action required' }, { status: 400 });
    }

    // Verify host
    const sessions = await base44.asServiceRole.entities.LiveQuizSession.filter({ id: sessionId });
    const session = sessions[0];

    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.host_email !== user.email) {
      return Response.json({ error: 'Not the host' }, { status: 403 });
    }

    let updates = {};

    switch (action) {
      case 'start':
        updates = {
          status: 'live',
          current_question_index: 0,
          question_started_at: new Date().toISOString(),
          started_at: session.started_at || new Date().toISOString()
        };
        break;

      case 'nextQuestion':
        const nextIndex = (session.current_question_index || 0) + 1;
        updates = {
          status: 'live',
          current_question_index: nextIndex,
          question_started_at: new Date().toISOString()
        };
        break;

      case 'showLeaderboard':
        updates = {
          status: 'intermission'
        };
        break;

      case 'end':
        updates = {
          status: 'ended',
          ended_at: new Date().toISOString()
        };
        break;

      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    const updatedSession = await base44.asServiceRole.entities.LiveQuizSession.update(sessionId, updates);

    return Response.json({ session: updatedSession });

  } catch (error) {
    console.error('Update session error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});