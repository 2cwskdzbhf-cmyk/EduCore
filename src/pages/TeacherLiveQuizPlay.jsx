import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/ui/GlassCard';
import {
  ChevronRight,
  Trophy,
  Loader2,
  Clock,
  X,
  AlertTriangle
} from 'lucide-react';

export default function TeacherLiveQuizPlay() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('sessionId');

  const [timeLeft, setTimeLeft] = useState(15);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const isTransitioningRef = useRef(false);

  /* ---------------- SESSION ---------------- */
  const { data: session } = useQuery({
    queryKey: ['liveQuizSession', sessionId],
    queryFn: async () => {
      const s = await base44.entities.LiveQuizSession.filter({ id: sessionId });
      return s?.[0] || null;
    },
    enabled: !!sessionId,
    refetchInterval: 1000
  });

  useEffect(() => {
    if (session?.status === 'ended') {
      isTransitioningRef.current = true;
      navigate(createPageUrl('TeacherDashboard'), { replace: true });
    }
  }, [session?.status, navigate]);

  const quizSetId =
    session?.quiz_set_id ||
    session?.quiz_id ||
    session?.live_quiz_set_id ||
    null;

  /* ---------------- LOAD QUESTIONS (FIXED) ---------------- */
  const { data: questions = [], isFetching } = useQuery({
    queryKey: ['playQuestions', quizSetId],
    queryFn: async () => {
      if (!quizSetId) return [];

      // ✅ CORRECT: QuizQuestion.quiz_id
      try {
        const q = await base44.entities.QuizQuestion.filter(
          { quiz_id: quizSetId },
          'order'
        );
        if (q?.length) return q;
      } catch {}

      // Fallbacks (safe)
      try {
        const q = await base44.entities.QuizQuestion.filter(
          { quiz_set_id: quizSetId },
          'order'
        );
        if (q?.length) return q;
      } catch {}

      try {
        const q = await base44.entities.LiveQuizQuestion.filter(
          { live_quiz_set_id: quizSetId },
          'order'
        );
        if (q?.length) return q;
      } catch {}

      return [];
    },
    enabled: !!quizSetId
  });

  /* ---------------- PLAYERS ---------------- */
  const { data: players = [] } = useQuery({
    queryKey: ['liveQuizPlayers', sessionId],
    queryFn: () =>
      base44.entities.LiveQuizPlayer.filter({ session_id: sessionId }),
    enabled: !!sessionId,
    refetchInterval: 1000
  });

  /* ---------------- ANSWERS ---------------- */
  const { data: answers = [] } = useQuery({
    queryKey: ['liveQuizAnswers', sessionId, session?.current_question_index],
    queryFn: () =>
      base44.entities.LiveQuizAnswer.filter({
        session_id: sessionId,
        question_index: session.current_question_index
      }),
    enabled: session?.current_question_index >= 0,
    refetchInterval: 1000
  });

  /* ---------------- TIMER ---------------- */
  useEffect(() => {
    if (!session?.question_started_at) return;

    const start = new Date(session.question_started_at).getTime();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const remaining = Math.max(0, 15 - elapsed);
      setTimeLeft(remaining);
      if (remaining === 0) setShowLeaderboard(true);
    }, 200);

    return () => clearInterval(interval);
  }, [session?.question_started_at]);

  /* ---------------- MUTATIONS ---------------- */
  const endSession = async (reason) => {
    await base44.entities.LiveQuizSession.update(sessionId, {
      status: 'ended',
      ended_at: new Date().toISOString(),
      end_reason: reason
    });
  };

  const nextQuestionMutation = useMutation({
    mutationFn: async () => {
      const nextIndex = session.current_question_index + 1;

      if (nextIndex >= questions.length) {
        await endSession('completed');
        return { ended: true };
      }

      await base44.entities.LiveQuizSession.update(sessionId, {
        current_question_index: nextIndex,
        question_started_at: new Date().toISOString()
      });

      return { ended: false };
    },
    onSuccess: (res) => {
      if (res.ended) {
        isTransitioningRef.current = true;
        navigate(createPageUrl('TeacherDashboard'));
      } else {
        setShowLeaderboard(false);
        setTimeLeft(15);
        queryClient.invalidateQueries(['liveQuizSession']);
      }
    }
  });

  /* ---------------- GUARDS ---------------- */
  if (!session || isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-purple-400" />
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
            This quiz exists, but no questions were linked correctly.
          </p>
          <Button onClick={() => navigate(createPageUrl('TeacherDashboard'))}>
            Back to Dashboard
          </Button>
        </GlassCard>
      </div>
    );
  }

  const idx = session.current_question_index;
  const q = questions[idx];

  const prompt =
    q?.prompt ||
    q?.question ||
    q?.question_text ||
    q?.text ||
    'Question';

  /* ---------------- LEADERBOARD ---------------- */
  if (showLeaderboard) {
    const leaderboard = [...players].sort(
      (a, b) => (b.total_points || 0) - (a.total_points || 0)
    );

    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <GlassCard className="p-8 max-w-3xl w-full">
          <h2 className="text-3xl font-bold text-white text-center mb-6">
            Leaderboard
          </h2>

          <div className="space-y-3 mb-6">
            {leaderboard.map((p, i) => (
              <div
                key={p.id}
                className="flex justify-between bg-white/5 p-4 rounded-lg text-white"
              >
                <span>{i + 1}. {p.nickname}</span>
                <span>{p.total_points || 0}</span>
              </div>
            ))}
          </div>

          <Button
            className="w-full"
            onClick={() => nextQuestionMutation.mutate()}
          >
            {idx + 1 < questions.length ? 'Next Question' : 'End Quiz'}
          </Button>
        </GlassCard>
      </div>
    );
  }

  /* ---------------- QUESTION VIEW ---------------- */
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between mb-6 text-white">
          <p>Question {idx + 1} / {questions.length}</p>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            <span className="text-xl font-bold">{timeLeft}s</span>
          </div>
        </div>

        <GlassCard className="p-10 text-center mb-6">
          <h1 className="text-4xl font-bold text-white">{prompt}</h1>
        </GlassCard>

        <GlassCard className="p-4 text-white text-center">
          {answers.length} / {players.length} answered
        </GlassCard>
      </div>
    </div>
  );
}
