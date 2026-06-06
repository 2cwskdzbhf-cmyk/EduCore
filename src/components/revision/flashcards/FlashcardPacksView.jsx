import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Layers, Target, BookOpen, ChevronRight, Star } from 'lucide-react';
import { cleanText, CARD_TYPES, DIFFICULTY_CONFIG, getCardTypeConfig } from './FlashcardUtils';

const PACK_MODES = [
  { id: 'topic', label: 'By Type', icon: Layers },
  { id: 'difficulty', label: 'By Difficulty', icon: Target },
  { id: 'source', label: 'By Source', icon: BookOpen },
  { id: 'favourite', label: 'Favourites', icon: Star },
];

export default function FlashcardPacksView({ flashcards, sources, onStudyPack }) {
  const [packMode, setPackMode] = useState('topic');

  const packs = useMemo(() => {
    if (packMode === 'topic') {
      const groups = {};
      flashcards.forEach(fc => {
        const key = fc.card_type || 'general';
        if (!groups[key]) groups[key] = [];
        groups[key].push(fc);
      });
      return Object.entries(groups).map(([key, cards]) => {
        const typeConfig = getCardTypeConfig(key);
        return {
          id: key,
          label: typeConfig ? `${typeConfig.emoji} ${typeConfig.label}` : '📄 General',
          cards,
          color: typeConfig?.color || 'text-slate-400',
          bg: typeConfig?.bg || 'bg-white/5 border-white/10',
        };
      });
    }
    if (packMode === 'difficulty') {
      const groups = { easy: [], medium: [], hard: [], again: [] };
      flashcards.forEach(fc => {
        const key = fc.difficulty_rating || 'medium';
        if (groups[key]) groups[key].push(fc);
      });
      return Object.entries(groups)
        .filter(([, cards]) => cards.length > 0)
        .map(([key, cards]) => ({
          id: key,
          label: DIFFICULTY_CONFIG[key]?.label || key,
          cards,
          color: DIFFICULTY_CONFIG[key]?.color || 'text-slate-400',
          bg: DIFFICULTY_CONFIG[key]?.bg || 'bg-white/5 border-white/10',
        }));
    }
    if (packMode === 'source') {
      const groups = {};
      flashcards.forEach(fc => {
        const src = sources.find(s => s.id === fc.source_id);
        const key = src?.name || 'Unknown Source';
        if (!groups[key]) groups[key] = [];
        groups[key].push(fc);
      });
      return Object.entries(groups).map(([key, cards]) => ({
        id: key,
        label: `📄 ${key}`,
        cards,
        color: 'text-slate-300',
        bg: 'bg-white/5 border-white/10',
      }));
    }
    if (packMode === 'favourite') {
      const favs = flashcards.filter(fc => fc.is_favourite);
      return favs.length > 0 ? [{
        id: 'favourites',
        label: '⭐ Favourites',
        cards: favs,
        color: 'text-amber-400',
        bg: 'bg-amber-500/10 border-amber-500/20',
      }] : [];
    }
    return [];
  }, [flashcards, sources, packMode]);

  const now = new Date();

  return (
    <div className="space-y-4">
      {/* Mode selector */}
      <div className="flex gap-2 flex-wrap">
        {PACK_MODES.map(m => (
          <button key={m.id} onClick={() => setPackMode(m.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
              packMode === m.id ? 'bg-violet-500/20 border-violet-500/30 text-violet-300' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}>
            <m.icon className="w-3.5 h-3.5" /> {m.label}
          </button>
        ))}
      </div>

      {packs.length === 0 && (
        <p className="text-slate-500 text-sm text-center py-8">No cards in this category yet.</p>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {packs.map((pack, i) => {
          const dueCount = pack.cards.filter(c => !c.next_review || new Date(c.next_review) <= now).length;
          const easyPct = pack.cards.filter(c => c.difficulty_rating === 'easy').length;
          const reviewedCount = pack.cards.filter(c => c.review_count > 0).length;
          const accuracy = reviewedCount > 0 ? Math.round((easyPct / reviewedCount) * 100) : null;

          return (
            <motion.div key={pack.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`border rounded-2xl p-4 ${pack.bg}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-sm ${pack.color}`}>{pack.label}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{pack.cards.length} cards</p>
                </div>
                {accuracy !== null && (
                  <span className="text-xs text-slate-500 font-medium">{accuracy}% acc.</span>
                )}
              </div>

              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full bg-emerald-500/70 rounded-full"
                    style={{ width: `${reviewedCount > 0 ? Math.min(100, (reviewedCount / pack.cards.length) * 100) : 0}%` }} />
                </div>
                <span className="text-xs text-slate-600 flex-shrink-0">{reviewedCount}/{pack.cards.length} reviewed</span>
              </div>

              {dueCount > 0 && (
                <p className="text-amber-400 text-xs mb-3">{dueCount} due now</p>
              )}

              <button onClick={() => onStudyPack(pack.cards)}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-all">
                Study Pack <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}