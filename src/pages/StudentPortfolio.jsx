import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
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
  BarChart3,
  Plus,
  MessageSquare,
  Briefcase,
  Medal,
  Upload
} from 'lucide-react';
import PersonalizedLearningPath from '@/components/learning/PersonalizedLearningPath';
import ReflectionCard from '@/components/portfolio/ReflectionCard';
import ProjectCard from '@/components/portfolio/ProjectCard';

export default function StudentPortfolio() {
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const queryClient = useQueryClient();

  // Dialog states
  const [showReflectionDialog, setShowReflectionDialog] = useState(false);
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [showAchievementDialog, setShowAchievementDialog] = useState(false);
  const [showCertificateDialog, setShowCertificateDialog] = useState(false);
  const [editingReflection, setEditingReflection] = useState(null);
  const [editingProject, setEditingProject] = useState(null);

  // Form states
  const [reflectionForm, setReflectionForm] = useState({
    title: '', content: '', mood: 'learning', learning_goals: [], is_private: true
  });
  const [projectForm, setProjectForm] = useState({
    title: '', description: '', project_type: 'other', skills_demonstrated: [], self_rating: 3
  });
  const [achievementForm, setAchievementForm] = useState({
    title: '', description: '', category: 'other', date_earned: new Date().toISOString().split('T')[0]
  });

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

  // Fetch reflections
  const { data: reflections = [] } = useQuery({
    queryKey: ['reflections', user?.email],
    queryFn: () => base44.entities.StudentReflection.filter({ student_email: user.email }, '-created_date'),
    enabled: !!user?.email
  });

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects', user?.email],
    queryFn: () => base44.entities.StudentProject.filter({ student_email: user.email }, '-created_date'),
    enabled: !!user?.email
  });

  // Fetch custom achievements
  const { data: customAchievements = [] } = useQuery({
    queryKey: ['customAchievements', user?.email],
    queryFn: () => base44.entities.CustomAchievement.filter({ student_email: user.email }, '-date_earned'),
    enabled: !!user?.email
  });

  // Fetch certificates
  const { data: certificates = [] } = useQuery({
    queryKey: ['certificates', user?.email],
    queryFn: () => base44.entities.ProgressCertificate.filter({ student_email: user.email }, '-issued_date'),
    enabled: !!user?.email
  });

  // Calculate achievements (system + custom)
  const systemAchievements = [];
  
  if (quizAttempts.length >= 1) systemAchievements.push({ name: 'First Quiz', icon: Target, color: 'text-blue-400' });
  if (quizAttempts.length >= 10) systemAchievements.push({ name: 'Quiz Master', icon: Trophy, color: 'text-yellow-400' });
  if (quizAttempts.length >= 50) systemAchievements.push({ name: 'Quiz Legend', icon: Award, color: 'text-purple-400' });
  if (progress?.current_streak >= 3) systemAchievements.push({ name: '3 Day Streak', icon: Zap, color: 'text-orange-400' });
  if (progress?.current_streak >= 7) systemAchievements.push({ name: 'Week Warrior', icon: Star, color: 'text-yellow-400' });
  if (progress?.accuracy_percent >= 80) systemAchievements.push({ name: 'High Achiever', icon: TrendingUp, color: 'text-green-400' });
  if (submissions.filter(s => s.status === 'graded' && s.percentage >= 90).length >= 5) {
    systemAchievements.push({ name: 'Excellence', icon: Award, color: 'text-gold-400' });
  }

  const achievements = [
    ...systemAchievements,
    ...customAchievements.map(a => ({
      name: a.title,
      icon: Medal,
      color: 'text-purple-400',
      custom: true,
      description: a.description
    }))
  ];

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

  // Mutations
  const createReflectionMutation = useMutation({
    mutationFn: (data) => base44.entities.StudentReflection.create({ ...data, student_email: user.email }),
    onSuccess: () => {
      queryClient.invalidateQueries(['reflections']);
      setShowReflectionDialog(false);
      setReflectionForm({ title: '', content: '', mood: 'learning', learning_goals: [], is_private: true });
      toast.success('Reflection saved!');
    }
  });

  const updateReflectionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.StudentReflection.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['reflections']);
      setShowReflectionDialog(false);
      setEditingReflection(null);
      toast.success('Reflection updated!');
    }
  });

  const deleteReflectionMutation = useMutation({
    mutationFn: (id) => base44.entities.StudentReflection.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['reflections']);
      toast.success('Reflection deleted');
    }
  });

  const createProjectMutation = useMutation({
    mutationFn: (data) => base44.entities.StudentProject.create({ ...data, student_email: user.email }),
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      setShowProjectDialog(false);
      setProjectForm({ title: '', description: '', project_type: 'other', skills_demonstrated: [], self_rating: 3 });
      toast.success('Project added!');
    }
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (id) => base44.entities.StudentProject.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      toast.success('Project deleted');
    }
  });

  const createAchievementMutation = useMutation({
    mutationFn: (data) => base44.entities.CustomAchievement.create({ ...data, student_email: user.email }),
    onSuccess: () => {
      queryClient.invalidateQueries(['customAchievements']);
      setShowAchievementDialog(false);
      setAchievementForm({ title: '', description: '', category: 'other', date_earned: new Date().toISOString().split('T')[0] });
      toast.success('Achievement added!');
    }
  });

  const generateCertificateMutation = useMutation({
    mutationFn: async (certificateType) => {
      let data = {};
      switch (certificateType) {
        case 'overall_progress':
          data = {
            totalQuizzes,
            totalAssignments: completedAssignments,
            avgAccuracy: Math.round(avgAccuracy),
            stats: {
              'Total Questions': totalQuestions,
              'Correct Answers': totalCorrect,
              'Current Streak': progress?.current_streak || 0
            }
          };
          break;
        case 'accuracy_milestone':
          data = {
            accuracy: Math.round(avgAccuracy),
            quizCount: totalQuizzes,
            milestoneValue: Math.round(avgAccuracy)
          };
          break;
        case 'streak_milestone':
          data = {
            streakDays: progress?.current_streak || 0,
            milestoneValue: progress?.current_streak || 0
          };
          break;
        default:
          data = { totalQuizzes, avgAccuracy: Math.round(avgAccuracy) };
      }

      const response = await base44.functions.invoke('generateCertificate', {
        certificateType,
        data
      });

      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['certificates']);
      
      // Download PDF
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${data.pdf}`;
      link.download = data.filename;
      link.click();
      
      toast.success('Certificate generated!');
      setShowCertificateDialog(false);
    },
    onError: (error) => {
      toast.error('Failed to generate certificate: ' + error.message);
    }
  });

  // Handlers
  const handleSaveReflection = () => {
    if (!reflectionForm.title || !reflectionForm.content) {
      toast.error('Please fill in title and content');
      return;
    }
    if (editingReflection) {
      updateReflectionMutation.mutate({ id: editingReflection.id, data: reflectionForm });
    } else {
      createReflectionMutation.mutate(reflectionForm);
    }
  };

  const handleEditReflection = (reflection) => {
    setEditingReflection(reflection);
    setReflectionForm({
      title: reflection.title,
      content: reflection.content,
      mood: reflection.mood,
      learning_goals: reflection.learning_goals || [],
      is_private: reflection.is_private
    });
    setShowReflectionDialog(true);
  };

  const handleSaveProject = () => {
    if (!projectForm.title || !projectForm.description) {
      toast.error('Please fill in title and description');
      return;
    }
    createProjectMutation.mutate(projectForm);
  };

  const handleSaveAchievement = () => {
    if (!achievementForm.title || !achievementForm.description) {
      toast.error('Please fill in title and description');
      return;
    }
    createAchievementMutation.mutate(achievementForm);
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
              onClick={() => setShowCertificateDialog(true)}
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
            <TabsTrigger value="learning" className="data-[state=active]:bg-purple-500">Learning Path</TabsTrigger>
            <TabsTrigger value="reflections" className="data-[state=active]:bg-purple-500">Reflections</TabsTrigger>
            <TabsTrigger value="projects" className="data-[state=active]:bg-purple-500">Projects</TabsTrigger>
            <TabsTrigger value="quizzes" className="data-[state=active]:bg-purple-500">Quiz History</TabsTrigger>
            <TabsTrigger value="assignments" className="data-[state=active]:bg-purple-500">Assignments</TabsTrigger>
            <TabsTrigger value="topics" className="data-[state=active]:bg-purple-500">Topic Mastery</TabsTrigger>
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

          {/* Reflections Tab */}
          <TabsContent value="reflections">
            <Card className="bg-white/5 border-white/10 mb-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    My Learning Reflections
                  </CardTitle>
                  <Button onClick={() => { setEditingReflection(null); setShowReflectionDialog(true); }} className="bg-purple-500">
                    <Plus className="w-4 h-4 mr-2" />
                    New Reflection
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {reflections.map(reflection => (
                    <ReflectionCard
                      key={reflection.id}
                      reflection={reflection}
                      onEdit={handleEditReflection}
                      onDelete={(id) => deleteReflectionMutation.mutate(id)}
                    />
                  ))}
                  {reflections.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                      <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No reflections yet. Start documenting your learning journey!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects">
            <Card className="bg-white/5 border-white/10 mb-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Briefcase className="w-5 h-5" />
                    My Projects & Work
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button onClick={() => setShowAchievementDialog(true)} variant="outline">
                      <Medal className="w-4 h-4 mr-2" />
                      Add Achievement
                    </Button>
                    <Button onClick={() => setShowProjectDialog(true)} className="bg-purple-500">
                      <Plus className="w-4 h-4 mr-2" />
                      New Project
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {projects.map(project => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onEdit={(proj) => { setEditingProject(proj); setShowProjectDialog(true); }}
                      onDelete={(id) => deleteProjectMutation.mutate(id)}
                    />
                  ))}
                </div>
                {projects.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No projects yet. Showcase your work and achievements!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Reflection Dialog */}
        <Dialog open={showReflectionDialog} onOpenChange={setShowReflectionDialog}>
          <DialogContent className="bg-slate-900 border-white/10 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingReflection ? 'Edit Reflection' : 'New Reflection'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={reflectionForm.title}
                  onChange={(e) => setReflectionForm({...reflectionForm, title: e.target.value})}
                  placeholder="What did you learn today?"
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div>
                <Label>How are you feeling about this learning?</Label>
                <Select value={reflectionForm.mood} onValueChange={(v) => setReflectionForm({...reflectionForm, mood: v})}>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confident">Confident</SelectItem>
                    <SelectItem value="learning">Still Learning</SelectItem>
                    <SelectItem value="challenged">Challenged</SelectItem>
                    <SelectItem value="confused">Confused</SelectItem>
                    <SelectItem value="excited">Excited</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reflection</Label>
                <Textarea
                  value={reflectionForm.content}
                  onChange={(e) => setReflectionForm({...reflectionForm, content: e.target.value})}
                  placeholder="Write about your learning experience..."
                  className="bg-white/5 border-white/10 min-h-32"
                />
              </div>
              <div>
                <Label>Learning Goals (comma-separated)</Label>
                <Input
                  value={reflectionForm.learning_goals.join(', ')}
                  onChange={(e) => setReflectionForm({...reflectionForm, learning_goals: e.target.value.split(',').map(g => g.trim()).filter(Boolean)})}
                  placeholder="Master fractions, Improve speed"
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div className="flex items-center justify-between pt-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={reflectionForm.is_private}
                    onChange={(e) => setReflectionForm({...reflectionForm, is_private: e.target.checked})}
                    className="rounded"
                  />
                  Keep private (only you can see this)
                </label>
                <Button onClick={handleSaveReflection} disabled={createReflectionMutation.isPending || updateReflectionMutation.isPending}>
                  Save Reflection
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Project Dialog */}
        <Dialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
          <DialogContent className="bg-slate-900 border-white/10 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Project Title</Label>
                <Input
                  value={projectForm.title}
                  onChange={(e) => setProjectForm({...projectForm, title: e.target.value})}
                  placeholder="My Amazing Project"
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div>
                <Label>Project Type</Label>
                <Select value={projectForm.project_type} onValueChange={(v) => setProjectForm({...projectForm, project_type: v})}>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="research">Research</SelectItem>
                    <SelectItem value="creative">Creative</SelectItem>
                    <SelectItem value="practical">Practical</SelectItem>
                    <SelectItem value="presentation">Presentation</SelectItem>
                    <SelectItem value="experiment">Experiment</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({...projectForm, description: e.target.value})}
                  placeholder="Describe your project..."
                  className="bg-white/5 border-white/10 min-h-24"
                />
              </div>
              <div>
                <Label>Skills Demonstrated (comma-separated)</Label>
                <Input
                  value={projectForm.skills_demonstrated.join(', ')}
                  onChange={(e) => setProjectForm({...projectForm, skills_demonstrated: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
                  placeholder="Problem solving, Creativity, Research"
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div>
                <Label>Self-Rating: {projectForm.self_rating}/5</Label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={projectForm.self_rating}
                  onChange={(e) => setProjectForm({...projectForm, self_rating: Number(e.target.value)})}
                  className="w-full"
                />
              </div>
              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveProject} disabled={createProjectMutation.isPending}>
                  Add Project
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Achievement Dialog */}
        <Dialog open={showAchievementDialog} onOpenChange={setShowAchievementDialog}>
          <DialogContent className="bg-slate-900 border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>Add Custom Achievement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Achievement Title</Label>
                <Input
                  value={achievementForm.title}
                  onChange={(e) => setAchievementForm({...achievementForm, title: e.target.value})}
                  placeholder="First Place in Science Fair"
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={achievementForm.category} onValueChange={(v) => setAchievementForm({...achievementForm, category: v})}>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="competition">Competition</SelectItem>
                    <SelectItem value="certification">Certification</SelectItem>
                    <SelectItem value="extracurricular">Extracurricular</SelectItem>
                    <SelectItem value="community">Community Service</SelectItem>
                    <SelectItem value="leadership">Leadership</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={achievementForm.description}
                  onChange={(e) => setAchievementForm({...achievementForm, description: e.target.value})}
                  placeholder="What did you achieve?"
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div>
                <Label>Date Earned</Label>
                <Input
                  type="date"
                  value={achievementForm.date_earned}
                  onChange={(e) => setAchievementForm({...achievementForm, date_earned: e.target.value})}
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveAchievement} disabled={createAchievementMutation.isPending}>
                  Add Achievement
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Certificate Dialog */}
        <Dialog open={showCertificateDialog} onOpenChange={setShowCertificateDialog}>
          <DialogContent className="bg-slate-900 border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>Generate Certificate</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-slate-400 text-sm">Choose a milestone to celebrate:</p>
              
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => generateCertificateMutation.mutate('overall_progress')}
                disabled={generateCertificateMutation.isPending}
              >
                <Award className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div className="font-semibold">Overall Progress</div>
                  <div className="text-xs text-slate-400">{totalQuizzes} quizzes, {Math.round(avgAccuracy)}% accuracy</div>
                </div>
              </Button>

              {avgAccuracy >= 70 && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => generateCertificateMutation.mutate('accuracy_milestone')}
                  disabled={generateCertificateMutation.isPending}
                >
                  <Target className="w-5 h-5 mr-3" />
                  <div className="text-left">
                    <div className="font-semibold">Accuracy Milestone</div>
                    <div className="text-xs text-slate-400">Achieved {Math.round(avgAccuracy)}% accuracy</div>
                  </div>
                </Button>
              )}

              {progress?.current_streak >= 3 && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => generateCertificateMutation.mutate('streak_milestone')}
                  disabled={generateCertificateMutation.isPending}
                >
                  <Zap className="w-5 h-5 mr-3" />
                  <div className="text-left">
                    <div className="font-semibold">Streak Achievement</div>
                    <div className="text-xs text-slate-400">{progress.current_streak} days in a row</div>
                  </div>
                </Button>
              )}

              <div className="pt-4 border-t border-white/10">
                <p className="text-xs text-slate-400">
                  Previous certificates: {certificates.length}
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}