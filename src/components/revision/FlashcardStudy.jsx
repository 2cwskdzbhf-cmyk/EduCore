import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Plus, Loader2, RotateCcw, Zap, X, Check, ChevronRight } from 'lucide-react';

const RATING_BUTTONS = [
  { id: 'again', label: 'Again', color: 'bg-red-500 hover:bg-red-400', desc: '<1 min' },
  { id: 'hard', label: 'Hard', color: 'bg-orange-500 hover:bg-orange-400', desc: '~6 min' },
  { id: 'medium', label: 'Good', color: 'bg-blue-500 hover:bg-blue-400', desc: '~10 min' },
  { id: 'easy', label: 'Easy', color: 'bg-emerald-500 hover:bg-emerald-400', desc: 'days' },
];

function getNextReview(rating, interval = 1, ease = 2.5) {
  const now = new Date();
  let newInterval = interval;
  let newEase = ease;

  if (rating === 'again') { newInterval = 1; newEase = Math.max(1.3, ease - 0.2); }
  else if (rating === 'hard') { newInterval = Math.max(1, interval * 1.2); newEase = Math.max(1.3, ease - 0.15); }
  else if (rating === 'medium') { newInterval = interval * ease; }
  else if (rating === 'easy') { newInterval = interval * ease * 1.3; newEase = ease + 0.15; }

  newInterval = Math.round(newInterval);
  const next = new Date(now.getTime() + newInterval * 24 * 60 * 60 * 1000);
  return { next_review: next.toISOString(), interval_days: newInterval, ease_factor: newEase };
}

export default function FlashcardStudy({ notebook, user, flashcards, sources, onRefresh }) {
  const [mode, setMode] = useState('browse'); // 'browse' | 'study' | 'create'
  const [studyIndex, setStudyIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [studyQueue, setStudyQueue] = useState([]);

  const now = new Date();
  const dueCards = flashcards.filter(f => !f.next_review || new Date(f.next_review) <= now);
  const allCards = flashcards;

  const rateMutation = useMutation({
    mutationFn: async ({ card, rating }) => {
      const { next_review, interval_days, ease_factor } = getNextReview(rating, card.interval_days, card.ease_factor);
      await base44.entities.RevisionFlashcard.update(card.id, {
        difficulty_rating: rating,
        next_review,
        interval_days,
        ease_factor,
        review_count: (card.review_count || 0) + 1,
      });
    },
    onSuccess: () => {
      onRefresh();
      const next = studyIndex + 1;
      if (next >= studyQueue.length) {
        setMode('browse');
        setStudyIndex(0);
      } else {
        setStudyIndex(next);
        setFlipped(false);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RevisionFlashcard.delete(id),
    onSuccess: onRefresh,
  });

  const createCardMutation = useMutation({
    mutationFn: () => base44.entities.RevisionFlashcard.create({
      notebook_id: notebook.id,
      student_email: user.email,
      front: newFront,
      back: newBack,
      is_ai_generated: false,
    }),
    onSuccess: () => { setNewFront(''); setNewBack(''); onRefresh(); },
  });

  const generateFromAI = async () => {
    if (generating) return;
    setGenerating(true);
    const contextParts = sources.filter(s => s.content_text).map(s => s.content_text.slice(0, 5000)).join('\n\n');
    if (!contextParts) { setGenerating(false); alert('Upload some sources first!'); return; }

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate 15 high-quality revision flashcards from this content. Return ONLY a JSON array like: [{"front": "question", "back": "answer"}, ...]. Make the questions test key concepts, definitions, and important facts.`,
        system_prompt: `You are creating flashcards for a GCSE/A-Level student studying ${notebook.subject || 'the subject'}. Content: ${contextParts}`,
        response_json_schema: {
          type: 'object',
          properties: {
            flashcards: {
              type: 'array',
              items: { type: 'object', properties: { front: { type: 'string' }, back: { type: 'string' } } }
            }
          }
        }
      });
      const cards = result?.flashcards || [];
      for (const card of cards) {
        await base44.entities.RevisionFlashcard.create({
          notebook_id: notebook.id,
          student_email: user.email,
          front: card.front,
          back: card.back,
          is_ai_generated: true,
        });
      }
      await base44.entities.RevisionNotebook.update(notebook.id, { flashcard_count: flashcards.length + cards.length });
      onRefresh();
    } catch (e) {}
    setGenerating(false);
  };

  const startStudy = (cards) => {
    setStudyQueue([...cards].sort(() => Math.random() - 0.5));
    setStudyIndex(0);
    setFlipped(false);
    setMode('study');
  };

  // Study mode
  if (mode === 'study' && studyQueue.length > 0) {
    const card = studyQueue[studyIndex];
    if (!card) { setMode('browse'); return null; }
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => setMode('browse')} className="text-slate-400 hover:text-white text-sm flex items-center gap-1">
            <X className="w-4 h-4" /> Exit
          </button>
          <p className="text-slate-400 text-sm">{studyIndex + 1} / {studyQueue.length}</p>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-violet-500 to-purple-400 rounded-full transition-all duration-500"
            style={{ width: `${((studyIndex) / studyQueue.length) * 100}%` }} />
        </div>

        {/* Card */}
        <motion.div className="relative cursor-pointer" style={{ perspective: 1000 }} onClick={() => setFlipped(f => !f)}>
          <motion.div
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ duration: 0.5, type: 'spring', stiffness: 200 }}
            style={{ transformStyle: 'preserve-3d' }}
            className="relative">
            {/* Front */}
            <div className="backface-hidden bg-white/5 border border-white/15 rounded-3xl p-10 min-h-[240px] flex flex-col items-center justify-center text-center"
              style={{ backfaceVisibility: 'hidden' }}>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-4">Question</p>
              <p className="text-white font-bold text-xl leading-relaxed">{card.front}</p>
              {!flipped && <p className="text-slate-500 text-xs mt-6">Tap to reveal answer</p>}
            </div>
            {/* Back */}
            <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-violet-900/40 to-purple-900/30 border border-violet-500/30 rounded-3xl p-10 flex flex-col items-center justify-center text-center"
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
              <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider mb-4">Answer</p>
              <p className="text-white font-bold text-xl leading-relaxed">{card.back}</p>
            </div>
          </motion.div>
        </motion.div>

        {/* Rating buttons */}
        <AnimatePresence>
          {flipped && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-4 gap-2">
              {RATING_BUTTONS.map(r => (
                <button key={r.id} onClick={() => rateMutation.mutate({ card, rating: r.id })}
                  disabled={rateMutation.isPending}
                  className={`${r.color} text-white font-bold py-3 rounded-2xl text-sm transition-all flex flex-col items-center`}>
                  {r.label}
                  <span className="text-xs opacity-70 mt-0.5">{r.desc}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Browse mode
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-black text-xl">Flashcards</h2>
          <p className="text-slate-400 text-sm">{allCards.length} cards · {dueCards.length} due now</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setMode('create')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white text-sm font-medium transition-all">
            <Plus className="w-4 h-4" /> Manual
          </button>
          <button onClick={generateFromAI} disabled={generating}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-violet-300 hover:text-violet-200 text-sm font-medium transition-all">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : '✨'} AI Generate
          </button>
        </div>
      </div>

      {/* Study buttons */}
      {allCards.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => startStudy(dueCards.length > 0 ? dueCards : allCards)}
            className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold text-sm hover:brightness-110 transition-all">
            <Zap className="w-4 h-4" /> Study Due ({dueCards.length || allCards.length})
          </button>
          <button onClick={() => startStudy(allCards)}
            className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-sm hover:bg-white/10 transition-all">
            <RotateCcw className="w-4 h-4" /> Review All ({allCards.length})
          </button>
        </div>
      )}

      {/* Create form */}
      <AnimatePresence>
        {mode === 'create' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-white font-semibold">Create Flashcard</p>
              <button onClick={() => setMode('browse')}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <textarea value={newFront} onChange={e => setNewFront(e.target.value)} placeholder="Front (Question)..." rows={3}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500/50 placeholder:text-slate-500 resize-none" />
            <textarea value={newBack} onChange={e => setNewBack(e.target.value)} placeholder="Back (Answer)..." rows={3}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500/50 placeholder:text-slate-500 resize-none" />
            <button onClick={() => createCardMutation.mutate()} disabled={!newFront || !newBack || createCardMutation.isPending}
              className="px-4 py-2 rounded-xl bg-violet-500 text-white font-bold text-sm disabled:opacity-40">
              {createCardMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null} Add Card
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cards grid */}
      {allCards.length === 0 && (
        <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl">
          <div className="text-4xl mb-3">🗂️</div>
          <p className="text-white font-bold mb-1">No flashcards yet</p>
          <p className="text-slate-400 text-sm">Upload sources then use AI Generate, or create cards manually</p>
        </div>
      )}
      {allCards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {allCards.map((card, i) => {
            const isDue = !card.next_review || new Date(card.next_review) <= now;
            return (
              <motion.div key={card.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className={`group bg-white/[0.04] border rounded-2xl p-4 transition-all ${isDue ? 'border-amber-500/30' : 'border-white/10'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium line-clamp-2">{card.front}</p>
                    <p className="text-slate-500 text-xs mt-1 line-clamp-2">{card.back}</p>
                  </div>
                  <button onClick={() => deleteMutation.mutate(card.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-500 hover:text-red-400 transition-all flex-shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-3 text-xs">
                  {isDue && <span className="text-amber-400 font-medium">Due now</span>}
                  {!isDue && card.next_review && <span className="text-slate-500">Due {new Date(card.next_review).toLocaleDateString()}</span>}
                  {card.review_count > 0 && <span className="text-slate-600">· reviewed {card.review_count}×</span>}
                  {card.is_ai_generated && <span className="text-violet-500">· AI</span>}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}