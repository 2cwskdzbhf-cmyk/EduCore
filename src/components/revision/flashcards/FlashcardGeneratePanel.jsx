import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Sparkles, Loader2, X, ChevronDown } from 'lucide-react';
import { cleanText, CARD_TYPES } from './FlashcardUtils';

const TYPE_PROMPTS = {
  definition:   'Define each key term, concept, person, or event. Front: "Define [term]". Back: plain text definition only.',
  example:      'Create example-based cards. Front: "Give an example of [concept]". Back: a concrete, specific example in plain text.',
  formula:      'Extract formulas, equations, or rules. Front: "What is the formula for [X]?". Back: the formula and what each variable means.',
  diagram:      'Create cards that describe diagrams, structures, or layouts. Front: "Describe the structure of [X]". Back: a step-by-step plain text description.',
  comparison:   'Create comparison cards. Front: "Compare [A] vs [B]". Back: key similarities and differences in plain text.',
  process:      'Create process/sequence cards. Front: "Describe the process of [X]". Back: numbered steps in plain text.',
  cause_effect: 'Create cause and effect cards. Front: "What causes [X]?" or "What is the effect of [Y]?". Back: clear causal explanation in plain text.',
};

export default function FlashcardGeneratePanel({ notebook, sources, user, onGenerated }) {
  const [selectedTypes, setSelectedTypes] = useState(['definition', 'example']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(null);
  const cancelledRef = useRef(false);

  const toggleType = (id) => {
    setSelectedTypes(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const generate = async () => {
    const validSources = sources.filter(s => s.content_text?.trim());
    if (!validSources.length) { alert('Upload sources with text content first.'); return; }
    if (!selectedTypes.length) { alert('Select at least one card type.'); return; }

    setIsGenerating(true);
    cancelledRef.current = false;
    let total = 0;

    const CHUNK = 5000;
    const batches = [];
    for (const src of validSources) {
      for (let off = 0; off < src.content_text.length; off += CHUNK) {
        batches.push({ src, chunk: src.content_text.slice(off, off + CHUNK) });
      }
    }

    for (let i = 0; i < batches.length; i++) {
      if (cancelledRef.current) break;
      const { src, chunk } = batches[i];
      setProgress({ current: i + 1, total: batches.length, count: total, source: src.name });

      for (const type of selectedTypes) {
        if (cancelledRef.current) break;
        const typeConfig = CARD_TYPES.find(t => t.id === type);
        const typeInstruction = TYPE_PROMPTS[type] || 'Create flashcards.';

        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `You are an elite academic flashcard creator making exam-ready cards for GCSE/A-Level students studying "${notebook.subject || notebook.name}".

Card type: ${typeConfig?.label || type}
Instructions: ${typeInstruction}

CRITICAL RULES:
- Write in plain English only. No asterisks, no bold (**), no italics (*), no underscores, no markdown whatsoever.
- Front: a clear, specific question or prompt. Keep it under 15 words.
- Back: a precise, complete answer. Write in full sentences. No bullet points. No markdown symbols.
- Difficulty: assess as "easy", "medium", or "hard" based on exam complexity.
- Only generate cards directly supported by the text below.
- Aim for maximum coverage — generate as many valid cards as the content supports.

Source text (from "${src.name}"):
${chunk}

Return JSON: { "flashcards": [{ "front": "...", "back": "...", "difficulty": "easy|medium|hard" }] }`,
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
                    difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] }
                  },
                  required: ['front', 'back']
                }
              }
            }
          }
        });

        const cards = result?.flashcards || [];
        for (const card of cards) {
          if (cancelledRef.current) break;
          if (!card.front?.trim() || !card.back?.trim()) continue;
          await base44.entities.RevisionFlashcard.create({
            notebook_id: notebook.id,
            student_email: user.email,
            front: cleanText(card.front),
            back: cleanText(card.back),
            card_type: type,
            difficulty_rating: card.difficulty || 'medium',
            is_ai_generated: true,
            source_id: src.id,
          });
          total++;
        }
        setProgress(p => p ? { ...p, count: total } : p);
      }
      onGenerated();
    }

    setIsGenerating(false);
    setProgress(null);
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-white font-semibold text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-400" /> AI Generate Flashcards
        </p>
      </div>

      {/* Type selector */}
      <div>
        <p className="text-xs text-slate-500 mb-2">Select card types to generate:</p>
        <div className="flex flex-wrap gap-1.5">
          {CARD_TYPES.map(t => (
            <button key={t.id} onClick={() => toggleType(t.id)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                selectedTypes.includes(t.id) ? t.bg + ' ' + t.color : 'border-white/10 text-slate-500 hover:text-white'
              }`}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Progress */}
      <AnimatePresence>
        {progress && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3 overflow-hidden">
            <div className="flex items-center justify-between mb-1">
              <p className="text-violet-300 text-xs font-medium">{progress.count} cards created…</p>
              <span className="text-slate-500 text-xs">{progress.current}/{progress.total} batches</span>
            </div>
            <p className="text-slate-500 text-xs truncate mb-2">Source: {progress.source}</p>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div className="h-full bg-violet-500 rounded-full"
                animate={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-2">
        {isGenerating ? (
          <button onClick={() => { cancelledRef.current = true; }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium transition-all">
            <X className="w-3.5 h-3.5" /> Cancel
          </button>
        ) : (
          <button onClick={generate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-500 hover:bg-violet-600 text-white text-sm font-bold transition-all">
            <Sparkles className="w-4 h-4" /> Generate ({selectedTypes.length} types)
          </button>
        )}
      </div>
    </div>
  );
}