import React, { useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/ui/GlassCard';
import { Loader2, Clock, CheckCircle2, Zap, XCircle, Trophy, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function StudentLiveQuizPlay() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('sessionId');
  const queryClient = useQueryClient();

  const [user, setUser] = useState(null);
  const [selected, setSelected] = useState(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [answerResult, setAnswerResult] = useState(null);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [quizStartTime, setQuizStartTime] = useState(null);
  const [totalQuizTime, setTotalQuizTime] = useState(0);

  const lastSessionRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  // Track total quiz time
  useEffect(() => {
    if (session?.status === 'live' && session?.started_at && !quizStartTime) {
      setQuizStartTime(new Date(session.started_at).getTime());
    }
  }, [session?.status, session?.started_at, quizStartTime]);

  useEffect(() => {
    if (!quizStartTime) return;
    const interval = setInterval(() => {
      setTotalQuizTime(Math.floor((Date.now() - quizStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [quizStartTime]);

  const { data: sessionRaw } = useQuery({
    queryKey: ['liveQuizSession', sessionId],
    queryFn: async () => {
      const s = await base44.entities.LiveQuizSession.filter({ id: sessionId });
      return s?.[0] || null;
    },
    enabled: !!sessionId,
    refetchInterval: 1000,
    staleTime: 500
  });

  const session = useMemo(() => {
    if (sessionRaw) lastSessionRef.current = sessionRaw;
    return sessionRaw || lastSessionRef.current;
  }, [sessionRaw]);

  const { data: player } = useQuery({
    queryKey: ['myLiveQuizPlayer', sessionId, user?.email],
    queryFn: async () => {
      const p = await base44.entities.LiveQuizPlayer.filter({
        session_id: sessionId,
        student_email: user.email
      });
      return p?.[0] || null;
    },
    enabled: !!sessionId && !!user?.email,
    refetchInterval: 1000
  });

  const { data: allPlayers = [] } = useQuery({
    queryKey: ['allLiveQuizPlayers', sessionId],
    queryFn: async () => {
      const players = await base44.entities.LiveQuizPlayer.filter({ session_id: sessionId });
      return players.sort((a, b) => (b.total_points || 0) - (a.total_points || 0));
    },
    enabled: !!sessionId && showScoreboard,
    refetchInterval: showScoreboard ? 1000 : false
  });

  const idx = session?.current_question_index ?? -1;

  const questionsFromSession = useMemo(() => {
    function normalizeQuestions(raw) {
      if (!raw) return [];
      if (Array.isArray(raw)) return raw;
      if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      return [];
    }
    return (
      normalizeQuestions(session?.questions) ||
      normalizeQuestions(session?.questions_json) ||
      normalizeQuestions(session?.quiz_questions) ||
      normalizeQuestions(session?.items) ||
      []
    );
  }, [session?.questions, session?.questions_json, session?.quiz_questions, session?.items]);

  const currentQuestion = session?.current_question || (idx >= 0 ? questionsFromSession[idx] : null);

  useEffect(() => {
    if (!session?.question_started_at) return;
    setSelected(null);
    setAnswerResult(null);
    setShowScoreboard(false);

    const start = new Date(session.question_started_at).getTime();
    const i = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      setTimeLeft(Math.max(0, 15 - elapsed));
    }, 200);

    return () => clearInterval(i);
  }, [session?.question_started_at]);

  const options = useMemo(() => {
    const q = currentQuestion;
    if (!q) return [];

    if (Array.isArray(q.options) && q.options.length) return q.options;
    if (Array.isArray(q.answers) && q.answers.length) return q.answers;
    if (Array.isArray(q.choices) && q.choices.length) return q.choices;

    return [
      q.option_a, q.option_b, q.option_c, q.option_d,
      q.answer_a, q.answer_b, q.answer_c, q.answer_d,
      q.A, q.B, q.C, q.D
    ].filter(v => typeof v === 'string' && v.trim().length);
  }, [currentQuestion]);

  const submitAnswer = useMutation({
    mutationFn: async (optionIndex) => {
      if (!player || !session || !currentQuestion) return;

      const existing = await base44.entities.LiveQuizAnswer.filter({
        session_id: sessionId,
        player_id: player.id,
        question_index: idx
      });
      if (existing?.length) return { alreadyAnswered: true };

      const startedAt = session.question_started_at ? new Date(session.question_started_at).getTime() : Date.now();
      const responseTimeMs = Date.now() - startedAt;

      // Determine correct answer
      const correctIndex = currentQuestion.correct_index ?? 
                          currentQuestion.correctIndex ?? 
                          currentQuestion.correct_answer ?? 
                          currentQuestion.answer ?? 
                          0;
      const isCorrect = optionIndex === correctIndex;

      // Calculate points (base points * time multiplier)
      const basePoints = 500;
      const timeRemaining = Math.max(0, 15 - (responseTimeMs / 1000));
      const timeBonus = Math.floor((timeRemaining / 15) * 500);
      const pointsAwarded = isCorrect ? basePoints + timeBonus : 0;

      // Create answer record
      await base44.entities.LiveQuizAnswer.create({
        session_id: sessionId,
        player_id: player.id,
        question_id: currentQuestion.id ?? null,
        question_index: idx,
        selected_option: optionIndex,
        selected_option_index: optionIndex,
        is_correct: isCorrect,
        points_awarded: pointsAwarded,
        response_time_ms: responseTimeMs,
        answered_at: new Date().toISOString()
      });

      // Update player stats
      const newTotalPoints = (player.total_points || 0) + pointsAwarded;
      const newCorrectCount = (player.correct_count || 0) + (isCorrect ? 1 : 0);
      const newQuestionsAnswered = (player.questions_answered || 0) + 1;

      await base44.entities.LiveQuizPlayer.update(player.id, {
        total_points: newTotalPoints,
        correct_count: newCorrectCount,
        questions_answered: newQuestionsAnswered
      });

      return { isCorrect, pointsAwarded, correctIndex };
    },
    onSuccess: (result) => {
      if (result?.alreadyAnswered) return;
      setAnswerResult(result);
      queryClient.invalidateQueries(['myLiveQuizPlayer']);
      setTimeout(() => setShowScoreboard(true), 1500);
    }
  });

  if (!session || !player) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-purple-400" />
      </div>
    );
  }

  if (session.status !== 'live' || idx < 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GlassCard className="p-10 text-center">
          <Zap className="w-14 h-14 text-amber-400 mx-auto mb-3" />
          <p className="text-white text-xl">Waiting for teacher…</p>
        </GlassCard>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GlassCard className="p-10 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-purple-400 mx-auto mb-3" />
          <p className="text-white">Loading question…</p>
        </GlassCard>
      </div>
    );
  }

  const prompt =
    currentQuestion.prompt ||
    currentQuestion.question ||
    currentQuestion.question_text ||
    currentQuestion.text ||
    'Question';

  const myRank = allPlayers.findIndex(p => p.id === player?.id) + 1;
  const totalQuestions = questionsFromSession.length;
  const progressPercent = totalQuestions > 0 ? ((idx + 1) / totalQuestions) * 100 : 0;

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      <div className="max-w-4xl mx-auto">
        {/* Header with nickname, score, and timer */}
        <div className="flex justify-between items-center mb-4 text-white">
          <div>
            <span className="text-xl font-bold">{player.nickname}</span>
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>{player.total_points || 0} pts</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-xs text-slate-400">Quiz Time</div>
              <div className="text-lg font-bold">{Math.floor(totalQuizTime / 60)}:{String(totalQuizTime % 60).padStart(2, '0')}</div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-6 h-6" />
              <span className="text-3xl font-bold">{timeLeft}s</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {totalQuestions > 0 && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-slate-400 mb-2">
              <span>Question {idx + 1} of {totalQuestions}</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        )}

        <GlassCard className="p-8 mb-6 text-center">
          <h2 className="text-3xl font-bold text-white">{prompt}</h2>
        </GlassCard>

        <AnimatePresence mode="wait">
          {showScoreboard && answerResult ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <GlassCard className="p-8 text-center mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                >
                  {answerResult.isCorrect ? (
                    <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                  ) : (
                    <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                  )}
                </motion.div>
                <h3 className={`text-3xl font-bold mb-2 ${answerResult.isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                  {answerResult.isCorrect ? 'Correct!' : 'Incorrect'}
                </h3>
                {answerResult.isCorrect && (
                  <p className="text-2xl text-white mb-4">+{answerResult.pointsAwarded} points</p>
                )}
                <div className="flex items-center justify-center gap-2 text-slate-300">
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-lg">
                    Rank: #{myRank} • Total: {player.total_points || 0} pts
                  </span>
                </div>
              </GlassCard>

              {allPlayers.length > 0 && (
                <GlassCard className="p-6">
                  <h4 className="text-white font-bold mb-4 text-center">Live Standings</h4>
                  <div className="space-y-2">
                    {allPlayers.slice(0, 5).map((p, i) => (
                      <motion.div
                        key={p.id}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          p.id === player?.id ? 'bg-purple-500/30 border border-purple-500/50' : 'bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl font-bold text-slate-400">#{i + 1}</span>
                          <span className="text-white font-medium">{p.nickname}</span>
                        </div>
                        <span className="text-amber-400 font-bold">{p.total_points || 0}</span>
                      </motion.div>
                    ))}
                  </div>
                </GlassCard>
              )}
            </motion.div>
          ) : selected !== null ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <GlassCard className="p-6 text-center">
                {answerResult ? (
                  <>
                    {answerResult.isCorrect ? (
                      <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                    ) : (
                      <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                    )}
                    <p className={`text-xl font-bold ${answerResult.isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                      {answerResult.isCorrect ? 'Correct!' : 'Incorrect'}
                    </p>
                  </>
                ) : (
                  <>
                    <Loader2 className="w-12 h-12 animate-spin text-purple-400 mx-auto mb-3" />
                    <p className="text-white">Submitting answer...</p>
                  </>
                )}
              </GlassCard>
            </motion.div>
          ) : options.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {options.map((opt, i) => {
                const isSelected = selected === i;
                const isCorrect = answerResult?.correctIndex === i;
                const showCorrect = answerResult && isCorrect;
                const showIncorrect = answerResult && isSelected && !isCorrect;

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Button
                     onClick={() => {
                       setSelected(i);
                       submitAnswer.mutate(i);
                     }}
                     disabled={selected !== null}
                     className={`h-20 text-lg w-full transition-all relative ${
                       showCorrect ? 'bg-emerald-500 hover:bg-emerald-600 border-2 border-emerald-400 animate-pulse' :
                       showIncorrect ? 'bg-red-500 hover:bg-red-600 border-2 border-red-400 animate-shake' :
                       isSelected ? 'bg-purple-500 hover:bg-purple-600 opacity-70' : ''
                     }`}
                     variant={isSelected || showCorrect || showIncorrect ? 'default' : 'outline'}
                    >
                     {opt}
                     {showCorrect && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6" />}
                     {showIncorrect && <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6" />}
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <GlassCard className="p-6 text-center">
              <p className="text-white">No options available</p>
            </GlassCard>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}