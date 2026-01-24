import React, { useState, useEffect, useRef, useMemo } from 'react';
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

  const isTransitioningRef = useRef(false);
  const statusRef = useRef(null);

  const safeFilter = async (entityName, filter, order = 'order') => {
    try {
      const entity = base44.entities?.[entityName];
      if (!entity?.filter) return [];
      const res = await entity.filter(filter, order);
      return Array.isArray(res) ? res : [];
    } catch {
      return [];
    }
  };

  /* ---------------- SESSION ---------------- */
  const { data: session, isFetching: isFetchingSession } = useQuery({
    queryKey: ['liveQuizSession', sessionId],
    queryFn: async () => {
      const sessions = await base44.entities.LiveQuizSession.filter({ id: sessionId });
      return sessions?.[0] || null;
    },
    enabled: !!sessionId,
    refetchInterval: 1000,
    staleTime: 500
  });

  useEffect(() => {
    statusRef.current = session?.status ?? null;
  }, [session?.status]);

  // Redirect only if ended
  useEffect(() => {
    if (!sessionId) return;
    if (session?.status === 'ended') {
      isTransitioningRef.current = true;
      navigate(createPageUrl('TeacherDashboard'), { replace: true });
    }
  }, [session?.status, sessionId, navigate]);

  const quizSetId =
    session?.quiz_set_id ||
    session?.live_quiz_set_id ||
    session?.quizSetId ||
    session?.liveQuizSetId ||
    session?.quiz_id ||
    session?.set_id ||
    null;

  /* ---------------- QUIZ SET META (for inline questions) ---------------- */
  const { data: quizSet } = useQuery({
    queryKey: ['quizSetMetaForPlay', quizSetId],
    queryFn: async () => {
      if (!quizSetId) return null;
      try {
        const qs = await base44.entities.QuizSet.filter({ id: quizSetId });
        if (qs?.[0]) return qs[0];
      } catch {}
      try {
        const lqs = await base44.entities.LiveQuizSet.filter({ id: quizSetId });
        if (lqs?.[0]) return lqs[0];
      } catch {}
      return null;
    },
    enabled: !!quizSetId,
    staleTime: 10_000
  });

  const candidateIds = useMemo(() => {
    const ids = [
      quizSetId,
      quizSet?.id,
      session?.quiz_set_id,
      session?.live_quiz_set_id,
      session?.quizSetId,
      session?.liveQuizSetId,
      session?.quiz_id,
      session?.set_id,
      sessionId // some schemas attach questions to session
    ].filter(Boolean);
    return Array.from(new Set(ids));
  }, [quizSetId, quizSet?.id, sessionId, session]);

  /* ---------------- QUESTIONS (schema-proof) ---------------- */
  const { data: questions = [], isFetching: isFetchingQuestions } = useQuery({
    queryKey: ['questionsForPlay', sessionId, quizSetId],
    queryFn: async () => {
      // inline questions
      const inline = [
        quizSet?.questions,
        quizSet?.items,
        quizSet?.question_list,
        quizSet?.quiz_questions,
        quizSet?.content
      ];
      for (const arr of inline) {
        if (Array.isArray(arr) && arr.length) return arr;
      }

      for (const id of candidateIds) {
        let q = await safeFilter('QuizQuestion', { quiz_id: id }, 'order');
        if (q.length) return q;

        q = await safeFilter('QuizQuestion', { quiz_set_id: id }, 'order');
        if (q.length) return q;

        q = await safeFilter('LiveQuizQuestion', { live_quiz_set_id: id }, 'order');
        if (q.length) return q;

        q = await safeFilter('LiveQuizQuestion', { quiz_set_id: id }, 'order');
        if (q.length) return q;

        q = await safeFilter('LiveQuizQuestion', { session_id: id }, 'order');
        if (q.length) return q;

        q = await safeFilter('Question', { quiz_id: id }, 'order');
        if (q.length) return q;

        q = await safeFilter('QuizItem', { quiz_id: id }, 'order');
        if (q.length) return q;
      }

      return [];
    },
    enabled: !!sessionId && !!quizSetId,
    staleTime: 10_000
  });

  /* ---------------- PLAYERS / ANSWERS ---------------- */
  const { data: players = [] } = useQuery({
    queryKey: ['liveQuizPlayers', sessionId],
    queryFn: () => base44.entities.LiveQuizPlayer.filter({ session_id: sessionId }),
    enabled: !!sessionId,
    refetchInterval: 1000,
    staleTime: 500
  });

  const { data: answers = [] } = useQuery({
    queryKey: ['liveQuizAnswers', sessionId, session?.current_question_index],
    queryFn: () =>
      base44.entities.LiveQuizAnswer.filter({
        session_id: sessionId,
        question_index: session.current_question_index
      }),
    enabled: !!sessionId && (session?.current_question_index ?? -1) >= 0,
    refetchInterval: 1000,
    staleTime: 300
  });

  const endSession = async (reason = 'teacher_left') => {
    try {
      if (!sessionId) return;
      await base44.entities.LiveQuizSession.update(sessionId, {
        status: 'ended',
        ended_at: new Date().toISOString(),
        end_reason: reason
      });
      queryClient.invalidateQueries();
    } catch (e) {
      console.error('[TEACHER] Failed to end session:', e);
    }
  };

  // ✅ End only on REAL tab close/refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isTransitioningRef.current) return;
      if (statusRef.current === 'live') endSession('teacher_beforeunload');
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // ✅ End only on real component unmount (NO deps!)
  useEffect(() => {
    return () => {
      if (isTransitioningRef.current) return;
      if (statusRef.current === 'live') endSession('teacher_navigated_away');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- TIMER ---------------- */
  useEffect(() => {
    if (!session || session.status !== 'live' || !session.question_started_at) return;

    const start = new Date(session.question_started_at).getTime();
    setShowLeaderboard(false);

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const remaining = Math.max(0, 15 - elapsed);
      setTimeLeft(remaining);
      if (remaining === 0) setShowLeaderboard(true);
    }, 200);

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

  /* ---------------- UI ---------------- */
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
            Status: <span className="font-mono">{session.status}</span>
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
          <Button onClick={() => navigate(createPageUrl(`TeacherLiveQuizLobby?sessionId=${sessionId}`))}>
            Back to Lobby
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
      <div className="min-h-screen p-6 flex items-center justify-center">
        <GlassCard className="p-8 max-w-4xl w-full">
          <div className="text-center mb-6">
            <Trophy className="w-14 h-14 text-amber-400 mx-auto mb-3" />
            <h2 className="text-3xl font-bold text-white">Leaderboard</h2>
            <p className="text-slate-400">
              Question {idx + 1} / {questions.length}
            </p>
          </div>

          <div className="space-y-3 mb-6">
            {leaderboard.map((p) => (
              <div key={p.id} className="flex justify-between bg-white/5 p-4 rounded-lg text-white">
                <span>{p.rank}. {p.nickname}</span>
                <span>{p.total_points || 0}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button onClick={() => nextQuestionMutation.mutate()} className="py-6">
              <ChevronRight className="w-5 h-5 mr-2" />
              {idx + 1 < questions.length ? 'Next Question' : 'Show Final Results'}
            </Button>
            <Button
              variant="outline"
              onClick={() => endNowMutation.mutate()}
              className="py-6 border-red-500/30 text-red-400"
            >
              <X className="w-5 h-5 mr-2" />
              End Quiz Now
            </Button>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6 text-white">
          <div>
            <p className="text-sm text-slate-400">
              Question {idx + 1} / {questions.length}
            </p>
            <p className="text-lg font-bold">{players.length} players</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg">
              <Clock className="w-5 h-5" />
              <span className="text-2xl font-bold">{timeLeft}s</span>
            </div>
          </div>
        </div>

        <GlassCard className="p-10 text-center mb-6">
          <motion.h2
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-4xl font-bold text-white"
          >
            {prompt}
          </motion.h2>
        </GlassCard>

        <GlassCard className="p-6 text-white">
          <p className="text-slate-300">
            {answeredCount} / {players.length} answered
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
