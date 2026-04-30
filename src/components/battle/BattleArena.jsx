import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { BattleSound } from './BattleSoundEngine';
import { Swords, Zap, Trophy, X } from 'lucide-react';

const THINKING_SECS = 5;
const ANSWERING_SECS = 8;
const RESULT_SECS = 3;
const MAX_POINTS = 500;

function getPoints(isCorrect, timeMs, maxMs) {
  if (!isCorrect) return 0;
  const speed = Math.max(0, 1 - timeMs / maxMs);
  return Math.round(100 + speed * (MAX_POINTS - 100));
}

export default function BattleArena({ session: initialSession, user, onExit }) {
  const [session, setSession] = useState(initialSession);
  const [phase, setPhase] = useState('thinking'); // thinking | answering | round_result | finished
  const [countdown, setCountdown] = useState(THINKING_SECS);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [flash, setFlash] = useState(null); // 'correct' | 'wrong' | null
  const [roundAnswers, setRoundAnswers] = useState(null);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const timerRef = useRef(null);
  const answeredRef = useRef(false);
  const lastQIndexRef = useRef(-1);
  const isChallenger = user.email === session.challenger_email;
  const myScoreKey = isChallenger ? 'challenger_score' : 'opponent_score';
  const oppScoreKey = isChallenger ? 'opponent_score' : 'challenger_score';
  const myEmail = user.email;
  const oppEmail = isChallenger ? session.opponent_email : session.challenger_email;
  const myName = isChallenger ? session.challenger_name : session.opponent_name;
  const oppName = isChallenger ? session.opponent_name : session.challenger_name;

  const questions = (() => {
    try { return JSON.parse(session.questions_json || '[]'); } catch { return []; }
  })();
  const answers = (() => {
    try { return JSON.parse(session.answers_json || '[]'); } catch { return []; }
  })();

  const currentQ = questions[session.current_question_index] || null;

  // Real-time subscription
  useEffect(() => {
    const unsub = base44.entities.BattleSession.subscribe(event => {
      if (event.id !== session.id) return;
      if (event.type === 'update' && event.data) {
        setSession(event.data);
      }
    });
    return () => unsub();
  }, [session.id]);

  // Handle phase transitions based on session status
  useEffect(() => {
    const s = session;
    if (s.status === 'finished') {
      setPhase('finished');
      return;
    }
    if (s.status === 'round_result') {
      setPhase('round_result');
      // Parse the latest round answers
      const ans = (() => { try { return JSON.parse(s.answers_json || '[]'); } catch { return []; } })();
      setRoundAnswers(ans[s.current_question_index] || null);
      clearInterval(timerRef.current);
      setTimeout(() => {
        // Auto-advance handled by the challenger
        if (isChallenger) advanceQuestion(s);
      }, RESULT_SECS * 1000);
      return;
    }
    if (s.status === 'question') {
      if (s.current_question_index !== lastQIndexRef.current) {
        lastQIndexRef.current = s.current_question_index;
        answeredRef.current = false;
        setSelectedAnswer(null);
        setFlash(null);
        setRoundAnswers(null);
        setPhase('thinking');
        setCountdown(THINKING_SECS);
        setQuestionStartTime(null);
      }
    }
  }, [session.status, session.current_question_index]);

  // Thinking countdown → answering
  useEffect(() => {
    if (phase !== 'thinking') return;
    clearInterval(timerRef.current);
    let c = THINKING_SECS;
    setCountdown(c);
    timerRef.current = setInterval(() => {
      c--;
      setCountdown(c);
      BattleSound.tick();
      if (c <= 0) {
        clearInterval(timerRef.current);
        setPhase('answering');
        setQuestionStartTime(Date.now());
        BattleSound.go();
        // Answering countdown
        let a = ANSWERING_SECS;
        timerRef.current = setInterval(() => {
          a--;
          if (a <= 0) {
            clearInterval(timerRef.current);
            if (!answeredRef.current) submitAnswer(null);
          }
        }, 1000);
      }
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase === 'thinking' && session.current_question_index]);

  const submitAnswer = useCallback(async (answerIndex) => {
    if (answeredRef.current) return;
    answeredRef.current = true;
    clearInterval(timerRef.current);

    const q = questions[session.current_question_index];
    if (!q) return;

    const isCorrect = answerIndex !== null && answerIndex === q.correct_index;
    const timeTaken = questionStartTime ? Date.now() - questionStartTime : ANSWERING_SECS * 1000;
    const points = getPoints(isCorrect, timeTaken, ANSWERING_SECS * 1000);

    setSelectedAnswer(answerIndex);
    setFlash(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) BattleSound.correct();
    else BattleSound.wrong();

    setTimeout(() => setFlash(null), 800);

    // Write answer to DB
    const freshSession = await base44.entities.BattleSession.filter({ id: session.id });
    const s = freshSession[0];
    const existingAnswers = (() => { try { return JSON.parse(s.answers_json || '[]'); } catch { return []; } })();
    const qIdx = s.current_question_index;

    if (!existingAnswers[qIdx]) existingAnswers[qIdx] = {};
    const answerKey = isChallenger ? 'challenger' : 'opponent';
    existingAnswers[qIdx][answerKey] = { answerIndex, isCorrect, timeTaken, points };

    const newChallengerScore = isChallenger
      ? (s.challenger_score || 0) + points
      : (s.challenger_score || 0);
    const newOpponentScore = !isChallenger
      ? (s.opponent_score || 0) + points
      : (s.opponent_score || 0);

    const bothAnswered = existingAnswers[qIdx].challenger && existingAnswers[qIdx].opponent;

    await base44.entities.BattleSession.update(session.id, {
      answers_json: JSON.stringify(existingAnswers),
      challenger_score: newChallengerScore,
      opponent_score: newOpponentScore,
      ...(bothAnswered ? { status: 'round_result' } : {})
    });

    // If only I answered, wait for opponent (handled by subscription)
    if (!bothAnswered) {
      setPhase('waiting_opponent');
    }
  }, [session, questions, isChallenger, questionStartTime]);

  const advanceQuestion = async (s) => {
    const nextIdx = (s.current_question_index || 0) + 1;
    const qs = (() => { try { return JSON.parse(s.questions_json || '[]'); } catch { return []; } })();
    if (nextIdx >= qs.length) {
      // Determine winner
      const winnerEmail = s.challenger_score >= s.opponent_score ? s.challenger_email : s.opponent_email;
      const loserEmail = winnerEmail === s.challenger_email ? s.opponent_email : s.challenger_email;
      const winnerName = winnerEmail === s.challenger_email ? s.challenger_name : s.opponent_name;
      const loserName = loserEmail === s.challenger_email ? s.challenger_name : s.opponent_name;
      await base44.entities.BattleSession.update(session.id, { status: 'finished', winner_email: winnerEmail });
      // Record win
      await base44.entities.BattleWin.create({
        class_id: s.class_id, winner_email: winnerEmail, winner_name: winnerName,
        loser_email: loserEmail, loser_name: loserName,
        winner_score: Math.max(s.challenger_score, s.opponent_score),
        loser_score: Math.min(s.challenger_score, s.opponent_score),
        battle_session_id: session.id
      });
    } else {
      await base44.entities.BattleSession.update(session.id, {
        current_question_index: nextIdx, status: 'question', phase: 'thinking',
        question_started_at: new Date().toISOString()
      });
    }
  };

  const myScore = session[myScoreKey] || 0;
  const oppScore = session[oppScoreKey] || 0;
  const amWinner = session.winner_email === myEmail;

  // FINISHED SCREEN
  if (phase === 'finished' || session.status === 'finished') {
    if (amWinner) BattleSound.victory();
    else BattleSound.defeat();
    return (
      <FinishedScreen
        myName={myName} oppName={oppName}
        myScore={myScore} oppScore={oppScore}
        amWinner={amWinner} onExit={onExit}
      />
    );
  }

  if (!currentQ) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xl font-bold">Loading battle...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[900] bg-gradient-to-br from-slate-950 via-red-950/30 to-slate-950 flex flex-col overflow-hidden">
      {/* Flash overlay */}
      <AnimatePresence>
        {flash && (
          <motion.div
            className={`absolute inset-0 z-50 pointer-events-none ${flash === 'correct' ? 'bg-emerald-500/30' : 'bg-red-500/30'}`}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          />
        )}
      </AnimatePresence>

      {/* Header - scores */}
      <div className="flex-shrink-0 p-4 bg-slate-950/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          {/* Me */}
          <div className="flex-1 text-left">
            <p className="text-xs text-slate-400 mb-0.5">You</p>
            <p className="text-lg font-black text-white truncate">{myName}</p>
            <motion.p
              key={myScore}
              className="text-3xl font-black text-purple-400"
              initial={{ scale: 1.4 }} animate={{ scale: 1 }}
            >{myScore}</motion.p>
          </div>
          {/* VS badge */}
          <div className="flex-shrink-0 flex flex-col items-center gap-1">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/50">
              <Swords className="w-7 h-7 text-white" />
            </div>
            <p className="text-xs text-slate-400">Q {session.current_question_index + 1}/{questions.length}</p>
          </div>
          {/* Opponent */}
          <div className="flex-1 text-right">
            <p className="text-xs text-slate-400 mb-0.5">Opponent</p>
            <p className="text-lg font-black text-white truncate">{oppName}</p>
            <motion.p
              key={oppScore}
              className="text-3xl font-black text-orange-400"
              initial={{ scale: 1.4 }} animate={{ scale: 1 }}
            >{oppScore}</motion.p>
          </div>
        </div>
      </div>

      {/* Phase display */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-3xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {(phase === 'thinking') && (
            <motion.div
              key="thinking"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="text-center w-full"
            >
              <p className="text-slate-400 text-sm font-semibold uppercase tracking-widest mb-4">Get Ready…</p>
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 mb-6">
                <p className="text-3xl font-black text-white leading-snug">{currentQ.question_text || currentQ.prompt}</p>
              </div>
              <motion.div
                className="w-28 h-28 mx-auto rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-2xl shadow-red-500/50"
                animate={{ scale: [1, 1.12, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                <span className="text-5xl font-black text-white">{countdown}</span>
              </motion.div>
            </motion.div>
          )}

          {(phase === 'answering' || phase === 'waiting_opponent') && (
            <motion.div
              key="answering"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -40, opacity: 0 }}
              className="w-full"
            >
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-6">
                <p className="text-2xl font-black text-white leading-snug text-center">{currentQ.question_text || currentQ.prompt}</p>
              </div>

              {phase === 'waiting_opponent' ? (
                <div className="text-center py-8">
                  <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-orange-400 font-bold">Waiting for opponent…</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {(currentQ.options || []).map((opt, idx) => {
                    const isSelected = selectedAnswer === idx;
                    return (
                      <motion.button
                        key={idx}
                        onClick={() => submitAnswer(idx)}
                        disabled={selectedAnswer !== null}
                        className={`relative p-5 rounded-2xl border-2 text-left font-bold text-lg transition-all ${
                          isSelected
                            ? 'border-purple-500 bg-purple-500/20 text-white'
                            : 'border-white/20 bg-white/5 text-white hover:bg-white/10 hover:border-white/40'
                        } disabled:cursor-not-allowed`}
                        whileHover={selectedAnswer === null ? { scale: 1.02 } : {}}
                        whileTap={selectedAnswer === null ? { scale: 0.97 } : {}}
                      >
                        <span className="text-slate-400 text-sm mr-2">{String.fromCharCode(65 + idx)}.</span>
                        {opt}
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {phase === 'round_result' && roundAnswers && (
            <motion.div
              key="round_result"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full text-center"
            >
              <p className="text-slate-400 text-sm font-semibold uppercase tracking-widest mb-4">Round Result</p>
              <div className="bg-white/5 border border-white/10 rounded-3xl p-5 mb-5">
                <p className="text-white font-bold text-base">{currentQ.question_text || currentQ.prompt}</p>
                <p className="text-emerald-400 text-sm mt-2">
                  ✅ Correct: {currentQ.options?.[currentQ.correct_index]}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <RoundPlayerCard
                  name={myName}
                  data={roundAnswers[isChallenger ? 'challenger' : 'opponent']}
                  options={currentQ.options}
                  isMe
                />
                <RoundPlayerCard
                  name={oppName}
                  data={roundAnswers[isChallenger ? 'opponent' : 'challenger']}
                  options={currentQ.options}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Exit button */}
      <button
        onClick={onExit}
        className="absolute top-4 right-4 p-2 text-slate-500 hover:text-red-400 transition-colors z-[901]"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

function RoundPlayerCard({ name, data, options, isMe }) {
  const isCorrect = data?.isCorrect;
  const points = data?.points || 0;
  return (
    <motion.div
      className={`rounded-2xl border-2 p-5 ${
        isCorrect ? 'border-emerald-500/60 bg-emerald-500/10' : 'border-red-500/40 bg-red-500/10'
      }`}
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2 }}
    >
      <p className={`text-xs font-semibold mb-1 ${isMe ? 'text-purple-300' : 'text-orange-300'}`}>
        {isMe ? 'You' : 'Opponent'}
      </p>
      <p className="text-white font-black text-base truncate">{name}</p>
      <div className="mt-3">
        {data ? (
          <>
            <p className={`text-2xl font-black ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
              {isCorrect ? '✓ Correct' : '✗ Wrong'}
            </p>
            {data.answerIndex !== null && data.answerIndex !== undefined && options && (
              <p className="text-slate-400 text-xs mt-1">Answered: {options[data.answerIndex]}</p>
            )}
            <p className="text-amber-400 font-bold text-lg mt-2">+{points} pts</p>
            {isCorrect && <p className="text-slate-400 text-xs">{(data.timeTaken / 1000).toFixed(1)}s</p>}
          </>
        ) : (
          <p className="text-slate-500 text-sm mt-2">No answer</p>
        )}
      </div>
    </motion.div>
  );
}

function FinishedScreen({ myName, oppName, myScore, oppScore, amWinner, onExit }) {
  useEffect(() => {
    if (amWinner) BattleSound.victory();
    else BattleSound.defeat();
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[901] bg-gradient-to-br from-slate-950 via-purple-950/40 to-slate-950 flex flex-col items-center justify-center p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {amWinner ? (
        <>
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 2, repeat: 3 }}
            style={{ background: 'radial-gradient(ellipse at center, rgba(251,191,36,0.15) 0%, transparent 70%)' }}
          />
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.3 }}
            className="text-8xl mb-4"
          >🏆</motion.div>
          <motion.h1
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-5xl font-black text-amber-400 mb-2"
          >VICTORY!</motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-slate-300 text-xl mb-8"
          >You defeated {oppName}!</motion.p>
        </>
      ) : (
        <>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="text-7xl mb-4"
          >💀</motion.div>
          <motion.h1
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-4xl font-black text-red-400 mb-2"
          >DEFEATED</motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-slate-400 text-lg mb-8"
          >{oppName} wins this time…</motion.p>
        </>
      )}

      {/* Score display */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="grid grid-cols-2 gap-6 mb-10 w-full max-w-xs"
      >
        <div className={`text-center p-4 rounded-2xl border-2 ${amWinner ? 'border-amber-500/60 bg-amber-500/10' : 'border-white/10 bg-white/5'}`}>
          <p className="text-slate-400 text-xs mb-1">You</p>
          <p className="text-white font-black truncate text-sm mb-1">{myName}</p>
          <p className={`text-3xl font-black ${amWinner ? 'text-amber-400' : 'text-white'}`}>{myScore}</p>
        </div>
        <div className={`text-center p-4 rounded-2xl border-2 ${!amWinner ? 'border-amber-500/60 bg-amber-500/10' : 'border-white/10 bg-white/5'}`}>
          <p className="text-slate-400 text-xs mb-1">Opponent</p>
          <p className="text-white font-black truncate text-sm mb-1">{oppName}</p>
          <p className={`text-3xl font-black ${!amWinner ? 'text-amber-400' : 'text-white'}`}>{oppScore}</p>
        </div>
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        onClick={onExit}
        className="px-10 py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-black text-lg hover:from-purple-400 hover:to-blue-400 transition-all shadow-xl shadow-purple-500/30"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        Back to Battle Hub
      </motion.button>
    </motion.div>
  );
}