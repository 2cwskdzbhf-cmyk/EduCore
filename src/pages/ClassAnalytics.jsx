import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ChevronLeft, BarChart3, Users, Target, TrendingUp, BookOpen, Trophy } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function ClassAnalytics() {
  const urlParams = new URLSearchParams(window.location.search);
  const classId = urlParams.get('classId');

  const { data: classData } = useQuery({
    queryKey: ['class', classId],
    queryFn: async () => {
      const r = await base44.entities.Class.filter({ id: classId });
      return r[0] || null;
    },
    enabled: !!classId
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments', classId],
    queryFn: () => base44.entities.Assignment.filter({ class_id: classId }, '-created_date'),
    enabled: !!classId
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['allSubmissions', classId],
    queryFn: () => base44.entities.AssignmentSubmission.filter({ class_id: classId }),
    enabled: !!classId
  });

  const { data: allProgress = [] } = useQuery({
    queryKey: ['classProgress', classId],
    queryFn: async () => {
      if (!classData?.student_emails?.length) return [];
      const all = await base44.entities.StudentProgress.list();
      return all.filter(p => classData.student_emails.includes(p.student_email));
    },
    enabled: !!classData?.student_emails?.length
  });

  // Assignment completion data
  const assignmentData = assignments.slice(0, 8).map(a => {
    const subs = submissions.filter(s => s.assignment_id === a.id);
    const completed = subs.filter(s => ['submitted', 'graded'].includes(s.status)).length;
    const total = classData?.student_emails?.length || 1;
    const avgAcc = subs.length > 0
      ? Math.round(subs.reduce((sum, s) => sum + (s.accuracy_percent || 0), 0) / subs.length)
      : 0;
    return {
      name: a.title.length > 12 ? a.title.slice(0, 12) + '…' : a.title,
      completion: Math.round((completed / total) * 100),
      accuracy: avgAcc,
    };
  }).reverse();

  // Student accuracy distribution
  const accuracyBuckets = [
    { range: '0-20%', count: 0 },
    { range: '21-40%', count: 0 },
    { range: '41-60%', count: 0 },
    { range: '61-80%', count: 0 },
    { range: '81-100%', count: 0 },
  ];
  allProgress.forEach(p => {
    const acc = p.accuracy_percent || 0;
    if (acc <= 20) accuracyBuckets[0].count++;
    else if (acc <= 40) accuracyBuckets[1].count++;
    else if (acc <= 60) accuracyBuckets[2].count++;
    else if (acc <= 80) accuracyBuckets[3].count++;
    else accuracyBuckets[4].count++;
  });

  // Top students
  const topStudents = [...allProgress]
    .sort((a, b) => (b.accuracy_percent || 0) - (a.accuracy_percent || 0))
    .slice(0, 5);

  const avgClassAccuracy = allProgress.length > 0
    ? Math.round(allProgress.reduce((s, p) => s + (p.accuracy_percent || 0), 0) / allProgress.length)
    : 0;

  const totalQuestionsAnswered = allProgress.reduce((s, p) => s + (p.total_questions_answered || 0), 0);
  const totalSubmissions = submissions.length;
  const completedSubmissions = submissions.filter(s => ['submitted', 'graded'].includes(s.status)).length;

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm">
        <p className="text-white font-semibold mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>{p.name}: {p.value}{p.name.includes('%') || p.name === 'accuracy' || p.name === 'completion' ? '%' : ''}</p>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Link to={createPageUrl(`TeacherClassDetail?id=${classId}`)}
            className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-4 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back to Class
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Class Analytics</h1>
              <p className="text-slate-400 text-sm">{classData?.name || 'Loading…'}</p>
            </div>
          </div>
        </motion.div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Avg Accuracy', value: `${avgClassAccuracy}%`, icon: Target, color: 'from-emerald-500 to-teal-500' },
            { label: 'Students', value: classData?.student_emails?.length || 0, icon: Users, color: 'from-blue-500 to-cyan-500' },
            { label: 'Submissions', value: totalSubmissions, icon: BookOpen, color: 'from-purple-500 to-violet-500' },
            { label: 'Qs Answered', value: totalQuestionsAnswered, icon: TrendingUp, color: 'from-amber-500 to-orange-500' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <GlassCard className="p-5">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-3`}>
                  <s.icon className="w-4 h-4 text-white" />
                </div>
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-slate-400 text-xs">{s.label}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Assignment completion & accuracy */}
          <GlassCard className="p-5">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-400" /> Assignment Performance
            </h3>
            {assignmentData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={assignmentData} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="completion" name="completion" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="accuracy" name="accuracy" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-slate-500">No assignment data yet</div>
            )}
            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-blue-500" /><span className="text-slate-400 text-xs">Completion %</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-purple-500" /><span className="text-slate-400 text-xs">Avg Accuracy %</span></div>
            </div>
          </GlassCard>

          {/* Accuracy distribution */}
          <GlassCard className="p-5">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-400" /> Accuracy Distribution
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={accuracyBuckets} barSize={30}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="range" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="students" radius={[4, 4, 0, 0]}>
                  {accuracyBuckets.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        </div>

        {/* Top students */}
        <GlassCard className="p-5">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" /> Top Students
          </h3>
          {topStudents.length > 0 ? (
            <div className="space-y-3">
              {topStudents.map((p, i) => (
                <motion.div key={p.student_email}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3"
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${
                    i === 0 ? 'bg-amber-500 text-white' : i === 1 ? 'bg-slate-300 text-slate-800' : i === 2 ? 'bg-amber-700 text-white' : 'bg-white/10 text-slate-400'
                  }`}>
                    {i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {p.student_email?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{p.student_email?.split('@')[0]}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500"
                          style={{ width: `${p.accuracy_percent || 0}%` }}
                        />
                      </div>
                      <span className="text-slate-400 text-xs flex-shrink-0">{Math.round(p.accuracy_percent || 0)}%</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-white text-xs font-bold">{p.total_questions_answered || 0} Qs</p>
                    <p className="text-slate-500 text-xs">{p.quizzes_completed || 0} quizzes</p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm text-center py-6">No student progress data yet</p>
          )}
        </GlassCard>
      </div>
    </div>
  );
}