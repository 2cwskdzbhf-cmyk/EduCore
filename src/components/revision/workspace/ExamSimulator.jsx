import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import {
  Loader2, Timer, Flag, ChevronLeft, ChevronRight,
  AlertTriangle, CheckCircle, XCircle, BarChart2,
  Grid3X3, Send, RotateCcw, Download, BookOpen, Zap, Skull
} from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────
function fmtTime(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function glassBox(extra = '') {
  return {
    background: 'rgba(255,255,255,0.18)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.28)',
    boxShadow: '0 4px 24px rgba(61,82,160,0.12)',
    ...(extra ? {} : {}),
  };
}

const PALETTE = {
  primary: '#7091E6',
  dark: '#3D52A0',
  muted: '#8697C4',
  base: '#EDE8F5',
  bg: 'linear-gradient(135deg, #EDE8F5 0%, #c8d4f5 40%, #7091E6 100%)',
};

// ── Setup Panel ───────────────────────────────────────────────────────────────
function TestSetupPanel({ notebook, allSources, onStart }) {
  const [numQuestions, setNumQuestions] = useState('10');
  const [difficulty, setDifficulty] = useState('medium');
  const [questionType, setQuestionType] = useState('mixed');
  const [testMode, setTestMode] = useState('standard');
  const [customTopic, setCustomTopic] = useState('');
  const [timeLimitMins, setTimeLimitMins] = useState('20');

  const SEL = {
    background: 'rgba(255,255,255,0.45)',
    border: '1px solid rgba(255,255,255,0.4)',
    borderRadius: '12px',
    color: PALETTE.dark,
    padding: '10px 14px',
    fontSize: '14px',
    fontWeight: '500',
    width: '100%',
    outline: 'none',
    cursor: 'pointer',
  };

  const modes = [
    { id: 'standard', icon: BookOpen, label: 'Standard', desc: 'Navigate freely, review before submitting' },
    { id: 'hard', icon: Zap, label: 'Hard Mode', desc: 'No going back — each answer is locked' },
    { id: 'sudden_death', icon: Skull, label: 'Sudden Death', desc: 'One wrong answer ends the test' },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 overflow-y-auto"
      style={{ background: PALETTE.bg }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg rounded-3xl p-8 space-y-6"
        style={glassBox()}>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${PALETTE.primary}, ${PALETTE.dark})` }}>
            <Timer className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-black text-xl" style={{ color: PALETTE.dark }}>Exam Simulator</h2>
            <p className="text-sm" style={{ color: PALETTE.muted }}>{notebook.name}</p>
          </div>
        </div>

        {/* Custom Topic */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: PALETTE.muted }}>
            Custom Topic (optional)
          </label>
          <input
            value={customTopic}
            onChange={e => setCustomTopic(e.target.value)}
            placeholder={`e.g. "waterfalls", "photosynthesis", "World War 2"…`}
            style={{ ...SEL, padding: '10px 14px' }}
          />
          <p className="text-xs mt-1" style={{ color: PALETTE.muted }}>
            Leave blank to use all sources
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Number of questions */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: PALETTE.muted }}>Questions</label>
            <select value={numQuestions} onChange={e => setNumQuestions(e.target.value)} style={SEL}>
              {['5','10','15','20','30','40'].map(n => <option key={n} value={n}>{n} questions</option>)}
            </select>
          </div>

          {/* Time limit */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: PALETTE.muted }}>Time Limit</label>
            <select value={timeLimitMins} onChange={e => setTimeLimitMins(e.target.value)} style={SEL}>
              {['5','10','15','20','30','45','60','90'].map(n => <option key={n} value={n}>{n} mins</option>)}
            </select>
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: PALETTE.muted }}>Difficulty</label>
            <select value={difficulty} onChange={e => setDifficulty(e.target.value)} style={SEL}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="exam">Exam Level</option>
            </select>
          </div>

          {/* Question type */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: PALETTE.muted }}>Question Type</label>
            <select value={questionType} onChange={e => setQuestionType(e.target.value)} style={SEL}>
              <option value="mixed">Mixed</option>
              <option value="mcq">Multiple Choice Only</option>
              <option value="short">Short Answer Only</option>
              <option value="extended">Extended Answer Only</option>
            </select>
          </div>
        </div>

        {/* Test Mode */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest mb-3" style={{ color: PALETTE.muted }}>Test Mode</label>
          <div className="space-y-2">
            {modes.map(m => (
              <button key={m.id} onClick={() => setTestMode(m.id)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all"
                style={testMode === m.id
                  ? { background: `linear-gradient(135deg, ${PALETTE.primary}22, ${PALETTE.dark}11)`, border: `2px solid ${PALETTE.primary}88` }
                  : { background: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.4)' }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: testMode === m.id ? `linear-gradient(135deg, ${PALETTE.primary}, ${PALETTE.dark})` : 'rgba(134,151,196,0.2)' }}>
                  <m.icon className="w-4 h-4" style={{ color: testMode === m.id ? '#fff' : PALETTE.muted }} />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: PALETTE.dark }}>{m.label}</p>
                  <p className="text-xs" style={{ color: PALETTE.muted }}>{m.desc}</p>
                </div>
                {testMode === m.id && <CheckCircle className="w-4 h-4 ml-auto flex-shrink-0" style={{ color: PALETTE.primary }} />}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => onStart({ numQuestions: parseInt(numQuestions), difficulty, questionType, testMode, customTopic, timeLimitSecs: parseInt(timeLimitMins) * 60 })}
          className="w-full py-4 rounded-2xl text-white font-black text-lg transition-all hover:brightness-110 active:scale-[0.98] shadow-lg"
          style={{ background: `linear-gradient(135deg, ${PALETTE.primary}, ${PALETTE.dark})`, boxShadow: '0 6px 24px rgba(61,82,160,0.35)' }}>
          🚀 Start Test
        </button>
      </motion.div>
    </div>
  );
}

// ── Generating Screen ─────────────────────────────────────────────────────────
function GeneratingScreen({ progress }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 p-8"
      style={{ background: PALETTE.bg }}>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
        style={{ background: `linear-gradient(135deg, ${PALETTE.primary}, ${PALETTE.dark})` }}>
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
      <p className="font-black text-xl" style={{ color: PALETTE.dark }}>Generating Your Test…</p>
      <p className="text-sm" style={{ color: PALETTE.muted }}>{progress}</p>
      <p className="text-xs" style={{ color: 'rgba(61,82,160,0.45)' }}>Please wait — this may take 20–30 seconds</p>
    </div>
  );
}

// ── Test Mode ─────────────────────────────────────────────────────────────────
function TestMode({ questions, config, onComplete, onForceEnd }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState(new Set());
  const [lockedAnswers, setLockedAnswers] = useState(new Set()); // for hard mode
  const [timeLeft, setTimeLeft] = useState(config.timeLimitSecs);
  const [warnings, setWarnings] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMsg, setWarningMsg] = useState('');
  const [showNavigator, setShowNavigator] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [suddenDeath, setSuddenDeath] = useState(false);
  const containerRef = useRef(null);
  const autoSaveRef = useRef(null);

  const q = questions[currentIdx];
  const isMCQ = q?.type === 'mcq';
  const isHard = config.testMode === 'hard';
  const isSuddenDeath = config.testMode === 'sudden_death';
  const isLocked = isHard && lockedAnswers.has(currentIdx);

  // Timer
  useEffect(() => {
    if (timeLeft <= 0) { onComplete(answers, 'timeout'); return; }
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timeLeft]);

  // Auto-save every 5 seconds
  useEffect(() => {
    autoSaveRef.current = answers;
  }, [answers]);

  // Anti-cheat: detect visibility change
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) triggerWarning('Tab switch detected!');
    };
    const handleBlur = () => triggerWarning('Window focus lost!');
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) triggerWarning('Fullscreen exited!');
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [warnings]);

  // Block copy/paste/right-click/selection
  useEffect(() => {
    const prevent = e => e.preventDefault();
    document.addEventListener('copy', prevent);
    document.addEventListener('cut', prevent);
    document.addEventListener('paste', prevent);
    document.addEventListener('contextmenu', prevent);
    document.addEventListener('selectstart', prevent);
    return () => {
      document.removeEventListener('copy', prevent);
      document.removeEventListener('cut', prevent);
      document.removeEventListener('paste', prevent);
      document.removeEventListener('contextmenu', prevent);
      document.removeEventListener('selectstart', prevent);
    };
  }, []);

  // Enter fullscreen
  useEffect(() => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    return () => { if (document.exitFullscreen && document.fullscreenElement) document.exitFullscreen().catch(() => {}); };
  }, []);

  const triggerWarning = useCallback((msg) => {
    const newWarnings = warnings + 1;
    setWarnings(newWarnings);
    setWarningMsg(`⚠️ ${msg} Warning ${newWarnings}/3`);
    setShowWarning(true);
    setTimeout(() => setShowWarning(false), 3000);
    if (newWarnings >= 3) {
      setTimeout(() => onForceEnd(autoSaveRef.current), 1500);
    }
  }, [warnings, onForceEnd]);

  const selectAnswer = (val) => {
    if (isLocked) return;
    const newAnswers = { ...answers, [currentIdx]: val };
    setAnswers(newAnswers);
    if (isHard) {
      setLockedAnswers(prev => new Set([...prev, currentIdx]));
    }
    if (isSuddenDeath && isMCQ) {
      const correct = q.correct_index;
      if (val !== correct) {
        setSuddenDeath(true);
        setTimeout(() => onForceEnd(newAnswers, 'sudden_death'), 2000);
      }
    }
  };

  const toggleFlag = () => {
    setFlagged(prev => {
      const next = new Set(prev);
      next.has(currentIdx) ? next.delete(currentIdx) : next.add(currentIdx);
      return next;
    });
  };

  const canGoBack = !isHard && currentIdx > 0;
  const canGoForward = currentIdx < questions.length - 1;

  const getNavStatus = (i) => {
    if (flagged.has(i)) return 'flagged';
    if (answers[i] !== undefined) return 'answered';
    return 'unanswered';
  };

  const STATUS_COLORS = {
    answered: { bg: 'rgba(112,145,230,0.3)', border: '1.5px solid rgba(112,145,230,0.8)', text: PALETTE.dark },
    flagged: { bg: 'rgba(245,158,11,0.3)', border: '1.5px solid rgba(245,158,11,0.8)', text: '#92400e' },
    unanswered: { bg: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.3)', text: PALETTE.muted },
  };

  const timerColor = timeLeft <= 60 ? '#ef4444' : timeLeft <= 180 ? '#f59e0b' : PALETTE.dark;

  if (suddenDeath) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center z-[9999]" style={{ background: PALETTE.bg }}>
        <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="text-center p-8">
          <div className="text-6xl mb-4">💀</div>
          <h2 className="text-3xl font-black mb-2" style={{ color: '#dc2626' }}>Sudden Death!</h2>
          <p style={{ color: PALETTE.muted }}>Wrong answer — test ended.</p>
        </motion.div>
      </div>
    );
  }

  if (showReview) {
    return (
      <div className="fixed inset-0 flex flex-col z-[9999] overflow-y-auto" style={{ background: PALETTE.bg }}>
        <div className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between" style={{ background: 'rgba(237,232,245,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.4)' }}>
          <h2 className="font-black text-lg" style={{ color: PALETTE.dark }}>Review Before Submit</h2>
          <button onClick={() => setShowReview(false)} className="px-4 py-2 rounded-xl font-semibold text-sm" style={{ background: 'rgba(255,255,255,0.4)', color: PALETTE.dark }}>Back to Test</button>
        </div>
        <div className="p-6 space-y-3 max-w-2xl mx-auto w-full">
          {questions.map((qq, i) => {
            const status = getNavStatus(i);
            return (
              <div key={i} className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.4)' }}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold" style={{ color: PALETTE.dark }}>
                    <span style={{ color: PALETTE.muted }}>Q{i + 1}. </span>{qq.question}
                  </p>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0" style={STATUS_COLORS[status]}>
                    {status === 'flagged' ? '🚩 Flagged' : status === 'answered' ? '✓ Answered' : '○ Skipped'}
                  </span>
                </div>
                {answers[i] !== undefined && qq.type === 'mcq' && (
                  <p className="text-xs mt-1" style={{ color: PALETTE.muted }}>Answer: {qq.options?.[answers[i]]}</p>
                )}
                {answers[i] !== undefined && qq.type !== 'mcq' && (
                  <p className="text-xs mt-1 italic" style={{ color: PALETTE.muted }}>"{String(answers[i]).slice(0, 80)}…"</p>
                )}
                <button onClick={() => { setCurrentIdx(i); setShowReview(false); }} className="text-xs mt-2 font-semibold" style={{ color: PALETTE.primary }}>Go to question →</button>
              </div>
            );
          })}
          <button
            onClick={() => onComplete(answers, 'submitted')}
            className="w-full py-4 rounded-2xl text-white font-black text-lg mt-4"
            style={{ background: `linear-gradient(135deg, ${PALETTE.primary}, ${PALETTE.dark})`, boxShadow: '0 6px 24px rgba(61,82,160,0.3)' }}>
            Submit Test ✓
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="fixed inset-0 flex flex-col z-[9999] select-none" style={{ background: PALETTE.bg }}>

      {/* Warning banner */}
      <AnimatePresence>
        {showWarning && (
          <motion.div
            initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[10000] flex items-center justify-center gap-2 py-3 font-bold text-sm"
            style={{ background: 'rgba(239,68,68,0.92)', color: '#fff' }}>
            <AlertTriangle className="w-4 h-4" />
            {warningMsg} {warnings >= 3 ? '— Auto-submitting…' : ''}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-3"
        style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.4)' }}>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold" style={{ color: PALETTE.dark }}>
            Q {currentIdx + 1} / {questions.length}
          </span>
          <div className="h-1.5 w-32 rounded-full overflow-hidden" style={{ background: 'rgba(112,145,230,0.2)' }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${((currentIdx + 1) / questions.length) * 100}%`, background: `linear-gradient(90deg, ${PALETTE.primary}, ${PALETTE.dark})` }} />
          </div>
          {warnings > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.15)', color: '#dc2626' }}>
              ⚠️ {warnings}/3 warnings
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Navigator button */}
          <button onClick={() => setShowNavigator(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{ background: showNavigator ? `${PALETTE.primary}22` : 'rgba(255,255,255,0.4)', color: PALETTE.dark, border: `1px solid ${showNavigator ? PALETTE.primary + '55' : 'rgba(255,255,255,0.4)'}` }}>
            <Grid3X3 className="w-3.5 h-3.5" />
            Navigator
          </button>

          {/* Timer */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-black text-sm"
            style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.5)', color: timerColor }}>
            <Timer className="w-3.5 h-3.5" />
            {fmtTime(timeLeft)}
          </div>
        </div>
      </div>

      {/* Navigator panel (dropdown) */}
      <AnimatePresence>
        {showNavigator && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="absolute top-[56px] right-4 z-[9998] p-4 rounded-2xl w-72"
            style={{ ...glassBox(), background: 'rgba(237,232,245,0.92)' }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: PALETTE.muted }}>Question Navigator</p>
            <div className="flex gap-2 mb-3 text-xs">
              {[['answered', PALETTE.primary, 'Answered'], ['flagged', '#f59e0b', 'Flagged'], ['unanswered', PALETTE.muted, 'Skipped']].map(([k, c, l]) => (
                <div key={k} className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ background: c }} /><span style={{ color: PALETTE.muted }}>{l}</span></div>
              ))}
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {questions.map((_, i) => {
                const s = getNavStatus(i);
                const sc = STATUS_COLORS[s];
                return (
                  <button key={i} onClick={() => { setCurrentIdx(i); setShowNavigator(false); }}
                    className="w-9 h-9 rounded-xl text-xs font-bold transition-all hover:brightness-110"
                    style={{ background: sc.bg, border: i === currentIdx ? `2px solid ${PALETTE.dark}` : sc.border, color: sc.text }}>
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Question area */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center py-8 px-4">
        <AnimatePresence mode="wait">
          <motion.div key={currentIdx}
            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-2xl space-y-6">

            {/* Question card */}
            <div className="p-6 rounded-3xl" style={glassBox()}>
              <div className="flex items-start justify-between gap-3 mb-1">
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: PALETTE.muted }}>
                  Question {currentIdx + 1} · {q?.type === 'mcq' ? 'Multiple Choice' : q?.type === 'short' ? 'Short Answer' : 'Extended Answer'}
                </span>
                <button onClick={toggleFlag}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all flex-shrink-0"
                  style={flagged.has(currentIdx)
                    ? { background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.5)', color: '#d97706' }
                    : { background: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.4)', color: PALETTE.muted }}>
                  <Flag className="w-3 h-3" />
                  {flagged.has(currentIdx) ? 'Flagged' : 'Flag'}
                </button>
              </div>
              <p className="text-lg font-bold mt-2 leading-relaxed" style={{ color: PALETTE.dark }}>{q?.question}</p>
              {q?.marks && <p className="text-xs mt-1" style={{ color: PALETTE.muted }}>[{q.marks} mark{q.marks > 1 ? 's' : ''}]</p>}
            </div>

            {/* MCQ options */}
            {isMCQ && (
              <div className="space-y-2.5">
                {q.options?.map((opt, oi) => (
                  <button key={oi} onClick={() => selectAnswer(oi)} disabled={isLocked}
                    className="w-full text-left px-5 py-4 rounded-2xl text-sm font-medium transition-all"
                    style={answers[currentIdx] === oi
                      ? { background: `linear-gradient(135deg, ${PALETTE.primary}33, ${PALETTE.dark}22)`, border: `2px solid ${PALETTE.primary}99`, color: PALETTE.dark }
                      : { ...glassBox(), color: PALETTE.dark, cursor: isLocked ? 'default' : 'pointer' }}>
                    <span className="font-black mr-2" style={{ color: PALETTE.muted }}>{['A', 'B', 'C', 'D'][oi]}.</span>
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {/* Short/extended answer */}
            {!isMCQ && (
              <textarea
                value={answers[currentIdx] || ''}
                onChange={e => setAnswers(a => ({ ...a, [currentIdx]: e.target.value }))}
                placeholder="Write your answer here…"
                rows={q?.type === 'extended' ? 8 : 4}
                className="w-full p-4 rounded-2xl text-sm font-medium resize-none focus:outline-none"
                style={{ ...glassBox(), color: PALETTE.dark }}
                onCopy={e => e.preventDefault()}
                onPaste={e => e.preventDefault()}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom nav */}
      <div className="flex-shrink-0 px-6 py-4 flex items-center justify-between gap-3"
        style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.4)' }}>
        <button onClick={() => canGoBack && setCurrentIdx(i => i - 1)} disabled={!canGoBack}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-30 transition-all"
          style={{ background: 'rgba(255,255,255,0.4)', color: PALETTE.dark, border: '1px solid rgba(255,255,255,0.4)' }}>
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>

        <div className="flex gap-2">
          {canGoForward ? (
            <button onClick={() => setCurrentIdx(i => i + 1)}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
              style={{ background: `linear-gradient(135deg, ${PALETTE.primary}, ${PALETTE.dark})` }}>
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={() => config.testMode === 'standard' ? setShowReview(true) : onComplete(answers, 'submitted')}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              <Send className="w-4 h-4" />
              {config.testMode === 'standard' ? 'Review & Submit' : 'Submit'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Results Screen ────────────────────────────────────────────────────────────
function ResultsScreen({ questions, answers, endReason, config, notebook, user, onResourceCreated, onRestart }) {
  const [breakdown, setBreakdown] = useState(null);
  const [loadingBreakdown, setLoadingBreakdown] = useState(true);

  // Calculate score
  const mcqQs = questions.filter(q => q.type === 'mcq');
  const correct = mcqQs.filter((q, _) => {
    const qIdx = questions.indexOf(q);
    return answers[qIdx] === q.correct_index;
  }).length;
  const total = mcqQs.length;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const answered = Object.keys(answers).length;

  useEffect(() => {
    const fetchBreakdown = async () => {
      setLoadingBreakdown(true);
      const wrongTopics = questions
        .filter((q, i) => q.type === 'mcq' && answers[i] !== q.correct_index)
        .map(q => q.question).slice(0, 6).join('; ');
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `A student just completed a ${questions.length}-question test on "${config.customTopic || notebook.name}". They scored ${correct}/${total} (${pct}%). These questions were answered incorrectly: ${wrongTopics || 'none'}. Provide a brief performance breakdown.`,
        response_json_schema: {
          type: 'object',
          properties: {
            overall: { type: 'string' },
            strengths: { type: 'array', items: { type: 'string' } },
            weaknesses: { type: 'array', items: { type: 'string' } },
            topics_missed: { type: 'array', items: { type: 'string' } },
            next_steps: { type: 'array', items: { type: 'string' } },
          },
          required: ['overall', 'strengths', 'weaknesses', 'topics_missed', 'next_steps'],
          additionalProperties: false,
        }
      });
      setBreakdown(res);
      setLoadingBreakdown(false);

      // Save to Created Items
      await base44.entities.NotebookResource.create({
        notebook_id: notebook.id, student_email: user.email,
        title: `Test Results — ${config.customTopic || notebook.name} (${pct}%)`,
        resource_type: 'report',
        content: JSON.stringify({ score: `${correct}/${total}`, pct, breakdown: res, answers, questions: questions.map((q, i) => ({ question: q.question, userAnswer: q.type === 'mcq' ? q.options?.[answers[i]] : answers[i], correct: q.type === 'mcq' ? q.options?.[q.correct_index] : 'N/A', isCorrect: q.type === 'mcq' ? answers[i] === q.correct_index : null })) }),
        source_count: 0,
      });
      onResourceCreated();
    };
    fetchBreakdown();
  }, []);

  const GRADE_CONFIG = pct >= 80 ? { label: 'Excellent!', color: '#10b981', emoji: '🏆' }
    : pct >= 60 ? { label: 'Good Effort', color: PALETTE.primary, emoji: '⭐' }
    : pct >= 40 ? { label: 'Keep Practising', color: '#f59e0b', emoji: '📚' }
    : { label: 'Needs Work', color: '#ef4444', emoji: '💪' };

  return (
    <div className="flex flex-col items-center min-h-full py-8 px-4 overflow-y-auto" style={{ background: PALETTE.bg }}>
      <div className="w-full max-w-2xl space-y-5">

        {/* Score card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="p-8 rounded-3xl text-center" style={glassBox()}>
          <div className="text-5xl mb-3">{GRADE_CONFIG.emoji}</div>
          <h2 className="text-2xl font-black mb-1" style={{ color: GRADE_CONFIG.color }}>{GRADE_CONFIG.label}</h2>
          {endReason === 'timeout' && <p className="text-xs mb-2" style={{ color: '#ef4444' }}>⏰ Time ran out</p>}
          {endReason === 'sudden_death' && <p className="text-xs mb-2" style={{ color: '#ef4444' }}>💀 Sudden Death ended the test</p>}
          {endReason === 'force_end' && <p className="text-xs mb-2" style={{ color: '#ef4444' }}>⚠️ Test auto-ended (3 warnings)</p>}
          {total > 0 && (
            <div className="flex items-end justify-center gap-1 mb-2">
              <span className="text-6xl font-black" style={{ color: PALETTE.dark }}>{pct}</span>
              <span className="text-2xl font-bold mb-3" style={{ color: PALETTE.muted }}>%</span>
            </div>
          )}
          {total > 0 && <p className="text-sm" style={{ color: PALETTE.muted }}>{correct} / {total} MCQ questions correct · {answered} / {questions.length} answered</p>}
        </motion.div>

        {/* Per-question review */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="p-5 rounded-3xl space-y-3" style={glassBox()}>
          <h3 className="font-black text-sm uppercase tracking-wider" style={{ color: PALETTE.muted }}>Question Review</h3>
          {questions.map((q, i) => {
            const isCorrect = q.type === 'mcq' ? answers[i] === q.correct_index : null;
            const userAns = q.type === 'mcq' ? q.options?.[answers[i]] : answers[i];
            const correctAns = q.type === 'mcq' ? q.options?.[q.correct_index] : null;
            return (
              <div key={i} className="p-3 rounded-2xl" style={{ background: isCorrect === true ? 'rgba(16,185,129,0.1)' : isCorrect === false ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.2)', border: isCorrect === true ? '1px solid rgba(16,185,129,0.3)' : isCorrect === false ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.3)' }}>
                <div className="flex items-start gap-2">
                  {isCorrect === true && <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#10b981' }} />}
                  {isCorrect === false && <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />}
                  {isCorrect === null && <div className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5" style={{ background: PALETTE.muted, opacity: 0.4 }} />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: PALETTE.dark }}>Q{i + 1}. {q.question}</p>
                    {userAns !== undefined && <p className="text-xs mt-0.5" style={{ color: isCorrect === false ? '#ef4444' : PALETTE.muted }}>Your answer: {String(userAns).slice(0, 100)}</p>}
                    {isCorrect === false && correctAns && <p className="text-xs" style={{ color: '#10b981' }}>Correct: {correctAns}</p>}
                    {q.explanation && <p className="text-xs mt-1 italic" style={{ color: PALETTE.muted }}>{q.explanation}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* AI Breakdown */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="p-5 rounded-3xl" style={glassBox()}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-5 h-5" style={{ color: PALETTE.primary }} />
            <h3 className="font-black" style={{ color: PALETTE.dark }}>Performance Breakdown</h3>
          </div>
          {loadingBreakdown ? (
            <div className="flex items-center gap-2 text-sm" style={{ color: PALETTE.muted }}>
              <Loader2 className="w-4 h-4 animate-spin" /> Analysing your performance…
            </div>
          ) : breakdown ? (
            <div className="space-y-4">
              <p className="text-sm" style={{ color: PALETTE.dark }}>{breakdown.overall}</p>
              {[
                { key: 'strengths', label: '✅ Strengths', color: '#10b981' },
                { key: 'weaknesses', label: '⚠️ Weaknesses', color: '#f59e0b' },
                { key: 'topics_missed', label: '📌 Topics to Revisit', color: '#ef4444' },
                { key: 'next_steps', label: '🚀 Next Steps', color: PALETTE.primary },
              ].map(({ key, label, color }) => breakdown[key]?.length > 0 && (
                <div key={key}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color }}>{label}</p>
                  <ul className="space-y-1">
                    {breakdown[key].map((item, i) => (
                      <li key={i} className="text-sm flex items-start gap-2" style={{ color: PALETTE.dark }}>
                        <span className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : null}
        </motion.div>

        {/* Action buttons */}
        <div className="flex gap-3 pb-8">
          <button onClick={onRestart}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm"
            style={{ background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.5)', color: PALETTE.dark }}>
            <RotateCcw className="w-4 h-4" /> New Test
          </button>
          <div className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm"
            style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#059669' }}>
            <Download className="w-4 h-4" /> Saved to Created Items
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main ExamSimulator Component ──────────────────────────────────────────────
export default function ExamSimulator({ notebook, user, allSources, onResourceCreated }) {
  const [phase, setPhase] = useState('setup'); // setup | generating | test | results
  const [config, setConfig] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [endReason, setEndReason] = useState('submitted');
  const [genProgress, setGenProgress] = useState('');

  const handleStart = async (cfg) => {
    setConfig(cfg);
    setPhase('generating');
    setGenProgress('Building your questions…');

    const ctx = cfg.customTopic
      ? `Topic: ${cfg.customTopic}`
      : allSources.filter(s => s.content_text).map(s => `### ${s.name}\n${s.content_text.slice(0, 5000)}`).join('\n\n').slice(0, 14000);

    const typeInstr = {
      mcq: 'All questions must be multiple_choice type.',
      short: 'All questions must be short_answer type.',
      extended: 'All questions must be extended_answer type.',
      mixed: 'Mix question types: roughly half multiple_choice, and the rest short_answer and extended_answer.',
    }[cfg.questionType];

    const diffInstr = {
      easy: 'Basic recall and definitions.',
      medium: 'Mix of recall, application, and explanation.',
      hard: 'Complex analysis, evaluation, multi-step reasoning.',
      exam: 'Full exam-level academic rigour with mark-scheme style answers.',
    }[cfg.difficulty];

    setGenProgress('Generating questions with AI…');

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate exactly ${cfg.numQuestions} exam questions. Difficulty: ${diffInstr}. ${typeInstr}
${cfg.customTopic ? `Topic: "${cfg.customTopic}"` : ''}
For multiple_choice: provide exactly 4 options and a correct_index (0-3) and an explanation.
For short_answer: 1-3 sentences expected.
For extended_answer: paragraph/essay style.
Include marks per question.
SOURCES:\n${ctx}`,
      response_json_schema: {
        type: 'object',
        properties: {
          questions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                question: { type: 'string' },
                type: { type: 'string', enum: ['mcq', 'short', 'extended'] },
                options: { type: 'array', items: { type: 'string' } },
                correct_index: { type: 'number' },
                explanation: { type: 'string' },
                marks: { type: 'number' },
              },
              required: ['question', 'type', 'marks'],
              additionalProperties: false,
            }
          }
        },
        required: ['questions'],
        additionalProperties: false,
      }
    });

    const qs = result?.questions || [];
    setQuestions(qs);
    setPhase('test');
  };

  const handleComplete = (finalAnswers, reason) => {
    // Exit fullscreen
    if (document.exitFullscreen && document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setAnswers(finalAnswers);
    setEndReason(reason);
    setPhase('results');
  };

  const handleForceEnd = (finalAnswers, reason = 'force_end') => {
    handleComplete(finalAnswers, reason);
  };

  if (phase === 'setup') return <TestSetupPanel notebook={notebook} allSources={allSources} onStart={handleStart} />;
  if (phase === 'generating') return <GeneratingScreen progress={genProgress} />;
  if (phase === 'test') return (
    <TestMode
      questions={questions}
      config={config}
      onComplete={handleComplete}
      onForceEnd={handleForceEnd}
    />
  );
  if (phase === 'results') return (
    <ResultsScreen
      questions={questions}
      answers={answers}
      endReason={endReason}
      config={config}
      notebook={notebook}
      user={user}
      onResourceCreated={onResourceCreated}
      onRestart={() => setPhase('setup')}
    />
  );
  return null;
}