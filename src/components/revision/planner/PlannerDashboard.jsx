import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Clock, Flame, Star, TrendingUp, Target, Calendar, BookOpen, BarChart3 } from 'lucide-react';
import { format, parseISO, isToday, isPast, isFuture } from 'date-fns';

const StatCard = ({ icon: Icon, label, value, colorBg, colorText, sub }) => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
    className="rounded-2xl p-4"
    style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.3)' }}>
    <div className="flex items-center gap-2 mb-2">
      <div className={`p-2 rounded-xl ${colorBg}`}><Icon className={`w-4 h-4 ${colorText}`} /></div>
      <p className="text-[#8697C4] text-xs font-medium">{label}</p>
    </div>
    <p className="text-[#3D52A0] text-2xl font-black">{value}</p>
    {sub && <p className="text-[#8697C4] text-xs mt-0.5">{sub}</p>}
  </motion.div>
);

export default function PlannerDashboard({ tasks, plan }) {
  const stats = useMemo(() => {
    const completed = tasks.filter(t => t.status === 'completed');
    const missed = tasks.filter(t =>
      t.status !== 'completed' && isPast(parseISO(t.date)) && !isToday(parseISO(t.date))
    );
    const due = tasks.filter(t => isToday(parseISO(t.date)) && t.status !== 'completed');
    const upcoming = tasks.filter(t =>
      t.status !== 'completed' && (isFuture(parseISO(t.date)) || isToday(parseISO(t.date)))
    );
    const totalXP = completed.reduce((s, t) => s + (t.xp_reward || 0), 0);
    const totalMinutes = completed.reduce((s, t) => s + (t.duration_minutes || 0), 0);

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

    // Phase breakdown
    const byPhase = {};
    tasks.forEach(t => {
      const phase = t.session_phase || 'main';
      if (!byPhase[phase]) byPhase[phase] = { total: 0, done: 0 };
      byPhase[phase].total++;
      if (t.status === 'completed') byPhase[phase].done++;
    });

    return { completed: completed.length, missed: missed.length, upcoming: upcoming.length, due: due.length, totalXP, totalMinutes, bySubject, recentDays, byPhase };
  }, [tasks]);

  const xpLevel = Math.floor(stats.totalXP / 500) + 1;
  const xpInLevel = stats.totalXP % 500;
  const streak = plan?.current_streak || 0;
  const longestStreak = plan?.longest_streak || 0;
  const subject = plan?.subjects?.[0];
  const examDate = subject?.exam_date;
  const daysLeft = examDate ? Math.max(0, Math.ceil((new Date(examDate) - new Date()) / (1000 * 60 * 60 * 24))) : null;

  const PHASE_LABELS = {
    warmup: '🔥 Warm-up',
    main: '📚 Main Study',
    recap: '🔄 Recap',
    exam_practice: '📝 Exam Practice',
  };

  return (
    <div className="space-y-5">
      {/* Exam countdown */}
      {examDate && (
        <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg,rgba(112,145,230,0.25),rgba(61,82,160,0.2))', backdropFilter: 'blur(20px)', border: '1px solid rgba(112,145,230,0.35)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#7091E6] text-sm font-bold uppercase tracking-wide">{subject?.name || 'Exam'}</p>
              <p className="text-[#3D52A0] text-3xl font-black mt-0.5">{daysLeft} days left</p>
              <p className="text-[#8697C4] text-xs mt-1">{format(parseISO(examDate), 'd MMMM yyyy')}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end">
                <Flame className="w-5 h-5 text-orange-500" />
                <span className="text-[#3D52A0] font-black text-2xl">{streak}</span>
              </div>
              <p className="text-[#8697C4] text-xs">day streak</p>
              <p className="text-[#8697C4] text-xs">best: {longestStreak}</p>
            </div>
          </div>
          {daysLeft !== null && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-[#8697C4] mb-1.5">
                <span>Revision progress</span>
                <span>{stats.completed} of {tasks.length} sessions complete</span>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(112,145,230,0.15)' }}>
                <motion.div className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg,#7091E6,#3D52A0)' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${tasks.length > 0 ? Math.round((stats.completed / tasks.length) * 100) : 0}%` }}
                  transition={{ duration: 0.8 }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* XP bar */}
      <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.3)' }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-[#7091E6] text-xs font-bold uppercase tracking-wide">Level {xpLevel}</span>
            <p className="text-[#3D52A0] text-xl font-black">{stats.totalXP.toLocaleString()} XP</p>
          </div>
          <div className="text-right">
            <p className="text-[#8697C4] text-xs">{Math.round(stats.totalMinutes / 60 * 10) / 10}h studied</p>
          </div>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(112,145,230,0.15)' }}>
          <motion.div className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg,#7091E6,#ADB8DA)' }}
            initial={{ width: 0 }} animate={{ width: `${(xpInLevel / 500) * 100}%` }} transition={{ duration: 0.6 }} />
        </div>
        <p className="text-[#8697C4] text-xs mt-1.5 text-right">{xpInLevel}/500 XP → Level {xpLevel + 1}</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={CheckCircle2} label="Completed" value={stats.completed} colorBg="bg-emerald-100" colorText="text-emerald-600" sub="sessions done" />
        <StatCard icon={XCircle} label="Missed" value={stats.missed} colorBg="bg-red-100" colorText="text-red-500" sub="catch up!" />
        <StatCard icon={Clock} label="Due Today" value={stats.due} colorBg="bg-amber-100" colorText="text-amber-600" sub="remaining" />
        <StatCard icon={TrendingUp} label="Upcoming" value={stats.upcoming} colorBg="bg-blue-100" colorText="text-[#7091E6]" sub="scheduled" />
      </div>

      {/* 7-day heatmap */}
      <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.3)' }}>
        <h4 className="text-[#3D52A0] font-bold text-sm mb-3 flex items-center gap-2"><Target className="w-4 h-4 text-[#7091E6]" /> Last 7 Days</h4>
        <div className="grid grid-cols-7 gap-2">
          {stats.recentDays.map(day => {
            const pct = day.total > 0 ? day.done / day.total : 0;
            const isTodays = isToday(parseISO(day.date));
            return (
              <div key={day.date} className="flex flex-col items-center gap-1.5">
                <div className={`w-full aspect-square rounded-xl border-2 transition-all ${isTodays ? 'border-[#7091E6]' : 'border-transparent'}`}
                  style={{
                    background: pct === 1 && day.total > 0 ? 'rgba(16,185,129,0.4)' :
                                pct > 0 ? 'rgba(112,145,230,0.4)' :
                                day.total > 0 ? 'rgba(220,55,55,0.25)' :
                                'rgba(255,255,255,0.15)'
                  }}
                  title={`${day.done}/${day.total} tasks`} />
                <p className={`text-xs font-semibold ${isTodays ? 'text-[#7091E6]' : 'text-[#8697C4]'}`}>{day.label}</p>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          {[
            ['rgba(16,185,129,0.4)', 'All done'],
            ['rgba(112,145,230,0.4)', 'Partial'],
            ['rgba(220,55,55,0.25)', 'Missed'],
            ['rgba(255,255,255,0.15)', 'Rest day']
          ].map(([bg, label]) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ background: bg }} />
              <span className="text-[#8697C4] text-xs">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Subject breakdown */}
      {Object.keys(stats.bySubject).length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.3)' }}>
          <h4 className="text-[#3D52A0] font-bold text-sm mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4 text-[#7091E6]" /> Progress by Subject</h4>
          <div className="space-y-3">
            {Object.entries(stats.bySubject).map(([subj, data]) => {
              const pct = data.total > 0 ? Math.round((data.done / data.total) * 100) : 0;
              return (
                <div key={subj}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-[#3D52A0] font-semibold">{subj}</span>
                    <span className="text-[#8697C4] text-xs">{data.done}/{data.total} · {pct}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(112,145,230,0.15)' }}>
                    <motion.div className="h-full rounded-full"
                      style={{ background: 'linear-gradient(90deg,#7091E6,#3D52A0)' }}
                      initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Session type breakdown */}
      {Object.keys(stats.byPhase).length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.3)' }}>
          <h4 className="text-[#3D52A0] font-bold text-sm mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-[#7091E6]" /> Session Types</h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(stats.byPhase).map(([phase, data]) => {
              const pct = data.total > 0 ? Math.round((data.done / data.total) * 100) : 0;
              return (
                <div key={phase} className="rounded-xl p-3" style={{ background: 'rgba(112,145,230,0.1)', border: '1px solid rgba(112,145,230,0.2)' }}>
                  <p className="text-[#3D52A0] font-semibold text-xs mb-1">{PHASE_LABELS[phase] || phase}</p>
                  <p className="text-[#3D52A0] font-black text-lg">{data.done}<span className="text-[#8697C4] font-normal text-xs">/{data.total}</span></p>
                  <p className="text-[#7091E6] text-xs font-semibold">{pct}% done</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming tasks */}
      {tasks.filter(t => t.status !== 'completed' && (isFuture(parseISO(t.date)) || isToday(parseISO(t.date)))).slice(0, 5).length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.3)' }}>
          <h4 className="text-[#3D52A0] font-bold text-sm mb-3 flex items-center gap-2"><Calendar className="w-4 h-4 text-[#7091E6]" /> Next Sessions</h4>
          <div className="space-y-2">
            {tasks
              .filter(t => t.status !== 'completed' && (isFuture(parseISO(t.date)) || isToday(parseISO(t.date))))
              .sort((a, b) => a.date.localeCompare(b.date))
              .slice(0, 5)
              .map(task => (
                <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-xl transition-all hover:bg-white/20">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isToday(parseISO(task.date)) ? 'bg-[#7091E6]' : 'bg-[#ADB8DA]'}`} />
                  <p className="text-[#3D52A0] text-sm flex-1 truncate font-medium">{task.title}</p>
                  <span className="text-[#8697C4] text-xs flex-shrink-0">
                    {isToday(parseISO(task.date)) ? 'Today' : format(parseISO(task.date), 'd MMM')}
                  </span>
                  <span className="text-amber-600 text-xs flex-shrink-0 font-semibold">+{task.xp_reward}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {tasks.length === 0 && (
        <div className="rounded-2xl p-10 text-center" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}>
          <BarChart3 className="w-12 h-12 mx-auto text-[#7091E6] opacity-30 mb-3" />
          <p className="text-[#3D52A0] font-bold">No revision plan yet</p>
          <p className="text-[#8697C4] text-sm mt-1">Head to the Smart Planner tab to get started</p>
        </div>
      )}
    </div>
  );
}