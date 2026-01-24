import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/ui/GlassCard';
import { Loader2, Clock, CheckCircle2, Zap } from 'lucide-react';

export default function StudentLiveQuizPlay() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('sessionId');

  const [user, setUser] = useState(null);
  const [selected, setSelected] = useState(null);
  const [timeLeft, setTimeLeft] = useState(15);

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

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

  const { data: session } = useQuery({
    queryKey: ['liveQuizSession', sessionId],
    queryFn: async () => {
      const s = await base44.entities.LiveQuizSession.filter({ id: sessionId });
      return s?.[0] || null;
    },
    enabled: !!sessionId,
    refetchInterval: 1000,
    staleTime: 800
  });

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
    staleTime: 10_000
  });

  const quizSetId =
    session?.quiz_set_id ||
    session?.live_quiz_set_id ||
    session?.quiz_id ||
    session?.set_id ||
    null;

  const { data: questions = [], isFetching } = useQuery({
    queryKey: ['studentQuestions', sessionId, quizSetId],
    queryFn: async () => {
      if (!quizSetId) return [];

      let q = await safeFilter('QuizQuestion', { quiz_id: quizSetId }, 'order');
      if (q.length) return q;

      q = await safeFilter('QuizQuestion', { quiz_set_id: quizSetId }, 'order');
      if (q.length) return q;

      q = await safeFilter('LiveQuizQuestion', { live_quiz_set_id: quizSetId }, 'order');
      if (q.length) return q;

      q = await safeFilter('LiveQuizQuestion', { session_id: sessionId }, 'order');
      if (q.length) return q;

      return [];
    },
    enabled: !!quizSetId,
    staleTime: 10_000
  });

  const idx = session?.current_question_index ?? -1;
  const currentQuestion = idx >= 0 ? questions[idx] : null;

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

  const options = useMemo(() => {
    const q = currentQuestion;
    if (!q) return [];

    // 1) array of strings
    for (const k of ['options', 'answers', 'choices']) {
      if (Array.isArray(q[k]) && q[k].length) {
        const arr = q[k]
          .map(v => (typeof v === 'string' ? v : (v?.text ?? v?.label ?? v?.value)))
          .filter(v => typeof v === 'string' && v.trim().length);
        if (arr.length) return arr;
      }
    }

    // 2) object map {A:'1',B:'2',C:'3',D:'4'} or {0:'1',1:'2'...}
    for (const k of ['options', 'answers', 'choices']) {
      if (q[k] && typeof q[k] === 'object' && !Array.isArray(q[k])) {
        const obj = q[k];
        const byLetters = [obj.A, obj.B, obj.C, obj.D].filter(v => typeof v === 'string' && v.trim().length);
        if (byLetters.length) return byLetters;

        const byIndex = [obj[0], obj[1], obj[2], obj[3]].filter(v => typeof v === 'string' && v.trim().length);
        if (byIndex.length) return byIndex;
      }
    }

    // 3) JSON string
    for (const k of ['options_json', 'answers_json', 'choices_json', 'optionsJson', 'answersJson', 'choicesJson']) {
      if (typeof q[k] === 'string') {
        try {
          const parsed = JSON.parse(q[k]);
          if (Array.isArray(parsed)) {
            const arr = parsed
              .map(v => (typeof v === 'string' ? v : (v?.text ?? v?.label ?? v?.value)))
              .filter(v => typeof v === 'string' && v.trim().length);
            if (arr.length) return arr;
          }
          if (parsed && typeof parsed === 'object') {
            const byLetters = [parsed.A, parsed.B, parsed.C, parsed.D].filter(v => typeof v === 'string' && v.trim().length);
            if (byLetters.length) return byLetters;
          }
        } catch {}
      }
    }

    // 4) flat fields
    const flat = [
      q.option_a, q.option_b, q.option_c, q.option_d,
      q.answer_a, q.answer_b, q.answer_c, q.answer_d,
      q.choice_a, q.choice_b, q.choice_c, q.choice_d,
      q.option1, q.option2, q.option3, q.option4,
      q.answer1, q.answer2, q.answer3, q.answer4,
      q.A, q.B, q.C, q.D
    ].filter(v => typeof v === 'string' && v.trim().length);

    return flat;
  }, [currentQuestion]);

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
        response_time_ms: Date.now() - new Date(session.question_started_at).getTime()
      });
    },
    onSuccess: () => setSelected('done')
  });

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
        ) : options.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {options.map((opt, i) => (
              <Button
                key={i}
                onClick={() => {
                  setSelected(i);
                  submitAnswer.mutate(i);
                }}
                disabled={selected !== null}
                className="h-20 text-lg"
                variant={selected === i ? 'default' : 'outline'}
              >
                {opt}
              </Button>
            ))}
          </div>
        ) : (
          <GlassCard className="p-6 text-center">
            <p className="text-white">No options available</p>
          </GlassCard>
        )}
      </div>
    </div>
  );
}