import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Award, Download, Trophy, Target, Zap, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function CertificatesSection({ studentEmail, studentName, progress, quizAttempts, submissions }) {
  const queryClient = useQueryClient();

  const { data: certificates = [] } = useQuery({
    queryKey: ['certificates', studentEmail],
    queryFn: () => base44.entities.Certificate.filter({ student_email: studentEmail }, '-issued_date'),
    enabled: !!studentEmail
  });

  const issueCertificateMutation = useMutation({
    mutationFn: (certData) => base44.entities.Certificate.create({
      ...certData,
      student_email: studentEmail,
      issued_date: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['certificates']);
      toast.success('Certificate issued');
    }
  });

  // Check eligibility for certificates
  const checkMilestones = () => {
    const milestones = [];

    // Quiz Master (10+ quizzes)
    if (quizAttempts.length >= 10 && !certificates.find(c => c.certificate_type === 'quiz_master')) {
      milestones.push({
        type: 'quiz_master',
        title: 'Quiz Master',
        description: 'Completed 10+ quizzes',
        icon: Target
      });
    }

    // Accuracy Milestone (80%+ average)
    if (progress?.accuracy_percent >= 80 && !certificates.find(c => c.certificate_type === 'accuracy_milestone')) {
      milestones.push({
        type: 'accuracy_milestone',
        title: 'High Achiever',
        description: '80%+ average accuracy',
        icon: Star
      });
    }

    // Streak Achievement (7+ days)
    if (progress?.current_streak >= 7 && !certificates.find(c => c.certificate_type === 'streak_achievement')) {
      milestones.push({
        type: 'streak_achievement',
        title: 'Dedication Award',
        description: '7-day learning streak',
        icon: Zap
      });
    }

    // Assignment Excellence (5+ assignments with 90%+)
    const excellentSubmissions = submissions.filter(s => s.status === 'graded' && s.percentage >= 90).length;
    if (excellentSubmissions >= 5 && !certificates.find(c => c.certificate_type === 'assignment_excellence')) {
      milestones.push({
        type: 'assignment_excellence',
        title: 'Excellence in Assignments',
        description: '5+ assignments with 90%+',
        icon: Trophy
      });
    }

    return milestones;
  };

  const generateCertificatePDF = async (certificate) => {
    const certificateElement = document.createElement('div');
    certificateElement.style.width = '800px';
    certificateElement.style.padding = '60px';
    certificateElement.style.border = '10px solid #8b5cf6';
    certificateElement.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    certificateElement.style.color = 'white';
    certificateElement.style.fontFamily = 'Arial, sans-serif';
    certificateElement.style.textAlign = 'center';

    certificateElement.innerHTML = `
      <h1 style="font-size: 48px; margin-bottom: 20px;">🏆 Certificate of Achievement</h1>
      <p style="font-size: 20px; margin-bottom: 40px;">This is to certify that</p>
      <h2 style="font-size: 36px; margin-bottom: 40px; border-bottom: 2px solid white; display: inline-block; padding-bottom: 10px;">${studentName}</h2>
      <p style="font-size: 24px; font-weight: bold; margin-bottom: 20px;">${certificate.title}</p>
      <p style="font-size: 18px; line-height: 1.8; margin-bottom: 40px;">${certificate.description}</p>
      <p style="font-size: 16px; margin-top: 60px;">Issued on ${new Date(certificate.issued_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
    `;

    document.body.appendChild(certificateElement);

    try {
      const canvas = await html2canvas(certificateElement, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const imgWidth = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`${certificate.title.replace(/\s+/g, '_')}_Certificate.pdf`);
      toast.success('Certificate downloaded');
    } catch (error) {
      toast.error('Failed to generate PDF');
    } finally {
      document.body.removeChild(certificateElement);
    }
  };

  const claimCertificate = (milestone) => {
    issueCertificateMutation.mutate({
      certificate_type: milestone.type,
      title: milestone.title,
      description: milestone.description,
      achievement_data: {
        quizzes: quizAttempts.length,
        accuracy: progress?.accuracy_percent,
        streak: progress?.current_streak
      }
    });
  };

  const availableMilestones = checkMilestones();

  return (
    <div className="space-y-6">
      {/* Available Milestones */}
      {availableMilestones.length > 0 && (
        <Card className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 border-green-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-green-400" />
              Available Certificates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {availableMilestones.map((milestone, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 bg-white/10 rounded-lg border border-green-500/30"
                >
                  <div className="flex items-center gap-3">
                    <milestone.icon className="w-8 h-8 text-green-400" />
                    <div>
                      <p className="text-white font-medium">{milestone.title}</p>
                      <p className="text-sm text-green-200">{milestone.description}</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => claimCertificate(milestone)}
                    disabled={issueCertificateMutation.isPending}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    <Award className="w-4 h-4 mr-2" />
                    Claim
                  </Button>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Earned Certificates */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-400" />
            My Certificates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {certificates.map((cert, index) => (
              <motion.div
                key={cert.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-purple-500/30">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <Award className="w-8 h-8 text-yellow-400" />
                      <Badge variant="outline" className="text-xs">
                        {new Date(cert.issued_date).toLocaleDateString()}
                      </Badge>
                    </div>
                    <h4 className="text-white font-bold text-lg mb-2">{cert.title}</h4>
                    <p className="text-slate-300 text-sm mb-4">{cert.description}</p>
                    <Button
                      onClick={() => generateCertificatePDF(cert)}
                      variant="outline"
                      className="w-full"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
          {certificates.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Award className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Complete milestones to earn certificates</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}