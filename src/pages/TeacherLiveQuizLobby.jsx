import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/ui/GlassCard';
import {
  Users,
  Play,
  X,
  Copy,
  CheckCircle2,
  Loader2,
  AlertTriangle
} from 'lucide-react';

export default function TeacherLiveQuizLobby() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('sessionId');

  const [copied, setCopied] = useState(false);
  const leavingForPlayRef = useRef(false);

  /* ---------------- SESSION ---------------- */
  const { data: session, isLoading } = useQuery({
    queryKey: ['liveQuizSession', sessionId],
    queryFn: async () => {
      const s = await base44.entities.LiveQuizSession.filter({ id: sessionId });
      return s[0];
    },
    enabled: !!sessionId,
    refetchInterval: 2000
  });

  /* ---------------- UNIVERSAL SET ID ---------------- */
  const quizSetId =
    session?.quiz_set_id ||
    session?.live_quiz_set_id ||
    session?.quizSetId ||
    session?.liveQuizSetId ||
    null;

  /* ---------------- LOAD QUIZ META ---------------- */
  const { data: quizSet } = useQuery({
    queryKey: ['quizSetMeta', quizSetId],
    queryFn: async () => {
      if (!quizSetId) return null;
      try {
        const qs = await base44.entities.QuizSet.filter({ id: quizSetId });
        if (qs?.[0]) return qs[0];
      } catch {}
      const lqs = await base44.entities.LiveQuizSet.filter({ id: quizSetId });
      return lqs?.[0] || null;
    },
    enabled: !!quizSetId
  });

  /* ---------------- LOAD QUESTIONS (BULLETPROOF) ---------------- */
  const { data: questions = [] } = useQuery({
    queryKey: ['lobbyQuestions', quizSetId],
    queryFn: async () => {
      if (!quizSetId) return [];

      // 1️⃣ QuizQuestion → quiz_set_id
      try {
        const q1 = await base44.entities.QuizQuestion.filter(
          { quiz_set_id: quizSetId },
          'order'
        );
        if (q1?.length) return q1;
      } catch {}

      // 2️⃣ LiveQuizQuestion → live_quiz_set_id
      try {
        const q2 = await base44.entities.LiveQuizQuestion.filter(
          { live_quiz_set_id: quizSetId },
          'order'
        );
        if (q2?.length) return q2;
      } catch {}

      // 3️⃣ LiveQuizQuestion → quiz_set_id (legacy)
      try {
        const q3 = await base44.entities.LiveQuizQuestion.filter(
          { quiz_set_id: quizSetId },
          'order'
        );
        if (q3?.length) return q3;
      } catch {}

      return [];
    },
    enabled: !!quizSetId
  });

  /* ---------------- PLAYERS ---------------- */
  const { data: players = [] } = useQuery({
    queryKey: ['liveQuizPlayers', sessionId],
    queryFn: () =>
      base44.entities.LiveQuizPlayer.filter(
        { session_id: sessionId },
        '-created_date'
      ),
    enabled: !!sessionId,
    refetchInterval: 2000
  });

  /* ---------------- END SESSION (SAFE) ---------------- */
  const endSession = async (reason) => {
    try {
      await base44.entities.LiveQuizSession.update(sessionId, {
        status: 'ended',
        ended_at: new Date().toISOString(),
        end_reason: reason
      });
      queryClient.invalidateQueries();
    } catch (e) {
      console.error('Failed to end session', e);
    }
  };

  useEffect(() => {
    const onUnload = () => endSession('teacher_left');
    window.addEventListener('beforeunload', onUnload);
    window.addEventListener('pagehide', onUnload);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
      window.removeEventListener('pagehide', onUnload);
    };
  }, [sessionId]);

  useEffect(() => {
    return () => {
      if (!leavingForPlayRef.current && session?.status !== 'ended') {
        endSession('teacher_navigated_away');
      }
    };
  }, [session?.status]);

  /* ---------------- START QUIZ ---------------- */
  const startMutation = useMutation({
    mutationFn: async () => {
      if (questions.length === 0) {
        throw new Error('This quiz genuinely has no questions.');
      }
      await base44.entities.LiveQuizSession.update(sessionId, {
        status: 'live',
        current_question_index: 0,
        question_started_at: new Date().toISOString(),
        started_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      leavingForPlayRef.current = true;
      navigate(createPageUrl(`TeacherLiveQuizPlay?sessionId=${sessionId}`));
    },
    onError: (e) => alert(e.message)
  });

  if (isLoading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-purple-400" />
      </div>
    );
  }

  if (session.status !== 'lobby') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GlassCard className="p-8 text-center">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <p className="text-white">Session no longer in lobby</p>
          <Button onClick={() => navigate(createPageUrl('TeacherDashboard'))}>
            Back
          </Button>
        </GlassCard>
      </div>
    );
  }

  const joinCode = session.id.substring(0, 6).toUpperCase();

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      <div className="max-w-4xl mx-auto">
        <GlassCard className="p-8 text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-1">
            {quizSet?.title || 'Live Quiz'}
          </h1>
          <p className="text-slate-400 mb-6">
            Waiting for students to join
          </p>

          <div className="inline-flex items-center gap-4 bg-white/10 px-8 py-6 rounded-2xl mb-6">
            <div>
              <p className="text-sm text-slate-400">Join Code</p>
              <p className="text-5xl font-mono font-bold text-white">
                {joinCode}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(joinCode);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? <CheckCircle2 /> : <Copy />}
            </Button>
          </div>

          <p className="text-slate-300 mb-4">
            {players.length} player{players.length !== 1 && 's'} joined
          </p>

          <Button
            onClick={() => startMutation.mutate()}
            disabled={players.length === 0 || startMutation.isPending}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 px-10"
          >
            <Play className="w-4 h-4 mr-2" />
            Start Quiz ({questions.length} questions)
          </Button>
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="text-lg font-bold text-white mb-4">
            Players
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <AnimatePresence>
              {players.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-white/5 p-4 rounded-xl text-white"
                >
                  {i + 1}. {p.nickname}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
