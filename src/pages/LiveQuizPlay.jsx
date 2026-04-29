import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import {
  Zap, CheckCircle2, XCircle, Clock, Trophy, Loader2,
  ArrowRight, Users, BarChart2, Crown, Medal
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─── Constants ────────────────────────────────────────────────────────────────
const QUESTION_TIME_S = 20;
const ANSWER_DELAY_S = 5;  // seconds before answer buttons appear
const BASE_POINTS = 1000;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function parseJSON(str, fallback) {
  try { return JSON.parse(str || JSON.stringify(fallback)); } catch { return fallback; }
}

// ─── Podium Screen ────────────────────────────────────────────────────────────
function PodiumScreen({ scores, onDone }) {
  const sorted = Object.entries(scores)
    .map(([email, d]) => ({ email, ...d }))
    .sort((a, b) => b.total_score - a.total_score)
    .slice(0, 3);

  const medals = [
    { color: 'from-amber-400 to-yellow-500', icon: Crown, label: '1st', height: 'h-32' },
    { color: 'from-slate-400 to-slate-500', icon: Medal, label: '2nd', height: 'h-24' },
    { color: 'from-orange-500 to-amber-600', icon: Medal, label: '3rd', height: 'h-16' },
  ];

  const order = [1, 0, 2]; // silver, gold, bronze display order

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex flex-col items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold text-white text-center mb-2">🎉 Quiz Complete!</h1>
        <p className="text-slate-400 text-center mb-12">Final Leaderboard</p>
      </motion.div>

      <div className="flex items-end justify-center gap-4 mb-12 w-full max-w-lg">
        {order.map((rank, display) => {
          const player = sorted[rank];
          if (!player) return <div key={rank} className="w-28" />;
          const m = medals[rank];
          return (
            <motion.div
              key={player.email}
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: display * 0.2 + 0.3 }}
              className="flex flex-col items-center flex-1"
            >
              <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${m.color} flex items-center justify-center mb-2 shadow-lg`}>
                <m.icon className="w-6 h-6 text-white" />
              </div>
              <p className="text-white font-bold text-sm text-center truncate w-full px-1">{player.name}</p>
              <p className="text-amber-400 font-bold text-lg">{player.total_score}</p>
              <div className={`w-full ${m.height} bg-gradient-to-t ${m.color} rounded-t-2xl mt-2 flex items-end justify-center pb-2`}>
                <span className="text-white font-bold text-xl">{m.label}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="w-full max-w-sm">
        <Button onClick={onDone} className="w-full py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-lg">
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

  const getPrevRank = (email) => {
    const prev = Object.entries(prevScores || {})
      .map(([e, d]) => ({ email: e, ...d }))
      .sort((a, b) => b.total_score - a.total_score);
    return prev.findIndex(p => p.email === email);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-4 flex flex-col items-center">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md pt-8">
        <div className="flex items-center gap-3 mb-6 justify-center">
          <BarChart2 className="w-7 h-7 text-amber-400" />
          <h2 className="text-2xl font-bold text-white">Leaderboard</h2>
        </div>

        <div className="space-y-3 mb-8">
          <AnimatePresence>
            {sorted.map((player, idx) => {
              const prevRank = getPrevRank(player.email);
              const moved = prevRank !== -1 && prevRank !== idx;
              const movedUp = moved && prevRank > idx;
              return (
                <motion.div
                  key={player.email}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.06 }}
                  className={`flex items-center gap-4 p-4 rounded-2xl border ${
                    idx === 0
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <span className={`text-2xl font-black w-8 text-center ${
                    idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-orange-400' : 'text-slate-500'
                  }`}>
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">{player.name}</p>
                    <p className="text-slate-400 text-xs">{player.correct || 0} correct</p>
                  </div>
                  {moved && (
                    <span className={`text-xs font-bold ${movedUp ? 'text-emerald-400' : 'text-red-400'}`}>
                      {movedUp ? '▲' : '▼'}
                    </span>
                  )}
                  <span className="text-amber-400 font-bold text-lg">{player.total_score}</span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {isTeacher && (
          <Button
            onClick={onNext}
            className="w-full py-4 text-base bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
          >
            {isLastQuestion ? '🏆 Show Final Podium' : 'Next Question →'}
          </Button>
        )}
        {!isTeacher && (
          <p className="text-center text-slate-500 text-sm animate-pulse">Waiting for teacher to continue...</p>
        )}
      </motion.div>
    </div>
  );
}

// ─── Teacher Question View ────────────────────────────────────────────────────
function TeacherQuestion({ session, sessionId, question, qIndex, totalQ, answeredCount, totalStudents, onShowLeaderboard }) {
  const timeElapsed = Math.floor((Date.now() - new Date(session.question_start_time).getTime()) / 1000);
  const timeLeft = Math.max(0, QUESTION_TIME_S - timeElapsed);
  const [displayTime, setDisplayTime] = useState(timeLeft);

  useEffect(() => {
    setDisplayTime(Math.max(0, QUESTION_TIME_S - Math.floor((Date.now() - new Date(session.question_start_time).getTime()) / 1000)));
    const interval = setInterval(() => {
      setDisplayTime(t => {
        if (t <= 1) { clearInterval(interval); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [session.question_start_time]);

  const allAnswered = answeredCount >= totalStudents && totalStudents > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-4 flex flex-col">
      {/* Header bar */}
      <div className="max-w-3xl mx-auto w-full mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-slate-400 text-sm">Q {qIndex + 1} / {totalQ}</span>
          <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all"
              style={{ width: `${((qIndex + 1) / totalQ) * 100}%` }} />
          </div>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${displayTime <= 5 ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white'}`}>
          <Clock className="w-4 h-4" />
          <span className="font-mono font-bold">{displayTime}s</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col justify-center">
        {/* Question */}
        <motion.div key={qIndex} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-10 mb-8 text-center">
          <p className="text-3xl font-bold text-white leading-relaxed">{question.prompt}</p>
          {question.image_url && (
            <img src={question.image_url} alt="" className="max-h-48 mx-auto mt-6 rounded-xl object-contain" />
          )}
        </motion.div>

        {/* Answer options — TEACHER sees these but cannot click them */}
        {(question.options?.length > 0) && (
          <div className="grid grid-cols-2 gap-3 mb-8">
            {question.options.filter(Boolean).map((opt, idx) => {
              const colors = ['bg-blue-600/30 border-blue-500/40', 'bg-purple-600/30 border-purple-500/40', 'bg-amber-600/30 border-amber-500/40', 'bg-rose-600/30 border-rose-500/40'];
              const labels = ['A', 'B', 'C', 'D'];
              return (
                <div key={idx} className={`p-4 rounded-2xl border ${colors[idx % 4]} flex items-center gap-3`}>
                  <span className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white font-bold flex-shrink-0">{labels[idx]}</span>
                  <span className="text-white font-medium">{opt}</span>
                  {idx === question.correct_index && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 ml-auto flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Progress */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-purple-400" />
            <div>
              <p className="text-white font-bold text-2xl">{answeredCount} / {totalStudents}</p>
              <p className="text-slate-400 text-sm">students answered</p>
            </div>
          </div>
          <div className="w-32 h-3 bg-white/10 rounded-full overflow-hidden">
            <motion.div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
              animate={{ width: totalStudents > 0 ? `${(answeredCount / totalStudents) * 100}%` : '0%' }} />
          </div>
          {(allAnswered || displayTime === 0) && (
            <Button onClick={onShowLeaderboard} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 ml-4">
              Show Results →
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Student Question View ────────────────────────────────────────────────────
function StudentQuestion({ session, sessionId, question, qIndex, user, myAnswer, onAnswer }) {
  const startTime = new Date(session.question_start_time).getTime();
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const [timeLeft, setTimeLeft] = useState(Math.max(0, QUESTION_TIME_S - elapsed));
  const [countdown, setCountdown] = useState(Math.max(0, ANSWER_DELAY_S - elapsed));
  const [flash, setFlash] = useState(null); // 'correct' | 'wrong' | null
  const answeredThisQ = myAnswer !== null && myAnswer !== undefined;

  useEffect(() => {
    setTimeLeft(Math.max(0, QUESTION_TIME_S - Math.floor((Date.now() - startTime) / 1000)));
    setCountdown(Math.max(0, ANSWER_DELAY_S - Math.floor((Date.now() - startTime) / 1000)));

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      setTimeLeft(Math.max(0, QUESTION_TIME_S - elapsed));
      setCountdown(Math.max(0, ANSWER_DELAY_S - elapsed));
    }, 250);
    return () => clearInterval(interval);
  }, [startTime]);

  const handleSelect = async (idx) => {
    if (answeredThisQ || countdown > 0) return;
    const timeTakenMs = Date.now() - startTime - (ANSWER_DELAY_S * 1000);
    const isCorrect = idx === question.correct_index;
    const points = isCorrect ? Math.round(BASE_POINTS * Math.max(0.1, (QUESTION_TIME_S - timeTakenMs / 1000) / QUESTION_TIME_S)) : 0;

    setFlash(isCorrect ? 'correct' : 'wrong');
    setTimeout(() => setFlash(null), 800);

    await onAnswer({ answerIndex: idx, isCorrect, timeTakenMs, points });
  };

  const canAnswer = countdown === 0 && !answeredThisQ;
  const colors = [
    { bg: 'bg-blue-600 hover:bg-blue-700', border: 'border-blue-500' },
    { bg: 'bg-purple-600 hover:bg-purple-700', border: 'border-purple-500' },
    { bg: 'bg-amber-600 hover:bg-amber-700', border: 'border-amber-500' },
    { bg: 'bg-rose-600 hover:bg-rose-700', border: 'border-rose-500' },
  ];
  const labels = ['A', 'B', 'C', 'D'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-4 flex flex-col">
      {/* Flash overlay */}
      <AnimatePresence>
        {flash && (
          <motion.div
            key={flash}
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className={`fixed inset-0 z-50 pointer-events-none ${flash === 'correct' ? 'bg-emerald-500/40' : 'bg-red-500/40'}`}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="max-w-xl mx-auto w-full mb-4 flex items-center justify-between">
        <span className="text-slate-400 text-sm">Q {qIndex + 1}</span>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold ${timeLeft <= 5 ? 'text-red-400 bg-red-500/20' : 'text-white bg-white/10'}`}>
          <Clock className="w-4 h-4" />
          {timeLeft}s
        </div>
      </div>

      {/* Question */}
      <div className="max-w-xl mx-auto w-full">
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 mb-6 text-center">
          {question.image_url && (
            <img src={question.image_url} alt="" className="max-h-40 mx-auto mb-4 rounded-xl object-contain" />
          )}
          <p className="text-2xl font-bold text-white leading-relaxed">{question.prompt}</p>
        </div>

        {/* Countdown overlay before answering */}
        {countdown > 0 && (
          <div className="text-center mb-6">
            <motion.div key={countdown} initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-2xl px-6 py-3">
              <Zap className="w-5 h-5 text-amber-400" />
              <span className="text-white font-bold text-xl">Get ready… {countdown}</span>
            </motion.div>
          </div>
        )}

        {/* Answer buttons */}
        {question.options?.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {question.options.filter(Boolean).map((opt, idx) => {
              const isSelected = myAnswer?.answerIndex === idx;
              const showCorrect = answeredThisQ;
              const isCorrect = idx === question.correct_index;

              let cls = `p-5 rounded-2xl border-2 text-left font-medium transition-all flex items-center gap-3 `;
              if (!answeredThisQ && countdown > 0) {
                cls += 'bg-white/5 border-white/10 text-slate-500 cursor-not-allowed opacity-60';
              } else if (!answeredThisQ) {
                cls += `${colors[idx % 4].bg} ${colors[idx % 4].border} text-white cursor-pointer active:scale-95`;
              } else if (showCorrect && isCorrect) {
                cls += 'bg-emerald-500/30 border-emerald-400 text-emerald-300';
              } else if (isSelected && !isCorrect) {
                cls += 'bg-red-500/30 border-red-400 text-red-300';
              } else {
                cls += 'bg-white/5 border-white/10 text-slate-500';
              }

              return (
                <button key={idx} onClick={() => handleSelect(idx)} disabled={!canAnswer} className={cls}>
                  <span className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold flex-shrink-0">
                    {labels[idx]}
                  </span>
                  <span className="flex-1">{opt}</span>
                  {showCorrect && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
                  {showCorrect && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        ) : (
          // Non-MCQ: just show "waiting" for now
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
            {answeredThisQ ? (
              <p className="text-emerald-300 font-semibold">Answer submitted ✓</p>
            ) : (
              <Button onClick={() => handleSelect(0)} disabled={countdown > 0}
                className="bg-gradient-to-r from-purple-500 to-blue-500">
                Submit Answer
              </Button>
            )}
          </div>
        )}

        {/* Answered feedback */}
        {answeredThisQ && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={`mt-4 p-4 rounded-2xl border text-center ${
              myAnswer.isCorrect
                ? 'bg-emerald-500/20 border-emerald-500/40'
                : 'bg-red-500/20 border-red-500/40'
            }`}>
            <p className={`text-xl font-bold ${myAnswer.isCorrect ? 'text-emerald-300' : 'text-red-300'}`}>
              {myAnswer.isCorrect ? '✅ Correct! +' + myAnswer.points + ' pts' : '❌ Incorrect'}
            </p>
            {question.explanation && (
              <p className="text-slate-400 text-sm mt-2">{question.explanation}</p>
            )}
            <p className="text-slate-500 text-sm mt-3 animate-pulse">Waiting for others...</p>
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
  // myAnswers: { [qIndex]: { answerIndex, isCorrect, timeTakenMs, points } }
  const [myAnswers, setMyAnswers] = useState({});
  const prevScoresRef = useRef({});

  useEffect(() => { base44.auth.me().then(setUser); }, []);

  // Real-time subscription + initial fetch
  useEffect(() => {
    if (!sessionId) return;

    const load = async () => {
      const results = await base44.entities.QuizLobbySession.filter({ id: sessionId });
      const s = results[0];
      if (!s) { navigate('/'); return; }
      setSession(s);
      try { setQuestions(parseJSON(s.questions_json, [])); } catch {}
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

    // Fallback poll
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

  // ── Student answer submission ──────────────────────────────────────────────
  const handleAnswer = useCallback(async ({ answerIndex, isCorrect, timeTakenMs, points }) => {
    if (!user || !session) return;
    const qIdx = session.current_question_index;

    setMyAnswers(prev => ({ ...prev, [qIdx]: { answerIndex, isCorrect, timeTakenMs, points } }));

    // Persist answer into answers_json
    const answers = parseJSON(session.answers_json, []);
    // prevent double submit
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

    // Update scores_json
    const scores = parseJSON(session.scores_json, {});
    if (!scores[user.email]) scores[user.email] = { name: newAnswer.name, total_score: 0, correct: 0 };
    scores[user.email].total_score += points;
    if (isCorrect) scores[user.email].correct = (scores[user.email].correct || 0) + 1;

    // Count total students
    const totalStudents = session.participant_emails?.length || 1;
    const answersThisQ = updatedAnswers.filter(a => a.q_index === qIdx).length;

    const updateData = {
      answers_json: JSON.stringify(updatedAnswers),
      scores_json: JSON.stringify(scores),
    };

    // If all students answered, auto-advance to leaderboard
    if (answersThisQ >= totalStudents) {
      updateData.status = 'leaderboard';
    }

    await base44.entities.QuizLobbySession.update(sessionId, updateData);
  }, [user, session, sessionId]);

  // ── Teacher: show leaderboard ──────────────────────────────────────────────
  const handleShowLeaderboard = useCallback(async () => {
    if (!session) return;
    await base44.entities.QuizLobbySession.update(sessionId, { status: 'leaderboard' });
  }, [session, sessionId]);

  // ── Teacher: next question ─────────────────────────────────────────────────
  const handleNextQuestion = useCallback(async () => {
    if (!session) return;
    const nextIdx = (session.current_question_index || 0) + 1;
    if (nextIdx >= questions.length) {
      await base44.entities.QuizLobbySession.update(sessionId, {
        status: 'ended',
        ended_at: new Date().toISOString()
      });
    } else {
      prevScoresRef.current = parseJSON(session.scores_json, {});
      await base44.entities.QuizLobbySession.update(sessionId, {
        status: 'question',
        current_question_index: nextIdx,
        question_start_time: new Date().toISOString()
      });
    }
  }, [session, questions.length, sessionId]);

  // ────────────────────────────────────────────────────────────────────────────
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

  // ── ENDED → Podium ─────────────────────────────────────────────────────────
  if (session.status === 'ended') {
    return <PodiumScreen scores={scores} onDone={() => navigate(isTeacher ? '/TeacherDashboard' : '/')} />;
  }

  // ── LEADERBOARD ────────────────────────────────────────────────────────────
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

  // ── QUESTION ───────────────────────────────────────────────────────────────
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