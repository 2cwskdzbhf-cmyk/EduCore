import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronRight, CheckCircle2, Loader2, RotateCcw } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function QuizSession({ quiz, notebook, user, onBack }) {
  const { questions, title, format, difficulty, examBoard } = quiz;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [index]: answer }
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState(null); // [{ score, feedback, improvements, model_answer, max_marks }]
  const [isMarking, setIsMarking] = useState(false);

  const question = questions[currentIndex];
  const total = questions.length;
  const progress = ((currentIndex + 1) / total) * 100;
  const isLast = currentIndex === total - 1;
  const allAnswered = questions.every((_, i) => answers[i] !== undefined && answers[i] !== '');

  const setAnswer = (val) => {
    setAnswers(prev => ({ ...prev, [currentIndex]: val }));
  };

  const handleSubmit = async () => {
    setIsMarking(true);
    const marked = await Promise.all(
      questions.map(async (q, i) => {
        const ans = answers[i] ?? '';
        return markQuestion(q, ans, format, examBoard);
      })
    );
    setResults(marked);
    setSubmitted(true);
    setIsMarking(false);
  };

  if (submitted && results) {
    return (
      <QuizResults
        questions={questions}
        answers={answers}
        results={results}
        title={title}
        format={format}
        onBack={onBack}
        onRetry={() => { setAnswers({}); setSubmitted(false); setResults(null); setCurrentIndex(0); }}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-all">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex-1">
          <p className="text-white font-bold text-sm">{title}</p>
          <p className="text-slate-500 text-xs">{difficulty} · {examBoard || 'GCSE'} · {total} questions</p>
        </div>
        <span className="text-slate-500 text-sm font-medium">{currentIndex + 1} / {total}</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <motion.div className="h-full bg-gradient-to-r from-violet-500 to-purple-400 rounded-full"
          animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div key={currentIndex} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
          className="space-y-4">
          <QuestionCard
            question={question}
            index={currentIndex}
            format={format}
            answer={answers[currentIndex]}
            onAnswer={setAnswer}
          />
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => setCurrentIndex(i => Math.max(0, i - 1))} disabled={currentIndex === 0}
          className="px-4 py-2 rounded-xl border border-white/10 text-slate-400 hover:text-white disabled:opacity-30 text-sm font-medium transition-all">
          ← Previous
        </button>

        {/* Dots */}
        <div className="flex gap-1.5">
          {questions.map((_, i) => (
            <button key={i} onClick={() => setCurrentIndex(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                i === currentIndex ? 'bg-violet-400 scale-125' :
                answers[i] !== undefined && answers[i] !== '' ? 'bg-emerald-500/70' : 'bg-white/15'
              }`} />
          ))}
        </div>

        {isLast ? (
          <button onClick={handleSubmit} disabled={!allAnswered || isMarking}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-sm hover:brightness-110 disabled:opacity-40 transition-all">
            {isMarking ? <><Loader2 className="w-4 h-4 animate-spin" /> Marking…</> : <><CheckCircle2 className="w-4 h-4" /> Submit & Mark</>}
          </button>
        ) : (
          <button onClick={() => setCurrentIndex(i => Math.min(total - 1, i + 1))}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white font-medium text-sm hover:bg-white/15 transition-all">
            Next <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {!allAnswered && isLast && (
        <p className="text-center text-slate-600 text-xs">Answer all questions before submitting</p>
      )}
    </div>
  );
}

// ─── Question Card ─────────────────────────────────────────────────────────────
function QuestionCard({ question, index, format, answer, onAnswer }) {
  const qType = question.type || format;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-7 h-7 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400 font-black text-sm">
          {index + 1}
        </span>
        <div className="flex-1">
          {/* MC / True-False */}
          {(qType === 'multiple_choice' || qType === 'true_false') && (
            <p className="text-white font-semibold text-sm leading-relaxed">{question.question || question.statement}</p>
          )}
          {/* Fill blank */}
          {qType === 'fill_blank' && (
            <p className="text-white font-semibold text-sm leading-relaxed">{question.sentence}</p>
          )}
          {/* Short / Long answer */}
          {(qType === 'short_answer' || qType === 'long_answer') && (
            <div>
              <p className="text-white font-semibold text-sm leading-relaxed">{question.question}</p>
              {question.marks && (
                <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
                  {question.marks} marks
                </span>
              )}
            </div>
          )}
          {/* Mixed */}
          {qType === 'mixed' && (
            <p className="text-white font-semibold text-sm leading-relaxed">{question.question || question.statement || question.sentence}</p>
          )}
        </div>
      </div>

      {/* Answer input by type */}
      {(qType === 'multiple_choice' || (qType === 'mixed' && question.type === 'multiple_choice')) && (
        <div className="grid grid-cols-1 gap-2">
          {question.options?.map((opt, oi) => (
            <button key={oi} onClick={() => onAnswer(oi)}
              className={`text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                answer === oi ? 'bg-violet-500/25 border-violet-500/50 text-violet-200' : 'bg-white/5 border-white/10 text-slate-300 hover:border-white/20 hover:text-white'
              }`}>
              <span className="font-bold text-xs mr-2 opacity-60">{['A', 'B', 'C', 'D'][oi]}</span> {opt}
            </button>
          ))}
        </div>
      )}

      {(qType === 'true_false' || (qType === 'mixed' && question.type === 'true_false')) && (
        <div className="flex gap-3">
          {['true', 'false'].map(val => (
            <button key={val} onClick={() => onAnswer(val)}
              className={`flex-1 py-3 rounded-xl border font-bold text-sm capitalize transition-all ${
                answer === val
                  ? val === 'true' ? 'bg-emerald-500/25 border-emerald-500/50 text-emerald-300' : 'bg-red-500/25 border-red-500/50 text-red-300'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
              }`}>
              {val === 'true' ? '✅ True' : '❌ False'}
            </button>
          ))}
        </div>
      )}

      {(qType === 'fill_blank' || (qType === 'mixed' && question.type === 'fill_blank')) && (
        <input value={answer || ''} onChange={e => onAnswer(e.target.value)}
          placeholder="Type the missing word or phrase…"
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50" />
      )}

      {(qType === 'short_answer' || (qType === 'mixed' && question.type === 'short_answer')) && (
        <textarea value={answer || ''} onChange={e => onAnswer(e.target.value)} rows={3}
          placeholder="Write your answer here…"
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50 resize-none" />
      )}

      {(qType === 'long_answer' || (qType === 'mixed' && question.type === 'long_answer')) && (
        <div>
          <textarea value={answer || ''} onChange={e => onAnswer(e.target.value)} rows={6}
            placeholder="Write your full answer here…"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50 resize-none" />
          {question.hint && <p className="text-slate-600 text-xs mt-1.5">Hint: {question.hint}</p>}
        </div>
      )}
    </div>
  );
}

// ─── Auto-marking logic ───────────────────────────────────────────────────────
async function markQuestion(question, answer, format, examBoard) {
  const qType = question.type || format;

  // Instant marking for MC and T/F
  if (qType === 'multiple_choice') {
    const correct = answer === question.correct_index;
    return {
      score: correct ? 1 : 0,
      max_marks: 1,
      is_correct: correct,
      feedback: correct ? 'Correct!' : `Incorrect. The answer was ${['A','B','C','D'][question.correct_index]}: ${question.options?.[question.correct_index]}`,
      model_answer: question.options?.[question.correct_index] || '',
      explanation: question.explanation || '',
      improvements: correct ? '' : 'Review this concept in your notes.',
    };
  }

  if (qType === 'true_false') {
    const correct = String(answer).toLowerCase() === String(question.answer).toLowerCase();
    return {
      score: correct ? 1 : 0,
      max_marks: 1,
      is_correct: correct,
      feedback: correct ? 'Correct!' : `Incorrect. The answer is ${question.answer}.`,
      model_answer: String(question.answer),
      explanation: question.explanation || '',
      improvements: correct ? '' : 'Read the explanation and make a note of this fact.',
    };
  }

  if (qType === 'fill_blank') {
    const correct = String(answer).trim().toLowerCase() === String(question.answer || '').trim().toLowerCase();
    return {
      score: correct ? 1 : 0,
      max_marks: 1,
      is_correct: correct,
      feedback: correct ? 'Correct!' : `The expected answer was: "${question.answer}"`,
      model_answer: question.answer || '',
      improvements: correct ? '' : 'Revisit this term in your notes.',
    };
  }

  // AI-marking for short/long answers
  const maxMarks = question.marks || (qType === 'long_answer' ? 8 : 4);
  const markSchemeContext = question.mark_points?.join('; ') || question.mark_scheme?.join('; ') || question.model_answer || '';

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `You are an expert ${examBoard || 'GCSE/A-Level'} examiner. Mark this student's answer.

QUESTION: "${question.question}"
MARKS AVAILABLE: ${maxMarks}
MARK SCHEME / KEY POINTS: ${markSchemeContext}

STUDENT ANSWER:
"${answer}"

Award marks based on the mark scheme. Provide:
- score: integer from 0 to ${maxMarks}
- feedback: 2-3 sentences summarising how well they answered (plain English, no markdown)
- improvements: 2-3 specific things they could add or improve (plain English)
- model_answer: A brief model answer for this question (plain English, no markdown)

Be fair but accurate. If the student got the main points, give full marks.`,
    response_json_schema: {
      type: 'object',
      properties: {
        score: { type: 'number' },
        feedback: { type: 'string' },
        improvements: { type: 'string' },
        model_answer: { type: 'string' },
      },
      required: ['score', 'feedback', 'improvements', 'model_answer']
    }
  });

  return {
    score: Math.min(maxMarks, Math.max(0, result?.score || 0)),
    max_marks: maxMarks,
    feedback: result?.feedback || '',
    improvements: result?.improvements || '',
    model_answer: result?.model_answer || question.model_answer || '',
  };
}

// ─── Results View ─────────────────────────────────────────────────────────────
function QuizResults({ questions, answers, results, title, format, onBack, onRetry }) {
  const [expandedIndex, setExpandedIndex] = useState(null);
  const totalScore = results.reduce((s, r) => s + (r.score || 0), 0);
  const totalMax = results.reduce((s, r) => s + (r.max_marks || 1), 0);
  const pct = Math.round((totalScore / totalMax) * 100);
  const grade = pct >= 90 ? 'A*' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 50 ? 'D' : 'U';
  const gradeColor = pct >= 70 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-white/10 rounded-3xl p-6 text-center">
        <div className="text-5xl mb-2">{pct >= 80 ? '🏆' : pct >= 60 ? '⭐' : '📖'}</div>
        <h2 className="text-white font-black text-2xl mb-1">{title}</h2>
        <p className={`font-black text-5xl ${gradeColor} mb-2`}>{pct}%</p>
        <p className={`text-lg font-bold ${gradeColor}`}>Grade {grade}</p>
        <p className="text-slate-400 text-sm mt-1">{totalScore} / {totalMax} marks</p>

        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3">
            <p className="text-emerald-400 font-black text-xl">{results.filter(r => r.score === r.max_marks).length}</p>
            <p className="text-emerald-400/70 text-xs">Perfect</p>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3">
            <p className="text-amber-400 font-black text-xl">{results.filter(r => r.score > 0 && r.score < r.max_marks).length}</p>
            <p className="text-amber-400/70 text-xs">Partial</p>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-3">
            <p className="text-red-400 font-black text-xl">{results.filter(r => r.score === 0).length}</p>
            <p className="text-red-400/70 text-xs">Missed</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 py-3 rounded-2xl border border-white/10 text-slate-300 hover:bg-white/5 font-semibold text-sm transition-all">
          ← Back to Tools
        </button>
        <button onClick={onRetry} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-violet-500 hover:bg-violet-600 text-white font-black text-sm transition-all">
          <RotateCcw className="w-4 h-4" /> Try Again
        </button>
      </div>

      {/* Per-question breakdown */}
      <div className="space-y-3">
        <p className="text-white font-bold text-sm">Question Breakdown</p>
        {questions.map((q, i) => {
          const r = results[i];
          const isExpanded = expandedIndex === i;
          const perfect = r.score === r.max_marks;
          const missed = r.score === 0;
          return (
            <div key={i} className={`border rounded-2xl overflow-hidden transition-all ${
              perfect ? 'border-emerald-500/25 bg-emerald-500/5' :
              missed ? 'border-red-500/25 bg-red-500/5' :
              'border-amber-500/25 bg-amber-500/5'
            }`}>
              <button onClick={() => setExpandedIndex(isExpanded ? null : i)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left">
                <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  perfect ? 'bg-emerald-500/20 text-emerald-400' :
                  missed ? 'bg-red-500/20 text-red-400' :
                  'bg-amber-500/20 text-amber-400'
                }`}>{i + 1}</span>
                <p className="flex-1 text-sm text-slate-200 font-medium truncate">
                  {q.question || q.statement || q.sentence || 'Question'}
                </p>
                <span className={`text-xs font-bold flex-shrink-0 ${
                  perfect ? 'text-emerald-400' : missed ? 'text-red-400' : 'text-amber-400'
                }`}>{r.score}/{r.max_marks}</span>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-white/5">
                    <div className="px-4 py-4 space-y-3">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Your Answer</p>
                        <p className="text-slate-300 text-sm">{String(answers[i] ?? '(no answer)')}</p>
                      </div>
                      {r.feedback && (
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Feedback</p>
                          <p className="text-slate-200 text-sm leading-relaxed">{r.feedback}</p>
                          {r.explanation && <p className="text-slate-400 text-xs mt-1">{r.explanation}</p>}
                        </div>
                      )}
                      {r.model_answer && (
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Model Answer</p>
                          <p className="text-emerald-300 text-sm leading-relaxed">{r.model_answer}</p>
                        </div>
                      )}
                      {r.improvements && (
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">How to Improve</p>
                          <p className="text-amber-300 text-sm leading-relaxed">{r.improvements}</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}