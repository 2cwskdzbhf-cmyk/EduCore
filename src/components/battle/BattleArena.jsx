import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { BattleSound } from './BattleSoundEngine';
import { Swords, X, Snowflake, Star, Shield, RefreshCw, Lightbulb, Zap } from 'lucide-react';

const THINKING_SECS = 4;
const ANSWERING_SECS = 12;
const RESULT_SECS = 3;
const MAX_POINTS = 500;
const WIN_COINS = 50;
const LOSE_COINS = 10;

function getPoints(isCorrect, timeMs, maxMs, doubled = false) {
  if (!isCorrect) return 0;
  const speed = Math.max(0, 1 - timeMs / maxMs);
  const base = Math.round(100 + speed * (MAX_POINTS - 100));
  return doubled ? base * 2 : base;
}

function getInventory(progress) {
  try { return JSON.parse(progress?.weak_areas?.[0] || '{}'); } catch { return {}; }
}

function PlayerHeader({ name, score, isMe, frozen, doubleActive, shieldActive, nameColor }) {
  const nameClass = nameColor === 'gold'
    ? 'text-amber-400'
    : nameColor === 'neon'
    ? 'text-cyan-400'
    : 'text-white';

  return (
    <div className={`flex flex-col items-center gap-1 ${isMe ? 'items-start' : 'items-end'}`}>
      <div className="relative">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-2xl font-black shadow-lg overflow-hidden border-2 border-white/20">
          {name?.charAt(0)?.toUpperCase()}
        </div>
        {frozen && (
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/50">
            <Snowflake className="w-3.5 h-3.5 text-white" />
          </div>
        )}
        {doubleActive && (
          <div className="absolute -top-1 -left-1 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/50">
            <Star className="w-3.5 h-3.5 text-white" />
          </div>
        )}
        {shieldActive && (
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/50">
            <Shield className="w-3.5 h-3.5 text-white" />
          </div>
        )}
      </div>
      <p className={`font-black text-sm truncate max-w-[100px] ${nameClass}`}>{isMe ? 'You' : name}</p>
      <motion.p
        key={score}
        className={`text-3xl font-black ${isMe ? 'text-purple-400' : 'text-orange-400'}`}
        initial={{ scale: 1.6, color: '#fff' }}
        animate={{ scale: 1, color: isMe ? '#a78bfa' : '#fb923c' }}
        transition={{ type: 'spring', stiffness: 300 }}
      >{score}</motion.p>
    </div>
  );
}

const COLORS = [
  'from-purple-600/50 border-purple-500/60 hover:border-purple-400/80 hover:bg-purple-500/20',
  'from-blue-600/50 border-blue-500/60 hover:border-blue-400/80 hover:bg-blue-500/20',
  'from-emerald-600/50 border-emerald-500/60 hover:border-emerald-400/80 hover:bg-emerald-500/20',
  'from-amber-600/50 border-amber-500/60 hover:border-amber-400/80 hover:bg-amber-500/20',
];

export default function BattleArena({ session: initialSession, user, onExit }) {
  const [session, setSession] = useState(initialSession);
  const [phase, setPhase] = useState('thinking');
  const [countdown, setCountdown] = useState(THINKING_SECS);
  const [answerCountdown, setAnswerCountdown] = useState(ANSWERING_SECS);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [flash, setFlash] = useState(null); // 'correct' | 'wrong'
  const [roundAnswers, setRoundAnswers] = useState(null);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const [responseTimeMs, setResponseTimeMs] = useState(null);

  // Power-ups state
  const [doubleUsed, setDoubleUsed] = useState(false);
  const [freezeUsed, setFreezeUsed] = useState(false);
  const [shieldUsed, setShieldUsed] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [secondChanceUsed, setSecondChanceUsed] = useState(false);
  const [doubleActive, setDoubleActive] = useState(false);
  const [shieldActive, setShieldActive] = useState(false);
  const [removedOption, setRemovedOption] = useState(null); // index to hide for hint
  const [oppFrozen, setOppFrozen] = useState(false);
  const [secondChanceAvailable, setSecondChanceAvailable] = useState(false);

  const timerRef = useRef(null);
  const answerTimerRef = useRef(null);
  const answeredRef = useRef(false);
  const lastQIndexRef = useRef(-1);

  const isChallenger = user.email === session.challenger_email;
  const myScoreKey = isChallenger ? 'challenger_score' : 'opponent_score';
  const oppScoreKey = isChallenger ? 'opponent_score' : 'challenger_score';
  const myEmail = user.email;
  const oppEmail = isChallenger ? session.opponent_email : session.challenger_email;
  const myName = isChallenger ? session.challenger_name : session.opponent_name;
  const oppName = isChallenger ? session.opponent_name : session.challenger_name;

  const questions = (() => { try { return JSON.parse(session.questions_json || '[]'); } catch { return []; } })();
  const currentQ = questions[session.current_question_index] || null;

  // Load inventory for power-ups available
  const [progressList, setProgressList] = useState([]);
  const [powerUpToast, setPowerUpToast] = useState(null); // { label, emoji }

  useEffect(() => {
    base44.entities.StudentProgress.filter({ student_email: myEmail }).then(p => {
      setProgressList(p);
      console.log('Player inventory:', getInventory(p[0]));
    });
  }, [myEmail]);
  const myProgress = progressList[0];
  const inv = getInventory(myProgress);

  const hasPowerUp = (id) => (inv[id] || 0) > 0;

  const showToast = (emoji, label) => {
    setPowerUpToast({ emoji, label });
    setTimeout(() => setPowerUpToast(null), 2000);
  };

  // Real-time subscription
  useEffect(() => {
    const unsub = base44.entities.BattleSession.subscribe(event => {
      if (event.id !== session.id) return;
      if (event.type === 'update' && event.data) {
        const newS = event.data;
        setSession(newS);
        const powerUps = (() => { try { return JSON.parse(newS.power_ups_json || '{}'); } catch { return {}; } })();
        const oppKey = isChallenger ? 'opponent' : 'challenger';
        if (powerUps[oppKey]?.frozeAt === newS.current_question_index) {
          setOppFrozen(true);
          setTimeout(() => setOppFrozen(false), 2500);
        }
      }
    });
    return () => unsub();
  }, [session.id]);

  // Phase transitions
  useEffect(() => {
    const s = session;
    if (s.status === 'finished') { setPhase('finished'); return; }
    if (s.status === 'round_result') {
      setPhase('round_result');
      const ans = (() => { try { return JSON.parse(s.answers_json || '[]'); } catch { return []; } })();
      setRoundAnswers(ans[s.current_question_index] || null);
      clearInterval(timerRef.current);
      clearInterval(answerTimerRef.current);
      if (isChallenger) setTimeout(() => advanceQuestion(s), RESULT_SECS * 1000);
      return;
    }
    if (s.status === 'question') {
      if (s.current_question_index !== lastQIndexRef.current) {
        lastQIndexRef.current = s.current_question_index;
        answeredRef.current = false;
        setSelectedAnswer(null);
        setFlash(null);
        setRoundAnswers(null);
        setDoubleActive(false);
        setShieldActive(false);
        setRemovedOption(null);
        setSecondChanceAvailable(false);
        setResponseTimeMs(null);
        setPhase('thinking');
        setCountdown(THINKING_SECS);
        setAnswerCountdown(ANSWERING_SECS);
        setQuestionStartTime(null);
      }
    }
  }, [session.status, session.current_question_index]);

  // Thinking countdown
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
        let a = ANSWERING_SECS;
        setAnswerCountdown(a);
        answerTimerRef.current = setInterval(() => {
          a--;
          setAnswerCountdown(a);
          if (a <= 0) {
            clearInterval(answerTimerRef.current);
            if (!answeredRef.current) submitAnswer(null);
          }
        }, 1000);
      }
    }, 1000);
    return () => { clearInterval(timerRef.current); clearInterval(answerTimerRef.current); };
  }, [phase === 'thinking' && session.current_question_index]);

  const submitAnswer = useCallback(async (answerIndex, isSecondChance = false) => {
    if (answeredRef.current && !isSecondChance) return;
    answeredRef.current = true;
    clearInterval(timerRef.current);
    clearInterval(answerTimerRef.current);

    const q = questions[session.current_question_index];
    if (!q) return;

    const isCorrect = answerIndex !== null && answerIndex === q.correct_index;
    const timeTaken = questionStartTime ? Date.now() - questionStartTime : ANSWERING_SECS * 1000;
    const points = getPoints(isCorrect, timeTaken, ANSWERING_SECS * 1000, doubleActive);
    const timeSeconds = (timeTaken / 1000).toFixed(1);

    setSelectedAnswer(answerIndex);
    setResponseTimeMs(timeTaken);
    setFlash(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) BattleSound.correct(); else BattleSound.wrong();
    setTimeout(() => setFlash(null), 600);

    // Second chance: if wrong and available, allow retry
    if (!isCorrect && secondChanceAvailable && !isSecondChance) {
      setSecondChanceAvailable(false);
      setSelectedAnswer(null);
      answeredRef.current = false;
      setFlash(null);
      // restart answer timer briefly
      let a = 6;
      setAnswerCountdown(a);
      answerTimerRef.current = setInterval(() => {
        a--;
        setAnswerCountdown(a);
        if (a <= 0) {
          clearInterval(answerTimerRef.current);
          if (!answeredRef.current) submitAnswer(null, true);
        }
      }, 1000);
      return;
    }

    const freshSessions = await base44.entities.BattleSession.filter({ id: session.id });
    const s = freshSessions[0];
    const existingAnswers = (() => { try { return JSON.parse(s.answers_json || '[]'); } catch { return []; } })();
    const qIdx = s.current_question_index;
    if (!existingAnswers[qIdx]) existingAnswers[qIdx] = {};
    const answerKey = isChallenger ? 'challenger' : 'opponent';
    existingAnswers[qIdx][answerKey] = { answerIndex, isCorrect, timeTaken, points, doubled: doubleActive, timeDisplay: timeSeconds };

    const newChallengerScore = isChallenger ? (s.challenger_score || 0) + points : (s.challenger_score || 0);
    const newOpponentScore = !isChallenger ? (s.opponent_score || 0) + points : (s.opponent_score || 0);
    const bothAnswered = existingAnswers[qIdx].challenger && existingAnswers[qIdx].opponent;

    await base44.entities.BattleSession.update(session.id, {
      answers_json: JSON.stringify(existingAnswers),
      challenger_score: newChallengerScore,
      opponent_score: newOpponentScore,
      ...(bothAnswered ? { status: 'round_result' } : {})
    });

    if (!bothAnswered) setPhase('waiting_opponent');
  }, [session, questions, isChallenger, questionStartTime, doubleActive, secondChanceAvailable]);

  const consumePowerUp = async (id) => {
    if (!myProgress) return;
    const freshProgress = await base44.entities.StudentProgress.filter({ student_email: myEmail });
    const p = freshProgress[0];
    if (!p) return;
    const currentInv = getInventory(p);
    if ((currentInv[id] || 0) > 0) {
      currentInv[id]--;
      await base44.entities.StudentProgress.update(p.id, { weak_areas: [JSON.stringify(currentInv)] });
    }
  };

  const useDoublePoints = () => {
    if (doubleUsed || phase !== 'answering') return;
    setDoubleUsed(true);
    setDoubleActive(true);
    consumePowerUp('double_points');
    showToast('⭐', '2x Points Active!');
  };

  const useFreezeOpponent = async () => {
    if (freezeUsed || phase !== 'answering') return;
    setFreezeUsed(true);
    consumePowerUp('freeze_opp');
    showToast('🧊', 'Opponent Frozen!');
    const freshSessions = await base44.entities.BattleSession.filter({ id: session.id });
    const s = freshSessions[0];
    const powerUps = (() => { try { return JSON.parse(s.power_ups_json || '{}'); } catch { return {}; } })();
    const myKey = isChallenger ? 'challenger' : 'opponent';
    powerUps[myKey] = { frozeAt: s.current_question_index };
    await base44.entities.BattleSession.update(session.id, { power_ups_json: JSON.stringify(powerUps) });
  };

  const useRevealHint = () => {
    if (hintUsed || phase !== 'answering' || !currentQ) return;
    setHintUsed(true);
    consumePowerUp('reveal_hint');
    showToast('💡', 'Wrong Answer Removed!');
    const wrongIndices = (currentQ.options || [])
      .map((_, i) => i)
      .filter(i => i !== currentQ.correct_index && i !== selectedAnswer);
    if (wrongIndices.length > 0) {
      setRemovedOption(wrongIndices[Math.floor(Math.random() * wrongIndices.length)]);
    }
  };

  const useSecondChance = () => {
    if (secondChanceUsed || phase !== 'answering') return;
    setSecondChanceUsed(true);
    setSecondChanceAvailable(true);
    consumePowerUp('second_chance');
    showToast('🔄', '2nd Chance Ready!');
  };

  const useShield = () => {
    if (shieldUsed || phase !== 'answering') return;
    setShieldUsed(true);
    setShieldActive(true);
    consumePowerUp('shield');
    showToast('🛡️', 'Shield Activated!');
  };

  const advanceQuestion = async (s) => {
    const nextIdx = (s.current_question_index || 0) + 1;
    const qs = (() => { try { return JSON.parse(s.questions_json || '[]'); } catch { return []; } })();
    if (nextIdx >= qs.length) {
      const winnerEmail = s.challenger_score >= s.opponent_score ? s.challenger_email : s.opponent_email;
      const loserEmail = winnerEmail === s.challenger_email ? s.opponent_email : s.challenger_email;
      const winnerName = winnerEmail === s.challenger_email ? s.challenger_name : s.opponent_name;
      const loserName = loserEmail === s.challenger_email ? s.challenger_name : s.opponent_name;
      await base44.entities.BattleSession.update(session.id, { status: 'finished', winner_email: winnerEmail });
      await base44.entities.BattleWin.create({
        class_id: s.class_id, winner_email: winnerEmail, winner_name: winnerName,
        loser_email: loserEmail, loser_name: loserName,
        winner_score: Math.max(s.challenger_score, s.opponent_score),
        loser_score: Math.min(s.challenger_score, s.opponent_score),
        battle_session_id: session.id
      });
      const [winnerProgress, loserProgress] = await Promise.all([
        base44.entities.StudentProgress.filter({ student_email: winnerEmail }),
        base44.entities.StudentProgress.filter({ student_email: loserEmail }),
      ]);
      if (winnerProgress[0]) await base44.entities.StudentProgress.update(winnerProgress[0].id, { battle_coins: (winnerProgress[0].battle_coins || 0) + WIN_COINS });
      if (loserProgress[0]) await base44.entities.StudentProgress.update(loserProgress[0].id, { battle_coins: (loserProgress[0].battle_coins || 0) + LOSE_COINS });
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
  const answerBarPct = Math.max(0, (answerCountdown / ANSWERING_SECS) * 100);
  const isUrgent = answerCountdown <= 3;

  if (phase === 'finished' || session.status === 'finished') {
    return <FinishedScreen myName={myName} oppName={oppName} myScore={myScore} oppScore={oppScore} amWinner={amWinner} onExit={onExit} />;
  }

  if (!currentQ) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center z-[900]">
        <div className="text-white text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xl font-bold">Loading battle...</p>
        </div>
      </div>
    );
  }

  const visibleOptions = (currentQ.options || []).map((opt, i) => ({
    opt, i, hidden: i === removedOption
  }));

  return (
    <div className="fixed inset-0 z-[900] bg-gradient-to-br from-slate-950 via-red-950/20 to-slate-950 flex flex-col overflow-hidden select-none">
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

      {/* Power-up toast */}
      <AnimatePresence>
        {powerUpToast && (
          <motion.div
            className="absolute top-24 left-1/2 -translate-x-1/2 z-[902] flex items-center gap-2 bg-slate-900/95 border border-white/20 rounded-2xl px-5 py-3 shadow-2xl"
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <span className="text-2xl">{powerUpToast.emoji}</span>
            <span className="text-white font-black text-sm">{powerUpToast.label}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Frozen overlay */}
      <AnimatePresence>
        {oppFrozen && (
          <motion.div
            className="absolute inset-0 z-40 bg-blue-950/60 backdrop-blur-sm pointer-events-none flex flex-col items-center justify-center gap-3"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <span className="text-7xl">🥶</span>
            <p className="text-blue-300 font-black text-2xl">FROZEN!</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-safe pt-4 pb-3 bg-slate-950/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <PlayerHeader name={myName} score={myScore} isMe doubleActive={doubleActive} shieldActive={shieldActive} />
          <div className="flex flex-col items-center gap-1 px-2">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/40">
              <Swords className="w-6 h-6 text-white" />
            </div>
            <p className="text-xs text-slate-400 font-bold">{session.current_question_index + 1} / {questions.length}</p>
            {phase === 'answering' && (
              <p className={`text-sm font-black tabular-nums ${isUrgent ? 'text-red-400' : 'text-white'}`}>{answerCountdown}s</p>
            )}
          </div>
          <PlayerHeader name={oppName} score={oppScore} isMe={false} frozen={oppFrozen} />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-4 max-w-2xl mx-auto w-full overflow-hidden">
        <AnimatePresence mode="wait">

          {/* THINKING phase */}
          {phase === 'thinking' && (
            <motion.div
              key="thinking"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="w-full text-center"
            >
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">
                Question {session.current_question_index + 1} of {questions.length}
              </p>
              <div className="bg-white/[0.07] border border-white/15 rounded-3xl p-8 mb-8 shadow-2xl">
                <p className="text-3xl md:text-4xl font-black text-white leading-snug">{currentQ.question_text || currentQ.prompt}</p>
              </div>
              <motion.div
                className="w-28 h-28 mx-auto rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-2xl shadow-red-500/50 border-4 border-red-400/30"
                animate={{ scale: [1, 1.12, 1] }}
                transition={{ duration: 0.7, repeat: Infinity }}
              >
                <span className="text-6xl font-black text-white">{countdown}</span>
              </motion.div>
            </motion.div>
          )}

          {/* ANSWERING / WAITING phase */}
          {(phase === 'answering' || phase === 'waiting_opponent') && (
            <motion.div
              key="answering"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -30, opacity: 0 }}
              className="w-full"
            >
              {/* Question */}
              <div className="bg-white/[0.07] border border-white/15 rounded-3xl p-6 mb-4 shadow-xl">
                <p className="text-2xl md:text-3xl font-black text-white leading-snug text-center">{currentQ.question_text || currentQ.prompt}</p>
              </div>

              {/* Timer bar */}
              <div className="relative h-3 rounded-full bg-white/10 mb-2 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full transition-colors ${isUrgent ? 'bg-red-500' : 'bg-gradient-to-r from-purple-500 to-blue-500'}`}
                  style={{ width: `${answerBarPct}%` }}
                  transition={{ duration: 0.5 }}
                />
                {isUrgent && (
                  <motion.div
                    className="absolute inset-0 bg-red-500/30 rounded-full"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.4, repeat: Infinity }}
                  />
                )}
              </div>

              {/* Response time */}
              {responseTimeMs && (
                <p className="text-center text-xs text-slate-500 mb-3">
                  ⚡ {(responseTimeMs / 1000).toFixed(1)}s response time
                </p>
              )}

              {phase === 'waiting_opponent' ? (
                <div className="text-center py-8">
                  <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-orange-400 font-bold">Waiting for opponent…</p>
                  {responseTimeMs && (
                    <p className="text-slate-500 text-sm mt-1">Your time: {(responseTimeMs / 1000).toFixed(1)}s</p>
                  )}
                </div>
              ) : (
                <>
                  {/* Answer grid */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {visibleOptions.map(({ opt, i, hidden }) => {
                      if (hidden) return (
                        <div key={i} className="h-20 rounded-2xl border-2 border-white/5 bg-white/[0.02] opacity-30 flex items-center justify-center">
                          <p className="text-slate-600 text-xs font-bold">Removed ✦</p>
                        </div>
                      );
                      const isSelected = selectedAnswer === i;
                      return (
                        <motion.button
                          key={i}
                          onClick={() => submitAnswer(i)}
                          disabled={selectedAnswer !== null}
                          className={`relative p-5 rounded-2xl border-2 text-left font-bold transition-all min-h-[80px] flex flex-col justify-between ${
                            isSelected
                              ? 'border-purple-400 bg-purple-500/30 text-white scale-[0.98]'
                              : `bg-gradient-to-br ${COLORS[i]} bg-opacity-30 text-white`
                          } disabled:cursor-not-allowed`}
                          whileHover={selectedAnswer === null ? { scale: 1.03 } : {}}
                          whileTap={selectedAnswer === null ? { scale: 0.96 } : {}}
                        >
                          <span className="text-white/50 text-xs font-black">{String.fromCharCode(65 + i)}</span>
                          <span className="text-base md:text-lg font-black leading-tight">{opt}</span>
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Power-ups row — always show all 5 */}
                  <div className="flex gap-2 justify-center flex-wrap mt-1">
                    <PowerUpButton
                      emoji="⭐" label="2x Pts"
                      active={doubleActive} used={doubleUsed}
                      count={inv['double_points'] ?? 1}
                      onClick={useDoublePoints}
                    />
                    <PowerUpButton
                      emoji="🧊" label="Freeze"
                      used={freezeUsed}
                      count={inv['freeze_opp'] ?? 1}
                      onClick={useFreezeOpponent}
                    />
                    <PowerUpButton
                      emoji="💡" label="Hint"
                      used={hintUsed}
                      count={inv['reveal_hint'] ?? 0}
                      onClick={useRevealHint}
                    />
                    <PowerUpButton
                      emoji="🔄" label="2nd Try"
                      used={secondChanceUsed}
                      count={inv['second_chance'] ?? 0}
                      onClick={useSecondChance}
                    />
                    <PowerUpButton
                      emoji="🛡️" label="Shield"
                      active={shieldActive} used={shieldUsed}
                      count={inv['shield'] ?? 0}
                      onClick={useShield}
                    />
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* ROUND RESULT phase */}
          {phase === 'round_result' && roundAnswers && (
            <motion.div
              key="round_result"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="w-full text-center"
            >
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">
                Round {session.current_question_index + 1} Result
              </p>
              <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-5 mb-4">
                <p className="text-white font-bold text-base leading-snug">{currentQ.question_text || currentQ.prompt}</p>
                <p className="text-emerald-400 text-sm mt-2 font-semibold">
                  ✅ Correct: {currentQ.options?.[currentQ.correct_index]}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <RoundPlayerCard name={myName} data={roundAnswers[isChallenger ? 'challenger' : 'opponent']} options={currentQ.options} isMe />
                <RoundPlayerCard name={oppName} data={roundAnswers[isChallenger ? 'opponent' : 'challenger']} options={currentQ.options} />
              </div>
              {/* Speed comparison */}
              {roundAnswers.challenger?.timeTaken && roundAnswers.opponent?.timeTaken && (
                <div className="mt-3 text-xs text-slate-500">
                  {(() => {
                    const myData = roundAnswers[isChallenger ? 'challenger' : 'opponent'];
                    const oppData = roundAnswers[isChallenger ? 'opponent' : 'challenger'];
                    if (!myData || !oppData) return null;
                    const diff = Math.abs(myData.timeTaken - oppData.timeTaken);
                    const faster = myData.timeTaken < oppData.timeTaken ? 'You were' : `${oppName} was`;
                    return <p>⚡ {faster} {(diff / 1000).toFixed(1)}s faster</p>;
                  })()}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <button onClick={onExit} className="absolute top-4 right-4 p-2 text-slate-600 hover:text-red-400 transition-colors z-[901]">
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

function PowerUpButton({ emoji, label, active, used, count = 0, onClick }) {
  const isAvailable = count > 0 && !used;
  return (
    <button
      onClick={isAvailable ? onClick : undefined}
      disabled={!isAvailable}
      title={count === 0 ? 'Buy from Item Shop' : label}
      className={`relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all min-w-[56px] ${
        active
          ? 'bg-amber-500/30 border-amber-400/60 text-amber-300 shadow-lg shadow-amber-500/30 scale-105'
          : used
          ? 'bg-white/5 border-white/10 text-slate-600 cursor-not-allowed opacity-50'
          : count === 0
          ? 'bg-white/5 border-white/10 text-slate-600 cursor-not-allowed opacity-40'
          : 'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:scale-105 cursor-pointer'
      }`}
    >
      <span className="text-lg leading-none">{emoji}</span>
      <span className="text-[10px] leading-none">{used ? 'Used' : label}</span>
      {!used && (
        <span className={`text-[9px] leading-none ${count > 0 ? 'text-amber-400' : 'text-slate-600'}`}>
          {count > 0 ? `×${count}` : '×0'}
        </span>
      )}
    </button>
  );
}

function RoundPlayerCard({ name, data, options, isMe }) {
  const isCorrect = data?.isCorrect;
  const points = data?.points || 0;
  return (
    <motion.div
      className={`rounded-2xl border-2 p-4 ${isCorrect ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-red-500/30 bg-red-500/10'}`}
      initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}
    >
      <p className={`text-xs font-bold mb-1 ${isMe ? 'text-purple-300' : 'text-orange-300'}`}>{isMe ? 'You' : 'Opponent'}</p>
      <p className="text-white font-black text-sm truncate mb-2">{name}</p>
      {data ? (
        <>
          <p className={`text-xl font-black ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
            {isCorrect ? '✓ Correct' : '✗ Wrong'}
          </p>
          <p className="text-amber-400 font-bold text-base mt-1">
            +{points} {data.doubled ? <span className="text-xs text-amber-300">2x!</span> : ''}
          </p>
          {data.timeTaken && (
            <p className="text-slate-400 text-xs mt-1">⚡ {(data.timeTaken / 1000).toFixed(1)}s</p>
          )}
          {!isCorrect && data.answerIndex !== null && data.answerIndex !== undefined && options && (
            <p className="text-slate-500 text-xs mt-1 truncate">Said: {options[data.answerIndex]}</p>
          )}
        </>
      ) : (
        <p className="text-slate-500 text-sm mt-2">No answer ⏱</p>
      )}
    </motion.div>
  );
}

function FinishedScreen({ myName, oppName, myScore, oppScore, amWinner, onExit }) {
  useEffect(() => {
    if (amWinner) BattleSound.victory(); else BattleSound.defeat();
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[901] bg-gradient-to-br from-slate-950 via-purple-950/40 to-slate-950 flex flex-col items-center justify-center p-6 overflow-hidden"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    >
      {amWinner && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ opacity: [0, 0.3, 0] }}
          transition={{ duration: 2, repeat: 4 }}
          style={{ background: 'radial-gradient(ellipse at center, rgba(251,191,36,0.25) 0%, transparent 70%)' }}
        />
      )}

      {amWinner ? (
        <>
          <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, delay: 0.2 }} className="text-8xl mb-2">🏆</motion.div>
          <motion.h1 initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="text-5xl font-black text-amber-400 mb-1">VICTORY!</motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="text-slate-300 text-lg mb-2">You defeated {oppName}!</motion.p>
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.8 }}
            className="flex items-center gap-2 bg-amber-500/20 border border-amber-500/40 rounded-2xl px-5 py-2.5 mb-6">
            <span className="text-2xl">🪙</span>
            <span className="text-amber-400 font-black text-xl">+{WIN_COINS} coins earned!</span>
          </motion.div>
        </>
      ) : (
        <>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }} className="text-7xl mb-2">💀</motion.div>
          <motion.h1 initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="text-4xl font-black text-red-400 mb-1">DEFEATED</motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="text-slate-400 text-base mb-2">{oppName} wins this time…</motion.p>
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.8 }}
            className="flex items-center gap-2 bg-slate-500/20 border border-slate-500/40 rounded-2xl px-5 py-2.5 mb-6">
            <span className="text-2xl">🪙</span>
            <span className="text-slate-300 font-black text-xl">+{LOSE_COINS} coins for playing!</span>
          </motion.div>
        </>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}
        className="grid grid-cols-2 gap-4 mb-8 w-full max-w-xs"
      >
        <div className={`text-center p-4 rounded-2xl border-2 ${amWinner ? 'border-amber-500/50 bg-amber-500/10' : 'border-white/10 bg-white/5'}`}>
          <p className="text-slate-400 text-xs mb-1">You</p>
          <p className="text-white font-black truncate text-sm mb-1">{myName}</p>
          <p className={`text-3xl font-black ${amWinner ? 'text-amber-400' : 'text-white'}`}>{myScore}</p>
        </div>
        <div className={`text-center p-4 rounded-2xl border-2 ${!amWinner ? 'border-amber-500/50 bg-amber-500/10' : 'border-white/10 bg-white/5'}`}>
          <p className="text-slate-400 text-xs mb-1">Opponent</p>
          <p className="text-white font-black truncate text-sm mb-1">{oppName}</p>
          <p className={`text-3xl font-black ${!amWinner ? 'text-amber-400' : 'text-white'}`}>{oppScore}</p>
        </div>
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
        onClick={onExit}
        className="px-10 py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-black text-lg hover:from-purple-400 hover:to-blue-400 transition-all shadow-xl shadow-purple-500/30"
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
      >
        Back to Battle Hub
      </motion.button>
    </motion.div>
  );
}