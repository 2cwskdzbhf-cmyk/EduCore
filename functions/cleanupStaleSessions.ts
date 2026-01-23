import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Admin-only function to cleanup stale live quiz sessions
 * Finds sessions that are marked as 'lobby' or 'live' but are older than 2 hours
 * and marks them as 'ended'
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin access
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    console.log('[CLEANUP] Starting stale session cleanup...');

    // Fetch all sessions with status lobby or live
    const allSessions = await base44.asServiceRole.entities.LiveQuizSession.filter({
      status: { $in: ['lobby', 'live'] }
    });

    console.log('[CLEANUP] Found', allSessions.length, 'lobby/live sessions');

    const now = Date.now();
    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
    const staleSessions = [];
    const activeSessions = [];

    for (const session of allSessions) {
      // Skip if already ended
      if (session.ended_at) {
        continue;
      }

      const createdAt = new Date(session.created_date).getTime();
      const age = now - createdAt;

      if (age > TWO_HOURS_MS) {
        staleSessions.push({
          id: session.id,
          age_hours: (age / (60 * 60 * 1000)).toFixed(2),
          status: session.status,
          class_id: session.class_id
        });
      } else {
        activeSessions.push({
          id: session.id.substring(0, 6),
          age_min: Math.floor(age / 60000),
          status: session.status
        });
      }
    }

    console.log('[CLEANUP] Stale sessions to end:', staleSessions.length);
    console.log('[CLEANUP] Active sessions to keep:', activeSessions.length);

    // End stale sessions
    const endedSessions = [];
    for (const staleSession of staleSessions) {
      try {
        await base44.asServiceRole.entities.LiveQuizSession.update(staleSession.id, {
          status: 'ended',
          ended_at: new Date().toISOString()
        });
        endedSessions.push(staleSession.id.substring(0, 6));
        console.log('[CLEANUP] Ended stale session:', staleSession.id.substring(0, 6));
      } catch (error) {
        console.error('[CLEANUP] Failed to end session:', staleSession.id, error);
      }
    }

    return Response.json({
      success: true,
      message: 'Cleanup completed',
      stats: {
        total_checked: allSessions.length,
        stale_found: staleSessions.length,
        ended: endedSessions.length,
        active_remaining: activeSessions.length
      },
      ended_sessions: endedSessions,
      active_sessions: activeSessions,
      stale_sessions_details: staleSessions
    });

  } catch (error) {
    console.error('[CLEANUP] Error:', error);
    return Response.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
});