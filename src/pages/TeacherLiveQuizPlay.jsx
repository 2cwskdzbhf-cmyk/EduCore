import React, { useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/ui/GlassCard';
import { ChevronRight, Trophy, Loader2, Clock, X, AlertTriangle } from 'lucide-react';

export default function TeacherLiveQuizPlay() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('sessionId');

  const [timeLeft, setTimeLeft] = useState(15);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const lastSessionRef = useRef(null);

  const { data: sessionRaw } = useQuery({
    queryKey: ['liveQuizSession', sessionId],
    queryFn: async () => {
      const s = await base44.entities.LiveQuizSession.filter({ id: sessionId });
      return s?.[0] || null;
    },
    enabled: !!sessionId,
    refetchInterval: 1000,
    staleTime: 500
  });

  const session = useMemo(() => {
    if (sessionRaw) lastSessionRef.current = sessionRaw;
    return sessionRaw || lastSessionRef.current;
  }, [sessionRaw]);

  useEffect(() => {
    if (session?.status === 'ended') {
      navigate(createPageUrl('TeacherDashboard'), { replace: true });
    }
  }, [session?.status, navigate]);

  // timer
  useEffect(() => {
    if (!session || session.status !== 'live' || !session.question_started_at) return;
    const start = new Date(session.question_started_at).getTime();
    setShowLeaderboard(false);

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const remaining = Math.max(0, 15 - elapsed);
      setTimeLeft(remaining);
      if (remaining === 0) setShowLeaderboard(true);
    }, 200);

    return () => clearInterval(interval);
  }, [session?.status, session?.question_started_at]);

  const { data: players = [] } = useQuery({
    queryKey: ['liveQuizPlayers', sessionId],
    queryFn: () => base44.entities.LiveQuizPlayer.filter({ session_id: sessionId }),
    enabled: !!sessionId,
    refetchInterval: 1200,
    staleTime: 800
  });

  const idx = session?.current_question_index ?? -1;

  const { data: answers = [] } = useQuery({
    queryKey: ['liveQuizAnswers', sessionId, idx],
    queryFn: () =>
      base44.entities.LiveQuizAnswer.filter({
        session_id: sessionId,
        question_index: idx
      }),
    enabled: !!sessionId && idx >= 0,
    refetchInterval: 1200,
    staleTime: 800
  });

  const nextQuestionMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/functions/updateLiveQuizSession', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, action: 'nextQuestion' })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to advance');
      return json.session;
    },
    onSuccess: (s) => {
      if (s?.status === 'ended') {
        navigate(createPageUrl(`TeacherLiveQuizResults?sessionId=${sessionId}`));
      } else {
        setShowLeaderboard(false);
        setTimeLeft(15);
      }
    }
  });

  const endNowMutation = useMutation({
    mutationFn: async () => {
      await fetch('/functions/updateLiveQuizSession', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, action: 'end' })
      });
    },
    onSuccess: () => navigate(createPageUrl('TeacherDashboard'))
  });

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-purple-400" />
      </div>
    );
  }

  if (session.status !== 'live') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <GlassCard className="p-8 text-center max-w-md">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <p className="text-white font-semibold mb-2">Quiz not live yet</p>
          <p className="text-slate-400 mb-6">
            Status: <span className="font-mono">{session.status}</span>
          </p>
          <Button onClick={() => navigate(createPageUrl(`TeacherLiveQuizLobby?sessionId=${sessionId}`))}>
            Back to Lobby
          </Button>
        </GlassCard>
      </div>
    );
  }

  const q = session.current_question;

  // ✅ Don’t error. If the backend is still discovering/caching questions, show loading.
  if (!q) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <GlassCard className="p-8 text-center max-w-md">
          <Loader2 className="w-10 h-10 animate-spin text-purple-400 mx-auto mb-3" />
          <p className="text-white font-semibold mb-2">Loading question…</p>
          <p className="text-slate-400 text-sm">Syncing questions for this session.</p>
        </GlassCard>
      </div>
    );
  }

  const prompt = q?.prompt || q?.question || q?.question_text || q?.text || 'Question';
  const answeredCount = answers.length;

  const leaderboard = players
    .slice()
    .sort((a, b) => (b.total_points || 0) - (a.total_points || 0))
    .map((p, i) => ({ ...p, rank: i + 1 }));

  if (showLeaderboard) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <GlassCard className="p-8 max-w-4xl w-full">
          <div className="text-center mb-6">
            <Trophy className="w-14 h-14 text-amber-400 mx-auto mb-3" />
            <h2 className="text-3xl font-bold text-white">Leaderboard</h2>
            <p className="text-slate-400">
              Question {idx + 1}
            </p>
          </div>

          <div className="space-y-3 mb-6">
            {leaderboard.map((p) => (
              <div key={p.id} className="flex justify-between bg-white/5 p-4 rounded-lg text-white">
                <span>{p.rank}. {p.nickname}</span>
                <span>{p.total_points || 0}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button onClick={() => nextQuestionMutation.mutate()} className="py-6" disabled={nextQuestionMutation.isPending}>
              <ChevronRight className="w-5 h-5 mr-2" />
              Next Question
            </Button>
            <Button
              variant="outline"
              onClick={() => endNowMutation.mutate()}
              className="py-6 border-red-500/30 text-red-400"
            >
              <X className="w-5 h-5 mr-2" />
              End Quiz Now
            </Button>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6 text-white">
          <div>
            <p className="text-sm text-slate-400">Question {idx + 1}</p>
            <p className="text-lg font-bold">{players.length} players</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-purple-500/20 px-4 py-2 rounded-lg">
              <Clock className="w-5 h-5 text-amber-400" />
              <span className="text-2xl font-bold">{timeLeft}s</span>
            </div>
            <Button variant="outline" onClick={() => setShowLeaderboard(true)} className="border-purple-500/30">
              View Leaderboard
            </Button>
          </div>
        </div>

        <GlassCard className="p-8 mb-6">
          <h2 className="text-3xl font-bold text-white text-center mb-4">{prompt}</h2>
          <div className="flex justify-center items-center gap-6 text-slate-300">
            <div className="flex items-center gap-2">
              <span className="text-lg">{answeredCount}</span>
              <span className="text-sm">/ {players.length} answered</span>
            </div>
          </div>
        </GlassCard>

        <div className="text-center">
          <Button onClick={() => setShowLeaderboard(true)} disabled={timeLeft > 0} size="lg" className="px-8 py-6 text-lg">
            {timeLeft > 0 ? `Wait ${timeLeft}s` : 'Show Results'}
          </Button>
        </div>
      </div>
    </div>
  );
}
