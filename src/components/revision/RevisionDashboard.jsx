import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { BookOpen, Zap, TrendingUp, Plus, ChevronRight, Star, Flame, Trophy, Brain, Target, Upload, AlertTriangle } from 'lucide-react';

const COLOR_MAP = {
  purple: 'from-violet-600 to-purple-700',
  blue: 'from-blue-600 to-cyan-700',
  emerald: 'from-emerald-600 to-teal-700',
  rose: 'from-rose-600 to-pink-700',
  amber: 'from-amber-500 to-orange-600',
  slate: 'from-slate-600 to-slate-700',
};

function getLevel(xp) {
  return Math.floor(xp / 100) + 1;
}
function getXPInLevel(xp) {
  return xp % 100;
}

export default function RevisionDashboard({ user, notebooks, onOpenNotebook, onGoToNotebooks, onQuickUpload }) {
  const { data: flashcards = [] } = useQuery({
    queryKey: ['allFlashcards', user?.email],
    queryFn: () => base44.entities.RevisionFlashcard.filter({ student_email: user.email }),
    enabled: !!user?.email,
  });

  const now = new Date();
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  const dueToday = flashcards.filter(f => f.next_review && new Date(f.next_review) <= now);
  const dueTomorrow = flashcards.filter(f => {
    if (!f.next_review) return false;
    const d = new Date(f.next_review);
    return d > now && d <= tomorrow;
  });
  const overdue = flashcards.filter(f => f.next_review && new Date(f.next_review) < new Date(now - 86400000));
  const totalCards = flashcards.length;
  const masteredCards = flashcards.filter(f => f.difficulty_rating === 'easy' && f.review_count >= 3).length;
  const masteryPct = totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0;

  // XP: 10 per card reviewed, 5 per notebook
  const totalReviews = flashcards.reduce((a, f) => a + (f.review_count || 0), 0);
  const xp = totalReviews * 10 + notebooks.length * 5;
  const level = getLevel(xp);
  const xpInLevel = getXPInLevel(xp);

  // Study streak from notebooks (days since last_studied)
  const streak = notebooks.reduce((max, nb) => Math.max(max, nb.study_streak || 0), 0);

  // Weakest subjects: notebooks with lowest mastery
  const notebooksBySubject = {};
  notebooks.forEach(nb => {
    if (nb.subject) {
      if (!notebooksBySubject[nb.subject]) notebooksBySubject[nb.subject] = { cards: 0, mastered: 0 };
      const nbCards = flashcards.filter(f => f.notebook_id === nb.id);
      notebooksBySubject[nb.subject].cards += nbCards.length;
      notebooksBySubject[nb.subject].mastered += nbCards.filter(f => f.difficulty_rating === 'easy' && f.review_count >= 3).length;
    }
  });
  const weakSubjects = Object.entries(notebooksBySubject)
    .map(([s, d]) => ({ subject: s, pct: d.cards > 0 ? Math.round((d.mastered / d.cards) * 100) : 0 }))
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 3);

  // Recommended: notebooks not studied recently
  const recommended = [...notebooks]
    .sort((a, b) => {
      const aDate = a.last_studied ? new Date(a.last_studied) : new Date(0);
      const bDate = b.last_studied ? new Date(b.last_studied) : new Date(0);
      return aDate - bDate;
    })
    .slice(0, 3);

  const recentNotebooks = [...notebooks]
    .sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date))
    .slice(0, 4);

  const stats = [
    { label: 'Notebooks', value: notebooks.length, icon: BookOpen, color: 'from-violet-500 to-purple-600', sub: 'total' },
    { label: 'Due Today', value: dueToday.length, icon: Zap, color: 'from-amber-500 to-orange-500', sub: 'flashcards' },
    { label: 'Study Streak', value: `${streak}d`, icon: Flame, color: 'from-rose-500 to-pink-500', sub: 'days' },
    { label: 'Mastery', value: `${masteryPct}%`, icon: TrendingUp, color: 'from-emerald-500 to-teal-500', sub: 'overall' },
  ];

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white mb-1">
            Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="text-slate-400">Your revision dashboard — keep up the great work!</p>
        </div>
        <button onClick={onQuickUpload}
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold text-sm hover:brightness-110 transition-all shadow-lg shadow-violet-500/25">
          <Upload className="w-4 h-4" /> Quick Upload
        </button>
      </div>

      {/* Level / XP bar */}
      <div className="bg-gradient-to-r from-violet-900/30 to-purple-900/20 border border-violet-500/20 rounded-2xl p-5">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="text-white font-black">Level {level} Reviser</p>
              <p className="text-violet-300 text-sm font-bold">{xpInLevel}/100 XP</p>
            </div>
            <div className="h-2.5 bg-white/10 rounded-full overflow-hidden mt-2">
              <motion.div className="h-full bg-gradient-to-r from-violet-400 to-purple-400 rounded-full"
                initial={{ width: 0 }} animate={{ width: `${xpInLevel}%` }} transition={{ duration: 1, ease: 'easeOut' }} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6 text-xs text-slate-400">
          <span className="flex items-center gap-1"><Flame className="w-3.5 h-3.5 text-orange-400" /> {streak} day streak</span>
          <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-yellow-400" /> {xp} total XP</span>
          <span className="flex items-center gap-1"><Brain className="w-3.5 h-3.5 text-violet-400" /> {totalReviews} reviews done</span>
        </div>
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

      {/* Overdue / Due today alerts */}
      {(overdue.length > 0 || dueToday.length > 0) && (
        <div className="space-y-3">
          {overdue.length > 0 && (
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-r from-red-500/20 to-rose-500/20 border border-red-500/30 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-red-300 font-bold">{overdue.length} overdue card{overdue.length !== 1 ? 's' : ''}!</p>
                  <p className="text-slate-400 text-xs mt-0.5">Review these now to get back on track</p>
                </div>
              </div>
              <button onClick={onGoToNotebooks}
                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold text-sm transition-all flex-shrink-0">
                Review
              </button>
            </motion.div>
          )}
          {dueToday.length > 0 && (
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <div>
                  <p className="text-amber-300 font-bold">⚡ {dueToday.length} cards due today</p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {dueTomorrow.length > 0 ? `+ ${dueTomorrow.length} due tomorrow` : 'Keep your streak going!'}
                  </p>
                </div>
              </div>
              <button onClick={onGoToNotebooks}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-sm transition-all flex-shrink-0">
                Study Now
              </button>
            </motion.div>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent notebooks */}
        <div className="lg:col-span-2">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {recentNotebooks.map((nb, i) => (
                <motion.button key={nb.id} onClick={() => onOpenNotebook(nb)}
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                  className="group text-left bg-white/5 border border-white/10 hover:border-violet-500/40 hover:bg-white/10 rounded-2xl p-5 transition-all">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${COLOR_MAP[nb.color] || COLOR_MAP.purple} flex items-center justify-center text-2xl mb-3 shadow-lg`}>
                    {nb.icon || '📚'}
                  </div>
                  <p className="text-white font-bold truncate">{nb.name}</p>
                  <p className="text-slate-500 text-xs mt-0.5 truncate">{nb.subject || 'No subject'}{nb.exam_board ? ` · ${nb.exam_board}` : ''}</p>
                  <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                    <span>{nb.source_count || 0} sources</span>
                    <span>{nb.flashcard_count || 0} cards</span>
                    {nb.updated_date && <span>· {new Date(nb.updated_date).toLocaleDateString()}</span>}
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Mastery progress */}
          {totalCards > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <h2 className="text-white font-bold mb-3 text-sm">Flashcard Mastery</h2>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${masteryPct}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </div>
                <span className="text-xl font-black text-emerald-400">{masteryPct}%</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>{masteredCards} mastered</span>
                <span>{totalCards - masteredCards} to go</span>
              </div>
            </div>
          )}

          {/* Weakest subjects */}
          {weakSubjects.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <h2 className="text-white font-bold mb-3 text-sm flex items-center gap-2">
                <Target className="w-4 h-4 text-red-400" /> Needs Work
              </h2>
              <div className="space-y-3">
                {weakSubjects.map(s => (
                  <div key={s.subject}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300 font-medium">{s.subject}</span>
                      <span className="text-slate-500">{s.pct}%</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${s.pct < 30 ? 'bg-red-500' : s.pct < 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${s.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended */}
          {recommended.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <h2 className="text-white font-bold mb-3 text-sm flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-400" /> Recommended
              </h2>
              <div className="space-y-2">
                {recommended.map(nb => (
                  <button key={nb.id} onClick={() => onOpenNotebook(nb)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-left">
                    <span className="text-lg">{nb.icon || '📚'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium truncate">{nb.name}</p>
                      {!nb.last_studied && <p className="text-slate-500 text-xs">Never studied</p>}
                      {nb.last_studied && <p className="text-slate-500 text-xs">{new Date(nb.last_studied).toLocaleDateString()}</p>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}