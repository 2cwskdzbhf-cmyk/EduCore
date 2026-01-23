import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/ui/GlassCard';
import { Trophy, Home, Loader2, Medal } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function TeacherLiveQuizResults() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('sessionId');

  const { data: session } = useQuery({
    queryKey: ['liveQuizSession', sessionId],
    queryFn: async () => {
      const sessions = await base44.entities.LiveQuizSession.filter({ id: sessionId });
      return sessions[0];
    },
    enabled: !!sessionId
  });

  const { data: players = [] } = useQuery({
    queryKey: ['liveQuizPlayers', sessionId],
    queryFn: () => base44.entities.LiveQuizPlayer.filter({ session_id: sessionId }),
    enabled: !!sessionId
  });

  useEffect(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  }, []);

  if (!session || !players.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-purple-400" />
      </div>
    );
  }

  const leaderboard = players
    .sort((a, b) => b.total_points - a.total_points)
    .map((player, index) => ({
      ...player,
      rank: index + 1
    }));

  const topThree = leaderboard.slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-12">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', duration: 0.8 }}
            >
              <Trophy className="w-24 h-24 text-amber-400 mx-auto mb-4" />
            </motion.div>
            <h1 className="text-4xl font-bold text-white mb-2">Quiz Complete!</h1>
            <p className="text-slate-400">Final Results</p>
          </div>

          {topThree.length >= 3 && (
            <div className="flex items-end justify-center gap-4 mb-12">
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center"
              >
                <GlassCard className="p-6 bg-gradient-to-br from-slate-400/20 to-slate-500/20 border-slate-400/30">
                  <Medal className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white mb-1">{topThree[1]?.nickname}</p>
                  <p className="text-3xl font-bold text-slate-300">{topThree[1]?.total_points}</p>
                  <p className="text-xs text-slate-400">points</p>
                </GlassCard>
                <div className="h-20 bg-slate-500/20 rounded-t-xl mt-4" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-center"
              >
                <GlassCard className="p-8 bg-gradient-to-br from-amber-400/20 to-orange-500/20 border-amber-400/50">
                  <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-white mb-2">{topThree[0]?.nickname}</p>
                  <p className="text-4xl font-bold text-amber-400">{topThree[0]?.total_points}</p>
                  <p className="text-xs text-slate-400">points</p>
                </GlassCard>
                <div className="h-32 bg-amber-500/20 rounded-t-xl mt-4" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center"
              >
                <GlassCard className="p-6 bg-gradient-to-br from-amber-600/20 to-amber-700/20 border-amber-600/30">
                  <Medal className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white mb-1">{topThree[2]?.nickname}</p>
                  <p className="text-3xl font-bold text-amber-500">{topThree[2]?.total_points}</p>
                  <p className="text-xs text-slate-400">points</p>
                </GlassCard>
                <div className="h-16 bg-amber-600/20 rounded-t-xl mt-4" />
              </motion.div>
            </div>
          )}

          <GlassCard className="p-8 mb-6">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Full Leaderboard</h2>
            <div className="space-y-3">
              {leaderboard.map((player, index) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-white/5 rounded-xl p-4 border ${
                    index === 0 ? 'border-amber-400/50 bg-amber-500/5' : 'border-white/10'
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
                    <div className="flex-1">
                      <p className="text-white font-medium text-lg">{player.nickname}</p>
                      <div className="flex gap-4 text-xs text-slate-400">
                        <span>{player.correct_count} correct</span>
                        <span>{player.questions_answered} answered</span>
                        {player.average_response_time_ms > 0 && (
                          <span>{(player.average_response_time_ms / 1000).toFixed(1)}s avg</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-white">{player.total_points}</p>
                      <p className="text-xs text-slate-400">points</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </GlassCard>

          <div className="text-center">
            <Button
              onClick={() => navigate(createPageUrl('TeacherDashboard'))}
              className="bg-gradient-to-r from-purple-500 to-blue-500"
            >
              <Home className="w-5 h-5 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}