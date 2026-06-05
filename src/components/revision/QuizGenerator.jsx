import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Loader2, RefreshCw, Check, X, ChevronRight } from 'lucide-react';

const QUESTION_TYPES = [
  { id: 'mcq', label: 'Multiple Choice' },
  { id: 'truefalse', label: 'True / False' },
  { id: 'short', label: 'Short Answer' },
  { id: 'fillin', label: 'Fill in Blank' },
];

const DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Mixed'];

export default function QuizGenerator({ notebook, user, sources }) {
  const [config, setConfig] = useState({ count: 10, type: 'mcq', difficulty: 'Mixed' });
  const [questions, setQuestions] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [mode, setMode] = useState('config'); // 'config' | 'quiz' | 'results'
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);

  const contextText = sources.filter(s => s.content_text).map(s => `${s.name}:\n${s.content_text.slice(0, 6000)}`).join('\n\n---\n\n');

  const generate = async () => {
    if (generating) return;
    if (!contextText) { alert('Upload sources with text content first!'); return; }
    setGenerating(true);

    const typeInstr = config.type === 'mcq'
      ? 'multiple choice with 4 options and a correct_index (0-3)'
      : config.type === 'truefalse'
      ? 'true/false with options ["True","False"] and correct_index 0 or 1'
      : config.type === 'fillin'
      ? 'fill-in-the-blank where the question has a blank (___) and options has 4 choices including the correct answer at correct_index'
      : 'short answer with a brief correct_answer that goes in options[0]';

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate ${config.count} ${config.difficulty.toLowerCase()} difficulty ${typeInstr} questions based on the revision notes provided. Return a JSON object with a "questions" array.`,
        system_prompt: `You are creating a revision quiz for ${notebook.subject || 'a subject'} student. Each question must have: question_text, options (array), correct_index (number), explanation (brief). Source material:\n\n${contextText}`,
        response_json_schema: {
          type: 'object',
          properties: {
            questions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  question_text: { type: 'string' },
                  options: { type: 'array', items: { type: 'string' } },
                  correct_index: { type: 'number' },
                  explanation: { type: 'string' },
                }
              }
            }
          }
        }
      });
      setQuestions(result?.questions || []);
      setAnswers({});
      setCurrentQ(0);
      setSelected(null);
      setRevealed(false);
      setMode('quiz');
    } catch {}
    setGenerating(false);
  };

  const submitAnswer = (idx) => {
    if (revealed) return;
    setSelected(idx);
    setRevealed(true);
    setAnswers(prev => ({ ...prev, [currentQ]: idx }));
  };

  const next = () => {
    if (currentQ + 1 >= questions.length) {
      setMode('results');
    } else {
      setCurrentQ(q => q + 1);
      setSelected(answers[currentQ + 1] ?? null);
      setRevealed(answers[currentQ + 1] !== undefined);
    }
  };

  const score = questions.filter((q, i) => answers[i] === q.correct_index).length;
  const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  if (mode === 'results') {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto space-y-6">
        <div className="text-center bg-white/5 border border-white/10 rounded-3xl p-10">
          <div className="text-5xl mb-4">{pct >= 80 ? '🏆' : pct >= 60 ? '👍' : '📚'}</div>
          <h2 className="text-3xl font-black text-white mb-1">{pct}%</h2>
          <p className="text-slate-400">{score} / {questions.length} correct</p>
          <div className="h-3 bg-white/10 rounded-full overflow-hidden mt-5">
            <motion.div className={`h-full rounded-full ${pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
              initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1 }} />
          </div>
        </div>
        {/* Review answers */}
        <div className="space-y-3">
          {questions.map((q, i) => {
            const isCorrect = answers[i] === q.correct_index;
            return (
              <div key={i} className={`p-4 rounded-2xl border ${isCorrect ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                <p className="text-white text-sm font-medium mb-2">{i + 1}. {q.question_text}</p>
                {q.options?.map((opt, oi) => (
                  <p key={oi} className={`text-xs px-3 py-1.5 rounded-lg mb-1 ${
                    oi === q.correct_index ? 'text-emerald-400 bg-emerald-500/10' :
                    oi === answers[i] && !isCorrect ? 'text-red-400 bg-red-500/10' :
                    'text-slate-500'
                  }`}>{oi === q.correct_index ? '✓' : oi === answers[i] ? '✗' : '·'} {opt}</p>
                ))}
                {q.explanation && <p className="text-slate-400 text-xs mt-2 italic">{q.explanation}</p>}
              </div>
            );
          })}
        </div>
        <button onClick={() => { setMode('config'); setQuestions([]); }} className="w-full py-3 rounded-2xl bg-violet-500 text-white font-bold">
          <RefreshCw className="w-4 h-4 inline mr-2" /> New Quiz
        </button>
      </motion.div>
    );
  }

  if (mode === 'quiz' && questions.length > 0) {
    const q = questions[currentQ];
    return (
      <div className="max-w-lg mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <button onClick={() => setMode('config')} className="text-slate-400 hover:text-white text-sm flex items-center gap-1">
            <X className="w-4 h-4" /> Exit
          </button>
          <p className="text-slate-400 text-sm">{currentQ + 1} / {questions.length}</p>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-violet-500 to-purple-400 rounded-full transition-all duration-300"
            style={{ width: `${(currentQ / questions.length) * 100}%` }} />
        </div>
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-3">Question {currentQ + 1}</p>
          <p className="text-white font-bold text-lg leading-relaxed">{q.question_text}</p>
        </div>
        <div className="space-y-2">
          {q.options?.map((opt, oi) => {
            const isCorrect = oi === q.correct_index;
            const isSelected = oi === selected;
            let cls = 'border-white/10 bg-white/5 text-white hover:bg-white/10';
            if (revealed) {
              if (isCorrect) cls = 'border-emerald-500/60 bg-emerald-500/20 text-emerald-300';
              else if (isSelected) cls = 'border-red-500/60 bg-red-500/20 text-red-300';
              else cls = 'border-white/5 bg-white/[0.02] text-slate-500';
            }
            return (
              <motion.button key={oi} onClick={() => submitAnswer(oi)} disabled={revealed}
                whileHover={!revealed ? { scale: 1.01 } : {}} whileTap={!revealed ? { scale: 0.99 } : {}}
                className={`w-full text-left px-5 py-4 rounded-2xl border-2 font-medium text-sm transition-all ${cls}`}>
                <span className="opacity-50 mr-3">{String.fromCharCode(65 + oi)}.</span>{opt}
                {revealed && isCorrect && <Check className="w-4 h-4 inline ml-2 text-emerald-400" />}
                {revealed && isSelected && !isCorrect && <X className="w-4 h-4 inline ml-2 text-red-400" />}
              </motion.button>
            );
          })}
        </div>
        {revealed && q.explanation && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-sm text-blue-200">
            💡 {q.explanation}
          </motion.div>
        )}
        {revealed && (
          <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={next}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold text-sm flex items-center justify-center gap-2">
            {currentQ + 1 >= questions.length ? 'See Results 🏆' : 'Next Question'} <ChevronRight className="w-4 h-4" />
          </motion.button>
        )}
      </div>
    );
  }

  // Config screen
  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h2 className="text-white font-black text-xl">Quiz Generator</h2>
        <p className="text-slate-400 text-sm">Generate quizzes automatically from your notes</p>
      </div>

      {!contextText && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-300 text-sm">
          ⚠️ Upload sources with text content to generate questions.
        </div>
      )}

      <div className="space-y-4 bg-white/5 border border-white/10 rounded-2xl p-5">
        <div>
          <label className="text-slate-400 text-xs font-semibold block mb-2">Question Type</label>
          <div className="flex gap-2">
            {QUESTION_TYPES.map(t => (
              <button key={t.id} onClick={() => setConfig(c => ({ ...c, type: t.id }))}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${config.type === t.id ? 'border-violet-500 bg-violet-500/20 text-violet-300' : 'border-white/10 text-slate-400 hover:text-white'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-slate-400 text-xs font-semibold block mb-2">Difficulty</label>
          <div className="flex gap-2">
            {DIFFICULTIES.map(d => (
              <button key={d} onClick={() => setConfig(c => ({ ...c, difficulty: d }))}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${config.difficulty === d ? 'border-violet-500 bg-violet-500/20 text-violet-300' : 'border-white/10 text-slate-400 hover:text-white'}`}>
                {d}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-slate-400 text-xs font-semibold block mb-2">Number of Questions: {config.count}</label>
          <input type="range" min={5} max={30} step={5} value={config.count} onChange={e => setConfig(c => ({ ...c, count: +e.target.value }))}
            className="w-full accent-violet-500" />
          <div className="flex justify-between text-xs text-slate-600 mt-1"><span>5</span><span>30</span></div>
        </div>
      </div>

      <button onClick={generate} disabled={generating || !contextText}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-black text-base disabled:opacity-40 hover:brightness-110 transition-all flex items-center justify-center gap-2">
        {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : '⚡'}
        {generating ? 'Generating...' : `Generate ${config.count} Questions`}
      </button>
    </div>
  );
}