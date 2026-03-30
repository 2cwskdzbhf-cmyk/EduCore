import React, { useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/ui/GlassCard';
import { ChevronRight, Trophy, Loader2, Clock, X, CheckCircle2, Circle, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const QUESTION_TIME = 15; // seconds
const LEADERBOARD_AUTO_ADVANCE_SEC = 8; // auto-advance after N seconds on leaderboard

export default function TeacherLiveQuizPlay() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('sessionId');

  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [leaderboardCountdown, setLeaderboardCountdown] = useState(LEADERBOARD_AUTO_ADVANCE_SEC);

  // prevent double-advancing
  const advancingRef = useRef(false);
  const lastStartedAtRef = useRef(null);

  const { data: session } = useQuery({
    queryKey: ['teacherSession', sessionId],
    queryFn: async () => {
      const s = await base44.entities.LiveQuizSession.filter({ id: sessionId });
      return s?.[0] || null;
    },
    enabled: !!sessionId,
    refetchInterval: 1000,
    staleTime: 500,
  });

  const { data: players = [] } = useQuery({
    queryKey: ['teacherPlayers', sessionId],
    queryFn: () => base44.entities.LiveQuizPlayer.filter({ session_id: sessionId }),
    enabled: !!sessionId,
    refetchInterval: 1500,
  });

  const idx = session?.current_question_index ?? -1;

  const { data: answers = [] } = useQuery({
    queryKey: ['teacherAnswers', sessionId, idx],
    queryFn: () => base44.entities.LiveQuizAnswer.filter({ session_id: sessionId, question_index: idx }),
    enabled: !!sessionId && idx >= 0,
    refetchInterval: 1000,
  });

  // Redirect when ended
  useEffect(() => {
    if (session?.status === 'ended') {
      navigate(createPageUrl(`TeacherLiveQuizResults?sessionId=${sessionId}`), { replace: true });
    }
  }, [session?.status, navigate, sessionId]);

  // Question countdown — reset when question changes
  useEffect(() => {
    const startedAt = session?.question_started_at;
    if (!startedAt || session?.status !== 'live') return;
    if (startedAt === lastStartedAtRef.current) return;
    lastStartedAtRef.current = startedAt;
    advancingRef.current = false;
    setTimeLeft(QUESTION_TIME);
    setLeaderboardCountdown(LEADERBOARD_AUTO_ADVANCE_SEC);

    const start = new Date(startedAt).getTime();
    const interval = setInterval(() => {
      const remaining = Math.max(0, QUESTION_TIME - Math.floor((Date.now() - start) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 200);
    return () => clearInterval(interval);
  }, [session?.question_started_at, session?.status]);

  const showLeaderboardMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('updateLiveQuizSession', { sessionId, action: 'showLeaderboard' });
      if (res.data?.error) throw new Error(res.data.error);
    },
  });

  const nextQuestionMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('updateLiveQuizSession', { sessionId, action: 'nextQuestion' });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data?.session;
    },
    onSuccess: () => {
      advancingRef.current = false;
      setLeaderboardCountdown(LEADERBOARD_AUTO_ADVANCE_SEC);
    },
  });

  const endQuizMutation = useMutation({
    mutationFn: async () => {
      await base44.functions.invoke('updateLiveQuizSession', { sessionId, action: 'end' });
    },
    onSuccess: () => navigate(createPageUrl(`TeacherLiveQuizResults?sessionId=${sessionId}`)),
  });

  // Auto show leaderboard when timer hits 0 (and all answered or time's up)
  useEffect(() => {
    if (session?.status !== 'live') return;
    const allAnswered = players.length > 0 && answers.length >= players.length;
    if ((timeLeft === 0 || allAnswered) && !advancingRef.current) {
      advancingRef.current = true;
      setTimeout(() => showLeaderboardMutation.mutate(), 1500);
    }
  }, [timeLeft, answers.length, players.length, session?.status]);

  // Auto advance from leaderboard after N seconds
  useEffect(() => {
    if (session?.status !== 'intermission') return;
    setLeaderboardCountdown(LEADERBOARD_AUTO_ADVANCE_SEC);
    const interval = setInterval(() => {
      setLeaderboardCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!advancingRef.current) {
            advancingRef.current = true;
            nextQuestionMutation.mutate();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [session?.status, session?.current_question_index]);

  const leaderboard = useMemo(() =>
    [...players].sort((a, b) => (b.total_points || 0) - (a.total_points || 0)).map((p, i) => ({ ...p, rank: i + 1 })),
    [players]
  );

  const questions = useMemo(() => {
    const raw = session?.questions || [];
    return Array.isArray(raw) ? raw : [];
  }, [session?.questions]);

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-purple-400" />
      </div>
    );
  }

  const q = session.current_question;
  const prompt = q?.prompt || q?.question || q?.question_text || q?.text || '';
  const answeredCount = answers.length;
  const answeredIds = new Set(answers.map(a => a.player_id));
  const allAnswered = players.length > 0 && answeredCount >= players.length;
  const medals = ['🥇', '🥈', '🥉'];

  // ── LEADERBOARD / INTERMISSION ──────────────────────────────────────────────
  if (session.status === 'intermission') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6 flex items-center justify-center">
        <div className="max-w-2xl w-full space-y-4">
          <GlassCard className="p-8 text-center">
            <Trophy className="w-14 h-14 text-amber-400 mx-auto mb-3" />
            <h2 className="text-3xl font-bold text-white mb-1">Leaderboard</h2>
            <p className="text-slate-400 mb-6">After question {idx + 1}</p>

            <div className="space-y-3 mb-6">
              {leaderboard.slice(0, 10).map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center justify-between bg-white/5 p-4 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl w-8 text-center">{medals[i] || `#${i + 1}`}</span>
                    <span className="text-white font-semibold">{p.nickname}</span>
                  </div>
                  <span className="text-amber-400 font-bold text-lg">{p.total_points || 0}</span>
                </motion.div>
              ))}
            </div>

            {/* Auto-advance countdown */}
            <div className="mb-4 text-center">
              <p className="text-slate-400 text-sm">Next question in</p>
              <p className="text-4xl font-bold text-purple-400">{leaderboardCountdown}s</p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => { advancingRef.current = true; nextQuestionMutation.mutate(); }}
                disabled={nextQuestionMutation.isPending}
                className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 py-4 text-lg"
              >
                {nextQuestionMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <><ChevronRight className="w-5 h-5 mr-2" /> Next Question Now</>
                )}
              </Button>
              <Button
                onClick={() => endQuizMutation.mutate()}
                disabled={endQuizMutation.isPending}
                variant="outline"
                className="border-red-500/30 text-red-400 hover:bg-red-500/10 py-4"
              >
                <X className="w-5 h-5 mr-2" /> End Quiz
              </Button>
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  // ── LIVE QUESTION ────────────────────────────────────────────────────────────
  if (session.status === 'live' && !q) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Header bar */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm">Question {idx + 1} {questions.length > 0 ? `of ${questions.length}` : ''}</p>
            <p className="text-white font-bold">{players.length} players</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Timer */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-2xl ${timeLeft <= 5 ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white'}`}>
              <Clock className="w-5 h-5" />
              <span className="tabular-nums">{timeLeft}s</span>
            </div>
            <Button
              onClick={() => endQuizMutation.mutate()}
              variant="outline"
              size="sm"
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              <X className="w-4 h-4 mr-1" /> End
            </Button>
          </div>
        </div>

        {/* Question */}
        <GlassCard className="p-8 text-center">
          <h2 className="text-3xl font-bold text-white">{prompt}</h2>
          <div className="mt-4 flex items-center justify-center gap-6 text-slate-300">
            <span>{answeredCount} / {players.length} answered</span>
            {allAnswered && (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> All answered!
              </span>
            )}
          </div>
        </GlassCard>

        {/* Player grid */}
        <GlassCard className="p-5">
          <h3 className="text-white font-semibold mb-3">Responses</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            <AnimatePresence>
              {players.map(player => {
                const answered = answeredIds.has(player.id);
                return (
                  <motion.div
                    key={player.id}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                      answered ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/10'
                    }`}
                  >
                    {answered ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-sm font-medium truncate">{player.nickname}</p>
                      <p className="text-xs text-amber-400">{player.total_points || 0} pts</p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </GlassCard>

        {/* Leaderboard side-panel */}
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="text-white font-semibold">Leaderboard</h3>
          </div>
          <div className="space-y-2">
            {leaderboard.slice(0, 5).map((p, i) => (
              <div key={p.id} className="flex items-center justify-between bg-white/5 p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-lg w-6 text-center">{medals[i] || `${i + 1}`}</span>
                  <span className="text-white">{p.nickname}</span>
                  {answeredIds.has(p.id) && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                </div>
                <span className="text-amber-400 font-bold">{p.total_points || 0}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Manual override: show results early */}
        <div className="flex gap-3">
          <Button
            onClick={() => { advancingRef.current = true; showLeaderboardMutation.mutate(); }}
            disabled={showLeaderboardMutation.isPending || (!allAnswered && timeLeft > 0)}
            className="flex-1 py-4 text-lg bg-gradient-to-r from-purple-500 to-blue-500 disabled:opacity-50"
          >
            {showLeaderboardMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : allAnswered ? (
              <><Zap className="w-5 h-5 mr-2" /> All Answered — Show Results</>
            ) : (
              `Waiting… (${timeLeft}s)`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}