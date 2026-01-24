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
    refetchInterval: 900
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
    enabled: !!sessionId && !!user?.email
  });

  const quizSetId =
    session?.quiz_set_id ||
    session?.live_quiz_set_id ||
    session?.quiz_id ||
    session?.set_id ||
    null;

  const { data: quizSet } = useQuery({
    queryKey: ['quizSetMetaForStudent', quizSetId],
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
    enabled: !!quizSetId
  });

  const candidateIds = useMemo(() => {
    const ids = [quizSetId, quizSet?.id, sessionId].filter(Boolean);
    return Array.from(new Set(ids));
  }, [quizSetId, quizSet?.id, sessionId]);

  const { data: questions = [], isFetching } = useQuery({
    queryKey: ['studentQuestions', sessionId, quizSetId],
    queryFn: async () => {
      // inline
      const inline = [quizSet?.questions, quizSet?.items, quizSet?.quiz_questions, quizSet?.content];
      for (const arr of inline) if (Array.isArray(arr) && arr.length) return arr;

      for (const id of candidateIds) {
        let q = await safeFilter('QuizQuestion', { quiz_id: id }, 'order');
        if (q.length) return q;

        q = await safeFilter('QuizQuestion', { quiz_set_id: id }, 'order');
        if (q.length) return q;

        q = await safeFilter('LiveQuizQuestion', { live_quiz_set_id: id }, 'order');
        if (q.length) return q;

        q = await safeFilter('LiveQuizQuestion', { session_id: id }, 'order');
        if (q.length) return q;
      }
      return [];
    },
    enabled: !!quizSetId
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

  const extractOptions = (q) => {
    if (!q) return [];

    // Array forms
    if (Array.isArray(q.options) && q.options.length) return q.options;
    if (Array.isArray(q.answers) && q.answers.length) return q.answers;
    if (Array.isArray(q.choices) && q.choices.length) return q.choices;

    // Array-of-objects forms: [{text:'...'}], [{label:'...'}], [{value:'...'}]
    const objArr = q.options || q.answers || q.choices;
    if (Array.isArray(objArr) && objArr.length && typeof objArr[0] === 'object') {
      const mapped = objArr
        .map(o => o?.text ?? o?.label ?? o?.value ?? o?.answer ?? o?.choice)
        .filter(v => typeof v === 'string' && v.trim().length);
      if (mapped.length) return mapped;
    }

    // JSON string forms
    for (const key of ['options_json', 'answers_json', 'choices_json', 'optionsJson', 'answersJson']) {
      if (typeof q[key] === 'string') {
        try {
          const parsed = JSON.parse(q[key]);
          if (Array.isArray(parsed)) {
            return parsed
              .map(o => (typeof o === 'string' ? o : (o?.text ?? o?.label ?? o?.value)))
              .filter(v => typeof v === 'string' && v.trim().length);
          }
        } catch {}
      }
    }

    // Field forms (A/B/C/D, option_a etc.)
    const flat = [
      q.option_a, q.option_b, q.option_c, q.option_d,
      q.answer_a, q.answer_b, q.answer_c, q.answer_d,
      q.choice_a, q.choice_b, q.choice_c, q.choice_d,
      q.option1, q.option2, q.option3, q.option4,
      q.answer1, q.answer2, q.answer3, q.answer4,
      q.choice1, q.choice2, q.choice3, q.choice4,
      q.A, q.B, q.C, q.D
    ].filter(v => typeof v === 'string' && v.trim().length);

    return flat;
  };

  const options = useMemo(() => extractOptions(currentQuestion), [currentQuestion]);

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
                disabled={submitAnswer.isPending || selected !== null}
                className="py-6 text-lg"
              >
                {opt}
              </Button>
            ))}
          </div>
        ) : (
          <GlassCard className="p-6 text-center">
            <p className="text-white font-semibold mb-2">No answer options found on this question</p>
            <p className="text-slate-300 text-sm">
              Your question record stores options in a different format. (We can fix it once we see one question’s fields.)
            </p>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
