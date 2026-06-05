import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import {
  Headphones, Video, Network, FileBarChart2, Layers, Zap, Table2,
  Plus, Pencil, Copy, Trash2, ExternalLink, Share2, Loader2, X, Check,
  FileText, ChevronDown, ChevronUp
} from 'lucide-react';

const STUDIO_ACTIONS = [
  { type: 'audio_overview', label: 'Audio Overview', icon: Headphones, color: 'from-violet-600 to-purple-700', desc: 'AI podcast-style audio' },
  { type: 'video_overview', label: 'Video Overview', icon: Video, color: 'from-blue-600 to-cyan-600', desc: 'AI revision video' },
  { type: 'mind_map', label: 'Mind Map', icon: Network, color: 'from-emerald-600 to-teal-600', desc: 'Interactive mind map' },
  { type: 'report', label: 'Report', icon: FileBarChart2, color: 'from-rose-600 to-pink-600', desc: 'Detailed revision report' },
  { type: 'flashcards', label: 'Flashcards', icon: Layers, color: 'from-amber-500 to-orange-500', desc: 'Spaced repetition cards' },
  { type: 'quiz', label: 'Quiz', icon: Zap, color: 'from-indigo-600 to-blue-600', desc: 'Test your knowledge' },
  { type: 'data_table', label: 'Data Table', icon: Table2, color: 'from-cyan-600 to-sky-600', desc: 'Structured data table' },
];

const RESOURCE_ICONS = {
  flashcards: '🗂️', quiz: '⚡', mind_map: '🧠', study_guide: '📖', report: '📊',
  formula_sheet: '🔢', exam_questions: '📝', summary: '📋', data_table: '📊',
  audio_overview: '🎧', video_overview: '🎬', notes: '📌',
};

const PROMPT_MAP = {
  audio_overview: 'Create a detailed podcast-style audio script that covers all the key topics from my sources. Include an introduction, main content sections with explanations, and a conclusion. Make it engaging and educational.',
  video_overview: 'Create a video script for a revision overview. Include scene descriptions, key points to cover, visual suggestions, and a clear narrative structure covering all main topics.',
  mind_map: 'Create a detailed mind map outline in text format. Show the central topic, main branches, and sub-branches with key concepts, facts, and connections. Use indented formatting.',
  report: 'Write a comprehensive revision report covering all key topics from my sources. Include an executive summary, detailed sections for each main topic, key findings, and exam preparation tips.',
  flashcards: 'Generate 15 high-quality revision flashcards as Q&A pairs. Format each as "Q: [question]\nA: [answer]". Cover the most important concepts, definitions, and facts.',
  quiz: 'Generate a 10-question multiple choice quiz. For each question provide: the question, 4 options (A-D), the correct answer, and a brief explanation.',
  data_table: 'Organise all key information from my sources into well-structured tables. Include relevant columns and categorise the data clearly with headings.',
};

export default function WorkspaceRightPanel({ notebook, user, resources, selectedSources, allSources, onResourceCreated, onRefresh }) {
  const [generating, setGenerating] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [openResourceId, setOpenResourceId] = useState(null);
  const [showAllResources, setShowAllResources] = useState(false);
  const [addNoteMode, setAddNoteMode] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteTitle, setNoteTitle] = useState('');

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.NotebookResource.delete(id),
    onSuccess: onRefresh,
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, title }) => base44.entities.NotebookResource.update(id, { title }),
    onSuccess: () => { setRenamingId(null); setRenameValue(''); onRefresh(); },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (resource) => {
      const { id, created_date, updated_date, created_by_id, ...rest } = resource;
      await base44.entities.NotebookResource.create({ ...rest, title: `${resource.title} (Copy)` });
    },
    onSuccess: onRefresh,
  });

  const generateResource = async (type) => {
    setGenerating(type);
    try {
      const activeSources = selectedSources.length > 0 ? selectedSources : allSources;
      const contextParts = activeSources
        .filter(s => s.content_text)
        .map(s => `### ${s.name}\n${s.content_text.slice(0, 8000)}`)
        .join('\n\n---\n\n');

      if (!contextParts) { alert('Please add sources with content first.'); setGenerating(null); return; }

      const prompt = `${PROMPT_MAP[type]}\n\nSOURCE MATERIALS:\n${contextParts}`;
      const content = await base44.integrations.Core.InvokeLLM({ prompt });
      const action = STUDIO_ACTIONS.find(a => a.type === type);
      const num = resources.filter(r => r.resource_type === type).length + 1;
      const title = `${notebook.name} — ${action?.label} #${num}`;
      const res = await base44.entities.NotebookResource.create({
        notebook_id: notebook.id, student_email: user.email,
        title, resource_type: type, content: typeof content === 'string' ? content : JSON.stringify(content),
        source_ids: activeSources.map(s => s.id), source_count: activeSources.length,
      });
      onResourceCreated(res);
    } catch (e) {
      alert('Generation failed: ' + e.message);
    }
    setGenerating(null);
  };

  const saveNote = async () => {
    if (!noteText.trim()) return;
    await base44.entities.NotebookResource.create({
      notebook_id: notebook.id, student_email: user.email,
      title: noteTitle || `Note — ${new Date().toLocaleDateString()}`,
      resource_type: 'notes', content: noteText, source_count: 0,
    });
    setNoteText(''); setNoteTitle(''); setAddNoteMode(false); onRefresh();
  };

  const displayResources = showAllResources ? resources : resources.slice(0, 5);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3.5 border-b border-white/10">
        <h2 className="text-white font-bold text-sm">Studio</h2>
        <p className="text-xs text-slate-500 mt-0.5">Generate & manage study materials</p>
      </div>

      {/* Studio action cards */}
      <div className="flex-shrink-0 p-3">
        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2.5 px-1">Generate</p>
        <div className="grid grid-cols-2 gap-2">
          {STUDIO_ACTIONS.map(action => (
            <motion.button key={action.type}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => generateResource(action.type)}
              disabled={!!generating}
              className={`relative overflow-hidden flex flex-col items-start p-3 rounded-2xl bg-gradient-to-br ${action.color} text-white text-left transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed`}>
              {generating === action.type && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-2xl">
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                </div>
              )}
              <action.icon className="w-5 h-5 mb-2 opacity-90" />
              <p className="font-bold text-xs leading-tight">{action.label}</p>
              <p className="text-[10px] opacity-70 mt-0.5 leading-tight">{action.desc}</p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Created resources */}
      <div className="flex-shrink-0 px-3 pb-2 border-t border-white/10 pt-3">
        <div className="flex items-center justify-between mb-2.5 px-1">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Created Resources</p>
          <span className="text-xs text-slate-600 bg-white/5 px-2 py-0.5 rounded-full">{resources.length}</span>
        </div>
        {resources.length === 0 && (
          <div className="text-center py-6 border border-dashed border-white/10 rounded-xl">
            <p className="text-slate-600 text-xs">No resources generated yet</p>
            <p className="text-slate-700 text-[10px] mt-1">Use the cards above to create study materials</p>
          </div>
        )}
        <div className="space-y-1.5">
          {displayResources.map((r, i) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <div className="group rounded-xl border border-white/8 bg-white/[0.03] hover:bg-white/[0.06] transition-all overflow-hidden">
                <div className="flex items-center gap-2.5 p-2.5 cursor-pointer" onClick={() => setOpenResourceId(openResourceId === r.id ? null : r.id)}>
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
                      {r.resource_type?.replace(/_/g, ' ')} · {new Date(r.created_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      {r.source_count > 0 && ` · ${r.source_count} src`}
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
                  {openResourceId === r.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="border-t border-white/10 overflow-hidden">
                      <div className="p-3 bg-white/[0.02]">
                        <pre className="text-slate-300 text-[11px] whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto font-sans">
                          {r.content?.slice(0, 2000)}{r.content?.length > 2000 ? '\n\n[Truncated — copy for full content]' : ''}
                        </pre>
                        <div className="flex gap-1.5 mt-2.5">
                          <button onClick={() => navigator.clipboard.writeText(r.content || '')}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 text-slate-300 text-[11px] hover:bg-white/10 transition-all">
                            <Copy className="w-3 h-3" /> Copy
                          </button>
                          <button onClick={() => { const w = window.open(); w.document.write(`<pre style="font-family:sans-serif;white-space:pre-wrap;padding:24px">${r.content}</pre>`); w.print(); }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 text-slate-300 text-[11px] hover:bg-white/10 transition-all">
                            <ExternalLink className="w-3 h-3" /> Export
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </div>
        {resources.length > 5 && (
          <button onClick={() => setShowAllResources(v => !v)}
            className="w-full mt-2 py-1.5 rounded-xl text-xs text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all flex items-center justify-center gap-1">
            {showAllResources ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Show all {resources.length}</>}
          </button>
        )}
      </div>

      {/* Notes section */}
      <div className="px-3 pb-4 border-t border-white/10 pt-3 mt-1">
        <div className="flex items-center justify-between mb-2.5 px-1">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Notes</p>
          <button onClick={() => setAddNoteMode(v => !v)}
            className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors">
            <Plus className="w-3 h-3" /> Add Note
          </button>
        </div>
        <AnimatePresence>
          {addNoteMode && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="space-y-2 mb-3 overflow-hidden">
              <input value={noteTitle} onChange={e => setNoteTitle(e.target.value)} placeholder="Note title..."
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-violet-500/50 placeholder:text-slate-500" />
              <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Write your note..." rows={4}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-violet-500/50 placeholder:text-slate-500 resize-none" />
              <div className="flex gap-2">
                <button onClick={saveNote} disabled={!noteText.trim()}
                  className="flex-1 py-1.5 rounded-xl bg-violet-500 text-white font-bold text-xs disabled:opacity-40">Save Note</button>
                <button onClick={() => setAddNoteMode(false)} className="px-3 py-1.5 rounded-xl bg-white/5 text-slate-400 text-xs hover:bg-white/10 transition-all">Cancel</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="space-y-1.5">
          {resources.filter(r => r.resource_type === 'notes').map(note => (
            <div key={note.id} className="group flex items-start gap-2 p-2.5 rounded-xl border border-white/8 bg-white/[0.03] hover:bg-white/[0.06] transition-all">
              <span className="text-base flex-shrink-0 leading-none mt-0.5">📌</span>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate">{note.title}</p>
                <p className="text-slate-600 text-[10px] mt-0.5">{new Date(note.created_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
              </div>
              <button onClick={() => deleteMutation.mutate(note.id)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-500 hover:text-red-400 transition-all flex-shrink-0">
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
          {resources.filter(r => r.resource_type === 'notes').length === 0 && !addNoteMode && (
            <p className="text-center text-slate-700 text-xs py-3">No notes yet</p>
          )}
        </div>
      </div>
    </div>
  );
}