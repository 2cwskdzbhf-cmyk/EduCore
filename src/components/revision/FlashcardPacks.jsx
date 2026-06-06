import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Layers, BookOpen, Target, GitBranch, Play, ChevronRight } from 'lucide-react';

const DIFF_COLOURS = {
  easy: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
  medium: 'from-amber-500/20 to-amber-600/10 border-amber-500/30',
  hard: 'from-red-500/20 to-red-600/10 border-red-500/30',
};

const TYPE_LABELS = {
  definition: 'Definitions', example: 'Examples', formula: 'Formulas',
  diagram: 'Diagrams', comparison: 'Comparisons', process: 'Process',
  cause_effect: 'Cause/Effect', general: 'General',
};

function cleanText(text = '') {
  return text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/__(.*?)__/g, '$1').replace(/_(.*?)_/g, '$1').replace(/#{1,6}\s/g, '').trim();
}

export default function FlashcardPacks({ flashcards, sources, onStartStudy }) {
  const [groupBy, setGroupBy] = useState('difficulty');

  const packs = useMemo(() => {
    if (groupBy === 'difficulty') {
      const groups = { easy: [], medium: [], hard: [] };
      flashcards.forEach(fc => {
        const d = fc.difficulty_rating || 'medium';
        if (groups[d]) groups[d].push(fc);
      });
      return Object.entries(groups).filter(([, cards]) => cards.length > 0).map(([label, cards]) => ({
        id: label, label: label.charAt(0).toUpperCase() + label.slice(1), cards,
        icon: Target, colour: DIFF_COLOURS[label] || DIFF_COLOURS.medium,
        desc: `${cards.length} ${label} cards`,
      }));
    }

    if (groupBy === 'type') {
      const groups = {};
      flashcards.forEach(fc => {
        const t = fc.card_type || 'general';
        if (!groups[t]) groups[t] = [];
        groups[t].push(fc);
      });
      return Object.entries(groups).filter(([, c]) => c.length > 0).map(([type, cards]) => ({
        id: type, label: TYPE_LABELS[type] || type, cards,
        icon: Layers, colour: 'from-violet-500/20 to-violet-600/10 border-violet-500/30',
        desc: `${cards.length} cards`,
      }));
    }

    if (groupBy === 'source') {
      const sourceMap = Object.fromEntries(sources.map(s => [s.id, s.name]));
      const groups = { 'No Source': [] };
      flashcards.forEach(fc => {
        const name = fc.source_id ? (sourceMap[fc.source_id] || 'Unknown') : 'No Source';
        if (!groups[name]) groups[name] = [];
        groups[name].push(fc);
      });
      return Object.entries(groups).filter(([, c]) => c.length > 0).map(([name, cards]) => ({
        id: name, label: name, cards,
        icon: BookOpen, colour: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
        desc: `${cards.length} cards`,
      }));
    }

    return [];
  }, [flashcards, sources, groupBy]);

  const favourites = flashcards.filter(f => f.is_favourite);

  return (
    <div className="space-y-5">
      {/* Group selector */}
      <div className="flex items-center gap-2">
        <GitBranch className="w-4 h-4 text-slate-400" />
        <span className="text-slate-400 text-sm">Group by:</span>
        {['difficulty', 'type', 'source'].map(g => (
          <button key={g} onClick={() => setGroupBy(g)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              groupBy === g ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'
            }`}>
            {g.charAt(0).toUpperCase() + g.slice(1)}
          </button>
        ))}
      </div>

      {/* Favourites pack */}
      {favourites.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-pink-500/30 bg-gradient-to-br from-pink-500/20 to-pink-600/10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center text-lg">❤️</div>
              <div>
                <p className="text-white font-bold text-sm">Favourites</p>
                <p className="text-slate-400 text-xs">{favourites.length} cards</p>
              </div>
            </div>
            <button onClick={() => onStartStudy(favourites)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-pink-500/20 text-pink-300 text-xs font-semibold hover:bg-pink-500/30 transition-all border border-pink-500/30">
              <Play className="w-3.5 h-3.5" /> Study
            </button>
          </div>
        </motion.div>
      )}

      {/* All due */}
      {flashcards.filter(f => !f.next_review || new Date(f.next_review) <= new Date()).length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/20 to-amber-600/10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-lg">⏰</div>
              <div>
                <p className="text-white font-bold text-sm">Due for Review</p>
                <p className="text-slate-400 text-xs">{flashcards.filter(f => !f.next_review || new Date(f.next_review) <= new Date()).length} cards</p>
              </div>
            </div>
            <button onClick={() => onStartStudy(flashcards.filter(f => !f.next_review || new Date(f.next_review) <= new Date()))}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/20 text-amber-300 text-xs font-semibold hover:bg-amber-500/30 transition-all border border-amber-500/30">
              <Play className="w-3.5 h-3.5" /> Study
            </button>
          </div>
        </motion.div>
      )}

      {/* Dynamic packs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {packs.map((pack, i) => (
          <motion.div key={pack.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={`rounded-2xl border bg-gradient-to-br ${pack.colour} p-4`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                  <pack.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">{pack.label}</p>
                  <p className="text-slate-400 text-xs">{pack.desc}</p>
                </div>
              </div>
              <button onClick={() => onStartStudy(pack.cards)}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white/10 text-white text-xs font-semibold hover:bg-white/15 transition-all">
                <Play className="w-3.5 h-3.5" /> Study
              </button>
            </div>

            {/* Preview cards */}
            <div className="mt-3 space-y-1">
              {pack.cards.slice(0, 2).map(c => (
                <p key={c.id} className="text-xs text-slate-400 truncate flex items-center gap-1">
                  <ChevronRight className="w-3 h-3 flex-shrink-0 text-slate-600" />
                  {cleanText(c.front)}
                </p>
              ))}
              {pack.cards.length > 2 && (
                <p className="text-xs text-slate-600">+{pack.cards.length - 2} more</p>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {flashcards.length === 0 && (
        <p className="text-center text-slate-500 text-sm py-8">No flashcards yet. Generate some first!</p>
      )}
    </div>
  );
}