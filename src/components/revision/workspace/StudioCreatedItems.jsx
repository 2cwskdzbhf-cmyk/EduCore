import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import {
  Pencil, Copy, Trash2, Check, X,
  ChevronDown, ChevronUp, ExternalLink, Play
} from 'lucide-react';

const RESOURCE_ICONS = {
  flashcards: '🗂️', quiz: '⚡', mind_map: '🧠', study_guide: '📖', report: '📊',
  formula_sheet: '🔢', exam_questions: '📝', summary: '📋', data_table: '📊',
  audio_overview: '🎧', video_overview: '🎬', notes: '📌', test: '📋',
  topic_breakdown: '🗺️',
};

const TOOL_LABEL_MAP = {
  flashcards: 'Flashcards', quiz: 'Quiz', test: 'Test', exam_questions: 'Exam Questions',
  mind_map: 'Mind Map', summary: 'Summary', notes: 'Notes', audio_overview: 'Podcast',
  video_overview: 'Explainer', topic_breakdown: 'Topic Breakdown', report: 'Report',
};

export default function StudioCreatedItems({ resources, flashcards: allFlashcards = [], onRefresh, onOpenResource, onOpenStudy }) {
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.NotebookResource.delete(id),
    onSuccess: onRefresh,
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, title }) => base44.entities.NotebookResource.update(id, { title }),
    onSuccess: () => { setRenamingId(null); onRefresh(); },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (resource) => {
      const { id, created_date, updated_date, created_by_id, ...rest } = resource;
      await base44.entities.NotebookResource.create({ ...rest, title: `${resource.title} (Copy)` });
    },
    onSuccess: onRefresh,
  });

  const handleClick = (r) => {
    if (r.resource_type === 'flashcards') {
      const resTime = new Date(r.created_date).getTime();
      const nearby = allFlashcards.filter(fc => Math.abs(new Date(fc.created_date).getTime() - resTime) < 120000);
      const cards = nearby.length > 0 ? nearby : allFlashcards;
      if (cards.length > 0) { onOpenStudy(cards, r.title); return; }
    }
    if (onOpenResource) onOpenResource(r);
    setExpandedId(expandedId === r.id ? null : r.id);
  };

  const displayed = showAll ? resources : resources.slice(0, 8);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex-shrink-0 px-4 py-3 border-b border-white/10">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-bold text-sm">Created Items</h2>
          <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">{resources.length}</span>
        </div>
        <p className="text-[10px] text-slate-600 mt-0.5">Generated study materials</p>
      </div>

      <div className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {resources.length === 0 && (
          <div className="text-center py-10 border border-dashed border-white/10 rounded-xl mt-2">
            <div className="text-3xl mb-2">✨</div>
            <p className="text-slate-600 text-xs font-medium">Nothing yet</p>
            <p className="text-slate-700 text-[10px] mt-1">Use the toolbar to generate study materials</p>
          </div>
        )}

        {displayed.map((r, i) => (
          <motion.div key={r.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <div className="group rounded-xl border border-white/8 bg-white/[0.03] hover:bg-white/[0.06] transition-all overflow-hidden">
              <div className="flex items-center gap-2.5 p-2.5 cursor-pointer" onClick={() => handleClick(r)}>
                <span className="text-base flex-shrink-0 leading-none">{RESOURCE_ICONS[r.resource_type] || '📄'}</span>
                <div className="flex-1 min-w-0">
                  {renamingId === r.id ? (
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') renameMutation.mutate({ id: r.id, title: renameValue }); if (e.key === 'Escape') setRenamingId(null); }}
                        className="flex-1 px-1.5 py-0.5 bg-white/10 border border-violet-500/50 rounded text-white text-xs focus:outline-none" />
                      <button onClick={() => renameMutation.mutate({ id: r.id, title: renameValue })} className="text-emerald-400"><Check className="w-3 h-3" /></button>
                      <button onClick={() => setRenamingId(null)} className="text-slate-400"><X className="w-3 h-3" /></button>
                    </div>
                  ) : (
                    <p className="text-white text-xs font-medium truncate">{r.title}</p>
                  )}
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    {TOOL_LABEL_MAP[r.resource_type] || r.resource_type?.replace(/_/g, ' ')}
                    {' · '}{new Date(r.created_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    {r.resource_type === 'flashcards' && <span className="text-amber-400 font-semibold ml-1">▶ Study</span>}
                  </p>
                </div>
                <div className="flex-shrink-0 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                  <button onClick={() => { setRenamingId(r.id); setRenameValue(r.title); }}
                    className="p-1 rounded text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 transition-all">
                    <Pencil className="w-2.5 h-2.5" />
                  </button>
                  <button onClick={() => duplicateMutation.mutate(r)}
                    className="p-1 rounded text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all">
                    <Copy className="w-2.5 h-2.5" />
                  </button>
                  <button onClick={() => deleteMutation.mutate(r.id)}
                    className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {expandedId === r.id && r.resource_type !== 'flashcards' && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="border-t border-white/10 overflow-hidden">
                    <div className="p-3 bg-white/[0.02]">
                      <pre className="text-slate-300 text-[11px] whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto font-sans">
                        {r.content?.slice(0, 2000)}{r.content?.length > 2000 ? '\n\n[Truncated]' : ''}
                      </pre>
                      <div className="flex gap-1.5 mt-2.5">
                        <button onClick={() => navigator.clipboard.writeText(r.content || '')}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 text-slate-300 text-[11px] hover:bg-white/10 transition-all">
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                        <button onClick={() => { const w = window.open(); w.document.write(`<pre style="font-family:sans-serif;white-space:pre-wrap;padding:24px">${r.content}</pre>`); }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 text-slate-300 text-[11px] hover:bg-white/10 transition-all">
                          <ExternalLink className="w-3 h-3" /> View
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}

        {resources.length > 8 && (
          <button onClick={() => setShowAll(v => !v)}
            className="w-full mt-1 py-1.5 rounded-xl text-xs text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all flex items-center justify-center gap-1">
            {showAll ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Show all {resources.length}</>}
          </button>
        )}
      </div>
    </div>
  );
}