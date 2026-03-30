import React, { useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import GlassCard from '@/components/ui/GlassCard';
import { Loader2, Clock, CheckCircle2, Zap, XCircle, Trophy, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function playSound(correct) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (correct) {
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } else {
      osc.frequency.value = 220;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    }
  } catch {}
}

export default function StudentLiveQuizPlay() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('sessionId');
  const queryClient = useQueryClient();

  const [user, setUser] = useState(null);
  const [selected, setSelected] = useState(null);        // index chosen
  const [textAnswer, setTextAnswer] = useState('');
  const [answerResult, setAnswerResult] = useState(null); // { isCorrect, pointsAwarded, correctIndex }
  const [timeLeft, setTimeLeft] = useState(15);
  const [submitting, setSubmitting] = useState(false);

  // Track which question index we've already submitted for (prevents re-submit on re-render)
  const answeredForIndexRef = useRef(-1);
  // Track last question_started_at so we only reset state when it actually changes
  const lastStartedAtRef = useRef(null);

  useEffect(() => { base44.auth.me().then(setUser); }, []);

  const { data: session } = useQuery({
    queryKey: ['liveSession', sessionId],
    queryFn: async () => {
      const s = await base44.entities.LiveQuizSession.filter({ id: sessionId });
      return s?.[0] || null;
    },
    enabled: !!sessionId,
    refetchInterval: 1000,
    staleTime: 500,
  });

  const { data: player } = useQuery({
    queryKey: ['myPlayer', sessionId, user?.email],
    queryFn: async () => {
      const p = await base44.entities.LiveQuizPlayer.filter({ session_id: sessionId, student_email: user.email });
      return p?.[0] || null;
    },
    enabled: !!sessionId && !!user?.email,
    refetchInterval: 2000,
  });

  const { data: allPlayers = [] } = useQuery({
    queryKey: ['allPlayers', sessionId],
    queryFn: async () => {
      const p = await base44.entities.LiveQuizPlayer.filter({ session_id: sessionId });
      return p.sort((a, b) => (b.total_points || 0) - (a.total_points || 0));
    },
    enabled: !!sessionId && session?.status === 'intermission',
    refetchInterval: session?.status === 'intermission' ? 1500 : false,
  });

  const idx = session?.current_question_index ?? -1;

  // Build questions list from session cache
  const questions = useMemo(() => {
    const raw = session?.questions || session?.quiz_questions || [];
    if (Array.isArray(raw)) return raw;
    try { return JSON.parse(raw); } catch { return []; }
  }, [session?.questions, session?.quiz_questions]);

  const currentQuestion = session?.current_question || (idx >= 0 ? questions[idx] : null);

  // Reset answer state whenever a new question starts (question_started_at changes)
  useEffect(() => {
    const startedAt = session?.question_started_at;
    if (!startedAt || startedAt === lastStartedAtRef.current) return;
    lastStartedAtRef.current = startedAt;
    setSelected(null);
    setTextAnswer('');
    setAnswerResult(null);
    setSubmitting(false);
  }, [session?.question_started_at]);

  // Countdown timer
  useEffect(() => {
    if (!session?.question_started_at || session?.status !== 'live') return;
    const start = new Date(session.question_started_at).getTime();
    const interval = setInterval(() => {
      setTimeLeft(Math.max(0, 15 - Math.floor((Date.now() - start) / 1000)));
    }, 200);
    return () => clearInterval(interval);
  }, [session?.question_started_at, session?.status]);

  const options = useMemo(() => {
    const q = currentQuestion;
    if (!q) return [];
    if (Array.isArray(q.options) && q.options.length) return q.options;
    if (Array.isArray(q.choices) && q.choices.length) return q.choices;
    if (Array.isArray(q.answers) && q.answers.length) return q.answers;
    return [q.option_a, q.option_b, q.option_c, q.option_d].filter(Boolean);
  }, [currentQuestion]);

  const isTextType = ['short_answer', 'written'].includes(currentQuestion?.question_type);

  async function handleSubmitAnswer(optionIndexOrText) {
    if (!player || !session || !currentQuestion || submitting) return;
    if (answeredForIndexRef.current === idx) return; // already answered this Q
    setSubmitting(true);
    answeredForIndexRef.current = idx;

    const startedAt = session.question_started_at ? new Date(session.question_started_at).getTime() : Date.now();
    const responseTimeMs = Date.now() - startedAt;

    const isText = typeof optionIndexOrText === 'string';
    const optionIndex = isText ? -1 : optionIndexOrText;
    const submittedText = isText ? optionIndexOrText : null;

    // Evaluate locally
    const q = currentQuestion;
    let isCorrect = false;
    let correctIndex = q.correct_index ?? 0;

    if (q.question_type === 'written') {
      const kws = Array.isArray(q.answer_keywords) ? q.answer_keywords : [];
      const submitted = String(submittedText || '').toLowerCase();
      isCorrect = kws.length > 0 && kws.every(kw => submitted.includes(kw.toLowerCase().trim()));
    } else if (q.question_type === 'short_answer') {
      isCorrect = String(q.correct_answer || '').toLowerCase().trim() === String(submittedText || '').toLowerCase().trim();
    } else {
      isCorrect = optionIndex === correctIndex;
    }

    const basePoints = 500;
    const timeBonus = Math.floor((Math.max(0, 15000 - responseTimeMs) / 15000) * 500);
    const pointsAwarded = isCorrect ? basePoints + timeBonus : 0;

    try {
      // Save answer record
      await base44.entities.LiveQuizAnswer.create({
        session_id: sessionId,
        player_id: player.id,
        question_id: q.id ?? null,
        question_index: idx,
        selected_option: isText ? submittedText : optionIndex,
        selected_option_index: isText ? -1 : optionIndex,
        is_correct: isCorrect,
        points_awarded: pointsAwarded,
        response_time_ms: responseTimeMs,
        answered_at: new Date().toISOString(),
      });

      // Update player stats
      await base44.entities.LiveQuizPlayer.update(player.id, {
        total_points: (player.total_points || 0) + pointsAwarded,
        correct_count: (player.correct_count || 0) + (isCorrect ? 1 : 0),
        questions_answered: (player.questions_answered || 0) + 1,
      });

      queryClient.invalidateQueries(['myPlayer', sessionId]);
    } catch (e) {
      console.error('Failed to submit answer', e);
    }

    setAnswerResult({ isCorrect, pointsAwarded, correctIndex });
    playSound(isCorrect);
    setSubmitting(false);
  }

  // ── STATES ──────────────────────────────────────────────────────────────────

  if (!session || !player) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-purple-400" />
      </div>
    );
  }

  // Ended
  if (session.status === 'ended') {
    const myRank = allPlayers.findIndex(p => p.id === player.id) + 1;
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center p-6">
        <GlassCard className="p-10 text-center max-w-lg w-full">
          <Trophy className="w-16 h-16 text-amber-400 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-white mb-2">Quiz Finished!</h2>
          <p className="text-2xl text-amber-400 font-bold mb-6">{player.total_points || 0} pts</p>
          {myRank > 0 && <p className="text-slate-300 mb-6">You finished #{myRank}</p>}
        </GlassCard>
      </div>
    );
  }

  // Lobby / waiting for quiz to start
  if (session.status === 'lobby' || idx < 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center p-6">
        <GlassCard className="p-10 text-center max-w-md w-full">
          <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
            <Zap className="w-14 h-14 text-amber-400 mx-auto mb-4" />
          </motion.div>
          <h2 className="text-2xl font-bold text-white mb-2">You're in! 🎉</h2>
          <p className="text-slate-300 mb-4">Waiting for the teacher to start the quiz…</p>
          <p className="text-xl font-bold text-purple-400">{player.nickname}</p>
        </GlassCard>
      </div>
    );
  }

  // Intermission / leaderboard
  if (session.status === 'intermission') {
    const myRank = allPlayers.findIndex(p => p.id === player.id) + 1;
    const medals = ['🥇', '🥈', '🥉'];
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center p-6">
        <div className="max-w-lg w-full space-y-4">
          {/* My result card */}
          <GlassCard className="p-8 text-center">
            {answerResult ? (
              <>
                {answerResult.isCorrect ? (
                  <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-3" />
                ) : (
                  <XCircle className="w-16 h-16 text-red-400 mx-auto mb-3" />
                )}
                <h3 className={`text-2xl font-bold mb-1 ${answerResult.isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                  {answerResult.isCorrect ? 'Correct!' : 'Incorrect'}
                </h3>
                {answerResult.isCorrect && (
                  <p className="text-xl text-white mb-2">+{answerResult.pointsAwarded} pts</p>
                )}
              </>
            ) : (
              <>
                <Trophy className="w-14 h-14 text-amber-400 mx-auto mb-3" />
                <h3 className="text-2xl font-bold text-white mb-1">Leaderboard</h3>
              </>
            )}
            <p className="text-slate-300">Total: <span className="font-bold text-white">{player.total_points || 0} pts</span></p>
            {myRank > 0 && <p className="text-slate-400 text-sm mt-1">Rank #{myRank}</p>}
            <p className="text-xs text-slate-500 mt-3 animate-pulse">Waiting for next question…</p>
          </GlassCard>

          {/* Leaderboard */}
          <GlassCard className="p-6">
            <h4 className="text-white font-bold mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" /> Live Standings
            </h4>
            <div className="space-y-2">
              {allPlayers.slice(0, 5).map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.08 }}
                  className={`flex items-center justify-between p-3 rounded-xl ${
                    p.id === player.id ? 'bg-purple-500/30 border border-purple-500/50' : 'bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{medals[i] || `#${i + 1}`}</span>
                    <span className="text-white font-medium">{p.nickname}</span>
                  </div>
                  <span className="text-amber-400 font-bold">{p.total_points || 0}</span>
                </motion.div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  // Live question screen
  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-purple-400" />
      </div>
    );
  }

  const prompt = currentQuestion.prompt || currentQuestion.question || currentQuestion.question_text || currentQuestion.text || 'Question';
  const totalQuestions = questions.length;
  const progressPct = totalQuestions > 0 ? ((idx + 1) / totalQuestions) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 text-white">
          <div>
            <p className="font-bold text-lg">{player.nickname}</p>
            <p className="text-amber-400 text-sm font-semibold">{player.total_points || 0} pts</p>
          </div>
          <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl">
            <Clock className="w-5 h-5 text-amber-400" />
            <span className={`text-3xl font-bold tabular-nums ${timeLeft <= 5 ? 'text-red-400' : 'text-white'}`}>{timeLeft}</span>
          </div>
        </div>

        {/* Progress */}
        {totalQuestions > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Q{idx + 1} of {totalQuestions}</span>
              <span>{Math.round(progressPct)}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>
        )}

        {/* Question */}
        <GlassCard className="p-6 mb-4 text-center">
          <p className="text-sm text-slate-400 mb-2 uppercase tracking-wider">Question {idx + 1}</p>
          <h2 className="text-2xl md:text-3xl font-bold text-white leading-snug">{prompt}</h2>
        </GlassCard>

        {/* Answer area */}
        <AnimatePresence mode="wait">
          {answerResult ? (
            // Answered — show result inline above options
            <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <GlassCard className={`p-5 mb-4 text-center border-2 ${answerResult.isCorrect ? 'border-emerald-500/50' : 'border-red-500/50'}`}>
                {answerResult.isCorrect ? (
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                ) : (
                  <XCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
                )}
                <p className={`text-xl font-bold ${answerResult.isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                  {answerResult.isCorrect ? `Correct! +${answerResult.pointsAwarded} pts` : 'Incorrect'}
                </p>
                <p className="text-xs text-slate-500 mt-2 animate-pulse">Waiting for leaderboard…</p>
              </GlassCard>

              {/* Show options with colour-coded feedback */}
              {!isTextType && options.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {options.map((opt, i) => {
                    const isChosen = selected === i;
                    const isCorrectOpt = answerResult.correctIndex === i;
                    return (
                      <div
                        key={i}
                        className={`rounded-xl p-4 text-center font-semibold border-2 transition-all text-white ${
                          isCorrectOpt ? 'bg-emerald-500/30 border-emerald-400' :
                          isChosen && !isCorrectOpt ? 'bg-red-500/30 border-red-400' :
                          'bg-white/5 border-white/10 opacity-50'
                        }`}
                      >
                        {opt}
                        {isCorrectOpt && <CheckCircle2 className="inline ml-2 w-4 h-4 text-emerald-400" />}
                        {isChosen && !isCorrectOpt && <XCircle className="inline ml-2 w-4 h-4 text-red-400" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          ) : isTextType ? (
            <motion.div key="text" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <GlassCard className="p-5">
                {currentQuestion.question_type === 'written' ? (
                  <Textarea
                    value={textAnswer}
                    onChange={e => setTextAnswer(e.target.value)}
                    placeholder="Write your answer…"
                    className="bg-white/5 border-white/10 text-white mb-3"
                    rows={4}
                  />
                ) : (
                  <Input
                    value={textAnswer}
                    onChange={e => setTextAnswer(e.target.value)}
                    placeholder="Type your answer…"
                    className="bg-white/5 border-white/10 text-white mb-3 h-12 text-lg"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && textAnswer.trim()) {
                        handleSubmitAnswer(textAnswer.trim());
                      }
                    }}
                  />
                )}
                <Button
                  onClick={() => handleSubmitAnswer(textAnswer.trim())}
                  disabled={!textAnswer.trim() || submitting}
                  className="w-full bg-gradient-to-r from-purple-500 to-blue-500 h-12 text-lg"
                >
                  <Send className="w-4 h-4 mr-2" /> Submit
                </Button>
              </GlassCard>
            </motion.div>
          ) : (
            <motion.div key="options" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {options.map((opt, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    disabled={selected !== null || submitting}
                    onClick={() => {
                      setSelected(i);
                      handleSubmitAnswer(i);
                    }}
                    className={`rounded-xl p-5 text-center font-semibold text-white text-lg border-2 transition-all
                      ${selected === i
                        ? 'bg-purple-500/40 border-purple-400 scale-95'
                        : 'bg-white/5 border-white/10 hover:bg-white/15 hover:border-white/30 hover:scale-[1.02]'
                      } disabled:cursor-not-allowed`}
                  >
                    <span className="mr-2 text-slate-400 text-sm">{String.fromCharCode(65 + i)}.</span>
                    {opt}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}