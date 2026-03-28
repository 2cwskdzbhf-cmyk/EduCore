import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ArrowLeft, Clock, Plus, Trash2, CheckCircle2, AlertCircle, Bell } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function QuizScheduler() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    quiz_id: '',
    class_id: '',
    assignment_title: '',
    scheduled_release_date: '',
    assignment_type: 'quiz',
    notify_students: true,
    notes: '',
  });

  React.useEffect(() => {
    const checkAuth = async () => {
      const userData = await base44.auth.me();
      if (userData.user_type !== 'teacher' && userData.role !== 'admin') {
        navigate(createPageUrl('StudentDashboard'));
        return;
      }
      setUser(userData);
    };
    checkAuth();
  }, [navigate]);

  // Fetch teacher's classes
  const { data: classes = [] } = useQuery({
    queryKey: ['teacherClasses', user?.email],
    queryFn: () =>
      user?.email ? base44.entities.Class.filter({ teacher_email: user.email }) : [],
    enabled: !!user?.email,
  });

  // Fetch teacher's quizzes
  const { data: quizzes = [] } = useQuery({
    queryKey: ['teacherQuizzes'],
    queryFn: async () => {
      const allQuizzes = await base44.entities.Quiz.list('created_date', 500);
      return allQuizzes.filter(q => q.created_by === user?.email || !q.created_by);
    },
    enabled: !!user?.email,
  });

  // Fetch scheduled releases
  const { data: scheduledReleases = [], isLoading: loadingSchedules } = useQuery({
    queryKey: ['scheduledQuizzes', user?.email],
    queryFn: () =>
      user?.email
        ? base44.entities.ScheduledQuizRelease.filter({ teacher_email: user.email })
        : [],
    enabled: !!user?.email,
    refetchInterval: 10000,
  });

  // Create scheduled release
  const createScheduleMutation = useMutation({
    mutationFn: async (data) => {
      if (!formData.quiz_id || !formData.class_id || !formData.scheduled_release_date) {
        throw new Error('Please fill in all required fields');
      }
      return base44.entities.ScheduledQuizRelease.create({
        teacher_email: user.email,
        quiz_id: formData.quiz_id,
        class_id: formData.class_id,
        assignment_title: formData.assignment_title || 'Quiz Assignment',
        scheduled_release_date: formData.scheduled_release_date,
        assignment_type: formData.assignment_type,
        notify_students: formData.notify_students,
        notes: formData.notes,
        status: 'scheduled',
        notification_sent: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduledQuizzes'] });
      setDialogOpen(false);
      setFormData({
        quiz_id: '',
        class_id: '',
        assignment_title: '',
        scheduled_release_date: '',
        assignment_type: 'quiz',
        notify_students: true,
        notes: '',
      });
      toast.success('Quiz scheduled successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to schedule quiz');
    },
  });

  // Cancel schedule
  const cancelScheduleMutation = useMutation({
    mutationFn: (scheduleId) =>
      base44.entities.ScheduledQuizRelease.update(scheduleId, { status: 'cancelled' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduledQuizzes'] });
      toast.success('Schedule cancelled');
    },
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const getStatusColor = (status) => {
    if (status === 'released') return 'bg-emerald-500/20 text-emerald-300';
    if (status === 'cancelled') return 'bg-red-500/20 text-red-300';
    return 'bg-blue-500/20 text-blue-300';
  };

  const getStatusIcon = (status) => {
    if (status === 'released') return <CheckCircle2 className="w-4 h-4" />;
    if (status === 'cancelled') return <AlertCircle className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  const isUpcoming = (date) => new Date(date) > new Date();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(createPageUrl('TeacherDashboard'))}
              className="text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">Quiz Scheduler</h1>
              <p className="text-slate-400">Schedule quizzes for future release with auto notifications</p>
            </div>
          </div>
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Schedule Quiz
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            {
              label: 'Scheduled',
              value: scheduledReleases.filter((s) => s.status === 'scheduled').length,
              icon: Clock,
              color: 'text-blue-400',
            },
            {
              label: 'Released',
              value: scheduledReleases.filter((s) => s.status === 'released').length,
              icon: CheckCircle2,
              color: 'text-emerald-400',
            },
            {
              label: 'Total',
              value: scheduledReleases.length,
              icon: Bell,
              color: 'text-purple-400',
            },
          ].map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-400 text-sm">{stat.label}</p>
                        <p className="text-2xl font-bold text-white">{stat.value}</p>
                      </div>
                      <Icon className={cn('w-8 h-8', stat.color)} />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Scheduled Quizzes List */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-400" />
              Scheduled Releases
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSchedules ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : scheduledReleases.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No scheduled quizzes yet</p>
                <p className="text-slate-500 text-sm">Click "Schedule Quiz" to create one</p>
              </div>
            ) : (
              <div className="space-y-4">
                {scheduledReleases
                  .sort((a, b) => new Date(b.scheduled_release_date) - new Date(a.scheduled_release_date))
                  .map((schedule, idx) => {
                    const quiz = quizzes.find((q) => q.id === schedule.quiz_id);
                    const cls = classes.find((c) => c.id === schedule.class_id);
                    const releaseDate = new Date(schedule.scheduled_release_date);
                    const now = new Date();
                    const isUpcomingItem = releaseDate > now;

                    return (
                      <motion.div
                        key={schedule.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={cn(
                          'p-4 rounded-xl border transition-all',
                          isUpcomingItem
                            ? 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/15'
                            : 'bg-white/5 border-white/10'
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-white">
                                {schedule.assignment_title}
                              </h3>
                              <Badge className={getStatusColor(schedule.status)}>
                                {getStatusIcon(schedule.status)}
                                <span className="ml-1 capitalize">{schedule.status}</span>
                              </Badge>
                              {schedule.notify_students && (
                                <Badge className="bg-emerald-500/20 text-emerald-300">
                                  <Bell className="w-3 h-3 mr-1" />
                                  Notifications
                                </Badge>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                              <div>
                                <p className="text-slate-400">Quiz</p>
                                <p className="text-white">{quiz?.title || 'Unknown'}</p>
                              </div>
                              <div>
                                <p className="text-slate-400">Class</p>
                                <p className="text-white">{cls?.name || 'Unknown'}</p>
                              </div>
                              <div>
                                <p className="text-slate-400">Release Date & Time</p>
                                <p className="text-white font-mono">
                                  {releaseDate.toLocaleDateString()} {releaseDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                              <div>
                                <p className="text-slate-400">Type</p>
                                <p className="text-white capitalize">{schedule.assignment_type}</p>
                              </div>
                            </div>

                            {schedule.notes && (
                              <div className="mb-3 p-3 rounded-lg bg-white/5 border border-white/10">
                                <p className="text-xs text-slate-400 mb-1">Notes</p>
                                <p className="text-sm text-slate-300">{schedule.notes}</p>
                              </div>
                            )}

                            {schedule.status === 'scheduled' && (
                              <div className="text-xs text-slate-400">
                                {isUpcomingItem
                                  ? `Releases in ${Math.ceil((releaseDate - now) / (1000 * 60))} minutes`
                                  : 'Scheduled for past date'}
                              </div>
                            )}
                          </div>

                          {schedule.status === 'scheduled' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => cancelScheduleMutation.mutate(schedule.id)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Schedule Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl bg-slate-950/95 backdrop-blur-xl border-white/10">
          <DialogHeader>
            <DialogTitle>Schedule Quiz Release</DialogTitle>
            <DialogDescription>
              Set a future date and time for the quiz to be released to students
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Assignment Title */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Assignment Title
              </label>
              <Input
                placeholder="e.g., Fractions Practice - Week 3"
                value={formData.assignment_title}
                onChange={(e) =>
                  setFormData({ ...formData, assignment_title: e.target.value })
                }
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            {/* Quiz Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Quiz <span className="text-red-400">*</span>
              </label>
              <Select
                value={formData.quiz_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, quiz_id: value })
                }
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Select a quiz" />
                </SelectTrigger>
                <SelectContent>
                  {quizzes.map((q) => (
                    <SelectItem key={q.id} value={q.id}>
                      {q.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Class Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Class <span className="text-red-400">*</span>
              </label>
              <Select
                value={formData.class_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, class_id: value })
                }
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Release Date & Time */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Release Date & Time <span className="text-red-400">*</span>
              </label>
              <Input
                type="datetime-local"
                value={formData.scheduled_release_date}
                onChange={(e) =>
                  setFormData({ ...formData, scheduled_release_date: e.target.value })
                }
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            {/* Assignment Type */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Assignment Type
              </label>
              <Select
                value={formData.assignment_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, assignment_type: value })
                }
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quiz">Quiz</SelectItem>
                  <SelectItem value="homework">Homework</SelectItem>
                  <SelectItem value="classwork">Classwork</SelectItem>
                  <SelectItem value="assessment">Assessment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notify Students */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="notify"
                checked={formData.notify_students}
                onChange={(e) =>
                  setFormData({ ...formData, notify_students: e.target.checked })
                }
                className="w-4 h-4 rounded accent-purple-500"
              />
              <label htmlFor="notify" className="text-sm text-slate-300">
                Send push notifications to students when released
              </label>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Notes (optional)
              </label>
              <Textarea
                placeholder="Add any instructions or notes for students..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="bg-white/5 border-white/10 text-white min-h-[100px]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="border-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={() => createScheduleMutation.mutate()}
              disabled={createScheduleMutation.isPending}
              className="bg-gradient-to-r from-purple-500 to-blue-500"
            >
              {createScheduleMutation.isPending ? 'Scheduling...' : 'Schedule Release'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}