import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import {
  Trash2, X, Loader2, FilePlus2,
  Pencil, Check, Search,
  CheckSquare, Square, Plus
} from 'lucide-react';
import AddSourcesModal from './AddSourcesModal';

const TYPE_ICONS = {
  pdf: '📄', pptx: '📊', docx: '📝', image: '🖼️', text: '📄',
  url: '🔗', youtube: '🎬', audio: '🎵', gdoc: '📄', gslides: '📊',
};

function formatBytes(b) {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

export default function WorkspaceLeftPanel({ notebook, user, sources, selectedSourceIds, onSelectSource, onToggleAll, onRefresh }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState('');
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RevisionSource.delete(id),
    onSuccess: onRefresh,
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }) => base44.entities.RevisionSource.update(id, { name }),
    onSuccess: () => { setRenamingId(null); setRenameValue(''); onRefresh(); },
  });

  const filtered = sources.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase())
  );

  const allSelected = sources.length > 0 && sources.every(s => selectedSourceIds.includes(s.id));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-bold text-sm">Sources</h2>
          <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">{sources.length}</span>
        </div>

        {/* Add Sources button → opens modal */}
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold text-sm hover:brightness-110 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Sources
        </button>
      </div>

      {/* Search */}
      <div className="flex-shrink-0 px-4 py-2 border-b border-white/10">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sources..."
            className="w-full pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/40" />
        </div>
      </div>

      {/* Select all */}
      {sources.length > 0 && (
        <div className="flex-shrink-0 px-4 py-2 border-b border-white/10 flex items-center justify-between">
          <button onClick={onToggleAll} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
            {allSelected ? <CheckSquare className="w-3.5 h-3.5 text-violet-400" /> : <Square className="w-3.5 h-3.5" />}
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
          <span className="text-xs text-slate-500">{selectedSourceIds.length} selected</span>
        </div>
      )}

      {/* Source list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {sources.length === 0 && (
          <div
            onClick={() => setShowAddModal(true)}
            className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-white/10 hover:border-violet-500/30 rounded-xl cursor-pointer transition-all group"
          >
            <FilePlus2 className="w-8 h-8 text-slate-600 group-hover:text-violet-400 mb-2 transition-colors" />
            <p className="text-slate-500 text-xs text-center">Add sources to get started</p>
          </div>
        )}
        {filtered.map((s, i) => {
          const selected = selectedSourceIds.includes(s.id);
          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
              className={`group relative flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                selected ? 'border-violet-500/40 bg-violet-500/10' : 'border-white/8 bg-white/[0.03] hover:bg-white/[0.07]'
              }`}
              onClick={() => onSelectSource(s.id)}
            >
              <button className="flex-shrink-0 mt-0.5" onClick={e => { e.stopPropagation(); onSelectSource(s.id); }}>
                {selected ? <CheckSquare className="w-3.5 h-3.5 text-violet-400" /> : <Square className="w-3.5 h-3.5 text-slate-600" />}
              </button>
              <span className="text-base flex-shrink-0 leading-none mt-0.5">{TYPE_ICONS[s.type] || '📄'}</span>
              <div className="flex-1 min-w-0">
                {renamingId === s.id ? (
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <input
                      autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') renameMutation.mutate({ id: s.id, name: renameValue }); if (e.key === 'Escape') setRenamingId(null); }}
                      className="flex-1 px-1.5 py-0.5 bg-white/10 border border-violet-500/50 rounded text-white text-xs focus:outline-none"
                    />
                    <button onClick={() => renameMutation.mutate({ id: s.id, name: renameValue })} className="text-emerald-400"><Check className="w-3 h-3" /></button>
                    <button onClick={() => setRenamingId(null)} className="text-slate-400"><X className="w-3 h-3" /></button>
                  </div>
                ) : (
                  <p className="text-white text-xs font-medium truncate leading-snug">{s.name}</p>
                )}
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-600">
                  {s.created_date && <span>{new Date(s.created_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>}
                  {s.file_size_bytes && <span>{formatBytes(s.file_size_bytes)}</span>}
                  {s.content_text && <span className="text-emerald-600">✓</span>}
                </div>
              </div>
              <div className="flex-shrink-0 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => { setRenamingId(s.id); setRenameValue(s.name); }}
                  className="p-1 rounded text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 transition-all"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  onClick={() => deleteMutation.mutate(s.id)}
                  className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Add Sources Modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddSourcesModal
            notebook={notebook}
            user={user}
            sources={sources}
            onRefresh={onRefresh}
            onClose={() => setShowAddModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}