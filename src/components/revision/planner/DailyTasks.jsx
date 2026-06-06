import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Clock, Zap, ChevronLeft, ChevronRight, BookOpen, Brain, FileText, Eye, ClipboardList, RotateCcw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

const TASK_ICONS = {
  flashcards: Brain,
  quiz: ClipboardList,
  summarise: FileText,
  read: BookOpen,
  practice: Zap,
  review: Eye,
};

const TASK_COLORS = {
  flashcards: 'from-violet-500/20 to-purple-500/20 border-violet-500/30',
  quiz: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
  summarise: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30',
  read: 'from-amber-500/20 to-yellow-500/20 border-amber-500/30',
  practice: 'from-rose-500/20 to-pink-500/20 border-rose-500/30',
  review: 'from-slate-500/20 to-slate-400/20 border-slate-500/30',
};

const STATUS_COLORS = {
  completed: 'text-emerald-400',
  missed: 'text-red-400',
  due: 'text-yellow-400',
  upcoming: 'text-slate-400',
};

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
}

function getDateRange(tasks) {
  const dates = [...new Set(tasks.map(t => t.date))].sort();
  return dates;
}

export default function DailyTasks({ tasks, plan, onRefresh }) {
  const qc = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    const dates = getDateRange(tasks);
    return dates.includes(today) ? today : (dates[0] || today);
  });
  const [completing, setCompleting] = useState(null);

  const dates = getDateRange(tasks);
  const todayStr = new Date().toISOString().split('T')[0];
  const dayTasks = tasks.filter(t => t.date === selectedDate);
  const dateIdx = dates.indexOf(selectedDate);

  const handleComplete = async (task) => {
    if (task.status === 'completed') return;
    setCompleting(task.id);
    try {
      await base44.entities.RevisionTask.update(task.id, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
      // Award XP
      if (plan?.id) {
        const newXp = (plan.total_xp || 0) + (task.xp_reward || 50);
        // Streak logic
        const lastActivity = plan.last_activity_date;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        let newStreak = plan.current_streak || 0;
        if (lastActivity === todayStr) {
          // already counted today
        } else if (lastActivity === yesterdayStr) {
          newStreak += 1;
        } else {
          newStreak = 1;
        }
        const longestStreak = Math.max(plan.longest_streak || 0, newStreak);
        await base44.entities.RevisionPlan.update(plan.id, {
          total_xp: newXp,
          current_streak: newStreak,
          longest_streak: longestStreak,
          last_activity_date: todayStr,
        });
      }
      onRefresh();
    } catch (e) { console.error(e); }
    setCompleting(null);
  };

  const completedToday = dayTasks.filter(t => t.status === 'completed').length;
  const totalToday = dayTasks.length;

  return (
    <div className="space-y-4">
      {/* Date Navigator */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => dateIdx > 0 && setSelectedDate(dates[dateIdx - 1])}
          disabled={dateIdx <= 0}
          className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-30 transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 flex gap-1.5 overflow-x-auto pb-1">
          {dates.map(d => {
            const dtasks = tasks.filter(t => t.date === d);
            const done = dtasks.filter(t => t.status === 'completed').length;
            const isToday = d === todayStr;
            const isSelected = d === selectedDate;
            return (
              <button key={d} onClick={() => setSelectedDate(d)}
                className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                    : isToday
                    ? 'bg-white/10 border-white/20 text-white'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                }`}>
                <span className="uppercase text-[10px]">{new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short' })}</span>
                <span className="text-base font-bold">{new Date(d + 'T00:00:00').getDate()}</span>
                {dtasks.length > 0 && (
                  <div className="flex gap-0.5 mt-1">
                    {dtasks.map((t, i) => (
                      <div key={i} className={`w-1.5 h-1.5 rounded-full ${t.status === 'completed' ? 'bg-emerald-400' : t.status === 'missed' ? 'bg-red-400' : 'bg-slate-600'}`} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => dateIdx < dates.length - 1 && setSelectedDate(dates[dateIdx + 1])}
          disabled={dateIdx >= dates.length - 1}
          className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-30 transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-bold text-base">{formatDate(selectedDate)}</h3>
          {selectedDate === todayStr && <span className="text-xs text-violet-400 font-medium">Today</span>}
        </div>
        {totalToday > 0 && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-24 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all"
                style={{ width: `${(completedToday / totalToday) * 100}%` }} />
            </div>
            <span className="text-xs text-slate-400">{completedToday}/{totalToday}</span>
          </div>
        )}
      </div>

      {/* Tasks */}
      <AnimatePresence mode="popLayout">
        {dayTasks.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <RotateCcw className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No tasks scheduled for this day</p>
          </div>
        ) : (
          dayTasks.map((task, i) => {
            const Icon = TASK_ICONS[task.task_type] || Zap;
            const colors = TASK_COLORS[task.task_type] || TASK_COLORS.practice;
            const isDone = task.status === 'completed';
            return (
              <motion.div key={task.id}
                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
                transition={{ delay: i * 0.05 }}
                className={`bg-gradient-to-r ${colors} border rounded-2xl p-4 flex items-start gap-4 ${isDone ? 'opacity-60' : ''}`}
              >
                <button
                  onClick={() => handleComplete(task)}
                  disabled={isDone || completing === task.id}
                  className="mt-0.5 flex-shrink-0 transition-all hover:scale-110"
                >
                  {completing === task.id
                    ? <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                    : isDone
                    ? <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    : <Circle className="w-6 h-6 text-slate-500 hover:text-violet-400" />
                  }
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide">{task.task_type}</span>
                    {task.subject && <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300">{task.subject}</span>}
                    <span className={`text-[10px] font-semibold ml-auto ${STATUS_COLORS[task.status]}`}>
                      {task.status === 'completed' ? '✓ Done' : task.status === 'missed' ? '✗ Missed' : task.status === 'due' ? '● Due today' : '○ Upcoming'}
                    </span>
                  </div>
                  <p className={`font-semibold text-sm ${isDone ? 'line-through text-slate-500' : 'text-white'}`}>{task.title}</p>
                  {task.description && <p className="text-xs text-slate-400 mt-0.5">{task.description}</p>}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="w-3 h-3" /> {task.duration_minutes} min
                    </span>
                    <span className="flex items-center gap-1 text-xs text-amber-400 font-semibold">
                      <Zap className="w-3 h-3" /> +{task.xp_reward} XP
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </AnimatePresence>
    </div>
  );
}