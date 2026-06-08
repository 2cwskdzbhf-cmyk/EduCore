import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import {
  Zap, Loader2, ChevronLeft, ChevronRight, CheckCircle2,
  XCircle, RotateCcw, Trophy, AlertTriangle, Target, BookOpen, Copy
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getSourceContext(sources) {
  return sources.filter(s => s.content_text)
    .map(s => `### ${s.name}\n${s.content_text.slice(0, 8000)}`).join('\n\n---\n\n');
}

const Q_COUNTS = [5, 10, 15, 20, 25, 30, 40, 50];

const Q_TYPES = [
  { id: 'mcq', label: 'Multiple Choice', desc: 'Pick one of four options' },
  { id: 'short', label: 'Short Answer', desc: '1–2 sentence response' },
  { id: 'long', label: 'Long Answer', desc: 'Extended written response' },
  { id: 'fitb', label: 'Fill in the Blank', desc: 'Complete the sentence' },
  { id: 'mixed', label: 'Mixed Mode', desc: 'All types randomised' },
];

const DIFFICULTIES = [
  { id: 'easy', label: 'Easy', color: 'from-emerald-500 to-teal-600', desc: 'Definitions & simple recall' },
  { id: 'medium', label: 'Medium', color: 'from-indigo-500 to-blue-600', desc: 'Explanations & comparisons' },
  { id: 'hard', label: 'Hard', color: 'from-rose-500 to-pink-600', desc: 'Multi-step & applied questions' },
  { id: 'adaptive', label: 'Adaptive', color: 'from-violet-500 to-purple-600', desc: 'Based on your weak topics' },
];

const EXAM_BOARDS = ['AQA', 'OCR', 'Edexcel', 'WJEC', 'Any'];

// ─── Quiz Builder (config screen) ─────────────────────────────────────────────
function QuizBuilder({ notebook, allSources, onStart }) {
  const [numQ, setNumQ] = useState(10);
  const [qType, setQType] = useState('mcq');
  const [difficulty, setDifficulty] = useState('medium');
  const [examBoard, setExamBoard] = useState('Any');
  const [selectedSources, setSelectedSources] = useState(allSources.map(s => s.id));

  const toggleSource = (id) =>
    setSelectedSources(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const hasSources = allSources.some(s => s.content_text);

  if (!hasSources) return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="text-5xl mb-4">📚</div>
      <h3 className="text-white font-bold text-lg mb-2">No sources yet</h3>
      <p className="text-slate-400 text-sm max-w-sm">This notebook has no sources. Add sources in the left panel first.</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-white/10 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg">
          <Zap className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
        </div>
        <div>
          <h2 className="text-white font-bold text-base">Quiz Builder</h2>
          <p className="text-slate-500 text-[11px]">Configure and generate a quiz from your sources</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">

        {/* 1. Number of Questions */}
        <section>
          <p className="text-white font-semibold text-sm mb-3">Number of Questions</p>
          <div className="flex flex-wrap gap-2">
            {Q_COUNTS.map(n => (
              <button key={n} onClick={() => setNumQ(n)}
                className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${numQ === n
                  ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20'}`}>
                {n}
              </button>
            ))}
          </div>
        </section>

        {/* 2. Question Type */}
        <section>
          <p className="text-white font-semibold text-sm mb-3">Question Type</p>
          <div className="grid grid-cols-1 gap-2">
            {Q_TYPES.map(qt => (
              <button key={qt.id} onClick={() => setQType(qt.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${qType === qt.id
                  ? 'bg-indigo-500/15 border-indigo-500/40 text-white'
                  : 'bg-white/[0.03] border-white/8 text-slate-400 hover:bg-white/[0.06] hover:text-white'}`}>
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${qType === qt.id ? 'border-indigo-400' : 'border-slate-600'}`}>
                  {qType === qt.id && <div className="w-2 h-2 rounded-full bg-indigo-400" />}
                </div>
                <div>
                  <p className="font-semibold text-sm leading-tight">{qt.label}</p>
                  <p className="text-[11px] text-slate-500">{qt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* 3. Difficulty */}
        <section>
          <p className="text-white font-semibold text-sm mb-3">Difficulty</p>
          <div className="grid grid-cols-2 gap-2">
            {DIFFICULTIES.map(d => (
              <button key={d.id} onClick={() => setDifficulty(d.id)}
                className={`px-4 py-3 rounded-xl border text-left transition-all ${difficulty === d.id
                  ? `bg-gradient-to-br ${d.color} border-transparent text-white shadow-md`
                  : 'bg-white/[0.03] border-white/8 text-slate-400 hover:bg-white/[0.06] hover:text-white'}`}>
                <p className="font-bold text-sm">{d.label}</p>
                <p className="text-[10px] opacity-70 mt-0.5">{d.desc}</p>
              </button>
            ))}
          </div>
        </section>

        {/* 4. Exam Board */}
        <section>
          <p className="text-white font-semibold text-sm mb-3">Mark Scheme Style</p>
          <div className="flex flex-wrap gap-2">
            {EXAM_BOARDS.map(b => (
              <button key={b} onClick={() => setExamBoard(b)}
                className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${examBoard === b
                  ? 'bg-violet-500/20 border-violet-500/50 text-violet-300'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}>
                {b}
              </button>
            ))}
          </div>
        </section>

        {/* 5. Source Selection */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-white font-semibold text-sm">Sources</p>
            <button onClick={() =>
              selectedSources.length === allSources.length
                ? setSelectedSources([])
                : setSelectedSources(allSources.map(s => s.id))}
              className="text-xs text-slate-500 hover:text-white transition-colors">
              {selectedSources.length === allSources.length ? 'Deselect all' : 'Select all'}
            </button>
          </div>
          <div className="space-y-1.5">
            {allSources.filter(s => s.content_text).map(src => (
              <button key={src.id} onClick={() => toggleSource(src.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left transition-all ${selectedSources.includes(src.id)
                  ? 'bg-white/[0.07] border-white/15 text-white'
                  : 'bg-white/[0.02] border-white/5 text-slate-500 hover:bg-white/[0.05]'}`}>
                <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${selectedSources.includes(src.id) ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600'}`}>
                  {selectedSources.includes(src.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                </div>
                <span className="text-sm truncate">{src.name}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Start button */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-white/10">
        <button
          onClick={() => onStart({ numQ, qType, difficulty, examBoard, selectedSources })}
          disabled={selectedSources.length === 0}
          className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-blue-600 text-white font-bold text-base rounded-2xl hover:brightness-110 transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-40">
          Start Quiz — {numQ} Questions
        </button>
      </div>
    </div>
  );
}

// ─── Quiz Player ──────────────────────────────────────────────────────────────
function QuizPlayer({ questions, config, notebook, user, allSources, onFinish, onResourceCreated }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [marking, setMarking] = useState(false);
  const [markResults, setMarkResults] = useState(null);

  const q = questions[currentIdx];
  const total = questions.length;
  const answered = Object.keys(answers).length;

  const setAnswer = (val) => setAnswers(prev => ({ ...prev, [currentIdx]: val }));

  const submitQuiz = async () => {
    setMarking(true);
    const ctx = getSourceContext(allSources);

    // Build marking prompt
    const qaList = questions.map((q, i) => ({
      question: q.question,
      type: q.type,
      user_answer: answers[i] || '',
      correct_answer: q.correct_answer,
      options: q.options || [],
    }));

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert ${config.examBoard !== 'Any' ? config.examBoard : 'exam'} marker. Mark each student answer fairly.
For each question return: is_correct (boolean), mark_awarded (number 0 or 1 for most, or 0-2 for long answers), max_marks (1 for MCQ/short/fitb, 2 for long), feedback (1-2 sentences), correct_answer_explanation (model answer).
Also return: total_score, total_possible, percentage, weak_topics (array of topic strings), strong_topics (array), suggested_next_steps (2-3 sentences).

EXAM STYLE: ${config.examBoard !== 'Any' ? config.examBoard : 'General exam standard'}
QUESTIONS AND ANSWERS:
${JSON.stringify(qaList, null, 2)}

SOURCE CONTEXT (for marking reference):
${ctx.slice(0, 6000)}`,
      response_json_schema: {
        type: 'object',
        properties: {
          results: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                is_correct: { type: 'boolean' },
                mark_awarded: { type: 'number' },
                max_marks: { type: 'number' },
                feedback: { type: 'string' },
                correct_answer_explanation: { type: 'string' },
              },
              required: ['is_correct', 'mark_awarded', 'max_marks', 'feedback', 'correct_answer_explanation'],
              additionalProperties: false,
            }
          },
          total_score: { type: 'number' },
          total_possible: { type: 'number' },
          percentage: { type: 'number' },
          weak_topics: { type: 'array', items: { type: 'string' } },
          strong_topics: { type: 'array', items: { type: 'string' } },
          suggested_next_steps: { type: 'string' },
        },
        required: ['results', 'total_score', 'total_possible', 'percentage', 'weak_topics', 'strong_topics', 'suggested_next_steps'],
        additionalProperties: false,
      }
    });

    // Save to NotebookResource
    const saveData = {
      questions,
      answers,
      results: result?.results || [],
      score: result?.total_score,
      total: result?.total_possible,
      percentage: result?.percentage,
      weak_topics: result?.weak_topics || [],
      strong_topics: result?.strong_topics || [],
      config,
      completed_at: new Date().toISOString(),
    };

    const pct = result?.percentage || 0;
    const grade = pct >= 90 ? 'A*' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 50 ? 'D' : 'U';

    const res = await base44.entities.NotebookResource.create({
      notebook_id: notebook.id,
      student_email: user.email,
      title: `${notebook.name} — Quiz (${result?.total_score ?? 0}/${result?.total_possible ?? total}, ${grade}) · ${new Date().toLocaleDateString()}`,
      resource_type: 'quiz',
      content: JSON.stringify(saveData),
      source_ids: allSources.map(s => s.id),
      source_count: allSources.length,
    });
    onResourceCreated(res);

    setMarkResults(result);
    setSubmitted(true);
    setMarking(false);
  };

  if (marking) return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
      <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
      <p className="text-white font-bold text-lg">Marking your quiz…</p>
      <p className="text-slate-400 text-sm">AI is grading each answer against the mark scheme</p>
    </div>
  );

  if (submitted && markResults) {
    return <QuizResults questions={questions} answers={answers} markResults={markResults} config={config} notebook={notebook} onRetry={onFinish} />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Progress bar */}
      <div className="flex-shrink-0 px-6 py-3 border-b border-white/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-400 text-xs font-medium">Question {currentIdx + 1} of {total}</span>
          <span className="text-slate-500 text-xs">{answered}/{total} answered</span>
        </div>
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <motion.div className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full"
            animate={{ width: `${((currentIdx + 1) / total) * 100}%` }} transition={{ duration: 0.3 }} />
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <AnimatePresence mode="wait">
          <motion.div key={currentIdx} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
            <div className="flex items-start gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 text-indigo-300 font-bold text-sm">
                {currentIdx + 1}
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">
                  {q.type === 'mcq' ? 'Multiple Choice' : q.type === 'short' ? 'Short Answer' : q.type === 'long' ? 'Long Answer' : 'Fill in the Blank'}
                </p>
                <p className="text-white font-semibold text-base leading-relaxed">{q.question}</p>
              </div>
            </div>

            {/* MCQ */}
            {q.type === 'mcq' && q.options && (
              <div className="space-y-2">
                {q.options.map((opt, oi) => (
                  <button key={oi} onClick={() => setAnswer(opt)}
                    className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border text-sm transition-all ${answers[currentIdx] === opt
                      ? 'bg-indigo-500/20 border-indigo-500/40 text-white'
                      : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.07] hover:text-white'}`}>
                    <span className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-xs font-bold border-current">
                      {['A','B','C','D'][oi]}
                    </span>
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {/* Short Answer */}
            {q.type === 'short' && (
              <input
                value={answers[currentIdx] || ''}
                onChange={e => setAnswer(e.target.value)}
                placeholder="Type your answer here…"
                className="w-full px-4 py-3 bg-white/5 border border-white/15 focus:border-indigo-500/50 rounded-xl text-white placeholder:text-slate-500 focus:outline-none text-sm transition-colors"
              />
            )}

            {/* Long Answer */}
            {q.type === 'long' && (
              <textarea
                value={answers[currentIdx] || ''}
                onChange={e => setAnswer(e.target.value)}
                placeholder="Write your detailed answer here…"
                rows={8}
                className="w-full px-4 py-3 bg-white/5 border border-white/15 focus:border-indigo-500/50 rounded-xl text-white placeholder:text-slate-500 focus:outline-none text-sm resize-none transition-colors"
              />
            )}

            {/* Fill in the blank */}
            {q.type === 'fitb' && (
              <div className="space-y-3">
                <p className="text-slate-400 text-sm">{q.context || q.question}</p>
                <input
                  value={answers[currentIdx] || ''}
                  onChange={e => setAnswer(e.target.value)}
                  placeholder="Fill in the blank…"
                  className="w-full px-4 py-3 bg-white/5 border border-white/15 focus:border-indigo-500/50 rounded-xl text-white placeholder:text-slate-500 focus:outline-none text-sm font-semibold transition-colors"
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-white/10 flex items-center gap-3">
        <button onClick={() => setCurrentIdx(i => Math.max(0, i - 1))} disabled={currentIdx === 0}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-white/5 border border-white/10 text-slate-400 rounded-xl text-sm disabled:opacity-30 hover:text-white transition-all">
          <ChevronLeft className="w-4 h-4" /> Prev
        </button>
        <div className="flex-1 flex justify-center gap-1 overflow-hidden">
          {questions.map((_, i) => (
            <button key={i} onClick={() => setCurrentIdx(i)}
              className={`w-6 h-6 rounded-full text-[10px] font-bold transition-all ${i === currentIdx ? 'bg-indigo-500 text-white' : answers[i] !== undefined ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-600'}`}>
              {i + 1}
            </button>
          ))}
        </div>
        {currentIdx < total - 1 ? (
          <button onClick={() => setCurrentIdx(i => i + 1)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white/5 border border-white/10 text-slate-400 rounded-xl text-sm hover:text-white transition-all">
            Next <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={submitQuiz}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-xl text-sm font-bold hover:brightness-110 transition-all shadow-lg">
            Submit Quiz
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Quiz Results ─────────────────────────────────────────────────────────────
function QuizResults({ questions, answers, markResults, config, notebook, onRetry }) {
  const [showDetails, setShowDetails] = useState(false);
  const pct = markResults.percentage ?? 0;
  const grade = pct >= 90 ? 'A*' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 50 ? 'D' : 'U';
  const gradeColor = pct >= 70 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Score header */}
      <div className="flex-shrink-0 px-6 py-5 border-b border-white/10 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h2 className="text-white font-bold text-lg">Quiz Complete</h2>
        </div>
        <div className={`text-6xl font-black mb-1 ${gradeColor}`}>{grade}</div>
        <p className="text-white text-2xl font-bold">{markResults.total_score}/{markResults.total_possible}</p>
        <p className="text-slate-400 text-sm mt-0.5">{Math.round(pct)}% · {config.difficulty} difficulty · {config.examBoard}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {/* Weak / Strong topics */}
        <div className="grid grid-cols-2 gap-3">
          {markResults.weak_topics?.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
              <p className="text-red-400 font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Weak Areas
              </p>
              <ul className="space-y-1">
                {markResults.weak_topics.map((t, i) => <li key={i} className="text-red-300 text-xs">• {t}</li>)}
              </ul>
            </div>
          )}
          {markResults.strong_topics?.length > 0 && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
              <p className="text-emerald-400 font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-1">
                <Target className="w-3 h-3" /> Strong Areas
              </p>
              <ul className="space-y-1">
                {markResults.strong_topics.map((t, i) => <li key={i} className="text-emerald-300 text-xs">• {t}</li>)}
              </ul>
            </div>
          )}
        </div>

        {/* Next steps */}
        {markResults.suggested_next_steps && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
            <p className="text-blue-400 font-bold text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
              <BookOpen className="w-3 h-3" /> Suggested Next Steps
            </p>
            <p className="text-slate-300 text-sm leading-relaxed">{markResults.suggested_next_steps}</p>
          </div>
        )}

        {/* Question-by-question breakdown toggle */}
        <button onClick={() => setShowDetails(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-300 hover:text-white hover:bg-white/8 transition-all">
          <span className="font-semibold">Question-by-Question Breakdown</span>
          <span className="text-slate-500">{showDetails ? '▲ Hide' : '▼ Show'}</span>
        </button>

        <AnimatePresence>
          {showDetails && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="space-y-4 overflow-hidden">
              {questions.map((q, i) => {
                const r = markResults.results?.[i];
                const correct = r?.is_correct;
                return (
                  <div key={i} className={`rounded-2xl border p-4 ${correct ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                    <div className="flex items-start gap-3 mb-3">
                      {correct ? <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />}
                      <div className="flex-1">
                        <p className="text-white font-semibold text-sm">{q.question}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{r?.mark_awarded ?? 0}/{r?.max_marks ?? 1} marks</p>
                      </div>
                    </div>
                    <div className="ml-7 space-y-2">
                      <div className="bg-white/5 rounded-lg px-3 py-2">
                        <p className="text-[11px] text-slate-500 uppercase tracking-wide font-bold mb-0.5">Your answer</p>
                        <p className="text-slate-300 text-sm">{answers[i] || <em className="text-slate-600">No answer</em>}</p>
                      </div>
                      <div className="bg-white/5 rounded-lg px-3 py-2">
                        <p className="text-[11px] text-emerald-500 uppercase tracking-wide font-bold mb-0.5">Model answer</p>
                        <p className="text-slate-200 text-sm">{r?.correct_answer_explanation}</p>
                      </div>
                      {r?.feedback && <p className="text-slate-400 text-xs italic">{r.feedback}</p>}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-white/10 flex gap-3">
        <button onClick={onRetry}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-xl font-bold text-sm hover:bg-indigo-500/30 transition-all">
          <RotateCcw className="w-4 h-4" /> New Quiz
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function QuizBuilderTool({ notebook, user, allSources, onResourceCreated }) {
  const [phase, setPhase] = useState('builder'); // builder | generating | playing
  const [config, setConfig] = useState(null);
  const [questions, setQuestions] = useState([]);

  const startQuiz = async (cfg) => {
    setConfig(cfg);
    setPhase('generating');

    const srcList = allSources.filter(s => s.content_text && cfg.selectedSources.includes(s.id));
    const ctx = srcList.map(s => `### ${s.name}\n${s.content_text.slice(0, 8000)}`).join('\n\n---\n\n');

    const diffInstr = {
      easy: 'EASY: definitions, simple recall, single-step recall questions only.',
      medium: 'MEDIUM: explanations, comparisons, examples, cause-and-effect, multi-concept questions.',
      hard: 'HARD: multi-step reasoning, applied problems, analysis, evaluation, extended thinking.',
      adaptive: 'ADAPTIVE: focus on the trickiest and most commonly confused topics in this material.',
    }[cfg.difficulty];

    const typeInstr = {
      mcq: `ALL questions must be multiple choice with exactly 4 options (A-D). Set type="mcq". Provide options array and correct_answer (the text of the correct option).`,
      short: `ALL questions must be short answer. Set type="short". No options needed. correct_answer should be a 1-2 sentence model answer.`,
      long: `ALL questions must be long answer / extended response. Set type="long". No options needed. correct_answer should be a detailed model answer.`,
      fitb: `ALL questions must be fill-in-the-blank. Set type="fitb". Phrase the question with a blank indicated by "___". correct_answer is the word/phrase that fills the blank.`,
      mixed: `MIX question types: roughly equal split of mcq, short, long, fitb. Set type accordingly per question.`,
    }[cfg.qType];

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert ${cfg.examBoard !== 'Any' ? cfg.examBoard : 'exam'} question writer. Generate exactly ${cfg.numQ} questions.

DIFFICULTY: ${diffInstr}
QUESTION FORMAT: ${typeInstr}

Rules:
- Every question MUST come directly from the source material below
- Questions must cover a broad range of topics across ALL sources
- For MCQ: wrong options must be plausible but clearly wrong
- For FITB: make the blank a key term or fact
- For long answer: questions should require detailed multi-point responses

SOURCE MATERIAL:
${ctx}`,
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
                correct_answer: { type: 'string' },
                topic: { type: 'string' },
              },
              required: ['question', 'type', 'correct_answer', 'topic'],
              additionalProperties: false,
            }
          }
        },
        required: ['questions'],
        additionalProperties: false,
      }
    });

    const qs = (result?.questions || []).slice(0, cfg.numQ);
    setQuestions(qs);
    setPhase('playing');
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div key={phase} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.15 }} className="flex flex-col h-full">

        {phase === 'builder' && (
          <QuizBuilder notebook={notebook} allSources={allSources} onStart={startQuiz} />
        )}

        {phase === 'generating' && (
          <div className="flex flex-col items-center justify-center h-full gap-5 text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
            <p className="text-white font-bold text-xl">Generating {config?.numQ} Questions…</p>
            <p className="text-slate-400 text-sm max-w-sm">
              AI is reading your sources and crafting {config?.difficulty} {config?.qType === 'mixed' ? 'mixed-type' : config?.qType?.toUpperCase()} questions
            </p>
          </div>
        )}

        {phase === 'playing' && questions.length > 0 && (
          <QuizPlayer
            questions={questions}
            config={config}
            notebook={notebook}
            user={user}
            allSources={allSources}
            onFinish={() => setPhase('builder')}
            onResourceCreated={onResourceCreated}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}