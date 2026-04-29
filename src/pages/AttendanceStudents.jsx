import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, Plus, Pencil, Trash2, Search, X, Check, User } from 'lucide-react';

const YEAR_GROUPS = [7, 8, 9, 10, 11, 12, 13];

function StudentForm({ initial = {}, onSave, onCancel, loading }) {
  const [form, setForm] = useState({
    name: initial.name || '',
    student_id: initial.student_id || '',
    tutor_group: initial.tutor_group || '',
    year_group: initial.year_group || 10,
    email: initial.email || ''
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.name.trim() && form.student_id.trim();

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="bg-white/5 border border-purple-500/30 rounded-2xl p-5 mb-4">
      <h3 className="text-white font-semibold mb-4">{initial.id ? 'Edit Student' : 'Add Student'}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-slate-400 text-xs mb-1 block">Full Name *</label>
          <input value={form.name} onChange={e => set('name', e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
            placeholder="Jane Smith" />
        </div>
        <div>
          <label className="text-slate-400 text-xs mb-1 block">Student ID *</label>
          <input value={form.student_id} onChange={e => set('student_id', e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
            placeholder="S12345" />
        </div>
        <div>
          <label className="text-slate-400 text-xs mb-1 block">Tutor Group</label>
          <input value={form.tutor_group} onChange={e => set('tutor_group', e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
            placeholder="10A" />
        </div>
        <div>
          <label className="text-slate-400 text-xs mb-1 block">Year Group</label>
          <select value={form.year_group} onChange={e => set('year_group', parseInt(e.target.value))}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500">
            {YEAR_GROUPS.map(y => <option key={y} value={y}>Year {y}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="text-slate-400 text-xs mb-1 block">Email (optional)</label>
          <input value={form.email} onChange={e => set('email', e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
            placeholder="jane@school.edu" />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-400 hover:text-white border border-white/10 rounded-xl transition-colors">Cancel</button>
        <button onClick={() => onSave(form)} disabled={!valid || loading}
          className="px-4 py-2 text-sm text-white bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl disabled:opacity-50 hover:from-purple-600 hover:to-blue-600 transition-all flex items-center gap-2">
          {loading && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {initial.id ? 'Update' : 'Add Student'}
        </button>
      </div>
    </motion.div>
  );
}

export default function AttendanceStudents() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data: students = [] } = useQuery({
    queryKey: ['att-students'],
    queryFn: () => base44.entities.AttendanceStudent.list('name')
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AttendanceStudent.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['att-students'] }); setShowForm(false); }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AttendanceStudent.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['att-students'] }); setEditingStudent(null); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AttendanceStudent.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['att-students'] }); setDeleteConfirm(null); }
  });

  const filtered = students.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.student_id?.toLowerCase().includes(search.toLowerCase()) ||
    s.tutor_group?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/att-dashboard" className="text-slate-400 hover:text-white transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">Students</h1>
            <p className="text-slate-400 text-sm">{students.length} students</p>
          </div>
          <button onClick={() => { setShowForm(true); setEditingStudent(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-medium rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all shadow-lg shadow-purple-500/30">
            <Plus className="w-4 h-4" /> Add Student
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, ID or tutor group…"
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 placeholder:text-slate-500" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>}
        </div>

        <AnimatePresence>
          {showForm && !editingStudent && (
            <StudentForm onSave={(data) => createMutation.mutate(data)} onCancel={() => setShowForm(false)} loading={createMutation.isPending} />
          )}
        </AnimatePresence>

        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <User className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>{search ? 'No students found' : 'No students yet. Add one above!'}</p>
            </div>
          )}
          <AnimatePresence>
            {filtered.map((s, i) => (
              <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.02 }}>
                {editingStudent?.id === s.id ? (
                  <StudentForm initial={s} onSave={(data) => updateMutation.mutate({ id: s.id, data })} onCancel={() => setEditingStudent(null)} loading={updateMutation.isPending} />
                ) : (
                  <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/8 transition-colors group">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                      {s.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm">{s.name}</p>
                      <div className="flex flex-wrap gap-2 mt-0.5">
                        <span className="text-xs text-slate-400">{s.student_id}</span>
                        {s.tutor_group && <span className="text-xs bg-white/10 text-slate-300 px-2 py-0.5 rounded-full">{s.tutor_group}</span>}
                        <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">Yr {s.year_group}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingStudent(s); setShowForm(false); }}
                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteConfirm(s)}
                        className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
              className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full">
              <h3 className="text-white font-bold mb-2">Delete Student?</h3>
              <p className="text-slate-400 text-sm mb-5">This will permanently delete <strong className="text-white">{deleteConfirm.name}</strong>. This cannot be undone.</p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm text-slate-400 border border-white/10 rounded-xl hover:bg-white/5">Cancel</button>
                <button onClick={() => deleteMutation.mutate(deleteConfirm.id)} disabled={deleteMutation.isPending}
                  className="px-4 py-2 text-sm text-white bg-red-500 hover:bg-red-600 rounded-xl disabled:opacity-50 transition-colors">
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}