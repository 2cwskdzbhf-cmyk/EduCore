import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import {
  Plus, Loader2, RotateCcw, Zap, X, Check, ChevronLeft, ChevronRight,
  Shuffle, ArrowLeft, Edit3, Layers, Star
} from 'lucide-react';
import { cleanText, getNextReview, CARD_TYPES, DIFFICULTY_CONFIG, getCardTypeConfig } from './flashcards/FlashcardUtils';
import FlashcardEditor from './flashcards/FlashcardEditor';
import FlashcardPacksView from './flashcards/FlashcardPacksView';
import FlashcardGeneratePanel from './flashcards/FlashcardGeneratePanel';

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FlashcardStudy({ notebook, user, flashcards, sources, onRefresh }) {
  const [mode, setMode] = useState('browse'); // 'browse' | 'study' | 'match' | 'packs'
  const [browseTab, setBrowseTab] = useState('all'); // 'all' | 'generate'
  const [studyQueue, setStudyQueue] = useState([]);
  const [studyIndex, setStudyIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [incorrect, setIncorrect] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [newType, setNewType] = useState('general');
  const [newDifficulty, setNewDifficulty] = useState('medium');
  const [editingCard, setEditingCard] = useState(null);
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterFav, setFilterFav] = useState(false);

  // Match game
  const [matchPairs, setMatchPairs] = useState([]);
  const [matchSelected, setMatchSelected] = useState(null);
  const [matchMatched, setMatchMatched] = useState([]);
  const [matchWrong, setMatchWrong] = useState([]);

  const now = new Date();
  const dueCards = flashcards.filter(f => !f.next_review || new Date(f.next_review) <= now);

  // ─── Filtered browse list ─────────────────────────────────────────────────
  const filteredCards = flashcards.filter(fc => {
    if (filterFav && !fc.is_favourite) return false;
    if (filterDifficulty !== 'all' && fc.difficulty_rating !== filterDifficulty) return false;
    if (filterType !== 'all' && fc.card_type !== filterType) return false;
    return true;
  });

  // ─── Mutations ───────────────────────────────────────────────────────────────
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
      front: cleanText(newFront), back: cleanText(newBack),
      card_type: newType, difficulty_rating: newDifficulty, is_ai_generated: false,
    }),
    onSuccess: () => { setNewFront(''); setNewBack(''); setShowCreate(false); onRefresh(); },
  });

  const toggleFavMutation = useMutation({
    mutationFn: ({ id, val }) => base44.entities.RevisionFlashcard.update(id, { is_favourite: val }),
    onSuccess: onRefresh,
  });

  // ─── Study mode ───────────────────────────────────────────────────────────
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
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    const pairs = shuffled.slice(0, 6);
    const items = [
      ...pairs.map((c, i) => ({ id: `f${i}`, cardId: c.id, text: cleanText(c.front), type: 'front' })),
      ...pairs.map((c, i) => ({ id: `b${i}`, cardId: c.id, text: cleanText(c.back), type: 'back' })),
    ];
    setMatchPairs(items.sort(() => Math.random() - 0.5));
    setMatchSelected(null); setMatchMatched([]); setMatchWrong([]);
    setMode('match');
  };

  // ─── Study render ─────────────────────────────────────────────────────────
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
        onExit={() => setMode('browse')}
      />
    );
  }

  // ─── Match render ─────────────────────────────────────────────────────────
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
          <button onClick={() => setMode('browse')} className="text-slate-400 hover:text-white text-sm flex items-center gap-1"><X className="w-4 h-4" /> Exit</button>
          <p className="text-slate-400 text-sm">{matchMatched.length / 2} / {matchPairs.length / 2} matched</p>
        </div>
        {allMatched ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">🎉</div>
            <p className="text-white font-black text-2xl mb-4">All matched!</p>
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

  // ─── Browse render ────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-black text-xl">Flashcards</h2>
          <div className="flex items-center gap-3 text-sm mt-0.5">
            <span className="text-slate-400">{flashcards.length} cards</span>
            {dueCards.length > 0 && <span className="text-amber-400 font-medium">· {dueCards.length} due now</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setMode(mode === 'packs' ? 'browse' : 'packs')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${mode === 'packs' ? 'bg-violet-500/20 border-violet-500/30 text-violet-300' : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'}`}>
            <Layers className="w-4 h-4" /> Packs
          </button>
          <button onClick={() => setShowCreate(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white text-sm font-medium transition-all">
            <Plus className="w-4 h-4" /> Create
          </button>
        </div>
      </div>

      {/* Packs view */}
      {mode === 'packs' && (
        <FlashcardPacksView flashcards={flashcards} sources={sources} onStudyPack={startStudy} />
      )}

      {/* Browse view */}
      {mode === 'browse' && (
        <>
          {/* Tabs: All cards vs Generate */}
          <div className="flex gap-1 border-b border-white/10">
            {['all', 'generate'].map(tab => (
              <button key={tab} onClick={() => setBrowseTab(tab)}
                className={`px-4 py-2 text-sm font-medium capitalize transition-all border-b-2 -mb-px ${
                  browseTab === tab ? 'border-violet-400 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}>
                {tab === 'generate' ? '✨ AI Generate' : 'All Cards'}
              </button>
            ))}
          </div>

          {browseTab === 'generate' && (
            <FlashcardGeneratePanel notebook={notebook} sources={sources} user={user} onGenerated={onRefresh} />
          )}

          {browseTab === 'all' && (
            <>
              {/* Study actions */}
              {flashcards.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => startStudy(dueCards.length > 0 ? dueCards : flashcards)}
                    className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold text-sm hover:brightness-110 transition-all">
                    <Zap className="w-4 h-4" /> Study Due ({dueCards.length || flashcards.length})
                  </button>
                  <button onClick={() => startStudy(flashcards)}
                    className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-sm hover:bg-white/10 transition-all">
                    <RotateCcw className="w-4 h-4" /> Review All
                  </button>
                </div>
              )}
              {flashcards.length >= 4 && (
                <button onClick={() => startMatch(flashcards)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-teal-300 hover:bg-white/10 text-sm font-medium transition-all">
                  <Shuffle className="w-4 h-4" /> Match Game
                </button>
              )}

              {/* Filters */}
              {flashcards.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs text-slate-600 uppercase tracking-wider">Filter:</span>
                  <button onClick={() => setFilterFav(f => !f)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${filterFav ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'border-white/10 text-slate-500 hover:text-white'}`}>
                    <Star className="w-3 h-3" /> Favourites
                  </button>
                  {['easy', 'medium', 'hard'].map(d => (
                    <button key={d} onClick={() => setFilterDifficulty(filterDifficulty === d ? 'all' : d)}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-medium capitalize transition-all ${
                        filterDifficulty === d ? DIFFICULTY_CONFIG[d].bg + ' ' + DIFFICULTY_CONFIG[d].color : 'border-white/10 text-slate-500 hover:text-white'
                      }`}>
                      {d}
                    </button>
                  ))}
                  {CARD_TYPES.map(t => (
                    <button key={t.id} onClick={() => setFilterType(filterType === t.id ? 'all' : t.id)}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                        filterType === t.id ? t.bg + ' ' + t.color : 'border-white/10 text-slate-500 hover:text-white'
                      }`}>
                      {t.emoji}
                    </button>
                  ))}
                </div>
              )}

              {/* Create form */}
              <AnimatePresence>
                {showCreate && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <p className="text-white font-semibold text-sm">Create Card</p>
                      <button onClick={() => setShowCreate(false)}><X className="w-4 h-4 text-slate-400" /></button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {CARD_TYPES.map(t => (
                        <button key={t.id} onClick={() => setNewType(t.id)}
                          className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${newType === t.id ? t.bg + ' ' + t.color : 'border-white/10 text-slate-500 hover:text-white'}`}>
                          {t.emoji} {t.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      {['easy','medium','hard'].map(d => (
                        <button key={d} onClick={() => setNewDifficulty(d)}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-bold capitalize border transition-all ${newDifficulty === d ? DIFFICULTY_CONFIG[d].bg + ' ' + DIFFICULTY_CONFIG[d].color : 'border-white/10 text-slate-500'}`}>
                          {d}
                        </button>
                      ))}
                    </div>
                    <textarea value={newFront} onChange={e => setNewFront(e.target.value)} placeholder="Front — question or prompt…" rows={2}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500/50 placeholder:text-slate-500 resize-none" />
                    <textarea value={newBack} onChange={e => setNewBack(e.target.value)} placeholder="Back — answer in plain text, no markdown…" rows={3}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500/50 placeholder:text-slate-500 resize-none" />
                    <button onClick={() => createCardMutation.mutate()} disabled={!newFront || !newBack || createCardMutation.isPending}
                      className="px-4 py-2 rounded-xl bg-violet-500 text-white font-bold text-sm disabled:opacity-40">
                      {createCardMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null} Add Card
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Empty state */}
              {filteredCards.length === 0 && (
                <div className="text-center py-14 border border-dashed border-white/10 rounded-2xl">
                  <div className="text-4xl mb-3">🗂️</div>
                  <p className="text-white font-bold mb-1">No cards here</p>
                  <p className="text-slate-400 text-sm">Use the AI Generate tab or create cards manually</p>
                </div>
              )}

              {/* Cards grid */}
              {filteredCards.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredCards.map((card, i) => {
                    const isDue = !card.next_review || new Date(card.next_review) <= now;
                    const typeConfig = getCardTypeConfig(card.card_type);
                    const diffConfig = DIFFICULTY_CONFIG[card.difficulty_rating];
                    return (
                      <motion.div key={card.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                        className={`group bg-white/[0.04] border rounded-2xl p-4 transition-all hover:bg-white/[0.06] ${isDue ? 'border-amber-500/25' : 'border-white/10'}`}>
                        {/* Type + difficulty badges */}
                        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                          {typeConfig && (
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${typeConfig.bg} ${typeConfig.color}`}>
                              {typeConfig.emoji} {typeConfig.label}
                            </span>
                          )}
                          {diffConfig && (
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${diffConfig.bg} ${diffConfig.color}`}>
                              {diffConfig.label}
                            </span>
                          )}
                          {card.is_favourite && <Star className="w-3 h-3 text-amber-400 fill-current" />}
                        </div>

                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium line-clamp-2">{cleanText(card.front)}</p>
                            <p className="text-slate-500 text-xs mt-1 line-clamp-2">{cleanText(card.back)}</p>
                          </div>
                        </div>

                        {/* Tags */}
                        {card.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {card.tags.map(tag => (
                              <span key={tag} className="text-xs text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded-full">#{tag}</span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-3">
                          {isDue && <span className="text-amber-400 text-xs font-medium">Due now</span>}
                          {!isDue && card.next_review && <span className="text-slate-600 text-xs">Due {new Date(card.next_review).toLocaleDateString()}</span>}
                          {card.review_count > 0 && <span className="text-slate-600 text-xs">· {card.review_count}×</span>}
                          <div className="flex-1" />
                          <button onClick={() => toggleFavMutation.mutate({ id: card.id, val: !card.is_favourite })}
                            className={`opacity-0 group-hover:opacity-100 p-1 rounded-lg transition-all ${card.is_favourite ? 'text-amber-400 opacity-100' : 'text-slate-600 hover:text-amber-400'}`}>
                            <Star className={`w-3.5 h-3.5 ${card.is_favourite ? 'fill-current' : ''}`} />
                          </button>
                          <button onClick={() => setEditingCard(card)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-600 hover:text-violet-400 transition-all">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteMutation.mutate(card.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-600 hover:text-red-400 transition-all">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Edit modal */}
      <AnimatePresence>
        {editingCard && (
          <FlashcardEditor
            card={editingCard}
            onClose={() => setEditingCard(null)}
            onSave={() => { setEditingCard(null); onRefresh(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Study Mode ───────────────────────────────────────────────────────────────
function StudyMode({ queue, index, setIndex, flipped, setFlipped, correct, setCorrect, incorrect, setIncorrect, rateMutation, onExit }) {
  const card = queue[index];
  const total = queue.length;
  const done = index >= total || !card;
  const progress = total > 0 ? ((correct + incorrect) / total) * 100 : 0;

  const typeConfig = card ? getCardTypeConfig(card.card_type) : null;
  const diffConfig = card ? DIFFICULTY_CONFIG[card.difficulty_rating] : null;

  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); setFlipped(f => !f); }
      if (e.code === 'ArrowLeft') { e.preventDefault(); if (index > 0) { setIndex(i => i - 1); setFlipped(false); } }
      if (e.code === 'ArrowRight') { e.preventDefault(); if (index < total - 1) { setIndex(i => i + 1); setFlipped(false); } }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [flipped, index, total]);

  const handleRate = useCallback((rating) => {
    if (!card) return;
    if (rating === 'easy') setCorrect(c => c + 1);
    else setIncorrect(c => c + 1);
    rateMutation.mutate({ card, rating });
    if (index < total - 1) { setIndex(i => i + 1); setFlipped(false); }
    else setIndex(total);
  }, [card, index, total]);

  if (done) {
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-violet-950/30 to-slate-950 z-50 flex items-center justify-center p-6">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="bg-slate-900/90 border border-white/10 rounded-3xl p-10 max-w-md w-full text-center shadow-2xl">
          <div className="text-6xl mb-4">{pct >= 80 ? '🏆' : pct >= 50 ? '⭐' : '📖'}</div>
          <h2 className="text-white font-black text-3xl mb-2">Session Complete!</h2>
          <p className="text-slate-400 mb-8">You reviewed {total} cards</p>
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
              <p className="text-emerald-400 font-black text-3xl">{correct}</p>
              <p className="text-emerald-400/70 text-xs mt-1">Correct</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
              <p className="text-red-400 font-black text-3xl">{incorrect}</p>
              <p className="text-red-400/70 text-xs mt-1">To review</p>
            </div>
            <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-4">
              <p className="text-violet-400 font-black text-3xl">{pct}%</p>
              <p className="text-violet-400/70 text-xs mt-1">Score</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={onExit} className="flex-1 py-3 rounded-2xl border border-white/10 text-slate-300 hover:bg-white/5 font-semibold">Back to Deck</button>
            <button onClick={() => { setIndex(0); setFlipped(false); setCorrect(0); setIncorrect(0); }}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold hover:brightness-110">
              Study Again
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-violet-950/20 to-slate-950 z-50 flex flex-col">
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/10">
        <button onClick={onExit} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Exit
        </button>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-500">Card <span className="text-white font-bold">{index + 1}</span> of <span className="text-white font-bold">{total}</span></span>
          <span className="text-emerald-400 font-semibold">{correct} ✓</span>
          <span className="text-red-400 font-semibold">{incorrect} ✗</span>
        </div>
        <span className="text-xs text-slate-600">Space to flip</span>
      </div>

      <div className="flex-shrink-0 h-1 bg-white/5">
        <motion.div className="h-full bg-gradient-to-r from-violet-500 to-purple-400"
          animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <p className="text-slate-600 text-xs mb-6 tracking-wider uppercase">
          {flipped ? 'Answer revealed' : 'Click to reveal'}
        </p>

        <div className="w-full cursor-pointer select-none" style={{ maxWidth: '800px', perspective: '1200px' }}
          onClick={() => setFlipped(f => !f)}>
          <motion.div animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
            style={{ transformStyle: 'preserve-3d', position: 'relative' }}>
            {/* Front */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-white/10 rounded-3xl shadow-2xl flex flex-col items-center justify-center text-center p-10 sm:p-14"
              style={{ backfaceVisibility: 'hidden', minHeight: '300px' }}>
              <div className="flex items-center gap-2 mb-6">
                {typeConfig && (
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${typeConfig.bg} ${typeConfig.color}`}>
                    {typeConfig.emoji} {typeConfig.label}
                  </span>
                )}
                {diffConfig && (
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${diffConfig.bg} ${diffConfig.color}`}>
                    {diffConfig.label}
                  </span>
                )}
              </div>
              <p className="text-white font-bold text-2xl sm:text-3xl leading-relaxed max-w-xl">{cleanText(card.front)}</p>
              <p className="text-slate-600 text-sm mt-8">Tap · Space · Enter</p>
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

        <div className="mt-10 flex items-center gap-4 w-full max-w-[800px]">
          <button onClick={() => { if (index > 0) { setIndex(i => i - 1); setFlipped(false); } }} disabled={index === 0}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed font-medium text-sm flex-shrink-0">
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>

          <div className="flex gap-3 flex-1 justify-center">
            <AnimatePresence>
              {flipped && (
                <>
                  {['again', 'hard', 'medium', 'easy'].map((r, ri) => (
                    <motion.button key={r}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                      transition={{ delay: ri * 0.05 }}
                      onClick={() => handleRate(r)}
                      className={`flex-1 py-3 rounded-2xl border font-bold text-xs capitalize transition-all ${DIFFICULTY_CONFIG[r]?.bg} ${DIFFICULTY_CONFIG[r]?.color}`}>
                      {r}
                    </motion.button>
                  ))}
                </>
              )}
            </AnimatePresence>
            {!flipped && (
              <button onClick={() => setFlipped(true)}
                className="px-8 py-3.5 rounded-2xl bg-violet-500/10 border border-violet-500/30 text-violet-300 hover:bg-violet-500/20 font-bold text-sm">
                Reveal Answer
              </button>
            )}
          </div>

          <button onClick={() => { if (index < total - 1) { setIndex(i => i + 1); setFlipped(false); } }} disabled={index >= total - 1}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed font-medium text-sm flex-shrink-0">
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}