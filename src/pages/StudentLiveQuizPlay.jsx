import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/ui/GlassCard';
import { Trophy, Clock, Loader2, Zap, Target, CheckCircle2 } from 'lucide-react';

export default function StudentLiveQuizPlay() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('sessionId');

  const [user, setUser] = useState(null);
  const [showQuestion, setShowQuestion] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [questionStartTime, setQuestionStartTime] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    fetchUser();
  }, []);

  const { data: session } = useQuery({
    queryKey: ['liveQuizSession', sessionId],
    queryFn: async () => {
      const sessions = await base44.entities.LiveQuizSession.filter({ id: sessionId });
      return sessions[0];
    },
    enabled: !!sessionId,
    refetchInterval: 1000
  });

  const { data: player } = useQuery({
    queryKey: ['myPlayer', sessionId, user?.email],
    queryFn: async () => {
      const players = await base44.entities.LiveQuizPlayer.filter({
        session_id: sessionId,
        student_email: user.email
      });
      return players[0];
    },
    enabled: !!sessionId && !!user,
    refetchInterval: 1000
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['liveQuizQuestions', session?.live_quiz_set_id],
    queryFn: () => base44.entities.LiveQuizQuestion.filter({ live_quiz_set_id: session.live_quiz_set_id }, 'order'),
    enabled: !!session?.live_quiz_set_id
  });

  const { data: players = [] } = useQuery({
    queryKey: ['allPlayers', sessionId],
    queryFn: () => base44.entities.LiveQuizPlayer.filter({ session_id: sessionId }),
    enabled: !!sessionId,
    refetchInterval: 1000
  });

  const currentQuestion = session?.current_question_index >= 0 ? questions[session.current_question_index] : null;

  useEffect(() => {
    if (session?.status === 'live' && currentQuestion && session.question_started_at) {
      const startTime = new Date(session.question_started_at).getTime();
      setQuestionStartTime(startTime);
      setAnswered(false);
      
      setTimeout(() => setShowQuestion(true), 2000);

      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = Math.max(0, 15 - elapsed);
        setTimeLeft(remaining);
      }, 100);

      return () => {
        clearInterval(interval);
        setShowQuestion(false);
      };
    }
  }, [session?.current_question_index, session?.question_started_at, currentQuestion]);

  const answerMutation = useMutation({
    mutationFn: async (answerText) => {
      const responseTime = Date.now() - questionStartTime;
      const isCorrect = answerText.trim().toLowerCase() === currentQuestion.correct_answer.trim().toLowerCase();
      
      const basePoints = 500;
      const speedBonus = Math.max(0, Math.floor((15 - (responseTime / 1000)) * 20));
      const roundMultiplier = 1 + (session.current_question_index * 0.25);
      const pointsAwarded = isCorrect ? Math.floor((basePoints + speedBonus) * roundMultiplier) : 0;

      await base44.entities.LiveQuizAnswer.create({
        session_id: sessionId,
        player_id: player.id,
        question_id: currentQuestion.id,
        question_index: session.current_question_index,
        selected_option: 0,
        is_correct: isCorrect,
        response_time_ms: responseTime,
        points_awarded: pointsAwarded,
        round_multiplier: roundMultiplier
      });

      const newTotalPoints = player.total_points + pointsAwarded;
      const newCorrectCount = player.correct_count + (isCorrect ? 1 : 0);
      const newQuestionsAnswered = player.questions_answered + 1;
      const newStreak = isCorrect ? player.current_streak + 1 : 0;
      const newLongestStreak = Math.max(player.longest_streak, newStreak);
      
      const totalResponseTime = (player.average_response_time_ms * player.questions_answered) + responseTime;
      const newAvgResponseTime = Math.floor(totalResponseTime / newQuestionsAnswered);

      await base44.entities.LiveQuizPlayer.update(player.id, {
        total_points: newTotalPoints,
        correct_count: newCorrectCount,
        questions_answered: newQuestionsAnswered,
        current_streak: newStreak,
        longest_streak: newLongestStreak,
        average_response_time_ms: newAvgResponseTime
      });

      return { isCorrect, pointsAwarded };
    },
    onSuccess: () => {
      setAnswered(true);
      queryClient.invalidateQueries(['myPlayer']);
    }
  });

  if (!session || !player) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-purple-400" />
      </div>
    );
  }

  if (session.status === 'ended') {
    const myRank = players.sort((a, b) => b.total_points - a.total_points).findIndex(p => p.id === player.id) + 1;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl w-full"
        >
          <GlassCard className="p-12 text-center">
            <Trophy className="w-24 h-24 text-amber-400 mx-auto mb-6" />
            <h1 className="text-4xl font-bold text-white mb-4">Quiz Complete!</h1>
            <div className="space-y-4 mb-8">
              <div>
                <p className="text-slate-400 mb-2">Your Rank</p>
                <p className="text-6xl font-bold text-white">#{myRank}</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-slate-400 text-sm mb-1">Points</p>
                  <p className="text-3xl font-bold text-white">{player.total_points}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-1">Correct</p>
                  <p className="text-3xl font-bold text-emerald-400">{player.correct_count}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-1">Streak</p>
                  <p className="text-3xl font-bold text-amber-400">{player.longest_streak}</p>
                </div>
              </div>
            </div>
            <Button
              onClick={() => navigate(createPageUrl('StudentDashboard'))}
              className="bg-gradient-to-r from-purple-500 to-blue-500"
            >
              Back to Dashboard
            </Button>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  if (session.status === 'lobby') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6 flex items-center justify-center">
        <GlassCard className="p-12 text-center max-w-2xl">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Zap className="w-24 h-24 text-amber-400 mx-auto mb-6" />
          </motion.div>
          <h1 className="text-4xl font-bold text-white mb-4">Get Ready!</h1>
          <p className="text-xl text-slate-400 mb-8">Waiting for the teacher to start the quiz...</p>
          <p className="text-slate-500">You're in as <span className="text-white font-bold">{player.nickname}</span></p>
        </GlassCard>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6 flex items-center justify-center">
        <GlassCard className="p-12 text-center">
          <Trophy className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Round Complete!</h2>
          <p className="text-slate-400">Waiting for next question...</p>
          <div className="mt-6 p-4 bg-white/5 rounded-xl">
            <p className="text-4xl font-bold text-white mb-1">{player.total_points}</p>
            <p className="text-sm text-slate-400">your points</p>
          </div>
        </GlassCard>
      </div>
    );
  }

  if (!showQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          <GlassCard className="p-16 text-center">
            <h2 className="text-6xl font-bold text-white mb-4">{currentQuestion.prompt}</h2>
            <p className="text-slate-400">Get ready to answer!</p>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4 text-white">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              <span className="text-2xl font-bold">{player.total_points}</span>
            </div>
            <div className="text-sm text-slate-400">
              {player.nickname}
            </div>
          </div>
          <div className="flex items-center gap-2 text-white bg-white/10 px-4 py-2 rounded-lg">
            <Clock className="w-5 h-5" />
            <span className="text-3xl font-bold">{timeLeft}s</span>
          </div>
        </div>

        <GlassCard className="p-8 mb-6">
          <h2 className="text-3xl font-bold text-white text-center mb-2">{currentQuestion.prompt}</h2>
          <p className="text-center text-slate-400 text-sm">Type your answer below</p>
        </GlassCard>

        {!answered ? (
          <GlassCard className="p-8">
            <form onSubmit={(e) => {
              e.preventDefault();
              const answer = e.target.answer.value;
              if (answer.trim()) {
                answerMutation.mutate(answer);
              }
            }}>
              <input
                name="answer"
                type="text"
                placeholder="Type your answer..."
                disabled={answerMutation.isPending}
                className="w-full bg-white/5 border border-white/10 text-white text-2xl p-6 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                autoFocus
              />
              <Button
                type="submit"
                disabled={answerMutation.isPending}
                className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-xl py-6"
              >
                {answerMutation.isPending ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  'Submit Answer'
                )}
              </Button>
            </form>
          </GlassCard>
        ) : (
          <GlassCard className="p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">Answer Submitted!</h3>
              <p className="text-slate-400">Waiting for other players...</p>
            </motion.div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}