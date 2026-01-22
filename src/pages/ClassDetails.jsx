import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ChevronLeft,
  Users,
  Trophy,
  TrendingUp,
  TrendingDown,
  Zap,
  Award,
  Copy,
  Check,
  AlertTriangle
} from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { StatCard } from '@/components/ui/GlassCard';

export default function ClassDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const classId = urlParams.get('id');
  const [copiedCode, setCopiedCode] = useState(false);

  const { data: classObj, isLoading } = useQuery({
    queryKey: ['class', classId],
    queryFn: async () => {
      if (!classId) return null;
      const classes = await base44.entities.Class.filter({ id: classId });
      return classes[0] || null;
    },
    enabled: !!classId
  });

  const { data: subject } = useQuery({
    queryKey: ['subject', classObj?.subject_id],
    queryFn: async () => {
      if (!classObj?.subject_id) return null;
      const subjects = await base44.entities.Subject.filter({ id: classObj.subject_id });
      return subjects[0] || null;
    },
    enabled: !!classObj?.subject_id
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['topics', classObj?.subject_id],
    queryFn: async () => {
      if (!classObj?.subject_id) return [];
      return base44.entities.Topic.filter({ subject_id: classObj.subject_id });
    },
    enabled: !!classObj?.subject_id
  });

  const { data: allProgress = [] } = useQuery({
    queryKey: ['classProgress', classId],
    queryFn: async () => {
      if (!classObj?.student_emails?.length) return [];
      // Get progress for all students in class
      const allStudentProgress = await base44.entities.StudentProgress.list();
      return allStudentProgress.filter(p => 
        classObj.student_emails.includes(p.student_email)
      );
    },
    enabled: !!classObj?.student_emails?.length
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const copyJoinCode = () => {
    navigator.clipboard.writeText(classObj?.join_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const getStudentName = (email) => {
    const user = users.find(u => u.email === email);
    return user?.full_name || email;
  };

  const getCommonWeakAreas = () => {
    const weakAreaCounts = {};
    allProgress.forEach(p => {
      p.weak_areas?.forEach(topicId => {
        weakAreaCounts[topicId] = (weakAreaCounts[topicId] || 0) + 1;
      });
    });
    
    return Object.entries(weakAreaCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([topicId, count]) => ({
        topic: topics.find(t => t.id === topicId),
        count
      }))
      .filter(item => item.topic);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-purple-500/50" />
      </div>
    );
  }

  if (!classObj) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Class not found</h1>
          <Link to={createPageUrl('TeacherDashboard')}>
            <Button className="bg-gradient-to-r from-purple-500 to-blue-500">Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const avgAccuracy = allProgress.length > 0 
    ? Math.round(allProgress.reduce((sum, p) => sum + (p.accuracy_percent || 0), 0) / allProgress.length * 10) / 10
    : 0;

  const sortedStudents = [...allProgress].sort((a, b) => (b.accuracy_percent || 0) - (a.accuracy_percent || 0));
  const commonWeakAreas = getCommonWeakAreas();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link to={createPageUrl('TeacherDashboard')} className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
            <ChevronLeft className="w-5 h-5" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">{classObj.name}</h1>
          <p className="text-slate-400 mb-6">{subject?.name || 'No subject assigned'}</p>

          <GlassCard className="px-4 py-3 inline-block">
            <p className="text-sm text-slate-400 mb-1">Join Code</p>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xl font-bold text-white">{classObj.join_code}</span>
              <button onClick={copyJoinCode} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                {copiedCode ? (
                  <Check className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Copy className="w-5 h-5 text-slate-400" />
                )}
              </button>
            </div>
          </GlassCard>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={Users}
            label="Students"
            value={classObj.student_emails?.length || 0}
            delay={0}
          />
          <StatCard
            icon={Trophy}
            label="Avg Accuracy"
            value={`${avgAccuracy}%`}
            delay={0.1}
          />
          <StatCard
            icon={TrendingUp}
            label="Top"
            value={sortedStudents[0] ? getStudentName(sortedStudents[0].student_email).split(' ')[0] : '-'}
            delay={0.2}
          />
          <StatCard
            icon={TrendingDown}
            label="Support"
            value={sortedStudents.length > 0 ? getStudentName(sortedStudents[sortedStudents.length - 1].student_email).split(' ')[0] : '-'}
            delay={0.3}
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Students List */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-white mb-6">Students</h2>
            
            {classObj.student_emails?.length > 0 ? (
              <GlassCard className="divide-y divide-white/10">
                {sortedStudents.map((progress, idx) => (
                  <Link 
                    key={progress.id}
                    to={createPageUrl(`StudentStats?email=${progress.student_email}&classId=${classId}`)}
                  >
                    <motion.div
                      className="p-4 flex items-center gap-4 hover:bg-white/5 cursor-pointer transition-all duration-300"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05, duration: 0.3 }}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-lg ${
                        idx === 0 ? 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/50' :
                        idx === 1 ? 'bg-gradient-to-br from-slate-500 to-slate-600 shadow-slate-500/50' :
                        idx === 2 ? 'bg-gradient-to-br from-orange-500 to-red-500 shadow-orange-500/50' :
                        'bg-slate-700'
                      }`}>
                        {idx < 3 ? (
                          <Trophy className="w-5 h-5" />
                        ) : (
                          idx + 1
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-white">
                          {getStudentName(progress.student_email)}
                        </h4>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-sm text-slate-400">{progress.quizzes_completed || 0} quizzes</span>
                          <span className="text-sm text-slate-400">{progress.total_questions_answered || 0} answered</span>
                          {progress.current_streak > 0 && (
                            <span className="text-sm text-orange-400">🔥 {progress.current_streak} days</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-white">{progress.accuracy_percent || 0}%</p>
                        <p className="text-xs text-slate-500">Accuracy</p>
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </GlassCard>
            ) : (
              <GlassCard className="p-8 text-center">
                <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="font-semibold text-white mb-2">No students yet</h3>
                <p className="text-slate-400 text-sm">
                  Share the join code <span className="font-mono font-bold">{classObj.join_code}</span> with your students
                </p>
              </GlassCard>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Common Weak Areas */}
            <GlassCard className="p-6">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                Weak Areas
              </h3>
              {commonWeakAreas.length > 0 ? (
                <div className="space-y-3">
                  {commonWeakAreas.map(({ topic, count }) => (
                    <div key={topic.id} className="bg-amber-500/10 rounded-lg p-3 border border-amber-500/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-amber-300">{topic.name}</span>
                        <span className="text-sm text-amber-400">{count}</span>
                      </div>
                      <Progress 
                        value={(count / allProgress.length) * 100} 
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">
                  No weak areas yet
                </p>
              )}
            </GlassCard>

            {/* Quick Actions */}
            <GlassCard className="p-6">
              <h3 className="font-semibold mb-4 text-white">Quick Actions</h3>
              <div className="space-y-3">
                <Link to={createPageUrl('CreateAssignment')} className="block">
                  <Button className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 shadow-lg shadow-purple-500/30">
                    Create Assignment
                  </Button>
                </Link>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}