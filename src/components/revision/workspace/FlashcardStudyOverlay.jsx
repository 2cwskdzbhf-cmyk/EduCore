import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, X, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';

function getNextReview(rating, interval = 1, ease = 2.5) {
  const now = new Date();
  let newInterval = interval, newEase = ease;
  if (rating === 'again')       { newInterval = 1; newEase = Math.max(1.3, ease - 0.2); }
  else if (rating === 'hard')   { newInterval = Math.max(1, interval * 1.2); newEase = Math.max(1.3, ease - 0.15); }
  else if (rating === 'medium') { newInterval = interval * ease; }
  else if (rating === 'easy')   { newInterval = interval * ease * 1.3; newEase = ease + 0.15; }
  newInterval = Math.round(newInterval);
  return { next_review: new Date(now.getTime() + newInterval * 86400000).toISOString(), interval_days: newInterval, ease_factor: newEase };
}

export default function FlashcardStudyOverlay({ cards, title, onClose, onRefresh }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [incorrect, setIncorrect] = useState(0);

  const total = cards.length;
  const card = cards[index];
  const done = index >= total || !card;
  const progress = total > 0 ? ((correct + incorrect) / total) * 100 : 0;

  const rateMutation = useMutation({
    mutationFn: async ({ card, rating }) => {
      const updates = getNextReview(rating, card.interval_days, card.ease_factor);
      await base44.entities.RevisionFlashcard.update(card.id, {
        ...updates, difficulty_rating: rating, review_count: (card.review_count || 0) + 1,
      });
    },
    onSuccess: () => { if (onRefresh) onRefresh(); },
  });

  const goNext = useCallback(() => {
    if (index < total - 1) { setIndex(i => i + 1); setFlipped(false); }
  }, [index, total]);

  const goBack = useCallback(() => {
    if (index > 0) { setIndex(i => i - 1); setFlipped(false); }
  }, [index]);

  const handleMark = useCallback((isCorrect) => {
    if (!card) return;
    if (isCorrect) setCorrect(c => c + 1); else setIncorrect(c => c + 1);
    rateMutation.mutate({ card, rating: isCorrect ? 'easy' : 'again' });
    if (index < total - 1) { setIndex(i => i + 1); setFlipped(false); }
  }, [card, index, total]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); setFlipped(f => !f); }
      if (e.code === 'ArrowLeft')  { e.preventDefault(); goBack(); }
      if (e.code === 'ArrowRight') { e.preventDefault(); goNext(); }
      if (e.key === '1' && flipped) handleMark(false);
      if (e.key === '2' && flipped) handleMark(true);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [flipped, index, goBack, goNext, handleMark]);

  // Completion screen
  if (done) {
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-violet-950/30 to-slate-950 z-[100] flex items-center justify-center p-6">
        <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="bg-slate-900/90 border border-white/10 rounded-3xl p-10 max-w-md w-full text-center shadow-2xl">
          <div className="text-6xl mb-4">{pct >= 80 ? '🏆' : pct >= 50 ? '⭐' : '📖'}</div>
          <h2 className="text-white font-black text-3xl mb-2">Session Complete!</h2>
          <p className="text-slate-400 mb-8">You reviewed all {total} cards</p>
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
              <p className="text-emerald-400 font-black text-3xl">{correct}</p>
              <p className="text-emerald-400/70 text-xs mt-1">Correct</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
              <p className="text-red-400 font-black text-3xl">{incorrect}</p>
              <p className="text-red-400/70 text-xs mt-1">Incorrect</p>
            </div>
            <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-4">
              <p className="text-violet-400 font-black text-3xl">{pct}%</p>
              <p className="text-violet-400/70 text-xs mt-1">Score</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-white/10 text-slate-300 hover:bg-white/5 font-semibold transition-all">
              Back to Studio
            </button>
            <button onClick={() => { setIndex(0); setFlipped(false); setCorrect(0); setIncorrect(0); }}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold hover:brightness-110 transition-all">
              Study Again
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-violet-950/20 to-slate-950 z-[100] flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/10">
        <button onClick={onClose} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Studio
        </button>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-500 font-medium">
            Card <span className="text-white font-bold">{index + 1}</span> of <span className="text-white font-bold">{total}</span>
          </span>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-emerald-400 font-semibold"><Check className="w-3.5 h-3.5" />{correct}</span>
            <span className="flex items-center gap-1 text-red-400 font-semibold"><X className="w-3.5 h-3.5" />{incorrect}</span>
          </div>
        </div>
        <p className="text-xs text-slate-600 hidden sm:block">{title}</p>
      </div>

      {/* Progress bar */}
      <div className="flex-shrink-0 h-1 bg-white/5">
        <motion.div className="h-full bg-gradient-to-r from-violet-500 to-purple-400"
          animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
      </div>

      {/* Card area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 overflow-hidden">
        <p className="text-slate-600 text-xs mb-6 tracking-wider uppercase font-medium">
          {flipped ? 'Answer revealed' : 'Click card to reveal answer'}
        </p>

        {/* Card */}
        <div
          className="w-full cursor-pointer select-none"
          style={{ maxWidth: '800px', perspective: '1200px' }}
          onClick={() => setFlipped(f => !f)}
        >
          <motion.div
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            style={{ transformStyle: 'preserve-3d', position: 'relative' }}
          >
            {/* Front */}
            <div
              className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-white/10 rounded-3xl shadow-2xl flex flex-col items-center justify-center text-center p-10 sm:p-14"
              style={{ backfaceVisibility: 'hidden', minHeight: '300px' }}
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 mb-6">
                <span className="text-violet-400 text-xs font-semibold uppercase tracking-widest">Question</span>
              </div>
              <p className="text-white font-bold text-2xl sm:text-3xl leading-relaxed max-w-xl">{card.front}</p>
              <p className="text-slate-600 text-sm mt-8">Tap · Click · Press Space</p>
            </div>

            {/* Back */}
            <div
              className="absolute inset-0 bg-gradient-to-br from-violet-900/50 to-purple-900/50 border border-violet-400/20 rounded-3xl shadow-2xl flex flex-col items-center justify-center text-center p-10 sm:p-14"
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
                <span className="text-emerald-400 text-xs font-semibold uppercase tracking-widest">Answer</span>
              </div>
              <p className="text-white font-bold text-2xl sm:text-3xl leading-relaxed max-w-xl">{card.back}</p>
            </div>
          </motion.div>
        </div>

        {/* Controls */}
        <div className="mt-10 flex items-center gap-4 w-full max-w-[800px]">
          <button onClick={goBack} disabled={index === 0}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all font-medium text-sm flex-shrink-0">
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>

          <div className="flex gap-3 flex-1 justify-center">
            <AnimatePresence>
              {flipped ? (
                <>
                  <motion.button key="incorrect"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                    transition={{ delay: 0.1 }}
                    onClick={() => handleMark(false)}
                    className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 font-bold text-sm transition-all">
                    <X className="w-4 h-4" /> Incorrect <span className="text-xs opacity-50 ml-1">[1]</span>
                  </motion.button>
                  <motion.button key="correct"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                    transition={{ delay: 0.15 }}
                    onClick={() => handleMark(true)}
                    className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 font-bold text-sm transition-all">
                    <Check className="w-4 h-4" /> Correct <span className="text-xs opacity-50 ml-1">[2]</span>
                  </motion.button>
                </>
              ) : (
                <motion.button key="reveal"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => setFlipped(true)}
                  className="px-8 py-3.5 rounded-2xl bg-violet-500/10 border border-violet-500/30 text-violet-300 hover:bg-violet-500/20 font-bold text-sm transition-all">
                  Reveal Answer
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <button onClick={goNext} disabled={index >= total - 1}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all font-medium text-sm flex-shrink-0">
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-6 flex items-center gap-6 text-xs text-slate-700">
          <span>← → navigate</span>
          <span>Space / Enter to flip</span>
          <span>1 = incorrect · 2 = correct</span>
        </div>
      </div>
    </div>
  );
}