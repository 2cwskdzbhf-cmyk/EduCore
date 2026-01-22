import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import GlassCard, { StatCard } from '@/components/ui/GlassCard';
import {
  BookOpen,
  Trophy,
  Target,
  TrendingUp,
  Zap,
  Calendar
} from 'lucide-react';

export default function StudentDashboard() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={Target}
            label="Overall Accuracy"
            value={`${progress?.accuracy_percent || 0}%`}
            delay={0}
          />
          <StatCard
            icon={Trophy}
            label="Quizzes Completed"
            value={progress?.quizzes_completed || 0}
            delay={0.1}
          />
          <StatCard
            icon={TrendingUp}
            label="Current Streak"
            value={`${progress?.current_streak || 0} days`}
            delay={0.2}
          />
          <StatCard
            icon={Zap}
            label="Total XP"
            value={progress?.total_xp || 0}
            delay={0.3}
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
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
              <Calendar className="w-5 h-5 text-blue-400" />
              Recent Activity
            </h2>

            <div className="space-y-3">
              {recentAttempts.length > 0 ? (
                recentAttempts.map((attempt, index) => (
                  <motion.div
                    key={attempt.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <GlassCard className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-white">Quiz Attempt</span>
                        <span className={`text-sm font-bold ${
                          attempt.accuracy_percent >= 80 ? 'text-emerald-400' :
                          attempt.accuracy_percent >= 60 ? 'text-amber-400' :
                          'text-red-400'
                        }`}>
                          {Math.round(attempt.accuracy_percent)}%
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        {new Date(attempt.completed_at).toLocaleDateString()}
                      </p>
                    </GlassCard>
                  </motion.div>
                ))
              ) : (
                <GlassCard className="p-6 text-center">
                  <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No recent activity</p>
                </GlassCard>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}