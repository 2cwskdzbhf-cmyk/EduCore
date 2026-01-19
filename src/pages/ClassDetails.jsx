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
      <div className="min-h-screen bg-slate-50 p-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!classObj) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-4">Class not found</h1>
          <Link to={createPageUrl('TeacherDashboard')}>
            <Button>Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const avgXp = allProgress.length > 0 
    ? Math.round(allProgress.reduce((sum, p) => sum + (p.total_xp || 0), 0) / allProgress.length)
    : 0;

  const sortedStudents = [...allProgress].sort((a, b) => (b.total_xp || 0) - (a.total_xp || 0));
  const commonWeakAreas = getCommonWeakAreas();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        <Link to={createPageUrl('TeacherDashboard')} className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6">
          <ChevronLeft className="w-5 h-5" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <motion.div
          className="bg-white rounded-2xl border border-slate-100 p-8 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">{classObj.name}</h1>
              <p className="text-slate-500">{subject?.name || 'No subject assigned'}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-slate-100 rounded-xl px-4 py-3">
                <p className="text-sm text-slate-500 mb-1">Join Code</p>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xl font-bold text-slate-800">{classObj.join_code}</span>
                  <button onClick={copyJoinCode} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                    {copiedCode ? (
                      <Check className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <Copy className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <Users className="w-4 h-4" />
                <span className="text-sm">Students</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">{classObj.student_emails?.length || 0}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <Zap className="w-4 h-4" />
                <span className="text-sm">Avg XP</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">{avgXp}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-emerald-600 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">Top Performer</span>
              </div>
              <p className="text-lg font-bold text-emerald-700 truncate">
                {sortedStudents[0] ? getStudentName(sortedStudents[0].student_email) : '-'}
              </p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-amber-600 mb-1">
                <TrendingDown className="w-4 h-4" />
                <span className="text-sm">Needs Support</span>
              </div>
              <p className="text-lg font-bold text-amber-700 truncate">
                {sortedStudents.length > 0 ? getStudentName(sortedStudents[sortedStudents.length - 1].student_email) : '-'}
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Students List */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Students</h2>
            
            {classObj.student_emails?.length > 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-100">
                {sortedStudents.map((progress, idx) => (
                  <motion.div
                    key={progress.id}
                    className="p-4 flex items-center gap-4"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white ${
                      idx === 0 ? 'bg-amber-500' :
                      idx === 1 ? 'bg-slate-400' :
                      idx === 2 ? 'bg-orange-400' :
                      'bg-slate-300'
                    }`}>
                      {idx < 3 ? (
                        <Trophy className="w-5 h-5" />
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-800">
                        {getStudentName(progress.student_email)}
                      </h4>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm text-slate-500">Level {progress.level || 1}</span>
                        <span className="text-sm text-slate-500">{progress.total_xp || 0} XP</span>
                        {progress.current_streak > 0 && (
                          <span className="text-sm text-orange-500">🔥 {progress.current_streak} day streak</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm text-emerald-600">
                        <Award className="w-4 h-4" />
                        {progress.badges?.length || 0} badges
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="font-semibold text-slate-700 mb-2">No students yet</h3>
                <p className="text-slate-500 text-sm">
                  Share the join code <span className="font-mono font-bold">{classObj.join_code}</span> with your students
                </p>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Common Weak Areas */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Common Weak Areas
              </h3>
              {commonWeakAreas.length > 0 ? (
                <div className="space-y-3">
                  {commonWeakAreas.map(({ topic, count }) => (
                    <div key={topic.id} className="bg-amber-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-amber-800">{topic.name}</span>
                        <span className="text-sm text-amber-600">{count} students</span>
                      </div>
                      <Progress 
                        value={(count / allProgress.length) * 100} 
                        className="h-2 bg-amber-100"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">
                  No weak areas identified yet
                </p>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
              <h3 className="font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link to={createPageUrl('CreateAssignment')} className="block">
                  <Button className="w-full bg-white/20 hover:bg-white/30 text-white border-0">
                    Create Assignment
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}