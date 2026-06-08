import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2, XCircle, Clock, Flame, Star, TrendingUp,
  Target, Calendar, BookOpen, ChevronLeft, ChevronRight
} from 'lucide-react';
import { format, parseISO, isToday, isPast, isFuture, startOfMonth, endOfMonth,
         eachDayOfInterval, getDay, addMonths, subMonths } from 'date-fns';

const StatCard = ({ icon: Icon, label, value, colorCls, sub }) => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
    className="bg-white/40 backdrop-blur-md border border-white/30 rounded-2xl p-4 shadow-sm">
    <div className="flex items-center gap-2.5 mb-2">
      <div className={`p-2 rounded-xl ${colorCls}`}><Icon className="w-4 h-4" /></div>
      <p className="text-[#8697C4] text-sm">{label}</p>
    </div>
    <p className="text-[#3D52A0] text-2xl font-black">{value}</p>
    {sub && <p className="text-[#ADB8DA] text-xs mt-0.5">{sub}</p>}
  </motion.div>
);

function CalendarView({ tasks }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = (getDay(monthStart) + 6) % 7; // Mon=0

  const tasksByDate = useMemo(() => {
    const map = {};
    tasks.forEach(t => {
      if (!map[t.date]) map[t.date] = [];
      map[t.date].push(t);
    });
    return map;
  }, [tasks]);

  const getDayStatus = (dateStr) => {
    const dayTasks = tasksByDate[dateStr] || [];
    if (!dayTasks.length) return 'none';
    const done = dayTasks.filter(t => t.status === 'completed').length;
    if (done === dayTasks.length) return 'complete';
    if (done > 0) return 'partial';
    const date = parseISO(dateStr);
    if (isPast(date) && !isToday(date)) return 'missed';
    return 'upcoming';
  };

  const statusStyles = {
    none: 'bg-white/20 text-[#ADB8DA]',
    complete: 'bg-emerald-400/80 text-white font-bold shadow-sm',
    partial: 'bg-[#7091E6]/50 text-[#3D52A0] font-semibold',
    missed: 'bg-red-300/60 text-red-800',
    upcoming: 'bg-white/40 text-[#3D52A0]',
  };

  return (
    <div className="bg-white/40 backdrop-blur-md border border-white/30 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-[#3D52A0] font-bold flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#7091E6]" />
          {format(currentMonth, 'MMMM yyyy')}
        </h4>
        <div className="flex gap-1">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-1.5 hover:bg-white/30 rounded-lg text-[#8697C4] hover:text-[#3D52A0] transition-all">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1.5 hover:bg-white/30 rounded-lg text-[#8697C4] hover:text-[#3D52A0] transition-all">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['M','T','W','T','F','S','S'].map((d, i) => (
          <div key={i} className="text-center text-[#ADB8DA] text-xs font-semibold py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startPadding }).map((_, i) => <div key={`pad-${i}`} />)}
        {days.map(day => {
          const dateStr = day.toISOString().split('T')[0];
          const status = getDayStatus(dateStr);
          const dayTasks = tasksByDate[dateStr] || [];
          const isCurrentDay = isToday(day);

          return (
            <div key={dateStr} title={dayTasks.map(t => t.title).join('\n')}
              className={`relative aspect-square flex items-center justify-center rounded-xl text-xs transition-all ${statusStyles[status]} ${
                isCurrentDay ? 'ring-2 ring-[#7091E6] ring-offset-1 ring-offset-transparent' : ''
              }`}>
              {format(day, 'd')}
              {dayTasks.length > 0 && (
                <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {dayTasks.slice(0, 3).map((_, i) => (
                    <div key={i} className={`w-1 h-1 rounded-full ${
                      status === 'complete' ? 'bg-white/70' :
                      status === 'missed' ? 'bg-red-600' : 'bg-[#7091E6]'
                    }`} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-white/20">
        {[
          ['bg-emerald-400/80', 'All done'],
          ['bg-[#7091E6]/50', 'Partial'],
          ['bg-red-300/60', 'Missed'],
          ['bg-white/40', 'Upcoming'],
        ].map(([cls, label]) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded ${cls}`} />
            <span className="text-[#8697C4] text-xs">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PlannerDashboard({ tasks, plan }) {
  const stats = useMemo(() => {
    const completed = tasks.filter(t => t.status === 'completed');
    const missed = tasks.filter(t =>
      t.status !== 'completed' && isPast(parseISO(t.date)) && !isToday(parseISO(t.date))
    );
    const upcoming = tasks.filter(t =>
      t.status !== 'completed' && (isFuture(parseISO(t.date)) || isToday(parseISO(t.date)))
    );
    const due = tasks.filter(t => isToday(parseISO(t.date)) && t.status !== 'completed');
    const totalXP = completed.reduce((sum, t) => sum + (t.xp_reward || 0), 0);

    const bySubject = {};
    tasks.forEach(t => {
      if (!t.subject) return;
      if (!bySubject[t.subject]) bySubject[t.subject] = { total: 0, done: 0 };
      bySubject[t.subject].total++;
      if (t.status === 'completed') bySubject[t.subject].done++;
    });

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
    <div className="space-y-5">
      {/* XP + Streak hero */}
      <div className="bg-gradient-to-br from-[#7091E6]/25 to-[#3D52A0]/15 backdrop-blur-md border border-[#7091E6]/30 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[#7091E6] text-sm font-semibold">Level {xpLevel}</p>
            <p className="text-[#3D52A0] text-2xl font-black">{stats.totalXP.toLocaleString()} XP</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 justify-end">
              <Flame className="w-5 h-5 text-orange-500" />
              <span className="text-[#3D52A0] font-black text-2xl">{streak}</span>
            </div>
            <p className="text-[#8697C4] text-xs">day streak</p>
            <p className="text-[#ADB8DA] text-xs">best: {longestStreak}</p>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-[#8697C4]">
            <span>{xpInLevel} / 500 XP to Level {xpLevel + 1}</span>
            <span>{Math.round((xpInLevel / 500) * 100)}%</span>
          </div>
          <div className="h-2 bg-white/30 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#7091E6] to-[#3D52A0] rounded-full transition-all"
              style={{ width: `${(xpInLevel / 500) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={CheckCircle2} label="Completed" value={stats.completed} colorCls="bg-emerald-100 text-emerald-600" sub="sessions" />
        <StatCard icon={XCircle}      label="Missed"    value={stats.missed}    colorCls="bg-red-100 text-red-500"        sub="catch up!" />
        <StatCard icon={Clock}        label="Due Today" value={stats.due}       colorCls="bg-amber-100 text-amber-600"    sub="remaining" />
        <StatCard icon={TrendingUp}   label="Upcoming"  value={stats.upcoming}  colorCls="bg-blue-100 text-blue-600"      sub="scheduled" />
      </div>

      {/* Calendar */}
      <CalendarView tasks={tasks} />

      {/* 7-day activity strip */}
      <div className="bg-white/40 backdrop-blur-md border border-white/30 rounded-2xl p-4 shadow-sm">
        <h4 className="text-[#3D52A0] font-semibold mb-3 flex items-center gap-2">
          <Target className="w-4 h-4 text-[#7091E6]" /> Last 7 Days
        </h4>
        <div className="grid grid-cols-7 gap-2">
          {stats.recentDays.map(day => {
            const pct = day.total > 0 ? day.done / day.total : 0;
            const isCurrentDay = isToday(parseISO(day.date));
            return (
              <div key={day.date} className="flex flex-col items-center gap-1">
                <div className={`w-full aspect-square rounded-xl border-2 transition-all ${
                  isCurrentDay ? 'border-[#7091E6]' : 'border-transparent'
                } ${
                  pct === 1 && day.total > 0 ? 'bg-emerald-400/70' :
                  pct > 0 ? 'bg-[#7091E6]/40' :
                  day.total > 0 ? 'bg-red-300/50' : 'bg-white/20'
                }`} title={`${day.done}/${day.total} tasks`} />
                <p className={`text-xs ${isCurrentDay ? 'text-[#7091E6] font-bold' : 'text-[#ADB8DA]'}`}>{day.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Subject progress */}
      {Object.keys(stats.bySubject).length > 0 && (
        <div className="bg-white/40 backdrop-blur-md border border-white/30 rounded-2xl p-4 shadow-sm">
          <h4 className="text-[#3D52A0] font-semibold mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#7091E6]" /> Progress by Subject
          </h4>
          <div className="space-y-3">
            {Object.entries(stats.bySubject).map(([subject, data]) => {
              const pct = data.total > 0 ? Math.round((data.done / data.total) * 100) : 0;
              return (
                <div key={subject}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-[#3D52A0] font-semibold">{subject}</span>
                    <span className="text-[#8697C4]">{data.done}/{data.total} · {pct}%</span>
                  </div>
                  <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#7091E6] to-[#3D52A0] rounded-full transition-all"
                      style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming tasks */}
      {tasks.filter(t => t.status !== 'completed' && (isFuture(parseISO(t.date)) || isToday(parseISO(t.date)))).length > 0 && (
        <div className="bg-white/40 backdrop-blur-md border border-white/30 rounded-2xl p-4 shadow-sm">
          <h4 className="text-[#3D52A0] font-semibold mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#7091E6]" /> Upcoming Sessions
          </h4>
          <div className="space-y-2">
            {tasks
              .filter(t => t.status !== 'completed' && (isFuture(parseISO(t.date)) || isToday(parseISO(t.date))))
              .sort((a, b) => a.date.localeCompare(b.date))
              .slice(0, 5)
              .map(task => (
                <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/30 transition-all">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isToday(parseISO(task.date)) ? 'bg-[#7091E6]' : 'bg-[#ADB8DA]'}`} />
                  <p className="text-[#3D52A0] text-sm flex-1 truncate">{task.title}</p>
                  <span className="text-[#8697C4] text-xs flex-shrink-0">
                    {isToday(parseISO(task.date)) ? 'Today' : format(parseISO(task.date), 'd MMM')}
                  </span>
                  <span className="text-amber-600 text-xs flex-shrink-0 font-semibold">+{task.xp_reward} XP</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}