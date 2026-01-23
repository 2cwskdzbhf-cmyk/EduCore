import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/ui/GlassCard';
import { ChevronRight, Trophy, Loader2, Clock } from 'lucide-react';

export default function TeacherLiveQuizPlay() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('sessionId');

  const [timeLeft, setTimeLeft] = useState(15);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const { data: session } = useQuery({
    queryKey: ['liveQuizSession', sessionId],
    queryFn: async () => {
      const sessions = await base44.entities.LiveQuizSession.filter({ id: sessionId });
      return sessions[0];
    },
    enabled: !!sessionId,
    refetchInterval: 1000
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['liveQuizQuestions', session?.live_quiz_set_id],
    queryFn: () => base44.entities.LiveQuizQuestion.filter({ live_quiz_set_id: session.live_quiz_set_id }, 'order'),
    enabled: !!session?.live_quiz_set_id
  });

  const { data: players = [] } = useQuery({
    queryKey: ['liveQuizPlayers', sessionId],
    queryFn: () => base44.entities.LiveQuizPlayer.filter({ session_id: sessionId }),
    enabled: !!sessionId,
    refetchInterval: 1000
  });

  const { data: answers = [] } = useQuery({
    queryKey: ['liveQuizAnswers', sessionId, session?.current_question_index],
    queryFn: () => base44.entities.LiveQuizAnswer.filter({ 
      session_id: sessionId,
      question_index: session.current_question_index
    }),
    enabled: !!sessionId && session?.current_question_index >= 0,
    refetchInterval: 1000
  });

  useEffect(() => {
    if (!session || session.status !== 'live') return;

    const questionStartTime = new Date(session.question_started_at).getTime();
    const elapsed = Math.floor((Date.now() - questionStartTime) / 1000);
    const remaining = Math.max(0, 15 - elapsed);
    setTimeLeft(remaining);

    if (remaining === 0 && !showLeaderboard) {
      setShowLeaderboard(true);
    }

    const interval = setInterval(() => {
      const newElapsed = Math.floor((Date.now() - questionStartTime) / 1000);
      const newRemaining = Math.max(0, 15 - newElapsed);
      setTimeLeft(newRemaining);

      if (newRemaining === 0 && !showLeaderboard) {
        setShowLeaderboard(true);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [session, showLeaderboard]);

  const nextQuestionMutation = useMutation({
    mutationFn: async () => {
      const nextIndex = (session.current_question_index || 0) + 1;
      
      if (nextIndex >= questions.length) {
        console.log('[DEBUG] Last question reached, ending quiz');
        await base44.entities.LiveQuizSession.update(sessionId, {
          status: 'ended',
          ended_at: new Date().toISOString()
        });
        return { ended: true };
      }

      console.log('[DEBUG] Moving to next question:', nextIndex + 1);
      await base44.entities.LiveQuizSession.update(sessionId, {
        current_question_index: nextIndex,
        question_started_at: new Date().toISOString()
      });
      return { ended: false };
    },
    onSuccess: (data) => {
      if (data.ended) {
        queryClient.invalidateQueries(['liveQuizSession']);
        queryClient.invalidateQueries(['activeLiveSessions']);
        navigate(createPageUrl(`TeacherLiveQuizResults?sessionId=${sessionId}`));
      } else {
        setShowLeaderboard(false);
        setTimeLeft(15);
        queryClient.invalidateQueries(['liveQuizSession']);
      }
    },
    onError: (error) => {
      console.error('[ERROR] Failed to proceed:', error);
      alert('Failed to proceed: ' + error.message);
    }
  });

  if (!session || !questions.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-purple-400" />
      </div>
    );
  }

  const currentQuestion = questions[session.current_question_index];
  const answeredCount = answers.length;
  const allAnswered = answeredCount === players.length;

  const leaderboard = players
    .map(player => ({
      ...player,
      rank: 0
    }))
    .sort((a, b) => b.total_points - a.total_points)
    .map((player, index) => ({
      ...player,
      rank: index + 1
    }));

  if (showLeaderboard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6 flex items-center justify-center">
        <div className="max-w-4xl w-full">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <GlassCard className="p-8">
              <div className="text-center mb-8">
                <Trophy className="w-16 h-16 text-amber-400 mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-white mb-2">Leaderboard</h2>
                <p className="text-slate-400">
                  Question {session.current_question_index + 1} of {questions.length}
                </p>
              </div>

              <div className="space-y-3 mb-8">
                {leaderboard.map((player, index) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`bg-white/5 rounded-xl p-4 border ${
                      index === 0 ? 'border-amber-400/50' : 'border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                        index === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500' :
                        index === 1 ? 'bg-gradient-to-br from-slate-400 to-slate-500' :
                        index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700' :
                        'bg-gradient-to-br from-purple-500 to-blue-500'
                      }`}>
                        {player.rank}
                      </div>
                      <p className="flex-1 text-white font-medium text-lg">{player.nickname}</p>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-white">{player.total_points}</p>
                        <p className="text-xs text-slate-400">points</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <Button
                onClick={() => nextQuestionMutation.mutate()}
                disabled={nextQuestionMutation.isPending}
                className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-lg py-6"
              >
                {nextQuestionMutation.isPending ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <>
                    {session.current_question_index + 1 < questions.length ? (
                      <>
                        <ChevronRight className="w-5 h-5 mr-2" />
                        Next Question
                      </>
                    ) : (
                      <>
                        <Trophy className="w-5 h-5 mr-2" />
                        Show Final Results
                      </>
                    )}
                  </>
                )}
              </Button>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="text-white">
            <p className="text-sm text-slate-400">Question {session.current_question_index + 1} of {questions.length}</p>
            <p className="text-lg font-bold">{players.length} players</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-white bg-white/10 px-4 py-2 rounded-lg">
              <Clock className="w-5 h-5" />
              <span className="text-2xl font-bold">{timeLeft}s</span>
            </div>
          </div>
        </div>

        <GlassCard className="p-12 text-center mb-6">
          <motion.h2
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-4xl font-bold text-white mb-4"
          >
            {currentQuestion?.prompt}
          </motion.h2>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Responses</h3>
            <p className="text-slate-400">
              {answeredCount} / {players.length} answered
            </p>
          </div>
          <div className="w-full bg-white/5 rounded-full h-3">
            <motion.div
              className="bg-gradient-to-r from-emerald-500 to-teal-500 h-3 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(answeredCount / players.length) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </GlassCard>
      </div>
    </div>
  );
}