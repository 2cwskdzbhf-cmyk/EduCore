import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Loader2, Zap, Plus, X, Check, AlertCircle } from 'lucide-react';

const MARK_COLORS = {
  high: { bar: 'bg-emerald-500', text: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/25' },
  mid: { bar: 'bg-amber-500', text: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/25' },
  low: { bar: 'bg-red-500', text: 'text-red-400', bg: 'bg-red-500/10 border-red-500/25' },
};

function getMarkLevel(pct) {
  if (pct >= 70) return 'high';
  if (pct >= 40) return 'mid';
  return 'low';
}

export default function AutoMarker({ user, notebooks }) {
  const [subject, setSubject] = useState('');
  const [examBoard, setExamBoard] = useState('AQA');
  const [qaPairs, setQaPairs] = useState([{ question: '', answer: '', marks: 4 }]);
  const [marking, setMarking] = useState(false);
  const [results, setResults] = useState(null);

  const addPair = () => setQaPairs(p => [...p, { question: '', marks: 4, answer: '' }]);
  const removePair = (i) => setQaPairs(p => p.filter((_, idx) => idx !== i));
  const updatePair = (i, field, val) => setQaPairs(p => p.map((v, idx) => idx === i ? { ...v, [field]: val } : v));

  const markAll = async () => {
    const valid = qaPairs.filter(p => p.question.trim() && p.answer.trim());
    if (!valid.length) return;
    setMarking(true);
    setResults(null);

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert ${examBoard} ${subject || 'subject'} examiner. Mark the following student answers strictly and fairly.

For each answer:
- Award marks out of the stated maximum. Be precise — award half marks only if clearly deserved.
- Provide specific, actionable feedback in 2–3 sentences.
- List 2–4 concrete improvements the student could make.
- Provide a model answer that would achieve full marks.
- Give a percentage score.

Write in plain English only. No asterisks, no markdown.

Questions and answers to mark:
${valid.map((p, i) => `
Q${i + 1} (${p.marks} marks): ${p.question}
Student answer: ${p.answer}
`).join('\n')}`,
        response_json_schema: {
          type: 'object',
          properties: {
            marked_answers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  question_index: { type: 'number' },
                  marks_awarded: { type: 'number' },
                  marks_available: { type: 'number' },
                  percentage: { type: 'number' },
                  feedback: { type: 'string' },
                  improvements: { type: 'array', items: { type: 'string' } },
                  model_answer: { type: 'string' },
                  strengths: { type: 'array', items: { type: 'string' } },
                },
                required: ['marks_awarded', 'marks_available', 'percentage', 'feedback', 'model_answer']
              }
            },
            overall_feedback: { type: 'string' },
            total_marks: { type: 'number' },
            total_available: { type: 'number' },
          }
        }
      });
      setResults({ ...result, pairs: valid });
    } catch (e) { console.error(e); }
    setMarking(false);
  };

  const totalPct = results
    ? Math.round(((results.total_marks || 0) / (results.total_available || 1)) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Input panel */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
        <h3 className="text-white font-bold text-lg">Auto-Marking</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">Subject</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Chemistry, History…"
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500/50 placeholder:text-slate-500" />
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">Exam Board</label>
            <select value={examBoard} onChange={e => setExamBoard(e.target.value)}
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500/50">
              {['AQA', 'OCR', 'Edexcel', 'WJEC'].map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>

        {/* Q&A pairs */}
        <div className="space-y-4">
          {qaPairs.map((pair, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-violet-400 text-xs font-bold">Question {i + 1}</span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <label className="text-slate-500 text-xs">Marks:</label>
                    <select value={pair.marks} onChange={e => updatePair(i, 'marks', Number(e.target.value))}
                      className="bg-white/5 border border-white/10 rounded-lg text-white text-xs px-2 py-1 focus:outline-none">
                      {[1,2,3,4,5,6,8,10,12].map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  {qaPairs.length > 1 && (
                    <button onClick={() => removePair(i)} className="text-slate-500 hover:text-red-400 transition-all">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <textarea value={pair.question} onChange={e => updatePair(i, 'question', e.target.value)}
                placeholder="Paste the exam question here…" rows={2}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500/50 placeholder:text-slate-500 resize-none" />
              <textarea value={pair.answer} onChange={e => updatePair(i, 'answer', e.target.value)}
                placeholder="Paste or type your answer here…" rows={4}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500/50 placeholder:text-slate-500 resize-none" />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button onClick={addPair} className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-all">
            <Plus className="w-4 h-4" /> Add question
          </button>
          <div className="flex-1" />
          <button onClick={markAll} disabled={marking || !qaPairs.some(p => p.question.trim() && p.answer.trim())}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold text-sm hover:brightness-110 disabled:opacity-50 transition-all">
            {marking ? <><Loader2 className="w-4 h-4 animate-spin" /> Marking…</> : <><Zap className="w-4 h-4" /> Mark Instantly</>}
          </button>
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="space-y-5">
          {/* Overall score */}
          <div className={`border rounded-2xl p-6 ${MARK_COLORS[getMarkLevel(totalPct)].bg}`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className={`font-black text-3xl ${MARK_COLORS[getMarkLevel(totalPct)].text}`}>{totalPct}%</p>
                <p className="text-slate-400 text-sm">{results.total_marks} / {results.total_available} marks</p>
              </div>
              <div className="text-3xl">{totalPct >= 70 ? '🏆' : totalPct >= 50 ? '⭐' : '📖'}</div>
            </div>
            <div className="h-2.5 bg-white/10 rounded-full overflow-hidden mb-4">
              <motion.div className={`h-full rounded-full ${MARK_COLORS[getMarkLevel(totalPct)].bar}`}
                initial={{ width: 0 }} animate={{ width: `${totalPct}%` }} transition={{ duration: 1, ease: 'easeOut' }} />
            </div>
            {results.overall_feedback && (
              <p className="text-slate-300 text-sm">{results.overall_feedback}</p>
            )}
          </div>

          {/* Per-question */}
          {results.marked_answers?.map((r, i) => {
            const pct = r.percentage || Math.round((r.marks_awarded / r.marks_available) * 100);
            const level = getMarkLevel(pct);
            const pair = results.pairs[r.question_index ?? i];
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                {/* Header */}
                <div className={`px-5 py-4 border-b border-white/10 flex items-center justify-between ${MARK_COLORS[level].bg}`}>
                  <p className="text-white font-semibold text-sm line-clamp-1">Q{i + 1}. {pair?.question}</p>
                  <span className={`font-black text-lg flex-shrink-0 ml-3 ${MARK_COLORS[level].text}`}>
                    {r.marks_awarded}/{r.marks_available}
                  </span>
                </div>

                <div className="px-5 py-5 space-y-4">
                  {/* Mark bar */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div className={`h-full rounded-full ${MARK_COLORS[level].bar}`}
                        initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} />
                    </div>
                    <span className={`text-sm font-bold ${MARK_COLORS[level].text}`}>{pct}%</span>
                  </div>

                  {/* Strengths */}
                  {r.strengths?.length > 0 && (
                    <div>
                      <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider mb-1.5">What you did well</p>
                      <ul className="space-y-1">
                        {r.strengths.map((s, j) => (
                          <li key={j} className="text-slate-300 text-sm flex items-start gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" /> {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Feedback */}
                  <div className={`rounded-xl p-4 border ${MARK_COLORS[level].bg}`}>
                    <p className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'inherit' }}>Feedback</p>
                    <p className="text-slate-200 text-sm leading-relaxed">{r.feedback}</p>
                  </div>

                  {/* Improvements */}
                  {r.improvements?.length > 0 && (
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                      <p className="text-xs text-amber-400 font-bold uppercase tracking-wider mb-2">How to Improve</p>
                      <ul className="space-y-1.5">
                        {r.improvements.map((imp, j) => (
                          <li key={j} className="text-slate-300 text-sm flex items-start gap-2">
                            <span className="text-amber-400 font-bold flex-shrink-0">{j + 1}.</span> {imp}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Model answer */}
                  {r.model_answer && (
                    <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-4">
                      <p className="text-xs text-violet-400 font-bold uppercase tracking-wider mb-2">Model Answer</p>
                      <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{r.model_answer}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}