import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Trophy, Swords } from 'lucide-react';

export default function BattleLeaderboard({ classId, studentEmails }) {
  const { data: wins = [] } = useQuery({
    queryKey: ['battleWins', classId],
    queryFn: () => base44.entities.BattleWin.filter({ class_id: classId }),
    enabled: !!classId,
    refetchInterval: 10000
  });

  // Aggregate wins per student
  const winsMap = {};
  wins.forEach(w => {
    winsMap[w.winner_email] = winsMap[w.winner_email] || { email: w.winner_email, name: w.winner_name, wins: 0, losses: 0 };
    winsMap[w.winner_email].wins++;
    winsMap[w.loser_email] = winsMap[w.loser_email] || { email: w.loser_email, name: w.loser_name, wins: 0, losses: 0 };
    winsMap[w.loser_email].losses++;
  });

  // Ensure all class students appear
  studentEmails.forEach(email => {
    if (!winsMap[email]) {
      winsMap[email] = { email, name: email.split('@')[0], wins: 0, losses: 0 };
    }
  });

  const leaderboard = Object.values(winsMap).sort((a, b) => b.wins - a.wins || a.losses - b.losses);
  const medalEmojis = ['🥇', '🥈', '🥉'];

  return (
    <div>
      <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-amber-400" />
        Battle Leaderboard
      </h3>

      {leaderboard.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-sm">No battles yet</div>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((s, i) => (
            <motion.div
              key={s.email}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                i === 0 ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white' :
                i === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-slate-800' :
                i === 2 ? 'bg-gradient-to-br from-amber-600 to-orange-700 text-white' :
                'bg-white/10 text-slate-400'
              }`}>
                {i < 3 ? medalEmojis[i] : i + 1}
              </div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {(s.name || s.email).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{s.name || s.email.split('@')[0]}</p>
              </div>
              <div className="flex items-center gap-3 text-center flex-shrink-0">
                <div>
                  <p className="text-emerald-400 font-black text-lg">{s.wins}</p>
                  <p className="text-slate-500 text-xs">Wins</p>
                </div>
                <div>
                  <p className="text-red-400 font-bold text-base">{s.losses}</p>
                  <p className="text-slate-500 text-xs">Losses</p>
                </div>
              </div>
              {s.wins > 0 && (
                <Swords className="w-4 h-4 text-amber-400 flex-shrink-0" />
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}