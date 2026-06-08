import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import {
  Zap, Loader2, ChevronLeft, ChevronRight, CheckCircle2,
  XCircle, RotateCcw, TrendingDown, Lightbulb, CheckCircle
} from 'lucide-react';

// ─── Theme tokens ──────────────────────────────────────────────────────────────
const GLASS = {
  background: 'rgba(255,255,255,0.22)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.35)',
  boxShadow: '0 4px 24px rgba(61,82,160,0.13)',
};
const BG = { background: 'linear-gradient(135deg, #EDE8F5 0%, #c8d4f5 100%)' };

// ─── Sound utils (Web Audio API — no external files) ──────────────────────────
function playSuccess() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523, ctx.currentTime);
    osc.frequency.setValueAtTime(659, ctx.currentTime + 0.12);
    osc.frequency.setValueAtTime(784, ctx.currentTime + 0.22);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.55);
  } catch {}
}

function playError() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.28);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  } catch {}
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getSourceContext(sources) {
  return sources.filter(s => s.content_text)
    .map(s => `### ${s.name}\n${s.content_text.slice(0, 8000)}`).join('\n\n---\n\n');
}

const Q_COUNTS = [5, 10, 15, 20, 25, 30];
const Q_TYPES = [
  { id: 'mcq', label: 'Multiple Choice', desc: 'Instant feedback on selection' },
  { id: 'short', label: 'Short Answer', desc: 'AI-marked after submission' },
  { id: 'mixed', label: 'Mixed Mode', desc: 'Combination of both' },
];
const DIFFICULTIES = [
  { id: 'easy', label: 'Easy', desc: 'Definitions & recall' },
  { id: 'medium', label: 'Medium', desc: 'Explanations & examples' },
  { id: 'hard', label: 'Hard', desc: 'Multi-step reasoning' },
  { id: 'adaptive', label: 'Adaptive', desc: 'Targets weak topics' },
];
const EXAM_BOARDS = ['AQA', 'OCR', 'Edexcel', 'WJEC'];

// ─── Build prompt ─────────────────────────────────────────────────────────────
function buildGenerationPrompt(config, ctx, weakTopics) {
  const typeInstructions = {
    mcq: 'All questions must be multiple choice with exactly 4 options. Include correct_index (0-3) and a brief explanation.',
    short: 'All questions require a short answer (1-3 sentences). Include the model answer and key marking points.',
    mixed: 'Mix question types: roughly half multiple choice (type="mcq") and half short answer (type="short").',
  };
  const diffInstructions = {
    easy: 'Focus on basic definitions, key vocabulary, simple recall.',
    medium: 'Focus on explanations, comparisons, examples, cause-and-effect.',
    hard: 'Focus on multi-step reasoning, application, analysis, and evaluation.',
    adaptive: weakTopics?.length
      ? `Focus specifically on these detected weak topics: ${weakTopics.join(', ')}.`
      : 'Cover all topics with a mix of difficulty.',
  };
  return `You are an expert exam question writer generating a ${config.examBoard}-style quiz.
TASK: Generate exactly ${config.numQuestions} questions.
QUESTION TYPE: ${typeInstructions[config.questionType] || typeInstructions.mixed}
DIFFICULTY: ${diffInstructions[config.difficulty]}
For EACH question return:
- question: the question text
- type: "mcq" or "short"
- options: array of 4 strings (only for mcq, null otherwise)
- correct_index: 0-3 (only for mcq, null otherwise)
- correct_answer: the model answer
- mark_scheme: detailed marking guidance
- topic: the topic/concept tested
- marks: number of marks (1 for mcq, 3-6 for short)
SOURCE MATERIAL:\n${ctx}`;
}

// ─── Config Screen ─────────────────────────────────────────────────────────────
function QuizBuilderConfig({ notebook, allSources, onStart }) {
  const [numQuestions, setNumQuestions] = useState(10);
  const [questionType, setQuestionType] = useState('mcq');
  const [difficulty, setDifficulty] = useState('medium');
  const [examBoard, setExamBoard] = useState('AQA');

  const hasSources = allSources.some(s => s.content_text);

  if (!hasSources) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8" style={BG}>
        <div className="text-5xl mb-4">📚</div>
        <h3 className="font-bold text-lg mb-2" style={{ color: '#3D52A0' }}>No sources yet</h3>
        <p className="text-sm" style={{ color: '#8697C4' }}>Add sources first to generate a quiz.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={BG}>
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.3)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #7091E6, #3D52A0)' }}>
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-black text-lg" style={{ color: '#3D52A0' }}>Quiz Builder</h2>
            <p className="text-xs" style={{ color: '#8697C4' }}>{notebook.name}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6">
        {/* Number of Questions */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#8697C4' }}>Number of Questions</p>
          <div className="flex flex-wrap gap-2">
            {Q_COUNTS.map(n => (
              <button key={n} onClick={() => setNumQuestions(n)}
                className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: numQuestions === n ? 'linear-gradient(135deg, #7091E6, #3D52A0)' : 'rgba(255,255,255,0.5)',
                  border: numQuestions === n ? 'none' : '1px solid rgba(255,255,255,0.5)',
                  color: numQuestions === n ? '#fff' : '#3D52A0',
                  boxShadow: numQuestions === n ? '0 2px 10px rgba(61,82,160,0.25)' : 'none',
                }}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Question Type */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#8697C4' }}>Question Type</p>
          <div className="space-y-2">
            {Q_TYPES.map(t => (
              <button key={t.id} onClick={() => setQuestionType(t.id)}
                className="w-full px-4 py-3 rounded-xl text-sm font-semibold text-left transition-all flex items-center gap-3"
                style={{
                  background: questionType === t.id ? 'rgba(112,145,230,0.15)' : 'rgba(255,255,255,0.45)',
                  border: questionType === t.id ? '1.5px solid rgba(112,145,230,0.5)' : '1px solid rgba(255,255,255,0.5)',
                }}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: questionType === t.id ? 'linear-gradient(135deg, #7091E6, #3D52A0)' : 'rgba(134,151,196,0.2)' }}>
                  {questionType === t.id && <CheckCircle className="w-3 h-3 text-white" />}
                </div>
                <div>
                  <div style={{ color: '#3D52A0' }}>{t.label}</div>
                  <div className="text-xs" style={{ color: '#8697C4' }}>{t.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#8697C4' }}>Difficulty</p>
          <div className="grid grid-cols-2 gap-2">
            {DIFFICULTIES.map(d => (
              <button key={d.id} onClick={() => setDifficulty(d.id)}
                className="px-4 py-3 rounded-xl text-sm text-left transition-all"
                style={{
                  background: difficulty === d.id ? 'rgba(112,145,230,0.15)' : 'rgba(255,255,255,0.45)',
                  border: difficulty === d.id ? '1.5px solid rgba(112,145,230,0.5)' : '1px solid rgba(255,255,255,0.5)',
                }}>
                <div className="font-bold" style={{ color: '#3D52A0' }}>{d.label}</div>
                <div className="text-xs mt-0.5" style={{ color: '#8697C4' }}>{d.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Exam Board */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#8697C4' }}>Exam Board</p>
          <div className="flex gap-2 flex-wrap">
            {EXAM_BOARDS.map(b => (
              <button key={b} onClick={() => setExamBoard(b)}
                className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: examBoard === b ? 'linear-gradient(135deg, #7091E6, #3D52A0)' : 'rgba(255,255,255,0.5)',
                  border: examBoard === b ? 'none' : '1px solid rgba(255,255,255,0.5)',
                  color: examBoard === b ? '#fff' : '#3D52A0',
                }}>
                {b}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Start */}
      <div className="flex-shrink-0 p-6" style={{ borderTop: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.3)' }}>
        <button
          onClick={() => onStart({ numQuestions, questionType, difficulty, examBoard, sources: allSources.filter(s => s.content_text) })}
          className="w-full py-4 rounded-2xl text-white font-black text-base transition-all hover:brightness-110"
          style={{ background: 'linear-gradient(135deg, #7091E6, #3D52A0)', boxShadow: '0 4px 20px rgba(61,82,160,0.3)' }}>
          Generate {numQuestions}-Question Quiz →
        </button>
        <p className="text-center text-xs mt-2" style={{ color: '#8697C4' }}>
          Using {allSources.filter(s => s.content_text).length} source{allSources.filter(s=>s.content_text).length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}

// ─── Quiz Player (instant MCQ feedback + sounds) ───────────────────────────────
function QuizPlayer({ questions, config, onSubmit }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [revealed, setRevealed] = useState({}); // idx -> 'correct' | 'wrong'
  const advanceTimer = useRef(null);

  const q = questions[currentIdx];
  const isMCQ = q?.type === 'mcq';
  const totalAnswered = Object.keys(answers).length;
  const feedbackState = revealed[currentIdx]; // 'correct' | 'wrong' | undefined

  const selectMCQ = (oi) => {
    if (revealed[currentIdx] !== undefined) return; // already locked
    const isCorrect = oi === q.correct_index;
    const newAnswers = { ...answers, [currentIdx]: oi };
    const newRevealed = { ...revealed, [currentIdx]: isCorrect ? 'correct' : 'wrong' };
    setAnswers(newAnswers);
    setRevealed(newRevealed);
    if (isCorrect) playSuccess(); else playError();

    // Auto-advance after feedback delay
    clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => {
      if (currentIdx < questions.length - 1) {
        setCurrentIdx(i => i + 1);
      } else {
        onSubmit(newAnswers);
      }
    }, 950);
  };

  const setTextAnswer = (val) => setAnswers(prev => ({ ...prev, [currentIdx]: val }));

  const goNext = () => {
    if (currentIdx < questions.length - 1) setCurrentIdx(i => i + 1);
    else onSubmit(answers);
  };

  const getOptionStyle = (oi) => {
    if (feedbackState === undefined) {
      return answers[currentIdx] === oi
        ? { background: 'rgba(112,145,230,0.18)', border: '2px solid #7091E6', color: '#3D52A0' }
        : { background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.5)', color: '#3D52A0' };
    }
    if (oi === q.correct_index) {
      return { background: 'rgba(16,185,129,0.18)', border: '2px solid #10b981', color: '#064e3b' };
    }
    if (oi === answers[currentIdx] && feedbackState === 'wrong') {
      return { background: 'rgba(239,68,68,0.13)', border: '2px solid #ef4444', color: '#7f1d1d' };
    }
    return { background: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.3)', color: '#8697C4', opacity: 0.55 };
  };

  return (
    <div className="flex flex-col h-full" style={BG}>
      {/* Progress bar */}
      <div className="flex-shrink-0 px-6 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.35)' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold" style={{ color: '#8697C4' }}>Question {currentIdx + 1} of {questions.length}</span>
          <span className="text-xs" style={{ color: '#8697C4' }}>{totalAnswered} answered</span>
        </div>
        <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(112,145,230,0.18)' }}>
          <motion.div className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #7091E6, #3D52A0)' }}
            animate={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
            transition={{ duration: 0.3 }} />
        </div>
      </div>

      {/* Question area */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <AnimatePresence mode="wait">
          <motion.div key={currentIdx}
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.18 }} className="max-w-2xl mx-auto">

            {/* Question card */}
            <div className="rounded-3xl p-6 mb-4" style={GLASS}>
              <div className="flex items-start gap-3 mb-5">
                <span className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-white"
                  style={{ background: 'linear-gradient(135deg, #7091E6, #3D52A0)' }}>
                  {currentIdx + 1}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(112,145,230,0.15)', color: '#3D52A0' }}>
                      {q.type === 'mcq' ? 'Multiple Choice' : q.type === 'short' ? 'Short Answer' : 'Fill in Blank'}
                    </span>
                    {q.marks && <span className="text-[10px]" style={{ color: '#8697C4' }}>{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>}
                    {q.topic && <span className="text-[10px]" style={{ color: '#8697C4' }}>• {q.topic}</span>}
                  </div>
                  <p className="font-bold text-base leading-relaxed" style={{ color: '#3D52A0' }}>{q.question}</p>
                </div>
              </div>

              {/* MCQ options */}
              {isMCQ && q.options && (
                <div className="space-y-2.5">
                  {q.options.map((opt, oi) => (
                    <motion.button key={oi} onClick={() => selectMCQ(oi)}
                      disabled={feedbackState !== undefined}
                      whileTap={feedbackState === undefined ? { scale: 0.985 } : {}}
                      className="w-full text-left px-5 py-3.5 rounded-xl text-sm font-medium transition-all flex items-center gap-3"
                      style={getOptionStyle(oi)}>
                      <span className="font-black text-xs flex-shrink-0"
                        style={{ color: feedbackState !== undefined && oi === q.correct_index ? '#10b981' : '#7091E6' }}>
                        {['A','B','C','D'][oi]}.
                      </span>
                      <span className="flex-1">{opt}</span>
                      {feedbackState !== undefined && oi === q.correct_index && (
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#10b981' }} />
                      )}
                      {feedbackState === 'wrong' && oi === answers[currentIdx] && oi !== q.correct_index && (
                        <XCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#ef4444' }} />
                      )}
                    </motion.button>
                  ))}
                </div>
              )}

              {/* Short answer */}
              {q.type === 'short' && (
                <textarea value={answers[currentIdx] || ''} onChange={e => setTextAnswer(e.target.value)}
                  placeholder="Write your answer (1–3 sentences)…" rows={4}
                  className="w-full px-5 py-3.5 rounded-xl text-sm resize-none focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.65)', border: '1.5px solid rgba(112,145,230,0.3)', color: '#3D52A0' }} />
              )}

              {/* Fill */}
              {q.type === 'fill' && (
                <input value={answers[currentIdx] || ''} onChange={e => setTextAnswer(e.target.value)}
                  placeholder="Type your answer…"
                  className="w-full px-5 py-3.5 rounded-xl text-sm focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.65)', border: '1.5px solid rgba(112,145,230,0.3)', color: '#3D52A0' }} />
              )}
            </div>

            {/* Instant feedback banner (MCQ only) */}
            <AnimatePresence>
              {feedbackState && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="rounded-2xl px-5 py-3.5 flex items-center gap-3"
                  style={{
                    background: feedbackState === 'correct' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.1)',
                    border: feedbackState === 'correct' ? '1.5px solid rgba(16,185,129,0.45)' : '1.5px solid rgba(239,68,68,0.35)',
                  }}>
                  {feedbackState === 'correct' ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: '#10b981' }} />
                      <p className="font-bold text-sm" style={{ color: '#064e3b' }}>Correct! Moving on…</p>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#ef4444' }} />
                      <p className="font-bold text-sm" style={{ color: '#7f1d1d' }}>Incorrect — correct answer highlighted in green</p>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation (text answer questions only) */}
      {!isMCQ && (
        <div className="flex-shrink-0 px-6 py-4 flex items-center justify-between gap-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.35)' }}>
          <button onClick={() => setCurrentIdx(i => Math.max(0, i - 1))} disabled={currentIdx === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-30 transition-all"
            style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.5)', color: '#3D52A0' }}>
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <span className="text-xs" style={{ color: '#8697C4' }}>{totalAnswered}/{questions.length} answered</span>
          <button onClick={goNext}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #7091E6, #3D52A0)' }}>
            {currentIdx < questions.length - 1 ? <><span>Next</span><ChevronRight className="w-4 h-4" /></> : 'Submit ✓'}
          </button>
        </div>
      )}
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
  const gradeColor = pct >= 70 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
  const weakTopics = [...new Set(results.filter(r => !r.is_correct).map(r => questions[r.index]?.topic).filter(Boolean))];

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={BG}>
      {/* Score card */}
      <div className="flex-shrink-0 px-6 py-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.4)' }}>
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="rounded-3xl p-6 text-center" style={GLASS}>
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xl"
            style={{ background: `${gradeColor}20`, border: `3px solid ${gradeColor}` }}>
            <span className="font-black text-4xl" style={{ color: gradeColor }}>{grade}</span>
          </div>
          <h2 className="font-black text-3xl mb-1" style={{ color: '#3D52A0' }}>{pct}%</h2>
          <p className="text-sm mb-4" style={{ color: '#8697C4' }}>{earnedMarks}/{totalMarks} marks · {config.difficulty} · {config.examBoard}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl p-3" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>
              <div className="font-black text-xl" style={{ color: '#10b981' }}>{score}</div>
              <div className="text-xs" style={{ color: '#8697C4' }}>Correct</div>
            </div>
            <div className="rounded-2xl p-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <div className="font-black text-xl" style={{ color: '#ef4444' }}>{questions.length - score}</div>
              <div className="text-xs" style={{ color: '#8697C4' }}>Incorrect</div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="flex-1 p-6 space-y-5">
        {/* Weak topics */}
        {weakTopics.length > 0 && (
          <div className="rounded-2xl p-4"
            style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)' }}>
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4" style={{ color: '#d97706' }} />
              <p className="font-bold text-sm" style={{ color: '#d97706' }}>Weak Topics Detected</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {weakTopics.map((t, i) => (
                <span key={i} className="px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ background: 'rgba(251,191,36,0.15)', color: '#92400e', border: '1px solid rgba(251,191,36,0.3)' }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Next steps */}
        {results[results.length - 1]?.next_steps && (
          <div className="rounded-2xl p-4"
            style={{ background: 'rgba(112,145,230,0.1)', border: '1px solid rgba(112,145,230,0.3)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4" style={{ color: '#7091E6' }} />
              <p className="font-bold text-sm" style={{ color: '#3D52A0' }}>Suggested Next Steps</p>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: '#3D52A0' }}>{results[results.length - 1].next_steps}</p>
          </div>
        )}

        {/* Per-question breakdown */}
        <div>
          <p className="font-black mb-3" style={{ color: '#3D52A0' }}>Question Breakdown</p>
          <div className="space-y-2">
            {questions.map((q, i) => {
              const r = results.find(x => x.index === i);
              const correct = r?.is_correct;
              const isOpen = expandedIdx === i;
              return (
                <div key={i} className="rounded-2xl overflow-hidden"
                  style={{
                    background: correct ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.06)',
                    border: correct ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(239,68,68,0.2)',
                  }}>
                  <button className="w-full flex items-start gap-3 p-4 text-left"
                    onClick={() => setExpandedIdx(isOpen ? null : i)}>
                    <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5"
                      style={{ background: correct ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.15)' }}>
                      {correct
                        ? <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#10b981' }} />
                        : <XCircle className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold leading-snug" style={{ color: '#3D52A0' }}>{q.question}</p>
                      <div className="flex items-center gap-3 mt-1">
                        {q.topic && <span className="text-[10px]" style={{ color: '#8697C4' }}>{q.topic}</span>}
                        <span className="text-[10px] font-bold" style={{ color: correct ? '#10b981' : '#ef4444' }}>
                          {r?.marks_awarded || 0}/{q.marks || 1} marks
                        </span>
                      </div>
                    </div>
                    <span className="text-xs flex-shrink-0" style={{ color: '#8697C4' }}>{isOpen ? '▲' : '▼'}</span>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden">
                        <div className="px-4 pb-4 space-y-3 pt-3"
                          style={{ borderTop: '1px solid rgba(255,255,255,0.4)' }}>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#8697C4' }}>Your Answer</p>
                            <p className="text-sm" style={{ color: '#3D52A0' }}>
                              {q.type === 'mcq' && answers[i] !== undefined
                                ? `${['A','B','C','D'][answers[i]]}. ${q.options?.[answers[i]] || '(no answer)'}`
                                : answers[i] || '(no answer)'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#10b981' }}>Correct Answer</p>
                            <p className="text-sm" style={{ color: '#3D52A0' }}>
                              {q.type === 'mcq' && q.correct_index != null
                                ? `${['A','B','C','D'][q.correct_index]}. ${q.options?.[q.correct_index]}`
                                : q.correct_answer}
                            </p>
                          </div>
                          {q.mark_scheme && (
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#8697C4' }}>Mark Scheme ({config.examBoard})</p>
                              <p className="text-sm leading-relaxed" style={{ color: '#3D52A0' }}>{q.mark_scheme}</p>
                            </div>
                          )}
                          {r?.feedback && (
                            <div className="p-3 rounded-xl" style={{ background: 'rgba(112,145,230,0.1)', border: '1px solid rgba(112,145,230,0.2)' }}>
                              <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#7091E6' }}>AI Feedback</p>
                              <p className="text-sm" style={{ color: '#3D52A0' }}>{r.feedback}</p>
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
      <div className="flex-shrink-0 p-6 flex gap-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.35)' }}>
        <button onClick={onRetry}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all"
          style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.5)', color: '#3D52A0' }}>
          <RotateCcw className="w-4 h-4" /> Retry
        </button>
        <button onClick={onNewQuiz}
          className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110"
          style={{ background: 'linear-gradient(135deg, #7091E6, #3D52A0)', boxShadow: '0 4px 16px rgba(61,82,160,0.25)' }}>
          New Quiz →
        </button>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function QuizBuilder({ notebook, user, allSources, onResourceCreated }) {
  const [phase, setPhase] = useState('config');
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

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: buildGenerationPrompt(cfg, ctx, weakTopics),
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

    const markResult = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert ${config.examBoard} examiner. Mark each answer fairly and provide concise feedback.
For each question: is_correct (true/false), marks_awarded (0 to marks_available), feedback (1-2 sentences).
For the LAST item only, add next_steps: suggested revision based on overall performance.
QUESTIONS AND ANSWERS:\n${JSON.stringify(markingData, null, 2)}`,
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

    const totalMarks = questions.reduce((s, q) => s + (q.marks || 1), 0);
    const earned = marked.reduce((s, r) => s + (r.marks_awarded || 0), 0);
    const pct = Math.round((earned / totalMarks) * 100);
    const wkTopics = [...new Set(marked.filter(r => !r.is_correct).map(r => questions[r.index]?.topic).filter(Boolean))];

    const res = await base44.entities.NotebookResource.create({
      notebook_id: notebook.id, student_email: user.email,
      title: `Quiz — ${pct}% · ${config.difficulty} · ${new Date().toLocaleDateString()}`,
      resource_type: 'quiz',
      content: JSON.stringify({
        score: pct, earned_marks: earned, total_marks: totalMarks,
        questions, answers: userAnswers, results: marked, weak_topics: wkTopics,
        difficulty: config.difficulty, question_type: config.questionType,
        exam_board: config.examBoard, num_questions: config.numQuestions,
        completed_at: new Date().toISOString(),
      }),
      source_ids: config.sources?.map(s => s.id) || [],
      source_count: config.sources?.length || 0,
    });
    onResourceCreated(res);
    setPhase('results');
  };

  const loadingStyle = { ...BG };

  if (phase === 'generating') return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8 text-center" style={loadingStyle}>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
        style={{ background: 'linear-gradient(135deg, #7091E6, #3D52A0)' }}>
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
      <div>
        <p className="font-black text-xl mb-2" style={{ color: '#3D52A0' }}>Building Your Quiz…</p>
        <p className="text-sm" style={{ color: '#8697C4' }}>{genProgress}</p>
      </div>
      <div className="flex gap-1">
        {[0,1,2,3,4].map(i => (
          <motion.div key={i} className="w-2 h-2 rounded-full" style={{ background: '#7091E6' }}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity }} />
        ))}
      </div>
    </div>
  );

  if (phase === 'marking') return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8 text-center" style={loadingStyle}>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
        style={{ background: 'linear-gradient(135deg, #8697C4, #7091E6)' }}>
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
      <div>
        <p className="font-black text-xl mb-2" style={{ color: '#3D52A0' }}>Marking Your Answers…</p>
        <p className="text-sm" style={{ color: '#8697C4' }}>AI is reviewing your responses</p>
      </div>
    </div>
  );

  return (
    <AnimatePresence mode="wait">
      {phase === 'config' && (
        <motion.div key="config" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
          <QuizBuilderConfig notebook={notebook} allSources={allSources} onStart={generate} />
        </motion.div>
      )}
      {phase === 'playing' && (
        <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
          <QuizPlayer questions={questions} config={config} onSubmit={submitForMarking} />
        </motion.div>
      )}
      {phase === 'results' && (
        <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
          <QuizResults
            questions={questions} answers={answers} results={results} config={config}
            onRetry={() => { setAnswers({}); setPhase('playing'); }}
            onNewQuiz={() => setPhase('config')}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}