import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/ui/GlassCard';
import { Play, Copy, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';

export default function TeacherLiveQuizLobby() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('sessionId');

  const [copied, setCopied] = useState(false);

  // Prevent ending session when we intentionally navigate Lobby -> Play
  const leavingForPlayRef = useRef(false);
  const statusRef = useRef(null);

  /* ---------------- SESSION ---------------- */
  const { data: session, isLoading } = useQuery({
    queryKey: ['liveQuizSession', sessionId],
    queryFn: async () => {
      const s = await base44.entities.LiveQuizSession.filter({ id: sessionId });
      return s?.[0] || null;
    },
    enabled: !!sessionId,
    refetchInterval: 1500
  });

  useEffect(() => {
    statusRef.current = session?.status ?? null;
  }, [session?.status]);

  /* ✅ AUTO-REDIRECT WHEN SESSION STARTS/ENDS */
  useEffect(() => {
    if (!sessionId || !session?.status) return;
    if (session.status === 'live') {
      leavingForPlayRef.current = true;
      navigate(createPageUrl(`TeacherLiveQuizPlay?sessionId=${sessionId}`), { replace: true });
    }
    if (session.status === 'ended') {
      navigate(createPageUrl('TeacherDashboard'), { replace: true });
    }
  }, [session?.status, sessionId, navigate]);

  /* ---------------- QUIZ SET ID (FROM SESSION) ---------------- */
  const quizSetId =
    session?.quiz_set_id ||
    session?.live_quiz_set_id ||
    session?.quiz_id ||
    null;

  /* ---------------- LOAD QUIZ META (only for library quizzes) ---------------- */
  const { data: quizSet } = useQuery({
    queryKey: ['quizSetMeta', quizSetId],
    queryFn: async () => {
      if (!quizSetId || quizSetId === 'manual') return null;
      try {
        const qs = await base44.entities.QuizSet.filter({ id: quizSetId });
        if (qs?.[0]) return qs[0];
      } catch {}
      return null;
    },
    enabled: !!quizSetId && quizSetId !== 'manual'
  });

  /* ---------------- SAFE FILTER HELPER ---------------- */
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

  /* ---------------- LOAD QUESTIONS ---------------- */
  const { data: questions = [] } = useQuery({
    queryKey: ['lobbyQuestions', sessionId, quizSetId, session?.questions_json],
    queryFn: async () => {
      // 1) questions_json embedded directly on the session (manual quizzes from CreateQuiz)
      if (session?.questions_json) {
        try {
          const parsed = JSON.parse(session.questions_json);
          if (Array.isArray(parsed) && parsed.length) return parsed;
        } catch {}
      }

      // 2) QuizQuestion rows linked by quiz_set_id (library quizzes)
      if (quizSetId && quizSetId !== 'manual') {
        const q = await safeFilter('QuizQuestion', { quiz_set_id: quizSetId }, 'order');
        if (q?.length) return q;
      }

      return [];
    },
    enabled: !!sessionId && !!session
  });

  /* ---------------- PLAYERS ---------------- */
  const { data: players = [] } = useQuery({
    queryKey: ['liveQuizPlayers', sessionId],
    queryFn: () => base44.entities.LiveQuizPlayer.filter({ session_id: sessionId }, '-created_date'),
    enabled: !!sessionId,
    refetchInterval: 2000
  });

  /* ---------------- END SESSION (SAFE) ---------------- */
  const endSession = async (reason) => {
    try {
      if (!sessionId) return;
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
    const onBeforeUnload = () => {
      if (leavingForPlayRef.current) return;
      if (statusRef.current === 'lobby') endSession('teacher_left');
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [sessionId]);

  useEffect(() => {
    return () => {
      if (leavingForPlayRef.current) return;
      if (statusRef.current === 'lobby') endSession('teacher_navigated_away');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- START QUIZ ---------------- */
  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('updateLiveQuizSession', { sessionId, action: 'start' });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data?.session;
    },
    onSuccess: () => {
      leavingForPlayRef.current = true;
      navigate(createPageUrl(`TeacherLiveQuizPlay?sessionId=${sessionId}`), { replace: true });
    },
    onError: (e) => alert(e.message)
  });

  /* ---------------- RENDER ---------------- */
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
        <Loader2 className="w-12 h-12 animate-spin text-purple-400" />
      </div>
    );
  }

  const joinCode = session.join_code || session.id.substring(0, 6).toUpperCase();
  const quizTitle = quizSet?.title || (session.questions_json ? 'Manual Quiz' : 'Live Quiz');

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      <div className="max-w-4xl mx-auto">
        <GlassCard className="p-8 text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-1">{quizTitle}</h1>
          <p className="text-slate-400 mb-2">Waiting for students to join</p>
          <p className="text-slate-500 text-sm mb-6">{questions.length} question{questions.length !== 1 ? 's' : ''} loaded</p>

          <div className="inline-flex items-center gap-4 bg-white/10 px-8 py-6 rounded-2xl mb-6">
            <div>
              <p className="text-sm text-slate-400">Join Code</p>
              <p className="text-5xl font-mono font-bold text-white">{joinCode}</p>
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

          {questions.length === 0 && (
            <div className="mb-4 p-4 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-sm flex items-center gap-2 justify-center">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span className="font-semibold">No questions found — go back and add questions before starting</span>
            </div>
          )}

          <Button
            onClick={() => startMutation.mutate()}
            disabled={startMutation.isPending || questions.length === 0}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 px-10 disabled:opacity-50"
          >
            {startMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Start Quiz ({players.length} player{players.length !== 1 ? 's' : ''} ready)
          </Button>
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="text-lg font-bold text-white mb-4">Players</h3>

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

          {players.length === 0 && (
            <p className="text-slate-400 text-center py-8">
              No players yet. Share the join code!
            </p>
          )}
        </GlassCard>
      </div>
    </div>
  );
}