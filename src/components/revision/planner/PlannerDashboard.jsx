import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Clock, Zap, Flame, Trophy, TrendingUp, Target, BarChart2 } from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-black text-white">{value}</p>
        <p className="text-xs text-slate-400">{label}</p>
        {sub && <p className="text-xs text-slate-600 mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

export default function PlannerDashboard({ tasks, plan }) {
  const stats = useMemo(() => {
    const completed = tasks.filter(t => t.status === 'completed');
    const missed = tasks.filter(t => t.status === 'missed');
    const today = new Date().toISOString().split('T')[0];
    const due = tasks.filter(t => t.date === today && t.status !== 'completed');
    const upcoming = tasks.filter(t => t.date > today);

    // Subject breakdown
    const bySubject = {};
    for (const task of tasks) {
      if (!task.subject) continue;
      if (!bySubject[task.subject]) bySubject[task.subject] = { total: 0, done: 0 };
      bySubject[task.subject].total += 1;
      if (task.status === 'completed') bySubject[task.subject].done += 1;
    }

    // Weekly activity (last 7 days)
    const weekDays = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayTasks = tasks.filter(t => t.date === dateStr);
      const doneTasks = dayTasks.filter(t => t.status === 'completed');
      weekDays.push({
        label: d.toLocaleDateString('en-GB', { weekday: 'short' }),
        date: dateStr,
        total: dayTasks.length,
        done: doneTasks.length,
        isToday: dateStr === today,
      });
    }

    return { completed, missed, due, upcoming, bySubject, weekDays };
  }, [tasks]);

  const xpLevel = Math.floor((plan?.total_xp || 0) / 500) + 1;
  const xpInLevel = (plan?.total_xp || 0) % 500;
  const xpPercent = (xpInLevel / 500) * 100;

  return (
    <div className="space-y-6">
      {/* XP + Streak banner */}
      <div className="bg-gradient-to-r from-violet-500/20 to-purple-600/20 border border-violet-500/30 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-white font-black text-lg">Level {xpLevel}</p>
              <p className="text-slate-400 text-xs">{plan?.total_xp || 0} total XP</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className="flex items-center gap-1 justify-center">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-white font-black text-xl">{plan?.current_streak || 0}</span>
              </div>
              <p className="text-slate-500 text-xs">day streak</p>
            </div>
            <div className="text-center">
              <p className="text-slate-300 font-bold text-base">{plan?.longest_streak || 0}</p>
              <p className="text-slate-500 text-xs">best streak</p>
            </div>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-400">
            <span>{xpInLevel} / 500 XP to Level {xpLevel + 1}</span>
            <span>{Math.round(xpPercent)}%</span>
          </div>
          <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${xpPercent}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
            />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={CheckCircle2} label="Tasks Completed" value={stats.completed.length} color="bg-emerald-500/20" />
        <StatCard icon={XCircle} label="Tasks Missed" value={stats.missed.length} color="bg-red-500/20" />
        <StatCard icon={Clock} label="Due Today" value={stats.due.length} sub="Need completing" color="bg-yellow-500/20" />
        <StatCard icon={Target} label="Upcoming" value={stats.upcoming.length} sub="Scheduled ahead" color="bg-blue-500/20" />
      </div>

      {/* Weekly Activity */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 className="w-4 h-4 text-violet-400" />
          <span className="text-white font-semibold text-sm">7-Day Activity</span>
        </div>
        <div className="flex items-end gap-2 h-20">
          {stats.weekDays.map((day, i) => {
            const height = day.total > 0 ? Math.max((day.done / day.total) * 100, 8) : 4;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full relative flex flex-col justify-end" style={{ height: 60 }}>
                  <div className="w-full bg-white/5 rounded-t absolute bottom-0" style={{ height: '100%' }} />
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ delay: i * 0.05, duration: 0.5, ease: 'easeOut' }}
                    className={`w-full rounded-t absolute bottom-0 ${day.isToday ? 'bg-violet-500' : day.done > 0 ? 'bg-emerald-500/60' : 'bg-white/10'}`}
                  />
                </div>
                <span className={`text-[10px] font-medium ${day.isToday ? 'text-violet-400' : 'text-slate-500'}`}>{day.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Subject Progress */}
      {Object.keys(stats.bySubject).length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-violet-400" />
            <span className="text-white font-semibold text-sm">Subject Progress</span>
          </div>
          <div className="space-y-3">
            {Object.entries(stats.bySubject).map(([subject, data]) => {
              const pct = data.total > 0 ? Math.round((data.done / data.total) * 100) : 0;
              return (
                <div key={subject}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white font-medium">{subject}</span>
                    <span className="text-slate-400">{data.done}/{data.total} tasks · {pct}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}