import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Star, Zap, Flame, Trophy, Coins } from 'lucide-react';

const LEVELS = [
{ level: 1, xpRequired: 0, title: 'Newcomer', color: 'from-slate-400 to-slate-500' },
{ level: 2, xpRequired: 100, title: 'Learner', color: 'from-green-400 to-emerald-500' },
{ level: 3, xpRequired: 300, title: 'Explorer', color: 'from-blue-400 to-cyan-500' },
{ level: 4, xpRequired: 600, title: 'Scholar', color: 'from-purple-400 to-violet-500' },
{ level: 5, xpRequired: 1000, title: 'Expert', color: 'from-amber-400 to-orange-500' },
{ level: 6, xpRequired: 1500, title: 'Master', color: 'from-red-400 to-rose-500' },
{ level: 7, xpRequired: 2500, title: 'Champion', color: 'from-pink-400 to-fuchsia-500' },
{ level: 8, xpRequired: 4000, title: 'Legend', color: 'from-yellow-400 to-amber-500' }];


export function getLevelInfo(xp = 0) {
  let current = LEVELS[0];
  let next = LEVELS[1];
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].xpRequired) {
      current = LEVELS[i];
      next = LEVELS[i + 1] || null;
    }
  }
  const xpIntoLevel = xp - current.xpRequired;
  const xpForNextLevel = next ? next.xpRequired - current.xpRequired : 1;
  const pct = next ? Math.min(100, Math.round(xpIntoLevel / xpForNextLevel * 100)) : 100;
  return { current, next, xpIntoLevel, xpForNextLevel, pct };
}

const BADGES = [
{ id: 'first_quiz', emoji: '🎯', label: 'First Quiz', desc: 'Complete your first quiz' },
{ id: 'streak_3', emoji: '🔥', label: 'On Fire', desc: '3-day streak' },
{ id: 'streak_7', emoji: '⚡', label: 'Electric', desc: '7-day streak' },
{ id: 'battle_win', emoji: '⚔️', label: 'Warrior', desc: 'Win a battle' },
{ id: 'accuracy_90', emoji: '🏹', label: 'Sharpshooter', desc: '90%+ accuracy on a quiz' },
{ id: 'coins_100', emoji: '🪙', label: 'Rich', desc: 'Earn 100 coins' }];


export default function GamificationWidget({ studentEmail }) {
  const { data: progress } = useQuery({
    queryKey: ['studentProgress', studentEmail],
    queryFn: async () => {
      if (!studentEmail) return null;
      const list = await base44.entities.StudentProgress.filter({ student_email: studentEmail });
      return list[0] || null;
    },
    enabled: !!studentEmail,
    staleTime: 30000
  });

  if (!progress) return null;

  const xp = (progress.total_correct_answers || 0) * 10 + (progress.quizzes_completed || 0) * 25;
  const { current, next, xpIntoLevel, xpForNextLevel, pct } = getLevelInfo(xp);
  const streak = progress.current_streak || 0;
  const coins = progress.battle_coins || 0;

  // Compute earned badges
  const earnedBadges = BADGES.filter((b) => {
    if (b.id === 'first_quiz') return (progress.quizzes_completed || 0) >= 1;
    if (b.id === 'streak_3') return streak >= 3;
    if (b.id === 'streak_7') return streak >= 7;
    if (b.id === 'battle_win') return (progress.battle_wins || 0) >= 1 || coins >= 50;
    if (b.id === 'accuracy_90') return (progress.accuracy_percent || 0) >= 90;
    if (b.id === 'coins_100') return coins >= 100;
    return false;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }} className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-5 mb-6 hidden">

      
      {/* Level + XP bar */}
      <div className="flex items-center gap-4 mb-4">
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${current.color} flex flex-col items-center justify-center shadow-lg flex-shrink-0`}>
          <span className="text-white font-black text-lg leading-none">{current.level}</span>
          <span className="text-white/70 text-[9px] font-bold uppercase tracking-wide">LVL</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-white font-bold text-sm">{current.title}</p>
            {next && <p className="text-slate-400 text-xs">{xpIntoLevel} / {xpForNextLevel} XP</p>}
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full bg-gradient-to-r ${current.color}`}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1, ease: 'easeOut' }} />
            
          </div>
          {next && <p className="text-slate-500 text-xs mt-1">Next: {next.title} at Level {next.level}</p>}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center bg-white/5 rounded-xl p-3">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Star className="w-4 h-4 text-amber-400" />
            <span className="text-amber-400 font-black">{xp}</span>
          </div>
          <p className="text-slate-500 text-xs">Total XP</p>
        </div>
        <div className="text-center bg-white/5 rounded-xl p-3">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Flame className={`w-4 h-4 ${streak >= 3 ? 'text-orange-400' : 'text-slate-500'}`} />
            <span className={`font-black ${streak >= 3 ? 'text-orange-400' : 'text-white'}`}>{streak}</span>
          </div>
          <p className="text-slate-500 text-xs">Day Streak</p>
        </div>
        <div className="text-center bg-white/5 rounded-xl p-3">
          <div className="flex items-center justify-center gap-1 mb-1">
            <span className="text-yellow-400 text-base">🪙</span>
            <span className="text-yellow-400 font-black">{coins}</span>
          </div>
          <p className="text-slate-500 text-xs">Coins</p>
        </div>
      </div>

      {/* Badges */}
      {earnedBadges.length > 0 &&
      <div>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-2">Badges earned</p>
          <div className="flex flex-wrap gap-2">
            {earnedBadges.map((badge) =>
          <div key={badge.id} title={badge.desc}
          className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5">
                <span>{badge.emoji}</span>
                <span className="text-white text-xs font-semibold">{badge.label}</span>
              </div>
          )}
          </div>
        </div>
      }
    </motion.div>);

}