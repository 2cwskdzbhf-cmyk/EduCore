import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, Circle, Clock, Star, AlertTriangle,
  ChevronLeft, ChevronRight, Zap, BookOpen, Brain,
  PenLine, FileText, RotateCcw, Sparkles, CalendarDays,
  Loader2, TrendingUp, AlertCircle
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { format, addDays, subDays, isToday, isPast, parseISO } from 'date-fns';

const TYPE_CONFIG = {
  flashcards: { icon: Zap,       color: 'text-amber-600',   bg: 'bg-amber-100/60 border-amber-200' },
  quiz:       { icon: Brain,     color: 'text-violet-600',  bg: 'bg-violet-100/60 border-violet-200' },
  summarise:  { icon: PenLine,   color: 'text-emerald-600', bg: 'bg-emerald-100/60 border-emerald-200' },
  read:       { icon: BookOpen,  color: 'text-blue-600',    bg: 'bg-blue-100/60 border-blue-200' },
  practice:   { icon: RotateCcw, color: 'text-pink-600',    bg: 'bg-pink-100/60 border-pink-200' },
  review:     { icon: FileText,  color: 'text-cyan-600',    bg: 'bg-cyan-100/60 border-cyan-200' },
};

const PHASE_BADGE = {
  warmup:       { label: 'Warm-Up',     cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  main:         { label: 'Main Study',  cls: 'bg-[#7091E6]/15 text-[#3D52A0] border-[#7091E6]/30' },
  recap:        { label: 'Recap',       cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  exam_practice:{ label: 'Exam Prep',   cls: 'bg-red-100 text-red-700 border-red-200' },
  catchup:      { label: 'Catch-Up',   cls: 'bg-orange-100 text-orange-700 border-orange-200' },
};

export default function DailyTasks({ user, tasks, plan, onRefresh }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [completing, setCompleting] = useState(null);
  const [addingCatchup, setAddingCatchup] = useState(false);
  const qc = useQueryClient();

  const dayTasks = tasks.filter(t => t.date === selectedDate);
  const prevDay = () => setSelectedDate(prev => subDays(parseISO(prev), 1).toISOString().split('T')[0]);
  const nextDay = () => setSelectedDate(prev => addDays(parseISO(prev), 1).toISOString().split('T')[0]);

  const missedTasks = tasks.filter(t =>
    t.status !== 'completed' &&
    isPast(parseISO(t.date)) &&
    !isToday(parseISO(t.date))
  );

  const completeTask = async (task) => {
    if (task.status === 'completed') return;
    setCompleting(task.id);
    try {
      await base44.entities.RevisionTask.update(task.id, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      });

      if (plan?.id) {
        const todayStr = new Date().toISOString().split('T')[0];
        const lastDate = plan.last_activity_date;
        const yesterday = subDays(new Date(), 1).toISOString().split('T')[0];
        const newStreak = lastDate === yesterday || lastDate === todayStr ? (plan.current_streak || 0) + 1 : 1;
        const longest = Math.max(newStreak, plan.longest_streak || 0);
        await base44.entities.RevisionPlan.update(plan.id, {
          total_xp: (plan.total_xp || 0) + (task.xp_reward || 50),
          current_streak: newStreak,
          longest_streak: longest,
          last_activity_date: todayStr,
        });
      }
      onRefresh?.();
    } finally {
      setCompleting(null);
    }
  };

  const addCatchupDay = async () => {
    if (!missedTasks.length || !plan?.id) return;
    setAddingCatchup(true);
    try {
      // Find next available day without tasks
      let catchupDate = addDays(new Date(), 1);
      const usedDates = new Set(tasks.map(t => t.date));
      while (usedDates.has(catchupDate.toISOString().split('T')[0])) {
        catchupDate = addDays(catchupDate, 1);
      }
      const catchupDateStr = catchupDate.toISOString().split('T')[0];

      // Create catch-up versions of missed tasks (up to 3)
      const toRecover = missedTasks.slice(0, 3);
      await base44.entities.RevisionTask.bulkCreate(
        toRecover.map(t => ({
          plan_id: plan.id,
          student_email: user.email,
          date: catchupDateStr,
          title: `🔄 Catch-Up: ${t.title.replace(/^[^ ]+ /, '')}`,
          subject: t.subject,
          topic: t.topic,
          task_type: t.task_type,
          duration_minutes: t.duration_minutes,
          xp_reward: Math.round((t.xp_reward || 50) * 0.75),
          status: 'upcoming',
          session_phase: 'catchup',
        }))
      );
      onRefresh?.();
    } finally {
      setAddingCatchup(false);
    }
  };

  const dateLabel = isToday(parseISO(selectedDate)) ? '📅 Today' : format(parseISO(selectedDate), 'EEEE, d MMM');
  const completed = dayTasks.filter(t => t.status === 'completed').length;
  const total = dayTasks.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  const allDone = total > 0 && completed === total;

  return (
    <div className="space-y-4">
      {/* Catch-up alert */}
      <AnimatePresence>
        {missedTasks.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-2xl p-4">
            <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-orange-800 font-semibold text-sm">{missedTasks.length} missed session{missedTasks.length > 1 ? 's' : ''}</p>
              <p className="text-orange-600 text-xs">Schedule a catch-up day to stay on track</p>
            </div>
            <button onClick={addCatchupDay} disabled={addingCatchup}
              className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 text-white rounded-xl text-xs font-semibold hover:bg-orange-600 transition-all disabled:opacity-50">
              {addingCatchup ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarDays className="w-3.5 h-3.5" />}
              Add Catch-Up
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Date navigator */}
      <div className="bg-white/40 backdrop-blur-md border border-white/30 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <button onClick={prevDay} className="p-2 hover:bg-white/30 rounded-xl transition-all text-[#8697C4] hover:text-[#3D52A0]">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="text-[#3D52A0] font-bold text-lg">{dateLabel}</p>
            <p className="text-[#8697C4] text-xs">{format(parseISO(selectedDate), 'EEEE, d MMMM yyyy')}</p>
            {total > 0 && (
              <div className="mt-2 flex items-center gap-2 justify-center">
                <div className="w-28 h-1.5 bg-[#EDE8F5] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#7091E6] to-[#3D52A0] rounded-full transition-all"
                    style={{ width: `${progress}%` }} />
                </div>
                <span className="text-xs text-[#8697C4]">{completed}/{total}</span>
                {allDone && <span className="text-xs text-emerald-600 font-bold">✓ All done!</span>}
              </div>
            )}
          </div>
          <button onClick={nextDay} className="p-2 hover:bg-white/30 rounded-xl transition-all text-[#8697C4] hover:text-[#3D52A0]">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Progress summary */}
      {total > 0 && (
        <div className="flex gap-3">
          <div className="flex-1 bg-white/30 border border-white/20 rounded-xl p-3 text-center">
            <p className="text-[#3D52A0] font-bold text-xl">{completed}</p>
            <p className="text-[#8697C4] text-xs">Completed</p>
          </div>
          <div className="flex-1 bg-white/30 border border-white/20 rounded-xl p-3 text-center">
            <p className="text-[#3D52A0] font-bold text-xl">{total - completed}</p>
            <p className="text-[#8697C4] text-xs">Remaining</p>
          </div>
          <div className="flex-1 bg-white/30 border border-white/20 rounded-xl p-3 text-center">
            <p className="text-amber-600 font-bold text-xl">{dayTasks.reduce((s, t) => t.status !== 'completed' ? s + (t.xp_reward || 0) : s, 0)}</p>
            <p className="text-[#8697C4] text-xs">XP to earn</p>
          </div>
        </div>
      )}

      {/* Task list */}
      <AnimatePresence mode="wait">
        {dayTasks.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-14 text-[#8697C4]">
            <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-[#3D52A0]">No tasks scheduled for this day</p>
            <p className="text-sm mt-1">Generate a plan in the Smart Planner tab</p>
          </motion.div>
        ) : (
          <motion.div key={selectedDate} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
            {dayTasks.map((task, idx) => {
              const cfg = TYPE_CONFIG[task.task_type] || TYPE_CONFIG.practice;
              const Icon = cfg.icon;
              const done = task.status === 'completed';
              const missed = task.status === 'missed';
              const phase = PHASE_BADGE[task.session_phase];

              return (
                <motion.div key={task.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                  className={`flex items-start gap-3 p-4 rounded-2xl border transition-all shadow-sm ${
                    done ? 'bg-emerald-50/60 border-emerald-200 opacity-80' :
                    missed ? 'bg-red-50/40 border-red-200 opacity-60' :
                    'bg-white/40 border-white/30 hover:bg-white/60'
                  }`}>
                  {/* Type icon */}
                  <div className={`p-2.5 rounded-xl border ${cfg.bg} flex-shrink-0 mt-0.5`}>
                    <Icon className={`w-4 h-4 ${cfg.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm leading-snug ${done ? 'line-through text-[#8697C4]' : missed ? 'text-[#8697C4]' : 'text-[#3D52A0]'}`}>
                      {task.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      {task.subject && (
                        <span className="text-[#8697C4] text-xs bg-white/50 px-2 py-0.5 rounded-full border border-white/30">
                          {task.subject}
                        </span>
                      )}
                      {phase && (
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${phase.cls}`}>
                          {phase.label}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[#8697C4] text-xs">
                        <Clock className="w-3 h-3" />{task.duration_minutes}m
                      </span>
                      <span className="flex items-center gap-1 text-amber-600 text-xs font-semibold">
                        <Star className="w-3 h-3" />+{task.xp_reward} XP
                      </span>
                      {missed && (
                        <span className="flex items-center gap-1 text-red-500 text-xs font-medium">
                          <AlertTriangle className="w-3 h-3" />Missed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Complete button */}
                  <button onClick={() => completeTask(task)} disabled={done || missed || completing === task.id}
                    className="flex-shrink-0 p-1 rounded-full transition-all hover:scale-110">
                    {completing === task.id ? (
                      <div className="w-6 h-6 border-2 border-[#7091E6] border-t-transparent rounded-full animate-spin" />
                    ) : done ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    ) : (
                      <Circle className="w-6 h-6 text-[#ADB8DA] hover:text-[#7091E6] transition-colors" />
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