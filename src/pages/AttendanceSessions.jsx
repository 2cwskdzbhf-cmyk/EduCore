import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ChevronLeft, Plus, Trash2, CalendarCheck, X, Play, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

const PERIODS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'AM', 'PM'];

function SessionModal({ classes, onSave, onClose }) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [form, setForm] = useState({ class_id: '', date: today, period: 'P1', notes: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-800">New Session</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Class *</label>
            <select value={form.class_id} onChange={e => set('class_id', e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Select a class...</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Period *</label>
              <select value={form.period} onChange={e => set('period', e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
            <input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="e.g. Cover lesson"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-700 text-sm">Cancel</button>
          <button
            onClick={() => form.class_id && form.date && form.period && onSave(form)}
            disabled={!form.class_id || !form.date || !form.period}
            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40"
          >Create Session</button>
        </div>
      </motion.div>
    </div>
  );
}

export default function AttendanceSessions() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const { data: sessions = [] } = useQuery({
    queryKey: ['att_sessions'],
    queryFn: () => base44.entities.AttendanceSession.list('-date', 100)
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['att_classes'],
    queryFn: () => base44.entities.AttendanceClass.list()
  });

  const { data: records = [] } = useQuery({
    queryKey: ['att_records_all'],
    queryFn: () => base44.entities.AttendanceRecord.list('-date', 500)
  });

  const createMutation = useMutation({
    mutationFn: async (form) => {
      const cls = classes.find(c => c.id === form.class_id);
      await base44.entities.AttendanceSession.create({ ...form, class_name: cls?.name || '' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['att_sessions'] });
      setShowModal(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AttendanceSession.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['att_sessions'] });
      setDeleteId(null);
    }
  });

  const getSessionStats = (session) => {
    const sessionRecords = records.filter(r => r.session_id === session.id);
    const cls = classes.find(c => c.id === session.class_id);
    const total = (cls?.student_ids || []).length;
    const marked = sessionRecords.length;
    const present = sessionRecords.filter(r => r.status === 'present').length;
    return { total, marked, present };
  };

  // Group by date
  const grouped = sessions.reduce((acc, s) => {
    if (!acc[s.date]) acc[s.date] = [];
    acc[s.date].push(s);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/AttendanceDashboard" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-bold text-lg text-slate-900 flex-1">Sessions</h1>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-medium">
            <Plus className="w-4 h-4" /> New Session
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {sortedDates.length === 0 && (
          <div className="py-16 text-center text-slate-400">
            <CalendarCheck className="w-12 h-12 mx-auto mb-3 text-slate-200" />
            <p>No sessions yet. Create one to start taking registers.</p>
          </div>
        )}
        {sortedDates.map(date => (
          <div key={date} className="mb-6">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              {format(new Date(date + 'T12:00:00'), 'EEEE, d MMMM yyyy')}
            </h3>
            <div className="space-y-2">
              {grouped[date].map((s, i) => {
                const stats = getSessionStats(s);
                const cls = classes.find(c => c.id === s.class_id);
                const complete = stats.marked >= stats.total && stats.total > 0;
                return (
                  <motion.div key={s.id}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                      ${complete ? 'bg-emerald-100' : 'bg-indigo-100'}`}>
                      {complete
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        : <CalendarCheck className="w-5 h-5 text-indigo-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800">{cls?.name || s.class_name || 'Unknown Class'}</p>
                      <p className="text-xs text-slate-500">
                        {s.period} · {stats.marked}/{stats.total} marked
                        {complete && <span className="ml-1 text-emerald-600 font-medium">· Complete</span>}
                      </p>
                      {s.notes && <p className="text-xs text-slate-400 italic mt-0.5">{s.notes}</p>}
                    </div>
                    <Link to={`/TakeRegister`} state={{ sessionId: s.id }}
                      onClick={() => {}}
                      className="p-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600">
                      <Play className="w-4 h-4" />
                    </Link>
                    <button onClick={() => setDeleteId(s.id)}
                      className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showModal && <SessionModal classes={classes} onSave={(form) => createMutation.mutate(form)} onClose={() => setShowModal(false)} />}
        {deleteId && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDeleteId(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-slate-800 mb-2">Delete Session?</h3>
              <p className="text-sm text-slate-500 mb-4">This will remove the session but not the attendance records.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-2 border border-slate-200 rounded-xl text-sm">Cancel</button>
                <button onClick={() => deleteMutation.mutate(deleteId)} className="flex-1 py-2 bg-red-500 text-white rounded-xl text-sm font-semibold">Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}