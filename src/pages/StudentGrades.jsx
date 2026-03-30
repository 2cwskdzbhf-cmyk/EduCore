import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import GlassCard from '@/components/ui/GlassCard';
import { ChevronLeft, Award, Clock, AlertCircle, CheckCircle2, Star, MessageSquare, TrendingUp } from 'lucide-react';

const STATUS_CONFIG = {
  submitted:  { label: 'Submitted',  color: 'bg-blue-500/20 text-blue-300',    icon: CheckCircle2 },
  late:       { label: 'Late',       color: 'bg-amber-500/20 text-amber-300',   icon: Clock },
  missing:    { label: 'Missing',    color: 'bg-red-500/20 text-red-300',       icon: AlertCircle },
  graded:     { label: 'Graded',     color: 'bg-emerald-500/20 text-emerald-300', icon: Star },
};

function getLetterColor(val) {
  const n = parseFloat(val);
  if (!isNaN(n)) return n >= 80 ? 'text-emerald-400' : n >= 60 ? 'text-amber-400' : 'text-red-400';
  if (['A+','A','A-'].includes(val)) return 'text-emerald-400';
  if (['B+','B','B-'].includes(val)) return 'text-blue-400';
  return 'text-amber-400';
}

export default function StudentGrades() {
  const [user, setUser] = useState(null);
  useEffect(() => { base44.auth.me().then(setUser); }, []);

  const { data: grades = [] } = useQuery({
    queryKey: ['myGrades', user?.email],
    queryFn: () => base44.entities.Grade.filter({ student_email: user.email }, '-graded_at'),
    enabled: !!user?.email,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['allAssignmentsForGrades'],
    queryFn: () => base44.entities.Assignment.list('-created_date', 100),
    enabled: !!user?.email,
  });

  const gradedCount = grades.filter(g => g.grade_value).length;
  const avg = gradedCount > 0
    ? Math.round(grades.filter(g => !isNaN(parseFloat(g.grade_value))).reduce((s, g) => s + parseFloat(g.grade_value), 0) / grades.filter(g => !isNaN(parseFloat(g.grade_value))).length)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <Link to={createPageUrl('StudentDashboard')} className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
            <ChevronLeft className="w-5 h-5" /> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">My Grades</h1>
          <p className="text-slate-400 mb-8">All your assignment grades and teacher feedback</p>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <GlassCard className="p-4 text-center">
              <p className="text-3xl font-bold text-white">{grades.length}</p>
              <p className="text-slate-400 text-sm mt-1">Total Grades</p>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <p className={`text-3xl font-bold ${avg != null ? getLetterColor(avg) : 'text-slate-400'}`}>{avg != null ? `${avg}%` : '—'}</p>
              <p className="text-slate-400 text-sm mt-1">Average Grade</p>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <p className="text-3xl font-bold text-amber-400">{grades.filter(g => g.submission_status === 'late').length}</p>
              <p className="text-slate-400 text-sm mt-1">Late Submissions</p>
            </GlassCard>
          </div>

          {/* Grades List */}
          <div className="space-y-4">
            {grades.map((grade, idx) => {
              const assignment = assignments.find(a => a.id === grade.assignment_id);
              const sc = STATUS_CONFIG[grade.submission_status] || STATUS_CONFIG.submitted;
              const StatusIcon = sc.icon;
              return (
                <motion.div key={grade.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}>
                  <GlassCard className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-white text-lg">{assignment?.title || 'Assignment'}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Graded: {grade.graded_at ? new Date(grade.graded_at).toLocaleDateString() : '—'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        {grade.grade_value && (
                          <span className={`text-3xl font-bold ${getLetterColor(grade.grade_value)}`}>
                            {grade.grade_value}{grade.grade_type === 'percentage' ? '%' : ''}
                          </span>
                        )}
                        <span className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full ${sc.color}`}>
                          <StatusIcon className="w-3 h-3" /> {sc.label}
                        </span>
                      </div>
                    </div>
                    {grade.written_feedback && (
                      <div className="mt-3 p-3 rounded-lg bg-white/5 border border-white/10">
                        <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                          <MessageSquare className="w-3 h-3" /> Teacher Feedback
                        </div>
                        <p className="text-slate-200 text-sm leading-relaxed">{grade.written_feedback}</p>
                      </div>
                    )}
                  </GlassCard>
                </motion.div>
              );
            })}
            {grades.length === 0 && (
              <GlassCard className="p-12 text-center">
                <Award className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No grades yet</p>
                <p className="text-slate-500 text-sm mt-1">Grades will appear here once your teacher marks your work</p>
              </GlassCard>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}