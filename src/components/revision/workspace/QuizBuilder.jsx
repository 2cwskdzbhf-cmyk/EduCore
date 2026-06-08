import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import {
  Zap, Loader2, ChevronLeft, ChevronRight, CheckCircle2,
  XCircle, RotateCcw, TrendingDown, Lightbulb, Trophy, Copy
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getSourceContext(sources) {
  return sources.filter(s => s.content_text)
    .map(s => `### ${s.name}\n${s.content_text.slice(0, 8000)}`).join('\n\n---\n\n');
}

const Q_COUNTS = [5, 10, 15, 20, 25, 30, 40, 50];
const Q_TYPES = [
  { id: 'mcq', label: 'Multiple Choice' },
  { id: 'short', label: 'Short Answer' },
  { id: 'long', label: 'Long Answer' },
  { id: 'fill', label: 'Fill-in-the-Blank' },
  { id: 'mixed', label: 'Mixed Mode' },
];
const DIFFICULTIES = [
  { id: 'easy', label: 'Easy', desc: 'Definitions & recall', color: 'from-emerald-500 to-teal-500' },
  { id: 'medium', label: 'Medium', desc: 'Explanations & examples', color: 'from-amber-500 to-orange-500' },
  { id: 'hard', label: 'Hard', desc: 'Multi-step reasoning', color: 'from-rose-500 to-pink-600' },
  { id: 'adaptive', label: 'Adaptive', desc: 'Based on weak topics', color: 'from-violet-500 to-purple-600' },
];
const EXAM_BOARDS = ['AQA', 'OCR', 'Edexcel', 'WJEC'];

// ─── Build prompt for question generation ─────────────────────────────────────
function buildGenerationPrompt(config, ctx, weakTopics) {
  const typeInstructions = {
    mcq: 'All questions must be multiple choice with exactly 4 options (A, B, C, D). Include the correct answer index (0-3) and a brief explanation.',
    short: 'All questions require a short answer (1-3 sentences). Include the model answer and key marking points.',
    long: 'All questions require extended written responses (a paragraph or more). Include a detailed mark scheme.',
    fill: 'All questions are fill-in-the-blank. Show the sentence with a blank (___) and include the correct answer.',
    mixed: 'Mix question types: include some multiple choice, some short answer, and some fill-in-the-blank questions.',
  };
  const diffInstructions = {
    easy: 'Focus on basic definitions, key vocabulary, simple recall. Suitable for a student just starting revision.',
    medium: 'Focus on explanations, comparisons, examples, cause-and-effect. Require some understanding.',
    hard: 'Focus on multi-step reasoning, application, analysis, and evaluation. Require deep understanding.',
    adaptive: weakTopics?.length
      ? `Focus specifically on these detected weak topics: ${weakTopics.join(', ')}. Target misconceptions and gaps.`
      : 'Cover all topics with a mix of difficulty, focusing on areas most likely to appear in exams.',
  };

  return `You are an expert exam question writer generating a ${config.examBoard}-style quiz.

TASK: Generate exactly ${config.numQuestions} questions.
QUESTION TYPE: ${typeInstructions[config.questionType]}
DIFFICULTY: ${diffInstructions[config.difficulty]}
EXAM BOARD STYLE: ${config.examBoard} — use mark scheme language and style appropriate for this board.

For EACH question return:
- question: the question text
- type: one of "mcq", "short", "long", "fill"
- options: array of 4 strings (only for mcq, null otherwise)
- correct_index: 0-3 (only for mcq, null otherwise)
- correct_answer: the model answer or correct word for fill-in-blank
- mark_scheme: detailed marking guidance
- topic: the topic/concept this question tests
- marks: number of marks (1 for mcq/fill, 3-6 for short/long)

SOURCE MATERIAL:
${ctx}`;
}

// ─── Quiz Builder (config screen) ─────────────────────────────────────────────
function QuizBuilderConfig({ notebook, allSources, onStart }) {
  const [numQuestions, setNumQuestions] = useState(10);
  const [questionType, setQuestionType] = useState('mcq');
  const [difficulty, setDifficulty] = useState('medium');
  const [examBoard, setExamBoard] = useState('AQA');
  const [selectedSourceIds, setSelectedSourceIds] = useState(null); // null = all
  const [showSourcePicker, setShowSourcePicker] = useState(false);

  const hasSources = allSources.some(s => s.content_text);

  const toggleSource = (id) => {
    if (!selectedSourceIds) {
      setSelectedSourceIds(allSources.map(s => s.id).filter(x => x !== id));
    } else {
      setSelectedSourceIds(prev =>
        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      );
    }
  };

  const effectiveSources = selectedSourceIds
    ? allSources.filter(s => selectedSourceIds.includes(s.id))
    : allSources;

  if (!hasSources) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="text-5xl mb-4">📚</div>
        <h3 className="text-white font-bold text-lg mb-2">No sources yet</h3>
        <p className="text-slate-400 text-sm max-w-sm">This notebook has no sources yet. Add sources first to generate a quiz.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg">Quiz Builder</h2>
            <p className="text-slate-400 text-xs">{notebook.name}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-8">

        {/* Number of Questions */}
        <div>
          <p className="text-white font-semibold mb-3">Number of Questions</p>
          <div className="flex flex-wrap gap-2">
            {Q_COUNTS.map(n => (
              <button key={n} onClick={() => setNumQuestions(n)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                  numQuestions === n
                    ? 'bg-indigo-500/30 border-indigo-500/60 text-indigo-300'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                }`}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Question Type */}
        <div>
          <p className="text-white font-semibold mb-3">Question Type</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Q_TYPES.map(t => (
              <button key={t.id} onClick={() => setQuestionType(t.id)}
                className={`px-4 py-3 rounded-xl text-sm font-medium text-left transition-all border ${
                  questionType === t.id
                    ? 'bg-indigo-500/20 border-indigo-500/50 text-white'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                }`}>
                {questionType === t.id && <span className="mr-2 text-indigo-400">✓</span>}
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div>
          <p className="text-white font-semibold mb-3">Difficulty</p>
          <div className="grid grid-cols-2 gap-2">
            {DIFFICULTIES.map(d => (
              <button key={d.id} onClick={() => setDifficulty(d.id)}
                className={`px-4 py-3 rounded-xl text-sm text-left transition-all border ${
                  difficulty === d.id
                    ? `bg-gradient-to-r ${d.color} border-transparent text-white shadow-md`
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                }`}>
                <div className="font-bold">{d.label}</div>
                <div className={`text-xs mt-0.5 ${difficulty === d.id ? 'text-white/70' : 'text-slate-500'}`}>{d.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Exam Board */}
        <div>
          <p className="text-white font-semibold mb-3">Exam Board Style</p>
          <div className="flex gap-2 flex-wrap">
            {EXAM_BOARDS.map(b => (
              <button key={b} onClick={() => setExamBoard(b)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                  examBoard === b
                    ? 'bg-violet-500/30 border-violet-500/60 text-violet-300'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                }`}>
                {b}
              </button>
            ))}
          </div>
        </div>

        {/* Source Selection */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-white font-semibold">Sources</p>
            <button onClick={() => setShowSourcePicker(v => !v)}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              {showSourcePicker ? 'Hide' : 'Select specific sources'}
            </button>
          </div>
          {!showSourcePicker ? (
            <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-400 text-sm">
              Using all {allSources.filter(s => s.content_text).length} sources in this notebook
            </div>
          ) : (
            <div className="space-y-2">
              {allSources.filter(s => s.content_text).map(s => {
                const isSelected = !selectedSourceIds || selectedSourceIds.includes(s.id);
                return (
                  <label key={s.id} className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/8 transition-all">
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSource(s.id)}
                      className="w-4 h-4 accent-indigo-500" />
                    <span className="text-slate-300 text-sm truncate">{s.name}</span>
                  </label>
                );
              })}
              {selectedSourceIds && selectedSourceIds.length === 0 && (
                <p className="text-red-400 text-xs px-1">Select at least one source</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Start button */}
      <div className="flex-shrink-0 p-6 border-t border-white/10">
        <button
          onClick={() => onStart({ numQuestions, questionType, difficulty, examBoard, sources: effectiveSources })}
          disabled={effectiveSources.length === 0 || (selectedSourceIds && selectedSourceIds.length === 0)}
          className="w-full py-4 bg-gradient-to-r from-indigo-500 to-blue-600 text-white font-bold text-base rounded-2xl hover:brightness-110 transition-all shadow-xl shadow-indigo-500/25 disabled:opacity-40">
          Generate {numQuestions}-Question Quiz →
        </button>
        <p className="text-center text-slate-600 text-xs mt-2">AI will generate from {effectiveSources.filter(s=>s.content_text).length} source{effectiveSources.length !== 1 ? 's' : ''}</p>
      </div>
    </div>
  );
}

// ─── Quiz Player ──────────────────────────────────────────────────────────────
function QuizPlayer({ questions, config, onSubmit }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});

  const q = questions[currentIdx];
  const totalAnswered = Object.keys(answers).length;
  const progress = (currentIdx / questions.length) * 100;

  const setAnswer = (val) => setAnswers(prev => ({ ...prev, [currentIdx]: val }));

  return (
    <div className="flex flex-col h-full">
      {/* Progress bar */}
      <div className="flex-shrink-0 px-6 py-3 border-b border-white/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-400 text-xs font-medium">Question {currentIdx + 1} of {questions.length}</span>
          <span className="text-slate-500 text-xs">{totalAnswered} answered</span>
        </div>
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <motion.div className="h-full bg-gradient-to-r from-indigo-500 to-blue-400 rounded-full"
            animate={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
            transition={{ duration: 0.3 }} />
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div key={currentIdx} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }} className="max-w-2xl mx-auto">

            <div className="flex items-start gap-3 mb-6">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 text-sm font-bold">
                {currentIdx + 1}
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
                    {q.type === 'mcq' ? 'Multiple Choice' : q.type === 'short' ? 'Short Answer' : q.type === 'long' ? 'Long Answer' : 'Fill in the Blank'}
                  </span>
                  {q.marks && <span className="text-[10px] text-slate-600">{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>}
                </div>
                <p className="text-white font-semibold text-lg leading-relaxed">{q.question}</p>
                {q.topic && <p className="text-slate-500 text-xs mt-1">Topic: {q.topic}</p>}
              </div>
            </div>

            {/* MCQ options */}
            {q.type === 'mcq' && q.options && (
              <div className="space-y-2.5">
                {q.options.map((opt, oi) => (
                  <button key={oi} onClick={() => setAnswer(oi)}
                    className={`w-full text-left px-5 py-3.5 rounded-2xl border text-sm transition-all ${
                      answers[currentIdx] === oi
                        ? 'bg-indigo-500/20 border-indigo-500/50 text-white shadow-md shadow-indigo-500/10'
                        : 'bg-white/[0.04] border-white/10 text-slate-300 hover:bg-white/[0.08] hover:border-white/20'
                    }`}>
                    <span className="font-bold text-slate-500 mr-3">{['A','B','C','D'][oi]}.</span>
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {/* Fill in blank */}
            {q.type === 'fill' && (
              <input
                value={answers[currentIdx] || ''}
                onChange={e => setAnswer(e.target.value)}
                placeholder="Type your answer…"
                className="w-full px-5 py-3.5 bg-white/5 border border-white/15 focus:border-indigo-500/50 rounded-2xl text-white placeholder:text-slate-500 focus:outline-none text-sm transition-all"
              />
            )}

            {/* Short answer */}
            {q.type === 'short' && (
              <textarea
                value={answers[currentIdx] || ''}
                onChange={e => setAnswer(e.target.value)}
                placeholder="Write your answer (1–3 sentences)…"
                rows={4}
                className="w-full px-5 py-3.5 bg-white/5 border border-white/15 focus:border-indigo-500/50 rounded-2xl text-white placeholder:text-slate-500 focus:outline-none text-sm resize-none transition-all"
              />
            )}

            {/* Long answer */}
            {q.type === 'long' && (
              <textarea
                value={answers[currentIdx] || ''}
                onChange={e => setAnswer(e.target.value)}
                placeholder="Write your extended answer here…"
                rows={8}
                className="w-full px-5 py-3.5 bg-white/5 border border-white/15 focus:border-indigo-500/50 rounded-2xl text-white placeholder:text-slate-500 focus:outline-none text-sm resize-none transition-all"
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-white/10 flex items-center justify-between gap-3">
        <button onClick={() => setCurrentIdx(i => Math.max(0, i - 1))} disabled={currentIdx === 0}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-slate-400 rounded-xl text-sm disabled:opacity-30 hover:text-white transition-all">
          <ChevronLeft className="w-4 h-4" /> Prev
        </button>

        <span className="text-slate-600 text-xs">{totalAnswered}/{questions.length} answered</span>

        {currentIdx < questions.length - 1 ? (
          <button onClick={() => setCurrentIdx(i => Math.min(questions.length - 1, i + 1))}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 rounded-xl text-sm hover:bg-indigo-500/30 transition-all">
            Next <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={() => onSubmit(answers)}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-xl text-sm font-bold hover:brightness-110 transition-all shadow-lg shadow-indigo-500/20">
            Submit Quiz ✓
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Results Screen ────────────────────────────────────────────────────────────
function QuizResults({ questions, answers, results, config, onRetry, onNewQuiz }) {
  const [expandedIdx, setExpandedIdx] = useState(null);

  const score = results.filter(r => r.is_correct).length;
  const totalMarks = questions.reduce((s, q) => s + (q.marks || 1), 0);
  const earnedMarks = results.reduce((s, r) => s + (r.marks_awarded || 0), 0);
  const pct = Math.round((earnedMarks / totalMarks) * 100);

  const grade = pct >= 90 ? 'A*' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 50 ? 'D' : 'U';
  const gradeColor = pct >= 70 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400';

  const weakTopics = [...new Set(results.filter(r => !r.is_correct).map(r => questions[r.index]?.topic).filter(Boolean))];

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Score header */}
      <div className="flex-shrink-0 px-6 py-6 border-b border-white/10">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1">
            <h2 className="text-white font-bold text-xl mb-1">Quiz Complete</h2>
            <p className="text-slate-400 text-sm">{config.numQuestions} questions · {config.difficulty} · {config.examBoard}</p>
          </div>
          <div className="text-right">
            <div className={`text-4xl font-black ${gradeColor}`}>{grade}</div>
            <div className="text-slate-400 text-sm">{pct}%</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
            <div className="text-white font-bold text-lg">{earnedMarks}/{totalMarks}</div>
            <div className="text-slate-500 text-xs">Marks</div>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 text-center">
            <div className="text-emerald-400 font-bold text-lg">{score}</div>
            <div className="text-slate-500 text-xs">Correct</div>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-3 text-center">
            <div className="text-red-400 font-bold text-lg">{questions.length - score}</div>
            <div className="text-slate-500 text-xs">Incorrect</div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6">
        {/* Weak topics */}
        {weakTopics.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-amber-400" />
              <p className="text-amber-300 font-semibold text-sm">Weak Topics Detected</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {weakTopics.map((t, i) => (
                <span key={i} className="px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-amber-200 text-xs">{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* Next steps */}
        {results[0]?.next_steps && (
          <div className="bg-violet-500/10 border border-violet-500/30 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-violet-400" />
              <p className="text-violet-300 font-semibold text-sm">Suggested Next Steps</p>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">{results[0].next_steps}</p>
          </div>
        )}

        {/* Per-question breakdown */}
        <div>
          <p className="text-white font-semibold mb-3">Question Breakdown</p>
          <div className="space-y-2">
            {questions.map((q, i) => {
              const r = results.find(x => x.index === i);
              const correct = r?.is_correct;
              const isOpen = expandedIdx === i;
              return (
                <div key={i} className={`rounded-2xl border overflow-hidden transition-all ${
                  correct ? 'border-emerald-500/20 bg-emerald-500/[0.05]' : 'border-red-500/20 bg-red-500/[0.05]'
                }`}>
                  <button className="w-full flex items-start gap-3 p-4 text-left" onClick={() => setExpandedIdx(isOpen ? null : i)}>
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${correct ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                      {correct
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        : <XCircle className="w-3.5 h-3.5 text-red-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium leading-snug">{q.question}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {q.topic && <span className="text-[10px] text-slate-500">{q.topic}</span>}
                        <span className={`text-[10px] font-bold ${correct ? 'text-emerald-400' : 'text-red-400'}`}>
                          {r?.marks_awarded || 0}/{q.marks || 1} marks
                        </span>
                      </div>
                    </div>
                    <span className="text-slate-600 text-xs">{isOpen ? '▲' : '▼'}</span>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden">
                        <div className="px-4 pb-4 space-y-3 border-t border-white/10">
                          {/* User's answer */}
                          <div className="mt-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Your Answer</p>
                            <p className="text-slate-300 text-sm">
                              {q.type === 'mcq' && answers[i] !== undefined
                                ? `${['A','B','C','D'][answers[i]]}. ${q.options?.[answers[i]] || '(no answer)'}`
                                : answers[i] || '(no answer)'}
                            </p>
                          </div>
                          {/* Correct answer */}
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500/70 mb-1">Correct Answer</p>
                            <p className="text-emerald-300 text-sm">
                              {q.type === 'mcq' && q.correct_index !== null
                                ? `${['A','B','C','D'][q.correct_index]}. ${q.options?.[q.correct_index]}`
                                : q.correct_answer}
                            </p>
                          </div>
                          {/* Mark scheme */}
                          {q.mark_scheme && (
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Mark Scheme ({config.examBoard})</p>
                              <p className="text-slate-400 text-sm leading-relaxed">{q.mark_scheme}</p>
                            </div>
                          )}
                          {/* AI feedback */}
                          {r?.feedback && (
                            <div className="bg-white/5 rounded-xl p-3">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-violet-400 mb-1">AI Feedback</p>
                              <p className="text-slate-300 text-sm">{r.feedback}</p>
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
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 p-6 border-t border-white/10 flex gap-3">
        <button onClick={onRetry}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 text-slate-400 rounded-xl text-sm font-semibold hover:text-white transition-all">
          <RotateCcw className="w-4 h-4" /> Retry Same Quiz
        </button>
        <button onClick={onNewQuiz}
          className="flex-1 py-3 bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-xl text-sm font-bold hover:brightness-110 transition-all shadow-lg shadow-indigo-500/20">
          New Quiz →
        </button>
      </div>
    </div>
  );
}

// ─── Main QuizBuilder component ────────────────────────────────────────────────
export default function QuizBuilder({ notebook, user, allSources, onResourceCreated }) {
  const [phase, setPhase] = useState('config'); // config | generating | playing | marking | results
  const [config, setConfig] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState([]);
  const [genProgress, setGenProgress] = useState('');

  const generate = async (cfg) => {
    setConfig(cfg);
    setPhase('generating');
    setGenProgress('Loading sources…');

    const ctx = getSourceContext(cfg.sources);

    // Detect weak topics from past resources if adaptive
    let weakTopics = [];
    if (cfg.difficulty === 'adaptive') {
      try {
        const pastResources = await base44.entities.NotebookResource.filter({
          notebook_id: notebook.id, student_email: user.email, resource_type: 'quiz',
        }, '-created_date', 5);
        for (const r of pastResources) {
          try {
            const parsed = JSON.parse(r.content || '{}');
            if (parsed.weak_topics) weakTopics.push(...parsed.weak_topics);
          } catch {}
        }
        weakTopics = [...new Set(weakTopics)].slice(0, 10);
      } catch {}
    }

    setGenProgress('Generating questions with AI…');
    const prompt = buildGenerationPrompt(cfg, ctx, weakTopics);

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          questions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                question: { type: 'string' },
                type: { type: 'string' },
                options: { type: 'array', items: { type: 'string' } },
                correct_index: { type: 'number' },
                correct_answer: { type: 'string' },
                mark_scheme: { type: 'string' },
                topic: { type: 'string' },
                marks: { type: 'number' },
              },
              required: ['question', 'type', 'correct_answer', 'mark_scheme', 'topic', 'marks'],
            },
          },
        },
        required: ['questions'],
      },
    });

    const qs = (result?.questions || []).slice(0, cfg.numQuestions);
    setQuestions(qs);
    setAnswers({});
    setPhase('playing');
  };

  const submitForMarking = async (userAnswers) => {
    setAnswers(userAnswers);
    setPhase('marking');

    // Build marking prompt
    const markingData = questions.map((q, i) => ({
      index: i,
      question: q.question,
      type: q.type,
      correct_answer: q.type === 'mcq' ? q.options?.[q.correct_index] : q.correct_answer,
      correct_index: q.correct_index,
      student_answer: q.type === 'mcq'
        ? (userAnswers[i] !== undefined ? q.options?.[userAnswers[i]] : null)
        : userAnswers[i],
      marks_available: q.marks || 1,
      mark_scheme: q.mark_scheme,
    }));

    const markingPrompt = `You are an expert ${config.examBoard} examiner. Mark each answer fairly and provide concise feedback.

For each question:
- is_correct: true/false (for MCQ: exact match; for written: use judgment)
- marks_awarded: integer 0 to marks_available
- feedback: 1-2 sentence personalised feedback
- For the LAST item only, add next_steps: suggested revision based on overall performance

QUESTIONS AND ANSWERS:
${JSON.stringify(markingData, null, 2)}`;

    const markResult = await base44.integrations.Core.InvokeLLM({
      prompt: markingPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          results: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                index: { type: 'number' },
                is_correct: { type: 'boolean' },
                marks_awarded: { type: 'number' },
                feedback: { type: 'string' },
                next_steps: { type: 'string' },
              },
              required: ['index', 'is_correct', 'marks_awarded', 'feedback'],
            },
          },
        },
        required: ['results'],
      },
    });

    const marked = markResult?.results || [];
    setResults(marked);

    // Save to NotebookResource
    const totalMarks = questions.reduce((s, q) => s + (q.marks || 1), 0);
    const earned = marked.reduce((s, r) => s + (r.marks_awarded || 0), 0);
    const pct = Math.round((earned / totalMarks) * 100);
    const weakTopics = [...new Set(marked.filter(r => !r.is_correct).map(r => questions[r.index]?.topic).filter(Boolean))];

    const saveContent = JSON.stringify({
      score: pct,
      earned_marks: earned,
      total_marks: totalMarks,
      questions,
      answers: userAnswers,
      results: marked,
      weak_topics: weakTopics,
      difficulty: config.difficulty,
      question_type: config.questionType,
      exam_board: config.examBoard,
      num_questions: config.numQuestions,
      completed_at: new Date().toISOString(),
    });

    const res = await base44.entities.NotebookResource.create({
      notebook_id: notebook.id, student_email: user.email,
      title: `Quiz — ${pct}% · ${config.difficulty} · ${new Date().toLocaleDateString()}`,
      resource_type: 'quiz', content: saveContent,
      source_ids: config.sources.map(s => s.id), source_count: config.sources.length,
    });
    onResourceCreated(res);

    setPhase('results');
  };

  // ── Generating screen
  if (phase === 'generating') return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
      <div>
        <p className="text-white font-bold text-xl mb-2">Building Your Quiz…</p>
        <p className="text-slate-400 text-sm">{genProgress}</p>
      </div>
      <div className="flex gap-1 mt-2">
        {[0,1,2,3,4].map(i => (
          <motion.div key={i} className="w-2 h-2 bg-indigo-400 rounded-full"
            animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity }} />
        ))}
      </div>
    </div>
  );

  // ── Marking screen
  if (phase === 'marking') return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
      <div>
        <p className="text-white font-bold text-xl mb-2">Marking Your Answers…</p>
        <p className="text-slate-400 text-sm">AI is reviewing your responses and generating feedback</p>
      </div>
    </div>
  );

  return (
    <AnimatePresence mode="wait">
      {phase === 'config' && (
        <motion.div key="config" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="h-full">
          <QuizBuilderConfig notebook={notebook} allSources={allSources} onStart={generate} />
        </motion.div>
      )}
      {phase === 'playing' && (
        <motion.div key="playing" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="h-full">
          <QuizPlayer questions={questions} config={config} onSubmit={submitForMarking} />
        </motion.div>
      )}
      {phase === 'results' && (
        <motion.div key="results" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="h-full">
          <QuizResults
            questions={questions}
            answers={answers}
            results={results}
            config={config}
            onRetry={() => { setAnswers({}); setPhase('playing'); }}
            onNewQuiz={() => setPhase('config')}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}