import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Loader2, BookMarked, ChevronDown, ChevronUp, Sparkles, Clipboard } from 'lucide-react';

const EXAM_BOARDS = [
  { id: 'AQA', label: 'AQA', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  { id: 'OCR', label: 'OCR', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  { id: 'Edexcel', label: 'Edexcel', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  { id: 'WJEC', label: 'WJEC', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
];

export default function MarkSchemeMode({ notebook, user, sources }) {
  const [examBoard, setExamBoard] = useState('AQA');
  const [question, setQuestion] = useState('');
  const [marks, setMarks] = useState(6);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [expanded, setExpanded] = useState({ markPoints: true, model: true, commentary: false });

  const validSources = sources.filter(s => s.content_text?.trim());
  const sourceContext = validSources.map(s => s.content_text).join('\n\n').slice(0, 8000);

  const generate = async () => {
    if (!question.trim()) return;
    setIsLoading(true);
    setResult(null);

    const resp = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert ${examBoard} examiner for ${notebook.subject || 'the subject'} at GCSE/A-Level.

A student is asking for a mark scheme for the following question worth ${marks} marks.

QUESTION: "${question}"

${sourceContext ? `RELEVANT SOURCE MATERIAL:\n${sourceContext}\n\n` : ''}

Provide a full ${examBoard}-style mark scheme response. Include:
1. mark_points: An array of ${marks} specific marking points (each as a string, as they would appear in an official mark scheme — e.g. "Correctly identifies X", "States that Y leads to Z", "Includes reference to...")
2. model_answer: A full, polished model answer that would achieve full marks. Write in plain English — no asterisks, no markdown, no bullet symbols. Use complete sentences.
3. examiner_commentary: Practical examiner guidance in plain text. What do most students miss? What earns/loses marks? Common errors. Write as a helpful examiner would.
4. tier: The ability tier this question targets (Foundation/Higher/A-Level)
5. ao_coverage: Which Assessment Objectives this question covers (e.g. AO1: Knowledge, AO2: Application, AO3: Analysis)

All text must be plain English — no asterisks, no markdown formatting, no bullet point symbols.`,
      response_json_schema: {
        type: 'object',
        properties: {
          mark_points: { type: 'array', items: { type: 'string' } },
          model_answer: { type: 'string' },
          examiner_commentary: { type: 'string' },
          tier: { type: 'string' },
          ao_coverage: { type: 'string' },
        },
        required: ['mark_points', 'model_answer', 'examiner_commentary']
      }
    });

    setResult(resp);
    setIsLoading(false);
  };

  const boardConfig = EXAM_BOARDS.find(b => b.id === examBoard);

  return (
    <div className="space-y-5">
      {/* Exam board selector */}
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Exam Board</p>
        <div className="flex gap-2 flex-wrap">
          {EXAM_BOARDS.map(b => (
            <button key={b.id} onClick={() => setExamBoard(b.id)}
              className={`px-4 py-2 rounded-xl border text-sm font-black transition-all ${
                examBoard === b.id ? b.color : 'bg-white/5 border-white/10 text-slate-500 hover:text-white'
              }`}>
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Question input */}
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Exam Question</p>
        <textarea value={question} onChange={e => setQuestion(e.target.value)} rows={3}
          placeholder="Paste or type the exam question here…"
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50 resize-none" />
      </div>

      {/* Marks */}
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Marks Available: <span className="text-white font-bold">{marks}</span></p>
        <input type="range" min={1} max={20} value={marks} onChange={e => setMarks(Number(e.target.value))}
          className="w-full accent-violet-500" />
        <div className="flex justify-between text-xs text-slate-600 mt-1">
          <span>1 mark</span><span>10 marks</span><span>20 marks</span>
        </div>
      </div>

      <button onClick={generate} disabled={isLoading || !question.trim()}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-black text-sm hover:brightness-110 disabled:opacity-40 transition-all">
        {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating Mark Scheme…</> : <><BookMarked className="w-4 h-4" /> Generate {examBoard} Mark Scheme</>}
      </button>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-3">
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-3 rounded-2xl border ${boardConfig?.color}`}>
              <div className="flex items-center gap-2">
                <BookMarked className="w-4 h-4" />
                <span className="font-black text-sm">{examBoard} Mark Scheme — {marks} marks</span>
              </div>
              <div className="flex gap-2 text-xs opacity-70">
                {result.tier && <span>{result.tier}</span>}
                {result.ao_coverage && <span>· {result.ao_coverage}</span>}
              </div>
            </div>

            {/* Mark Points */}
            <Section title="Mark Points" icon="📋" expanded={expanded.markPoints} onToggle={() => setExpanded(e => ({ ...e, markPoints: !e.markPoints }))}>
              <div className="space-y-2">
                {result.mark_points?.map((pt, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400 text-xs font-bold">{i + 1}</span>
                    <p className="text-slate-200 text-sm leading-relaxed">{pt}</p>
                  </div>
                ))}
              </div>
            </Section>

            {/* Model Answer */}
            <Section title="Model Answer" icon="⭐" expanded={expanded.model} onToggle={() => setExpanded(e => ({ ...e, model: !e.model }))}>
              <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{result.model_answer}</p>
            </Section>

            {/* Examiner Commentary */}
            <Section title="Examiner Commentary" icon="🎓" expanded={expanded.commentary} onToggle={() => setExpanded(e => ({ ...e, commentary: !e.commentary }))}>
              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap italic">{result.examiner_commentary}</p>
            </Section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Section({ title, icon, expanded, onToggle, children }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-all">
        <span className="flex items-center gap-2 text-sm font-bold text-white">
          <span>{icon}</span> {title}
        </span>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden">
            <div className="px-4 pb-4 border-t border-white/10 pt-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}