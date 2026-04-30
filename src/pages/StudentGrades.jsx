import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import GlassCard from '@/components/ui/GlassCard';
import {
  ChevronLeft, Award, TrendingUp, TrendingDown, Minus,
  ChevronDown, ChevronUp, BarChart3, Star, Target, Zap
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const SUBJECT_COLORS = {
  Maths: 'from-blue-500 to-blue-600',
  English: 'from-red-500 to-red-600',
  Science: 'from-green-500 to-green-600',
  Geography: 'from-amber-500 to-amber-600',
  History: 'from-purple-500 to-purple-600',
  Spanish: 'from-pink-500 to-pink-600',
  'Computer Science': 'from-cyan-500 to-cyan-600',
  Other: 'from-slate-500 to-slate-600',
};

function scoreColor(pct) {
  if (pct >= 70) return 'text-emerald-400';
  if (pct >= 50) return 'text-amber-400';
  return 'text-red-400';
}

function scoreBg(pct) {
  if (pct >= 70) return 'bg-emerald-500';
  if (pct >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

function predictNext(scores) {
  // Weighted average: more recent = more weight
  if (!scores.length) return null;
  if (scores.length === 1) return Math.round(scores[0]);
  const weights = scores.map((_, i) => i + 1);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const weighted = scores.reduce((sum, s, i) => sum + s * weights[i], 0);
  return Math.round(weighted / weightSum);
}

function improvementLabel(scores) {
  if (scores.length < 2) return null;
  const diff = Math.round(scores[scores.length - 1] - scores[scores.length - 2]);
  if (diff > 0) return { text: `+${diff}% from last test`, color: 'text-emerald-400', icon: TrendingUp };
  if (diff < 0) return { text: `${diff}% from last test`, color: 'text-red-400', icon: TrendingDown };
  return { text: 'No change from last test', color: 'text-slate-400', icon: Minus };
}

function SubjectCard({ subject, tests }) {
  const [expanded, setExpanded] = useState(false);

  const percentages = tests
    .filter(t => t.percentage != null)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(t => t.percentage);

  const avg = percentages.length ? Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length) : null;
  const highest = percentages.length ? Math.round(Math.max(...percentages)) : null;
  const lowest = percentages.length ? Math.round(Math.min(...percentages)) : null;
  const predicted = predictNext(percentages);
  const improvement = improvementLabel(percentages);

  const chartData = tests
    .filter(t => t.percentage != null)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(t => ({ name: new Date(t.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), score: t.percentage }));

  const gradientClass = SUBJECT_COLORS[subject] || SUBJECT_COLORS.Other;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <GlassCard className="overflow-hidden">
        {/* Subject Header */}
        <div className={`bg-gradient-to-r ${gradientClass} p-4 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <span className="text-white font-black text-sm">{subject.split(' ').map(w => w[0]).join('')}</span>
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">{subject}</h3>
              <p className="text-white/70 text-xs">{tests.length} test{tests.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          {avg != null && (
            <div className="text-right">
              <p className="text-white/70 text-xs">Average</p>
              <p className="text-white font-black text-2xl">{avg}%</p>
            </div>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 divide-x divide-white/10 border-b border-white/10">
          <div className="p-3 text-center">
            <p className="text-xs text-slate-400">Highest</p>
            <p className={`font-bold text-lg ${highest != null ? scoreColor(highest) : 'text-slate-400'}`}>{highest != null ? `${highest}%` : '—'}</p>
          </div>
          <div className="p-3 text-center">
            <p className="text-xs text-slate-400">Lowest</p>
            <p className={`font-bold text-lg ${lowest != null ? scoreColor(lowest) : 'text-slate-400'}`}>{lowest != null ? `${lowest}%` : '—'}</p>
          </div>
          <div className="p-3 text-center">
            <p className="text-xs text-slate-400">Predicted</p>
            <p className={`font-bold text-lg ${predicted != null ? scoreColor(predicted) : 'text-slate-400'}`}>{predicted != null ? `${predicted}%` : '—'}</p>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {/* Progress bar */}
          {avg != null && (
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Class average performance</span>
                <span>{avg}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${scoreBg(avg)}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, avg)}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </div>
          )}

          {/* Improvement indicator */}
          {improvement && (
            <div className={`flex items-center gap-1.5 text-xs font-medium ${improvement.color}`}>
              <improvement.icon className="w-3.5 h-3.5" />
              {improvement.text}
            </div>
          )}

          {/* Mini trend chart */}
          {chartData.length >= 2 && (
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} width={28} />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#94a3b8' }}
                    formatter={(v) => [`${v}%`, 'Score']}
                  />
                  <Line type="monotone" dataKey="score" stroke="#a78bfa" strokeWidth={2} dot={{ fill: '#a78bfa', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Expand test list */}
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-full flex items-center justify-between text-sm text-slate-400 hover:text-white transition-colors pt-1 border-t border-white/10"
          >
            <span>Test history</span>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 overflow-hidden"
              >
                {[...tests].sort((a, b) => new Date(b.date) - new Date(a.date)).map(test => (
                  <div key={test.id} className="flex items-center justify-between p-2.5 rounded-lg bg-white/5">
                    <div>
                      <p className="text-white text-sm font-medium">{test.test_name}</p>
                      <p className="text-slate-500 text-xs">{new Date(test.date).toLocaleDateString('en-GB')}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-sm ${scoreColor(test.percentage)}`}>{test.percentage}%</p>
                      <p className="text-slate-500 text-xs">{test.score}/{test.total_marks}</p>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </GlassCard>
    </motion.div>
  );
}

export default function StudentGrades() {
  const [user, setUser] = useState(null);
  useEffect(() => { base44.auth.me().then(setUser); }, []);

  const { data: testScores = [], isLoading } = useQuery({
    queryKey: ['testScores', user?.email],
    queryFn: () => base44.entities.TestScore.filter({ student_email: user.email }, '-date'),
    enabled: !!user?.email,
  });

  const { data: quizAttempts = [] } = useQuery({
    queryKey: ['quizAttemptsForGrades', user?.email],
    queryFn: () => base44.entities.QuizAttempt.filter({ student_email: user.email }, '-completed_at', 100),
    enabled: !!user?.email,
  });

  // Build unified per-subject data from TestScores
  const subjectGroups = useMemo(() => {
    const groups = {};
    testScores.forEach(t => {
      const subj = t.subject || 'Other';
      if (!groups[subj]) groups[subj] = [];
      groups[subj].push(t);
    });
    return groups;
  }, [testScores]);

  const allPercentages = testScores.filter(t => t.percentage != null).map(t => t.percentage);
  const overallAvg = allPercentages.length
    ? Math.round(allPercentages.reduce((a, b) => a + b, 0) / allPercentages.length)
    : null;

  const subjectAvgs = Object.entries(subjectGroups).map(([subj, tests]) => {
    const pcts = tests.filter(t => t.percentage != null).map(t => t.percentage);
    return { subject: subj, avg: pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : 0 };
  });
  const strongest = subjectAvgs.length ? subjectAvgs.reduce((a, b) => a.avg > b.avg ? a : b) : null;
  const weakest = subjectAvgs.length ? subjectAvgs.reduce((a, b) => a.avg < b.avg ? a : b) : null;

  // Rank subjects by avg
  const rankedSubjects = [...subjectAvgs].sort((a, b) => b.avg - a.avg);

  if (!user || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <Link to={createPageUrl('StudentDashboard')} className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
            <ChevronLeft className="w-5 h-5" /> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-white mb-1">My Grades</h1>
          <p className="text-slate-400 mb-8">Track your performance across all subjects</p>

          {/* Overall Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <GlassCard className="p-4 text-center">
              <BarChart3 className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <p className={`text-3xl font-bold ${overallAvg != null ? scoreColor(overallAvg) : 'text-slate-400'}`}>
                {overallAvg != null ? `${overallAvg}%` : '—'}
              </p>
              <p className="text-slate-400 text-xs mt-1">Overall Average</p>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <Award className="w-6 h-6 text-amber-400 mx-auto mb-2" />
              <p className="text-3xl font-bold text-white">{testScores.length}</p>
              <p className="text-slate-400 text-xs mt-1">Tests Recorded</p>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <Star className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
              <p className="text-lg font-bold text-emerald-400 truncate">{strongest?.subject || '—'}</p>
              <p className="text-slate-400 text-xs mt-1">Strongest Subject</p>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <Target className="w-6 h-6 text-red-400 mx-auto mb-2" />
              <p className="text-lg font-bold text-red-400 truncate">{weakest?.subject && weakest.subject !== strongest?.subject ? weakest.subject : '—'}</p>
              <p className="text-slate-400 text-xs mt-1">Needs Improvement</p>
            </GlassCard>
          </div>

          {/* Subject Ranking */}
          {rankedSubjects.length > 1 && (
            <GlassCard className="p-5 mb-8">
              <h2 className="text-white font-bold mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" /> Subject Ranking
              </h2>
              <div className="space-y-2">
                {rankedSubjects.map((s, i) => (
                  <div key={s.subject} className="flex items-center gap-3">
                    <span className="text-slate-400 text-sm w-5 text-right">{i + 1}.</span>
                    <span className="text-white text-sm w-32 truncate">{s.subject}</span>
                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${scoreBg(s.avg)}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, s.avg)}%` }}
                        transition={{ duration: 0.6, delay: i * 0.05 }}
                      />
                    </div>
                    <span className={`text-sm font-bold w-12 text-right ${scoreColor(s.avg)}`}>{Math.round(s.avg)}%</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Subject Cards */}
          {Object.keys(subjectGroups).length === 0 ? (
            <GlassCard className="p-12 text-center">
              <TrendingUp className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 mb-2">No test scores yet</p>
              <p className="text-slate-500 text-sm">Go to Test Scores to add your results, or complete assignments to see grades here.</p>
              <Link to={createPageUrl('TestScores')} className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors text-sm font-medium">
                Add Test Scores
              </Link>
            </GlassCard>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {Object.entries(subjectGroups).map(([subject, tests]) => (
                <SubjectCard key={subject} subject={subject} tests={tests} />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}