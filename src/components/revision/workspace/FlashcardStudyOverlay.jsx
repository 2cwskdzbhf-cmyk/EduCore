import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ChevronLeft, ChevronRight, X, Check,
  RotateCcw, Maximize2, Minimize2
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';

function getNextReview(rating, interval = 1, ease = 2.5) {
  const now = new Date();
  let newInterval = interval, newEase = ease;
  if (rating === 'again')       { newInterval = 1; newEase = Math.max(1.3, ease - 0.2); }
  else if (rating === 'hard')   { newInterval = Math.max(1, interval * 1.2); newEase = Math.max(1.3, ease - 0.15); }
  else if (rating === 'medium') { newInterval = interval * ease; }
  else if (rating === 'easy')   { newInterval = interval * ease * 1.3; newEase = ease + 0.15; }
  return {
    next_review: new Date(now.getTime() + Math.round(newInterval) * 86400000).toISOString(),
    interval_days: Math.round(newInterval),
    ease_factor: newEase,
  };
}

/**
 * mode="inline"     — rendered inside the expanded right panel (no fixed positioning)
 * mode="fullscreen" — covers the entire viewport (fixed inset-0)
 */
export default function FlashcardStudyOverlay({
  cards,
  title,
  onClose,
  onRefresh,
  mode = 'fullscreen',
  onEnterFullscreen,
  onExitFullscreen,
}) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [incorrect, setIncorrect] = useState(0);
  const [done, setDone] = useState(false);
  const touchStartX = useRef(null);

  const isInline = mode === 'inline';
  const isFullscreen = mode === 'fullscreen';

  const total = cards.length;
  const card = cards[index];
  const progress = total > 0 ? (index / total) * 100 : 0;

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
    else { setDone(true); }
  }, [index, total]);

  const goBack = useCallback(() => {
    if (index > 0) { setIndex(i => i - 1); setFlipped(false); }
  }, [index]);

  const handleMark = useCallback((isCorrect) => {
    if (!card) return;
    if (isCorrect) setCorrect(c => c + 1); else setIncorrect(c => c + 1);
    rateMutation.mutate({ card, rating: isCorrect ? 'easy' : 'again' });
    if (index < total - 1) { setIndex(i => i + 1); setFlipped(false); }
    else { setDone(true); }
  }, [card, index, total]);

  const restart = () => {
    setIndex(0); setFlipped(false); setCorrect(0); setIncorrect(0); setDone(false);
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); setFlipped(f => !f); }
      if (e.code === 'ArrowLeft')  { e.preventDefault(); goBack(); }
      if (e.code === 'ArrowRight') { e.preventDefault(); goNext(); }
      if (e.key === 'Escape' && isFullscreen && onExitFullscreen) { e.preventDefault(); onExitFullscreen(); }
      if (e.key === '1' && flipped) { e.preventDefault(); handleMark(false); }
      if (e.key === '2' && flipped) { e.preventDefault(); handleMark(true); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [flipped, goBack, goNext, handleMark, isFullscreen, onExitFullscreen]);

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) { dx < 0 ? goNext() : goBack(); }
    touchStartX.current = null;
  };

  // ── Shared gradient backgrounds ──
  const bgStyle = isFullscreen
    ? { background: 'radial-gradient(ellipse at 50% 30%, #1e1b4b 0%, #0f0f1a 70%, #0a0a12 100%)' }
    : { background: 'radial-gradient(ellipse at 50% 20%, rgba(30,27,75,0.8) 0%, rgba(10,10,20,0.97) 100%)' };

  // ── Container classes ──
  const containerClass = isFullscreen
    ? 'flex flex-col w-full h-full'
    : 'flex flex-col w-full h-full';

  // ── Completion screen ──
  if (done) {
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const emoji = pct >= 80 ? '🏆' : pct >= 50 ? '⭐' : '📖';
    return (
      <div className={containerClass} style={bgStyle}>
        <div className="flex-1 flex items-center justify-center px-4">
          <motion.div
            initial={{ scale: 0.88, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="w-full max-w-md mx-auto rounded-3xl p-8 sm:p-10 text-center"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(24px)',
              boxShadow: '0 32px 64px rgba(0,0,0,0.6)',
            }}
          >
            <div className="text-6xl mb-4">{emoji}</div>
            <h2 className="text-white font-black text-3xl mb-1">Session Complete!</h2>
            <p className="text-slate-400 text-sm mb-8">You reviewed all {total} cards</p>

            <div className="grid grid-cols-3 gap-3 mb-8">
              <div className="rounded-2xl py-5" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
                <p className="text-emerald-400 font-black text-3xl">{correct}</p>
                <p className="text-emerald-400/60 text-xs mt-1 font-medium">Correct</p>
              </div>
              <div className="rounded-2xl py-5" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                <p className="text-red-400 font-black text-3xl">{incorrect}</p>
                <p className="text-red-400/60 text-xs mt-1 font-medium">Incorrect</p>
              </div>
              <div className="rounded-2xl py-5" style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)' }}>
                <p className="text-violet-300 font-black text-3xl">{pct}%</p>
                <p className="text-violet-300/60 text-xs mt-1 font-medium">Score</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={onClose}
                className="flex-1 py-3.5 rounded-2xl text-slate-300 text-sm font-semibold transition-all hover:text-white"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                ← Back to Studio
              </button>
              <button onClick={restart}
                className="flex-1 py-3.5 rounded-2xl text-white text-sm font-bold transition-all hover:brightness-110"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
                <RotateCcw className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                Restart
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={containerClass}
      style={bgStyle}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Header ── */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3.5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Left: back */}
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span className={isInline ? 'hidden sm:inline' : 'hidden sm:inline'}>Studio</span>
        </button>

        {/* Centre: title + counter */}
        <div className="flex flex-col items-center gap-0.5 flex-1 mx-4 min-w-0">
          <p className="text-white/90 text-sm font-semibold truncate w-full text-center max-w-xs">{title}</p>
          <p className="text-slate-500 text-xs font-medium">
            Card <span className="text-white/70 font-bold">{index + 1}</span> of{' '}
            <span className="text-white/70 font-bold">{total}</span>
          </p>
        </div>

        {/* Right: stats + fullscreen toggle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 text-sm font-bold">
            <span className="flex items-center gap-1 text-emerald-400">
              <Check className="w-3.5 h-3.5" />{correct}
            </span>
            <span className="flex items-center gap-1 text-red-400">
              <X className="w-3.5 h-3.5" />{incorrect}
            </span>
          </div>

          {/* Fullscreen / exit-fullscreen toggle */}
          {isInline && onEnterFullscreen && (
            <button
              onClick={onEnterFullscreen}
              title="Enter fullscreen"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
          {isFullscreen && onExitFullscreen && (
            <button
              onClick={onExitFullscreen}
              title="Exit fullscreen (Esc)"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex-shrink-0 h-0.5 w-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <motion.div
          className="h-full"
          style={{ background: 'linear-gradient(90deg, #7c3aed, #a78bfa)' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* ── Card area ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-4 overflow-hidden">

        {/* Hint */}
        <motion.p
          key={flipped ? 'answer' : 'question'}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
          className="text-slate-500 text-xs tracking-widest uppercase font-medium mb-4 select-none"
        >
          {flipped ? 'Answer' : 'Click · Tap · Space to reveal'}
        </motion.p>

        {/* Card with 3D flip */}
        <div
          className="w-full cursor-pointer select-none"
          style={{ maxWidth: isFullscreen ? '860px' : '100%', perspective: '1400px' }}
          onClick={() => setFlipped(f => !f)}
        >
          <motion.div
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
            style={{ transformStyle: 'preserve-3d', position: 'relative' }}
          >
            {/* Front */}
            <div
              className="rounded-3xl flex flex-col items-center justify-center text-center px-8 sm:px-14 py-10 sm:py-16"
              style={{
                backfaceVisibility: 'hidden',
                minHeight: isFullscreen ? '300px' : '220px',
                background: 'linear-gradient(145deg, rgba(30,27,75,0.9) 0%, rgba(15,15,26,0.95) 100%)',
                border: '1px solid rgba(124,58,237,0.25)',
                boxShadow: '0 0 80px rgba(124,58,237,0.12), 0 24px 48px rgba(0,0,0,0.5)',
              }}
            >
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-5"
                style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)' }}
              >
                <span className="text-violet-400 text-[10px] font-bold uppercase tracking-[0.15em]">Question</span>
              </div>
              <p className="text-white font-semibold text-lg sm:text-xl md:text-2xl leading-relaxed" style={{ maxWidth: '600px' }}>
                {card?.front}
              </p>
            </div>

            {/* Back */}
            <div
              className="absolute inset-0 rounded-3xl flex flex-col items-center justify-center text-center px-8 sm:px-14 py-10 sm:py-16"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                background: 'linear-gradient(145deg, rgba(20,40,60,0.95) 0%, rgba(10,30,50,0.98) 100%)',
                border: '1px solid rgba(52,211,153,0.2)',
                boxShadow: '0 0 80px rgba(52,211,153,0.08), 0 24px 48px rgba(0,0,0,0.5)',
              }}
            >
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-5"
                style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)' }}
              >
                <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-[0.15em]">Answer</span>
              </div>
              <p className="text-white font-semibold text-lg sm:text-xl md:text-2xl leading-relaxed" style={{ maxWidth: '600px' }}>
                {card?.back}
              </p>
            </div>
          </motion.div>
        </div>

        {/* ── Navigation ── */}
        <div className="mt-6 sm:mt-8 flex items-center gap-3 w-full" style={{ maxWidth: isFullscreen ? '860px' : '100%' }}>
          {/* Prev */}
          <button
            onClick={goBack}
            disabled={index === 0}
            className="flex items-center gap-1.5 px-4 py-3 rounded-2xl text-sm font-medium transition-all disabled:opacity-25 disabled:cursor-not-allowed hover:scale-105 active:scale-95 flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1' }}
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Prev</span>
          </button>

          {/* Centre actions */}
          <div className="flex-1 flex items-center justify-center gap-3">
            <AnimatePresence mode="wait">
              {flipped ? (
                <motion.div
                  key="mark"
                  className="flex gap-2 sm:gap-3 w-full justify-center flex-wrap"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <button
                    onClick={() => handleMark(false)}
                    className="flex items-center gap-2 px-4 sm:px-6 py-3 rounded-2xl text-sm font-bold transition-all hover:scale-105 active:scale-95"
                    style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171' }}
                  >
                    <X className="w-4 h-4" />
                    <span>Incorrect</span>
                    <span className="text-xs opacity-40 hidden sm:inline">[1]</span>
                  </button>
                  <button
                    onClick={() => handleMark(true)}
                    className="flex items-center gap-2 px-4 sm:px-6 py-3 rounded-2xl text-sm font-bold transition-all hover:scale-105 active:scale-95"
                    style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399' }}
                  >
                    <Check className="w-4 h-4" />
                    <span>Correct</span>
                    <span className="text-xs opacity-40 hidden sm:inline">[2]</span>
                  </button>
                </motion.div>
              ) : (
                <motion.button
                  key="reveal"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setFlipped(true)}
                  className="px-8 sm:px-12 py-3 rounded-2xl text-sm font-bold transition-all hover:scale-105 active:scale-95"
                  style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.35)', color: '#c4b5fd' }}
                >
                  See Answer
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Next */}
          <button
            onClick={goNext}
            className="flex items-center gap-1.5 px-4 py-3 rounded-2xl text-sm font-medium transition-all hover:scale-105 active:scale-95 flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1' }}
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Keyboard hints */}
        <p className="mt-4 text-slate-700 text-xs font-medium select-none text-center">
          ← → navigate · Space / Enter flip · 1 incorrect · 2 correct
          {isFullscreen && ' · Esc exit'}
        </p>
      </div>
    </div>
  );
}