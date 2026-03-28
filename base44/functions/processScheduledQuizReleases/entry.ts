import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    // Fetch all scheduled quizzes that should be released
    const now = new Date();
    const allScheduled = await base44.asServiceRole.entities.ScheduledQuizRelease.filter({ status: 'scheduled' });
    
    const toRelease = allScheduled.filter(schedule => {
      const releaseTime = new Date(schedule.scheduled_release_date);
      return releaseTime <= now && !schedule.notification_sent;
    });

    let released = 0;
    let notified = 0;
    const errors = [];

    for (const schedule of toRelease) {
      try {
        // Update schedule status to released
        await base44.asServiceRole.entities.ScheduledQuizRelease.update(schedule.id, {
          status: 'released',
          notification_sent: schedule.notify_students ? true : false
        });
        released++;

        // Send notifications to students if enabled
        if (schedule.notify_students) {
          try {
            const response = await base44.functions.invoke('sendQuizNotification', {
              class_id: schedule.class_id,
              quiz_id: schedule.quiz_id,
              assignment_title: schedule.assignment_title,
              notes: schedule.notes
            });
            
            if (response.data?.notified) {
              notified += response.data.notified;
            }
          } catch (notifyError) {
            errors.push(`Notification error for schedule ${schedule.id}: ${notifyError.message}`);
          }
        }
      } catch (error) {
        errors.push(`Failed to process schedule ${schedule.id}: ${error.message}`);
      }
    }

    return Response.json({
      success: true,
      released,
      notified,
      errors: errors.length > 0 ? errors : null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});