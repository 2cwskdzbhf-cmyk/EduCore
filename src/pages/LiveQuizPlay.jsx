import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Clock, Trophy, Loader2, Users, BarChart2, Crown, Medal, Flame, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─── Constants ────────────────────────────────────────────────────────────────
const INTRO_DELAY_S = 5;   // Phase 1: thinking time (no answers)
const ANSWER_TIME_S = 5;   // Phase 2: answer window
const TOTAL_TIME_S = INTRO_DELAY_S + ANSWER_TIME_S; // 10s total
const BASE_POINTS = 1000;

// ─── Sound System (Web Audio API) ─────────────────────────────────────────────
function createSound() {
  let ctx = null;
  const getCtx = () => {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  };

  const beep = (freq, duration, type = 'sine', gain = 0.3) => {
    try {
      const c = getCtx();
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.connect(g);
      g.connect(c.destination);
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.setValueAtTime(gain, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + duration);
    } catch {}
  };

  return {
    tick: () => beep(800, 0.08, 'square', 0.15),
    correct: () => {
      beep(523, 0.1, 'sine', 0.3);
      setTimeout(() => beep(659, 0.1, 'sine', 0.3), 100);
      setTimeout(() => beep(784, 0.2, 'sine', 0.3), 200);
    },
    wrong: () => {
      beep(200, 0.15, 'sawtooth', 0.3);
      setTimeout(() => beep(150, 0.3, 'sawtooth', 0.25), 150);
    },
    leaderboard: () => {
      [523, 587, 659, 698, 784].forEach((f, i) => setTimeout(() => beep(f, 0.15, 'sine', 0.25), i * 80));
    },
    podium: () => {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.25, 'sine', 0.35), i * 120));
    },
  };
}

const sound = createSound();

// ─── Helpers ─────────────────────────────────────────────────────────────────
function parseJSON(str, fallback) {
  try { return JSON.parse(str || JSON.stringify(fallback)); } catch { return fallback; }
}

function streakBonus(streak) {
  if (streak >= 4) return 0.3;
  if (streak === 3) return 0.2;
  if (streak === 2) return 0.1;
  return 0;
}

// ─── Podium Screen ────────────────────────────────────────────────────────────
function PodiumScreen({ scores, onDone }) {
  const sorted = Object.entries(scores)
    .map(([email, d]) => ({ email, ...d }))
    .sort((a, b) => b.total_score - a.total_score)
    .slice(0, 3);

  useEffect(() => { setTimeout(() => sound.podium(), 400); }, []);

  const podiumConfig = [
    { color: 'from-amber-400 to-yellow-500', label: '🥇', height: 'h-36' },
    { color: 'from-slate-400 to-slate-500', label: '🥈', height: 'h-24' },
    { color: 'from-orange-500 to-amber-600', label: '🥉', height: 'h-16' },
  ];
  const order = [1, 0, 2];

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900/30 to-slate-900 flex flex-col items-center justify-center p-6 overflow-y-auto">
      <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-5xl font-black text-white text-center mb-2">🎉 Quiz Over!</h1>
        <p className="text-slate-400 text-center mb-10 text-lg">Final Standings</p>
      </motion.div>

      <div className="flex items-end justify-center gap-4 mb-12 w-full max-w-lg">
        {order.map((rank, display) => {
          const player = sorted[rank];
          if (!player) return <div key={rank} className="flex-1" />;
          const m = podiumConfig[rank];
          return (
            <motion.div key={player.email} initial={{ opacity: 0, y: 80 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: display * 0.25 + 0.4, type: 'spring', damping: 14 }}
              className="flex flex-col items-center flex-1">
              <p className="text-white font-bold text-sm text-center truncate w-full px-1 mb-1">{player.name}</p>
              <p className="text-amber-400 font-bold text-xl mb-1">{player.total_score}</p>
              {player.streak > 0 && <p className="text-xs text-orange-400 mb-1">🔥{player.streak}</p>}
              <div className={`w-full ${m.height} bg-gradient-to-t ${m.color} rounded-t-2xl flex items-end justify-center pb-3`}>
                <span className="text-3xl">{m.label}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {sorted.length > 3 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
          className="w-full max-w-sm space-y-2 mb-8">
          {sorted.slice(3).map((p, i) => (
            <div key={p.email} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-2">
              <span className="text-slate-500 font-bold w-6">{i + 4}</span>
              <span className="text-slate-300 flex-1">{p.name}</span>
              <span className="text-amber-400 font-bold">{p.total_score}</span>
            </div>
          ))}
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="w-full max-w-sm">
        <Button onClick={onDone} className="w-full py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-lg font-bold">
          Back to Dashboard
        </Button>
      </motion.div>
    </div>
  );
}

// ─── Leaderboard Screen ───────────────────────────────────────────────────────
function LeaderboardScreen({ scores, isTeacher, onNext, isLastQuestion, prevScores }) {
  const sorted = Object.entries(scores)
    .map(([email, d]) => ({ email, ...d }))
    .sort((a, b) => b.total_score - a.total_score);

  useEffect(() => { sound.leaderboard(); }, []);

  const getPrevRank = (email) => {
    const prev = Object.entries(prevScores || {})
      .map(([e, d]) => ({ email: e, ...d }))
      .sort((a, b) => b.total_score - a.total_score);
    return prev.findIndex(p => p.email === email);
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex flex-col items-center overflow-y-auto">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl pt-8 px-4 pb-8">
        <div className="flex items-center gap-3 mb-6 justify-center">
          <BarChart2 className="w-8 h-8 text-amber-400" />
          <h2 className="text-3xl font-black text-white">Leaderboard</h2>
        </div>

        <div className="space-y-3 mb-8">
          <AnimatePresence>
            {sorted.map((player, idx) => {
              const prevRank = getPrevRank(player.email);
              const moved = prevRank !== -1 && prevRank !== idx;
              const movedUp = moved && prevRank > idx;
              const rankEmoji = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`;
              return (
                <motion.div key={player.email} layout
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.06 }}
                  className={`flex items-center gap-3 p-4 rounded-2xl border ${
                    idx === 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white/5 border-white/10'
                  }`}>
                  <span className="text-2xl w-10 text-center flex-shrink-0">{rankEmoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-lg truncate">{player.name}</p>
                    <p className="text-slate-400 text-sm">{player.correct || 0} correct</p>
                  </div>
                  {(player.streak || 0) >= 2 && (
                    <span className="text-orange-400 font-bold">🔥{player.streak}</span>
                  )}
                  {moved && (
                    <span className={`font-bold text-lg ${movedUp ? 'text-emerald-400' : 'text-red-400'}`}>
                      {movedUp ? '▲' : '▼'}
                    </span>
                  )}
                  <span className="text-amber-400 font-bold text-2xl ml-2">{player.total_score}</span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {isTeacher ? (
          <Button onClick={onNext}
            className="w-full py-4 text-base bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 font-bold">
            {isLastQuestion ? '🏆 Show Final Podium' : 'Next Question →'}
          </Button>
        ) : (
          <p className="text-center text-slate-500 text-sm animate-pulse">Waiting for teacher to continue...</p>
        )}
      </motion.div>
    </div>
  );
}

// ─── Teacher Question View ────────────────────────────────────────────────────
function TeacherQuestion({ session, question, qIndex, totalQ, answeredCount, totalStudents, onShowLeaderboard }) {
  const startTime = new Date(session.question_start_time).getTime();
  const [answerTime, setAnswerTime] = useState(ANSWER_TIME_S);
  const [introCountdown, setIntroCountdown] = useState(INTRO_DELAY_S);

  useEffect(() => {
    const update = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      setIntroCountdown(Math.max(0, Math.ceil(INTRO_DELAY_S - elapsed)));
      setAnswerTime(Math.max(0, Math.ceil(ANSWER_TIME_S - Math.max(0, elapsed - INTRO_DELAY_S))));
    };
    update();
    const interval = setInterval(update, 250);
    return () => clearInterval(interval);
  }, [startTime]);

  const inIntro = introCountdown > 0;
  const allAnswered = answeredCount >= totalStudents && totalStudents > 0;
  const canSkip = !inIntro;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900/30 to-slate-900 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <div className="flex items-center gap-4">
          <span className="text-slate-300 text-xl font-bold">Q {qIndex + 1} / {totalQ}</span>
          <div className="w-40 h-3 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all"
              style={{ width: `${((qIndex + 1) / totalQ) * 100}%` }} />
          </div>
        </div>
        {/* Timer */}
        <motion.div key={inIntro ? `i${introCountdown}` : `a${answerTime}`}
          initial={{ scale: 1.2 }} animate={{ scale: 1 }}
          className={`w-20 h-20 rounded-full flex items-center justify-center font-black text-4xl shadow-lg ${
            inIntro
              ? 'bg-gradient-to-br from-purple-500 to-blue-600 text-white'
              : answerTime <= 2
              ? 'bg-red-500/30 border-2 border-red-500 text-red-300'
              : 'bg-white/10 border-2 border-white/20 text-white'
          }`}>
          {inIntro ? introCountdown : answerTime}
        </motion.div>
      </div>

      {/* Main — question + status */}
      <div className="flex-1 flex flex-col items-center justify-center px-10 gap-8">
        {inIntro && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-purple-300 text-lg font-medium tracking-wide uppercase">
            ⏳ Students are reading the question…
          </motion.p>
        )}
        {!inIntro && (
          <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="text-emerald-300 text-lg font-bold tracking-wide uppercase">
            ✅ Answer window open
          </motion.p>
        )}

        <motion.div key={qIndex} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-4xl bg-white/5 border border-white/10 rounded-3xl p-14 text-center shadow-2xl">
          <p className="text-5xl font-black text-white leading-tight">{question.prompt}</p>
          {question.image_url && (
            <img src={question.image_url} alt="" className="max-h-56 mx-auto mt-8 rounded-2xl object-contain" />
          )}
        </motion.div>

        {/* Answer progress */}
        <div className="w-full max-w-4xl bg-white/5 border border-white/10 rounded-2xl px-8 py-5 flex items-center gap-6">
          <Users className="w-7 h-7 text-purple-400 flex-shrink-0" />
          <div>
            <p className="text-white font-black text-4xl leading-none">{answeredCount} / {totalStudents}</p>
            <p className="text-slate-400 text-sm mt-1">students answered</p>
          </div>
          <div className="flex-1 h-4 bg-white/10 rounded-full overflow-hidden mx-4">
            <motion.div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
              animate={{ width: totalStudents > 0 ? `${(answeredCount / totalStudents) * 100}%` : '0%' }} />
          </div>
          {canSkip && (
            <Button onClick={onShowLeaderboard} size="lg"
              className={`text-lg px-8 py-6 font-bold ${allAnswered
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600'
                : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
              }`}>
              {allAnswered ? 'All answered! →' : 'Go to Leaderboard →'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Student Intro Countdown ───────────────────────────────────────────────────
function IntroCountdown({ count }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-40 pointer-events-none">
      <motion.div key={count} initial={{ scale: 3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.5, opacity: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        className="w-40 h-40 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-2xl shadow-purple-500/60">
        <span className="text-7xl font-black text-white">{count}</span>
      </motion.div>
    </div>
  );
}

// ─── Student Question View ────────────────────────────────────────────────────
function StudentQuestion({ session, question, qIndex, user, myAnswer, onAnswer }) {
  const startTime = new Date(session.question_start_time).getTime();
  const [answerTime, setAnswerTime] = useState(ANSWER_TIME_S);
  const [introCount, setIntroCount] = useState(INTRO_DELAY_S);
  const [flash, setFlash] = useState(null);
  const tickedRef = useRef(new Set());

  const answeredThisQ = myAnswer !== null && myAnswer !== undefined;
  const inIntro = introCount > 0;
  const canAnswer = !inIntro && !answeredThisQ;

  useEffect(() => {
    tickedRef.current = new Set();
    const update = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const intro = Math.max(0, Math.ceil(INTRO_DELAY_S - elapsed));
      const answerElapsed = Math.max(0, elapsed - INTRO_DELAY_S);
      const tl = Math.max(0, Math.ceil(ANSWER_TIME_S - answerElapsed));
      setIntroCount(intro);
      setAnswerTime(tl);
      // Tick on last 3s of answer phase
      if (intro === 0 && tl <= 3 && tl > 0 && !tickedRef.current.has(tl)) {
        tickedRef.current.add(tl);
        sound.tick();
      }
    };
    update();
    const interval = setInterval(update, 250);
    return () => clearInterval(interval);
  }, [startTime]);

  const handleSelect = async (idx) => {
    if (!canAnswer) return;
    const timeTakenMs = Math.max(0, Date.now() - startTime - INTRO_DELAY_S * 1000);
    const isCorrect = idx === question.correct_index;
    const speedFraction = Math.max(0.1, (ANSWER_TIME_S - timeTakenMs / 1000) / ANSWER_TIME_S);
    const prevStreak = myAnswer?.streak || 0;
    const currentStreak = isCorrect ? prevStreak + 1 : 0;
    const bonus = streakBonus(currentStreak);
    const baseEarned = isCorrect ? Math.round(BASE_POINTS * speedFraction) : 0;
    const bonusPoints = Math.round(baseEarned * bonus);
    const points = baseEarned + bonusPoints;

    if (isCorrect) sound.correct();
    else sound.wrong();

    setFlash(isCorrect ? 'correct' : 'wrong');
    setTimeout(() => setFlash(null), 900);

    await onAnswer({ answerIndex: idx, isCorrect, timeTakenMs, points, streak: currentStreak, bonusPoints });
  };

  const colorSchemes = [
    { active: 'bg-blue-600 hover:bg-blue-500 border-blue-400', passive: 'bg-blue-900/20 border-blue-900/40' },
    { active: 'bg-purple-600 hover:bg-purple-500 border-purple-400', passive: 'bg-purple-900/20 border-purple-900/40' },
    { active: 'bg-amber-600 hover:bg-amber-500 border-amber-400', passive: 'bg-amber-900/20 border-amber-900/40' },
    { active: 'bg-rose-600 hover:bg-rose-500 border-rose-400', passive: 'bg-rose-900/20 border-rose-900/40' },
  ];
  const labels = ['A', 'B', 'C', 'D'];

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex flex-col overflow-hidden">
      {/* Full-screen flash overlay */}
      <AnimatePresence>
        {flash && (
          <motion.div key={flash} initial={{ opacity: 0.85 }} animate={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className={`fixed inset-0 z-50 pointer-events-none ${flash === 'correct' ? 'bg-emerald-500/60' : 'bg-red-600/60'}`} />
        )}
      </AnimatePresence>

      {/* Intro countdown — full screen overlay */}
      <AnimatePresence>
        {inIntro && <IntroCountdown count={introCount} />}
      </AnimatePresence>

      {/* Header strip */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
        <span className="text-slate-300 font-bold text-xl">Q {qIndex + 1}</span>
        {/* Answer timer — only show after intro */}
        <motion.div key={answerTime}
          initial={{ scale: 1.3 }} animate={{ scale: 1 }}
          className={`w-16 h-16 rounded-full flex items-center justify-center font-black text-3xl ${
            inIntro ? 'bg-white/5 text-slate-600' :
            answerTime <= 2 ? 'bg-red-500/30 border-2 border-red-500 text-red-300' :
            'bg-white/10 border-2 border-white/20 text-white'
          }`}>
          {inIntro ? '—' : answerTime}
        </motion.div>
      </div>

      {/* Question — vertically centered, takes most of the space */}
      <div className="flex-1 flex flex-col justify-center px-6 py-4 gap-5 overflow-hidden">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center shadow-xl">
          {question.image_url && <img src={question.image_url} alt="" className="max-h-44 mx-auto mb-5 rounded-2xl object-contain" />}
          <p className="text-3xl md:text-4xl font-black text-white leading-tight">{question.prompt}</p>
        </div>

        {/* Answer buttons — LARGE, full-width-ish grid */}
        {question.options?.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 flex-shrink-0">
            {question.options.filter(Boolean).map((opt, idx) => {
              const isSelected = myAnswer?.answerIndex === idx;
              const isCorrect = idx === question.correct_index;
              const scheme = colorSchemes[idx % 4];

              let cls = 'w-full py-6 px-5 rounded-2xl border-2 font-bold text-lg transition-all flex items-center gap-4 ';
              if (!answeredThisQ && inIntro) {
                cls += `${scheme.passive} text-slate-600 cursor-not-allowed`;
              } else if (!answeredThisQ) {
                cls += `${scheme.active} text-white cursor-pointer active:scale-95`;
              } else if (isCorrect) {
                cls += 'bg-emerald-500/30 border-emerald-400 text-emerald-200';
              } else if (isSelected) {
                cls += 'bg-red-500/30 border-red-400 text-red-200';
              } else {
                cls += 'bg-white/5 border-white/10 text-slate-600';
              }

              return (
                <button key={idx} onClick={() => handleSelect(idx)} disabled={!canAnswer} className={cls}>
                  <span className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-black text-xl flex-shrink-0">
                    {labels[idx]}
                  </span>
                  <span className="flex-1 text-left leading-snug">{opt}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            {answeredThisQ
              ? <p className="text-emerald-300 font-bold text-2xl">✓ Submitted</p>
              : <Button onClick={() => handleSelect(0)} disabled={inIntro} className="bg-purple-500 hover:bg-purple-600 text-xl px-12 py-6">Submit Answer</Button>
            }
          </div>
        )}

        {/* Post-answer feedback */}
        {answeredThisQ && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl border p-5 text-center flex-shrink-0 ${
              myAnswer.isCorrect ? 'bg-emerald-500/20 border-emerald-500/50' : 'bg-red-500/20 border-red-500/50'
            }`}>
            <p className={`text-2xl font-black ${myAnswer.isCorrect ? 'text-emerald-300' : 'text-red-300'}`}>
              {myAnswer.isCorrect ? `✅ Correct!  +${myAnswer.points} pts` : '❌ Incorrect — 0 pts'}
            </p>
            {(myAnswer.streak || 0) >= 2 && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}
                className="inline-flex items-center gap-2 mt-3 px-5 py-2 bg-orange-500/20 border border-orange-500/40 rounded-full">
                <Flame className="w-5 h-5 text-orange-400" />
                <span className="text-orange-300 font-bold text-lg">{myAnswer.streak} Streak!</span>
                {myAnswer.bonusPoints > 0 && <span className="text-orange-400 text-sm">+{myAnswer.bonusPoints} bonus</span>}
              </motion.div>
            )}
            {question.explanation && <p className="text-slate-400 text-sm mt-2">{question.explanation}</p>}
            <p className="text-slate-500 text-sm mt-2 animate-pulse">Waiting for others…</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─── Root Play Page ───────────────────────────────────────────────────────────
export default function LiveQuizPlay() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('sessionId');

  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [myAnswers, setMyAnswers] = useState({});
  const prevScoresRef = useRef({});

  useEffect(() => { base44.auth.me().then(setUser); }, []);

  useEffect(() => {
    if (!sessionId) return;

    const load = async () => {
      const results = await base44.entities.QuizLobbySession.filter({ id: sessionId });
      const s = results[0];
      if (!s) { navigate('/'); return; }
      setSession(s);
      setQuestions(parseJSON(s.questions_json, []));
    };
    load();

    const unsub = base44.entities.QuizLobbySession.subscribe((event) => {
      if (event.data && event.id === sessionId) {
        setSession(prev => {
          if (prev && event.data.status === 'leaderboard' && prev.status !== 'leaderboard') {
            prevScoresRef.current = parseJSON(prev.scores_json, {});
          }
          return event.data;
        });
      }
    });

    const poll = setInterval(async () => {
      const results = await base44.entities.QuizLobbySession.filter({ id: sessionId });
      if (results[0]) {
        setSession(prev => {
          if (prev && results[0].status === 'leaderboard' && prev.status !== 'leaderboard') {
            prevScoresRef.current = parseJSON(prev.scores_json, {});
          }
          return results[0];
        });
      }
    }, 2500);

    return () => { unsub(); clearInterval(poll); };
  }, [sessionId, navigate]);

  // Student answer submission
  const handleAnswer = useCallback(async ({ answerIndex, isCorrect, timeTakenMs, points, streak, bonusPoints }) => {
    if (!user || !session) return;
    const qIdx = session.current_question_index;

    setMyAnswers(prev => ({ ...prev, [qIdx]: { answerIndex, isCorrect, timeTakenMs, points, streak, bonusPoints } }));

    const answers = parseJSON(session.answers_json, []);
    if (answers.find(a => a.email === user.email && a.q_index === qIdx)) return;

    const newAnswer = {
      email: user.email,
      name: user.full_name || user.email.split('@')[0],
      q_index: qIdx,
      answer_index: answerIndex,
      is_correct: isCorrect,
      time_ms: timeTakenMs,
      points
    };
    const updatedAnswers = [...answers, newAnswer];

    const scores = parseJSON(session.scores_json, {});
    const existing = scores[user.email] || { name: newAnswer.name, total_score: 0, correct: 0, streak: 0 };
    scores[user.email] = {
      ...existing,
      total_score: existing.total_score + points,
      correct: isCorrect ? existing.correct + 1 : existing.correct,
      streak: streak,
    };

    const totalStudents = session.participant_emails?.length || 1;
    const answersThisQ = updatedAnswers.filter(a => a.q_index === qIdx).length;

    const updateData = {
      answers_json: JSON.stringify(updatedAnswers),
      scores_json: JSON.stringify(scores),
    };
    if (answersThisQ >= totalStudents) updateData.status = 'leaderboard';

    await base44.entities.QuizLobbySession.update(sessionId, updateData);
  }, [user, session, sessionId]);

  const handleShowLeaderboard = useCallback(async () => {
    if (!session) return;
    prevScoresRef.current = parseJSON(session.scores_json, {});
    await base44.entities.QuizLobbySession.update(sessionId, { status: 'leaderboard' });
  }, [session, sessionId]);

  const handleNextQuestion = useCallback(async () => {
    if (!session) return;
    const nextIdx = (session.current_question_index || 0) + 1;
    if (nextIdx >= questions.length) {
      await base44.entities.QuizLobbySession.update(sessionId, { status: 'ended', ended_at: new Date().toISOString() });
    } else {
      prevScoresRef.current = parseJSON(session.scores_json, {});
      await base44.entities.QuizLobbySession.update(sessionId, {
        status: 'question',
        current_question_index: nextIdx,
        question_start_time: new Date().toISOString()
      });
    }
  }, [session, questions.length, sessionId]);

  if (!session || !user || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
      </div>
    );
  }

  const isTeacher = session.teacher_email === user.email;
  const qIdx = session.current_question_index || 0;
  const question = questions[qIdx];
  const answers = parseJSON(session.answers_json, []);
  const scores = parseJSON(session.scores_json, {});
  const answeredThisQ = answers.filter(a => a.q_index === qIdx).length;
  const totalStudents = session.participant_emails?.length || 0;
  const isLastQuestion = qIdx >= questions.length - 1;
  const myAnswer = myAnswers[qIdx] ?? null;

  if (session.status === 'ended') {
    return <PodiumScreen scores={scores} onDone={() => navigate(isTeacher ? '/TeacherDashboard' : '/')} />;
  }

  if (session.status === 'leaderboard') {
    return (
      <LeaderboardScreen
        scores={scores}
        isTeacher={isTeacher}
        onNext={handleNextQuestion}
        isLastQuestion={isLastQuestion}
        prevScores={prevScoresRef.current}
      />
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (isTeacher) {
    return (
      <TeacherQuestion
        session={session}
        sessionId={sessionId}
        question={question}
        qIndex={qIdx}
        totalQ={questions.length}
        answeredCount={answeredThisQ}
        totalStudents={totalStudents}
        onShowLeaderboard={handleShowLeaderboard}
      />
    );
  }

  return (
    <StudentQuestion
      session={session}
      sessionId={sessionId}
      question={question}
      qIndex={qIdx}
      user={user}
      myAnswer={myAnswer}
      onAnswer={handleAnswer}
    />
  );
}