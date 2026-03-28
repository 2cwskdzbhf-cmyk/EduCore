import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { certificateType, data } = await req.json();

    // Create certificate PDF
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Background gradient effect (using rectangles)
    doc.setFillColor(103, 126, 234);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    doc.setFillColor(118, 75, 162);
    doc.triangle(0, 0, pageWidth, 0, pageWidth, pageHeight, 'F');

    // Border
    doc.setLineWidth(2);
    doc.setDrawColor(255, 255, 255);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20, 'S');
    doc.setLineWidth(1);
    doc.rect(12, 12, pageWidth - 24, pageHeight - 24, 'S');

    // Certificate Title
    doc.setFontSize(36);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('Certificate of Achievement', pageWidth / 2, 40, { align: 'center' });

    // Subtitle
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('This is to certify that', pageWidth / 2, 60, { align: 'center' });

    // Student Name
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text(user.full_name || 'Student', pageWidth / 2, 80, { align: 'center' });
    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2 - 60, 82, pageWidth / 2 + 60, 82);

    // Achievement text
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    
    let achievementText = '';
    switch (certificateType) {
      case 'module_completion':
        achievementText = `Has successfully completed the ${data.moduleName || 'module'} module`;
        break;
      case 'topic_mastery':
        achievementText = `Has demonstrated mastery in ${data.topicName || 'the topic'} with ${data.masteryPercent || 0}% proficiency`;
        break;
      case 'accuracy_milestone':
        achievementText = `Has achieved ${data.accuracy || 0}% accuracy across ${data.quizCount || 0} quizzes`;
        break;
      case 'streak_milestone':
        achievementText = `Has maintained a ${data.streakDays || 0}-day learning streak`;
        break;
      case 'overall_progress':
        achievementText = `Has completed ${data.totalQuizzes || 0} quizzes and ${data.totalAssignments || 0} assignments\nwith an average accuracy of ${data.avgAccuracy || 0}%`;
        break;
      default:
        achievementText = 'Has demonstrated excellent progress in their learning journey';
    }

    const lines = doc.splitTextToSize(achievementText, pageWidth - 80);
    doc.text(lines, pageWidth / 2, 100, { align: 'center' });

    // Stats box (if provided)
    if (data.stats && Object.keys(data.stats).length > 0) {
      const statsY = 120 + (lines.length * 7);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      
      let xOffset = pageWidth / 2 - 80;
      Object.entries(data.stats).forEach(([key, value], index) => {
        if (index > 0 && index % 3 === 0) {
          xOffset = pageWidth / 2 - 80;
        }
        doc.text(`${key}: ${value}`, xOffset, statsY + Math.floor(index / 3) * 7);
        xOffset += 55;
      });
    }

    // Date
    doc.setFontSize(11);
    doc.text(`Issued on: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, pageWidth / 2, pageHeight - 25, { align: 'center' });

    // Save certificate record
    await base44.entities.ProgressCertificate.create({
      student_email: user.email,
      certificate_type: certificateType,
      title: `${certificateType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Certificate`,
      description: achievementText,
      subject_id: data.subjectId || null,
      topic_id: data.topicId || null,
      milestone_value: data.milestoneValue || null,
      issued_date: new Date().toISOString(),
      certificate_data: data
    });

    // Return PDF as base64
    const pdfBase64 = doc.output('datauristring').split(',')[1];

    return Response.json({
      success: true,
      pdf: pdfBase64,
      filename: `certificate_${certificateType}_${Date.now()}.pdf`
    });

  } catch (error) {
    console.error('[CERTIFICATE_ERROR]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});