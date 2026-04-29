import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import GlassCard, { StatCard } from '@/components/ui/GlassCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PersonalizedLearningPath from '@/components/learning/PersonalizedLearningPath';
import LiveQuizPopup from '@/components/quiz/LiveQuizPopup';
import LiveQuizBanner from '@/components/quiz/LiveQuizBanner';
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
  Zap } from
'lucide-react';

export default function StudentDashboard() {
  const [user, setUser] = useState(null);
  const [nickname, setNickname] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [joinClassOpen, setJoinClassOpen] = useState(false);
  const [classJoinCode, setClassJoinCode] = useState('');

  // Live quiz lobby state
  const [lobbySession, setLobbySession] = useState(null);
  const [dismissedLobbySessionId, setDismissedLobbySessionId] = useState(() =>
    localStorage.getItem('dismissedLobbySessionId') || null
  );
  const [showLobbyBanner, setShowLobbyBanner] = useState(false);

  // Join-by-code state
  const [quizCodeOpen, setQuizCodeOpen] = useState(false);
  const [quizCode, setQuizCode] = useState('');
  const [quizCodeError, setQuizCodeError] = useState('');
  const [joiningByCode, setJoiningByCode] = useState(false);



  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);

      const firstName = userData.full_name ?
      userData.full_name.split(' ')[0] :
      userData.email.split('@')[0];

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
      return allClasses.filter((c) => c.student_emails?.includes(user.email));
    },
    enabled: !!user?.email
  });

  // Real-time QuizLobbySession subscription + initial fetch
  useEffect(() => {
    if (enrolledClasses.length === 0) return;

    const classIds = enrolledClasses.map(c => c.id);
    const ONE_HOUR_MS = 60 * 60 * 1000;

    const findActive = (sessions) => {
      const now = Date.now();
      return sessions
        .filter(s => s && s.status !== 'ended' && (now - new Date(s.created_date).getTime()) < ONE_HOUR_MS && classIds.includes(s.class_id))
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0] || null;
    };

    // Initial fetch
    base44.entities.QuizLobbySession.filter({ class_id: { $in: classIds } }, '-created_date')
      .then(sessions => {
        const active = findActive(sessions);
        setLobbySession(active);
      })
      .catch(() => {});

    // Real-time subscription
    const unsub = base44.entities.QuizLobbySession.subscribe((event) => {
      if (event.type === 'create' || event.type === 'update') {
        const s = event.data;
        if (!s || !classIds.includes(s.class_id)) return;
        if (s.status === 'ended') {
          setLobbySession(prev => prev?.id === s.id ? null : prev);
        } else {
          const age = Date.now() - new Date(s.created_date || Date.now()).getTime();
          if (age < ONE_HOUR_MS) {
            setLobbySession(s);
            // Re-show popup if this is a brand new session
            if (event.type === 'create') {
              setShowLobbyBanner(false);
              setDismissedLobbySessionId(null);
              localStorage.removeItem('dismissedLobbySessionId');
            }
          }
        }
      } else if (event.type === 'delete') {
        setLobbySession(prev => prev?.id === event.id ? null : prev);
      }
    });

    return () => unsub();
  }, [enrolledClasses.map(c => c.id).join(',')]);

  const showLobbyPopup = !!lobbySession && lobbySession.id !== dismissedLobbySessionId && !showLobbyBanner;

  const handleDismissPopup = () => {
    setShowLobbyBanner(true);
    if (lobbySession) {
      setDismissedLobbySessionId(lobbySession.id);
      localStorage.setItem('dismissedLobbySessionId', lobbySession.id);
    }
  };

  const handleJoinByCode = async () => {
    if (!quizCode.trim() || !user?.email) return;
    setJoiningByCode(true);
    setQuizCodeError('');
    const sessions = await base44.entities.QuizLobbySession.filter({ join_code: quizCode.trim().toUpperCase() });
    const sess = sessions.find(s => s.status === 'lobby' || s.status === 'active');
    if (!sess) {
      setQuizCodeError('Invalid or expired code. Please try again.');
      setJoiningByCode(false);
      return;
    }
    // Add student to participants
    const emails = sess.participant_emails || [];
    const names = sess.participant_names || [];
    if (!emails.includes(user.email)) {
      await base44.entities.QuizLobbySession.update(sess.id, {
        participant_emails: [...emails, user.email],
        participant_names: [...names, user.full_name || user.email.split('@')[0]]
      });
    }
    setJoiningByCode(false);
    setQuizCodeOpen(false);
    setQuizCode('');
    navigate(`/live-quiz-lobby-new?sessionId=${sess.id}`);
  };



  const { data: assignments = [] } = useQuery({
    queryKey: ['studentAssignments', user?.email, enrolledClasses.map((c) => c.id).join(',')],
    queryFn: async () => {
      if (!user?.email || enrolledClasses.length === 0) return [];
      const classIds = enrolledClasses.map((c) => c.id);
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

  const { data: timetableLessons = [] } = useQuery({
    queryKey: ['timetableLessons', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.TimetableLesson.filter({ student_email: user.email }, '-created_date');
    },
    enabled: !!user?.email
  });

  const [timeUntilNext, setTimeUntilNext] = useState('');

  useEffect(() => {
    const updateCountdown = () => {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const todayDay = days[new Date().getDay()];
      
      const todayLessons = timetableLessons.filter(l => l.day_of_week === todayDay);
      if (todayLessons.length === 0) {
        setTimeUntilNext('');
        return;
      }

      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      const nextLesson = todayLessons
        .filter(l => l.start_time && l.start_time > currentTime)
        .sort((a, b) => a.start_time.localeCompare(b.start_time))[0];

      if (nextLesson && nextLesson.start_time) {
        const [hours, mins] = nextLesson.start_time.split(':').map(Number);
        const lessonTime = new Date();
        lessonTime.setHours(hours, mins, 0);
        const diff = lessonTime - now;
        
        if (diff > 0) {
          const minsUntil = Math.floor(diff / 60000);
          if (minsUntil < 60) {
            setTimeUntilNext(`${minsUntil} min${minsUntil !== 1 ? 's' : ''}`);
          } else {
            const hoursUntil = Math.floor(minsUntil / 60);
            setTimeUntilNext(`${hoursUntil}h ${minsUntil % 60}m`);
          }
        }
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 60000);
    return () => clearInterval(timer);
  }, [timetableLessons]);

  const avgResponseTime =
  recentAttempts.length > 0 ?
  Math.round(recentAttempts.reduce((sum, a) => sum + (a.time_taken_seconds || 0), 0) / recentAttempts.length) :
  0;

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
    const pending = assignments.filter((a) => {
      if (!a.due_date) return false;
      const dueDate = new Date(a.due_date);
      const submission = submissions.find((s) => s.assignment_id === a.id);
      return (
        dueDate > now && (
        !submission || submission.status === 'not_started' || submission.status === 'in_progress'));

    });

    const sorted = pending.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

    return sorted.slice(0, 5).map((a) => {
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

      const assignmentClass = enrolledClasses.find((c) => c.id === a.class_id);
      return { ...a, dueDateText, urgency, className: assignmentClass?.name || 'Unknown Class' };
    });
  };

  const trend = getAccuracyTrend();
  const dueAssignments = getDueAssignments();

  const getNextLesson = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayDay = days[new Date().getDay()];
    const todayLessons = timetableLessons.filter(l => l.day_of_week === todayDay);
    
    if (todayLessons.length === 0) return null;

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    return todayLessons
      .filter(l => l.start_time && l.start_time > currentTime)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))[0] || null;
  };

  const nextLesson = getNextLesson();

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



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      {/* New lobby popup */}
      {showLobbyPopup && user && lobbySession && (
        <LiveQuizPopup
          session={lobbySession}
          user={user}
          onDismiss={handleDismissPopup}
        />
      )}

      {/* Dismissed → sticky banner */}
      {showLobbyBanner && user && lobbySession && (
        <LiveQuizBanner
          session={lobbySession}
          user={user}
        />
      )}

      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8">
          
          <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">My Dashboard</h1>
          <p className="text-slate-300 drop-shadow-md">
            Track your assignments, classes, and quiz performance
          </p>
        </motion.div>



        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            icon={Target}
            label="Overall Accuracy"
            value={`${Math.round(progress?.accuracy_percent || 0)}%`}
            delay={0} />
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3, ease: 'easeOut' }}>
            
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
            delay={0.2} />
          
        </div>

        {/* Next Lesson Preview */}
        {nextLesson && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2 drop-shadow-lg">
              <Clock className="w-5 h-5 text-blue-400" />
              Next Lesson
            </h2>
            <GlassCard className="p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-2 border-blue-500/30">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-2">{nextLesson.lesson_name}</h3>
                  <div className="space-y-2">
                    <p className="text-sm text-slate-300">
                      <span className="font-semibold">{nextLesson.subject}</span>
                      {nextLesson.teacher_name && ` • ${nextLesson.teacher_name}`}
                    </p>
                    <p className="text-sm text-slate-300 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {nextLesson.start_time} ({nextLesson.duration_minutes} min)
                    </p>
                    {nextLesson.notes && (
                      <p className="text-sm text-slate-400 italic">{nextLesson.notes}</p>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="text-sm text-slate-400 mb-1">Time until lesson</p>
                  <p className="text-3xl font-bold text-blue-400">{timeUntilNext || '—'}</p>
                  {nextLesson.link && (
                    <a
                      href={nextLesson.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-block px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Join Session
                    </a>
                  )}
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Personalized Learning Path */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: nextLesson ? 0.4 : 0.3 }}
          className="mb-8">
          
          


          
          <PersonalizedLearningPath
            studentEmail={user?.email}
            classId={enrolledClasses.length > 0 ? enrolledClasses[0].id : null} />
          
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: nextLesson ? 0.5 : 0.4 }}
          className="mb-8">
          
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2 drop-shadow-lg">
            <Calendar className="w-5 h-5 text-purple-400" />
            Due Assignments
          </h2>
          <GlassCard className="p-6 bg-slate-950/50 backdrop-blur-xl">
            {dueAssignments.length > 0 ?
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
                      className={`p-4 rounded-xl border ${urgencyColors[assignment.urgency]} hover:bg-white/10 transition-all cursor-pointer group`}>
                      
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
                              assignment.urgency === 'high' ?
                              'text-red-400' :
                              assignment.urgency === 'medium' ?
                              'text-amber-400' :
                              'text-slate-300'} drop-shadow-md`
                              }>
                              
                                {assignment.dueDateText}
                              </p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                          </div>
                        </div>
                      </motion.div>
                    </Link>);

              })}
              </div> :

            <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-300 drop-shadow-md">No upcoming assignments 🎉</p>
              </div>
            }
          </GlassCard>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-2 gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: nextLesson ? 0.6 : 0.5 }}>
          
          <GlassCard
            className="p-6 cursor-pointer hover:scale-[1.02] bg-slate-950/50 backdrop-blur-xl"
            onClick={() => setJoinClassOpen(true)}>
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

          <GlassCard
            className="p-6 cursor-pointer hover:scale-[1.02] bg-slate-950/50 backdrop-blur-xl border border-amber-500/20"
            onClick={() => { setQuizCodeOpen(true); setQuizCodeError(''); setQuizCode(''); }}>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white drop-shadow-md">Join Quiz</h3>
                <p className="text-sm text-slate-300 drop-shadow-sm">Enter a quiz code from your teacher</p>
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
            {enrolledClasses.length > 0 ?
            enrolledClasses.map((classItem, index) => {
              const classProgress = progress?.class_id === classItem.id ? progress : null;
              const classAccuracy = classProgress?.accuracy_percent || 0;
              const classAssignments = assignments.filter((a) => a.class_id === classItem.id);
              const pendingAssignments = classAssignments.filter((a) => {
                const submission = submissions.find((s) => s.assignment_id === a.id);
                return !submission || submission.status === 'not_started' || submission.status === 'in_progress';
              }).length;

              return (
                <motion.div
                  key={classItem.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}>
                  
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
                        {pendingAssignments > 0 &&
                      <div className="pt-3 border-t border-white/10">
                            <p className="text-sm text-amber-400 drop-shadow-md">
                              {pendingAssignments} active assignment{pendingAssignments > 1 ? 's' : ''}
                            </p>
                          </div>
                      }
                      </GlassCard>
                    </Link>
                  </motion.div>);

            }) :

            <GlassCard className="p-12 text-center bg-slate-950/50 backdrop-blur-xl">
                <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="font-semibold text-white mb-2 drop-shadow-md">No classes yet</h3>
                <p className="text-slate-300 text-sm drop-shadow-sm">Join a class to see it here.</p>
              </GlassCard>
            }
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
                  className="bg-white/5 border-white/10 text-white" />
              </div>
              <Button
                onClick={handleJoinClass}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500"
                disabled={!classJoinCode}>
                Join Class
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Join Quiz by Code Dialog */}
        <Dialog open={quizCodeOpen} onOpenChange={setQuizCodeOpen}>
          <DialogContent className="bg-slate-950/95 backdrop-blur-xl border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" /> Join Live Quiz
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Quiz Code</Label>
                <Input
                  value={quizCode}
                  onChange={(e) => { setQuizCode(e.target.value.toUpperCase()); setQuizCodeError(''); }}
                  placeholder="e.g. A7K9X"
                  maxLength={6}
                  className="bg-white/5 border-white/10 text-white text-xl tracking-widest font-bold text-center"
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinByCode()}
                />
                {quizCodeError && (
                  <p className="text-red-400 text-sm mt-1">{quizCodeError}</p>
                )}
              </div>
              <Button
                onClick={handleJoinByCode}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                disabled={!quizCode.trim() || joiningByCode}>
                {joiningByCode ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Joining...</>
                ) : (
                  <><Zap className="w-4 h-4 mr-2" /> Join Quiz</>
                )}
              </Button>
              <p className="text-xs text-slate-500 text-center">Ask your teacher for the 5-letter quiz code</p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>);

}