import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Pencil, Scissors, GitMerge, Tag, Heart, HeartOff, Check, X, Loader2, ChevronDown } from 'lucide-react';

const DIFFICULTY_OPTS = ['easy', 'medium', 'hard'];
const CARD_TYPE_OPTS = ['definition', 'example', 'formula', 'diagram', 'comparison', 'process', 'cause_effect', 'general'];
const TYPE_LABELS = { definition: 'Definition', example: 'Example', formula: 'Formula', diagram: 'Diagram', comparison: 'Comparison', process: 'Process', cause_effect: 'Cause/Effect', general: 'General' };

const DIFF_COLOURS = {
  easy: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  medium: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  hard: 'text-red-400 border-red-500/30 bg-red-500/10',
};

function cleanText(text = '') {
  return text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/__(.*?)__/g, '$1').replace(/_(.*?)_/g, '$1').replace(/`([^`]+)`/g, '$1').replace(/```[\s\S]*?```/g, '').replace(/#{1,6}\s/g, '').trim();
}

export default function FlashcardEditor({ flashcards, notebook, user, onRefresh }) {
  const [editingId, setEditingId] = useState(null);
  const [editFront, setEditFront] = useState('');
  const [editBack, setEditBack] = useState('');
  const [editDiff, setEditDiff] = useState('medium');
  const [editType, setEditType] = useState('general');
  const [editTags, setEditTags] = useState('');
  const [mergeIds, setMergeIds] = useState([]);
  const [search, setSearch] = useState('');
  const [filterDiff, setFilterDiff] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RevisionFlashcard.update(id, data),
    onSuccess: () => { setEditingId(null); onRefresh(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RevisionFlashcard.delete(id),
    onSuccess: onRefresh,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.RevisionFlashcard.create(data),
    onSuccess: onRefresh,
  });

  const startEdit = (card) => {
    setEditingId(card.id);
    setEditFront(cleanText(card.front));
    setEditBack(cleanText(card.back));
    setEditDiff(card.difficulty_rating || 'medium');
    setEditType(card.card_type || 'general');
    setEditTags((card.tags || []).join(', '));
  };

  const saveEdit = (card) => {
    updateMutation.mutate({
      id: card.id,
      data: {
        front: editFront,
        back: editBack,
        difficulty_rating: editDiff,
        card_type: editType,
        tags: editTags.split(',').map(t => t.trim()).filter(Boolean),
      }
    });
  };

  const toggleFavourite = (card) => {
    updateMutation.mutate({ id: card.id, data: { is_favourite: !card.is_favourite } });
  };

  const splitCard = (card) => {
    // Split into two cards at the first newline or sentence boundary
    const mid = card.back.indexOf('\n') > 0 ? card.back.indexOf('\n') : Math.floor(card.back.length / 2);
    const part1 = card.back.slice(0, mid).trim();
    const part2 = card.back.slice(mid).trim();
    if (!part1 || !part2) return;
    createMutation.mutate({
      notebook_id: notebook.id,
      student_email: user.email,
      front: card.front + ' (Part 1)',
      back: part1,
      difficulty_rating: card.difficulty_rating,
      card_type: card.card_type,
      is_ai_generated: card.is_ai_generated,
    });
    createMutation.mutate({
      notebook_id: notebook.id,
      student_email: user.email,
      front: card.front + ' (Part 2)',
      back: part2,
      difficulty_rating: card.difficulty_rating,
      card_type: card.card_type,
      is_ai_generated: card.is_ai_generated,
    });
    deleteMutation.mutate(card.id);
  };

  const toggleMergeSelect = (id) => {
    setMergeIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const mergeCards = async () => {
    if (mergeIds.length < 2) return;
    const toMerge = flashcards.filter(f => mergeIds.includes(f.id));
    const mergedFront = toMerge.map(f => cleanText(f.front)).join(' / ');
    const mergedBack = toMerge.map(f => cleanText(f.back)).join('\n\n');
    await createMutation.mutateAsync({
      notebook_id: notebook.id,
      student_email: user.email,
      front: mergedFront,
      back: mergedBack,
      difficulty_rating: 'medium',
      card_type: 'general',
      is_ai_generated: false,
    });
    for (const id of mergeIds) await deleteMutation.mutateAsync(id);
    setMergeIds([]);
    onRefresh();
  };

  const filtered = flashcards.filter(fc => {
    const q = search.toLowerCase();
    const matchSearch = !q || fc.front?.toLowerCase().includes(q) || fc.back?.toLowerCase().includes(q);
    const matchDiff = filterDiff === 'all' || fc.difficulty_rating === filterDiff;
    const matchType = filterType === 'all' || fc.card_type === filterType;
    return matchSearch && matchDiff && matchType;
  });

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search cards…"
          className="flex-1 min-w-[160px] px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50"
        />
        <select value={filterDiff} onChange={e => setFilterDiff(e.target.value)}
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none">
          <option value="all">All Difficulties</option>
          {DIFFICULTY_OPTS.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none">
          <option value="all">All Types</option>
          {CARD_TYPE_OPTS.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
        </select>
        {mergeIds.length >= 2 && (
          <button onClick={mergeCards}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-300 text-sm font-semibold transition-all hover:bg-blue-500/30">
            <GitMerge className="w-3.5 h-3.5" /> Merge ({mergeIds.length})
          </button>
        )}
      </div>

      <p className="text-slate-500 text-xs">{filtered.length} of {flashcards.length} cards</p>

      {filtered.length === 0 && (
        <p className="text-slate-500 text-sm text-center py-8">No cards match your filters.</p>
      )}

      <div className="space-y-2">
        {filtered.map(card => {
          const isEditing = editingId === card.id;
          const isMergeSelected = mergeIds.includes(card.id);

          return (
            <motion.div key={card.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className={`rounded-2xl border transition-all ${
                isMergeSelected ? 'border-blue-500/50 bg-blue-500/10'
                : isEditing ? 'border-violet-500/50 bg-violet-500/5'
                : 'border-white/10 bg-white/[0.03]'
              }`}>
              {!isEditing ? (
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {card.card_type && card.card_type !== 'general' && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-400">{TYPE_LABELS[card.card_type] || card.card_type}</span>
                        )}
                        {card.difficulty_rating && (
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${DIFF_COLOURS[card.difficulty_rating] || 'text-slate-400 border-white/10'}`}>
                            {card.difficulty_rating}
                          </span>
                        )}
                        {card.is_favourite && <Heart className="w-3.5 h-3.5 text-pink-400 fill-pink-400" />}
                        {(card.tags || []).map(t => (
                          <span key={t} className="text-xs px-1.5 py-0.5 rounded-md bg-violet-500/10 text-violet-400">#{t}</span>
                        ))}
                      </div>
                      <p className="text-white text-sm font-medium">{cleanText(card.front)}</p>
                      <p className="text-slate-500 text-xs mt-1 line-clamp-2">{cleanText(card.back)}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => toggleMergeSelect(card.id)}
                        title="Select for merge"
                        className={`p-1.5 rounded-lg transition-all text-xs ${isMergeSelected ? 'text-blue-400 bg-blue-500/20' : 'text-slate-500 hover:text-blue-400 hover:bg-blue-500/10'}`}>
                        <GitMerge className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => toggleFavourite(card)} title="Favourite"
                        className="p-1.5 rounded-lg transition-all text-slate-500 hover:text-pink-400">
                        {card.is_favourite ? <Heart className="w-3.5 h-3.5 fill-pink-400 text-pink-400" /> : <HeartOff className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => splitCard(card)} title="Split card"
                        className="p-1.5 rounded-lg transition-all text-slate-500 hover:text-amber-400">
                        <Scissors className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => startEdit(card)} title="Edit"
                        className="p-1.5 rounded-lg transition-all text-slate-500 hover:text-violet-400">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteMutation.mutate(card.id)} title="Delete"
                        className="p-1.5 rounded-lg transition-all text-slate-500 hover:text-red-400">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  <textarea value={editFront} onChange={e => setEditFront(e.target.value)} rows={2}
                    placeholder="Front (Question)…"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500/50 placeholder:text-slate-500 resize-none" />
                  <textarea value={editBack} onChange={e => setEditBack(e.target.value)} rows={3}
                    placeholder="Back (Answer)…"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500/50 placeholder:text-slate-500 resize-none" />
                  <div className="flex flex-wrap gap-2">
                    <select value={editDiff} onChange={e => setEditDiff(e.target.value)}
                      className="px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none">
                      {DIFFICULTY_OPTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select value={editType} onChange={e => setEditType(e.target.value)}
                      className="px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none">
                      {CARD_TYPE_OPTS.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                    </select>
                    <input value={editTags} onChange={e => setEditTags(e.target.value)}
                      placeholder="Tags (comma separated)…"
                      className="flex-1 min-w-[140px] px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-violet-500/50 placeholder:text-slate-500" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(card)} disabled={updateMutation.isPending}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-500 hover:bg-violet-600 text-white text-xs font-bold transition-all disabled:opacity-50">
                      {updateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
                    </button>
                    <button onClick={() => setEditingId(null)}
                      className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-xs font-medium hover:text-white transition-all">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}