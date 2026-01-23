import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/ui/GlassCard';
import { ChevronRight, Trophy, Loader2, Clock, X, AlertTriangle } from 'lucide-react';

export default function TeacherLiveQuizPlay() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('sessionId');

  const [timeLeft, setTimeLeft] = useState(15);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Prevent end-on-unmount when we intentionally navigate
  const isTransitioningRef = useRef(false);

  const { data: session, isFetching: isFetchingSession } = useQuery({
    queryKey: ['liveQuizSession', sessionId],
    queryFn: async () => {
      const sessions = await base44.entities.LiveQuizSession.filter({ id: sessionId });
      return sessions[0] || null;
    },
    enabled: !!sessionId,
    refetchInterval: 1000
  });

  // ✅ Only redirect if actually ended
  useEffect(() => {
    if (!sessionId) return;
    if (session?.status === 'ended') {
      isTransitioningRef.current = true;
      navigate(createPageUrl('TeacherDashboard'), { replace: true });
    }
  }, [session?.status, sessionId, navigate]);

  const quizSetId = session?.quiz_set_id || session?.live_quiz_set_id || null;

  const { data: questions = [], isFetching: isFetchingQuestions } = useQuery({
    queryKey: ['questionsForPlay', quizSetId],
    queryFn: async () => {
      if (!quizSetId) return [];

      // 1) QuizQuestion by quiz_set_id
      try {
        const qs = await base44.entities.QuizQuestion.filter({ quiz_set_id: quizSetId }, 'order');
        if (qs?.length) return qs;
      } catch {}

      // 2) LiveQuizQuestion by live_quiz_set_id
      try {
        const lqs = await base44.entities.LiveQuizQuestion.filter({ live_quiz_set_id: quizSetId }, 'order');
        if (lqs?.length) return lqs;
      } catch {}

      // ✅ 3) LiveQuizQuestion by quiz_set_id (missing fallback in your current file)
      try {
        const lqs2 = await base44.entities.LiveQuizQuestion.filter({ quiz_set_id: quizSetId }, 'order');
        if (lqs2?.length) return lqs2;
      } catch {}

      return [];
    },
    enabled: !!quizSetId
  });

  const { data: players = [] } = useQuery({
    queryKey: ['liveQuizPlayers', sessionId],
    queryFn: () => base44.entities.LiveQuizPlayer.filter({ session_id: sessionId }),
    enabled: !!sessionId,
    refetchInterval: 1000
  });

  const { data: answers = [] } = useQuery({
    queryKey: ['liveQuizAnswers', sessionId, session?.current_question_index],
    queryFn: () =>
      base44.entities.LiveQuizAnswer.filter({
        session_id: sessionId,
        question_index: session.current_question_index
      }),
    enabled: !!sessionId && session?.current_question_index >= 0,
    refetchInterval: 1000
  });

  const endSession = async (reason = 'teacher_left') => {
    try {
      if (!sessionId) return;
      await base44.entities.LiveQuizSession.update(sessionId, {
        status: 'ended',
        ended_at: new Date().toISOString(),
        end_reason: reason
      });
      queryClient.invalidateQueries(['liveQuizSession']);
      queryClient.invalidateQueries(['activeLiveSessions']);
    } catch (e) {
      console.error('[TEACHER] Failed to end session:', e);
    }
  };

  // End on refresh/close (best-effort)
  useEffect(() => {
    const handleBeforeUnload = () => endSession('teacher_beforeunload');
    const handlePageHide = () => endSession('teacher_pagehide');

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // ✅ Only auto-end from Play if the session is still LIVE (and teacher truly leaves)
  useEffect(() => {
    return () => {
      if (isTransitioningRef.current) return;
      if (session?.status === 'live') {
        endSession('teacher_navigated_away');
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.status, sessionId]);

  // Timer logic
  useEffect(() => {
    if (!session || session.status !== 'live' || !session.question_started_at) return;

    const questionStartTime = new Date(session.question_started_at).getTime();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - questionStartTime) / 1000);
      const remaining = Math.max(0, 15 - elapsed);
      setTimeLeft(remaining);
      if (remaining === 0) setShowLeaderboard(true);
    }, 100);

    return () => clearInterval(interval);
  }, [session?.status, session?.question_started_at]);

  const nextQuestionMutation = useMutation({
    mutationFn: async () => {
      const nextIndex = (session?.current_question_index ?? 0) + 1;

      if (nextIndex >= questions.length) {
        await endSession('completed_all_questions');
        return { ended: true };
      }

      await base44.entities.LiveQuizSession.update(sessionId, {
        current_question_index: nextIndex,
        question_started_at: new Date().toISOString()
      });

      return { ended: false };
    },
    onSuccess: (data) => {
      if (data.ended) {
        isTransitioningRef.current = true;
        navigate(createPageUrl(`TeacherLiveQuizResults?sessionId=${sessionId}`));
      } else {
        setShowLeaderboard(false);
        setTimeLeft(15);
        queryClient.invalidateQueries(['liveQuizSession']);
      }
    },
    onError: (error) => {
      alert('Failed to proceed: ' + (error.message || 'Unknown error'));
    }
  });

  const endNowMutation = useMutation({
    mutationFn: async () => {
      await endSession('ended_button');
    },
    onSuccess: () => {
      isTransitioningRef.current = true;
      navigate(createPageUrl('TeacherDashboard'));
    }
  });

  // ✅ Better loading / error UI (no random kicks)
  if (isFetchingSession || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-purple-400" />
      </div>
    );
  }

  if (session.status !== 'live') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <GlassCard className="p-8 text-center max-w-md">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <p className="text-white font-semibold mb-2">Quiz not live yet</p>
          <p className="text-slate-400 mb-6">
            This session is currently <span className="font-mono">{session.status}</span>.
          </p>
          <Button onClick={() => navigate(createPageUrl(`TeacherLiveQuizLobby?sessionId=${sessionId}`))}>
            Back to Lobby
          </Button>
        </GlassCard>
      </div>
    );
  }

  if (isFetchingQuestions) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-purple-400" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <GlassCard className="p-8 text-center max-w-md">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-white font-semibold mb-2">No questions found</p>
          <p className="text-slate-400 mb-6">
            This quiz set has no questions (or they were saved under a different entity).
          </p>
          <Button onClick={() => navigate(createPageUrl('TeacherDashboard'))}>
            Back to Dashboard
          </Button>
        </GlassCard>
      </div>
    );
  }

  const idx = session.current_question_index ?? 0;
  const currentQuestion = questions[idx];

  const prompt =
    currentQuestion?.prompt ||
    currentQuestion?.question ||
    currentQuestion?.question_text ||
    currentQuestion?.text ||
    'Question';

  const answeredCount = answers.length;

  const leaderboard = players
    .slice()
    .sort((a, b) => (b.total_points || 0) - (a.total_points || 0))
    .map((p, i) => ({ ...p, rank: i + 1 }));

  if (showLeaderboard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6 flex items-center justify-center">
        <div className="max-w-4xl w-full">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <GlassCard className="p-8">
              <div className="text-center mb-8">
                <Trophy className="w-16 h-16 text-amber-400 mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-white mb-2">Leaderboard</h2>
                <p className="text-slate-400">
                  Question {idx + 1} of {questions.length}
                </p>
              </div>

              <div className="space-y-3 mb-8">
                {leaderboard.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className={`bg-white/5 rounded-xl p-4 border ${
                      i === 0 ? 'border-amber-400/50' : 'border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold bg-gradient-to-br from-purple-500 to-blue-500">
                        {p.rank}
                      </div>
                      <p className="flex-1 text-white font-medium text-lg">{p.nickname}</p>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-white">{p.total_points || 0}</p>
                        <p className="text-xs text-slate-400">points</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button
                  onClick={() => nextQuestionMutation.mutate()}
                  disabled={nextQuestionMutation.isPending}
                  className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-lg py-6"
                >
                  {nextQuestionMutation.isPending ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <>
                      <ChevronRight className="w-5 h-5 mr-2" />
                      {idx + 1 < questions.length ? 'Next Question' : 'Show Final Results'}
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => endNowMutation.mutate()}
                  disabled={endNowMutation.isPending}
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10 py-6"
                >
                  {endNowMutation.isPending ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <>
                      <X className="w-5 h-5 mr-2" />
                      End Quiz Now
                    </>
                  )}
                </Button>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="text-white">
            <p className="text-sm text-slate-400">
              Question {idx + 1} of {questions.length}
            </p>
            <p className="text-lg font-bold">{players.length} players</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-white bg-white/10 px-4 py-2 rounded-lg">
              <Clock className="w-5 h-5" />
              <span className="text-2xl font-bold">{timeLeft}s</span>
            </div>

            <Button
              variant="outline"
              onClick={() => endNowMutation.mutate()}
              disabled={endNowMutation.isPending}
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              <X className="w-4 h-4 mr-2" />
              End
            </Button>
          </div>
        </div>

        <GlassCard className="p-12 text-center mb-6">
          <motion.h2
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-4xl font-bold text-white mb-4"
          >
            {prompt}
          </motion.h2>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Responses</h3>
            <p className="text-slate-400">
              {answeredCount} / {players.length} answered
            </p>
          </div>
          <div className="w-full bg-white/5 rounded-full h-3">
            <motion.div
              className="bg-gradient-to-r from-emerald-500 to-teal-500 h-3 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${players.length ? (answeredCount / players.length) * 100 : 0}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
