import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, TrendingUp, CheckCircle, Target, Brain, ChevronRight } from 'lucide-react';

function analyseTopics(flashcards, notebooks) {
  // Group flashcards by notebook
  const notebookMap = {};
  notebooks.forEach(nb => { notebookMap[nb.id] = nb; });

  const topicData = {};

  flashcards.forEach(card => {
    const nb = notebookMap[card.notebook_id];
    const topicKey = nb?.subject || nb?.name || 'General';
    if (!topicData[topicKey]) {
      topicData[topicKey] = {
        name: topicKey,
        notebookName: nb?.name || '',
        notebookIcon: nb?.icon || '📚',
        total: 0,
        correct: 0,
        again: 0,
        hard: 0,
        reviews: 0,
        lastReviewed: null,
        avgEase: 0,
        easeSum: 0,
      };
    }
    const t = topicData[topicKey];
    t.total++;
    t.reviews += card.review_count || 0;
    t.easeSum += card.ease_factor || 2.5;
    if (card.difficulty_rating === 'easy') t.correct++;
    if (card.difficulty_rating === 'again') t.again++;
    if (card.difficulty_rating === 'hard') t.hard++;
    if (card.next_review) {
      const d = new Date(card.next_review);
      if (!t.lastReviewed || d > t.lastReviewed) t.lastReviewed = d;
    }
  });

  return Object.values(topicData).map(t => {
    t.avgEase = t.total > 0 ? t.easeSum / t.total : 2.5;
    // Score: lower = weaker
    // Factors: accuracy, ease factor, review count, recency
    const accuracy = t.total > 0 ? (t.correct / t.total) : 0;
    const easePenalty = Math.max(0, (2.5 - t.avgEase) / 2.5);
    const reviewBonus = Math.min(1, t.reviews / 10);
    const againPenalty = t.total > 0 ? (t.again / t.total) : 0;
    t.score = Math.round((accuracy * 0.4 + (1 - easePenalty) * 0.3 + reviewBonus * 0.2 - againPenalty * 0.1) * 100);
    t.score = Math.max(0, Math.min(100, t.score));
    t.accuracy = Math.round(accuracy * 100);
    return t;
  }).sort((a, b) => a.score - b.score);
}

export default function WeakTopicDetector({ flashcards, notebooks, onStartAdaptive }) {
  const topics = useMemo(() => analyseTopics(flashcards, notebooks), [flashcards, notebooks]);

  const weak = topics.filter(t => t.score < 40);
  const medium = topics.filter(t => t.score >= 40 && t.score < 70);
  const strong = topics.filter(t => t.score >= 70);

  const Section = ({ title, items, color, icon: Icon, badgeColor }) => (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-4 h-4 ${color}`} />
        <h3 className={`font-bold text-sm ${color}`}>{title}</h3>
        <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-bold ${badgeColor}`}>{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-slate-600 text-xs py-3 text-center">None yet</p>
      ) : (
        <div className="space-y-2">
          {items.map((t, i) => (
            <motion.div key={t.name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
              className="bg-white/5 border border-white/8 rounded-xl p-3 flex items-center gap-3">
              <span className="text-xl">{t.notebookIcon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate">{t.name}</p>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${
                      t.score < 40 ? 'bg-red-500' : t.score < 70 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} style={{ width: `${t.score}%` }} />
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0">{t.score}%</span>
                </div>
                <div className="flex gap-3 mt-1 text-[10px] text-slate-500">
                  <span>{t.total} cards</span>
                  <span>{t.accuracy}% accuracy</span>
                  <span>{t.reviews} reviews</span>
                </div>
              </div>
              {t.score < 70 && (
                <button onClick={() => onStartAdaptive(t)}
                  className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 text-xs font-bold transition-all">
                  Revise <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  if (topics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Brain className="w-16 h-16 text-slate-600 mb-4" />
        <p className="text-white font-bold text-lg mb-2">No data yet</p>
        <p className="text-slate-400 text-sm">Review some flashcards first to see your weak topics analysed here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-white font-black text-xl mb-1">Weak Topic Detector</h2>
        <p className="text-slate-400 text-sm">Analysed {flashcards.length} flashcards across {notebooks.length} notebooks</p>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Weakest', count: weak.length, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
          { label: 'Improving', count: medium.length, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
          { label: 'Strong', count: strong.length, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-3 border text-center ${s.bg}`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.count}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <Section title="Weakest Topics" items={weak} color="text-red-400" icon={AlertTriangle} badgeColor="bg-red-500/20 text-red-300" />
      <Section title="Needs Improvement" items={medium} color="text-amber-400" icon={Target} badgeColor="bg-amber-500/20 text-amber-300" />
      <Section title="Strong Topics" items={strong} color="text-emerald-400" icon={CheckCircle} badgeColor="bg-emerald-500/20 text-emerald-300" />
    </div>
  );
}