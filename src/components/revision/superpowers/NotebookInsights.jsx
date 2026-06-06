import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, LineChart, Line } from 'recharts';
import { BarChart2, Target, TrendingUp, TrendingDown, BookOpen, Brain } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-xs text-white shadow-xl">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' && p.value % 1 !== 0 ? p.value.toFixed(1) : p.value}{p.name.includes('%') || p.name.includes('Acc') ? '%' : ''}</p>
      ))}
    </div>
  );
};

export default function NotebookInsights({ user }) {
  const [selectedNotebook, setSelectedNotebook] = useState('all');

  const { data: notebooks = [] } = useQuery({
    queryKey: ['revisionNotebooks', user?.email],
    queryFn: () => base44.entities.RevisionNotebook.filter({ student_email: user.email }),
    enabled: !!user?.email,
  });

  const { data: allFlashcards = [] } = useQuery({
    queryKey: ['allFlashcards', user?.email],
    queryFn: () => base44.entities.RevisionFlashcard.filter({ student_email: user.email }),
    enabled: !!user?.email,
  });

  const { data: resources = [] } = useQuery({
    queryKey: ['allResources', user?.email],
    queryFn: () => base44.entities.NotebookResource.filter({ student_email: user.email }),
    enabled: !!user?.email,
  });

  const flashcards = useMemo(() => {
    if (selectedNotebook === 'all') return allFlashcards;
    return allFlashcards.filter(f => f.notebook_id === selectedNotebook);
  }, [allFlashcards, selectedNotebook]);

  // Per-notebook stats for bar charts
  const notebookStats = useMemo(() => {
    return notebooks.map(nb => {
      const cards = allFlashcards.filter(f => f.notebook_id === nb.id);
      const reviewed = cards.filter(f => f.review_count > 0);
      const easy = cards.filter(f => f.difficulty_rating === 'easy').length;
      const hard = cards.filter(f => f.difficulty_rating === 'hard' || f.difficulty_rating === 'again').length;
      const acc = reviewed.length > 0 ? Math.round((easy / reviewed.length) * 100) : 0;
      const nbResources = resources.filter(r => r.notebook_id === nb.id);
      const quizResources = nbResources.filter(r => r.resource_type === 'quiz');
      return {
        name: nb.name.length > 14 ? nb.name.slice(0, 14) + '…' : nb.name,
        fullName: nb.name,
        totalCards: cards.length,
        reviewed: reviewed.length,
        accuracy: acc,
        resources: nbResources.length,
        quizzes: quizResources.length,
        hard,
        easy,
      };
    });
  }, [notebooks, allFlashcards, resources]);

  // Difficulty breakdown for selected notebook
  const diffStats = useMemo(() => {
    const counts = { again: 0, hard: 0, medium: 0, easy: 0 };
    flashcards.forEach(f => { if (f.difficulty_rating) counts[f.difficulty_rating]++; });
    return [
      { name: 'Easy', value: counts.easy, fill: '#22c55e' },
      { name: 'Medium', value: counts.medium, fill: '#f59e0b' },
      { name: 'Hard', value: counts.hard, fill: '#f97316' },
      { name: 'Again', value: counts.again, fill: '#ef4444' },
    ];
  }, [flashcards]);

  // Radar data — notebook performance
  const radarData = useMemo(() => {
    return notebookStats.slice(0, 6).map(nb => ({
      subject: nb.name,
      Accuracy: nb.accuracy,
      Coverage: nb.totalCards > 0 ? Math.min(100, Math.round((nb.reviewed / nb.totalCards) * 100)) : 0,
    }));
  }, [notebookStats]);

  // Strongest / weakest
  const sorted = [...notebookStats].sort((a, b) => b.accuracy - a.accuracy);
  const strongest = sorted.slice(0, 3);
  const weakest = [...sorted].reverse().slice(0, 3);
  const mostRevised = [...notebookStats].sort((a, b) => b.reviewed - a.reviewed).slice(0, 3);
  const leastRevised = [...notebookStats].sort((a, b) => a.reviewed - b.reviewed).slice(0, 3);

  const overallAccuracy = flashcards.length > 0
    ? Math.round((flashcards.filter(f => f.difficulty_rating === 'easy').length / flashcards.filter(f => f.review_count > 0).length) * 100) || 0
    : 0;

  const totalReviewed = flashcards.filter(f => f.review_count > 0).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
          <BarChart2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Notebook Insights</h2>
          <p className="text-slate-400 text-sm">Visualise your strengths, weaknesses, and progress</p>
        </div>
      </div>

      {/* Notebook filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedNotebook('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedNotebook === 'all' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'text-slate-400 hover:text-white bg-white/5 border border-white/10'}`}
        >
          All Notebooks
        </button>
        {notebooks.map(nb => (
          <button key={nb.id} onClick={() => setSelectedNotebook(nb.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedNotebook === nb.id ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'text-slate-400 hover:text-white bg-white/5 border border-white/10'}`}
          >
            {nb.icon} {nb.name}
          </button>
        ))}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Flashcards', value: flashcards.length, icon: BookOpen, color: 'from-violet-500 to-purple-600' },
          { label: 'Cards Reviewed', value: totalReviewed, icon: Brain, color: 'from-blue-500 to-cyan-500' },
          { label: 'Flashcard Accuracy', value: `${overallAccuracy}%`, icon: Target, color: 'from-green-500 to-emerald-500' },
          { label: 'Notebooks', value: notebooks.length, icon: BarChart2, color: 'from-orange-500 to-amber-500' },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-2`}>
              <stat.icon className="w-4 h-4 text-white" />
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-slate-400 text-xs">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Accuracy per notebook */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4 text-sm">Flashcard Accuracy by Notebook</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={notebookStats} margin={{ left: -20, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="accuracy" name="Acc %" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Difficulty breakdown */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4 text-sm">Difficulty Breakdown</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={diffStats} margin={{ left: -20, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Cards" radius={[4, 4, 0, 0]}>
                {diffStats.map((entry, index) => (
                  <rect key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Radar */}
        {radarData.length >= 3 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4 text-sm">Accuracy vs Coverage (Radar)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Radar name="Accuracy" dataKey="Accuracy" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                <Radar name="Coverage" dataKey="Coverage" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.2} />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Reviews per notebook */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4 text-sm">Cards Reviewed by Notebook</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={notebookStats} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} width={90} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="reviewed" name="Reviewed" fill="#06b6d4" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Strongest / Weakest / Most / Least */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { title: 'Strongest Topics', icon: TrendingUp, color: 'text-green-400', data: strongest, key: 'accuracy', suffix: '%' },
          { title: 'Weakest Topics', icon: TrendingDown, color: 'text-red-400', data: weakest, key: 'accuracy', suffix: '%' },
          { title: 'Most Revised', icon: BookOpen, color: 'text-blue-400', data: mostRevised, key: 'reviewed', suffix: ' cards' },
          { title: 'Least Revised', icon: BookOpen, color: 'text-orange-400', data: leastRevised, key: 'reviewed', suffix: ' cards' },
        ].map((section, i) => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <h3 className={`text-sm font-semibold mb-3 flex items-center gap-1.5 ${section.color}`}>
              <section.icon className="w-4 h-4" /> {section.title}
            </h3>
            <div className="space-y-2">
              {section.data.length === 0 ? (
                <p className="text-slate-500 text-xs">No data yet</p>
              ) : section.data.map((nb, j) => (
                <div key={j} className="flex items-center justify-between gap-2">
                  <span className="text-slate-300 text-xs truncate">{nb.name}</span>
                  <span className={`text-xs font-bold flex-shrink-0 ${section.color}`}>{nb[section.key]}{section.suffix}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}