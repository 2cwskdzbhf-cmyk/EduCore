import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, PieChart, Pie, Cell } from 'recharts';
import { BarChart2, Target, Brain, TrendingUp, TrendingDown } from 'lucide-react';

const COLORS = ['#8b5cf6','#3b82f6','#10b981','#f59e0b','#ef4444','#ec4899'];

const DIFFICULTY_SCORE = { easy: 100, medium: 60, hard: 30, again: 0 };

function StatCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
      <Icon className={`w-4 h-4 mb-2 ${color}`} />
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-600 mt-1">{sub}</p>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs">
      <p className="text-slate-300 font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' ? p.value.toFixed(0) : p.value}</p>
      ))}
    </div>
  );
};

export default function NotebookInsights({ user }) {
  const [selectedNotebook, setSelectedNotebook] = useState('');

  const { data: notebooks = [] } = useQuery({
    queryKey: ['insightsNotebooks', user?.email],
    queryFn: () => base44.entities.RevisionNotebook.filter({ student_email: user.email }),
    enabled: !!user?.email,
  });

  const { data: flashcards = [] } = useQuery({
    queryKey: ['insightsFlashcards', user?.email],
    queryFn: () => base44.entities.RevisionFlashcard.filter({ student_email: user.email }),
    enabled: !!user?.email,
  });

  const { data: resources = [] } = useQuery({
    queryKey: ['insightsResources', user?.email],
    queryFn: () => base44.entities.NotebookResource.filter({ student_email: user.email }),
    enabled: !!user?.email,
  });

  const filteredCards = useMemo(() =>
    selectedNotebook ? flashcards.filter(f => f.notebook_id === selectedNotebook) : flashcards,
    [flashcards, selectedNotebook]
  );

  const filteredResources = useMemo(() =>
    selectedNotebook ? resources.filter(r => r.notebook_id === selectedNotebook) : resources,
    [resources, selectedNotebook]
  );

  // Accuracy per notebook
  const notebookAccuracy = useMemo(() =>
    notebooks.map(nb => {
      const cards = flashcards.filter(f => f.notebook_id === nb.id && f.review_count > 0);
      const avg = cards.length
        ? Math.round(cards.reduce((s, c) => s + (DIFFICULTY_SCORE[c.difficulty_rating] ?? 50), 0) / cards.length)
        : 0;
      return { name: nb.name.slice(0, 16), accuracy: avg, cards: cards.length };
    }).filter(n => n.cards > 0),
    [notebooks, flashcards]
  );

  // Difficulty distribution pie
  const diffPie = useMemo(() => {
    const counts = { easy: 0, medium: 0, hard: 0, again: 0 };
    filteredCards.forEach(fc => { if (fc.difficulty_rating) counts[fc.difficulty_rating]++; });
    return Object.entries(counts).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  }, [filteredCards]);

  // Resource types bar
  const resourceBar = useMemo(() => {
    const counts = {};
    filteredResources.forEach(r => { counts[r.resource_type] = (counts[r.resource_type] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name: name.replace('_', ' '), value }));
  }, [filteredResources]);

  // Most / least reviewed
  const sorted = [...filteredCards].filter(f => f.review_count > 0).sort((a, b) => b.review_count - a.review_count);
  const mostReviewed = sorted.slice(0, 5);
  const leastReviewed = [...filteredCards].filter(f => f.review_count > 0).sort((a, b) => a.review_count - b.review_count).slice(0, 5);

  // Overall stats
  const reviewedCards = filteredCards.filter(f => f.review_count > 0);
  const avgAccuracy = reviewedCards.length
    ? Math.round(reviewedCards.reduce((s, c) => s + (DIFFICULTY_SCORE[c.difficulty_rating] ?? 50), 0) / reviewedCards.length)
    : 0;

  const easyCount = filteredCards.filter(f => f.difficulty_rating === 'easy').length;
  const hardCount = filteredCards.filter(f => f.difficulty_rating === 'hard' || f.difficulty_rating === 'again').length;

  return (
    <div className="space-y-6">
      {/* Notebook filter */}
      <select
        value={selectedNotebook}
        onChange={e => setSelectedNotebook(e.target.value)}
        className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50"
      >
        <option value="">All notebooks</option>
        {notebooks.map(nb => <option key={nb.id} value={nb.id}>{nb.icon || '📚'} {nb.name}</option>)}
      </select>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Flashcards" value={filteredCards.length} icon={Brain} color="text-violet-400" />
        <StatCard label="Avg Accuracy" value={`${avgAccuracy}%`} icon={Target} color="text-blue-400" />
        <StatCard label="Strongest" value={easyCount} icon={TrendingUp} color="text-emerald-400" sub="marked easy" />
        <StatCard label="Weakest" value={hardCount} icon={TrendingDown} color="text-red-400" sub="hard or again" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Accuracy by notebook */}
        {notebookAccuracy.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-violet-400" />Accuracy by Notebook
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={notebookAccuracy} barSize={20}>
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="accuracy" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Accuracy %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Difficulty distribution pie */}
        {diffPie.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-400" />Difficulty Distribution
            </p>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="60%" height={160}>
                <PieChart>
                  <Pie data={diffPie} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                    {diffPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {diffPie.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-slate-400 capitalize">{d.name}</span>
                    <span className="text-white font-semibold ml-auto">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Most reviewed */}
        {mostReviewed.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />Most Revised Cards
            </p>
            <div className="space-y-2">
              {mostReviewed.map(fc => (
                <div key={fc.id} className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 truncate flex-1">{fc.front}</span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <div className="h-1.5 w-20 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, fc.review_count * 10)}%` }} />
                    </div>
                    <span className="text-xs text-slate-500 w-8 text-right">{fc.review_count}×</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resource types */}
        {resourceBar.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-amber-400" />Resources Generated
            </p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={resourceBar} barSize={16} layout="vertical">
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {filteredCards.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <Brain className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No flashcard data yet. Start studying to see insights!</p>
        </div>
      )}
    </div>
  );
}