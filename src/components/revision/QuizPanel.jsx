import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Brain, Sparkles, RefreshCw, Check, X, ChevronRight, Loader2, Trophy } from 'lucide-react';

const DIFFICULTIES = ['easy', 'medium', 'hard', 'exam'];
const QUESTION_COUNTS = [5, 10, 15, 20];

export default function QuizPanel({ notebook, user }) {
  const [phase, setPhase] = useState('setup'); // setup | quiz | results
  const [difficulty, setDifficulty] = useState('medium');
  const [count, setCount] = useState(10);
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const { data: sources = [] } = useQuery({
    queryKey: ['revisionSources', notebook.id],
    queryFn: () => base44.entities.RevisionSource.filter({ notebook_id: notebook.id }),
  });

  const generateQuiz = async () => {
    setGenerating(true);
    const context = sources.map(s => s.content_text || s.name).filter(Boolean).join('\n\n');

    const prompt = `Generate ${count} ${difficulty} difficulty multiple choice questions for a GCSE/A-Level student based on these study materials.

Materials:
${context || 'General ' + (notebook.subject || notebook.name) + ' content'}

Return a JSON array with this exact structure:
[{
  "question": "the question text",
  "options": ["A) option", "B) option", "C) option", "D) option"],
  "correct_index": 0,
  "explanation": "why this is correct",
  "difficulty": "${difficulty}"
}]

Make questions exam-realistic and educational. Correct index is 0-based.`;

    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            question: { type: 'string' },
            options: { type: 'array', items: { type: 'string' } },
            correct_index: { type: 'number' },
            explanation: { type: 'string' },
            difficulty: { type: 'string' }
          }
        }
      }
    });

    const qs = Array.isArray(res) ? res : (res.result || []);
    setQuestions(qs);
    setCurrentQ(0);
    setAnswers([]);
    setSelected(null);
    setShowExplanation(false);
    setGenerating(false);
    setPhase('quiz');
  };

  const handleAnswer = (idx) => {
    if (selected !== null) return;
    setSelected(idx);
    setShowExplanation(true);
    const newAnswers = [...answers, { questionIndex: currentQ, selected: idx, correct: idx === questions[currentQ].correct_index }];
    setAnswers(newAnswers);
  };

  const nextQuestion = () => {
    if (currentQ + 1 >= questions.length) {
      setPhase('results');
    } else {
      setCurrentQ(q => q + 1);
      setSelected(null);
      setShowExplanation(false);
    }
  };

  const q = questions[currentQ];
  const score = answers.filter(a => a.correct).length;
  const percentage = questions.length > 0 ? Math.round((score / answers.length) * 100) : 0;

  if (phase === 'setup') {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-black text-white mb-1">Quiz Generator</h2>
          <p className="text-slate-400 text-sm">Generate an AI-powered quiz from your notebook sources</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-5">
          <div>
            <p className="text-white font-semibold text-sm mb-3">Difficulty</p>
            <div className="grid grid-cols-4 gap-2">
              {DIFFICULTIES.map(d => (
                <button key={d} onClick={() => setDifficulty(d)}
                  className={`py-2.5 rounded-xl font-bold text-sm capitalize transition-all ${
                    difficulty === d
                      ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30'
                      : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'
                  }`}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-white font-semibold text-sm mb-3">Number of Questions</p>
            <div className="grid grid-cols-4 gap-2">
              {QUESTION_COUNTS.map(c => (
                <button key={c} onClick={() => setCount(c)}
                  className={`py-2.5 rounded-xl font-bold text-sm transition-all ${
                    count === c
                      ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30'
                      : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'
                  }`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {sources.length === 0 && (
            <p className="text-amber-400/80 text-xs bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
              💡 Add sources to your notebook for more relevant questions. AI will use general knowledge otherwise.
            </p>
          )}

          <button onClick={generateQuiz} disabled={generating}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-black text-sm hover:brightness-110 transition-all disabled:opacity-40 shadow-lg shadow-violet-500/30 flex items-center justify-center gap-2">
            {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating Quiz...</> : <><Sparkles className="w-4 h-4" /> Generate {count} Questions</>}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'results') {
    const grade = percentage >= 80 ? 'A' : percentage >= 70 ? 'B' : percentage >= 60 ? 'C' : percentage >= 50 ? 'D' : 'F';
    const emoji = percentage >= 80 ? '🏆' : percentage >= 60 ? '👍' : percentage >= 40 ? '📚' : '💪';
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto text-center py-8">
        <div className="text-7xl mb-4">{emoji}</div>
        <h2 className="text-3xl font-black text-white mb-1">Quiz Complete!</h2>
        <p className="text-slate-400 mb-6">{notebook.name}</p>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Score</span>
            <span className="text-white font-black text-2xl">{score} / {answers.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Percentage</span>
            <span className={`font-black text-2xl ${percentage >= 70 ? 'text-emerald-400' : percentage >= 50 ? 'text-amber-400' : 'text-red-400'}`}>{percentage}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Grade</span>
            <span className="text-white font-black text-2xl">{grade}</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden mt-2">
            <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ delay: 0.3, duration: 0.8 }}
              className={`h-full rounded-full ${percentage >= 70 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : percentage >= 50 ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-red-500 to-rose-500'}`} />
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setPhase('setup'); setQuestions([]); }}
            className="flex-1 py-3 rounded-2xl bg-white/10 border border-white/20 text-white font-bold hover:bg-white/15 transition-all">
            New Quiz
          </button>
          <button onClick={() => { setPhase('quiz'); setCurrentQ(0); setAnswers([]); setSelected(null); setShowExplanation(false); }}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold hover:brightness-110 transition-all shadow-lg shadow-violet-500/30">
            Retry
          </button>
        </div>
      </motion.div>
    );
  }

  // Quiz phase
  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Progress */}
      <div className="flex items-center gap-4">
        <p className="text-slate-400 text-sm flex-shrink-0">{currentQ + 1} / {questions.length}</p>
        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full transition-all" style={{ width: `${((currentQ) / questions.length) * 100}%` }} />
        </div>
        <div className="flex items-center gap-1 text-sm flex-shrink-0">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-emerald-400 font-bold">{answers.filter(a => a.correct).length}</span>
          <X className="w-3.5 h-3.5 text-red-400 ml-1" />
          <span className="text-red-400 font-bold">{answers.filter(a => !a.correct).length}</span>
        </div>
      </div>

      {q && (
        <AnimatePresence mode="wait">
          <motion.div key={currentQ} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
            {/* Question */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-4">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-3">Question {currentQ + 1}</p>
              <p className="text-white text-lg font-bold leading-relaxed">{q.question}</p>
            </div>

            {/* Options */}
            <div className="space-y-2 mb-4">
              {(q.options || []).map((opt, i) => {
                const isCorrect = i === q.correct_index;
                const isSelected = selected === i;
                let style = 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10';
                if (selected !== null) {
                  if (isCorrect) style = 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300';
                  else if (isSelected) style = 'border-red-500/60 bg-red-500/15 text-red-300';
                  else style = 'border-white/5 bg-white/[0.02] text-slate-500';
                }
                return (
                  <button key={i} onClick={() => handleAnswer(i)} disabled={selected !== null}
                    className={`w-full text-left px-5 py-4 rounded-xl border-2 font-medium text-sm transition-all flex items-center justify-between ${style}`}>
                    <span>{opt}</span>
                    {selected !== null && isCorrect && <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
                    {selected !== null && isSelected && !isCorrect && <X className="w-5 h-5 text-red-400 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            <AnimatePresence>
              {showExplanation && q.explanation && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 mb-4">
                  <p className="text-xs text-blue-400 font-semibold mb-1">Explanation</p>
                  <p className="text-slate-300 text-sm">{q.explanation}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {selected !== null && (
              <button onClick={nextQuestion}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-black hover:brightness-110 transition-all shadow-lg shadow-violet-500/30 flex items-center justify-center gap-2">
                {currentQ + 1 >= questions.length ? 'See Results' : 'Next Question'} <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}