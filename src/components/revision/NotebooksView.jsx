import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Plus, X, Loader2, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const COLORS = [
  { id: 'purple', label: 'Purple', from: 'from-violet-600', to: 'to-purple-700' },
  { id: 'blue', label: 'Blue', from: 'from-blue-600', to: 'to-cyan-700' },
  { id: 'emerald', label: 'Emerald', from: 'from-emerald-600', to: 'to-teal-700' },
  { id: 'rose', label: 'Rose', from: 'from-rose-600', to: 'to-pink-700' },
  { id: 'amber', label: 'Amber', from: 'from-amber-500', to: 'to-orange-600' },
];

const ICONS = ['📚', '🔬', '🧮', '🌍', '💻', '🎨', '📝', '🏛️', '⚛️', '📐', '🧪', '📖', '🎵', '🌱', '🔭'];

const SUBJECTS = ['Maths', 'English', 'Science', 'History', 'Geography', 'French', 'Spanish', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Art', 'Music', 'PE', 'Other'];

const COLOR_MAP = {
  purple: 'from-violet-600 to-purple-700',
  blue: 'from-blue-600 to-cyan-700',
  emerald: 'from-emerald-600 to-teal-700',
  rose: 'from-rose-600 to-pink-700',
  amber: 'from-amber-500 to-orange-600',
};

export default function NotebooksView({ user, notebooks, searchQuery, onOpenNotebook, onRefresh, autoCreate, onAutoCreateHandled }) {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', icon: '📚', color: 'purple', subject: '', exam_board: '' });

  useEffect(() => {
    if (autoCreate && !showCreate) {
      setShowCreate(true);
      onAutoCreateHandled?.();
    }
  }, [autoCreate]);

  const filtered = notebooks.filter(nb =>
    !searchQuery || nb.name.toLowerCase().includes(searchQuery.toLowerCase()) || (nb.subject || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const createMutation = useMutation({
    mutationFn: () => base44.entities.RevisionNotebook.create({ ...form, student_email: user.email }),
    onSuccess: () => { setShowCreate(false); setForm({ name: '', description: '', icon: '📚', color: 'purple', subject: '', exam_board: '' }); onRefresh(); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      // delete sources and flashcards too
      const [sources, cards] = await Promise.all([
        base44.entities.RevisionSource.filter({ notebook_id: id }),
        base44.entities.RevisionFlashcard.filter({ notebook_id: id }),
      ]);
      await Promise.all([...sources.map(s => base44.entities.RevisionSource.delete(s.id)), ...cards.map(c => base44.entities.RevisionFlashcard.delete(c.id))]);
      await base44.entities.RevisionNotebook.delete(id);
    },
    onSuccess: onRefresh,
  });

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">My Notebooks</h1>
          <p className="text-slate-400 text-sm">{notebooks.length} notebook{notebooks.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold text-sm hover:brightness-110 transition-all shadow-lg shadow-violet-500/25">
          <Plus className="w-4 h-4" /> New Notebook
        </button>
      </div>

      {filtered.length === 0 && !showCreate ? (
        <div className="text-center py-20 border border-white/10 rounded-2xl bg-white/[0.02]">
          <div className="text-5xl mb-3">📚</div>
          <p className="text-white font-bold text-lg mb-1">{searchQuery ? 'No notebooks match your search' : 'No notebooks yet'}</p>
          <p className="text-slate-400 text-sm">{!searchQuery && 'Create your first notebook to get started'}</p>
          {!searchQuery && (
            <button onClick={() => setShowCreate(true)}
              className="mt-5 px-6 py-3 rounded-xl bg-violet-500 hover:bg-violet-400 text-white font-bold text-sm transition-all">
              Create Notebook
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((nb, i) => (
            <motion.div key={nb.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="group relative bg-white/5 border border-white/10 hover:border-violet-500/40 rounded-2xl overflow-hidden transition-all hover:shadow-lg hover:shadow-violet-500/10 cursor-pointer"
              onClick={() => onOpenNotebook(nb)}>
              {/* Top color band */}
              <div className={`h-2 w-full bg-gradient-to-r ${COLOR_MAP[nb.color] || COLOR_MAP.purple}`} />
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl">{nb.icon || '📚'}</span>
                  <button
                    onClick={e => { e.stopPropagation(); if (confirm(`Delete "${nb.name}"?`)) deleteMutation.mutate(nb.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <h3 className="text-white font-bold truncate text-base">{nb.name}</h3>
                {nb.subject && <p className="text-slate-500 text-xs mt-0.5">{nb.subject}{nb.exam_board ? ` · ${nb.exam_board}` : ''}</p>}
                {nb.description && <p className="text-slate-400 text-xs mt-2 line-clamp-2">{nb.description}</p>}
                <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/10 text-xs text-slate-500 flex-wrap">
                  <span>{nb.source_count || 0} sources</span>
                  <span>{nb.flashcard_count || 0} cards</span>
                  {nb.updated_date && <span>edited {new Date(nb.updated_date).toLocaleDateString()}</span>}
                </div>
                {nb.created_date && (
                  <p className="text-xs text-slate-600 mt-1">Created {new Date(nb.created_date).toLocaleDateString()}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowCreate(false)}>
            <motion.div className="bg-slate-900 border border-white/15 rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-white font-black text-lg">New Notebook</h2>
                <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>

              <div className="space-y-4">
                {/* Icon picker */}
                <div>
                  <label className="text-slate-400 text-xs font-semibold block mb-2">Icon</label>
                  <div className="flex flex-wrap gap-2">
                    {ICONS.map(ic => (
                      <button key={ic} onClick={() => setForm(f => ({ ...f, icon: ic }))}
                        className={`w-9 h-9 rounded-xl text-xl flex items-center justify-center transition-all ${form.icon === ic ? 'bg-violet-500/40 ring-2 ring-violet-400' : 'bg-white/5 hover:bg-white/10'}`}>
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Colour */}
                <div>
                  <label className="text-slate-400 text-xs font-semibold block mb-2">Colour</label>
                  <div className="flex gap-2">
                    {COLORS.map(c => (
                      <button key={c.id} onClick={() => setForm(f => ({ ...f, color: c.id }))}
                        className={`w-8 h-8 rounded-full bg-gradient-to-br ${c.from} ${c.to} transition-all ${form.color === c.id ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : ''}`} />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 text-xs font-semibold block mb-1">Name *</label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. GCSE Physics Year 11" className="bg-white/5 border-white/10 text-white" />
                </div>

                <div>
                  <label className="text-slate-400 text-xs font-semibold block mb-1">Subject</label>
                  <select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500/50">
                    <option value="" className="bg-slate-800">Select subject</option>
                    {SUBJECTS.map(s => <option key={s} value={s} className="bg-slate-800">{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 text-xs font-semibold block mb-1">Exam Board</label>
                  <select value={form.exam_board} onChange={e => setForm(f => ({ ...f, exam_board: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500/50">
                    <option value="" className="bg-slate-800">Select exam board</option>
                    {['AQA', 'OCR', 'Edexcel', 'WJEC', 'Cambridge'].map(b => <option key={b} value={b} className="bg-slate-800">{b}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 text-xs font-semibold block mb-1">Description</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="What is this notebook about?"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500/50 resize-none h-20" />
                </div>

                <Button onClick={() => createMutation.mutate()} disabled={!form.name || createMutation.isPending}
                  className="w-full bg-gradient-to-r from-violet-500 to-purple-600 font-bold">
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Create Notebook
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}