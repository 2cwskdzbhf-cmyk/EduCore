import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import {
  Loader2, Timer, Flag, ChevronLeft, ChevronRight,
  AlertTriangle, CheckCircle, XCircle, Grid3X3,
  TrendingUp, TrendingDown, BookOpen, Download,
  Shield, Zap
} from 'lucide-react';

function formatTime(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const GLASS = {
  background: 'rgba(255,255,255,0.22)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.35)',
  boxShadow: '0 4px 32px rgba(61,82,160,0.13)',
};

const SELECT_STYLE = {
  background: 'rgba(255,255,255,0.50)',
  border: '1px solid rgba(255,255,255,0.4)',
  borderRadius: '12px',
  color: '#3D52A0',
  padding: '10px 14px',
  fontSize: '14px',
  fontWeight: 500,
  width: '100%',
  outline: 'none',
  cursor: 'pointer',
};

const GRAD_BTN = {
  background: 'linear-gradient(135deg, #7091E6, #3D52A0)',
  color: '#fff',
  borderRadius: '14px',
  fontWeight: 700,
  border: 'none',
  cursor: 'pointer',
};

// ─── Setup Panel ──────────────────────────────────────────────────────────────
function TestSetupPanel({ notebook, allSources, onStart }) {
  const [numQuestions, setNumQuestions] = useState('10');
  const [difficulty, setDifficulty] = useState('medium');
  const [questionType, setQuestionType] = useState('mixed');
  const [testMode, setTestMode] = useState('standard');
  const [customTopic, setCustomTopic] = useState('');
  const [useCustomTopic, setUseCustomTopic] = useState(false);
  const [timeLimit, setTimeLimit] = useState('30');

  const hasSources = allSources.some(s => s.content_text);

  const TEST_MODES = [
    { id: 'standard', label: 'Standard', desc: 'Navigate freely between questions', icon: '📝' },
    { id: 'hard', label: 'Hard Mode', desc: 'No going back to previous questions', icon: '🔒' },
    { id: 'sudden_death', label: 'Sudden Death', desc: 'One wrong answer ends the test', icon: '💀' },
  ];

  const canStart = useCustomTopic ? customTopic.trim().length > 0 : hasSources;

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 overflow-y-auto"
      style={{ background: 'linear-gradient(135deg, #EDE8F5 0%, #c8d4f5 100%)' }}>
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-lg rounded-3xl p-8"
        style={GLASS}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7091E6, #3D52A0)' }}>
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-black text-xl" style={{ color: '#3D52A0' }}>Exam Simulation</h2>
            <p className="text-sm" style={{ color: '#8697C4' }}>Configure your exam settings</p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Topic source toggle */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#8697C4' }}>Topic Source</label>
            <div className="flex gap-2 mb-3">
              <button onClick={() => setUseCustomTopic(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={!useCustomTopic
                  ? { ...GRAD_BTN, padding: '10px 0' }
                  : { background: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.5)', color: '#3D52A0', borderRadius: '12px', fontWeight: 600 }}>
                From My Sources
              </button>
              <button onClick={() => setUseCustomTopic(true)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={useCustomTopic
                  ? { ...GRAD_BTN, padding: '10px 0' }
                  : { background: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.5)', color: '#3D52A0', borderRadius: '12px', fontWeight: 600 }}>
                Custom Topic
              </button>
            </div>
            {useCustomTopic ? (
              <input
                value={customTopic}
                onChange={e => setCustomTopic(e.target.value)}
                placeholder="e.g. waterfalls, photosynthesis, World War 2"
                style={SELECT_STYLE}
              />
            ) : !hasSources ? (
              <p className="text-sm p-3 rounded-xl" style={{ background: 'rgba(220,55,55,0.08)', color: '#c0392b' }}>
                No sources found. Add sources or use a custom topic.
              </p>
            ) : (
              <p className="text-sm p-3 rounded-xl" style={{ background: 'rgba(112,145,230,0.1)', color: '#3D52A0' }}>
                ✓ {allSources.filter(s => s.content_text).length} source(s) loaded for {notebook.name}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#8697C4' }}>Questions</label>
              <select value={numQuestions} onChange={e => setNumQuestions(e.target.value)} style={SELECT_STYLE}>
                {['5', '10', '15', '20', '25', '30'].map(n => (
                  <option key={n} value={n}>{n} questions</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#8697C4' }}>Time Limit</label>
              <select value={timeLimit} onChange={e => setTimeLimit(e.target.value)} style={SELECT_STYLE}>
                {[['10','10 min'],['15','15 min'],['20','20 min'],['30','30 min'],['45','45 min'],['60','1 hour'],['90','90 min']].map(([v,l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#8697C4' }}>Difficulty</label>
              <select value={difficulty} onChange={e => setDifficulty(e.target.value)} style={SELECT_STYLE}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="exam-level">Exam Level</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#8697C4' }}>Question Type</label>
              <select value={questionType} onChange={e => setQuestionType(e.target.value)} style={SELECT_STYLE}>
                <option value="mixed">Mixed</option>
                <option value="multiple_choice">Multiple Choice</option>
                <option value="true_false">True / False</option>
                <option value="short_answer">Short Answer</option>
              </select>
            </div>
          </div>

          {/* Test mode */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#8697C4' }}>Test Mode</label>
            <div className="space-y-2">
              {TEST_MODES.map(m => (
                <button key={m.id} onClick={() => setTestMode(m.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                  style={{
                    background: testMode === m.id ? 'rgba(112,145,230,0.18)' : 'rgba(255,255,255,0.38)',
                    border: testMode === m.id ? '1.5px solid rgba(112,145,230,0.5)' : '1px solid rgba(255,255,255,0.4)',
                  }}>
                  <span className="text-lg">{m.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold" style={{ color: '#3D52A0' }}>{m.label}</p>
                    <p className="text-xs" style={{ color: '#8697C4' }}>{m.desc}</p>
                  </div>
                  {testMode === m.id && <CheckCircle className="w-4 h-4" style={{ color: '#7091E6' }} />}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => onStart({
              numQuestions: parseInt(numQuestions),
              difficulty,
              questionType,
              testMode,
              customTopic: useCustomTopic ? customTopic.trim() : null,
              timeLimitSeconds: parseInt(timeLimit) * 60,
            })}
            disabled={!canStart}
            className="w-full py-4 rounded-2xl text-white font-black text-base transition-all disabled:opacity-40 hover:brightness-110 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #7091E6, #3D52A0)', boxShadow: '0 4px 24px rgba(61,82,160,0.3)' }}>
            🚀 Start Exam
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Generating Screen ────────────────────────────────────────────────────────
function GeneratingScreen({ numQuestions }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5"
      style={{ background: 'linear-gradient(135deg, #EDE8F5 0%, #c8d4f5 100%)' }}>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
        style={{ background: 'linear-gradient(135deg, #7091E6, #3D52A0)' }}>
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
      <p className="font-black text-xl" style={{ color: '#3D52A0' }}>Building Your Exam</p>
      <p className="text-sm" style={{ color: '#8697C4' }}>Generating {numQuestions} questions — please wait</p>
      <div className="flex gap-2 mt-1">
        {[0,1,2,3,4].map(i => (
          <motion.div key={i} className="w-2 h-2 rounded-full"
            style={{ background: '#7091E6' }}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity }} />
        ))}
      </div>
    </div>
  );
}

// ─── Anti-cheat Warning ───────────────────────────────────────────────────────
function AntiCheatWarning({ warnings, maxWarnings, onDismiss }) {
  const isFinal = warnings >= maxWarnings;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(220,55,55,0.25)', backdropFilter: 'blur(10px)' }}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="rounded-3xl p-8 max-w-sm mx-4 text-center"
        style={{ background: '#fff', boxShadow: '0 20px 60px rgba(220,55,55,0.25)' }}>
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="font-black text-xl text-red-600 mb-2">Warning {warnings}/{maxWarnings}</h3>
        <p className="text-gray-600 text-sm mb-6">
          {isFinal
            ? 'Maximum violations reached. The exam will now end.'
            : 'You left the exam window. Return immediately or your exam will end.'}
        </p>
        <button onClick={onDismiss}
          className="w-full py-3 rounded-xl font-bold text-white text-sm"
          style={{ background: isFinal ? '#dc2626' : 'linear-gradient(135deg, #7091E6, #3D52A0)' }}>
          {isFinal ? 'End Exam Now' : 'Return to Exam'}
        </button>
      </motion.div>
    </div>
  );
}

// ─── Review Screen ────────────────────────────────────────────────────────────
function ReviewScreen({ questions, answers, flagged, onGoTo, onSubmit, onBack }) {
  const answered = Object.keys(answers).length;
  return (
    <div className="fixed inset-0 z-[100] flex flex-col"
      style={{ background: 'linear-gradient(135deg, #EDE8F5 0%, #c8d4f5 100%)' }}>
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style={{ background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.4)' }}>
        <h2 className="font-black text-lg" style={{ color: '#3D52A0' }}>Review Before Submitting</h2>
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold" style={{ color: '#8697C4' }}>
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-3">
          {questions.map((q, i) => {
            const isAnswered = answers[i] !== undefined;
            const isFlagged = flagged.has(i);
            return (
              <button key={i} onClick={() => onGoTo(i)}
                className="w-full text-left p-4 rounded-2xl transition-all hover:brightness-95"
                style={{
                  background: 'rgba(255,255,255,0.5)',
                  border: isFlagged ? '1.5px solid #fbbf24' : isAnswered ? '1.5px solid rgba(16,185,129,0.4)' : '1.5px solid rgba(220,55,55,0.3)',
                }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-sm"
                    style={{
                      background: isFlagged ? '#fef3c7' : isAnswered ? 'rgba(16,185,129,0.15)' : 'rgba(220,55,55,0.1)',
                      color: isFlagged ? '#d97706' : isAnswered ? '#059669' : '#dc2626',
                    }}>
                    {i + 1}
                  </div>
                  <p className="flex-1 text-sm font-medium truncate" style={{ color: '#3D52A0' }}>{q.question}</p>
                  <span className="text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0"
                    style={{
                      background: isFlagged ? '#fef3c7' : isAnswered ? 'rgba(16,185,129,0.15)' : 'rgba(220,55,55,0.1)',
                      color: isFlagged ? '#d97706' : isAnswered ? '#059669' : '#dc2626',
                    }}>
                    {isFlagged ? 'Flagged' : isAnswered ? 'Answered' : 'Blank'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-shrink-0 p-6 flex items-center gap-3"
        style={{ background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.4)' }}>
        <div className="flex gap-4 text-xs mr-auto" style={{ color: '#8697C4' }}>
          <span>Answered: {answered}</span>
          <span>Blank: {questions.length - answered}</span>
          <span>Flagged: {flagged.size}</span>
        </div>
        <button onClick={onBack}
          className="px-5 py-2.5 rounded-xl font-semibold text-sm"
          style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.4)', color: '#3D52A0' }}>
          Continue
        </button>
        <button onClick={onSubmit}
          className="px-6 py-2.5 rounded-xl font-bold text-sm text-white"
          style={{ background: 'linear-gradient(135deg, #7091E6, #3D52A0)' }}>
          Submit Exam
        </button>
      </div>
    </div>
  );
}

// ─── Test Mode ────────────────────────────────────────────────────────────────
function TestMode({ questions, settings, notebook, user, allSources, onFinish }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState(new Set());
  const [timeLeft, setTimeLeft] = useState(settings.timeLimitSeconds);
  const [showNavigator, setShowNavigator] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [warnings, setWarnings] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const timerRef = useRef(null);
  const autoSaveRef = useRef(null);
  const endedRef = useRef(false);
  const warningsRef = useRef(0);
  const timeLeftRef = useRef(settings.timeLimitSeconds);

  const MAX_WARNINGS = 3;
  const q = questions[currentIndex];
  const totalAnswered = Object.keys(answers).length;

  // Enter fullscreen on mount
  useEffect(() => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    return () => {
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    };
  }, []);

  // Block copy/paste/right-click/selection
  useEffect(() => {
    const block = e => e.preventDefault();
    document.addEventListener('copy', block);
    document.addEventListener('paste', block);
    document.addEventListener('cut', block);
    document.addEventListener('contextmenu', block);
    document.addEventListener('selectstart', block);
    return () => {
      document.removeEventListener('copy', block);
      document.removeEventListener('paste', block);
      document.removeEventListener('cut', block);
      document.removeEventListener('contextmenu', block);
      document.removeEventListener('selectstart', block);
    };
  }, []);

  // Block keyboard shortcuts
  useEffect(() => {
    const blockKeys = e => {
      if (e.key === 'PrintScreen') e.preventDefault();
      if ((e.ctrlKey || e.metaKey) && ['c','v','x','a','p','s'].includes(e.key.toLowerCase())) e.preventDefault();
    };
    document.addEventListener('keydown', blockKeys);
    return () => document.removeEventListener('keydown', blockKeys);
  }, []);

  const submitTest = useCallback((autoEnded, suddenDeath, currentAnswers) => {
    if (endedRef.current) return;
    endedRef.current = true;
    clearInterval(timerRef.current);
    clearInterval(autoSaveRef.current);
    localStorage.removeItem(`exam_${notebook.id}`);
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    const timeUsed = settings.timeLimitSeconds - timeLeftRef.current;
    onFinish({ answers: currentAnswers || answers, flagged: new Set(flagged), autoEnded, suddenDeath, timeUsed });
  }, [answers, flagged, notebook.id, settings.timeLimitSeconds, onFinish]);

  const triggerWarning = useCallback(() => {
    if (endedRef.current) return;
    warningsRef.current += 1;
    setWarnings(warningsRef.current);
    setShowWarning(true);
  }, []);

  // Anti-cheat: tab/window visibility
  useEffect(() => {
    const handleVisibility = () => { if (document.hidden) triggerWarning(); };
    const handleBlur = () => { if (!document.fullscreenElement) triggerWarning(); };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
    };
  }, [triggerWarning]);

  // Anti-cheat: fullscreen exit
  useEffect(() => {
    const onFSChange = () => { if (!document.fullscreenElement && !endedRef.current) triggerWarning(); };
    document.addEventListener('fullscreenchange', onFSChange);
    return () => document.removeEventListener('fullscreenchange', onFSChange);
  }, [triggerWarning]);

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        const next = t - 1;
        timeLeftRef.current = next;
        if (next <= 0) {
          clearInterval(timerRef.current);
          if (!endedRef.current) submitTest(false, false);
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [submitTest]);

  // Auto-save
  useEffect(() => {
    autoSaveRef.current = setInterval(() => {
      localStorage.setItem(`exam_${notebook.id}`, JSON.stringify({ answers, flagged: [...flagged], currentIndex }));
    }, 5000);
    return () => clearInterval(autoSaveRef.current);
  }, [answers, flagged, currentIndex, notebook.id]);

  const dismissWarning = () => {
    if (warningsRef.current >= MAX_WARNINGS) {
      submitTest(true, false, answers);
    } else {
      setShowWarning(false);
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    }
  };

  const handleAnswer = (value) => {
    const newAnswers = { ...answers, [currentIndex]: value };
    setAnswers(newAnswers);
    // Sudden death — check after a short delay, but DO NOT reveal correct/wrong visually during test
    if (settings.testMode === 'sudden_death') {
      const isCorrect = q.type === 'short_answer'
        ? (value + '').toLowerCase().includes((q.correct_answer || '').toLowerCase().slice(0, 10))
        : value === q.correct_index;
      if (!isCorrect) setTimeout(() => submitTest(false, true, newAnswers), 800);
    }
  };

  const toggleFlag = () => {
    setFlagged(prev => {
      const next = new Set(prev);
      next.has(currentIndex) ? next.delete(currentIndex) : next.add(currentIndex);
      return next;
    });
  };

  const goNext = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex(i => i + 1);
    else setShowReview(true);
  };

  const goPrev = () => {
    if (settings.testMode === 'hard' || currentIndex === 0) return;
    setCurrentIndex(i => i - 1);
  };

  const timerColor = timeLeft < 60 ? '#ef4444' : timeLeft < 300 ? '#f59e0b' : '#3D52A0';
  const timerBg = timeLeft < 60 ? 'rgba(239,68,68,0.12)' : timeLeft < 300 ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.6)';

  if (showReview) {
    return (
      <ReviewScreen
        questions={questions}
        answers={answers}
        flagged={flagged}
        onGoTo={i => { setCurrentIndex(i); setShowReview(false); }}
        onSubmit={() => submitTest(false, false, answers)}
        onBack={() => setShowReview(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col"
      style={{ background: 'linear-gradient(135deg, #EDE8F5 0%, #c8d4f5 100%)', userSelect: 'none', WebkitUserSelect: 'none' }}>

      {showWarning && <AntiCheatWarning warnings={warnings} maxWarnings={MAX_WARNINGS} onDismiss={dismissWarning} />}

      {/* Top bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-3"
        style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.4)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7091E6, #3D52A0)' }}>
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: '#3D52A0' }}>{notebook.name} — Exam Simulation</p>
            <p className="text-xs" style={{ color: '#8697C4' }}>Q{currentIndex + 1} of {questions.length} · {totalAnswered} answered</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Timer */}
          <motion.div
            animate={timeLeft < 60 ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 1, repeat: timeLeft < 60 ? Infinity : 0 }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-black text-lg"
            style={{ background: timerBg, border: `2px solid ${timerColor}`, color: timerColor }}>
            <Timer className="w-4 h-4" />
            {formatTime(timeLeft)}
          </motion.div>

          <button onClick={() => setShowNavigator(v => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: showNavigator ? 'rgba(112,145,230,0.18)' : 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.4)', color: '#3D52A0' }}>
            <Grid3X3 className="w-4 h-4" />
            <span className="hidden sm:inline">Navigator</span>
          </button>

          <button onClick={() => setShowReview(true)}
            className="px-4 py-2 rounded-xl text-sm font-bold transition-all text-white"
            style={{ background: 'linear-gradient(135deg, #7091E6, #3D52A0)' }}>
            Submit
          </button>
        </div>
      </div>

      {/* Navigator drawer */}
      <AnimatePresence>
        {showNavigator && (
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            className="absolute top-16 right-6 z-20 p-4 rounded-2xl w-64"
            style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 8px 32px rgba(61,82,160,0.15)' }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#8697C4' }}>Question Navigator</p>
            <div className="grid grid-cols-5 gap-2 mb-3">
              {questions.map((_, i) => {
                const isAnswered = answers[i] !== undefined;
                const isFlagged = flagged.has(i);
                const isCurrent = i === currentIndex;
                const canNav = settings.testMode !== 'hard' || i >= currentIndex;
                return (
                  <button key={i} onClick={() => { if (canNav) { setCurrentIndex(i); setShowNavigator(false); } }}
                    className="w-10 h-10 rounded-lg text-xs font-bold transition-all"
                    style={{
                      background: isCurrent ? 'linear-gradient(135deg, #7091E6, #3D52A0)' : isFlagged ? '#fbbf24' : isAnswered ? '#10b981' : 'rgba(200,212,245,0.4)',
                      color: (isCurrent || isAnswered) ? '#fff' : isFlagged ? '#92400e' : '#3D52A0',
                      opacity: !canNav ? 0.35 : 1,
                    }}>
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-3 text-xs" style={{ color: '#8697C4' }}>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> Answered</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-yellow-400 inline-block" /> Flagged</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: 'rgba(200,212,245,0.5)', border: '1px solid #ccc' }} /> Blank</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Question card */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div key={currentIndex}
            initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-2xl rounded-3xl p-8"
            style={GLASS}>

            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(112,145,230,0.15)', color: '#3D52A0' }}>
                    Q{currentIndex + 1} / {questions.length}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold capitalize" style={{ background: 'rgba(134,151,196,0.15)', color: '#8697C4' }}>
                    {(q.type || 'multiple choice').replace(/_/g, ' ')}
                  </span>
                  {flagged.has(currentIndex) && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">Flagged</span>
                  )}
                </div>
                <h3 className="text-lg font-bold leading-relaxed" style={{ color: '#3D52A0' }}>{q.question}</h3>
              </div>
              <button onClick={toggleFlag}
                className="ml-4 p-2.5 rounded-xl transition-all flex-shrink-0"
                style={{
                  background: flagged.has(currentIndex) ? '#fef3c7' : 'rgba(255,255,255,0.55)',
                  border: flagged.has(currentIndex) ? '1.5px solid #fbbf24' : '1px solid rgba(255,255,255,0.4)',
                  color: flagged.has(currentIndex) ? '#d97706' : '#8697C4',
                }}>
                <Flag className="w-4 h-4" />
              </button>
            </div>

            {/* Answer area — NO correct/wrong feedback shown during exam */}
            {q.type === 'short_answer' ? (
              <textarea
                value={answers[currentIndex] || ''}
                onChange={e => handleAnswer(e.target.value)}
                placeholder="Type your answer here"
                rows={4}
                className="w-full px-4 py-3 rounded-xl text-sm resize-none focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.65)', border: '1.5px solid rgba(112,145,230,0.3)', color: '#3D52A0' }}
              />
            ) : q.type === 'true_false' ? (
              <div className="grid grid-cols-2 gap-3">
                {['True', 'False'].map((opt, i) => {
                  const selected = answers[currentIndex] === i;
                  return (
                    <button key={opt} onClick={() => handleAnswer(i)}
                      className="py-4 rounded-xl font-bold text-base transition-all"
                      style={{
                        background: selected ? 'linear-gradient(135deg, #7091E6, #3D52A0)' : 'rgba(255,255,255,0.55)',
                        border: selected ? 'none' : '1px solid rgba(255,255,255,0.4)',
                        color: selected ? '#fff' : '#3D52A0',
                        boxShadow: selected ? '0 4px 16px rgba(112,145,230,0.3)' : 'none',
                      }}>
                      {opt}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                {(q.options || []).map((opt, i) => {
                  const selected = answers[currentIndex] === i;
                  return (
                    <button key={i} onClick={() => handleAnswer(i)}
                      className="w-full text-left px-5 py-3.5 rounded-xl text-sm font-medium transition-all"
                      style={{
                        background: selected ? 'rgba(112,145,230,0.18)' : 'rgba(255,255,255,0.55)',
                        border: selected ? '2px solid #7091E6' : '1px solid rgba(255,255,255,0.4)',
                        color: '#3D52A0',
                        boxShadow: selected ? '0 2px 12px rgba(112,145,230,0.2)' : 'none',
                      }}>
                      <span className="font-black mr-2" style={{ color: selected ? '#7091E6' : '#8697C4' }}>
                        {['A','B','C','D','E'][i]}.
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex justify-between items-center mt-8">
              <button onClick={goPrev}
                disabled={currentIndex === 0 || settings.testMode === 'hard'}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-30"
                style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.4)', color: '#3D52A0' }}>
                <ChevronLeft className="w-4 h-4" />
                {settings.testMode === 'hard' ? 'Locked' : 'Previous'}
              </button>
              <p className="text-xs font-semibold" style={{ color: '#8697C4' }}>{totalAnswered}/{questions.length} answered</p>
              <button onClick={goNext}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all text-white"
                style={{ background: 'linear-gradient(135deg, #7091E6, #3D52A0)' }}>
                {currentIndex === questions.length - 1 ? 'Review' : 'Next'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Results Screen ───────────────────────────────────────────────────────────
function ResultsScreen({ questions, answers, settings, timeUsed, suddenDeath, autoEnded, notebook, user, onResourceCreated, onClose }) {
  const [breakdown, setBreakdown] = useState(null);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);
  const [exported, setExported] = useState(false);

  const scored = questions.map((q, i) => {
    const ans = answers[i];
    if (ans === undefined || ans === null || ans === '') return { ...q, userAnswer: ans, correct: false };
    if (q.type === 'short_answer') {
      const correct = (ans + '').toLowerCase().includes(((q.correct_answer || '').toLowerCase()).slice(0, 20));
      return { ...q, userAnswer: ans, correct };
    }
    return { ...q, userAnswer: ans, correct: ans === q.correct_index };
  });

  const numCorrect = scored.filter(s => s.correct).length;
  const percentage = Math.round((numCorrect / questions.length) * 100);
  const grade = percentage >= 90 ? 'A*' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B' : percentage >= 60 ? 'C' : percentage >= 50 ? 'D' : 'U';
  const gradeColor = percentage >= 70 ? '#10b981' : percentage >= 50 ? '#f59e0b' : '#ef4444';

  useEffect(() => {
    const run = async () => {
      setLoadingBreakdown(true);
      const wrong = scored.filter(s => !s.correct).map(s => s.question).slice(0, 10).join('; ');
      const right = scored.filter(s => s.correct).map(s => s.question).slice(0, 5).join('; ');
      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Student scored ${numCorrect}/${questions.length} (${percentage}%) on "${settings.customTopic || notebook.name}". Correct: ${right}. Wrong: ${wrong}. Give concise performance analysis.`,
          response_json_schema: {
            type: 'object',
            properties: {
              strengths: { type: 'array', items: { type: 'string' } },
              weaknesses: { type: 'array', items: { type: 'string' } },
              topics_missed: { type: 'array', items: { type: 'string' } },
              next_steps: { type: 'array', items: { type: 'string' } },
              overall_feedback: { type: 'string' },
            },
            required: ['strengths', 'weaknesses', 'topics_missed', 'next_steps', 'overall_feedback'],
            additionalProperties: false,
          }
        });
        setBreakdown(result);
      } catch {}
      setLoadingBreakdown(false);
    };
    run();
  }, []);

  const exportResults = async () => {
    const content = JSON.stringify({
      score: `${numCorrect}/${questions.length}`, percentage, grade,
      timeUsed: formatTime(timeUsed), mode: settings.testMode, difficulty: settings.difficulty,
      questions: scored.map(q => ({
        question: q.question, correct: q.correct,
        userAnswer: q.type === 'short_answer' ? q.userAnswer : (q.options?.[q.userAnswer] || q.userAnswer),
        correctAnswer: q.type === 'short_answer' ? q.correct_answer : (q.options?.[q.correct_index] || ''),
      })), breakdown,
    }, null, 2);
    await base44.entities.NotebookResource.create({
      notebook_id: notebook.id, student_email: user.email,
      title: `${notebook.name} — Exam Results (${percentage}% · ${new Date().toLocaleDateString()})`,
      resource_type: 'exam_questions', content, source_count: 0,
    });
    onResourceCreated();
    setExported(true);
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col overflow-y-auto"
      style={{ background: 'linear-gradient(135deg, #EDE8F5 0%, #c8d4f5 100%)' }}>
      <div className="max-w-2xl mx-auto w-full p-6 space-y-6 pb-16">

        {/* Score card */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="rounded-3xl p-8 text-center" style={GLASS}>
          {suddenDeath && <p className="font-bold text-sm mb-3" style={{ color: '#ef4444' }}>💀 Sudden Death — Exam Ended Early</p>}
          {autoEnded && <p className="font-bold text-sm mb-3" style={{ color: '#f59e0b' }}>⚠️ Exam auto-ended (integrity violations)</p>}
          <div className="w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl"
            style={{ background: `${gradeColor}22`, border: `3px solid ${gradeColor}` }}>
            <span className="font-black text-4xl" style={{ color: gradeColor }}>{grade}</span>
          </div>
          <h2 className="font-black text-3xl mb-1" style={{ color: '#3D52A0' }}>{percentage}%</h2>
          <p className="font-semibold mb-1" style={{ color: '#8697C4' }}>{numCorrect} / {questions.length} correct</p>
          <p className="text-xs" style={{ color: '#8697C4' }}>Time used: {formatTime(timeUsed)} · Mode: {settings.testMode}</p>
        </motion.div>

        {/* Per-question breakdown */}
        <div className="rounded-3xl overflow-hidden" style={GLASS}>
          <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.3)' }}>
            <h3 className="font-black" style={{ color: '#3D52A0' }}>Question Breakdown</h3>
          </div>
          <div className="divide-y max-h-80 overflow-y-auto">
            {scored.map((q, i) => (
              <div key={i} className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: q.correct ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }}>
                    {q.correct
                      ? <CheckCircle className="w-4 h-4" style={{ color: '#10b981' }} />
                      : <XCircle className="w-4 h-4" style={{ color: '#ef4444' }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold mb-1" style={{ color: '#3D52A0' }}>{q.question}</p>
                    {!q.correct && q.explanation && (
                      <p className="text-xs" style={{ color: '#8697C4' }}>{q.explanation}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance analysis */}
        <div className="rounded-3xl p-6" style={GLASS}>
          <h3 className="font-black mb-4 flex items-center gap-2" style={{ color: '#3D52A0' }}>
            <Zap className="w-5 h-5" style={{ color: '#7091E6' }} /> Performance Analysis
          </h3>
          {loadingBreakdown ? (
            <div className="flex items-center gap-3 py-4">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#7091E6' }} />
              <p className="text-sm" style={{ color: '#8697C4' }}>Analysing your performance…</p>
            </div>
          ) : breakdown ? (
            <div className="space-y-4">
              {breakdown.overall_feedback && (
                <p className="text-sm leading-relaxed p-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.45)', color: '#3D52A0' }}>
                  {breakdown.overall_feedback}
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1" style={{ color: '#10b981' }}>
                    <TrendingUp className="w-3.5 h-3.5" /> Strengths
                  </p>
                  <ul className="space-y-1">
                    {breakdown.strengths?.map((s, i) => (
                      <li key={i} className="text-xs p-2 rounded-lg" style={{ background: 'rgba(16,185,129,0.08)', color: '#3D52A0' }}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1" style={{ color: '#ef4444' }}>
                    <TrendingDown className="w-3.5 h-3.5" /> Weaknesses
                  </p>
                  <ul className="space-y-1">
                    {breakdown.weaknesses?.map((w, i) => (
                      <li key={i} className="text-xs p-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', color: '#3D52A0' }}>{w}</li>
                    ))}
                  </ul>
                </div>
              </div>
              {breakdown.next_steps?.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1" style={{ color: '#7091E6' }}>
                    <BookOpen className="w-3.5 h-3.5" /> Recommended Next Steps
                  </p>
                  <ul className="space-y-1">
                    {breakdown.next_steps.map((s, i) => (
                      <li key={i} className="text-xs p-2 rounded-lg" style={{ background: 'rgba(112,145,230,0.08)', color: '#3D52A0' }}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={exportResults} disabled={exported}
            className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
            style={{
              background: exported ? '#10b981' : 'rgba(255,255,255,0.55)',
              border: exported ? 'none' : '1px solid rgba(255,255,255,0.4)',
              color: exported ? '#fff' : '#3D52A0',
            }}>
            {exported
              ? <><CheckCircle className="w-4 h-4" /> Saved to Items</>
              : <><Download className="w-4 h-4" /> Export Results</>}
          </button>
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl font-bold text-sm text-white"
            style={{ background: 'linear-gradient(135deg, #7091E6, #3D52A0)' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────
export default function ExamSimulator({ notebook, user, allSources, onResourceCreated }) {
  const [phase, setPhase] = useState('setup');
  const [questions, setQuestions] = useState([]);
  const [settings, setSettings] = useState(null);
  const [result, setResult] = useState(null);

  const handleStart = async (cfg) => {
    setSettings(cfg);
    setPhase('generating');

    const ctx = cfg.customTopic
      ? `Topic: ${cfg.customTopic}`
      : allSources.filter(s => s.content_text).map(s => `### ${s.name}\n${s.content_text.slice(0, 6000)}`).join('\n\n').slice(0, 14000);

    const typeInstructions = {
      multiple_choice: 'All questions must be multiple choice with 4 options and a correct_index (0-3).',
      true_false: 'All questions must be true/false with type="true_false", options=["True","False"], correct_index (0=True, 1=False).',
      short_answer: 'All questions must be type="short_answer" with a correct_answer field (1-2 sentences).',
      mixed: 'Mix of multiple_choice (type="multiple_choice"), true_false (type="true_false"), and short_answer (type="short_answer").',
    };

    const diffInstructions = {
      easy: 'Easy recall-based questions.',
      medium: 'Medium difficulty, understanding-based questions.',
      hard: 'Hard application and analysis questions.',
      'exam-level': 'Exam-level precision and rigor.',
    };

    const qs = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate exactly ${cfg.numQuestions} exam questions about the following content.
${diffInstructions[cfg.difficulty] || ''}
${typeInstructions[cfg.questionType] || ''}
For multiple_choice: provide 4 options array, correct_index (0-3), explanation.
For true_false: options=["True","False"], correct_index (0=True,1=False), explanation.
For short_answer: correct_answer (brief answer text), explanation.
CONTENT:\n${ctx}`,
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
                explanation: { type: 'string' },
              },
              required: ['question', 'type', 'explanation'],
              additionalProperties: false,
            }
          }
        },
        required: ['questions'],
        additionalProperties: false,
      }
    });

    const generated = qs?.questions || [];
    if (generated.length === 0) { setPhase('setup'); return; }
    setQuestions(generated);
    setPhase('test');
  };

  const handleFinish = useCallback((finishData) => {
    setResult(finishData);
    setPhase('results');
  }, []);

  const handleClose = () => {
    setPhase('setup');
    setQuestions([]);
    setSettings(null);
    setResult(null);
  };

  if (phase === 'setup') return <TestSetupPanel notebook={notebook} allSources={allSources} onStart={handleStart} />;
  if (phase === 'generating') return <GeneratingScreen numQuestions={settings?.numQuestions} />;
  if (phase === 'test') return <TestMode questions={questions} settings={settings} notebook={notebook} user={user} allSources={allSources} onFinish={handleFinish} />;
  if (phase === 'results') return (
    <ResultsScreen
      questions={questions}
      answers={result.answers}
      settings={settings}
      timeUsed={result.timeUsed}
      suddenDeath={result.suddenDeath}
      autoEnded={result.autoEnded}
      notebook={notebook}
      user={user}
      onResourceCreated={onResourceCreated}
      onClose={handleClose}
    />
  );
  return null;
}