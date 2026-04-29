import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, BookOpen, Users, X } from 'lucide-react';
import AttendanceNav from '@/components/attendance/AttendanceNav';

function ClassForm({ initial = {}, students = [], onSave, onCancel, loading }) {
  const [form, setForm] = useState({
    name: initial.name || '',
    subject: initial.subject || '',
    teacher_name: initial.teacher_name || '',
    room: initial.room || '',
    student_ids: initial.student_ids || []
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleStudent = (id) => {
    setForm(f => ({
      ...f,
      student_ids: f.student_ids.includes(id)
        ? f.student_ids.filter(s => s !== id)
        : [...f.student_ids, id]
    }));
  };

  const valid = form.name.trim() && form.subject.trim() && form.teacher_name.trim();

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="bg-white/5 border border-purple-500/30 rounded-2xl p-5 mb-4">
      <h3 className="text-white font-semibold mb-4">{initial.id ? 'Edit Class' : 'Add Class'}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {[
          { key: 'name', label: 'Class Name *', ph: 'Year 10 Maths Set 1' },
          { key: 'subject', label: 'Subject *', ph: 'Mathematics' },
          { key: 'teacher_name', label: 'Teacher Name *', ph: 'Mr Smith' },
          { key: 'room', label: 'Room', ph: 'M12' },
        ].map(f => (
          <div key={f.key}>
            <label className="text-slate-400 text-xs mb-1 block">{f.label}</label>
            <input value={form[f.key]} onChange={e => set(f.key, e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              placeholder={f.ph} />
          </div>
        ))}
      </div>

      {/* Student selector */}
      <div className="mb-4">
        <label className="text-slate-400 text-xs mb-2 block">Assign Students ({form.student_ids.length} selected)</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
          {students.map(s => {
            const checked = form.student_ids.includes(s.id);
            return (
              <button key={s.id} onClick={() => toggleStudent(s.id)}
                className={`flex items-center gap-2 p-2 rounded-lg border text-left text-xs transition-all ${checked ? 'border-purple-500/50 bg-purple-500/10 text-white' : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'}`}>
                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${checked ? 'bg-purple-500 border-purple-400' : 'border-slate-600'}`}>
                  {checked && <span className="text-white text-[9px]">✓</span>}
                </div>
                <span className="truncate">{s.name}</span>
              </button>
            );
          })}
        </div>
        {students.length === 0 && <p className="text-slate-500 text-xs">Add students first to assign them.</p>}
      </div>

      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-400 hover:text-white border border-white/10 rounded-xl transition-colors">Cancel</button>
        <button onClick={() => onSave(form)} disabled={!valid || loading}
          className="px-4 py-2 text-sm text-white bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl disabled:opacity-50 hover:from-purple-600 hover:to-blue-600 transition-all flex items-center gap-2">
          {loading && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {initial.id ? 'Update Class' : 'Add Class'}
        </button>
      </div>
    </motion.div>
  );
}

export default function AttendanceClasses() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data: classes = [] } = useQuery({
    queryKey: ['att-classes'],
    queryFn: () => base44.entities.AttendanceClass.list()
  });

  const { data: students = [] } = useQuery({
    queryKey: ['att-students'],
    queryFn: () => base44.entities.AttendanceStudent.list('name')
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AttendanceClass.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['att-classes'] }); setShowForm(false); }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AttendanceClass.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['att-classes'] }); setEditingClass(null); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AttendanceClass.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['att-classes'] }); setDeleteConfirm(null); }
  });

  const SUBJECT_COLORS = ['from-blue-500 to-cyan-500', 'from-purple-500 to-violet-500', 'from-emerald-500 to-teal-500', 'from-amber-500 to-orange-500', 'from-pink-500 to-rose-500', 'from-indigo-500 to-blue-500'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <AttendanceNav />
      <div className="max-w-3xl mx-auto p-4 md:p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">Classes</h1>
            <p className="text-slate-400 text-sm">{classes.length} classes</p>
          </div>
          <button onClick={() => { setShowForm(true); setEditingClass(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-medium rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all shadow-lg shadow-purple-500/30">
            <Plus className="w-4 h-4" /> Add Class
          </button>
        </div>

        <AnimatePresence>
          {showForm && !editingClass && (
            <ClassForm students={students} onSave={(data) => createMutation.mutate(data)} onCancel={() => setShowForm(false)} loading={createMutation.isPending} />
          )}
        </AnimatePresence>

        <div className="grid sm:grid-cols-2 gap-4">
          {classes.length === 0 && !showForm && (
            <div className="sm:col-span-2 text-center py-12 text-slate-400">
              <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No classes yet. Create one above!</p>
            </div>
          )}
          <AnimatePresence>
            {classes.map((c, i) => {
              const assignedStudents = students.filter(s => (c.student_ids || []).includes(s.id));
              const colorIdx = i % SUBJECT_COLORS.length;

              return (
                <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.05 }}>
                  {editingClass?.id === c.id ? (
                    <ClassForm initial={c} students={students} onSave={(data) => updateMutation.mutate({ id: c.id, data })} onCancel={() => setEditingClass(null)} loading={updateMutation.isPending} />
                  ) : (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/8 transition-colors group">
                      <div className="flex items-start justify-between mb-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${SUBJECT_COLORS[colorIdx]} flex items-center justify-center flex-shrink-0`}>
                          <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingClass(c); setShowForm(false); }}
                            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeleteConfirm(c)}
                            className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <h3 className="text-white font-semibold text-sm mb-1">{c.name}</h3>
                      <p className="text-slate-400 text-xs mb-1">{c.subject} · {c.teacher_name}</p>
                      {c.room && <p className="text-slate-500 text-xs mb-3">Room {c.room}</p>}
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Users className="w-3.5 h-3.5" />
                        <span>{assignedStudents.length} student{assignedStudents.length !== 1 ? 's' : ''}</span>
                      </div>
                      {assignedStudents.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {assignedStudents.slice(0, 4).map(s => (
                            <span key={s.id} className="text-[10px] bg-white/10 text-slate-300 px-2 py-0.5 rounded-full">{s.name.split(' ')[0]}</span>
                          ))}
                          {assignedStudents.length > 4 && (
                            <span className="text-[10px] bg-white/10 text-slate-400 px-2 py-0.5 rounded-full">+{assignedStudents.length - 4} more</span>
                          )}
                        </div>
                      )}
                      <Link to={`/att-take-register?class=${c.id}`} className="mt-3 block text-center py-2 text-xs text-purple-400 border border-purple-500/30 rounded-xl hover:bg-purple-500/10 transition-colors">
                        Take Register →
                      </Link>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
              className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full">
              <h3 className="text-white font-bold mb-2">Delete Class?</h3>
              <p className="text-slate-400 text-sm mb-5">Permanently delete <strong className="text-white">{deleteConfirm.name}</strong>?</p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm text-slate-400 border border-white/10 rounded-xl hover:bg-white/5">Cancel</button>
                <button onClick={() => deleteMutation.mutate(deleteConfirm.id)} disabled={deleteMutation.isPending}
                  className="px-4 py-2 text-sm text-white bg-red-500 hover:bg-red-600 rounded-xl disabled:opacity-50 transition-colors">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}