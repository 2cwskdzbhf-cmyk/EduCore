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

  return null;






































































}