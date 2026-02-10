import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Award,
  TrendingUp,
  Target,
  BookOpen,
  Calendar,
  CheckCircle2,
  Trophy,
  Download,
  Star,
  Zap,
  Brain,
  Clock,
  FileText,
  BarChart3
} from 'lucide-react';
import PersonalizedLearningPath from '@/components/learning/PersonalizedLearningPath';

export default function StudentPortfolio() {
  const [selectedPeriod, setSelectedPeriod] = useState('all'); // all, month, week

  // Fetch current user
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  // Fetch student progress
  const { data: progress } = useQuery({
    queryKey: ['studentProgress', user?.email],
    queryFn: async () => {
      const progressList = await base44.entities.StudentProgress.filter({ student_email: user.email });
      return progressList[0] || null;
    },
    enabled: !!user?.email
  });

  // Fetch quiz attempts
  const { data: quizAttempts = [] } = useQuery({
    queryKey: ['quizAttempts', user?.email],
    queryFn: () => base44.entities.QuizAttempt.filter({ student_email: user.email }, '-completed_at'),
    enabled: !!user?.email
  });

  // Fetch assignment submissions
  const { data: submissions = [] } = useQuery({
    queryKey: ['submissions', user?.email],
    queryFn: () => base44.entities.AssignmentSubmission.filter({ student_email: user.email }, '-submitted_at'),
    enabled: !!user?.email
  });

  // Fetch enrolled classes
  const { data: enrolledClasses = [] } = useQuery({
    queryKey: ['enrolledClasses', user?.email],
    queryFn: async () => {
      const allClasses = await base44.entities.Class.list();
      return allClasses.filter(c => c.student_emails?.includes(user.email));
    },
    enabled: !!user?.email
  });

  // Fetch subjects
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => base44.entities.Subject.list()
  });

  // Fetch topics
  const { data: topics = [] } = useQuery({
    queryKey: ['topics'],
    queryFn: () => base44.entities.Topic.list()
  });

  // Calculate achievements
  const achievements = [];
  
  if (quizAttempts.length >= 1) achievements.push({ name: 'First Quiz', icon: Target, color: 'text-blue-400' });
  if (quizAttempts.length >= 10) achievements.push({ name: 'Quiz Master', icon: Trophy, color: 'text-yellow-400' });
  if (quizAttempts.length >= 50) achievements.push({ name: 'Quiz Legend', icon: Award, color: 'text-purple-400' });
  if (progress?.current_streak >= 3) achievements.push({ name: '3 Day Streak', icon: Zap, color: 'text-orange-400' });
  if (progress?.current_streak >= 7) achievements.push({ name: 'Week Warrior', icon: Star, color: 'text-yellow-400' });
  if (progress?.accuracy_percent >= 80) achievements.push({ name: 'High Achiever', icon: TrendingUp, color: 'text-green-400' });
  if (submissions.filter(s => s.status === 'graded' && s.percentage >= 90).length >= 5) {
    achievements.push({ name: 'Excellence', icon: Award, color: 'text-gold-400' });
  }

  // Calculate topic mastery
  const topicMastery = Object.entries(progress?.topic_mastery || {}).map(([topicId, mastery]) => {
    const topic = topics.find(t => t.id === topicId);
    return {
      topicId,
      name: topic?.name || 'Unknown Topic',
      mastery: Math.round(mastery)
    };
  }).sort((a, b) => b.mastery - a.mastery);

  // Calculate stats
  const totalQuizzes = quizAttempts.length;
  const avgAccuracy = progress?.accuracy_percent || 0;
  const totalCorrect = progress?.total_correct_answers || 0;
  const totalQuestions = progress?.total_questions_answered || 0;
  const completedAssignments = submissions.filter(s => s.status === 'graded' || s.status === 'returned').length;
  const avgAssignmentScore = submissions.length > 0
    ? Math.round(submissions.reduce((sum, s) => sum + (s.percentage || 0), 0) / submissions.length)
    : 0;

  // Recent activity (last 10)
  const recentActivity = [
    ...quizAttempts.slice(0, 10).map(q => ({
      type: 'quiz',
      title: `Quiz - ${q.topic_id || 'General'}`,
      date: q.completed_at,
      score: q.accuracy_percent
    })),
    ...submissions.slice(0, 10).map(s => ({
      type: 'assignment',
      title: `Assignment`,
      date: s.submitted_at,
      score: s.percentage
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

  // Generate certificate data
  const certificateData = {
    studentName: user?.full_name || 'Student',
    totalQuizzes,
    avgAccuracy: Math.round(avgAccuracy),
    completedAssignments,
    achievements: achievements.length,
    issueDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  };

  const generateCertificate = () => {
    // Simple certificate generation (could be enhanced with canvas or PDF generation)
    const certificateHTML = `
      <div style="width: 800px; padding: 60px; border: 10px solid #8b5cf6; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-family: Arial, sans-serif; text-align: center;">
        <h1 style="font-size: 48px; margin-bottom: 20px;">Certificate of Achievement</h1>
        <p style="font-size: 20px; margin-bottom: 40px;">This is to certify that</p>
        <h2 style="font-size: 36px; margin-bottom: 40px; border-bottom: 2px solid white; display: inline-block; padding-bottom: 10px;">${certificateData.studentName}</h2>
        <p style="font-size: 18px; line-height: 1.8; margin-bottom: 40px;">
          Has successfully completed <strong>${certificateData.totalQuizzes}</strong> quizzes with an average accuracy of <strong>${certificateData.avgAccuracy}%</strong><br/>
          and submitted <strong>${certificateData.completedAssignments}</strong> assignments, earning <strong>${certificateData.achievements}</strong> achievements
        </p>
        <p style="font-size: 16px; margin-top: 60px;">Issued on ${certificateData.issueDate}</p>
      </div>
    `;
    
    const newWindow = window.open('', '_blank');
    newWindow.document.write(certificateHTML);
    newWindow.document.close();
    newWindow.print();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">My Portfolio</h1>
              <p className="text-slate-400">Track your learning journey and achievements</p>
            </div>
            <Button 
              onClick={generateCertificate}
              className="bg-gradient-to-r from-purple-500 to-blue-500"
            >
              <Download className="w-4 h-4 mr-2" />
              Generate Certificate
            </Button>
          </div>
        </motion.div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-blue-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-blue-200 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Quizzes Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{totalQuizzes}</div>
              <p className="text-xs text-blue-200 mt-1">{totalQuestions} questions answered</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/20 to-green-600/20 border-green-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-green-200 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Average Accuracy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{Math.round(avgAccuracy)}%</div>
              <p className="text-xs text-green-200 mt-1">{totalCorrect} correct answers</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border-purple-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-purple-200 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Assignments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{completedAssignments}</div>
              <p className="text-xs text-purple-200 mt-1">{avgAssignmentScore}% average score</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border-yellow-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-yellow-200 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Current Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{progress?.current_streak || 0}</div>
              <p className="text-xs text-yellow-200 mt-1">days in a row</p>
            </CardContent>
          </Card>
        </div>

        {/* Achievements */}
        <Card className="bg-white/5 border-white/10 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {achievements.map((achievement, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex flex-col items-center gap-2 p-4 bg-white/5 rounded-lg border border-white/10"
                >
                  <achievement.icon className={`w-8 h-8 ${achievement.color}`} />
                  <p className="text-xs text-white text-center">{achievement.name}</p>
                </motion.div>
              ))}
              {achievements.length === 0 && (
                <div className="col-span-full text-center py-8 text-slate-400">
                  Complete quizzes and assignments to earn achievements!
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="overview" className="data-[state=active]:bg-purple-500">Overview</TabsTrigger>
            <TabsTrigger value="quizzes" className="data-[state=active]:bg-purple-500">Quiz History</TabsTrigger>
            <TabsTrigger value="assignments" className="data-[state=active]:bg-purple-500">Assignments</TabsTrigger>
            <TabsTrigger value="topics" className="data-[state=active]:bg-purple-500">Topic Mastery</TabsTrigger>
            <TabsTrigger value="learning" className="data-[state=active]:bg-purple-500">Learning Path</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="space-y-6">
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                        <div className="flex items-center gap-3">
                          {activity.type === 'quiz' ? (
                            <Target className="w-5 h-5 text-blue-400" />
                          ) : (
                            <FileText className="w-5 h-5 text-purple-400" />
                          )}
                          <div>
                            <p className="text-white font-medium">{activity.title}</p>
                            <p className="text-xs text-slate-400">
                              {new Date(activity.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge className={activity.score >= 70 ? 'bg-green-500/20 text-green-200' : 'bg-yellow-500/20 text-yellow-200'}>
                          {Math.round(activity.score)}%
                        </Badge>
                      </div>
                    ))}
                    {recentActivity.length === 0 && (
                      <div className="text-center py-8 text-slate-400">
                        No activity yet. Start taking quizzes!
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Performance Summary */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Performance Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-300">Overall Progress</span>
                        <span className="text-white font-medium">{Math.round(avgAccuracy)}%</span>
                      </div>
                      <Progress value={avgAccuracy} className="h-2" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                      <div>
                        <p className="text-xs text-slate-400">Strong Areas</p>
                        <div className="mt-2 space-y-1">
                          {(progress?.strong_areas || []).slice(0, 3).map((area, i) => (
                            <Badge key={i} className="bg-green-500/20 text-green-200 mr-2">
                              {topics.find(t => t.id === area)?.name || area}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Needs Improvement</p>
                        <div className="mt-2 space-y-1">
                          {(progress?.weak_areas || []).slice(0, 3).map((area, i) => (
                            <Badge key={i} className="bg-red-500/20 text-red-200 mr-2">
                              {topics.find(t => t.id === area)?.name || area}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Quiz History Tab */}
          <TabsContent value="quizzes">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">All Quiz Attempts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {quizAttempts.map((attempt, index) => (
                    <div key={index} className="p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-white font-medium">Quiz Attempt #{quizAttempts.length - index}</p>
                          <p className="text-xs text-slate-400">
                            {new Date(attempt.completed_at).toLocaleDateString()} at {new Date(attempt.completed_at).toLocaleTimeString()}
                          </p>
                        </div>
                        <Badge className={attempt.accuracy_percent >= 70 ? 'bg-green-500/20 text-green-200' : 'bg-yellow-500/20 text-yellow-200'}>
                          {Math.round(attempt.accuracy_percent)}%
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-slate-400">Questions</p>
                          <p className="text-white font-medium">{attempt.questions_answered}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Correct</p>
                          <p className="text-white font-medium">{attempt.correct_answers}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Time</p>
                          <p className="text-white font-medium">{Math.round(attempt.time_taken_seconds)}s</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {quizAttempts.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                      <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No quiz attempts yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assignments Tab */}
          <TabsContent value="assignments">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Assignment Submissions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {submissions.map((submission, index) => (
                    <div key={index} className="p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-white font-medium">Assignment</p>
                          <p className="text-xs text-slate-400">
                            Submitted: {submission.submitted_at ? new Date(submission.submitted_at).toLocaleDateString() : 'Not submitted'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={
                            submission.status === 'graded' ? 'bg-blue-500/20 text-blue-200' :
                            submission.status === 'submitted' ? 'bg-yellow-500/20 text-yellow-200' :
                            'bg-slate-500/20 text-slate-200'
                          }>
                            {submission.status}
                          </Badge>
                          {submission.status === 'graded' && (
                            <Badge className={submission.percentage >= 70 ? 'bg-green-500/20 text-green-200' : 'bg-red-500/20 text-red-200'}>
                              {Math.round(submission.percentage)}%
                            </Badge>
                          )}
                        </div>
                      </div>
                      {submission.teacher_feedback && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <p className="text-xs text-slate-400 mb-1">Teacher Feedback:</p>
                          <p className="text-sm text-slate-300">{submission.teacher_feedback}</p>
                        </div>
                      )}
                    </div>
                  ))}
                  {submissions.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No assignment submissions yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Topic Mastery Tab */}
          <TabsContent value="topics">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Topic Mastery Levels
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topicMastery.map((topic, index) => (
                    <div key={index}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-white font-medium">{topic.name}</span>
                        <span className="text-slate-300">{topic.mastery}%</span>
                      </div>
                      <Progress value={topic.mastery} className="h-2" />
                    </div>
                  ))}
                  {topicMastery.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                      <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Complete quizzes to see topic mastery</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Learning Path Tab */}
          <TabsContent value="learning">
            <PersonalizedLearningPath 
              studentEmail={user?.email}
              classId={enrolledClasses.length > 0 ? enrolledClasses[0].id : null}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}