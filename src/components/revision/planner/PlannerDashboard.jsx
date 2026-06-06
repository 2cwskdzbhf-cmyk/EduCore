import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Clock, Flame, Star, TrendingUp, Target, Calendar, BookOpen } from 'lucide-react';
import { format, parseISO, isToday, isPast, isFuture } from 'date-fns';

const StatCard = ({ icon: Icon, label, value, color, sub }) => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
    className="bg-white/5 border border-white/10 rounded-2xl p-4">
    <div className="flex items-center gap-3 mb-2">
      <div className={`p-2 rounded-xl ${color}`}><Icon className="w-4 h-4" /></div>
      <p className="text-slate-400 text-sm">{label}</p>
    </div>
    <p className="text-white text-2xl font-black">{value}</p>
    {sub && <p className="text-slate-500 text-xs mt-0.5">{sub}</p>}
  </motion.div>
);

export default function PlannerDashboard({ tasks, plan }) {
  const stats = useMemo(() => {
    const completed = tasks.filter(t => t.status === 'completed');
    const missed = tasks.filter(t => t.status === 'missed' || (t.status !== 'completed' && isPast(parseISO(t.date)) && !isToday(parseISO(t.date))));
    const upcoming = tasks.filter(t => t.status === 'upcoming' || (t.status !== 'completed' && (isFuture(parseISO(t.date)) || isToday(parseISO(t.date)))));
    const due = tasks.filter(t => isToday(parseISO(t.date)) && t.status !== 'completed');
    const totalXP = completed.reduce((sum, t) => sum + (t.xp_reward || 0), 0);

    // Subject breakdown
    const bySubject = {};
    tasks.forEach(t => {
      if (!t.subject) return;
      if (!bySubject[t.subject]) bySubject[t.subject] = { total: 0, done: 0 };
      bySubject[t.subject].total++;
      if (t.status === 'completed') bySubject[t.subject].done++;
    });

    // Recent activity (last 7 days)
    const recentDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      const dayTasks = tasks.filter(t => t.date === dateStr);
      const doneTasks = dayTasks.filter(t => t.status === 'completed');
      return { date: dateStr, label: format(d, 'EEE'), total: dayTasks.length, done: doneTasks.length };
    });

    return { completed: completed.length, missed: missed.length, upcoming: upcoming.length, due: due.length, totalXP, bySubject, recentDays };
  }, [tasks]);

  const xpLevel = Math.floor(stats.totalXP / 500) + 1;
  const xpInLevel = stats.totalXP % 500;
  const streak = plan?.current_streak || 0;
  const longestStreak = plan?.longest_streak || 0;

  return (
    <div className="space-y-6">
      {/* XP + Streak */}
      <div className="bg-gradient-to-br from-violet-900/40 to-purple-900/30 border border-violet-500/20 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-violet-300 text-sm font-semibold">Level {xpLevel}</p>
            <p className="text-white text-2xl font-black">{stats.totalXP.toLocaleString()} XP</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 justify-end">
              <Flame className="w-5 h-5 text-orange-400" />
              <span className="text-white font-black text-2xl">{streak}</span>
            </div>
            <p className="text-slate-400 text-xs">day streak</p>
            <p className="text-slate-600 text-xs">best: {longestStreak}</p>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-500">
            <span>{xpInLevel} / 500 XP to Level {xpLevel + 1}</span>
            <span>{Math.round((xpInLevel / 500) * 100)}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-violet-500 to-purple-400 rounded-full transition-all"
              style={{ width: `${(xpInLevel / 500) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={CheckCircle2} label="Completed" value={stats.completed} color="bg-emerald-500/10 text-emerald-400" sub="all time" />
        <StatCard icon={XCircle} label="Missed" value={stats.missed} color="bg-red-500/10 text-red-400" sub="catch up!" />
        <StatCard icon={Clock} label="Due Today" value={stats.due} color="bg-amber-500/10 text-amber-400" sub="tasks remaining" />
        <StatCard icon={TrendingUp} label="Upcoming" value={stats.upcoming} color="bg-blue-500/10 text-blue-400" sub="scheduled" />
      </div>

      {/* Weekly activity heatmap */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <h4 className="text-white font-semibold mb-3 flex items-center gap-2"><Target className="w-4 h-4 text-violet-400" /> Last 7 Days</h4>
        <div className="grid grid-cols-7 gap-2">
          {stats.recentDays.map(day => {
            const pct = day.total > 0 ? day.done / day.total : 0;
            const isTodays = isToday(parseISO(day.date));
            return (
              <div key={day.date} className="flex flex-col items-center gap-1">
                <div className={`w-full aspect-square rounded-xl border transition-all ${
                  isTodays ? 'border-violet-400' : 'border-transparent'
                } ${pct === 1 && day.total > 0 ? 'bg-emerald-500/40' : pct > 0 ? 'bg-violet-500/30' : day.total > 0 ? 'bg-red-500/20' : 'bg-white/5'}`}
                  title={`${day.done}/${day.total} tasks`} />
                <p className={`text-xs ${isTodays ? 'text-violet-300 font-bold' : 'text-slate-600'}`}>{day.label}</p>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3">
          {[['bg-emerald-500/40', 'All done'], ['bg-violet-500/30', 'Partial'], ['bg-red-500/20', 'Missed'], ['bg-white/5', 'No tasks']].map(([cls, label]) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded ${cls}`} />
              <span className="text-slate-600 text-xs">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Subject breakdown */}
      {Object.keys(stats.bySubject).length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h4 className="text-white font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4 text-violet-400" /> Progress by Subject</h4>
          <div className="space-y-3">
            {Object.entries(stats.bySubject).map(([subject, data]) => {
              const pct = data.total > 0 ? Math.round((data.done / data.total) * 100) : 0;
              return (
                <div key={subject}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300 font-medium">{subject}</span>
                    <span className="text-slate-500">{data.done}/{data.total} tasks · {pct}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-violet-500 to-purple-400 rounded-full transition-all"
                      style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming tasks (next 3) */}
      {tasks.filter(t => t.status !== 'completed' && (isFuture(parseISO(t.date)) || isToday(parseISO(t.date)))).slice(0, 3).length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h4 className="text-white font-semibold mb-3 flex items-center gap-2"><Calendar className="w-4 h-4 text-violet-400" /> Upcoming Tasks</h4>
          <div className="space-y-2">
            {tasks
              .filter(t => t.status !== 'completed' && (isFuture(parseISO(t.date)) || isToday(parseISO(t.date))))
              .sort((a, b) => a.date.localeCompare(b.date))
              .slice(0, 5)
              .map(task => (
                <div key={task.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isToday(parseISO(task.date)) ? 'bg-violet-400' : 'bg-slate-600'}`} />
                  <p className="text-slate-300 text-sm flex-1 truncate">{task.title}</p>
                  <span className="text-slate-600 text-xs flex-shrink-0">
                    {isToday(parseISO(task.date)) ? 'Today' : format(parseISO(task.date), 'd MMM')}
                  </span>
                  <span className="text-amber-500 text-xs flex-shrink-0">+{task.xp_reward} XP</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}