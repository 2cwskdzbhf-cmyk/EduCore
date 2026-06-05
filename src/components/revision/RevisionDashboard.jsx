import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { BookOpen, Zap, Clock, TrendingUp, Plus, ChevronRight, Star } from 'lucide-react';

const COLOR_MAP = {
  purple: 'from-violet-600 to-purple-700',
  blue: 'from-blue-600 to-cyan-700',
  emerald: 'from-emerald-600 to-teal-700',
  rose: 'from-rose-600 to-pink-700',
  amber: 'from-amber-500 to-orange-600',
  slate: 'from-slate-600 to-slate-700',
};

export default function RevisionDashboard({ user, notebooks, onOpenNotebook, onGoToNotebooks }) {
  const { data: flashcards = [] } = useQuery({
    queryKey: ['allFlashcards', user?.email],
    queryFn: () => base44.entities.RevisionFlashcard.filter({ student_email: user.email }),
    enabled: !!user?.email,
  });

  const now = new Date();
  const dueToday = flashcards.filter(f => f.next_review && new Date(f.next_review) <= now);
  const totalCards = flashcards.length;
  const masteredCards = flashcards.filter(f => f.difficulty_rating === 'easy' && f.review_count >= 3).length;
  const masteryPct = totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0;

  const recentNotebooks = [...notebooks]
    .sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date))
    .slice(0, 4);

  const stats = [
    { label: 'Notebooks', value: notebooks.length, icon: BookOpen, color: 'from-violet-500 to-purple-600', sub: 'total' },
    { label: 'Due Today', value: dueToday.length, icon: Zap, color: 'from-amber-500 to-orange-500', sub: 'flashcards' },
    { label: 'Total Cards', value: totalCards, icon: Star, color: 'from-blue-500 to-cyan-500', sub: 'flashcards' },
    { label: 'Mastery', value: `${masteryPct}%`, icon: TrendingUp, color: 'from-emerald-500 to-teal-500', sub: 'overall' },
  ];

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-3xl font-black text-white mb-1">
          Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''} 👋
        </h1>
        <p className="text-slate-400">Your revision dashboard — keep up the great work!</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-3`}>
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-black text-white">{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.label} <span className="text-slate-600">· {s.sub}</span></p>
          </motion.div>
        ))}
      </div>

      {/* Due today CTA */}
      {dueToday.length > 0 && (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-2xl p-6 flex items-center justify-between">
          <div>
            <p className="text-amber-300 font-black text-xl">⚡ {dueToday.length} cards due today!</p>
            <p className="text-slate-400 text-sm mt-1">Open a notebook to review them using spaced repetition</p>
          </div>
          <button onClick={onGoToNotebooks}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-sm transition-all">
            Study Now
          </button>
        </motion.div>
      )}

      {/* Recent notebooks */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold text-lg">Recent Notebooks</h2>
          <button onClick={onGoToNotebooks} className="text-violet-400 hover:text-violet-300 text-sm flex items-center gap-1 transition-colors">
            View all <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {recentNotebooks.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
            <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 font-medium mb-1">No notebooks yet</p>
            <p className="text-slate-500 text-sm">Create your first notebook to start revising</p>
            <button onClick={onGoToNotebooks}
              className="mt-4 px-5 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-400 text-white font-bold text-sm transition-all flex items-center gap-2 mx-auto">
              <Plus className="w-4 h-4" /> New Notebook
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentNotebooks.map((nb, i) => (
              <motion.button key={nb.id} onClick={() => onOpenNotebook(nb)}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className="group text-left bg-white/5 border border-white/10 hover:border-violet-500/40 hover:bg-white/10 rounded-2xl p-5 transition-all">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${COLOR_MAP[nb.color] || COLOR_MAP.purple} flex items-center justify-center text-2xl mb-3 shadow-lg`}>
                  {nb.icon || '📚'}
                </div>
                <p className="text-white font-bold truncate">{nb.name}</p>
                <p className="text-slate-500 text-xs mt-1 truncate">{nb.subject || 'No subject'}</p>
                <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                  <span>{nb.source_count || 0} sources</span>
                  <span>{nb.flashcard_count || 0} cards</span>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Mastery progress */}
      {totalCards > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-white font-bold mb-4">Flashcard Mastery</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${masteryPct}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-1.5">
                <span>{masteredCards} mastered</span>
                <span>{totalCards - masteredCards} to go</span>
              </div>
            </div>
            <span className="text-2xl font-black text-emerald-400">{masteryPct}%</span>
          </div>
        </div>
      )}
    </div>
  );
}