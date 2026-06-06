import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import {
  Plus, Loader2, RotateCcw, Zap, X, Check, ChevronLeft, ChevronRight,
  Shuffle, ArrowLeft, Layers, Pencil, LayoutGrid
} from 'lucide-react';
import FlashcardEditor from './FlashcardEditor';
import FlashcardPacks from './FlashcardPacks';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function cleanText(text = '') {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/#{1,6}\s/g, '')
    .trim();
}

function getNextReview(rating, interval = 1, ease = 2.5) {
  const now = new Date();
  let newInterval = interval;
  let newEase = ease;
  if (rating === 'again')  { newInterval = 1; newEase = Math.max(1.3, ease - 0.2); }
  else if (rating === 'hard')   { newInterval = Math.max(1, interval * 1.2); newEase = Math.max(1.3, ease - 0.15); }
  else if (rating === 'medium') { newInterval = interval * ease; }
  else if (rating === 'easy')   { newInterval = interval * ease * 1.3; newEase = ease + 0.15; }
  newInterval = Math.round(newInterval);
  const next = new Date(now.getTime() + newInterval * 24 * 60 * 60 * 1000);
  return { next_review: next.toISOString(), interval_days: newInterval, ease_factor: newEase };
}

const DIFF_BADGE = {
  easy: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  medium: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  hard: 'text-red-400 bg-red-500/10 border-red-500/30',
};

const TYPE_LABELS = {
  definition: 'Definition', example: 'Example', formula: 'Formula',
  diagram: 'Diagram', comparison: 'Comparison', process: 'Process',
  cause_effect: 'Cause/Effect', general: 'General',
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FlashcardStudy({ notebook, user, flashcards, sources, onRefresh }) {
  const [tab, setTab] = useState('browse'); // 'browse' | 'packs' | 'editor'
  const [mode, setMode] = useState('idle'); // 'idle' | 'study' | 'match'
  const [studyQueue, setStudyQueue] = useState([]);
  const [studyIndex, setStudyIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [incorrect, setIncorrect] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(null);
  const [cancelGen] = useState({ cancelled: false });
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [matchPairs, setMatchPairs] = useState([]);
  const [matchSelected, setMatchSelected] = useState(null);
  const [matchMatched, setMatchMatched] = useState([]);
  const [matchWrong, setMatchWrong] = useState([]);

  const now = new Date();
  const dueCards = flashcards.filter(f => !f.next_review || new Date(f.next_review) <= now);

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const rateMutation = useMutation({
    mutationFn: async ({ card, rating }) => {
      const { next_review, interval_days, ease_factor } = getNextReview(rating, card.interval_days, card.ease_factor);
      await base44.entities.RevisionFlashcard.update(card.id, {
        difficulty_rating: rating, next_review, interval_days, ease_factor,
        review_count: (card.review_count || 0) + 1,
      });
    },
    onSuccess: onRefresh,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RevisionFlashcard.delete(id),
    onSuccess: onRefresh,
  });

  const createCardMutation = useMutation({
    mutationFn: () => base44.entities.RevisionFlashcard.create({
      notebook_id: notebook.id, student_email: user.email,
      front: newFront, back: newBack, is_ai_generated: false,
      difficulty_rating: 'medium', card_type: 'general',
    }),
    onSuccess: () => { setNewFront(''); setNewBack(''); setShowCreate(false); onRefresh(); },
  });

  // ─── AI Generation (upgraded) ───────────────────────────────────────────────
  const generateFromAI = async () => {
    if (generating) return;
    setGenerating(true);
    cancelGen.cancelled = false;
    const sourceParts = sources.filter(s => s.content_text);
    if (!sourceParts.length) { setGenerating(false); return; }

    const CHUNK = 5000;
    const batches = [];
    for (const src of sourceParts) {
      for (let offset = 0; offset < src.content_text.length; offset += CHUNK) {
        batches.push({ sourceName: src.name, sourceId: src.id, chunk: src.content_text.slice(offset, offset + CHUNK) });
      }
    }

    setGenProgress({ generated: 0, batchLabel: 'Starting…' });
    let totalCreated = 0;

    try {
      for (let i = 0; i < batches.length; i++) {
        if (cancelGen.cancelled) break;
        const batch = batches[i];
        setGenProgress({ generated: totalCreated, batchLabel: `Batch ${i + 1}/${batches.length} — ${batch.sourceName}` });

        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `You are an expert GCSE/A-Level revision card creator. Generate high-quality, exam-ready flashcards from this study material.

SOURCE: "${batch.sourceName}"
SUBJECT: "${notebook.subject || notebook.name}"

For each distinct concept, generate a flashcard with these fields:
- front: Clear, direct question (e.g. "Define photosynthesis", "What is Newton's Second Law?", "Compare mitosis and meiosis")
- back: Accurate, complete answer in clean plain text. NO asterisks, NO markdown, NO bullet symbols with *, NO bold/italic formatting. Use plain sentences.
- card_type: One of: definition, example, formula, diagram, comparison, process, cause_effect, general
- difficulty: One of: easy, medium, hard

Generate as many cards as the content supports. Cover definitions, formulas, examples, processes, and comparisons.

TEXT:
${batch.chunk}`,
          response_json_schema: {
            type: 'object',
            properties: {
              flashcards: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    front: { type: 'string' },
                    back: { type: 'string' },
                    card_type: { type: 'string' },
                    difficulty: { type: 'string' },
                  },
                  required: ['front', 'back']
                }
              }
            }
          }
        });

        const cards = result?.flashcards || [];
        for (const card of cards) {
          if (cancelGen.cancelled) break;
          if (!card.front?.trim() || !card.back?.trim()) continue;
          await base44.entities.RevisionFlashcard.create({
            notebook_id: notebook.id,
            student_email: user.email,
            front: cleanText(card.front),
            back: cleanText(card.back),
            is_ai_generated: true,
            source_id: batch.sourceId || null,
            card_type: card.card_type || 'general',
            difficulty_rating: card.difficulty || 'medium',
          });
          totalCreated++;
        }
        setGenProgress(p => ({ ...p, generated: totalCreated }));
        onRefresh();
      }
    } catch (e) { console.error(e); }

    setGenerating(false);
    setGenProgress(null);
    onRefresh();
  };

  // ─── Study / Match ───────────────────────────────────────────────────────────
  const startStudy = (cards) => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setStudyQueue(shuffled);
    setStudyIndex(0);
    setFlipped(false);
    setCorrect(0);
    setIncorrect(0);
    setMode('study');
  };

  const startMatch = (cards) => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5).slice(0, 6);
    const items = [
      ...shuffled.map((c, i) => ({ id: `f${i}`, cardId: c.id, text: cleanText(c.front), type: 'front' })),
      ...shuffled.map((c, i) => ({ id: `b${i}`, cardId: c.id, text: cleanText(c.back), type: 'back' })),
    ];
    setMatchPairs(items.sort(() => Math.random() - 0.5));
    setMatchSelected(null); setMatchMatched([]); setMatchWrong([]);
    setMode('match');
  };

  // ─── Study Mode ─────────────────────────────────────────────────────────────
  if (mode === 'study') {
    return (
      <StudyMode
        queue={studyQueue}
        index={studyIndex}
        setIndex={setStudyIndex}
        flipped={flipped}
        setFlipped={setFlipped}
        correct={correct}
        setCorrect={setCorrect}
        incorrect={incorrect}
        setIncorrect={setIncorrect}
        rateMutation={rateMutation}
        onExit={() => setMode('idle')}
      />
    );
  }

  // ─── Match Mode ─────────────────────────────────────────────────────────────
  if (mode === 'match') {
    const handleMatchSelect = (item) => {
      if (matchMatched.includes(item.id) || matchWrong.includes(item.id)) return;
      if (!matchSelected) { setMatchSelected(item); return; }
      if (matchSelected.id === item.id) { setMatchSelected(null); return; }
      if (matchSelected.cardId === item.cardId && matchSelected.type !== item.type) {
        setMatchMatched(m => [...m, matchSelected.id, item.id]);
        setMatchSelected(null);
      } else {
        setMatchWrong([matchSelected.id, item.id]);
        setTimeout(() => { setMatchWrong([]); setMatchSelected(null); }, 800);
      }
    };
    const allMatched = matchMatched.length === matchPairs.length;
    return (
      <div className="space-y-5 max-w-xl mx-auto">
        <div className="flex items-center justify-between">
          <button onClick={() => setMode('idle')} className="text-slate-400 hover:text-white text-sm flex items-center gap-1"><X className="w-4 h-4" /> Exit Match</button>
          <p className="text-slate-400 text-sm">{matchMatched.length / 2} / {matchPairs.length / 2} matched</p>
        </div>
        {allMatched ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">🎉</div>
            <p className="text-white font-black text-2xl mb-2">All matched!</p>
            <button onClick={() => startMatch(flashcards)} className="px-5 py-2.5 rounded-xl bg-violet-500 text-white font-bold">Play Again</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {matchPairs.map(item => {
              const isMatched = matchMatched.includes(item.id);
              const isSelected = matchSelected?.id === item.id;
              const isWrong = matchWrong.includes(item.id);
              return (
                <motion.button key={item.id} onClick={() => handleMatchSelect(item)}
                  animate={{ scale: isWrong ? [1, 1.05, 0.95, 1] : 1 }}
                  className={`p-3 rounded-2xl border-2 text-sm font-medium text-left transition-all min-h-[70px] flex items-center ${
                    isMatched ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300 opacity-50' :
                    isWrong ? 'border-red-500 bg-red-500/20 text-red-300' :
                    isSelected ? 'border-violet-400 bg-violet-500/30 text-violet-200' :
                    'border-white/10 bg-white/5 text-slate-300 hover:border-violet-500/40 hover:bg-white/10'
                  }`}>
                  {item.text}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─── Browse / Packs / Editor ─────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-white font-black text-xl">Flashcards</h2>
          <div className="flex items-center gap-3 text-sm mt-0.5">
            <span className="text-slate-400">{flashcards.length} cards</span>
            {dueCards.length > 0 && <span className="text-amber-400 font-medium">· {dueCards.length} due now</span>}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowCreate(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white text-sm font-medium transition-all">
            <Plus className="w-4 h-4" /> Manual
          </button>
          {generating ? (
            <button onClick={() => { cancelGen.cancelled = true; }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium">
              <Loader2 className="w-4 h-4 animate-spin" /> Cancel
            </button>
          ) : (
            <button onClick={generateFromAI}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-300 hover:text-violet-200 text-sm font-medium transition-all">
              ✨ AI Generate
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1">
        {[
          { id: 'browse', label: 'Browse', icon: LayoutGrid },
          { id: 'packs', label: 'Packs', icon: Layers },
          { id: 'editor', label: 'Editor', icon: Pencil },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === t.id ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
            }`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* Generation progress */}
      <AnimatePresence>
        {genProgress && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="rounded-2xl p-4 border border-amber-500/25 bg-amber-500/5 overflow-hidden">
            <div className="flex items-center gap-2 mb-1.5">
              <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              <p className="text-amber-300 text-sm font-bold">Generating high-quality flashcards…</p>
            </div>
            <p className="text-slate-400 text-xs mb-2 truncate">{genProgress.batchLabel}</p>
            <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400"
                animate={{ width: '60%' }} transition={{ duration: 1, repeat: Infinity, repeatType: 'reverse' }} />
            </div>
            <p className="text-slate-500 text-xs mt-1.5">{genProgress.generated} cards created (with types & difficulty labels)</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3 overflow-hidden">
            <div className="flex items-center justify-between">
              <p className="text-white font-semibold">Create Flashcard</p>
              <button onClick={() => setShowCreate(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <textarea value={newFront} onChange={e => setNewFront(e.target.value)} placeholder="Front (Question)…" rows={2}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500/50 placeholder:text-slate-500 resize-none" />
            <textarea value={newBack} onChange={e => setNewBack(e.target.value)} placeholder="Back (Answer — plain text only)…" rows={3}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500/50 placeholder:text-slate-500 resize-none" />
            <button onClick={() => createCardMutation.mutate()} disabled={!newFront || !newBack || createCardMutation.isPending}
              className="px-4 py-2 rounded-xl bg-violet-500 text-white font-bold text-sm disabled:opacity-40">
              {createCardMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null} Add Card
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TAB: Browse */}
      {tab === 'browse' && (
        <div className="space-y-4">
          {flashcards.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => startStudy(dueCards.length > 0 ? dueCards : flashcards)}
                className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold text-sm hover:brightness-110 transition-all">
                <Zap className="w-4 h-4" /> Study Due ({dueCards.length || flashcards.length})
              </button>
              <button onClick={() => startStudy(flashcards)}
                className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-sm hover:bg-white/10 transition-all">
                <RotateCcw className="w-4 h-4" /> Review All ({flashcards.length})
              </button>
            </div>
          )}

          {flashcards.length >= 4 && (
            <button onClick={() => startMatch(flashcards)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 border border-white/10 text-teal-300 hover:bg-white/10 text-sm font-medium transition-all">
              <Shuffle className="w-4 h-4" /> Match Game
            </button>
          )}

          {flashcards.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl">
              <div className="text-4xl mb-3">🗂️</div>
              <p className="text-white font-bold mb-1">No flashcards yet</p>
              <p className="text-slate-400 text-sm">Upload sources then use AI Generate, or create cards manually</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {flashcards.map((card, i) => {
                const isDue = !card.next_review || new Date(card.next_review) <= now;
                return (
                  <motion.div key={card.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                    className={`group bg-white/[0.04] border rounded-2xl p-4 transition-all ${isDue ? 'border-amber-500/30' : 'border-white/10'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                          {card.card_type && card.card_type !== 'general' && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-400">{TYPE_LABELS[card.card_type] || card.card_type}</span>
                          )}
                          {card.difficulty_rating && (
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${DIFF_BADGE[card.difficulty_rating] || ''}`}>
                              {card.difficulty_rating}
                            </span>
                          )}
                        </div>
                        <p className="text-white text-sm font-medium line-clamp-2">{cleanText(card.front)}</p>
                        <p className="text-slate-500 text-xs mt-1 line-clamp-2">{cleanText(card.back)}</p>
                      </div>
                      <button onClick={() => deleteMutation.mutate(card.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-500 hover:text-red-400 transition-all flex-shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs">
                      {isDue && <span className="text-amber-400 font-medium">Due now</span>}
                      {!isDue && card.next_review && <span className="text-slate-500">Due {new Date(card.next_review).toLocaleDateString()}</span>}
                      {card.review_count > 0 && <span className="text-slate-600">· {card.review_count}×</span>}
                      {card.is_ai_generated && <span className="text-violet-500">· AI</span>}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: Packs */}
      {tab === 'packs' && (
        <FlashcardPacks
          flashcards={flashcards}
          sources={sources}
          onStartStudy={startStudy}
        />
      )}

      {/* TAB: Editor */}
      {tab === 'editor' && (
        <FlashcardEditor
          flashcards={flashcards}
          notebook={notebook}
          user={user}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}

// ─── Study Mode Component ─────────────────────────────────────────────────────
function StudyMode({ queue, index, setIndex, flipped, setFlipped, correct, setCorrect, incorrect, setIncorrect, rateMutation, onExit }) {
  const card = queue[index];
  const total = queue.length;
  const done = index >= total || !card;
  const progress = total > 0 ? ((correct + incorrect) / total) * 100 : 0;

  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); setFlipped(f => !f); }
      if (e.code === 'ArrowLeft')  { e.preventDefault(); goBack(); }
      if (e.code === 'ArrowRight') { e.preventDefault(); goNext(); }
      if (e.key === '1' && flipped) rate('again');
      if (e.key === '2' && flipped) rate('hard');
      if (e.key === '3' && flipped) rate('medium');
      if (e.key === '4' && flipped) rate('easy');
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [flipped, index, queue]);

  const goNext = useCallback(() => {
    if (index < total - 1) { setIndex(i => i + 1); setFlipped(false); }
  }, [index, total]);

  const goBack = useCallback(() => {
    if (index > 0) { setIndex(i => i - 1); setFlipped(false); }
  }, [index]);

  const rate = useCallback((rating) => {
    if (!card) return;
    if (rating === 'easy' || rating === 'medium') setCorrect(c => c + 1);
    else setIncorrect(c => c + 1);
    rateMutation.mutate({ card, rating });
    if (index < total - 1) { setIndex(i => i + 1); setFlipped(false); }
  }, [card, index, total]);

  if (done) {
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-violet-950/30 to-slate-950 z-50 flex items-center justify-center p-6">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
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
            <button onClick={onExit} className="flex-1 py-3 rounded-2xl border border-white/10 text-slate-300 hover:bg-white/5 font-semibold transition-all">
              Back to Deck
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

  const diffBadge = DIFF_BADGE[card.difficulty_rating];

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-violet-950/20 to-slate-950 z-50 flex flex-col">
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/10">
        <button onClick={onExit} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Exit
        </button>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-500 font-medium">Card <span className="text-white font-bold">{index + 1}</span> of <span className="text-white font-bold">{total}</span></span>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-emerald-400 font-semibold"><Check className="w-3.5 h-3.5" /> {correct}</span>
            <span className="flex items-center gap-1 text-red-400 font-semibold"><X className="w-3.5 h-3.5" /> {incorrect}</span>
          </div>
        </div>
        <div className="w-20 text-right">
          <span className="text-xs text-slate-600">Space to flip</span>
        </div>
      </div>

      <div className="flex-shrink-0 h-1 bg-white/5">
        <motion.div className="h-full bg-gradient-to-r from-violet-500 to-purple-400"
          animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 overflow-hidden">
        <p className="text-slate-600 text-xs mb-6 tracking-wider uppercase font-medium">
          {flipped ? 'Answer revealed' : 'Click card to reveal answer'}
        </p>

        <div className="w-full cursor-pointer select-none" style={{ maxWidth: '800px', perspective: '1200px' }}
          onClick={() => setFlipped(f => !f)}>
          <motion.div animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
            style={{ transformStyle: 'preserve-3d', position: 'relative' }}>
            {/* Front */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-white/10 rounded-3xl shadow-2xl flex flex-col items-center justify-center text-center p-10 sm:p-14"
              style={{ backfaceVisibility: 'hidden', minHeight: '300px' }}>
              <div className="flex items-center gap-2 mb-6">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20">
                  <span className="text-violet-400 text-xs font-semibold uppercase tracking-widest">
                    {TYPE_LABELS[card.card_type] || 'Question'}
                  </span>
                </div>
                {card.difficulty_rating && (
                  <span className={`px-2.5 py-1 rounded-full border text-xs font-semibold ${diffBadge}`}>
                    {card.difficulty_rating}
                  </span>
                )}
              </div>
              <p className="text-white font-bold text-2xl sm:text-3xl leading-relaxed max-w-xl">{cleanText(card.front)}</p>
              <p className="text-slate-600 text-sm mt-8">Tap · Click · Press Space</p>
            </div>

            {/* Back */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-900/50 to-purple-900/50 border border-violet-400/20 rounded-3xl shadow-2xl flex flex-col items-center justify-center text-center p-10 sm:p-14"
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
                <span className="text-emerald-400 text-xs font-semibold uppercase tracking-widest">Answer</span>
              </div>
              <p className="text-white font-bold text-xl sm:text-2xl leading-relaxed max-w-xl">{cleanText(card.back)}</p>
            </div>
          </motion.div>
        </div>

        {/* Rating buttons — 4 levels */}
        <div className="mt-10 flex flex-col items-center gap-4 w-full max-w-[800px]">
          <div className="flex items-center gap-4 w-full">
            <button onClick={goBack} disabled={index === 0}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all font-medium text-sm flex-shrink-0">
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>

            <div className="flex gap-2 flex-1 justify-center">
              <AnimatePresence>
                {flipped && (
                  <>
                    {[
                      { key: 'again', label: 'Again', shortcut: '1', cls: 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20' },
                      { key: 'hard', label: 'Hard', shortcut: '2', cls: 'bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20' },
                      { key: 'medium', label: 'Good', shortcut: '3', cls: 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20' },
                      { key: 'easy', label: 'Easy', shortcut: '4', cls: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20' },
                    ].map((btn, i) => (
                      <motion.button key={btn.key}
                        initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }} transition={{ delay: i * 0.05 }}
                        onClick={() => rate(btn.key)}
                        className={`flex flex-col items-center px-4 py-3 rounded-2xl border font-bold text-sm transition-all ${btn.cls}`}>
                        {btn.label}
                        <span className="text-xs opacity-40 mt-0.5">[{btn.shortcut}]</span>
                      </motion.button>
                    ))}
                  </>
                )}
              </AnimatePresence>
              {!flipped && (
                <button onClick={() => setFlipped(true)}
                  className="px-8 py-3.5 rounded-2xl bg-violet-500/10 border border-violet-500/30 text-violet-300 hover:bg-violet-500/20 font-bold text-sm transition-all">
                  Reveal Answer
                </button>
              )}
            </div>

            <button onClick={goNext} disabled={index >= total - 1}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all font-medium text-sm flex-shrink-0">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-600">
            <span>← → navigate</span>
            <span>Space to flip</span>
            <span>1 Again · 2 Hard · 3 Good · 4 Easy</span>
          </div>
        </div>
      </div>
    </div>
  );
}