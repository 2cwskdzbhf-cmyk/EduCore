import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  ChevronLeft, CheckCircle2, Clock, XCircle, Download,
  Search, AlertTriangle, ClipboardList
} from 'lucide-react';

const STATUS_CONFIG = {
  present: { label: 'Present', bg: 'bg-emerald-500', light: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', icon: CheckCircle2 },
  late:    { label: 'Late',    bg: 'bg-amber-400',   light: 'bg-amber-50 border-amber-200',   text: 'text-amber-700',   icon: Clock },
  absent:  { label: 'Absent',  bg: 'bg-red-500',     light: 'bg-red-50 border-red-200',       text: 'text-red-700',     icon: XCircle },
};

function StudentCard({ student, record, onMark }) {
  const pressTimer = useRef(null);
  const clickCount = useRef(0);
  const clickTimer = useRef(null);

  const status = record?.status || null;
  const cfg = status ? STATUS_CONFIG[status] : null;
  const Icon = cfg?.icon;

  const handlePointerDown = () => {
    pressTimer.current = setTimeout(() => {
      pressTimer.current = null;
      onMark('absent');
    }, 600);
  };

  const handlePointerUp = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
      clickCount.current += 1;
      if (clickCount.current === 1) {
        clickTimer.current = setTimeout(() => {
          clickCount.current = 0;
          onMark('present');
        }, 250);
      } else if (clickCount.current >= 2) {
        clearTimeout(clickTimer.current);
        clickCount.current = 0;
        onMark('late');
      }
    }
  };

  const handlePointerLeave = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative rounded-2xl border-2 p-4 transition-all select-none
        ${status ? cfg.light : 'bg-white border-slate-200 hover:border-indigo-300'}
        ${status ? 'shadow-sm' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      style={{ cursor: 'pointer', WebkitUserSelect: 'none' }}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0
          ${cfg ? cfg.bg : 'bg-slate-300'}`}>
          {Icon ? <Icon className="w-5 h-5" /> : student.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 truncate">{student.name}</p>
          <p className="text-xs text-slate-500">{student.student_id} · {student.tutor_group || 'No group'}</p>
        </div>
        {status && (
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${cfg.light} ${cfg.text} border`}>
            {cfg.label}
          </span>
        )}
      </div>
      {/* Quick action hint */}
      {!status && (
        <p className="mt-2 text-xs text-slate-400 text-center">Tap=Present · 2×=Late · Hold=Absent</p>
      )}
    </motion.div>
  );
}

export default function TakeRegister() {
  const queryClient = useQueryClient();
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [search, setSearch] = useState('');

  const { data: sessions = [] } = useQuery({
    queryKey: ['att_sessions'],
    queryFn: () => base44.entities.AttendanceSession.list('-date', 50)
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['att_classes'],
    queryFn: () => base44.entities.AttendanceClass.list()
  });

  const { data: allStudents = [] } = useQuery({
    queryKey: ['att_students'],
    queryFn: () => base44.entities.AttendanceStudent.list()
  });

  const selectedSession = sessions.find(s => s.id === selectedSessionId);
  const selectedClass = selectedSession ? classes.find(c => c.id === selectedSession.class_id) : null;

  const classStudents = selectedClass
    ? allStudents.filter(s => (selectedClass.student_ids || []).includes(s.id))
    : [];

  const filteredStudents = classStudents.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.student_id.toLowerCase().includes(search.toLowerCase())
  );

  const { data: records = [], refetch: refetchRecords } = useQuery({
    queryKey: ['att_records_session', selectedSessionId],
    queryFn: () => selectedSessionId
      ? base44.entities.AttendanceRecord.filter({ session_id: selectedSessionId })
      : [],
    enabled: !!selectedSessionId
  });

  const markMutation = useMutation({
    mutationFn: async ({ student, status }) => {
      const existing = records.find(r => r.student_id === student.id);
      const payload = {
        session_id: selectedSessionId,
        class_id: selectedSession.class_id,
        student_id: student.id,
        student_name: student.name,
        date: selectedSession.date,
        period: selectedSession.period,
        status,
        marked_at: new Date().toISOString(),
      };
      if (existing) {
        await base44.entities.AttendanceRecord.update(existing.id, { status, marked_at: new Date().toISOString() });
      } else {
        await base44.entities.AttendanceRecord.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['att_records_session', selectedSessionId] });
      queryClient.invalidateQueries({ queryKey: ['att_records_all'] });
    }
  });

  const markAll = async (status) => {
    for (const s of classStudents) {
      await markMutation.mutateAsync({ student: s, status });
    }
  };

  const exportCSV = () => {
    if (!selectedSession) return;
    const rows = [['Student Name', 'Date', 'Period', 'Status']];
    classStudents.forEach(s => {
      const rec = records.find(r => r.student_id === s.id);
      rows.push([s.name, selectedSession.date, selectedSession.period, rec?.status || 'unmarked']);
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${selectedSession.date}_${selectedSession.period}.csv`;
    a.click();
  };

  const markedCount = records.length;
  const presentCount = records.filter(r => r.status === 'present').length;
  const lateCount = records.filter(r => r.status === 'late').length;
  const absentCount = records.filter(r => r.status === 'absent').length;

  const recentSessions = sessions.slice(0, 20);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/AttendanceDashboard" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="font-bold text-lg text-slate-900">Take Register</h1>
            {selectedSession && (
              <p className="text-xs text-slate-500">{selectedSession.date} · {selectedSession.period}</p>
            )}
          </div>
          {selectedSessionId && (
            <button onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-medium">
              <Download className="w-4 h-4" /> Export for SOCS
            </button>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Session selector */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <label className="block text-sm font-semibold text-slate-700 mb-2">Select Session</label>
          <select
            value={selectedSessionId}
            onChange={e => setSelectedSessionId(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">— Choose a session —</option>
            {recentSessions.map(s => {
              const cls = classes.find(c => c.id === s.class_id);
              return (
                <option key={s.id} value={s.id}>
                  {cls?.name || s.class_name || 'Unknown'} · {s.date} · {s.period}
                  {s.is_complete ? ' ✓' : ''}
                </option>
              );
            })}
          </select>
          {sessions.length === 0 && (
            <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" /> No sessions found. <Link to="/AttendanceSessions" className="underline">Create one first.</Link>
            </p>
          )}
        </div>

        {selectedSessionId && selectedClass && (
          <>
            {/* Stats bar */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Total', val: classStudents.length, color: 'text-slate-700', bg: 'bg-white' },
                { label: 'Present', val: presentCount, color: 'text-emerald-700', bg: 'bg-emerald-50' },
                { label: 'Late', val: lateCount, color: 'text-amber-700', bg: 'bg-amber-50' },
                { label: 'Absent', val: absentCount, color: 'text-red-700', bg: 'bg-red-50' },
              ].map(({ label, val, color, bg }) => (
                <div key={label} className={`${bg} border border-slate-200 rounded-xl p-3 text-center`}>
                  <p className={`text-xl font-bold ${color}`}>{val}</p>
                  <p className="text-xs text-slate-500">{label}</p>
                </div>
              ))}
            </div>

            {/* Quick mark all */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <p className="text-sm font-semibold text-slate-700 mb-3">Quick Mark All</p>
              <div className="flex gap-2">
                {Object.entries(STATUS_CONFIG).map(([s, cfg]) => (
                  <button key={s} onClick={() => markAll(s)}
                    className={`flex-1 py-2 rounded-xl text-white text-sm font-semibold ${cfg.bg} hover:opacity-90 transition-opacity`}>
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search students..."
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Student cards */}
            <div className="grid sm:grid-cols-2 gap-3">
              <AnimatePresence>
                {filteredStudents.map(student => (
                  <StudentCard
                    key={student.id}
                    student={student}
                    record={records.find(r => r.student_id === student.id)}
                    onMark={(status) => markMutation.mutate({ student, status })}
                  />
                ))}
              </AnimatePresence>
              {filteredStudents.length === 0 && (
                <div className="col-span-2 py-12 text-center text-slate-400 text-sm">
                  {classStudents.length === 0
                    ? 'No students assigned to this class yet.'
                    : 'No students match your search.'}
                </div>
              )}
            </div>

            {/* Progress */}
            {classStudents.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Register Progress</span>
                  <span className="text-sm text-slate-500">{markedCount} / {classStudents.length}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-indigo-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${classStudents.length > 0 ? (markedCount / classStudents.length) * 100 : 0}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {!selectedSessionId && (
          <div className="text-center py-20 text-slate-400">
            <ClipboardList className="w-16 h-16 mx-auto mb-4 text-slate-200" />
            <p className="text-lg font-medium">Select a session above to begin</p>
          </div>
        )}
      </div>
    </div>
  );
}