import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/ui/GlassCard';
import { Loader2, Clock, CheckCircle2 } from 'lucide-react';

export default function StudentLiveQuizPlay() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('sessionId');

  const [user, setUser] = useState(null);
  const [selected, setSelected] = useState(null);
  const [timeLeft, setTimeLeft] = useState(15);

  /* ---------------- AUTH ---------------- */
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
    enabled: !!sessionId && !!user?.email
  });

  /* ---------------- QUIZ SET ID ---------------- */
  const quizSetId =
    session?.quiz_set_id ||
    session?.live_quiz_set_id ||
    session?.quiz_id ||
    session?.set_id ||
    null;

  /* ---------------- SAFE FILTER ---------------- */
  const safeFilter = async (entity, filter, order = 'order') => {
    try {
      const e = base44.entities?.[entity];
      if (!e?.filter) return [];
      const r = await e.filter(filter, order);
      return Array.isArray(r) ? r : [];
    } catch {
      return [];
    }
  };

  /* ---------------- QUESTIONS ---------------- */
  const { data: questions = [], isFetching } = useQuery({
    queryKey: ['studentQuestions', quizSetId],
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

  /* ---------------- OPTION EXTRACTOR (FIXED) ---------------- */
  const options = useMemo(() => {
    if (!currentQuestion) return [];

    if (Array.isArray(currentQuestion.options)) return currentQuestion.options;
    if (Array.isArray(currentQuestion.answers)) return currentQuestion.answers;
    if (Array.isArray(currentQuestion.choices)) return currentQuestion.choices;

    return [
      currentQuestion.option_a,
      currentQuestion.option_b,
      currentQuestion.option_c,
      currentQuestion.option_d,
      currentQuestion.answer_a,
      currentQuestion.answer_b,
      currentQuestion.answer_c,
      currentQuestion.answer_d,
      currentQuestion.choice_a,
      currentQuestion.choice_b,
      currentQuestion.choice_c,
      currentQuestion.choice_d,
      currentQuestion.option1,
      currentQuestion.option2,
      currentQuestion.option3,
      currentQuestion.option4,
      currentQuestion.answer1,
      currentQuestion.answer2,
      currentQuestion.answer3,
      currentQuestion.answer4
    ].filter(v => typeof v === 'string' && v.trim().length);
  }, [currentQuestion]);

  /* ---------------- SUBMIT ANSWER ---------------- */
  const submitAnswer = useMutation({
    mutationFn: async (optionIndex) => {
      if (!player || !session) return;

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

  /* ---------------- GUARDS ---------------- */
  if (!session || !player || isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-purple-400" />
      </div>
    );
  }

  if (session.status === 'lobby' || idx < 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GlassCard className="p-10 text-center">
          <p className="text-white text-xl">Waiting for teacher…</p>
        </GlassCard>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-purple-400" />
      </div>
    );
  }

  const prompt =
    currentQuestion.prompt ||
    currentQuestion.question ||
    currentQuestion.text ||
    'Question';

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
