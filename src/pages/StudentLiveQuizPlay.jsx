import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/ui/GlassCard';
import { Loader2, Clock, CheckCircle2, Zap } from 'lucide-react';

export default function StudentLiveQuizPlay() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('sessionId');

  const [user, setUser] = useState(null);
  const [selected, setSelected] = useState(null);
  const [timeLeft, setTimeLeft] = useState(15);

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

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

  /* ---------------- PLAYER ---------------- */
  const { data: player } = useQuery({
    queryKey: ['myLiveQuizPlayer', sessionId, user?.email],
    queryFn: async () => {
      const p = await base44.entities.LiveQuizPlayer.filter({
        session_id: sessionId,
        student_email: user.email
      });
      return p?.[0] || null;
    },
    enabled: !!sessionId && !!user
  });

  /* ---------------- QUIZ SET ID ---------------- */
  const quizSetId =
    session?.quiz_set_id ||
    session?.live_quiz_set_id ||
    session?.quiz_id ||
    null;

  /* ---------------- SAFE FILTER ---------------- */
  const safeFilter = async (entityName, filter, order = 'order') => {
    try {
      const e = base44.entities?.[entityName];
      if (!e?.filter) return [];
      const r = await e.filter(filter, order);
      return Array.isArray(r) ? r : [];
    } catch {
      return [];
    }
  };

  /* ---------------- QUESTIONS (MATCH TEACHER) ---------------- */
  const { data: questions = [] } = useQuery({
    queryKey: ['studentQuestions', sessionId, quizSetId],
    queryFn: async () => {
      if (!quizSetId) return [];

      let q = await safeFilter('QuizQuestion', { quiz_id: quizSetId });
      if (q.length) return q;

      q = await safeFilter('QuizQuestion', { quiz_set_id: quizSetId });
      if (q.length) return q;

      q = await safeFilter('LiveQuizQuestion', { live_quiz_set_id: quizSetId });
      if (q.length) return q;

      return [];
    },
    enabled: !!quizSetId
  });

  const idx = session?.current_question_index ?? -1;
  const currentQuestion = idx >= 0 ? questions[idx] : null;

  /* ---------------- TIMER ---------------- */
  useEffect(() => {
    if (!session?.question_started_at) return;
    setSelected(null);

    const start = new Date(session.question_started_at).getTime();
    const i = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      setTimeLeft(Math.max(0, 15 - elapsed));
    }, 200);

    return () => clearInterval(i);
  }, [session?.question_started_at]);

  /* ---------------- ANSWER SUBMIT ---------------- */
  const submitAnswer = useMutation({
    mutationFn: async (optionIndex) => {
      if (!player || !session) return;

      // prevent double answers
      const existing = await base44.entities.LiveQuizAnswer.filter({
        session_id: sessionId,
        player_id: player.id,
        question_index: idx
      });
      if (existing?.length) return;

      await base44.entities.LiveQuizAnswer.create({
        session_id: sessionId,
        player_id: player.id,
        question_index: idx,
        selected_option_index: optionIndex,
        answered_at: new Date().toISOString(),
        response_time_ms:
          Date.now() - new Date(session.question_started_at).getTime()
      });
    },
    onSuccess: () => setSelected('done')
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
          <Loader2 className="w-10 h-10 animate-spin text-purple-400 mb-3" />
          <p className="text-white">Waiting for next question…</p>
        </GlassCard>
      </div>
    );
  }

  const prompt =
    currentQuestion.prompt ||
    currentQuestion.question ||
    currentQuestion.text ||
    'Question';

  const options =
    currentQuestion.options ||
    currentQuestion.answers ||
    currentQuestion.choices ||
    [];

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between mb-6 text-white">
          <span className="text-xl font-bold">{player.nickname}</span>
          <div className="flex items-center gap-2">
            <Clock />
            <span className="text-2xl">{timeLeft}s</span>
          </div>
        </div>

        <GlassCard className="p-8 mb-6 text-center">
          <h2 className="text-3xl font-bold text-white">{prompt}</h2>
        </GlassCard>

        {selected === 'done' ? (
          <GlassCard className="p-6 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <p className="text-white">Answer submitted</p>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {options.map((opt, i) => (
              <Button
                key={i}
                onClick={() => {
                  setSelected(i);
                  submitAnswer.mutate(i);
                }}
                disabled={submitAnswer.isPending || selected !== null}
                className="py-6 text-lg"
              >
                {opt}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
