import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Check, X, ChevronRight, ChevronLeft, RotateCcw, Loader2, Star, AlertCircle } from 'lucide-react';

const DIFF_BADGE = {
  foundation: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
  intermediate: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
  higher: 'text-red-400 bg-red-500/10 border-red-500/25',
  mixed: 'text-violet-400 bg-violet-500/10 border-violet-500/25',
};

export default function QuizPlayer({ quiz, user, onReset }) {
  const [answers, setAnswers] = useState({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState(null);
  const [marking, setMarking] = useState(false);

  const questions = quiz.questions || [];
  const current = questions[currentIdx];

  const setAnswer = (qId, val) => {
    setAnswers(a => ({ ...a, [qId]: val }));
  };

  const submitQuiz = async () => {
    setMarking(true);
    try {
      // For objective questions, mark locally; for written, use AI
      const markedResults = [];
      for (const q of questions) {
        const studentAnswer = answers[q.id] || '';
        if (q.type === 'multiple_choice' || q.type === 'true_false') {
          const correct = studentAnswer.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
          markedResults.push({
            id: q.id, question: q.question, student_answer: studentAnswer,
            correct_answer: q.correct_answer, is_correct: correct,
            marks_awarded: correct ? (q.marks || 1) : 0, marks_available: q.marks || 1,
            feedback: correct ? 'Correct!' : `Incorrect. The correct answer is: ${q.correct_answer}`,
            model_answer: q.model_answer || q.correct_answer,
            explanation: q.explanation || '',
            improvements: correct ? [] : ['Review this topic and try again.'],
          });
        } else {
          // AI marking for written answers
          const aiResult = await base44.integrations.Core.InvokeLLM({
            prompt: `You are an expert UK examiner marking a student's answer.

Question: ${q.question}
Marks available: ${q.marks || 2}
Model answer / mark scheme: ${q.model_answer || q.correct_answer || ''}
Mark scheme points: ${(q.mark_scheme_points || []).join('; ')}
Student's answer: ${studentAnswer || '[No answer given]'}

Mark this answer fairly and strictly. Award marks for correct points made.
Provide specific, constructive feedback.`,
            response_json_schema: {
              type: 'object',
              properties: {
                marks_awarded: { type: 'number' },
                is_correct: { type: 'boolean' },
                feedback: { type: 'string' },
                improvements: { type: 'array', items: { type: 'string' } },
                model_answer: { type: 'string' },
              }
            }
          });
          markedResults.push({
            id: q.id, question: q.question, student_answer: studentAnswer,
            correct_answer: q.correct_answer, marks_available: q.marks || 2,
            ...aiResult,
          });
        }
      }
      setResults(markedResults);
      setSubmitted(true);
    } catch (e) { console.error(e); }
    setMarking(false);
  };

  // ─── Results screen ───────────────────────────────────────────────────────
  if (submitted && results) {
    const totalAwarded = results.reduce((s, r) => s + (r.marks_awarded || 0), 0);
    const totalAvailable = results.reduce((s, r) => s + (r.marks_available || 1), 0);
    const pct = totalAvailable > 0 ? Math.round((totalAwarded / totalAvailable) * 100) : 0;
    const grade = pct >= 90 ? 'A*' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 50 ? 'D' : 'U';

    return (
      <div className="space-y-6">
        {/* Score card */}
        <div className="bg-gradient-to-br from-violet-900/40 to-purple-900/30 border border-violet-500/25 rounded-3xl p-8 text-center">
          <div className="text-6xl mb-3">{pct >= 70 ? '🏆' : pct >= 50 ? '⭐' : '📖'}</div>
          <h2 className="text-white font-black text-3xl mb-1">{pct}%</h2>
          <p className="text-slate-400 mb-4">{totalAwarded} / {totalAvailable} marks · Grade {grade}</p>
          <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden mb-6">
            <motion.div className={`h-full rounded-full ${pct >= 70 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
              initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: 'easeOut' }} />
          </div>
          <button onClick={onReset} className="px-6 py-2.5 rounded-2xl bg-white/10 border border-white/15 text-white font-semibold hover:bg-white/15 transition-all">
            <RotateCcw className="w-4 h-4 inline mr-2" /> New Quiz
          </button>
        </div>

        {/* Per-question results */}
        <div className="space-y-4">
          {results.map((r, i) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`border rounded-2xl p-5 ${r.is_correct ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-red-500/25 bg-red-500/5'}`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${r.is_correct ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {r.is_correct ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                  </div>
                  <p className="text-white font-semibold text-sm">Q{i + 1}. {r.question}</p>
                </div>
                <span className={`text-sm font-bold flex-shrink-0 ${r.is_correct ? 'text-emerald-400' : 'text-red-400'}`}>
                  {r.marks_awarded}/{r.marks_available}
                </span>
              </div>

              {r.student_answer && (
                <div className="mb-2 pl-8">
                  <p className="text-xs text-slate-500 mb-0.5">Your answer</p>
                  <p className="text-slate-300 text-sm">{r.student_answer}</p>
                </div>
              )}

              <div className="pl-8 space-y-2">
                {r.feedback && (
                  <div className={`rounded-xl p-3 text-sm ${r.is_correct ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'}`}>
                    {r.feedback}
                  </div>
                )}
                {!r.is_correct && r.model_answer && (
                  <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3">
                    <p className="text-xs text-violet-400 font-semibold mb-1">Model Answer</p>
                    <p className="text-slate-300 text-sm">{r.model_answer}</p>
                  </div>
                )}
                {r.improvements?.length > 0 && (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <p className="text-xs text-slate-500 font-semibold mb-1">Improvements</p>
                    <ul className="space-y-0.5">
                      {r.improvements.map((imp, j) => (
                        <li key={j} className="text-slate-400 text-xs flex items-start gap-1.5">
                          <span className="text-amber-400 mt-0.5">→</span> {imp}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {r.explanation && (
                  <p className="text-slate-500 text-xs">{r.explanation}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (!current) return null;

  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / questions.length) * 100;

  return (
    <div className="space-y-5">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div className="h-full bg-violet-500 rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
        </div>
        <span className="text-slate-400 text-xs flex-shrink-0">{answeredCount}/{questions.length} answered</span>
      </div>

      {/* Navigator */}
      <div className="flex gap-1.5 flex-wrap">
        {questions.map((q, i) => (
          <button key={q.id} onClick={() => setCurrentIdx(i)}
            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
              i === currentIdx ? 'bg-violet-500 text-white' :
              answers[q.id] ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400' :
              'bg-white/5 border border-white/10 text-slate-500 hover:text-white'
            }`}>
            {i + 1}
          </button>
        ))}
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div key={currentIdx} initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold text-slate-500">Q{currentIdx + 1} of {questions.length}</span>
                <span className="text-xs text-slate-600">· {current.marks || 1} mark{current.marks !== 1 ? 's' : ''}</span>
                {current.difficulty && (
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${DIFF_BADGE[current.difficulty] || DIFF_BADGE.mixed}`}>
                    {current.difficulty}
                  </span>
                )}
              </div>
              <p className="text-white font-semibold text-base leading-relaxed">{current.question}</p>
            </div>
          </div>

          {/* MC options */}
          {(current.type === 'multiple_choice') && current.options?.length > 0 && (
            <div className="space-y-2">
              {current.options.map((opt, i) => {
                const letter = ['A', 'B', 'C', 'D'][i];
                const isSelected = answers[current.id] === opt;
                return (
                  <button key={i} onClick={() => setAnswer(current.id, opt)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm transition-all ${
                      isSelected ? 'bg-violet-500/20 border-violet-500/40 text-violet-200' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/8 hover:text-white'
                    }`}>
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isSelected ? 'bg-violet-500 text-white' : 'bg-white/10 text-slate-400'}`}>{letter}</span>
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          {/* True / False */}
          {current.type === 'true_false' && (
            <div className="flex gap-3">
              {['True', 'False'].map(opt => (
                <button key={opt} onClick={() => setAnswer(current.id, opt)}
                  className={`flex-1 py-3 rounded-xl border font-bold text-sm transition-all ${
                    answers[current.id] === opt
                      ? opt === 'True' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-red-500/20 border-red-500/40 text-red-300'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
                  }`}>
                  {opt === 'True' ? '✅' : '❌'} {opt}
                </button>
              ))}
            </div>
          )}

          {/* Fill in blank / Short / Long / Diagram */}
          {['fill_blank', 'short_answer', 'diagram_label'].includes(current.type) && (
            <textarea
              value={answers[current.id] || ''}
              onChange={e => setAnswer(current.id, e.target.value)}
              placeholder="Type your answer here…"
              rows={current.type === 'fill_blank' ? 2 : 3}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 resize-none"
            />
          )}
          {current.type === 'long_answer' && (
            <textarea
              value={answers[current.id] || ''}
              onChange={e => setAnswer(current.id, e.target.value)}
              placeholder="Write your extended answer here…"
              rows={8}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 resize-none"
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button onClick={() => { setCurrentIdx(i => Math.max(0, i - 1)); }} disabled={currentIdx === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed text-sm font-medium transition-all">
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>

        {currentIdx < questions.length - 1 ? (
          <button onClick={() => setCurrentIdx(i => i + 1)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-300 hover:bg-violet-500/30 text-sm font-medium transition-all">
            Next <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={submitQuiz} disabled={marking}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold text-sm hover:brightness-110 disabled:opacity-50 transition-all">
            {marking ? <><Loader2 className="w-4 h-4 animate-spin" /> Marking…</> : <><Check className="w-4 h-4" /> Submit & Mark</>}
          </button>
        )}
      </div>

      {answeredCount === questions.length && currentIdx < questions.length - 1 && (
        <button onClick={submitQuiz} disabled={marking}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold text-sm hover:brightness-110 disabled:opacity-50 transition-all">
          {marking ? <><Loader2 className="w-4 h-4 animate-spin" /> Marking…</> : 'Submit All & Mark'}
        </button>
      )}
    </div>
  );
}