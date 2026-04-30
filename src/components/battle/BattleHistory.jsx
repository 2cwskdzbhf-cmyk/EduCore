import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Trophy, Swords } from 'lucide-react';
import { format } from 'date-fns';

export default function BattleHistory({ classId, userEmail }) {
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['battleHistory', classId, userEmail],
    queryFn: async () => {
      const all = await base44.entities.BattleSession.filter({ class_id: classId });
      return all
        .filter(s =>
          s.status === 'finished' &&
          (s.challenger_email === userEmail || s.opponent_email === userEmail)
        )
        .sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date))
        .slice(0, 20);
    },
    enabled: !!classId && !!userEmail,
    staleTime: 10000,
  });

  if (isLoading) return (
    <div className="flex items-center justify-center py-12">
      <div className="w-6 h-6 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (sessions.length === 0) return (
    <div className="text-center py-16 text-slate-500">
      <Swords className="w-12 h-12 mx-auto mb-3 opacity-30" />
      <p className="font-semibold">No battle history yet</p>
      <p className="text-sm mt-1">Challenge a classmate to get started!</p>
    </div>
  );

  const wins = sessions.filter(s => s.winner_email === userEmail).length;
  const losses = sessions.length - wins;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center bg-white/5 rounded-xl p-3 border border-white/10">
          <p className="text-2xl font-black text-white">{sessions.length}</p>
          <p className="text-slate-400 text-xs">Battles</p>
        </div>
        <div className="text-center bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/20">
          <p className="text-2xl font-black text-emerald-400">{wins}</p>
          <p className="text-slate-400 text-xs">Wins</p>
        </div>
        <div className="text-center bg-red-500/10 rounded-xl p-3 border border-red-500/20">
          <p className="text-2xl font-black text-red-400">{losses}</p>
          <p className="text-slate-400 text-xs">Losses</p>
        </div>
      </div>

      {/* Match list */}
      <div className="space-y-2">
        {sessions.map((s, idx) => {
          const isWinner = s.winner_email === userEmail;
          const isChallenger = s.challenger_email === userEmail;
          const myScore = isChallenger ? s.challenger_score : s.opponent_score;
          const oppScore = isChallenger ? s.opponent_score : s.challenger_score;
          const oppName = isChallenger
            ? (s.opponent_name || s.opponent_email?.split('@')[0])
            : (s.challenger_name || s.challenger_email?.split('@')[0]);

          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.04 }}
              className={`flex items-center gap-3 p-4 rounded-2xl border ${
                isWinner
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-red-500/20 bg-red-500/5'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                isWinner ? 'bg-emerald-500/20' : 'bg-red-500/20'
              }`}>
                {isWinner ? <Trophy className="w-5 h-5 text-emerald-400" /> : <Swords className="w-5 h-5 text-red-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm">vs {oppName}</p>
                <p className="text-slate-500 text-xs">
                  {s.updated_date ? format(new Date(s.updated_date), 'dd MMM yyyy · HH:mm') : ''}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`font-black text-lg ${isWinner ? 'text-emerald-400' : 'text-red-400'}`}>
                  {myScore} – {oppScore}
                </p>
                <p className={`text-xs font-bold ${isWinner ? 'text-emerald-500' : 'text-red-500'}`}>
                  {isWinner ? 'WIN' : 'LOSS'}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}