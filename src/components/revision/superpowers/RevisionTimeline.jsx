import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Calendar, Flame, Clock, CheckCircle, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, isBefore, startOfDay } from 'date-fns';

export default function RevisionTimeline({ user }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: flashcards = [] } = useQuery({
    queryKey: ['allFlashcards', user?.email],
    queryFn: () => base44.entities.RevisionFlashcard.filter({ student_email: user.email }),
    enabled: !!user?.email,
  });

  const { data: notebooks = [] } = useQuery({
    queryKey: ['revisionNotebooks', user?.email],
    queryFn: () => base44.entities.RevisionNotebook.filter({ student_email: user.email }),
    enabled: !!user?.email,
  });

  // Build activity map: date -> { reviewed: number, correct: number }
  const activityMap = useMemo(() => {
    const map = {};
    flashcards.forEach(fc => {
      if (fc.updated_date && fc.review_count > 0) {
        const dateKey = format(new Date(fc.updated_date), 'yyyy-MM-dd');
        if (!map[dateKey]) map[dateKey] = { reviewed: 0, correct: 0 };
        map[dateKey].reviewed += 1;
        if (fc.difficulty_rating === 'easy') map[dateKey].correct += 1;
      }
    });
    return map;
  }, [flashcards]);

  // Overdue flashcards
  const overdueCards = useMemo(() => {
    const now = new Date();
    return flashcards.filter(fc => fc.next_review && isBefore(new Date(fc.next_review), now));
  }, [flashcards]);

  // Due today
  const dueToday = useMemo(() => {
    const now = new Date();
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59);
    return flashcards.filter(fc => {
      if (!fc.next_review) return false;
      const d = new Date(fc.next_review);
      return isToday(d);
    });
  }, [flashcards]);

  // Streak calculation
  const streak = useMemo(() => {
    let count = 0;
    const today = startOfDay(new Date());
    let check = today;
    while (true) {
      const key = format(check, 'yyyy-MM-dd');
      if (activityMap[key]) {
        count++;
        check = new Date(check.getTime() - 86400000);
      } else {
        break;
      }
    }
    return count;
  }, [activityMap]);

  // Calendar days
  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const firstDayOfWeek = startOfMonth(currentMonth).getDay();
  const blanks = Array(firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1).fill(null);

  const getIntensity = (dateKey) => {
    const a = activityMap[dateKey];
    if (!a) return 0;
    if (a.reviewed >= 20) return 4;
    if (a.reviewed >= 10) return 3;
    if (a.reviewed >= 5) return 2;
    return 1;
  };

  const intensityClasses = [
    'bg-white/5',
    'bg-violet-900/60',
    'bg-violet-700/70',
    'bg-violet-500/80',
    'bg-violet-400',
  ];

  // Recent activity list
  const recentActivity = useMemo(() => {
    return Object.entries(activityMap)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 10);
  }, [activityMap]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
          <Calendar className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Revision Timeline</h2>
          <p className="text-slate-400 text-sm">Track what you revised, when, and what's overdue</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Current Streak', value: `${streak}d`, icon: Flame, color: 'from-orange-500 to-red-500' },
          { label: 'Total Cards', value: flashcards.length, icon: CheckCircle, color: 'from-green-500 to-emerald-500' },
          { label: 'Due Today', value: dueToday.length, icon: Clock, color: 'from-blue-500 to-cyan-500' },
          { label: 'Overdue', value: overdueCards.length, icon: AlertTriangle, color: overdueCards.length > 0 ? 'from-red-500 to-pink-500' : 'from-slate-600 to-slate-700' },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-2`}>
              <stat.icon className="w-4 h-4 text-white" />
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-slate-400 text-xs">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Calendar */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h3 className="text-white font-semibold">{format(currentMonth, 'MMMM yyyy')}</h3>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <div key={i} className="text-center text-xs text-slate-500 py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {blanks.map((_, i) => <div key={`b${i}`} />)}
          {days.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const intensity = getIntensity(dateKey);
            const activity = activityMap[dateKey];
            const today = isToday(day);
            return (
              <div key={dateKey}
                title={activity ? `${activity.reviewed} reviewed, ${activity.correct} correct` : 'No activity'}
                className={`aspect-square rounded-md flex items-center justify-center text-xs transition-all cursor-default
                  ${intensityClasses[intensity]}
                  ${today ? 'ring-2 ring-violet-400 ring-offset-1 ring-offset-slate-900' : ''}
                `}
              >
                <span className={intensity > 0 ? 'text-white font-medium' : 'text-slate-500'}>{day.getDate()}</span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 mt-4 justify-end">
          <span className="text-xs text-slate-500">Less</span>
          {intensityClasses.map((cls, i) => (
            <div key={i} className={`w-4 h-4 rounded-sm ${cls} border border-white/5`} />
          ))}
          <span className="text-xs text-slate-500">More</span>
        </div>
      </div>

      {/* Overdue & Recent */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Overdue */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" /> Overdue Cards ({overdueCards.length})
          </h3>
          {overdueCards.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">All cards are up to date!</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {overdueCards.slice(0, 12).map(fc => (
                <div key={fc.id} className="flex items-center gap-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                  <p className="text-slate-300 text-xs truncate">{fc.front}</p>
                  <span className="text-red-400 text-xs ml-auto flex-shrink-0">
                    {fc.next_review ? format(new Date(fc.next_review), 'MMM d') : '—'}
                  </span>
                </div>
              ))}
              {overdueCards.length > 12 && (
                <p className="text-slate-500 text-xs text-center">+{overdueCards.length - 12} more</p>
              )}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" /> Recent Activity
          </h3>
          {recentActivity.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">No revision activity yet. Start studying!</p>
          ) : (
            <div className="space-y-2">
              {recentActivity.map(([date, data]) => (
                <div key={date} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-300 text-xs">{format(new Date(date), 'EEE, d MMM')}</p>
                    <p className="text-slate-500 text-xs">{data.reviewed} reviewed · {data.correct} correct</p>
                  </div>
                  <div className="text-xs text-green-400 font-medium">
                    {data.reviewed > 0 ? Math.round((data.correct / data.reviewed) * 100) : 0}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}