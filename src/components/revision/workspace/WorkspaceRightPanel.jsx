import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Layers, Zap, FileText, Map, BarChart2, Music, Video, Table,
  Plus, Trash2, Pencil, Copy, X, Check, Loader2, BookOpen,
  ExternalLink, Sparkles, StickyNote, ChevronDown, ChevronUp
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const STUDIO_ACTIONS = [
  { type: 'audio_overview', icon: Music, label: 'Audio Overview', color: 'from-rose-500 to-pink-600', desc: 'AI podcast-style revision audio' },
  { type: 'mind_map', icon: Map, label: 'Mind Map', color: 'from-green-500 to-emerald-600', desc: 'Interactive concept map' },
  { type: 'flashcards', icon: Layers, label: 'Flashcards', color: 'from-violet-500 to-purple-600', desc: 'Study card pairs' },
  { type: 'quiz', icon: Zap, label: 'Quiz', color: 'from-amber-500 to-orange-500', desc: 'Practice questions' },
  { type: 'report', icon: BarChart2, label: 'Report', color: 'from-blue-500 to-cyan-600', desc: 'Detailed revision report' },
  { type: 'study_guide', icon: BookOpen, label: 'Study Guide', color: 'from-teal-500 to-cyan-600', desc: 'Structured notes' },
  { type: 'exam_questions', icon: FileText, label: 'Exam Questions', color: 'from-red-500 to-rose-600', desc: 'Past-style exam questions' },
  { type: 'data_table', icon: Table, label: 'Data Table', color: 'from-slate-500 to-gray-600', desc: 'Structured data tables' },
];

const TYPE_ICONS = {
  flashcards: Layers, quiz: Zap, mind_map: Map, study_guide: BookOpen,
  report: BarChart2, formula_sheet: FileText, exam_questions: FileText,
  summary: FileText, data_table: Table, audio_overview: Music,
  video_overview: Video, notes: StickyNote,
};

const GENERATE_PROMPTS = {
  audio_overview: 'Create an engaging podcast-style script (2-3 minutes) covering the main topics from the sources. Format as a spoken conversation with clear transitions.',
  mind_map: 'Create a detailed mind map in markdown. Use # for main topic, ## for subtopics, ### for details. Cover all key concepts from the sources.',
  flashcards: 'Generate 15 flashcard Q&A pairs from the most important content. Format as:\nQ: [question]\nA: [answer]\n\nfor each card.',
  quiz: 'Create a 10-question multiple choice quiz with 4 options each and answers. Format clearly with Q1:, Options A-D, and Answer:',
  report: 'Write a comprehensive revision report covering: 1) Topic Overview, 2) Key Concepts, 3) Important Details, 4) Common Mistakes, 5) Exam Tips. Use clear headings.',
  study_guide: 'Generate a structured study guide with: Introduction, Key Topics, Definitions, Important Points, Summary, and Exam Tips.',
  exam_questions: 'Generate 8 exam-style questions of mixed difficulty (2 marks, 4 marks, 6 marks). Include mark scheme answers.',
  data_table: 'Create a structured comparison table or data table from the key information in the sources. Use markdown table format.',
};

export default function WorkspaceRightPanel({ notebook, user, sources, selectedSourceIds, pendingSave, onPendingSaveComplete }) {
  const qc = useQueryClient();
  const [expandedId, setExpandedId] = useState(null);
  const [generatingType, setGeneratingType] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [showNotes, setShowNotes] = useState(true);

  const { data: resources = [], refetch } = useQuery({
    queryKey: ['notebookResources', notebook.id],
    queryFn: () => base44.entities.NotebookResource.filter({ notebook_id: notebook.id }, '-created_date'),
    enabled: !!notebook.id,
  });

  const { data: notes = [], refetch: refetchNotes } = useQuery({
    queryKey: ['notebookNotes', notebook.id],
    queryFn: () => base44.entities.NotebookResource.filter({ notebook_id: notebook.id, resource_type: 'notes' }, '-created_date'),
    enabled: !!notebook.id,
  });

  // Handle pendingSave from chat
  React.useEffect(() => {
    if (pendingSave) {
      base44.entities.NotebookResource.create({
        notebook_id: notebook.id,
        student_email: user.email,
        title: pendingSave.title,
        resource_type: pendingSave.resource_type,
        content: pendingSave.content,
        source_count: selectedSourceIds.length,
        source_ids: selectedSourceIds,
      }).then(() => { refetch(); onPendingSaveComplete(); });
    }
  }, [pendingSave]);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.NotebookResource.delete(id),
    onSuccess: refetch,
  });
  const renameMutation = useMutation({
    mutationFn: ({ id, title }) => base44.entities.NotebookResource.update(id, { title }),
    onSuccess: () => { setRenamingId(null); setRenameValue(''); refetch(); },
  });

  const generate = async (action) => {
    setGeneratingType(action.type);
    try {
      const activeSources = sources.filter(s => selectedSourceIds.includes(s.id) && s.content_text);
      const context = activeSources.map(s => `### ${s.name}\n${s.content_text.slice(0, 6000)}`).join('\n\n---\n\n');
      const prompt = `${GENERATE_PROMPTS[action.type]}\n\n${context ? `SOURCE MATERIALS:\n\n${context}` : 'No sources selected — generate based on the notebook topic: ' + notebook.name}`;
      const resp = await base44.integrations.Core.InvokeLLM({ prompt });
      const content = typeof resp === 'string' ? resp : resp?.content || JSON.stringify(resp);
      const created = await base44.entities.NotebookResource.create({
        notebook_id: notebook.id,
        student_email: user.email,
        title: `${action.label} — ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
        resource_type: action.type,
        content,
        source_count: selectedSourceIds.length,
        source_ids: selectedSourceIds,
      });
      refetch();
      setExpandedId(created.id);
    } finally {
      setGeneratingType(null);
    }
  };

  const addNote = async () => {
    if (!noteText.trim()) return;
    await base44.entities.NotebookResource.create({
      notebook_id: notebook.id, student_email: user.email,
      title: noteText.slice(0, 60),
      resource_type: 'notes', content: noteText,
    });
    setNoteText(''); setAddingNote(false); refetch();
  };

  const nonNoteResources = resources.filter(r => r.resource_type !== 'notes');
  const noteResources = resources.filter(r => r.resource_type === 'notes');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3.5 border-b border-white/10">
        <h2 className="text-white font-bold text-sm">Studio</h2>
        <p className="text-slate-500 text-[11px]">Generate & manage study materials</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Studio action cards */}
        <div className="p-3">
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2">Generate</p>
          <div className="grid grid-cols-2 gap-2">
            {STUDIO_ACTIONS.map(action => {
              const Icon = action.icon;
              const isGenerating = generatingType === action.type;
              return (
                <button key={action.type} onClick={() => generate(action)} disabled={!!generatingType}
                  className={`relative flex flex-col items-start gap-1 p-3 rounded-xl bg-gradient-to-br ${action.color} opacity-90 hover:opacity-100 hover:shadow-lg transition-all text-left disabled:opacity-50 overflow-hidden group`}>
                  <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center mb-0.5">
                    {isGenerating ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <Icon className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <span className="text-white font-bold text-[11px] leading-tight">{action.label}</span>
                  <span className="text-white/70 text-[10px] leading-tight">{action.desc}</span>
                  <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors rounded-xl" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Created resources */}
        {nonNoteResources.length > 0 && (
          <div className="px-3 pb-3">
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2">
              Created Resources ({nonNoteResources.length})
            </p>
            <div className="space-y-1.5">
              {nonNoteResources.map(r => {
                const Icon = TYPE_ICONS[r.resource_type] || FileText;
                const isExpanded = expandedId === r.id;
                return (
                  <div key={r.id} className="bg-white/[0.04] border border-white/10 rounded-xl overflow-hidden">
                    <div className="flex items-center gap-2 p-2.5">
                      <Icon className="w-4 h-4 text-violet-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        {renamingId === r.id ? (
                          <div className="flex items-center gap-1">
                            <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') renameMutation.mutate({ id: r.id, title: renameValue }); if (e.key === 'Escape') setRenamingId(null); }}
                              className="flex-1 px-1.5 py-0.5 bg-white/10 border border-violet-500/50 rounded text-white text-xs focus:outline-none" />
                            <button onClick={() => renameMutation.mutate({ id: r.id, title: renameValue })}><Check className="w-3 h-3 text-emerald-400" /></button>
                            <button onClick={() => setRenamingId(null)}><X className="w-3 h-3 text-slate-400" /></button>
                          </div>
                        ) : (
                          <p className="text-white text-xs font-medium truncate">{r.title}</p>
                        )}
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-slate-600 text-[10px] capitalize">{r.resource_type.replace('_', ' ')}</span>
                          {r.created_date && <span className="text-slate-600 text-[10px]">{new Date(r.created_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>}
                          {r.source_count > 0 && <span className="text-slate-600 text-[10px]">{r.source_count} src</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => setExpandedId(isExpanded ? null : r.id)}
                          className="p-1 rounded text-slate-500 hover:text-white hover:bg-white/10 transition-all">
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => { setRenamingId(r.id); setRenameValue(r.title); }}
                          className="p-1 rounded text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 transition-all">
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button onClick={() => navigator.clipboard.writeText(r.content || '')}
                          className="p-1 rounded text-slate-500 hover:text-white hover:bg-white/10 transition-all">
                          <Copy className="w-3 h-3" />
                        </button>
                        <button onClick={() => deleteMutation.mutate(r.id)}
                          className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <AnimatePresence>
                      {isExpanded && r.content && (
                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                          className="overflow-hidden border-t border-white/10">
                          <div className="p-3 max-h-64 overflow-y-auto">
                            <div className="prose prose-invert prose-xs max-w-none text-slate-300 [&>*:first-child]:mt-0 text-xs [&_p]:leading-relaxed">
                              <ReactMarkdown>{r.content}</ReactMarkdown>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="px-3 pb-4">
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => setShowNotes(!showNotes)}
              className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold uppercase tracking-wider hover:text-white transition-colors">
              <StickyNote className="w-3 h-3" /> Notes {noteResources.length > 0 && `(${noteResources.length})`}
              {showNotes ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            <button onClick={() => setAddingNote(!addingNote)}
              className="flex items-center gap-1 text-[10px] text-violet-400 hover:text-violet-300 transition-colors font-medium">
              <Plus className="w-3 h-3" /> Add Note
            </button>
          </div>

          <AnimatePresence>
            {addingNote && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mb-2">
                <div className="bg-white/[0.04] border border-white/10 rounded-xl p-2.5 space-y-2">
                  <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Write a note..." rows={3}
                    className="w-full bg-transparent text-white text-xs resize-none focus:outline-none placeholder:text-slate-500" />
                  <div className="flex gap-1.5 justify-end">
                    <button onClick={() => setAddingNote(false)} className="px-2.5 py-1 rounded-lg bg-white/5 text-slate-400 text-xs">Cancel</button>
                    <button onClick={addNote} disabled={!noteText.trim()}
                      className="px-2.5 py-1 rounded-lg bg-violet-500 text-white text-xs font-semibold disabled:opacity-40">Save</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {showNotes && noteResources.length > 0 && (
            <div className="space-y-1.5">
              {noteResources.map(n => (
                <div key={n.id} className="group bg-amber-500/5 border border-amber-500/15 rounded-xl p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-amber-200/80 text-xs leading-relaxed flex-1">{n.content?.slice(0, 150)}{n.content?.length > 150 ? '...' : ''}</p>
                    <button onClick={() => deleteMutation.mutate(n.id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-600 hover:text-red-400 transition-all flex-shrink-0">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-600 mt-1">{new Date(n.created_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                </div>
              ))}
            </div>
          )}

          {showNotes && noteResources.length === 0 && !addingNote && (
            <div className="text-center py-4 text-slate-600 text-xs">
              <StickyNote className="w-6 h-6 mx-auto mb-1 opacity-30" />
              No notes yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}