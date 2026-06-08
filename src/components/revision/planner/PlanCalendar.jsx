import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isSameDay,
  isToday, isPast, parseISO, isFuture
} from 'date-fns';

const PHASE_COLOR = {
  warmup:        'bg-orange-400',
  main:          'bg-[#7091E6]',
  recap:         'bg-purple-400',
  exam_practice: 'bg-red-400',
};

function getDayStatus(dayTasks) {
  if (!dayTasks.length) return 'empty';
  const done = dayTasks.filter(t => t.status === 'completed').length;
  if (done === dayTasks.length) return 'complete';
  if (done > 0) return 'partial';
  const anyMissed = dayTasks.some(t => t.status === 'missed' || (isPast(parseISO(dayTasks[0].date)) && !isToday(parseISO(dayTasks[0].date))));
  if (anyMissed) return 'missed';
  return 'upcoming';
}

export default function PlanCalendar({ tasks, plan, onSelectDate }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  const tasksByDate = {};
  tasks.forEach(t => {
    if (!tasksByDate[t.date]) tasksByDate[t.date] = [];
    tasksByDate[t.date].push(t);
  });

  const examDate = plan?.subjects?.[0]?.exam_date;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const weeks = [];
  let day = calStart;
  while (day <= calEnd) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push(day);
      day = addDays(day, 1);
    }
    weeks.push(week);
  }

  const selectedDateStr = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : null;
  const selectedTasks = selectedDateStr ? (tasksByDate[selectedDateStr] || []) : [];

  return (
    <div className="space-y-4">
      {/* Month nav */}
      <div className="flex items-center justify-between rounded-2xl p-4"
        style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.3)' }}>
        <button onClick={() => setCurrentMonth(m => subMonths(m, 1))}
          className="p-2 rounded-xl hover:bg-white/20 transition-all text-[#8697C4] hover:text-[#3D52A0]">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="text-[#3D52A0] font-black text-lg">{format(currentMonth, 'MMMM yyyy')}</h3>
        <button onClick={() => setCurrentMonth(m => addMonths(m, 1))}
          className="p-2 rounded-xl hover:bg-white/20 transition-all text-[#8697C4] hover:text-[#3D52A0]">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.3)' }}>
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
            <div key={d} className="py-2 text-center text-[#8697C4] text-xs font-bold">{d}</div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7" style={{ borderBottom: wi < weeks.length - 1 ? '1px solid rgba(255,255,255,0.15)' : 'none' }}>
            {week.map((d, di) => {
              const dateStr = format(d, 'yyyy-MM-dd');
              const dayTasks = tasksByDate[dateStr] || [];
              const inMonth = isSameMonth(d, currentMonth);
              const isExam = examDate && dateStr === examDate;
              const isTodayDay = isToday(d);
              const isSelected = selectedDay && isSameDay(d, selectedDay);
              const status = inMonth ? getDayStatus(dayTasks) : 'empty';

              return (
                <button key={di} onClick={() => { setSelectedDay(isSameDay(d, selectedDay || new Date(0)) ? null : d); }}
                  className={`relative min-h-[60px] p-1.5 text-left transition-all border-r last:border-r-0 ${
                    isSelected ? 'bg-white/30' : inMonth ? 'hover:bg-white/15' : ''
                  }`}
                  style={{ borderColor: 'rgba(255,255,255,0.15)' }}>

                  {/* Date number */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${
                    isTodayDay
                      ? 'text-white'
                      : isExam
                      ? 'text-white'
                      : inMonth
                      ? 'text-[#3D52A0]'
                      : 'text-[#ADB8DA]'
                  }`}
                  style={isTodayDay ? { background: 'linear-gradient(135deg,#7091E6,#3D52A0)' } :
                         isExam ? { background: '#ef4444' } : {}}>
                    {format(d, 'd')}
                  </div>

                  {isExam && (
                    <div className="text-[8px] font-bold text-red-600 leading-none mb-1">EXAM</div>
                  )}

                  {/* Task dots */}
                  {inMonth && dayTasks.length > 0 && (
                    <div className="space-y-0.5">
                      {dayTasks.slice(0, 3).map((t, i) => {
                        const done = t.status === 'completed';
                        const missed = t.status === 'missed';
                        return (
                          <div key={i} className={`h-1.5 rounded-full transition-all ${
                            done ? 'bg-emerald-500' :
                            missed ? 'bg-red-400' :
                            PHASE_COLOR[t.session_phase] || 'bg-[#7091E6]'
                          }`} style={{ opacity: done ? 0.8 : 1 }} />
                        );
                      })}
                      {dayTasks.length > 3 && (
                        <p className="text-[#8697C4] text-[9px] font-semibold">+{dayTasks.length - 3}</p>
                      )}
                    </div>
                  )}

                  {/* Status badge */}
                  {inMonth && status === 'complete' && (
                    <div className="absolute top-1 right-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    </div>
                  )}
                  {inMonth && status === 'missed' && dayTasks.length > 0 && (
                    <div className="absolute top-1 right-1">
                      <AlertTriangle className="w-3 h-3 text-red-400" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap px-1">
        {[
          ['bg-emerald-500', 'Completed'],
          ['bg-[#7091E6]', 'Scheduled'],
          ['bg-orange-400', 'Warm-up'],
          ['bg-purple-400', 'Recap'],
          ['bg-red-400', 'Exam Practice'],
        ].map(([cls, label]) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${cls}`} />
            <span className="text-[#8697C4] text-xs">{label}</span>
          </div>
        ))}
      </div>

      {/* Selected day tasks */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl p-4"
            style={{ background: 'rgba(112,145,230,0.15)', backdropFilter: 'blur(20px)', border: '1px solid rgba(112,145,230,0.3)' }}>
            <h4 className="text-[#3D52A0] font-bold text-sm mb-3">
              {isToday(selectedDay) ? 'Today' : format(selectedDay, 'EEEE, d MMMM')}
              {examDate && format(selectedDay, 'yyyy-MM-dd') === examDate && ' 🎓 EXAM DAY'}
            </h4>
            {selectedTasks.length === 0 ? (
              <p className="text-[#8697C4] text-sm">
                {isFuture(selectedDay) ? 'Rest day — no sessions scheduled' : 'No sessions on this day'}
              </p>
            ) : (
              <div className="space-y-2">
                {selectedTasks
                  .sort((a, b) => {
                    const order = { warmup: 0, main: 1, recap: 2, exam_practice: 3 };
                    return (order[a.session_phase] ?? 1) - (order[b.session_phase] ?? 1);
                  })
                  .map(task => (
                    <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}>
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        task.status === 'completed' ? 'bg-emerald-500' :
                        task.status === 'missed' ? 'bg-red-400' : 'bg-[#7091E6]'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${
                          task.status === 'completed' ? 'line-through text-[#8697C4]' : 'text-[#3D52A0]'
                        }`}>{task.title}</p>
                        <p className="text-[#8697C4] text-xs">{task.topic || task.subject}</p>
                      </div>
                      <div className="flex items-center gap-1 text-[#8697C4] text-xs flex-shrink-0">
                        <Clock className="w-3 h-3" />{task.duration_minutes}m
                      </div>
                      {task.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                    </div>
                  ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}