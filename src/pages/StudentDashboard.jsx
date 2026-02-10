import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import GlassCard, { StatCard } from '@/components/ui/GlassCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PersonalizedLearningPath from '@/components/learning/PersonalizedLearningPath';
import {
  Target,
  UserPlus,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Clock,
  ChevronRight,
  X,
  Loader2,
  Zap,
  Brain
} from 'lucide-react';

export default function StudentDashboard() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [joinClassOpen, setJoinClassOpen] = useState(false);
  const [classJoinCode, setClassJoinCode] = useState('');

  // Live-quiz banner state (rebuilt)
  const [joiningSessionId, setJoiningSessionId] = useState(null);
  const [nickname, setNickname] = useState('');
  const [dismissedLiveQuizSessionId, setDismissedLiveQuizSessionId] = useState(() => {
return localStorage.getItem('dismissedLiveQuizSessionId') || null;  });

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);

      const firstName = userData.full_name
        ? userData.full_name.split(' ')[0]
        : userData.email.split('@')[0];

      setNickname(firstName);
    };
    fetchUser();
  }, []);

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => base44.entities.Subject.filter({ is_active: true }, 'order')
  });

  const { data: progress } = useQuery({
    queryKey: ['studentProgress', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const progressList = await base44.entities.StudentProgress.filter({ student_email: user.email });
      return progressList[0] || null;
    },
    enabled: !!user?.email
  });

  const { data: recentAttempts = [] } = useQuery({
    queryKey: ['recentQuizAttempts', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.QuizAttempt.filter({ student_email: user.email }, '-completed_at', 5);
    },
    enabled: !!user?.email
  });

  const { data: enrolledClasses = [] } = useQuery({
    queryKey: ['enrolledClasses', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const allClasses = await base44.entities.Class.list();
      return allClasses.filter(c => c.student_emails?.includes(user.email));
    },
    enabled: !!user?.email
  });

  /**
   * ✅ Rebuilt live quiz banner query:
   * - fetch lobby/live sessions for your enrolled classes
   * - remove ended + stale
   * - dedupe by id
   * - keep only newest session per class
   * - display at most ONE session (newest overall)
   */
  const { data: liveQuizBannerSession = null } = useQuery({
    queryKey: ['liveQuizBannerSession', enrolledClasses.map(c => c.id).join(',')],
    queryFn: async () => {
      if (enrolledClasses.length === 0) return null;

      const classIds = enrolledClasses.map(c => c.id);
      const allSessions = await base44.entities.LiveQuizSession.filter(
        {
          class_id: { $in: classIds },
     status: { $in: ['lobby'] }
        },
        '-created_date'
      );

      const now = Date.now();
      const ONE_HOUR_MS = 60 * 60 * 1000;

      // Filter ended/stale
      const filtered = allSessions.filter(s => {
        if (!s) return false;
        if (s.ended_at) return false;
        if (s.status !== 'lobby' && s.status !== 'live') return false;

        const createdAt = s.created_date ? new Date(s.created_date).getTime() : 0;
        if (!createdAt) return false;
        if (now - createdAt > ONE_HOUR_MS) return false;

        return true;
      });

      // Dedup by session id
      const byId = new Map();
      for (const s of filtered) {
        if (!byId.has(s.id)) byId.set(s.id, s);
      }
      const unique = Array.from(byId.values());

      // Keep newest session per class_id
      const newestPerClass = new Map();
      for (const s of unique) {
        const existing = newestPerClass.get(s.class_id);
        if (!existing) {
          newestPerClass.set(s.class_id, s);
        } else {
          const a = new Date(existing.created_date).getTime();
          const b = new Date(s.created_date).getTime();
          if (b > a) newestPerClass.set(s.class_id, s);
        }
      }

      const candidates = Array.from(newestPerClass.values()).sort(
        (a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime()
      );

      // Show only the newest overall
      return candidates[0] || null;
    },
    enabled: enrolledClasses.length > 0,
    refetchInterval: 5000
  });

  const sessionClass = useMemo(() => {
    if (!liveQuizBannerSession) return null;
    return enrolledClasses.find(c => c.id === liveQuizBannerSession.class_id) || null;
  }, [liveQuizBannerSession, enrolledClasses]);

  const showLiveQuizBanner =
    !!liveQuizBannerSession &&
    liveQuizBannerSession.id !== dismissedLiveQuizSessionId;

  const { data: assignments = [] } = useQuery({
    queryKey: ['studentAssignments', user?.email, enrolledClasses.map(c => c.id).join(',')],
    queryFn: async () => {
      if (!user?.email || enrolledClasses.length === 0) return [];
      const classIds = enrolledClasses.map(c => c.id);
      return base44.entities.Assignment.filter(
        { class_id: { $in: classIds }, status: 'published' },
        'due_date'
      );
    },
    enabled: !!user?.email && enrolledClasses.length > 0
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['studentSubmissions', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.AssignmentSubmission.filter({ student_email: user.email });
    },
    enabled: !!user?.email
  });

  const avgResponseTime =
    recentAttempts.length > 0
      ? Math.round(recentAttempts.reduce((sum, a) => sum + (a.time_taken_seconds || 0), 0) / recentAttempts.length)
      : 0;

  const getAccuracyTrend = () => {
    if (recentAttempts.length < 2) return { label: 'Stable', icon: Minus, color: 'text-slate-400' };

    const recent = recentAttempts.slice(0, Math.ceil(recentAttempts.length / 2));
    const older = recentAttempts.slice(Math.ceil(recentAttempts.length / 2));

    const recentAvg = recent.reduce((sum, a) => sum + (a.accuracy_percent || 0), 0) / recent.length;
    const olderAvg = older.reduce((sum, a) => sum + (a.accuracy_percent || 0), 0) / older.length;

    const diff = recentAvg - olderAvg;

    if (diff > 5) return { label: 'Improving', icon: TrendingUp, color: 'text-emerald-400' };
    if (diff < -5) return { label: 'Declining', icon: TrendingDown, color: 'text-red-400' };
    return { label: 'Stable', icon: Minus, color: 'text-slate-400' };
  };

  const getDueAssignments = () => {
    const now = new Date();
    const pending = assignments.filter(a => {
      if (!a.due_date) return false;
      const dueDate = new Date(a.due_date);
      const submission = submissions.find(s => s.assignment_id === a.id);
      return (
        dueDate > now &&
        (!submission || submission.status === 'not_started' || submission.status === 'in_progress')
      );
    });

    const sorted = pending.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

    return sorted.slice(0, 5).map(a => {
      const dueDate = new Date(a.due_date);
      const diffMs = dueDate - now;
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      let dueDateText = '';
      let urgency = 'normal';

      if (diffDays === 0) {
        dueDateText = 'Due today';
        urgency = 'high';
      } else if (diffDays === 1) {
        dueDateText = 'Due tomorrow';
        urgency = 'high';
      } else if (diffDays <= 3) {
        dueDateText = `Due in ${diffDays} days`;
        urgency = 'medium';
      } else {
        dueDateText = `Due in ${diffDays} days`;
        urgency = 'normal';
      }

      const assignmentClass = enrolledClasses.find(c => c.id === a.class_id);
      return { ...a, dueDateText, urgency, className: assignmentClass?.name || 'Unknown Class' };
    });
  };

  const trend = getAccuracyTrend();
  const dueAssignments = getDueAssignments();

  const handleJoinClass = async () => {
    if (!classJoinCode || !user?.email) return;

    try {
      const classes = await base44.entities.Class.filter({ join_code: classJoinCode });
      if (classes.length === 0) {
        alert('Class not found');
        return;
      }

      const classToJoin = classes[0];
      const studentEmails = classToJoin.student_emails || [];

      if (!studentEmails.includes(user.email)) {
        await base44.entities.Class.update(classToJoin.id, {
          student_emails: [...studentEmails, user.email]
        });
      }

      queryClient.invalidateQueries({ queryKey: ['enrolledClasses'] });
      setJoinClassOpen(false);
      setClassJoinCode('');
    } catch (error) {
      console.error('Error joining class:', error);
      alert('Failed to join class');
    }
  };

  const joinLiveQuizMutation = useMutation({
    mutationFn: async ({ sessionId, nickname }) => {
      const trimmedNickname = (nickname || '').trim();
      if (trimmedNickname.length < 2 || trimmedNickname.length > 16) {
        throw new Error('Nickname must be between 2-16 characters');
      }

      // Hard validate session is still joinable
      const sessions = await base44.entities.LiveQuizSession.filter({ id: sessionId });
      const session = sessions[0];
      if (!session || session.ended_at || (session.status !== 'lobby' && session.status !== 'live')) {
        throw new Error('No live quiz is currently running');
      }

      const existingPlayers = await base44.entities.LiveQuizPlayer.filter({ session_id: sessionId });

      let finalNickname = trimmedNickname;
      let counter = 2;
      while (existingPlayers.some(p => p.nickname === finalNickname)) {
        finalNickname = `${trimmedNickname} ${counter}`;
        counter++;
      }

      await base44.entities.LiveQuizPlayer.create({
        session_id: sessionId,
        nickname: finalNickname,
        student_email: user.email,
        total_points: 0,
        correct_count: 0,
        questions_answered: 0,
        average_response_time_ms: 0,
        current_streak: 0,
        longest_streak: 0,
        connected: true
      });

      return { sessionId };
    },
    onSuccess: ({ sessionId }) => {
      navigate(createPageUrl(`StudentLiveQuizPlay?sessionId=${sessionId}`));
    },
    onError: (error) => {
      alert('Failed to join: ' + (error.message || 'Please try again'));
    }
  });

  const handleJoinLiveQuiz = (sessionId) => {
    setJoiningSessionId(sessionId);
    joinLiveQuizMutation.mutate({ sessionId, nickname });
  };

  const dismissBanner = () => {
    if (!liveQuizBannerSession) return;
    setDismissedLiveQuizSessionId(liveQuizBannerSession.id);
localStorage.setItem('dismissedLiveQuizSessionId', liveQuizBannerSession.id);  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">My Dashboard</h1>
          <p className="text-slate-300 drop-shadow-md">
            Track your assignments, classes, and quiz performance
          </p>
        </motion.div>

        {/* ✅ Rebuilt: single live quiz banner (max 1) */}
        {showLiveQuizBanner && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <GlassCard className="p-6 border-2 border-amber-500/30 bg-slate-950/60 backdrop-blur-xl">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center ${
                      liveQuizBannerSession.status === 'lobby' ? 'animate-pulse' : ''
                    }`}
                  >
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white drop-shadow-md">
                      {liveQuizBannerSession.status === 'lobby'
                        ? 'Live Quiz Starting!'
                        : 'Live Quiz In Progress'}
                    </h3>
                    <p className="text-sm text-slate-300 drop-shadow-sm">{sessionClass?.name}</p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={dismissBanner}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-3">
                {liveQuizBannerSession.status === 'live' && (
                  <div className="p-3 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-300 text-sm">
                    Quiz has started! You can still join as a late entry.
                  </div>
                )}

                <div>
                  <Label className="text-white text-sm mb-2">Your Nickname</Label>
                  <Input
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Enter nickname"
                    minLength={2}
                    maxLength={16}
                    className="bg-white/5 border-white/10 text-white"
                  />
                  <p className="text-xs text-slate-400 mt-1">2-16 characters</p>
                </div>

                <Button
                  onClick={() => handleJoinLiveQuiz(liveQuizBannerSession.id)}
                  disabled={
                    nickname.trim().length < 2 ||
                    nickname.trim().length > 16 ||
                    joinLiveQuizMutation.isPending
                  }
                  className={`w-full ${
                    liveQuizBannerSession.status === 'lobby'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
                      : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600'
                  }`}
                >
                  {joinLiveQuizMutation.isPending && joiningSessionId === liveQuizBannerSession.id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      {liveQuizBannerSession.status === 'lobby' ? 'Join Quiz' : 'Join Now (Late Entry)'}
                    </>
                  )}
                </Button>
              </div>
            </GlassCard>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            icon={Target}
            label="Overall Accuracy"
            value={`${Math.round(progress?.accuracy_percent || 0)}%`}
            delay={0}
          />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3, ease: 'easeOut' }}
          >
            <GlassCard hover={false} className="p-8 text-center bg-slate-950/50 backdrop-blur-xl">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <trend.icon className={`w-6 h-6 ${trend.color}`} />
              </div>
              <p className="text-4xl font-bold text-white mb-2 drop-shadow-lg">{trend.label}</p>
              <p className="text-sm text-slate-300 drop-shadow-md">Accuracy Trend</p>
            </GlassCard>
          </motion.div>
          <StatCard
            icon={Clock}
            label="Avg Answer Time"
            value={avgResponseTime > 0 ? `${avgResponseTime}s` : 'N/A'}
            delay={0.2}
          />
        </div>

        {/* Personalized Learning Path */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2 drop-shadow-lg">
            <Brain className="w-5 h-5 text-purple-400" />
            Recommended For You
          </h2>
          <PersonalizedLearningPath 
            studentEmail={user?.email} 
            classId={enrolledClasses.length > 0 ? enrolledClasses[0].id : null}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2 drop-shadow-lg">
            <Calendar className="w-5 h-5 text-purple-400" />
            Due Assignments
          </h2>
          <GlassCard className="p-6 bg-slate-950/50 backdrop-blur-xl">
            {dueAssignments.length > 0 ? (
              <div className="space-y-3">
                {dueAssignments.map((assignment, idx) => {
                  const urgencyColors = {
                    high: 'border-red-500/30 bg-red-500/5',
                    medium: 'border-amber-500/30 bg-amber-500/5',
                    normal: 'border-white/10 bg-white/5'
                  };

                  return (
                    <Link key={assignment.id} to={createPageUrl(`AssignmentDue?id=${assignment.id}`)}>
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`p-4 rounded-xl border ${urgencyColors[assignment.urgency]} hover:bg-white/10 transition-all cursor-pointer group`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-white drop-shadow-md group-hover:text-purple-300 transition-colors">
                              {assignment.title}
                            </h3>
                            <p className="text-sm text-slate-300 drop-shadow-sm">{assignment.className}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p
                                className={`text-sm font-medium ${
                                  assignment.urgency === 'high'
                                    ? 'text-red-400'
                                    : assignment.urgency === 'medium'
                                    ? 'text-amber-400'
                                    : 'text-slate-300'
                                } drop-shadow-md`}
                              >
                                {assignment.dueDateText}
                              </p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                          </div>
                        </div>
                      </motion.div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-300 drop-shadow-md">No upcoming assignments 🎉</p>
              </div>
            )}
          </GlassCard>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-1 gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <GlassCard
            className="p-6 cursor-pointer hover:scale-[1.02] bg-slate-950/50 backdrop-blur-xl"
            onClick={() => setJoinClassOpen(true)}
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <UserPlus className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white drop-shadow-md">Join a Class</h3>
                <p className="text-sm text-slate-300 drop-shadow-sm">Enter a class code from your teacher</p>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        <div>
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 drop-shadow-lg">
            <Users className="w-5 h-5 text-blue-400" />
            My Classes
          </h2>

          <div className="space-y-3">
            {enrolledClasses.length > 0 ? (
              enrolledClasses.map((classItem, index) => {
                const classProgress = progress?.class_id === classItem.id ? progress : null;
                const classAccuracy = classProgress?.accuracy_percent || 0;
                const classAssignments = assignments.filter(a => a.class_id === classItem.id);
                const pendingAssignments = classAssignments.filter(a => {
                  const submission = submissions.find(s => s.assignment_id === a.id);
                  return !submission || submission.status === 'not_started' || submission.status === 'in_progress';
                }).length;

                return (
                  <motion.div
                    key={classItem.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link to={createPageUrl(`StudentClassDetail?classId=${classItem.id}`)}>
                      <GlassCard className="p-5 hover:scale-[1.02] bg-slate-950/50 backdrop-blur-xl">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-white drop-shadow-md">{classItem.name}</h3>
                            <p className="text-sm text-slate-300 drop-shadow-sm">
                              Teacher: {classItem.teacher_email.split('@')[0]}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-white drop-shadow-lg">{Math.round(classAccuracy)}%</p>
                            <p className="text-xs text-slate-300 drop-shadow-sm">Accuracy</p>
                          </div>
                        </div>
                        {pendingAssignments > 0 && (
                          <div className="pt-3 border-t border-white/10">
                            <p className="text-sm text-amber-400 drop-shadow-md">
                              {pendingAssignments} active assignment{pendingAssignments > 1 ? 's' : ''}
                            </p>
                          </div>
                        )}
                      </GlassCard>
                    </Link>
                  </motion.div>
                );
              })
            ) : (
              <GlassCard className="p-12 text-center bg-slate-950/50 backdrop-blur-xl">
                <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="font-semibold text-white mb-2 drop-shadow-md">No classes yet</h3>
                <p className="text-slate-300 text-sm drop-shadow-sm">Join a class to see it here.</p>
              </GlassCard>
            )}
          </div>
        </div>

        <Dialog open={joinClassOpen} onOpenChange={setJoinClassOpen}>
          <DialogContent className="bg-slate-950/95 backdrop-blur-xl border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">Join Class</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Class Code</Label>
                <Input
                  value={classJoinCode}
                  onChange={(e) => setClassJoinCode(e.target.value.toUpperCase())}
                  placeholder="Enter class code"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <Button
                onClick={handleJoinClass}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500"
                disabled={!classJoinCode}
              >
                Join Class
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}