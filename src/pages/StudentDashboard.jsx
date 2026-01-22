import React, { useState, useEffect } from 'react';
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
import {
  BookOpen,
  Trophy,
  Target,
  Flame,
  Zap,
  Radio,
  UserPlus,
  Users
} from 'lucide-react';

export default function StudentDashboard() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [joinLiveQuizOpen, setJoinLiveQuizOpen] = useState(false);
  const [joinClassOpen, setJoinClassOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [classJoinCode, setClassJoinCode] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
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

  const { data: activeLiveSessions = [] } = useQuery({
    queryKey: ['activeLiveSessions', enrolledClasses.map(c => c.id).join(',')],
    queryFn: async () => {
      if (enrolledClasses.length === 0) return [];
      const classIds = enrolledClasses.map(c => c.id);
      const sessions = await base44.entities.LiveQuizSession.filter({
        class_id: { $in: classIds },
        status: { $in: ['lobby', 'live'] }
      });
      return sessions;
    },
    enabled: enrolledClasses.length > 0,
    refetchInterval: 5000
  });

  const avgResponseTime = recentAttempts.length > 0
    ? Math.round(recentAttempts.reduce((sum, a) => sum + (a.time_taken_seconds || 0), 0) / recentAttempts.length * 1000)
    : null;

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

  const handleJoinLiveQuiz = () => {
    if (joinCode && nickname) {
      navigate(createPageUrl(`LiveQuizPlay?code=${joinCode}&nickname=${encodeURIComponent(nickname)}`));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back, {user?.full_name || 'Student'}!
          </h1>
          <p className="text-slate-400">Continue your learning journey</p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-2 gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard className="p-6 cursor-pointer hover:scale-[1.02]" onClick={() => setJoinLiveQuizOpen(true)}>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center shadow-lg shadow-red-500/30">
                <Radio className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Join Live Quiz</h3>
                <p className="text-sm text-slate-400">Enter a code to play</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6 cursor-pointer hover:scale-[1.02]" onClick={() => setJoinClassOpen(true)}>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <UserPlus className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Join Class</h3>
                <p className="text-sm text-slate-400">Enter a class code</p>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={Target}
            label="Overall Accuracy"
            value={`${Math.round(progress?.accuracy_percent || 0)}%`}
            delay={0}
          />
          <StatCard
            icon={Trophy}
            label="Quizzes Completed"
            value={progress?.quizzes_completed || 0}
            delay={0.1}
          />
          <StatCard
            icon={Flame}
            label="Current Streak"
            value={`${progress?.current_streak || 0} days`}
            delay={0.2}
          />
          {avgResponseTime && (
            <StatCard
              icon={Zap}
              label="Avg Answer Time"
              value={`${avgResponseTime}ms`}
              delay={0.3}
            />
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-400" />
              Your Subjects
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              {subjects.map((subject, index) => (
                <motion.div
                  key={subject.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link to={createPageUrl(`Subject?id=${subject.id}`)}>
                    <GlassCard className="p-6 hover:scale-[1.02]">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/50">
                          <BookOpen className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">{subject.name}</h3>
                          <p className="text-sm text-slate-400">{subject.key_stage}</p>
                        </div>
                      </div>
                      <p className="text-sm text-slate-400">{subject.description}</p>
                    </GlassCard>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              Your Classes
            </h2>

            <div className="space-y-3">
              {enrolledClasses.length > 0 ? (
                enrolledClasses.map((classItem, index) => {
                  const classProgress = progress?.class_id === classItem.id ? progress : null;
                  const classAccuracy = classProgress?.accuracy_percent || 0;
                  
                  return (
                    <motion.div
                      key={classItem.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Link to={createPageUrl(`StudentClassDetail?classId=${classItem.id}`)}>
                        <GlassCard className="p-5 hover:scale-[1.02]">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold text-white">{classItem.name}</h3>
                              <p className="text-sm text-slate-400">Teacher: {classItem.teacher_email.split('@')[0]}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-white">{Math.round(classAccuracy)}%</p>
                              <p className="text-xs text-slate-400">Accuracy</p>
                            </div>
                          </div>
                        </GlassCard>
                      </Link>
                    </motion.div>
                  );
                })
              ) : (
                <GlassCard className="p-12 text-center">
                  <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="font-semibold text-white mb-2">No classes yet</h3>
                  <p className="text-slate-400 text-sm">Join a class to see it here.</p>
                </GlassCard>
              )}
            </div>
          </div>
        </div>

        <Dialog open={joinLiveQuizOpen} onOpenChange={setJoinLiveQuizOpen}>
          <DialogContent className="bg-slate-950/95 backdrop-blur-xl border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">Join Live Quiz</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Join Code</Label>
                <Input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Enter code"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">Nickname</Label>
                <Input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Your display name"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <Button
                onClick={handleJoinLiveQuiz}
                className="w-full bg-gradient-to-r from-red-500 to-pink-500"
                disabled={!joinCode || !nickname}
              >
                Join Quiz
              </Button>
            </div>
          </DialogContent>
        </Dialog>

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