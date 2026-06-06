import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Loader2, BookMarked, ChevronDown, ChevronUp, Plus, X } from 'lucide-react';

const EXAM_BOARDS = [
  { id: 'AQA', label: 'AQA', color: 'text-blue-400 bg-blue-500/10 border-blue-500/25' },
  { id: 'OCR', label: 'OCR', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25' },
  { id: 'Edexcel', label: 'Edexcel', color: 'text-amber-400 bg-amber-500/10 border-amber-500/25' },
  { id: 'WJEC', label: 'WJEC', color: 'text-rose-400 bg-rose-500/10 border-rose-500/25' },
];

export default function MarkSchemeMode({ user, notebooks }) {
  const [examBoard, setExamBoard] = useState('AQA');
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState('GCSE');
  const [questions, setQuestions] = useState(['']);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState(null);
  const [expandedIdx, setExpandedIdx] = useState(null);

  const addQuestion = () => setQuestions(q => [...q, '']);
  const removeQuestion = (i) => setQuestions(q => q.filter((_, idx) => idx !== i));
  const updateQuestion = (i, val) => setQuestions(q => q.map((v, idx) => idx === i ? val : v));

  const generate = async () => {
    const validQs = questions.filter(q => q.trim());
    if (!validQs.length) return;
    setGenerating(true);
    setResults(null);

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a senior ${examBoard} ${level} ${subject || 'subject'} examiner with deep knowledge of the ${examBoard} mark scheme style and assessment objectives.

Generate a full, official-style mark scheme response for each question below. Write in plain text — no markdown asterisks, no bold formatting symbols.

For each question provide:
1. Mark scheme points — the exact points an examiner would look for (numbered clearly)
2. Model answer — a full, exam-standard written response that would achieve full marks
3. Examiner commentary — what examiners look for, common mistakes, how to achieve top marks, any specific ${examBoard} assessment objectives this tests

Questions:
${validQs.map((q, i) => `Q${i + 1}: ${q}`).join('\n')}

${examBoard} style guidance:
- AQA: Focus on key terms, clear level descriptors for extended answers, point-based marking for short answers
- OCR: Emphasise precise scientific/technical language, structured mark scheme with indicative content
- Edexcel: Level-based mark schemes for extended writing, bullet-pointed acceptable answers for short questions
- WJEC: Band descriptors, focus on quality of language and communication alongside content`,
        response_json_schema: {
          type: 'object',
          properties: {
            mark_schemes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  question: { type: 'string' },
                  total_marks: { type: 'number' },
                  mark_scheme_points: { type: 'array', items: { type: 'string' } },
                  model_answer: { type: 'string' },
                  examiner_commentary: { type: 'string' },
                  assessment_objectives: { type: 'array', items: { type: 'string' } },
                  common_mistakes: { type: 'array', items: { type: 'string' } },
                },
                required: ['question', 'mark_scheme_points', 'model_answer', 'examiner_commentary']
              }
            }
          }
        }
      });
      setResults(result?.mark_schemes || []);
      setExpandedIdx(0);
    } catch (e) { console.error(e); }
    setGenerating(false);
  };

  const boardConfig = EXAM_BOARDS.find(b => b.id === examBoard);

  return (
    <div className="space-y-6">
      {/* Config */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
        <h3 className="text-white font-bold text-lg">Mark Scheme Generator</h3>

        {/* Exam board */}
        <div>
          <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">Exam Board</label>
          <div className="flex gap-2 flex-wrap">
            {EXAM_BOARDS.map(b => (
              <button key={b.id} onClick={() => setExamBoard(b.id)}
                className={`px-4 py-2 rounded-xl border font-bold text-sm transition-all ${examBoard === b.id ? b.color : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}>
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Subject + Level */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">Subject</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Biology, History, Maths…"
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500/50 placeholder:text-slate-500" />
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">Level</label>
            <div className="flex gap-2">
              {['GCSE', 'A-Level'].map(l => (
                <button key={l} onClick={() => setLevel(l)}
                  className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold transition-all ${level === l ? 'bg-violet-500/20 border-violet-500/40 text-violet-300' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Questions */}
        <div>
          <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">Exam Questions</label>
          <div className="space-y-2">
            {questions.map((q, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-slate-500 text-sm font-bold mt-2.5 flex-shrink-0 w-5">Q{i + 1}</span>
                <textarea value={q} onChange={e => updateQuestion(i, e.target.value)}
                  placeholder={`Enter exam question ${i + 1}…`} rows={2}
                  className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500/50 placeholder:text-slate-500 resize-none" />
                {questions.length > 1 && (
                  <button onClick={() => removeQuestion(i)} className="mt-2 p-1 text-slate-500 hover:text-red-400 transition-all">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button onClick={addQuestion} className="mt-2 flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-all">
            <Plus className="w-3.5 h-3.5" /> Add another question
          </button>
        </div>

        <button onClick={generate} disabled={generating || !questions.some(q => q.trim())}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold text-sm hover:brightness-110 disabled:opacity-50 transition-all">
          {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating mark schemes…</> : <><BookMarked className="w-4 h-4" /> Generate Mark Schemes</>}
        </button>
      </div>

      {/* Results */}
      {results && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full border text-xs font-bold ${boardConfig?.color}`}>{examBoard}</span>
            <span className="text-slate-400 text-sm">{results.length} mark scheme{results.length !== 1 ? 's' : ''} generated</span>
          </div>

          {results.map((ms, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              {/* Question header */}
              <button onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/5 transition-all">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-violet-400 text-xs font-bold">Q{i + 1}</span>
                    {ms.total_marks && <span className="text-slate-500 text-xs">{ms.total_marks} marks</span>}
                  </div>
                  <p className="text-white text-sm font-medium line-clamp-2">{ms.question}</p>
                </div>
                {expandedIdx === i ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0 ml-3" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 ml-3" />}
              </button>

              <AnimatePresence>
                {expandedIdx === i && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                    className="overflow-hidden border-t border-white/10">
                    <div className="px-5 py-5 space-y-5">
                      {/* Mark scheme points */}
                      {ms.mark_scheme_points?.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-violet-400 uppercase tracking-wider mb-2">Mark Scheme Points</p>
                          <div className="space-y-1.5">
                            {ms.mark_scheme_points.map((pt, j) => (
                              <div key={j} className="flex items-start gap-2.5">
                                <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{j + 1}</span>
                                <p className="text-slate-300 text-sm">{pt}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Model answer */}
                      {ms.model_answer && (
                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                          <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">Model Answer</p>
                          <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{ms.model_answer}</p>
                        </div>
                      )}

                      {/* Examiner commentary */}
                      {ms.examiner_commentary && (
                        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                          <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">Examiner Commentary</p>
                          <p className="text-slate-300 text-sm leading-relaxed">{ms.examiner_commentary}</p>
                        </div>
                      )}

                      {/* AOs */}
                      {ms.assessment_objectives?.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1.5">Assessment Objectives</p>
                          <div className="flex flex-wrap gap-1.5">
                            {ms.assessment_objectives.map((ao, j) => (
                              <span key={j} className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300">{ao}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Common mistakes */}
                      {ms.common_mistakes?.length > 0 && (
                        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                          <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2">Common Mistakes to Avoid</p>
                          <ul className="space-y-1">
                            {ms.common_mistakes.map((m, j) => (
                              <li key={j} className="text-slate-400 text-xs flex items-start gap-1.5">
                                <span className="text-red-400 mt-0.5 flex-shrink-0">✗</span> {m}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}