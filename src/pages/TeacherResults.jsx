import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import GlassCard from '@/components/ui/GlassCard';
import {
  Trophy, Home, Loader2, Medal, Flame, Target,
  Clock, CheckCircle2, XCircle, ChevronLeft, Users, Zap
} from 'lucide-react';

export default function TeacherResults() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('sessionId');

  const { data: session } = useQuery({
    queryKey: ['resultsSession', sessionId],
    queryFn: async () => {
      const s = await base44.entities.LiveQuizSession.filter({ id: sessionId });
      return s?.[0] || null;
    },
    enabled: !!sessionId
  });

  const { data: players = [] } = useQuery({
    queryKey: ['resultsPlayers', sessionId],
    queryFn: () => base44.entities.LiveQuizPlayer.filter({ session_id: sessionId }),
    enabled: !!sessionId
  });

  const { data: answers = [] } = useQuery({
    queryKey: ['resultsAnswers', sessionId],
    queryFn: () => base44.entities.LiveQuizAnswer.filter({ session_id: sessionId }),
    enabled: !!sessionId
  });

  // Parse questions from session
  const questions = useMemo(() => {
    if (!session) return [];
    try {
      const raw = session.questions_json || session.questions;
      if (!raw) return [];
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [session]);

  // Leaderboard: sort players by total_points desc
  const leaderboard = useMemo(() =>
    [...players].sort((a, b) => b.total_points - a.total_points),
    [players]
  );

  // Question heatmap: for each question index, compute accuracy % and avg response time
  const questionStats = useMemo(() => {
    return questions.map((q, idx) => {
      const qAnswers = answers.filter(a => a.question_index === idx);
      const total = qAnswers.length;
      const correct = qAnswers.filter(a => a.is_correct).length;
      const accuracy = total > 0 ? Math.round((correct / total) * 100) : null;
      const avgTime = total > 0
        ? Math.round(qAnswers.reduce((s, a) => s + (a.response_time_ms || 0), 0) / total / 1000 * 10) / 10
        : null;
      return { idx, prompt: q.prompt || `Question ${idx + 1}`, total, correct, accuracy, avgTime };
    });
  }, [questions, answers]);

  // Per-student summary: accuracy and avg speed per player
  const studentSummary = useMemo(() => {
    return leaderboard.map(player => {
      const pAnswers = answers.filter(a => a.player_id === player.id);
      const total = pAnswers.length;
      const correct = pAnswers.filter(a => a.is_correct).length;
      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
      const avgTime = total > 0
        ? Math.round(pAnswers.reduce((s, a) => s + (a.response_time_ms || 0), 0) / total / 100) / 10
        : 0;
      return { ...player, accuracy, avgTime, answeredCount: total, correctCount: correct };
    });
  }, [leaderboard, answers]);

  const isLoading = !session || !players.length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-purple-400" />
      </div>
    );
  }

  const getHeatmapColor = (accuracy) => {
    if (accuracy === null) return 'bg-white/5 border-white/10';
    if (accuracy >= 80) return 'bg-green-500/20 border-green-500/40';
    if (accuracy >= 60) return 'bg-yellow-500/20 border-yellow-500/40';
    if (accuracy >= 40) return 'bg-orange-500/20 border-orange-500/40';
    return 'bg-red-500/20 border-red-500/40';
  };

  const getHeatmapTextColor = (accuracy) => {
    if (accuracy === null) return 'text-slate-400';
    if (accuracy >= 80) return 'text-green-300';
    if (accuracy >= 60) return 'text-yellow-300';
    if (accuracy >= 40) return 'text-orange-300';
    return 'text-red-300';
  };

  const topThree = leaderboard.slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Button variant="ghost" onClick={() => navigate(createPageUrl('TeacherDashboard'))} className="text-slate-400 hover:text-white mb-4">
            <ChevronLeft className="w-5 h-5 mr-1" /> Dashboard
          </Button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
              <Trophy className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Quiz Results</h1>
              <p className="text-slate-400">{players.length} player{players.length !== 1 ? 's' : ''} · {questions.length} question{questions.length !== 1 ? 's' : ''} · {answers.length} total answers</p>
            </div>
          </div>
        </motion.div>

        {/* Top 3 Podium */}
        {topThree.length >= 2 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8">
            <GlassCard className="p-8">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" /> Top Players
              </h2>
              <div className="flex items-end justify-center gap-6">
                {/* 2nd */}
                {topThree[1] && (
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-2 shadow-lg">
                      2
                    </div>
                    <p className="text-white font-semibold">{topThree[1].nickname}</p>
                    <p className="text-2xl font-bold text-slate-300">{topThree[1].total_points}</p>
                    <p className="text-xs text-slate-500">pts</p>
                    <div className="h-16 w-24 bg-slate-500/20 rounded-t-xl mt-3 mx-auto" />
                  </div>
                )}
                {/* 1st */}
                {topThree[0] && (
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-2 shadow-lg shadow-amber-500/30">
                      👑
                    </div>
                    <p className="text-white font-bold text-lg">{topThree[0].nickname}</p>
                    <p className="text-3xl font-bold text-amber-400">{topThree[0].total_points}</p>
                    <p className="text-xs text-slate-500">pts</p>
                    <div className="h-28 w-24 bg-amber-500/20 rounded-t-xl mt-3 mx-auto" />
                  </div>
                )}
                {/* 3rd */}
                {topThree[2] && (
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-2 shadow-lg">
                      3
                    </div>
                    <p className="text-white font-semibold">{topThree[2].nickname}</p>
                    <p className="text-2xl font-bold text-amber-600">{topThree[2].total_points}</p>
                    <p className="text-xs text-slate-500">pts</p>
                    <div className="h-10 w-24 bg-amber-700/20 rounded-t-xl mt-3 mx-auto" />
                  </div>
                )}
              </div>
            </GlassCard>
          </motion.div>
        )}

        <div className="grid lg:grid-cols-2 gap-8 mb-8">

          {/* Full Leaderboard */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <GlassCard className="p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Medal className="w-5 h-5 text-purple-400" /> Full Leaderboard
              </h2>
              <div className="space-y-2">
                {leaderboard.map((player, index) => (
                  <div
                    key={player.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border ${
                      index === 0 ? 'border-amber-400/40 bg-amber-500/10' : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                      index === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500' :
                      index === 1 ? 'bg-gradient-to-br from-slate-400 to-slate-500' :
                      index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800' :
                      'bg-white/10'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{player.nickname}</p>
                      <p className="text-xs text-slate-400">{player.correct_count}/{player.questions_answered} correct</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold">{player.total_points}</p>
                      <p className="text-xs text-slate-500">pts</p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          {/* Question Heatmap */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <GlassCard className="p-6">
              <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-400" /> Question Difficulty Heatmap
              </h2>
              <p className="text-xs text-slate-400 mb-4">Class accuracy per question — red = hardest</p>

              {questionStats.length === 0 ? (
                <p className="text-slate-400 text-center py-8">No question data available</p>
              ) : (
                <div className="space-y-2">
                  {questionStats.map((qs) => (
                    <div key={qs.idx} className={`p-3 rounded-xl border ${getHeatmapColor(qs.accuracy)}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium leading-snug line-clamp-2">
                            <span className="text-slate-500 mr-1">Q{qs.idx + 1}.</span>
                            {qs.prompt}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Users className="w-3 h-3" /> {qs.total} answered
                            </span>
                            {qs.avgTime !== null && (
                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {qs.avgTime}s avg
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className={`text-2xl font-bold ${getHeatmapTextColor(qs.accuracy)}`}>
                            {qs.accuracy !== null ? `${qs.accuracy}%` : '—'}
                          </p>
                          <p className="text-xs text-slate-500">accuracy</p>
                        </div>
                      </div>
                      {/* Bar */}
                      {qs.accuracy !== null && (
                        <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              qs.accuracy >= 80 ? 'bg-green-400' :
                              qs.accuracy >= 60 ? 'bg-yellow-400' :
                              qs.accuracy >= 40 ? 'bg-orange-400' : 'bg-red-400'
                            }`}
                            style={{ width: `${qs.accuracy}%` }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </motion.div>
        </div>

        {/* Per-Student Summary */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-8">
          <GlassCard className="p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" /> Per-Student Summary
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 px-3 text-slate-400 font-medium">Rank</th>
                    <th className="text-left py-2 px-3 text-slate-400 font-medium">Player</th>
                    <th className="text-right py-2 px-3 text-slate-400 font-medium">Points</th>
                    <th className="text-right py-2 px-3 text-slate-400 font-medium">Accuracy</th>
                    <th className="text-right py-2 px-3 text-slate-400 font-medium">Correct</th>
                    <th className="text-right py-2 px-3 text-slate-400 font-medium">Avg Speed</th>
                    <th className="text-right py-2 px-3 text-slate-400 font-medium">Streak</th>
                  </tr>
                </thead>
                <tbody>
                  {studentSummary.map((player, index) => (
                    <tr key={player.id} className={`border-b border-white/5 ${index === 0 ? 'bg-amber-500/5' : ''}`}>
                      <td className="py-3 px-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                          index === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500' :
                          index === 1 ? 'bg-gradient-to-br from-slate-400 to-slate-500' :
                          index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800' :
                          'bg-white/10'
                        }`}>
                          {index + 1}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <p className="text-white font-medium">{player.nickname}</p>
                        {player.student_email && (
                          <p className="text-xs text-slate-500">{player.student_email}</p>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-white font-bold">{player.total_points}</span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Badge className={
                          player.accuracy >= 80 ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                          player.accuracy >= 60 ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                          'bg-red-500/20 text-red-300 border-red-500/30'
                        }>
                          {player.accuracy}%
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-slate-300">{player.correctCount}/{player.answeredCount}</span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-slate-300 flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {player.avgTime > 0 ? `${player.avgTime}s` : '—'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {player.longest_streak > 1 ? (
                          <span className="text-orange-300 flex items-center justify-end gap-1">
                            <Flame className="w-3 h-3" /> {player.longest_streak}
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </motion.div>

        <div className="text-center">
          <Button
            onClick={() => navigate(createPageUrl('TeacherDashboard'))}
            className="bg-gradient-to-r from-purple-500 to-blue-500"
          >
            <Home className="w-5 h-5 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}