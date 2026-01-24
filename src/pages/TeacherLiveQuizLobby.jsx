import React, { useEffect, useRef, useState, useMemo } from 'react';
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

  // Track latest session status safely (so unmount cleanup doesn't depend on effect deps)
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
    session?.quizSetId ||
    session?.liveQuizSetId ||
    session?.quiz_id ||
    session?.set_id ||
    null;

  /* ---------------- LOAD QUIZ META ---------------- */
  const { data: quizSet } = useQuery({
    queryKey: ['quizSetMeta', quizSetId],
    queryFn: async () => {
      if (!quizSetId) return null;

      // Most likely: QuizSet (your QuizLibrary uses QuizSet)
      try {
        const qs = await base44.entities.QuizSet.filter({ id: quizSetId });
        if (qs?.[0]) return qs[0];
      } catch {}

      // Fallback: LiveQuizSet
      try {
        const lqs = await base44.entities.LiveQuizSet.filter({ id: quizSetId });
        if (lqs?.[0]) return lqs[0];
      } catch {}

      return null;
    },
    enabled: !!quizSetId
  });

  /* ---------------- CANDIDATE IDS TO SEARCH WITH ---------------- */
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
      sessionId // sometimes questions are attached to session
    ].filter(Boolean);

    // unique
    return Array.from(new Set(ids));
  }, [quizSetId, quizSet?.id, sessionId, session]);

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

  /* ---------------- LOAD QUESTIONS (TRULY SCHEMA-PROOF) ---------------- */
  const { data: questionResult } = useQuery({
    queryKey: ['lobbyQuestions', sessionId, quizSetId],
    queryFn: async () => {
      // 0) Questions stored INSIDE the QuizSet row (common)
      const inlineCandidates = [
        quizSet?.questions,
        quizSet?.items,
        quizSet?.question_list,
        quizSet?.quiz_questions,
        quizSet?.content
      ];

      for (const inline of inlineCandidates) {
        if (Array.isArray(inline) && inline.length) {
          return { questions: inline, source: 'QuizSet.inline', tried: [] };
        }
      }

      // 1) Try multiple entities + field names against multiple candidate IDs
      const tried = [];

      const attempts = [];
      for (const id of candidateIds) {
        // Most common combinations
        attempts.push(['QuizQuestion', { quiz_id: id }]);
        attempts.push(['QuizQuestion', { quiz_set_id: id }]);
        attempts.push(['QuizQuestion', { quizSetId: id }]);
        attempts.push(['QuizQuestion', { set_id: id }]);

        attempts.push(['LiveQuizQuestion', { live_quiz_set_id: id }]);
        attempts.push(['LiveQuizQuestion', { quiz_set_id: id }]);
        attempts.push(['LiveQuizQuestion', { session_id: id }]);

        // Other common naming used in builders
        attempts.push(['Question', { quiz_id: id }]);
        attempts.push(['Question', { quiz_set_id: id }]);
        attempts.push(['Question', { set_id: id }]);

        attempts.push(['QuizItem', { quiz_id: id }]);
        attempts.push(['QuizItem', { quiz_set_id: id }]);
      }

      // Run attempts in order and return first match
      for (const [entityName, filter] of attempts) {
        const key = `${entityName} ${JSON.stringify(filter)}`;
        tried.push(key);

        const q = await safeFilter(entityName, filter, 'order');
        if (q?.length) {
          return { questions: q, source: key, tried };
        }
      }

      return { questions: [], source: 'none', tried };
    },
    enabled: !!sessionId && (!!quizSetId || !!session || !!quizSet)
  });

  const questions = questionResult?.questions || [];
  const questionSource = questionResult?.source || 'unknown';
  const tried = questionResult?.tried || [];

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
      if (questions.length === 0) {
        throw new Error('This quiz genuinely has no questions (after all lookup attempts).');
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

  const joinCode = session.id.substring(0, 6).toUpperCase();

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      <div className="max-w-4xl mx-auto">
        <GlassCard className="p-8 text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-1">
            {quizSet?.title || 'Live Quiz'}
          </h1>
          <p className="text-slate-400 mb-6">Waiting for students to join</p>

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
            <div className="mb-4 p-4 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-sm">
              <div className="flex items-center gap-2 justify-center mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-semibold">No questions found for this quiz set</span>
              </div>

              <div className="text-left text-xs text-red-200/90 space-y-1">
                <div><span className="font-semibold">quizSetId:</span> {String(quizSetId)}</div>
                <div><span className="font-semibold">candidateIds tried:</span> {candidateIds.map(String).join(', ')}</div>
                <div><span className="font-semibold">last source attempt:</span> {String(questionSource)}</div>
                <div className="mt-2 text-red-200/70">
                  If this still shows empty, your questions are stored under a different entity/field.
                  Paste the “Question” table/entity name + the field that links it to the quiz.
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={() => startMutation.mutate()}
            disabled={players.length === 0 || questions.length === 0 || startMutation.isPending}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 px-10"
          >
            {startMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Start Quiz ({questions.length} questions)
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
