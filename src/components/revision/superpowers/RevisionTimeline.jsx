import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Calendar, Flame, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isPast, parseISO, subDays } from 'date-fns';

function getActivityLevel(count) {
  if (count === 0) return 'bg-white/5';
  if (count <= 2) return 'bg-violet-900/60';
  if (count <= 5) return 'bg-violet-600/70';
  if (count <= 10) return 'bg-violet-500';
  return 'bg-violet-400';
}

export default function RevisionTimeline({ user }) {
  const [viewMonth, setViewMonth] = useState(new Date());

  const { data: flashcards = [] } = useQuery({
    queryKey: ['timelineFlashcards', user?.email],
    queryFn: () => base44.entities.RevisionFlashcard.filter({ student_email: user.email }),
    enabled: !!user?.email,
  });

  const { data: notebooks = [] } = useQuery({
    queryKey: ['timelineNotebooks', user?.email],
    queryFn: () => base44.entities.RevisionNotebook.filter({ student_email: user.email }),
    enabled: !!user?.email,
  });

  // Build activity map from flashcard review dates
  const activityMap = useMemo(() => {
    const map = {};
    flashcards.forEach(fc => {
      if (fc.updated_date) {
        const d = format(parseISO(fc.updated_date), 'yyyy-MM-dd');
        map[d] = (map[d] || 0) + 1;
      }
    });
    return map;
  }, [flashcards]);

  // Streak calculation
  const { currentStreak, longestStreak } = useMemo(() => {
    const today = new Date();
    let current = 0;
    let longest = 0;
    let temp = 0;
    for (let i = 0; i < 365; i++) {
      const d = format(subDays(today, i), 'yyyy-MM-dd');
      if (activityMap[d]) {
        temp++;
        if (i === 0 || current > 0) current = temp;
      } else {
        if (temp > longest) longest = temp;
        temp = 0;
        if (i === 0) current = 0;
      }
    }
    if (temp > longest) longest = temp;
    return { currentStreak: current, longestStreak: longest };
  }, [activityMap]);

  // Overdue flashcards
  const overdueCards = useMemo(() =>
    flashcards.filter(fc => fc.next_review && isPast(parseISO(fc.next_review)) && !isToday(parseISO(fc.next_review))),
    [flashcards]
  );

  // Due today
  const dueToday = useMemo(() =>
    flashcards.filter(fc => fc.next_review && isToday(parseISO(fc.next_review))),
    [flashcards]
  );

  // Calendar days for current month
  const calendarDays = useMemo(() => {
    const start = startOfMonth(viewMonth);
    const end = endOfMonth(viewMonth);
    return eachDayOfInterval({ start, end });
  }, [viewMonth]);

  const firstDayOfWeek = calendarDays[0].getDay();

  // Recent activity list
  const recentActivity = useMemo(() => {
    const days = [];
    for (let i = 0; i < 14; i++) {
      const d = subDays(new Date(), i);
      const key = format(d, 'yyyy-MM-dd');
      const count = activityMap[key] || 0;
      if (count > 0) {
        days.push({ date: d, count, label: format(d, 'EEE, MMM d') });
      }
    }
    return days;
  }, [activityMap]);

  const prevMonth = () => setViewMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setViewMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Current Streak', value: `${currentStreak}d`, icon: Flame, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
          { label: 'Longest Streak', value: `${longestStreak}d`, icon: Flame, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
          { label: 'Due Today', value: dueToday.length, icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
          { label: 'Overdue', value: overdueCards.length, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
        ].map(stat => (
          <div key={stat.label} className={`rounded-2xl border p-4 ${stat.bg}`}>
            <stat.icon className={`w-4 h-4 mb-2 ${stat.color}`} />
            <p className="text-2xl font-black text-white">{stat.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Calendar */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-violet-400" />
              <span className="text-sm font-bold text-white">{format(viewMonth, 'MMMM yyyy')}</span>
            </div>
            <div className="flex gap-1">
              <button onClick={prevMonth} className="px-2 py-1 rounded-lg hover:bg-white/10 text-slate-400 text-xs">‹</button>
              <button onClick={nextMonth} className="px-2 py-1 rounded-lg hover:bg-white/10 text-slate-400 text-xs">›</button>
            </div>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 mb-1">
            {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
              <div key={d} className="text-center text-xs text-slate-600 font-semibold py-1">{d}</div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} />)}
            {calendarDays.map(day => {
              const key = format(day, 'yyyy-MM-dd');
              const count = activityMap[key] || 0;
              const today = isToday(day);
              return (
                <div key={key} title={count ? `${count} cards reviewed` : ''}
                  className={`aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-all cursor-default
                    ${today ? 'ring-2 ring-violet-400' : ''}
                    ${count > 0 ? getActivityLevel(count) + ' text-white' : 'text-slate-600'}
                  `}>
                  {format(day, 'd')}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 mt-3 justify-end">
            <span className="text-xs text-slate-600">Less</span>
            {['bg-white/5','bg-violet-900/60','bg-violet-600/70','bg-violet-500','bg-violet-400'].map(c => (
              <div key={c} className={`w-3 h-3 rounded-sm ${c}`} />
            ))}
            <span className="text-xs text-slate-600">More</span>
          </div>
        </div>

        {/* Recent activity + overdue */}
        <div className="space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />Recent Activity
            </p>
            {recentActivity.length === 0 ? (
              <p className="text-slate-500 text-xs">No flashcard activity in the last 2 weeks.</p>
            ) : (
              <div className="space-y-2">
                {recentActivity.map(a => (
                  <div key={a.label} className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">{a.label}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 rounded-full bg-violet-500/30 w-24 overflow-hidden">
                        <div className="h-full bg-violet-500 rounded-full" style={{ width: `${Math.min(100, a.count * 10)}%` }} />
                      </div>
                      <span className="text-xs text-slate-500 w-12 text-right">{a.count} cards</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {overdueCards.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5">
              <p className="text-sm font-bold text-red-300 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />Overdue Cards ({overdueCards.length})
              </p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {overdueCards.slice(0, 10).map(fc => (
                  <div key={fc.id} className="text-xs text-slate-300 flex gap-2">
                    <span className="text-red-500 flex-shrink-0">•</span>
                    <span className="truncate">{fc.front}</span>
                  </div>
                ))}
                {overdueCards.length > 10 && (
                  <p className="text-xs text-slate-500">…and {overdueCards.length - 10} more</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}