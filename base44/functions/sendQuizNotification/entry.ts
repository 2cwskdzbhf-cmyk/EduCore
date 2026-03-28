import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const payload = await req.json();
  
  const { class_id, quiz_id, assignment_title, notes } = payload;

  try {
    // Fetch class to get student emails
    const classData = await base44.asServiceRole.entities.Class.filter({ id: class_id });
    if (!classData || classData.length === 0) {
      return Response.json({ error: 'Class not found' }, { status: 404 });
    }

    const cls = classData[0];
    const studentEmails = cls.student_emails || [];

    // Fetch quiz info for context
    const quizData = await base44.asServiceRole.entities.Quiz.filter({ id: quiz_id });
    const quiz = quizData?.[0];

    let notified = 0;
    const errors = [];

    // Send email notifications to each student
    for (const email of studentEmails) {
      try {
        const message = `
A new assignment has been released in your class: ${cls.name}

**Assignment:** ${assignment_title}
**Type:** Quiz
**Class:** ${cls.name}

${notes ? `\n**Instructions:** ${notes}\n` : ''}

Log in to your dashboard to start the quiz.
        `.trim();

        await base44.integrations.Core.SendEmail({
          to: email,
          subject: `New Assignment: ${assignment_title}`,
          body: message,
          from_name: 'EduCore Notifications'
        });
        
        notified++;
      } catch (error) {
        errors.push(`Failed to notify ${email}: ${error.message}`);
      }
    }

    return Response.json({
      success: true,
      notified,
      class_id,
      quiz_id,
      errors: errors.length > 0 ? errors : null
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});