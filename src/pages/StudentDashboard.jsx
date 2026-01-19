import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BookOpen, 
  Trophy, 
  Zap, 
  Target,
  MessageSquare,
  Award,
  ChevronRight,
  Calendar,
  Users
} from 'lucide-react';

import StatsCard from '@/components/dashboard/StatsCard';
import SubjectCard from '@/components/dashboard/SubjectCard';
import DailyGoal from '@/components/dashboard/DailyGoal';
import WeakStrongAreas from '@/components/dashboard/WeakStrongAreas';
import XPBar from '@/components/ui/XPBar';
import StreakBadge from '@/components/ui/StreakBadge';

export default function StudentDashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    fetchUser();
  }, []);

  const { data: subjects = [], isLoading: loadingSubjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => base44.entities.Subject.list()
  });

  const { data: topics = [], isLoading: loadingTopics } = useQuery({
    queryKey: ['topics'],
    queryFn: () => base44.entities.Topic.list()
  });

  const { data: progress, isLoading: loadingProgress } = useQuery({
    queryKey: ['studentProgress', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const progressList = await base44.entities.StudentProgress.filter({ student_email: user.email });
      return progressList[0] || null;
    },
    enabled: !!user?.email
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => base44.entities.Assignment.list('-created_date', 5)
  });

  const calculateLevelXP = (level) => level * 100;

  const getSubjectProgress = (subjectId) => {
    const subjectTopics = topics.filter(t => t.subject_id === subjectId);
    if (subjectTopics.length === 0) return 0;
    
    const totalMastery = subjectTopics.reduce((sum, topic) => {
      return sum + (progress?.topic_mastery?.[topic.id] || 0);
    }, 0);
    
    return totalMastery / subjectTopics.length;
  };

  const isLoading = loadingSubjects || loadingProgress;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}! 👋
            </h1>
            <p className="text-slate-500 mt-1">Ready to continue your learning journey?</p>
          </div>
          <div className="flex items-center gap-3">
            {progress && <StreakBadge streak={progress.current_streak || 0} />}
            <Link to={createPageUrl('AITutor')}>
              <Button className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 shadow-lg shadow-purple-500/25">
                <MessageSquare className="w-4 h-4 mr-2" />
                AI Tutor
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* XP Progress */}
        {isLoading ? (
          <Skeleton className="h-20 rounded-2xl mb-8" />
        ) : (
          <motion.div
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <XPBar
              currentXP={progress?.total_xp % calculateLevelXP(progress?.level || 1) || 0}
              levelXP={calculateLevelXP(progress?.level || 1)}
              level={progress?.level || 1}
            />
          </motion.div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            icon={Zap}
            label="Total XP"
            value={progress?.total_xp?.toLocaleString() || '0'}
            color="indigo"
            delay={0.1}
          />
          <StatsCard
            icon={BookOpen}
            label="Lessons Done"
            value={progress?.completed_lessons?.length || 0}
            color="emerald"
            delay={0.15}
          />
          <StatsCard
            icon={Trophy}
            label="Badges"
            value={progress?.badges?.length || 0}
            color="amber"
            delay={0.2}
          />
          <StatsCard
            icon={Award}
            label="Best Streak"
            value={`${progress?.longest_streak || 0} days`}
            color="rose"
            delay={0.25}
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Subjects */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Your Subjects</h2>
              <Link to={createPageUrl('Subject')} className="text-indigo-600 text-sm font-medium hover:underline">
                View all
              </Link>
            </div>

            {loadingSubjects ? (
              <div className="grid md:grid-cols-2 gap-4">
                {[1, 2].map(i => (
                  <Skeleton key={i} className="h-48 rounded-2xl" />
                ))}
              </div>
            ) : subjects.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {subjects.slice(0, 4).map((subject, idx) => {
                  const subjectTopics = topics.filter(t => t.subject_id === subject.id);
                  const completedTopics = subjectTopics.filter(t => 
                    progress?.topic_mastery?.[t.id] >= 80
                  ).length;
                  
                  return (
                    <SubjectCard
                      key={subject.id}
                      subject={subject}
                      progress={getSubjectProgress(subject.id)}
                      topicsCount={subjectTopics.length}
                      completedTopics={completedTopics}
                      delay={idx * 0.1}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-8 text-center border border-slate-100">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="font-semibold text-slate-700 mb-2">No subjects yet</h3>
                <p className="text-slate-500 text-sm">Subjects will appear here once added.</p>
              </div>
            )}

            {/* Weak/Strong Areas */}
            <div className="mt-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Your Performance</h2>
              <WeakStrongAreas
                weakAreas={progress?.weak_areas || []}
                strongAreas={progress?.strong_areas || []}
                topics={topics}
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Daily Goal */}
            <DailyGoal
              currentXP={progress?.today_xp || 0}
              goalXP={progress?.daily_xp_goal || 50}
            />

            {/* Upcoming Assignments */}
            <motion.div
              className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800">Upcoming Work</h3>
                <Calendar className="w-5 h-5 text-slate-400" />
              </div>
              {assignments.length > 0 ? (
                <div className="space-y-3">
                  {assignments.slice(0, 3).map(assignment => (
                    <div key={assignment.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <div className="w-2 h-2 rounded-full bg-indigo-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-700">{assignment.title}</p>
                        <p className="text-xs text-slate-500">
                          Due: {new Date(assignment.due_date).toLocaleDateString()}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">No upcoming assignments</p>
              )}
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <h3 className="font-semibold mb-2">Need help?</h3>
              <p className="text-indigo-100 text-sm mb-4">
                Chat with your AI tutor for personalised explanations and practice questions.
              </p>
              <Link to={createPageUrl('AITutor')}>
                <Button className="w-full bg-white text-indigo-600 hover:bg-indigo-50">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Open AI Tutor
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}