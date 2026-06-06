import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Clock, Brain, Zap, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';

function getMemoryStrength(card) {
  if (!card.next_review || card.review_count === 0) return 0;
  const now = new Date();
  const nextReview = new Date(card.next_review);
  const interval = (card.interval_days || 1) * 86400000;
  const timeLeft = nextReview - now;
  const strength = Math.max(0, Math.min(100, Math.round((timeLeft / interval) * 100)));
  return strength;
}

function getDaysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / 86400000);
}

export default function MemoryCurve({ flashcards, notebooks, onStudyDue }) {
  const now = new Date();

  const notebookMap = useMemo(() => {
    const m = {};
    notebooks.forEach(nb => { m[nb.id] = nb; });
    return m;
  }, [notebooks]);

  const cardData = useMemo(() => flashcards.map(card => ({
    ...card,
    strength: getMemoryStrength(card),
    daysUntil: getDaysUntil(card.next_review),
    notebook: notebookMap[card.notebook_id],
  })), [flashcards, notebookMap]);

  const overdue = cardData.filter(c => c.daysUntil !== null && c.daysUntil < 0).sort((a, b) => a.daysUntil - b.daysUntil);
  const dueToday = cardData.filter(c => c.daysUntil !== null && c.daysUntil === 0);
  const dueThisWeek = cardData.filter(c => c.daysUntil !== null && c.daysUntil > 0 && c.daysUntil <= 7);
  const strong = cardData.filter(c => c.daysUntil !== null && c.daysUntil > 7);
  const neverReviewed = cardData.filter(c => !c.next_review || c.review_count === 0);

  // Group by notebook for topic-level memory strength
  const topicStrengths = useMemo(() => {
    const groups = {};
    cardData.forEach(card => {
      const key = card.notebook?.name || 'Unknown';
      if (!groups[key]) groups[key] = { name: key, icon: card.notebook?.icon || '📚', cards: [] };
      groups[key].cards.push(card);
    });
    return Object.values(groups).map(g => {
      const avg = g.cards.length > 0
        ? Math.round(g.cards.reduce((s, c) => s + c.strength, 0) / g.cards.length)
        : 0;
      const dueCount = g.cards.filter(c => c.daysUntil !== null && c.daysUntil <= 0).length;
      return { ...g, avgStrength: avg, dueCount, totalCards: g.cards.length };
    }).sort((a, b) => a.avgStrength - b.avgStrength);
  }, [cardData]);

  const CardRow = ({ card }) => (
    <div className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
        card.daysUntil < 0 ? 'bg-red-500' : card.daysUntil === 0 ? 'bg-amber-400' : 'bg-emerald-400'
      }`} />
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-medium truncate">{card.front?.slice(0, 60)}...</p>
        <p className="text-slate-500 text-[10px]">{card.notebook?.name || 'Unknown'} · {card.review_count || 0} reviews</p>
      </div>
      <span className={`text-xs flex-shrink-0 font-bold ${
        card.daysUntil < 0 ? 'text-red-400' : card.daysUntil === 0 ? 'text-amber-400' : 'text-slate-500'
      }`}>
        {card.daysUntil < 0 ? `${Math.abs(card.daysUntil)}d late` : card.daysUntil === 0 ? 'Today' : `in ${card.daysUntil}d`}
      </span>
    </div>
  );

  if (flashcards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Brain className="w-16 h-16 text-slate-600 mb-4" />
        <p className="text-white font-bold text-lg mb-2">No flashcards yet</p>
        <p className="text-slate-400 text-sm">Create flashcards in your notebooks to track your memory curve.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-white font-black text-xl mb-1">Memory Curve Tracking</h2>
        <p className="text-slate-400 text-sm">{flashcards.length} cards tracked using spaced repetition</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Overdue', count: overdue.length, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', icon: AlertTriangle },
          { label: 'Due Today', count: dueToday.length, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: Zap },
          { label: 'This Week', count: dueThisWeek.length, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', icon: Clock },
          { label: 'Solid', count: strong.length, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-3 border text-center ${s.bg}`}>
            <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
            <p className={`text-xl font-black ${s.color}`}>{s.count}</p>
            <p className="text-xs text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* CTA if overdue/due */}
      {(overdue.length + dueToday.length) > 0 && (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-amber-300 font-bold">{overdue.length + dueToday.length} cards need reviewing</p>
            <p className="text-slate-400 text-xs mt-0.5">Review now to keep your memory strong</p>
          </div>
          <button onClick={onStudyDue}
            className="flex-shrink-0 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-sm transition-all">
            Study Now
          </button>
        </motion.div>
      )}

      {/* Topic memory strength */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-violet-400" /> Memory Strength by Topic
        </h3>
        <div className="space-y-3">
          {topicStrengths.map((t, i) => (
            <motion.div key={t.name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">{t.icon}</span>
                <span className="text-white text-xs font-medium flex-1 truncate">{t.name}</span>
                <span className="text-xs text-slate-400">{t.avgStrength}%</span>
                {t.dueCount > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">{t.dueCount} due</span>
                )}
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${t.avgStrength < 30 ? 'bg-red-500' : t.avgStrength < 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${t.avgStrength}%` }}
                  transition={{ duration: 0.8, delay: i * 0.05 }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Due list */}
      {(overdue.length + dueToday.length) > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" /> Due for Review
          </h3>
          <div className="max-h-64 overflow-y-auto">
            {[...overdue, ...dueToday].slice(0, 20).map(card => (
              <CardRow key={card.id} card={card} />
            ))}
          </div>
        </div>
      )}

      {/* Never reviewed */}
      {neverReviewed.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-slate-400 text-xs font-semibold mb-1">
            <span className="text-white font-bold">{neverReviewed.length}</span> cards never reviewed
          </p>
          <p className="text-slate-600 text-xs">Visit your notebooks to start reviewing these cards and build your memory curve.</p>
        </div>
      )}
    </div>
  );
}