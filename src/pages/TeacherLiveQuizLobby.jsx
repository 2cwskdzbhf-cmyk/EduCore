import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/ui/GlassCard';
import { Users, Play, X, Copy, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';

export default function TeacherLiveQuizLobby() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('sessionId');

  const [user, setUser] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Prevent ending session when we intentionally navigate Lobby -> Play
  const isTransitioningToPlayRef = useRef(false);

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    fetchUser();
  }, []);

  const { data: session, isLoading } = useQuery({
    queryKey: ['liveQuizSession', sessionId],
    queryFn: async () => {
      const sessions = await base44.entities.LiveQuizSession.filter({ id: sessionId });
      return sessions[0];
    },
    enabled: !!sessionId,
    refetchInterval: 2000
  });

  // ✅ Use either quiz_set_id OR live_quiz_set_id (compat)
  const quizSetId = session?.quiz_set_id || session?.live_quiz_set_id || null;

  const { data: quizSet } = useQuery({
    queryKey: ['quizSetForLobby', quizSetId],
    queryFn: async () => {
      if (!quizSetId) return null;

      // Try QuizSet first, fallback to LiveQuizSet
      try {
        const sets = await base44.entities.QuizSet.filter({ id: quizSetId });
        if (sets?.[0]) return sets[0];
      } catch (e) {}

      const liveSets = await base44.entities.LiveQuizSet.filter({ id: quizSetId });
      return liveSets?.[0] || null;
    },
    enabled: !!quizSetId
  });

  const { data: players = [] } = useQuery({
    queryKey: ['liveQuizPlayers', sessionId],
    queryFn: () => base44.entities.LiveQuizPlayer.filter({ session_id: sessionId }, '-created_date'),
    enabled: !!sessionId,
    refetchInterval: 2000
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['questionsForLobby', quizSetId],
    queryFn: async () => {
      if (!quizSetId) return [];

      // Try QuizQuestion first, fallback to LiveQuizQuestion
      try {
        const qs = await base44.entities.QuizQuestion.filter({ quiz_set_id: quizSetId }, 'order');
        if (qs?.length) return qs;
      } catch (e) {}

      const lqs = await base44.entities.LiveQuizQuestion.filter({ live_quiz_set_id: quizSetId }, 'order');
      return lqs || [];
    },
    enabled: !!quizSetId
  });

  // ✅ Core fix: end session function
  const endSession = async (reason = 'teacher_left') => {
    try {
      if (!sessionId) return;
      await base44.entities.LiveQuizSession.update(sessionId, {
        status: 'ended',
        ended_at: new Date().toISOString(),
        end_reason: reason
      });
      queryClient.invalidateQueries(['liveQuizSession']);
      queryClient.invalidateQueries(['activeLiveSessions']);
    } catch (e) {
      console.error('[TEACHER] Failed to end session:', e);
    }
  };

  // ✅ End on tab close / refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      // best-effort (cannot await here)
      endSession('teacher_beforeunload');
    };
    const handlePageHide = () => {
      endSession('teacher_pagehide');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // ✅ End on leaving this page (unmount), except when we intentionally go to play
  useEffect(() => {
    return () => {
      if (isTransitioningToPlayRef.current) return;
      // Only end if still active-ish
      if (session?.status === 'lobby' || session?.status === 'live') {
        endSession('teacher_navigated_away');
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.status, sessionId]);

  const startGameMutation = useMutation({
    mutationFn: async () => {
      if (questions.length === 0) {
        throw new Error('No questions in this live quiz. Please add questions before starting.');
      }

      const updateData = {
        status: 'live',
        current_question_index: 0,
        question_started_at: new Date().toISOString(),
        started_at: new Date().toISOString()
      };

      const result = await base44.entities.LiveQuizSession.update(sessionId, updateData);

      queryClient.invalidateQueries(['liveQuizSession']);
      queryClient.invalidateQueries(['activeLiveSessions']);

      return result;
    },
    onSuccess: () => {
      isTransitioningToPlayRef.current = true;
      navigate(createPageUrl(`TeacherLiveQuizPlay?sessionId=${sessionId}`));
    },
    onError: (error) => {
      alert('Failed to start game: ' + (error.message || 'Unknown error'));
    }
  });

  const endQuizMutation = useMutation({
    mutationFn: async () => {
      await endSession('ended_button');
    },
    onSuccess: () => {
      navigate(createPageUrl('TeacherDashboard'));
    },
    onError: (error) => {
      alert('Failed to end quiz: ' + (error.message || 'Unknown error'));
    }
  });

  const copyCode = () => {
    if (session?.id) {
      navigator.clipboard.writeText(session.id.substring(0, 6).toUpperCase());
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-purple-400" />
      </div>
    );
  }

  if (!session || session.status !== 'lobby') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6 flex items-center justify-center">
        <GlassCard className="p-8 text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Session Not Available</h2>
          <p className="text-slate-400 mb-6">This live quiz session is no longer in the lobby.</p>
          <Button onClick={() => navigate(createPageUrl('TeacherDashboard'))}>
            Back to Dashboard
          </Button>
        </GlassCard>
      </div>
    );
  }

  const joinCode = session.id.substring(0, 6).toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard className="p-8 text-center mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">{quizSet?.title || 'Live Quiz'}</h1>
            <p className="text-slate-400 mb-6">Waiting for players to join...</p>

            <div className="inline-flex items-center gap-4 bg-white/10 rounded-2xl px-8 py-6 mb-6">
              <div>
                <p className="text-sm text-slate-400 mb-1">Join Code</p>
                <p className="text-5xl font-bold text-white font-mono tracking-wider">{joinCode}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={copyCode}
                className="border-white/20 text-white hover:bg-white/10"
              >
                {copiedCode ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>

            <div className="flex items-center justify-center gap-2 text-slate-400 mb-8">
              <Users className="w-5 h-5" />
              <span className="text-2xl font-bold text-white">{players.length}</span>
              <span>players joined</span>
            </div>

            {questions.length === 0 && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm flex items-center gap-2 justify-center">
                <AlertTriangle className="w-4 h-4" />
                No questions in this live quiz
              </div>
            )}

            <div className="flex gap-4 justify-center">
              <Button
                onClick={() => startGameMutation.mutate()}
                disabled={players.length === 0 || questions.length === 0 || startGameMutation.isPending}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/30 px-8"
              >
                {startGameMutation.isPending ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Play className="w-5 h-5 mr-2" />
                )}
                Start Game
              </Button>

              <Button
                variant="outline"
                onClick={() => endQuizMutation.mutate()}
                disabled={endQuizMutation.isPending}
                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                {endQuizMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <X className="w-4 h-4 mr-2" />
                )}
                End Quiz
              </Button>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-lg font-bold text-white mb-4">Players ({players.length})</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <AnimatePresence>
                {players.map((player, index) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="bg-white/5 rounded-xl p-4 border border-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                        {index + 1}
                      </div>
                      <p className="text-white font-medium truncate">{player.nickname}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {players.length === 0 && (
              <p className="text-slate-400 text-center py-8">No players yet. Share the join code!</p>
            )}
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}
