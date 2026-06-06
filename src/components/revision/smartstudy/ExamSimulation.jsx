import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle, XCircle, Brain, Loader2, Trophy, AlertTriangle, RotateCcw, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const EXAM_DURATIONS = [
  { label: '15 min', seconds: 900, questions: 10 },
  { label: '30 min', seconds: 1800, questions: 20 },
  { label: '45 min', seconds: 2700, questions: 30 },
];

function buildExamQuestions(flashcards, notebooks, count) {
  const notebookMap = {};
  notebooks.forEach(nb => { notebookMap[nb.id] = nb; });
  const shuffled = [...flashcards].sort(() => Math.random() - 0.5).slice(0, count);
  return shuffled.map(card => ({
    id: card.id,
    question: card.front,
    answer: card.back,
    topic: notebookMap[card.notebook_id]?.subject || notebookMap[card.notebook_id]?.name || 'General',
    notebookIcon: notebookMap[card.notebook_id]?.icon || '📚',
  }));
}

export default function ExamSimulation({ flashcards, notebooks }) {
  const [phase, setPhase] = useState('setup'); // setup | active | marking | results
  const [examConfig, setExamConfig] = useState(EXAM_DURATIONS[0]);
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({}); // {qIndex: {text, confidence, timeMs}}
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [confidence, setConfidence] = useState(3);
  const [timeLeft, setTimeLeft] = useState(0);
  const [qStartTime, setQStartTime] = useState(null);
  const [markingResults, setMarkingResults] = useState([]);
  const [loadingMarking, setLoadingMarking] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  const startExam = () => {
    const qs = buildExamQuestions(flashcards, notebooks, examConfig.questions);
    setQuestions(qs);
    setCurrentQ(0);
    setAnswers({});
    setCurrentAnswer('');
    setConfidence(3);
    setTimeLeft(examConfig.seconds);
    setQStartTime(Date.now());
    setPhase('active');
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          finishExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const finishExam = () => {
    clearInterval(timerRef.current);
    setPhase('marking');
  };

  const saveAnswer = () => {
    const timeMs = qStartTime ? Date.now() - qStartTime : 0;
    setAnswers(prev => ({
      ...prev,
      [currentQ]: { text: currentAnswer, confidence, timeMs }
    }));
    if (currentQ + 1 >= questions.length) {
      finishExam();
    } else {
      setCurrentQ(i => i + 1);
      setCurrentAnswer('');
      setConfidence(3);
      setQStartTime(Date.now());
    }
  };

  useEffect(() => {
    if (phase === 'marking' && questions.length > 0) {
      markAnswers();
    }
  }, [phase]);

  const markAnswers = async () => {
    setLoadingMarking(true);
    const toMark = questions.map((q, i) => ({
      question: q.question,
      expectedAnswer: q.answer,
      studentAnswer: answers[i]?.text || '(no answer)',
      topic: q.topic,
    }));

    try {
      const res = await base44.functions.invoke('callOpenAI', {
        prompt: `You are an exam marker. Mark each student answer fairly. For each question, decide if the student's answer is CORRECT, PARTIALLY_CORRECT, or INCORRECT.

Return a JSON array with exactly ${questions.length} objects, each with:
- "result": "CORRECT" | "PARTIALLY_CORRECT" | "INCORRECT"
- "score": 0, 0.5, or 1 (matching result)
- "feedback": short 1-sentence mark scheme explanation
- "topic": the topic name

Questions to mark:
${JSON.stringify(toMark, null, 2)}

Return ONLY the JSON array, no other text.`,
        max_tokens: 800,
      });

      let rawContent = res.data?.content || res.data?.response || '[]';
      rawContent = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(rawContent);
      setMarkingResults(parsed);
    } catch (e) {
      // Fallback: basic string matching
      const fallback = questions.map((q, i) => {
        const ans = (answers[i]?.text || '').toLowerCase().trim();
        const expected = q.answer.toLowerCase().trim();
        const correct = ans.length > 0 && (ans === expected || expected.includes(ans) || ans.includes(expected.slice(0, 20)));
        return {
          result: correct ? 'CORRECT' : 'INCORRECT',
          score: correct ? 1 : 0,
          feedback: `Expected: ${q.answer}`,
          topic: q.topic,
        };
      });
      setMarkingResults(fallback);
    }
    setLoadingMarking(false);
    setPhase('results');
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // Setup
  if (phase === 'setup') {
    if (flashcards.length < 5) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
          <Brain className="w-16 h-16 text-slate-600 mb-4" />
          <p className="text-white font-bold text-lg mb-2">Need more flashcards</p>
          <p className="text-slate-400 text-sm">Add at least 5 flashcards to your notebooks to run an exam simulation.</p>
        </div>
      );
    }
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h2 className="text-white font-black text-xl mb-1">Exam Simulation Mode</h2>
          <p className="text-slate-400 text-sm">Timed exam with auto-marking, mark scheme explanations, and analytics.</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
          <p className="text-white font-bold text-sm">Choose exam length</p>
          <div className="grid grid-cols-3 gap-3">
            {EXAM_DURATIONS.map(d => (
              <button key={d.label} onClick={() => setExamConfig(d)}
                className={`py-3 rounded-xl border text-sm font-bold transition-all ${
                  examConfig.label === d.label
                    ? 'bg-violet-500/30 border-violet-500 text-violet-200'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                }`}>
                <p>{d.label}</p>
                <p className="text-xs opacity-60 font-normal mt-0.5">{Math.min(d.questions, flashcards.length)} Qs</p>
              </button>
            ))}
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-amber-300 text-xs">Once started, the timer cannot be paused. Answers are auto-submitted when time runs out.</p>
          </div>
          <button onClick={startExam}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:brightness-110 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25">
            <Clock className="w-4 h-4" /> Start Exam
          </button>
        </div>
      </div>
    );
  }

  // Active exam
  if (phase === 'active') {
    const q = questions[currentQ];
    const pct = (currentQ / questions.length) * 100;
    return (
      <div className="max-w-xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-sm">Q{currentQ + 1}/{questions.length}</span>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-sm ${timeLeft < 120 ? 'bg-red-500/20 text-red-300' : 'bg-white/10 text-white'}`}>
            <Clock className="w-4 h-4" /> {formatTime(timeLeft)}
          </div>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
            animate={{ width: `${pct}%` }} />
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>{q.notebookIcon}</span><span>{q.topic}</span>
          </div>
          <p className="text-white text-lg font-semibold leading-relaxed">{q.question}</p>
          <textarea
            value={currentAnswer}
            onChange={e => setCurrentAnswer(e.target.value)}
            placeholder="Type your answer here..."
            rows={4}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 resize-none"
          />

          <div>
            <p className="text-slate-400 text-xs mb-2">Confidence: <span className="text-white font-bold">{confidence}/5</span></p>
            <input type="range" min={1} max={5} value={confidence} onChange={e => setConfidence(Number(e.target.value))}
              className="w-full accent-violet-500" />
            <div className="flex justify-between text-xs text-slate-600 mt-0.5">
              <span>Not sure</span><span>Very confident</span>
            </div>
          </div>

          <button onClick={saveAnswer}
            className="w-full py-2.5 rounded-xl bg-violet-500 hover:bg-violet-400 text-white font-bold text-sm transition-all flex items-center justify-center gap-2">
            {currentQ + 1 >= questions.length ? 'Finish Exam' : 'Next Question'} <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Marking
  if (phase === 'marking') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
        <Loader2 className="w-16 h-16 text-violet-400 animate-spin mb-4" />
        <p className="text-white font-bold text-xl mb-2">Marking your exam...</p>
        <p className="text-slate-400 text-sm">AI is reviewing your answers against the mark scheme.</p>
      </div>
    );
  }

  // Results
  if (phase === 'results') {
    const total = markingResults.length;
    const score = markingResults.reduce((s, r) => s + (r.score || 0), 0);
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;

    const topicPerf = {};
    markingResults.forEach((r, i) => {
      const t = r.topic || questions[i]?.topic || 'General';
      if (!topicPerf[t]) topicPerf[t] = { correct: 0, total: 0 };
      topicPerf[t].total++;
      if (r.score >= 0.5) topicPerf[t].correct++;
    });
    const weakTopics = Object.entries(topicPerf)
      .map(([t, d]) => ({ topic: t, pct: Math.round((d.correct / d.total) * 100) }))
      .filter(t => t.pct < 60)
      .sort((a, b) => a.pct - b.pct);

    const avgTimeMs = Object.values(answers).reduce((s, a) => s + (a.timeMs || 0), 0) / Math.max(1, total);

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Score card */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-violet-900/40 to-purple-900/30 border border-violet-500/30 rounded-2xl p-6 text-center">
          <Trophy className="w-14 h-14 text-yellow-400 mx-auto mb-3" />
          <p className="text-5xl font-black text-white mb-1">{pct}%</p>
          <p className="text-slate-400 text-sm mb-4">{Math.round(score)}/{total} questions correct</p>
          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div className="bg-white/5 rounded-xl p-2">
              <p className="text-emerald-400 font-black text-lg">{markingResults.filter(r => r.score === 1).length}</p>
              <p className="text-slate-400">Correct</p>
            </div>
            <div className="bg-white/5 rounded-xl p-2">
              <p className="text-amber-400 font-black text-lg">{markingResults.filter(r => r.score === 0.5).length}</p>
              <p className="text-slate-400">Partial</p>
            </div>
            <div className="bg-white/5 rounded-xl p-2">
              <p className="text-red-400 font-black text-lg">{markingResults.filter(r => r.score === 0).length}</p>
              <p className="text-slate-400">Incorrect</p>
            </div>
          </div>
        </motion.div>

        {/* Analytics row */}
        <div className="grid grid-cols-2 gap-4">
          {weakTopics.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-400" /> Weak Topics</h3>
              {weakTopics.map(t => (
                <div key={t.topic} className="mb-2">
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-slate-300 truncate">{t.topic}</span>
                    <span className="text-red-400 font-bold ml-2">{t.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: `${t.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-blue-400" /> Time Analytics</h3>
            <p className="text-2xl font-black text-blue-400">{Math.round(avgTimeMs / 1000)}s</p>
            <p className="text-xs text-slate-400">avg per question</p>
            <div className="mt-3 space-y-1">
              {questions.slice(0, 5).map((q, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 w-5">Q{i + 1}</span>
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500/60 rounded-full"
                      style={{ width: `${Math.min(100, ((answers[i]?.timeMs || 0) / (examConfig.seconds * 1000 / questions.length)) * 100)}%` }} />
                  </div>
                  <span className="text-slate-500 w-10 text-right">{Math.round((answers[i]?.timeMs || 0) / 1000)}s</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Question review */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h3 className="text-white font-bold text-sm mb-4">Question Review & Mark Scheme</h3>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {questions.map((q, i) => {
              const r = markingResults[i] || {};
              const a = answers[i] || {};
              return (
                <div key={i} className={`rounded-xl p-4 border ${
                  r.score === 1 ? 'bg-emerald-500/5 border-emerald-500/20' :
                  r.score === 0.5 ? 'bg-amber-500/5 border-amber-500/20' :
                  'bg-red-500/5 border-red-500/20'
                }`}>
                  <div className="flex items-start gap-2 mb-2">
                    {r.score >= 1 ? <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" /> :
                     r.score >= 0.5 ? <CheckCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" /> :
                     <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />}
                    <p className="text-white text-sm font-medium">{q.question}</p>
                  </div>
                  <p className="text-slate-400 text-xs mb-1"><span className="text-slate-300">Your answer:</span> {a.text || '(no answer)'}</p>
                  <p className="text-slate-400 text-xs mb-1"><span className="text-slate-300">Expected:</span> {q.answer}</p>
                  {r.feedback && <p className="text-xs mt-2 px-3 py-2 rounded-lg bg-white/5 text-slate-300 italic">{r.feedback}</p>}
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-600">
                    <span>Confidence: {a.confidence || '-'}/5</span>
                    <span>{Math.round((a.timeMs || 0) / 1000)}s spent</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button onClick={() => setPhase('setup')}
          className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm transition-all flex items-center justify-center gap-2">
          <RotateCcw className="w-4 h-4" /> Try Another Exam
        </button>
      </div>
    );
  }

  return null;
}