import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft, CheckCircle2, Clock, XCircle,
  Save, Plus, Calendar, Download, Loader2, Users
} from 'lucide-react';

const STATUS_CONFIG = {
  present: { label: 'Present', color: 'bg-emerald-500', border: 'border-emerald-500', text: 'text-emerald-400', icon: CheckCircle2, light: 'bg-emerald-500/10' },
  late:    { label: 'Late',    color: 'bg-amber-500',   border: 'border-amber-500',   text: 'text-amber-400',   icon: Clock,         light: 'bg-amber-500/10' },
  absent:  { label: 'Absent',  color: 'bg-red-500',     border: 'border-red-500',     text: 'text-red-400',     icon: XCircle,       light: 'bg-red-500/10' },
};

export default function AttendanceTakeRegister() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const [selectedClassId, setSelectedClassId] = useState(urlParams.get('class') || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [period, setPeriod] = useState('P1');
  const [sessionId, setSessionId] = useState(null);
  const [marks, setMarks] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const longPressTimers = useRef({});

  const { data: classes = [] } = useQuery({
    queryKey: ['att-classes'],
    queryFn: () => base44.entities.AttendanceClass.list()
  });

  const { data: allStudents = [] } = useQuery({
    queryKey: ['att-students'],
    queryFn: () => base44.entities.AttendanceStudent.list()
  });

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const classStudents = selectedClass
    ? allStudents.filter(s => (selectedClass.student_ids || []).includes(s.id))
    : [];

  // Load existing session for this class/date/period
  const { data: existingSession } = useQuery({
    queryKey: ['att-session', selectedClassId, date, period],
    queryFn: async () => {
      if (!selectedClassId) return null;
      const sessions = await base44.entities.AttendanceSession.filter({
        class_id: selectedClassId, date, period
      });
      return sessions[0] || null;
    },
    enabled: !!selectedClassId,
    onSuccess: async (sess) => {
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
    }
  });

  const handleMark = (studentId, status) => {
    setMarks(prev => ({ ...prev, [studentId]: prev[studentId] === status ? undefined : status }));
    setSaved(false);
  };

  const markAll = (status) => {
    const newMarks = {};
    classStudents.forEach(s => { newMarks[s.id] = status; });
    setMarks(newMarks);
    setSaved(false);
  };

  // Long press for absent
  const handlePointerDown = (studentId) => {
    longPressTimers.current[studentId] = setTimeout(() => {
      handleMark(studentId, 'absent');
    }, 600);
  };
  const handlePointerUp = (studentId) => {
    clearTimeout(longPressTimers.current[studentId]);
  };

  const saveRegister = async () => {
    if (!selectedClassId || classStudents.length === 0) return;
    setSaving(true);

    let sid = sessionId;
    if (!sid) {
      const sess = await base44.entities.AttendanceSession.create({
        class_id: selectedClassId, date, period
      });
      sid = sess.id;
      setSessionId(sid);
    }

    // Upsert records
    const existingRecords = await base44.entities.AttendanceRecord.filter({ session_id: sid });
    const existingMap = {};
    existingRecords.forEach(r => { existingMap[r.student_id] = r; });

    const promises = classStudents.map(async (s) => {
      const status = marks[s.id];
      if (!status) return;
      if (existingMap[s.id]) {
        await base44.entities.AttendanceRecord.update(existingMap[s.id].id, {
          status, marked_at: new Date().toISOString()
        });
      } else {
        await base44.entities.AttendanceRecord.create({
          session_id: sid, class_id: selectedClassId,
          student_id: s.id, student_name: s.name,
          status, marked_at: new Date().toISOString(),
          date, period
        });
      }
    });

    await Promise.all(promises);
    queryClient.invalidateQueries({ queryKey: ['att-records-all'] });
    queryClient.invalidateQueries({ queryKey: ['att-session', selectedClassId, date, period] });
    setSaving(false);
    setSaved(true);
  };

  const markedCount = Object.values(marks).filter(Boolean).length;
  const presentCount = Object.values(marks).filter(v => v === 'present').length;
  const lateCount = Object.values(marks).filter(v => v === 'late').length;
  const absentCount = Object.values(marks).filter(v => v === 'absent').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/att-dashboard" className="text-slate-400 hover:text-white transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Take Register</h1>
            <p className="text-slate-400 text-sm">Mark attendance for a class</p>
          </div>
        </div>

        {/* Session Setup */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-5 backdrop-blur-sm">
          <h2 className="text-white font-semibold mb-4">Session Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Class</label>
              <select
                value={selectedClassId}
                onChange={e => { setSelectedClassId(e.target.value); setMarks({}); setSaved(false); }}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              >
                <option value="">Select class…</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Date</label>
              <input
                type="date"
                value={date}
                onChange={e => { setDate(e.target.value); setMarks({}); setSaved(false); }}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Period</label>
              <select
                value={period}
                onChange={e => { setPeriod(e.target.value); setMarks({}); setSaved(false); }}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              >
                {['P1','P2','P3','P4','P5','P6','AM','PM'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
        </div>

        {selectedClassId && (
          <>
            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: 'Present', count: presentCount, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                { label: 'Late',    count: lateCount,    color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' },
                { label: 'Absent',  count: absentCount,  color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20' },
              ].map(s => (
                <div key={s.label} className={`border rounded-xl p-3 text-center ${s.bg}`}>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
                  <p className="text-xs text-slate-400">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div className="flex flex-wrap gap-2 mb-4">
              <button onClick={() => markAll('present')} className="text-xs px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/30 transition-colors">All Present</button>
              <button onClick={() => markAll('absent')} className="text-xs px-3 py-1.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors">All Absent</button>
              <button onClick={() => setMarks({})} className="text-xs px-3 py-1.5 bg-white/5 text-slate-400 border border-white/10 rounded-lg hover:bg-white/10 transition-colors">Clear All</button>
              <span className="ml-auto text-xs text-slate-400 flex items-center">{markedCount}/{classStudents.length} marked</span>
            </div>

            {/* Hint */}
            <div className="text-xs text-slate-500 mb-3 flex items-center gap-3">
              <span>👆 Click = Present</span>
              <span>👆👆 Double click = Late</span>
              <span>👇 Hold = Absent</span>
            </div>

            {/* Student list */}
            {classStudents.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center">
                <Users className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                <p className="text-slate-400">No students assigned to this class.</p>
                <Link to="/att-classes" className="text-purple-400 text-sm mt-2 inline-block hover:underline">Manage class →</Link>
              </div>
            ) : (
              <div className="space-y-2 mb-6">
                <AnimatePresence>
                  {classStudents.map((student, i) => {
                    const status = marks[student.id];
                    const cfg = status ? STATUS_CONFIG[status] : null;
                    return (
                      <motion.div
                        key={student.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className={`flex items-center gap-3 p-4 rounded-xl border transition-all select-none ${cfg ? `${cfg.light} ${cfg.border}` : 'bg-white/5 border-white/10'}`}
                        onPointerDown={() => handlePointerDown(student.id)}
                        onPointerUp={() => handlePointerUp(student.id)}
                        onPointerLeave={() => handlePointerUp(student.id)}
                        onClick={() => handleMark(student.id, 'present')}
                        onDoubleClick={(e) => { e.preventDefault(); clearTimeout(longPressTimers.current[student.id]); handleMark(student.id, 'late'); }}
                      >
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm truncate">{student.name}</p>
                          <p className="text-slate-500 text-xs">{student.student_id} {student.tutor_group ? `· ${student.tutor_group}` : ''}</p>
                        </div>
                        {/* Status buttons */}
                        <div className="flex gap-1 flex-shrink-0">
                          {Object.entries(STATUS_CONFIG).map(([s, c]) => (
                            <button
                              key={s}
                              onClick={(e) => { e.stopPropagation(); handleMark(student.id, s); }}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all border ${
                                status === s
                                  ? `${c.color} text-white border-transparent shadow-md`
                                  : 'bg-white/5 text-slate-500 border-white/10 hover:bg-white/10'
                              }`}
                              title={c.label}
                            >
                              <c.icon className="w-4 h-4" />
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}

            {/* Save button */}
            {classStudents.length > 0 && (
              <button
                onClick={saveRegister}
                disabled={saving || markedCount === 0}
                className={`w-full py-4 rounded-2xl font-bold text-white transition-all flex items-center justify-center gap-2 text-base shadow-lg ${
                  saved
                    ? 'bg-emerald-500 shadow-emerald-500/30'
                    : 'bg-gradient-to-r from-purple-500 to-blue-500 shadow-purple-500/30 hover:from-purple-600 hover:to-blue-600 disabled:opacity-50'
                }`}
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : saved ? <CheckCircle2 className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                {saving ? 'Saving…' : saved ? 'Register Saved!' : 'Save Register'}
              </button>
            )}
          </>
        )}

        {!selectedClassId && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
            <Calendar className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-300 font-medium">Select a class to start</p>
            <p className="text-slate-500 text-sm mt-1">Choose a class above to begin taking the register</p>
          </div>
        )}
      </div>
    </div>
  );
}