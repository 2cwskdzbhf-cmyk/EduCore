import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ChevronRight, CheckCircle, XCircle, Lightbulb, Loader2, RotateCcw, Trophy, Zap } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const DIFFICULTY_ORDER = ['easy', 'medium', 'hard'];

function buildQuestionQueue(flashcards, notebooks) {
  const now = new Date();
  const notebookMap = {};
  notebooks.forEach(nb => { notebookMap[nb.id] = nb; });

  // Score each card by how urgently it needs review
  return flashcards
    .map(card => {
      let urgency = 0;
      if (card.difficulty_rating === 'again') urgency += 40;
      if (card.difficulty_rating === 'hard') urgency += 25;
      if (card.difficulty_rating === 'medium') urgency += 15;
      if (!card.next_review || card.review_count === 0) urgency += 30;
      else if (new Date(card.next_review) <= now) urgency += 20;
      if ((card.ease_factor || 2.5) < 2.0) urgency += 15;
      return { ...card, urgency, notebook: notebookMap[card.notebook_id] };
    })
    .filter(c => c.urgency > 0 || c.review_count === 0)
    .sort((a, b) => b.urgency - a.urgency)
    .slice(0, 20);
}

export default function AdaptiveRevision({ flashcards, notebooks }) {
  const [sessionCards, setSessionCards] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [results, setResults] = useState([]);
  const [difficulty, setDifficulty] = useState(0); // 0=easy,1=medium,2=hard
  const [sessionDone, setSessionDone] = useState(false);

  const queue = useMemo(() => buildQuestionQueue(flashcards, notebooks), [flashcards, notebooks]);

  const startSession = () => {
    setSessionCards(queue.slice(0, 10));
    setCurrentIndex(0);
    setFlipped(false);
    setShowExplanation(false);
    setExplanation('');
    setResults([]);
    setDifficulty(0);
    setSessionDone(false);
  };

  const currentCard = sessionCards?.[currentIndex];

  const getExplanation = async (card) => {
    setLoadingExplanation(true);
    setShowExplanation(true);
    try {
      const res = await base44.functions.invoke('callOpenAI', {
        prompt: `You are a helpful tutor. Explain this flashcard answer clearly and concisely for a student.
Front (question): ${card.front}
Back (answer): ${card.back}

Give a short 2-3 sentence explanation that helps the student understand WHY this answer is correct. Be encouraging and clear.`,
        max_tokens: 150,
      });
      setExplanation(res.data?.content || res.data?.response || 'See the answer above for explanation.');
    } catch {
      setExplanation('Think about why: ' + card.back);
    }
    setLoadingExplanation(false);
  };

  const handleAnswer = async (rating) => {
    if (!currentCard) return;

    // Spaced repetition update
    const newEase = rating === 'easy'
      ? Math.min(3.0, (currentCard.ease_factor || 2.5) + 0.15)
      : rating === 'hard'
      ? Math.max(1.3, (currentCard.ease_factor || 2.5) - 0.2)
      : rating === 'again'
      ? Math.max(1.3, (currentCard.ease_factor || 2.5) - 0.3)
      : currentCard.ease_factor || 2.5;

    const newInterval = rating === 'again' ? 1
      : rating === 'hard' ? Math.max(1, Math.floor((currentCard.interval_days || 1) * 1.2))
      : rating === 'medium' ? Math.floor((currentCard.interval_days || 1) * newEase)
      : Math.floor((currentCard.interval_days || 1) * newEase * 1.3);

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + newInterval);

    try {
      await base44.entities.RevisionFlashcard.update(currentCard.id, {
        difficulty_rating: rating,
        ease_factor: newEase,
        interval_days: newInterval,
        next_review: nextReview.toISOString(),
        review_count: (currentCard.review_count || 0) + 1,
      });
    } catch (e) {
      console.error('Failed to update card:', e);
    }

    setResults(prev => [...prev, { card: currentCard, rating }]);

    // Adaptive difficulty
    if (rating === 'easy' && difficulty < 2) setDifficulty(d => d + 1);
    if (rating === 'again' && difficulty > 0) setDifficulty(d => d - 1);

    if (currentIndex + 1 >= sessionCards.length) {
      setSessionDone(true);
    } else {
      setCurrentIndex(i => i + 1);
      setFlipped(false);
      setShowExplanation(false);
      setExplanation('');
    }
  };

  // Not started
  if (!sessionCards) {
    if (queue.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
          <Trophy className="w-16 h-16 text-emerald-400 mb-4" />
          <p className="text-white font-bold text-xl mb-2">All caught up!</p>
          <p className="text-slate-400 text-sm">No cards need urgent revision right now. Keep adding content and reviewing regularly.</p>
        </div>
      );
    }
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h2 className="text-white font-black text-xl mb-1">Adaptive Revision Mode</h2>
          <p className="text-slate-400 text-sm">AI-powered questions targeting your weakest areas, with auto-adjusting difficulty.</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
              <Brain className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <p className="text-white font-bold">Smart Session</p>
              <p className="text-slate-400 text-sm">{Math.min(10, queue.length)} cards prioritised by weakness</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            {[
              { label: 'Need Review', count: queue.filter(c => c.difficulty_rating === 'again').length, color: 'text-red-400' },
              { label: 'Struggling', count: queue.filter(c => c.difficulty_rating === 'hard').length, color: 'text-amber-400' },
              { label: 'Overdue', count: queue.filter(c => c.next_review && new Date(c.next_review) < new Date()).length, color: 'text-blue-400' },
            ].map(s => (
              <div key={s.label} className="bg-white/5 rounded-xl p-2">
                <p className={`font-black text-lg ${s.color}`}>{s.count}</p>
                <p className="text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
          <button onClick={startSession}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:brightness-110 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25">
            <Zap className="w-4 h-4" /> Start Adaptive Session
          </button>
        </div>
      </div>
    );
  }

  // Session done
  if (sessionDone) {
    const correct = results.filter(r => r.rating === 'easy').length;
    const hard = results.filter(r => r.rating === 'hard').length;
    const again = results.filter(r => r.rating === 'again').length;
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-violet-900/40 to-purple-900/30 border border-violet-500/30 rounded-2xl p-8 text-center">
          <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <p className="text-white font-black text-2xl mb-1">Session Complete!</p>
          <p className="text-slate-400 text-sm mb-6">Great work — your cards have been updated.</p>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div><p className="text-2xl font-black text-emerald-400">{correct}</p><p className="text-xs text-slate-400">Easy</p></div>
            <div><p className="text-2xl font-black text-amber-400">{hard}</p><p className="text-xs text-slate-400">Hard</p></div>
            <div><p className="text-2xl font-black text-red-400">{again}</p><p className="text-xs text-slate-400">Again</p></div>
          </div>
          <button onClick={startSession}
            className="w-full py-3 rounded-xl bg-violet-500 hover:bg-violet-400 text-white font-bold text-sm transition-all flex items-center justify-center gap-2">
            <RotateCcw className="w-4 h-4" /> Start Another Session
          </button>
        </motion.div>
      </div>
    );
  }

  // Active session
  const difficultyLabel = DIFFICULTY_ORDER[difficulty];
  const progress = ((currentIndex) / sessionCards.length) * 100;

  return (
    <div className="max-w-xl mx-auto space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
        <span>Card {currentIndex + 1} of {sessionCards.length}</span>
        <span className={`px-2 py-0.5 rounded-full font-bold ${
          difficulty === 0 ? 'bg-emerald-500/20 text-emerald-300' :
          difficulty === 1 ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-300'
        }`}>
          {difficultyLabel.charAt(0).toUpperCase() + difficultyLabel.slice(1)} Mode
        </span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
          animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
      </div>

      {/* Card */}
      <AnimatePresence mode="wait">
        <motion.div key={currentCard.id + flipped}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-6 min-h-[220px] flex flex-col">
          <p className="text-xs text-slate-500 mb-3 uppercase tracking-wider">
            {currentCard.notebook?.name || 'Flashcard'} — {flipped ? 'Answer' : 'Question'}
          </p>
          <div className="flex-1 flex items-center justify-center">
            <p className="text-white text-lg font-semibold text-center leading-relaxed">
              {flipped ? currentCard.back : currentCard.front}
            </p>
          </div>
          {!flipped && (
            <button onClick={() => setFlipped(true)}
              className="mt-4 w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-sm font-medium transition-all">
              Reveal Answer
            </button>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Answer buttons */}
      {flipped && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {[
              { rating: 'again', label: 'Again', color: 'bg-red-500/20 hover:bg-red-500/30 border-red-500/30 text-red-300', icon: XCircle },
              { rating: 'hard', label: 'Hard', color: 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/30 text-amber-300', icon: null },
              { rating: 'easy', label: 'Easy', color: 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/30 text-emerald-300', icon: CheckCircle },
            ].map(btn => (
              <button key={btn.rating} onClick={() => handleAnswer(btn.rating)}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border font-bold text-sm transition-all ${btn.color}`}>
                {btn.icon && <btn.icon className="w-4 h-4" />}
                {btn.label}
              </button>
            ))}
          </div>
          <button onClick={() => getExplanation(currentCard)}
            disabled={loadingExplanation}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-violet-500/10 hover:bg-violet-500/15 border border-violet-500/20 text-violet-300 text-xs font-medium transition-all">
            {loadingExplanation ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lightbulb className="w-3.5 h-3.5" />}
            {loadingExplanation ? 'Getting explanation...' : 'Explain this answer'}
          </button>

          {showExplanation && explanation && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4">
              <p className="text-violet-200 text-sm leading-relaxed">{explanation}</p>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}