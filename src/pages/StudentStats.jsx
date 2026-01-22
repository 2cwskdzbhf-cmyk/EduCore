import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ChevronLeft, 
  Trophy, 
  Target,
  BookOpen,
  TrendingUp,
  Calendar,
  Award
} from 'lucide-react';

export default function StudentStatsPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const studentEmail = urlParams.get('email');
  const classId = urlParams.get('classId');

  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    fetchUser();
  }, []);

  const { data: studentProgress, isLoading: loadingProgress } = useQuery({
    queryKey: ['studentProgress', studentEmail],
    queryFn: async () => {
      if (!studentEmail) return null;
      const progressList = await base44.entities.StudentProgress.filter({ student_email: studentEmail });
      return progressList[0] || null;
    },
    enabled: !!studentEmail
  });

  const { data: quizAttempts = [], isLoading: loadingAttempts } = useQuery({
    queryKey: ['quizAttempts', studentEmail],
    queryFn: async () => {
      if (!studentEmail) return [];
      return base44.entities.QuizAttempt.filter({ student_email: studentEmail }, '-completed_at', 50);
    },
    enabled: !!studentEmail
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['topics'],
    queryFn: () => base44.entities.Topic.list()
  });

  const { data: classData } = useQuery({
    queryKey: ['class', classId],
    queryFn: async () => {
      if (!classId) return null;
      const classes = await base44.entities.Class.filter({ id: classId });
      return classes[0] || null;
    },
    enabled: !!classId
  });

  // Calculate topic-wise accuracy
  const getTopicStats = () => {
    const topicMap = {};
    quizAttempts.forEach(attempt => {
      if (!topicMap[attempt.topic_id]) {
        topicMap[attempt.topic_id] = {
          attempts: 0,
          totalAccuracy: 0,
          questions: 0,
          correct: 0
        };
      }
      topicMap[attempt.topic_id].attempts++;
      topicMap[attempt.topic_id].totalAccuracy += attempt.accuracy_percent;
      topicMap[attempt.topic_id].questions += attempt.questions_answered;
      topicMap[attempt.topic_id].correct += attempt.correct_answers;
    });

    return Object.entries(topicMap).map(([topicId, stats]) => {
      const topic = topics.find(t => t.id === topicId);
      return {
        topicId,
        topicName: topic?.name || 'Unknown Topic',
        attempts: stats.attempts,
        avgAccuracy: Math.round((stats.totalAccuracy / stats.attempts) * 10) / 10,
        questions: stats.questions,
        correct: stats.correct
      };
    }).sort((a, b) => b.avgAccuracy - a.avgAccuracy);
  };

  const topicStats = getTopicStats();

  if (!studentEmail) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-4">Student not found</h1>
          <Link to={createPageUrl('TeacherDashboard')}>
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link 
            to={classId ? createPageUrl(`ClassDetails?id=${classId}`) : createPageUrl('TeacherDashboard')}
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Back to {classData?.name || 'Dashboard'}
          </Link>
          <h1 className="text-3xl font-bold text-white">{studentEmail}</h1>
          <p className="text-slate-400 mt-1">Student Performance Statistics</p>
        </motion.div>

        {/* Overall Stats */}
        {loadingProgress ? (
          <Skeleton className="h-40 rounded-2xl mb-8 bg-white/5" />
        ) : (
          <GlassCard className="p-8 mb-8 border-2 border-purple-500/30 shadow-purple-500/20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="grid md:grid-cols-4 gap-6">
                <div>
                  <p className="text-slate-400 text-sm mb-1">Overall Accuracy</p>
                  <p className="text-4xl font-bold text-white">{studentProgress?.accuracy_percent || 0}%</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-1">Total Answered</p>
                  <p className="text-4xl font-bold text-white">{studentProgress?.total_questions_answered || 0}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-1">Correct Answers</p>
                  <p className="text-4xl font-bold text-white">{studentProgress?.total_correct_answers || 0}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-1">Quizzes Done</p>
                  <p className="text-4xl font-bold text-white">{studentProgress?.quizzes_completed || 0}</p>
                </div>
              </div>
            </motion.div>
          </GlassCard>
        )}

        {/* Additional Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <StatCard
            icon={BookOpen}
            label="Lessons Done"
            value={studentProgress?.completed_lessons?.length || 0}
            delay={0}
          />
          <StatCard
            icon={Award}
            label="Current Streak"
            value={`${studentProgress?.current_streak || 0} days`}
            delay={0.1}
          />
          <StatCard
            icon={Calendar}
            label="Longest Streak"
            value={`${studentProgress?.longest_streak || 0} days`}
            delay={0.2}
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Recent Quiz Attempts */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-white mb-6">Recent Quiz Attempts</h2>
            {loadingAttempts ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl bg-white/5" />)}
              </div>
            ) : quizAttempts.length > 0 ? (
              <GlassCard className="divide-y divide-white/10">
                {quizAttempts.slice(0, 10).map((attempt, idx) => {
                  const topic = topics.find(t => t.id === attempt.topic_id);
                  return (
                    <motion.div
                      key={attempt.id}
                      className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors duration-300"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05, duration: 0.3 }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-lg ${
                          attempt.accuracy_percent >= 80 ? 'bg-emerald-500 shadow-emerald-500/50' :
                          attempt.accuracy_percent >= 50 ? 'bg-amber-500 shadow-amber-500/50' : 'bg-red-500 shadow-red-500/50'
                        }`}>
                          <Trophy className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{topic?.name || 'Quiz'}</p>
                          <p className="text-sm text-slate-400">
                            {new Date(attempt.completed_at).toLocaleDateString()} • {attempt.correct_answers}/{attempt.questions_answered}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-white">{attempt.accuracy_percent}%</p>
                      </div>
                    </motion.div>
                  );
                })}
              </GlassCard>
            ) : (
              <GlassCard className="p-8 text-center">
                <Trophy className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-400">No quiz attempts yet</p>
              </GlassCard>
            )}
          </div>

          {/* Topic Breakdown */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Topic Breakdown</h2>
            {topicStats.length > 0 ? (
              <div className="space-y-3">
                {topicStats.map((stat, idx) => (
                  <motion.div
                    key={stat.topicId}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1, duration: 0.3 }}
                  >
                    <GlassCard className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-white text-sm">{stat.topicName}</h3>
                        <span className={`text-lg font-bold ${
                          stat.avgAccuracy >= 80 ? 'text-emerald-400' :
                          stat.avgAccuracy >= 50 ? 'text-amber-400' : 'text-red-400'
                        }`}>
                          {stat.avgAccuracy}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>{stat.attempts} attempts</span>
                        <span>{stat.correct}/{stat.questions} correct</span>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            ) : (
              <GlassCard className="p-6 text-center">
                <Target className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <p className="text-sm text-slate-400">No topic data yet</p>
              </GlassCard>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}