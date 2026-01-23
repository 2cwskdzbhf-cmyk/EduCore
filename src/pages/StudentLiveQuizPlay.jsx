import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/ui/GlassCard';
import { Trophy, Clock, Loader2, Zap, Target, CheckCircle2 } from 'lucide-react';

export default function StudentLiveQuizPlay() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('sessionId');

  const [user, setUser] = useState(null);
  const [showQuestion, setShowQuestion] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [questionStartTime, setQuestionStartTime] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  /* ---------------- SESSION ---------------- */
  const { data: session } = useQuery({
    queryKey: ['liveQuizSession', sessionId],
    queryFn: async () => {
      const sessions = await base44.entities.LiveQuizSession.filter({ id: sessionId });
      return sessions[0];
    },
    enabled: !!sessionId,
    refetchInterval: 1000
  });

  /* ---------------- PLAYER ---------------- */
  const { data: player } = useQuery({
    queryKey: ['myPlayer', sessionId, user?.email],
    queryFn: async () => {
      const players = await base44.entities.LiveQuizPlayer.filter({
        session_id: sessionId,
        student_email: user.email
      });
      return players[0];
    },
    enabled: !!sessionId && !!user,
    refetchInterval: 1000
  });

  /* ---------------- QUESTIONS (FIXED) ---------------- */
  const { data: questions = [] } = useQuery({
    queryKey: ['quizQuestions', session?.quiz_set_id],
    queryFn: async () => {
      if (!session?.quiz_set_id) return [];
      return base44.entities.QuizQuestion.filter(
        { quiz_set_id: session.quiz_set_id },
        'order'
      );
    },
    enabled: !!session?.quiz_set_id
  });

  const currentQuestion =
    session?.current_question_index >= 0
      ? questions[session.current_question_index]
      : null;

  /* ---------------- TIMER ---------------- */
  useEffect(() => {
    if (session?.status === 'live' && currentQuestion && session.question_started_at) {
      const startTime = new Date(session.question_started_at).getTime();
      setQuestionStartTime(startTime);
      setAnswered(false);
      setShowQuestion(true);

      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setTimeLeft(Math.max(0, 15 - elapsed));
      }, 100);

      return () => clearInterval(interval);
    }
  }, [session?.current_question_index, session?.question_started_at]);

  /* ---------------- ANSWER ---------------- */
  const answerMutation = useMutation({
    mutationFn: async (answerText) => {
      const responseTime = Date.now() - questionStartTime;
      const isCorrect =
        answerText.trim().toLowerCase() ===
        currentQuestion.correct_answer.trim().toLowerCase();

      await base44.entities.LiveQuizAnswer.create({
        session_id: sessionId,
        player_id: player.id,
        question_id: currentQuestion.id,
        question_index: session.current_question_index,
        is_correct: isCorrect,
        response_time_ms: responseTime
      });

      await base44.entities.LiveQuizPlayer.update(player.id, {
        questions_answered: player.questions_answered + 1,
        correct_count: player.correct_count + (isCorrect ? 1 : 0)
      });
    },
    onSuccess: () => {
      setAnswered(true);
      queryClient.invalidateQueries(['myPlayer']);
    }
  });

  /* ---------------- STATES ---------------- */
  if (!session || !player) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-purple-400" />
      </div>
    );
  }

  if (session.status === 'lobby') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GlassCard className="p-10 text-center">
          <Zap className="w-16 h-16 text-amber-400 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white">Waiting for teacher…</h1>
        </GlassCard>
      </div>
    );
  }

  if (session.status === 'live' && questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GlassCard className="p-10 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-400 mb-4" />
          <p className="text-white">Loading questions…</p>
        </GlassCard>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GlassCard className="p-10 text-center">
          <Trophy className="w-12 h-12 text-purple-400 mx-auto mb-4" />
          <p className="text-white">Waiting for next question…</p>
        </GlassCard>
      </div>
    );
  }

  /* ---------------- PLAY UI ---------------- */
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between mb-6 text-white">
          <span className="text-2xl font-bold">{player.total_points}</span>
          <span className="text-2xl">{timeLeft}s</span>
        </div>

        <GlassCard className="p-8 mb-6 text-center">
          <h2 className="text-3xl font-bold text-white">{currentQuestion.prompt}</h2>
        </GlassCard>

        {!answered ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              answerMutation.mutate(e.target.answer.value);
            }}
          >
            <input
              name="answer"
              className="w-full p-6 text-xl rounded-xl mb-4"
              placeholder="Type your answer…"
              autoFocus
            />
            <Button className="w-full py-6 text-xl">Submit</Button>
          </form>
        ) : (
          <GlassCard className="p-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <p className="text-white">Answer submitted</p>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
