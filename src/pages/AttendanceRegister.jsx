import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  CheckCircle2, Clock, XCircle, Save, Users,
  BookOpen, Loader2, CheckCheck
} from 'lucide-react';
import AttendanceNav from '@/components/attendance/AttendanceNav';

const CYCLE = ['present', 'late', 'absent'];

const STATUS_CONFIG = {
  present: {
    label: 'Present',
    bg: 'bg-emerald-500/15 border-emerald-500/50',
    badge: 'bg-emerald-500 text-white',
    icon: CheckCircle2,
    iconColor: 'text-emerald-400',
    dot: 'bg-emerald-500',
  },
  late: {
    label: 'Late',
    bg: 'bg-amber-500/15 border-amber-500/50',
    badge: 'bg-amber-500 text-white',
    icon: Clock,
    iconColor: 'text-amber-400',
    dot: 'bg-amber-500',
  },
  absent: {
    label: 'Absent',
    bg: 'bg-red-500/15 border-red-500/50',
    badge: 'bg-red-500 text-white',
    icon: XCircle,
    iconColor: 'text-red-400',
    dot: 'bg-red-500',
  },
};

const TODAY = new Date().toISOString().split('T')[0];
const PERIODS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'AM', 'PM'];

export default function AttendanceRegister() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);

  const [selectedClassId, setSelectedClassId] = useState(urlParams.get('class') || '');
  const [date, setDate] = useState(TODAY);
  const [period, setPeriod] = useState('P1');
  const [marks, setMarks] = useState({});
  const [sessionId, setSessionId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved

  // Load classes
  const { data: classes = [], isLoading: loadingClasses } = useQuery({
    queryKey: ['att-classes'],
    queryFn: () => base44.entities.AttendanceClass.list(),
  });

  // Load all students
  const { data: allStudents = [] } = useQuery({
    queryKey: ['att-students'],
    queryFn: () => base44.entities.AttendanceStudent.list(),
  });

  // Auto-select first class
  useEffect(() => {
    if (!selectedClassId && classes.length > 0) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const classStudents = selectedClass
    ? allStudents.filter(s => (selectedClass.student_ids || []).includes(s.id))
    : [];

  // Load existing session + records when class/date/period changes
  useEffect(() => {
    if (!selectedClassId) return;

    const load = async () => {
      const sessions = await base44.entities.AttendanceSession.filter({
        class_id: selectedClassId, date, period,
      });
      const sess = sessions[0] || null;

      if (sess) {
        setSessionId(sess.id);
        const existing = await base44.entities.AttendanceRecord.filter({ session_id: sess.id });
        const m = {};
        existing.forEach(r => { m[r.student_id] = r.status; });
        setMarks(m);
      } else {
        setSessionId(null);
        setMarks({});
      }
    };

    load();
  }, [selectedClassId, date, period]);

  // Cycle through present → late → absent → (clear)
  const cycleStatus = (studentId) => {
    setMarks(prev => {
      const current = prev[studentId];
      const currentIdx = CYCLE.indexOf(current);
      // If not set, start at present. If at absent, clear it.
      if (current === undefined || currentIdx === -1) {
        return { ...prev, [studentId]: 'present' };
      } else if (currentIdx < CYCLE.length - 1) {
        return { ...prev, [studentId]: CYCLE[currentIdx + 1] };
      } else {
        // Was absent, cycle back to present
        return { ...prev, [studentId]: 'present' };
      }
    });
    setSaveState('idle');
  };

  const markAll = (status) => {
    const m = {};
    classStudents.forEach(s => { m[s.id] = status; });
    setMarks(m);
    setSaveState('idle');
  };

  const saveRegister = async () => {
    if (!selectedClassId || classStudents.length === 0) return;
    setSaveState('saving');

    let sid = sessionId;
    if (!sid) {
      const sess = await base44.entities.AttendanceSession.create({
        class_id: selectedClassId,
        class_name: selectedClass?.name || '',
        date,
        period,
        is_complete: false,
      });
      sid = sess.id;
      setSessionId(sid);
    }

    const existingRecords = await base44.entities.AttendanceRecord.filter({ session_id: sid });
    const existingMap = {};
    existingRecords.forEach(r => { existingMap[r.student_id] = r; });

    const promises = classStudents.map(async (s) => {
      const status = marks[s.id];
      if (!status) return;
      if (existingMap[s.id]) {
        await base44.entities.AttendanceRecord.update(existingMap[s.id].id, {
          status,
          marked_at: new Date().toISOString(),
        });
      } else {
        await base44.entities.AttendanceRecord.create({
          session_id: sid,
          class_id: selectedClassId,
          student_id: s.id,
          student_name: s.name,
          status,
          marked_at: new Date().toISOString(),
          date,
          period,
        });
      }
    });

    // Mark session complete
    await Promise.all(promises);
    await base44.entities.AttendanceSession.update(sid, { is_complete: true });

    queryClient.invalidateQueries({ queryKey: ['att-records-all'] });
    setSaveState('saved');
  };

  const markedCount = Object.values(marks).filter(Boolean).length;
  const presentCount = Object.values(marks).filter(v => v === 'present').length;
  const lateCount = Object.values(marks).filter(v => v === 'late').length;
  const absentCount = Object.values(marks).filter(v => v === 'absent').length;
  const unmarkedCount = classStudents.length - markedCount;

  const formattedDate = new Date(date + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <AttendanceNav />

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Page title */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-white">Take Register</h1>
          <p className="text-slate-400 text-sm mt-0.5">{formattedDate} · Period {period}</p>
        </div>

        {/* Session setup */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Class selector */}
            <div>
              <label className="text-slate-400 text-xs mb-1 block font-medium">Class</label>
              {loadingClasses ? (
                <div className="flex items-center gap-2 h-10 text-slate-500 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                </div>
              ) : classes.length === 0 ? (
                <div className="text-amber-400 text-sm py-2">
                  No classes yet.{' '}
                  <Link to="/att-classes" className="underline">Create one →</Link>
                </div>
              ) : (
                <select
                  value={selectedClassId}
                  onChange={e => { setSelectedClassId(e.target.value); setMarks({}); setSaveState('idle'); }}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="text-slate-400 text-xs mb-1 block font-medium">Date</label>
              <input
                type="date"
                value={date}
                onChange={e => { setDate(e.target.value); setMarks({}); setSaveState('idle'); }}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Period */}
            <div>
              <label className="text-slate-400 text-xs mb-1 block font-medium">Period</label>
              <select
                value={period}
                onChange={e => { setPeriod(e.target.value); setMarks({}); setSaveState('idle'); }}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
              >
                {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
        </div>

        {selectedClassId && (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { label: 'Present', count: presentCount, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
                { label: 'Late', count: lateCount, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
                { label: 'Absent', count: absentCount, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
                { label: 'Unmarked', count: unmarkedCount, color: 'text-slate-400', bg: 'bg-white/5 border-white/10' },
              ].map(s => (
                <div key={s.label} className={`border rounded-xl p-2.5 text-center ${s.bg}`}>
                  <p className={`text-xl font-bold ${s.color}`}>{s.count}</p>
                  <p className="text-[11px] text-slate-400">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div className="flex flex-wrap gap-2 mb-4 items-center">
              <button onClick={() => markAll('present')} className="text-xs px-3 py-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/25 transition-colors font-medium">
                ✓ All Present
              </button>
              <button onClick={() => markAll('absent')} className="text-xs px-3 py-1.5 bg-red-500/15 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/25 transition-colors font-medium">
                ✗ All Absent
              </button>
              <button onClick={() => { setMarks({}); setSaveState('idle'); }} className="text-xs px-3 py-1.5 bg-white/5 text-slate-400 border border-white/10 rounded-lg hover:bg-white/10 transition-colors">
                Clear
              </button>
              <span className="ml-auto text-xs text-slate-500">{markedCount}/{classStudents.length} marked</span>
            </div>

            {/* Hint */}
            <p className="text-xs text-slate-500 mb-3">
              👆 Tap a row to cycle: <span className="text-emerald-400">Present</span> → <span className="text-amber-400">Late</span> → <span className="text-red-400">Absent</span> → repeat
            </p>

            {/* Student list */}
            {classStudents.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center">
                <Users className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                <p className="text-slate-300 font-medium">No students in this class</p>
                <Link to="/att-classes" className="text-purple-400 text-sm mt-2 inline-block hover:underline">
                  Add students to this class →
                </Link>
              </div>
            ) : (
              <div className="space-y-2 mb-6">
                {classStudents.map((student, i) => {
                  const status = marks[student.id];
                  const cfg = status ? STATUS_CONFIG[status] : null;
                  const StatusIcon = cfg?.icon;

                  return (
                    <motion.div
                      key={student.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.025, duration: 0.2 }}
                      onClick={() => cycleStatus(student.id)}
                      className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer select-none transition-all active:scale-[0.99] ${
                        cfg ? cfg.bg : 'bg-white/5 border-white/10 hover:bg-white/8'
                      }`}
                    >
                      {/* Avatar */}
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-base flex-shrink-0 shadow">
                        {student.name.charAt(0).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-base leading-tight">{student.name}</p>
                        <p className="text-slate-400 text-xs mt-0.5">
                          {[student.student_id, student.tutor_group].filter(Boolean).join(' · ')}
                        </p>
                      </div>

                      {/* Status badge */}
                      <div className="flex-shrink-0">
                        {cfg ? (
                          <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold ${cfg.badge}`}>
                            <StatusIcon className="w-4 h-4" />
                            {cfg.label}
                          </span>
                        ) : (
                          <span className="px-3 py-1.5 rounded-lg text-sm text-slate-500 border border-white/10 bg-white/5">
                            —
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Save button */}
            {classStudents.length > 0 && (
              <button
                onClick={saveRegister}
                disabled={saveState === 'saving' || markedCount === 0}
                className={`w-full py-4 rounded-2xl font-bold text-white transition-all flex items-center justify-center gap-2 text-base shadow-lg ${
                  saveState === 'saved'
                    ? 'bg-emerald-500 shadow-emerald-500/30'
                    : saveState === 'saving'
                    ? 'bg-slate-700 cursor-wait'
                    : 'bg-gradient-to-r from-purple-500 to-blue-500 shadow-purple-500/30 hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                {saveState === 'saving' && <Loader2 className="w-5 h-5 animate-spin" />}
                {saveState === 'saved' && <CheckCheck className="w-5 h-5" />}
                {saveState === 'idle' && <Save className="w-5 h-5" />}
                {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Register Saved!' : `Save Register (${markedCount} marked)`}
              </button>
            )}
          </>
        )}

        {!selectedClassId && !loadingClasses && classes.length === 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
            <BookOpen className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-300 font-semibold text-lg">Create a class to begin</p>
            <p className="text-slate-500 text-sm mt-1 mb-4">You need at least one class before taking a register.</p>
            <Link to="/att-classes" className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-blue-600 transition-all">
              Create a Class →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}