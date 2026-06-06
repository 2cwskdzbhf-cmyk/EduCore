import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { X, Save, Scissors, GitMerge, Tag, Heart, Star, HeartOff, Edit3, ChevronDown } from 'lucide-react';
import { CARD_TYPES, DIFFICULTY_CONFIG, cleanText } from './FlashcardUtils';

export default function FlashcardEditor({ card, onClose, onSave }) {
  const [front, setFront] = useState(cleanText(card.front));
  const [back, setBack] = useState(cleanText(card.back));
  const [cardType, setCardType] = useState(card.card_type || '');
  const [difficulty, setDifficulty] = useState(card.difficulty_rating || 'medium');
  const [tags, setTags] = useState(card.tags || []);
  const [newTag, setNewTag] = useState('');
  const [isFavourite, setIsFavourite] = useState(card.is_favourite || false);
  const [splitMode, setSplitMode] = useState(false);
  const [split1Front, setSplit1Front] = useState('');
  const [split1Back, setSplit1Back] = useState('');
  const [split2Front, setSplit2Front] = useState('');
  const [split2Back, setSplit2Back] = useState('');

  const saveMutation = useMutation({
    mutationFn: () => base44.entities.RevisionFlashcard.update(card.id, {
      front: cleanText(front),
      back: cleanText(back),
      card_type: cardType,
      difficulty_rating: difficulty,
      tags,
      is_favourite: isFavourite,
    }),
    onSuccess: () => { onSave(); onClose(); },
  });

  const splitMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.RevisionFlashcard.update(card.id, {
        front: cleanText(split1Front), back: cleanText(split1Back),
        card_type: cardType, difficulty_rating: difficulty, tags,
      });
      await base44.entities.RevisionFlashcard.create({
        notebook_id: card.notebook_id, student_email: card.student_email,
        front: cleanText(split2Front), back: cleanText(split2Back),
        card_type: cardType, difficulty_rating: difficulty, tags, is_ai_generated: false,
      });
    },
    onSuccess: () => { onSave(); onClose(); },
  });

  const addTag = () => {
    const t = newTag.trim().toLowerCase();
    if (t && !tags.includes(t)) { setTags([...tags, t]); }
    setNewTag('');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        className="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-bold flex items-center gap-2"><Edit3 className="w-4 h-4 text-violet-400" /> Edit Flashcard</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsFavourite(f => !f)}
              className={`p-2 rounded-xl transition-all ${isFavourite ? 'text-amber-400 bg-amber-500/10' : 'text-slate-500 hover:text-amber-400'}`}>
              {isFavourite ? <Star className="w-4 h-4 fill-current" /> : <Star className="w-4 h-4" />}
            </button>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-500 hover:text-white transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!splitMode ? (
          <div className="space-y-4">
            {/* Card type selector */}
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">Card Type</label>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setCardType('')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${!cardType ? 'bg-white/15 border-white/30 text-white' : 'border-white/10 text-slate-500 hover:text-white'}`}>
                  General
                </button>
                {CARD_TYPES.map(t => (
                  <button key={t.id} onClick={() => setCardType(t.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${cardType === t.id ? t.bg + ' ' + t.color : 'border-white/10 text-slate-500 hover:text-white'}`}>
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">Difficulty</label>
              <div className="flex gap-2">
                {['easy', 'medium', 'hard'].map(d => (
                  <button key={d} onClick={() => setDifficulty(d)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold capitalize transition-all border ${
                      difficulty === d ? DIFFICULTY_CONFIG[d].bg + ' ' + DIFFICULTY_CONFIG[d].color : 'border-white/10 text-slate-500 hover:text-white'
                    }`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Front */}
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">Front (Question)</label>
              <textarea value={front} onChange={e => setFront(e.target.value)} rows={3}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500/50 resize-none placeholder:text-slate-500" />
            </div>

            {/* Back */}
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">Back (Answer)</label>
              <textarea value={back} onChange={e => setBack(e.target.value)} rows={4}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500/50 resize-none placeholder:text-slate-500" />
            </div>

            {/* Tags */}
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block flex items-center gap-1"><Tag className="w-3 h-3" /> Tags</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-violet-500/15 border border-violet-500/25 rounded-full text-violet-300 text-xs">
                    #{tag}
                    <button onClick={() => setTags(tags.filter(t => t !== tag))}><X className="w-2.5 h-2.5" /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={newTag} onChange={e => setNewTag(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTag()}
                  placeholder="Add tag…"
                  className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-violet-500/50 placeholder:text-slate-500" />
                <button onClick={addTag} className="px-3 py-1.5 rounded-xl bg-white/10 text-white text-xs hover:bg-white/15 transition-all">Add</button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button onClick={() => setSplitMode(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 text-slate-400 hover:text-white text-xs font-medium transition-all">
                <Scissors className="w-3.5 h-3.5" /> Split Card
              </button>
              <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-violet-500 hover:bg-violet-600 text-white text-sm font-bold transition-all disabled:opacity-50">
                <Save className="w-4 h-4" /> {saveMutation.isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          // Split mode
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
              <Scissors className="w-4 h-4" /> Split into two cards
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Card 1</p>
              <input value={split1Front} onChange={e => setSplit1Front(e.target.value)} placeholder="Front…"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500/50 placeholder:text-slate-500" />
              <textarea value={split1Back} onChange={e => setSplit1Back(e.target.value)} placeholder="Back…" rows={2}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500/50 resize-none placeholder:text-slate-500" />
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Card 2</p>
              <input value={split2Front} onChange={e => setSplit2Front(e.target.value)} placeholder="Front…"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500/50 placeholder:text-slate-500" />
              <textarea value={split2Back} onChange={e => setSplit2Back(e.target.value)} placeholder="Back…" rows={2}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500/50 resize-none placeholder:text-slate-500" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setSplitMode(false)}
                className="px-4 py-2 rounded-xl border border-white/10 text-slate-400 text-sm hover:text-white transition-all">Cancel</button>
              <button onClick={() => splitMutation.mutate()}
                disabled={!split1Front || !split1Back || !split2Front || !split2Back || splitMutation.isPending}
                className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold transition-all disabled:opacity-50">
                {splitMutation.isPending ? 'Splitting…' : 'Confirm Split'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}