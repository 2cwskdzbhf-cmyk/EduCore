import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Clock, Star, AlertTriangle, ChevronLeft, ChevronRight, Zap, BookOpen, Brain, PenLine, FileText, RotateCcw, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { format, addDays, subDays, isToday, isPast, parseISO } from 'date-fns';

const TYPE_CONFIG = {
  flashcards: { icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  quiz:       { icon: Brain, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
  summarise:  { icon: PenLine, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  read:       { icon: BookOpen, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  practice:   { icon: RotateCcw, color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/20' },
  review:     { icon: FileText, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
};

export default function DailyTasks({ user, tasks, plan, onRefresh }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [completing, setCompleting] = useState(null);
  const qc = useQueryClient();

  const dayTasks = tasks.filter(t => t.date === selectedDate);
  const prevDay = () => setSelectedDate(prev => subDays(parseISO(prev), 1).toISOString().split('T')[0]);
  const nextDay = () => setSelectedDate(prev => addDays(parseISO(prev), 1).toISOString().split('T')[0]);

  const completeTask = async (task) => {
    if (task.status === 'completed') return;
    setCompleting(task.id);
    try {
      await base44.entities.RevisionTask.update(task.id, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      });

      // Update XP on plan
      if (plan?.id) {
        const today = new Date().toISOString().split('T')[0];
        const lastDate = plan.last_activity_date;
        const yesterday = subDays(new Date(), 1).toISOString().split('T')[0];
        const newStreak = lastDate === yesterday || lastDate === today ? (plan.current_streak || 0) + 1 : 1;
        const longest = Math.max(newStreak, plan.longest_streak || 0);
        await base44.entities.RevisionPlan.update(plan.id, {
          total_xp: (plan.total_xp || 0) + (task.xp_reward || 50),
          current_streak: newStreak,
          longest_streak: longest,
          last_activity_date: today,
        });
      }
      onRefresh?.();
    } finally {
      setCompleting(null);
    }
  };

  const dateLabel = isToday(parseISO(selectedDate)) ? 'Today' : format(parseISO(selectedDate), 'EEEE, d MMM');
  const completed = dayTasks.filter(t => t.status === 'completed').length;
  const total = dayTasks.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Date nav */}
      <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-4">
        <button onClick={prevDay} className="p-2 hover:bg-white/10 rounded-xl transition-all text-slate-400 hover:text-white">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="text-white font-bold text-lg">{dateLabel}</p>
          <p className="text-slate-500 text-xs">{format(parseISO(selectedDate), 'EEEE, d MMMM yyyy')}</p>
          {total > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden w-32">
                <div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs text-slate-400">{completed}/{total}</span>
            </div>
          )}
        </div>
        <button onClick={nextDay} className="p-2 hover:bg-white/10 rounded-xl transition-all text-slate-400 hover:text-white">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Tasks */}
      <AnimatePresence mode="wait">
        {dayTasks.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 text-slate-500">
            <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No tasks for this day</p>
            <p className="text-sm mt-1">Generate a plan in the Smart Planner tab</p>
          </motion.div>
        ) : (
          <motion.div key={selectedDate} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
            {dayTasks.map(task => {
              const cfg = TYPE_CONFIG[task.task_type] || TYPE_CONFIG.practice;
              const Icon = cfg.icon;
              const done = task.status === 'completed';
              const missed = task.status === 'missed';
              return (
                <motion.div key={task.id} layout
                  className={`flex items-start gap-3 p-4 rounded-2xl border transition-all ${
                    done ? 'bg-emerald-500/5 border-emerald-500/20 opacity-70' :
                    missed ? 'bg-red-500/5 border-red-500/20 opacity-60' :
                    'bg-white/5 border-white/10 hover:border-white/20'
                  }`}>
                  <div className={`p-2 rounded-xl border ${cfg.bg} flex-shrink-0 mt-0.5`}>
                    <Icon className={`w-4 h-4 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${done ? 'line-through text-slate-500' : missed ? 'text-slate-500' : 'text-white'}`}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      {task.subject && <span className="text-slate-500 text-xs">{task.subject}</span>}
                      <span className="flex items-center gap-1 text-slate-600 text-xs"><Clock className="w-3 h-3" />{task.duration_minutes}m</span>
                      <span className="flex items-center gap-1 text-amber-500 text-xs"><Star className="w-3 h-3" />+{task.xp_reward} XP</span>
                      {missed && <span className="flex items-center gap-1 text-red-400 text-xs"><AlertTriangle className="w-3 h-3" />Missed</span>}
                    </div>
                  </div>
                  <button onClick={() => completeTask(task)} disabled={done || missed || completing === task.id}
                    className="flex-shrink-0 p-1 rounded-full transition-all">
                    {completing === task.id ? (
                      <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                    ) : done ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    ) : (
                      <Circle className="w-6 h-6 text-slate-600 hover:text-violet-400 transition-colors" />
                    )}
                  </button>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}