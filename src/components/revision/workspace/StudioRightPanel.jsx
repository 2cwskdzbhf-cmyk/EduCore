import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import {
  Layers, Zap, ClipboardCheck, Timer,
  Calculator, FlaskConical, BarChart2, Network,
  Video, Mic2, MessageSquare,
  FileText, StickyNote, BookOpen,
  BrainCircuit, ChevronDown, ChevronUp,
  Pencil, Copy, Trash2, Check, X, ExternalLink, Play
} from 'lucide-react';

// ── Tool definitions ───────────────────────────────────────────────────────────
export const TOOL_GROUPS = [
  {
    group: 'AI Tutor',
    items: [
      { id: 'chat', label: 'AI Tutor', icon: BrainCircuit, color: 'from-violet-500 to-purple-600' },
    ],
  },
  {
    group: 'Study Tools',
    items: [
      { id: 'flashcards', label: 'Flashcards', icon: Layers, color: 'from-amber-500 to-orange-500' },
      { id: 'quiz', label: 'Quizzes', icon: Zap, color: 'from-indigo-500 to-blue-600' },
      { id: 'test', label: 'Tests', icon: ClipboardCheck, color: 'from-rose-500 to-pink-600' },
      { id: 'exam_sim', label: 'Exam Simulation', icon: Timer, color: 'from-red-500 to-orange-600' },
    ],
  },
  {
    group: 'AI Tools',
    items: [
      { id: 'equation', label: 'Equation Solver', icon: Calculator, color: 'from-violet-500 to-purple-600' },
      { id: 'chemistry', label: 'Chemistry Balancer', icon: FlaskConical, color: 'from-emerald-500 to-teal-600' },
      { id: 'graph', label: 'Graph Generator', icon: BarChart2, color: 'from-blue-500 to-cyan-600' },
      { id: 'mindmap', label: 'Mind Map Generator', icon: Network, color: 'from-pink-500 to-rose-600' },
    ],
  },
  {
    group: 'Media Tools',
    items: [
      { id: 'explainer', label: 'Explainer Videos', icon: Video, color: 'from-blue-600 to-indigo-600' },
      { id: 'podcast', label: 'Podcast Mode', icon: Mic2, color: 'from-violet-600 to-purple-700' },
      { id: 'voice_tutor', label: 'Voice Tutor', icon: MessageSquare, color: 'from-emerald-600 to-teal-700' },
    ],
  },
  {
    group: 'Source Tools',
    items: [
      { id: 'summary', label: 'Summaries', icon: FileText, color: 'from-cyan-500 to-sky-600' },
      { id: 'notes', label: 'Notes', icon: StickyNote, color: 'from-amber-500 to-yellow-600' },
      { id: 'topic_breakdown', label: 'Topic Breakdown', icon: BookOpen, color: 'from-slate-500 to-slate-600' },
    ],
  },
];

export const ALL_TOOLS = TOOL_GROUPS.flatMap(g => g.items);

// ── Resource display helpers ───────────────────────────────────────────────────
const RESOURCE_ICONS = {
  flashcards: '🗂️', quiz: '⚡', mind_map: '🧠', study_guide: '📖', report: '📊',
  formula_sheet: '🔢', exam_questions: '📝', summary: '📋', data_table: '📊',
  audio_overview: '🎧', video_overview: '🎬', notes: '📌', test: '📋',
  topic_breakdown: '🗺️',
};

const RESOURCE_LABEL = {
  flashcards: 'Flashcards', quiz: 'Quiz', test: 'Test', exam_questions: 'Exam Sim',
  mind_map: 'Mind Map', summary: 'Summary', notes: 'Notes', audio_overview: 'Podcast',
  video_overview: 'Explainer', topic_breakdown: 'Topic Breakdown',
};

const CREATED_CATEGORIES = [
  { label: 'Flashcards', type: 'flashcards' },
  { label: 'Quizzes', type: 'quiz' },
  { label: 'Tests', type: 'test' },
  { label: 'Exam Simulations', type: 'exam_questions' },
  { label: 'Mind Maps', type: 'mind_map' },
  { label: 'Summaries', type: 'summary' },
  { label: 'Notes', type: 'notes' },
  { label: 'Topic Breakdowns', type: 'topic_breakdown' },
  { label: 'Podcast Scripts', type: 'audio_overview' },
  { label: 'Video Scripts', type: 'video_overview' },
];

// ── Created Items section ──────────────────────────────────────────────────────
function CreatedItemsSection({ resources, flashcards: allFlashcards = [], onRefresh, onSelectTool, onOpenStudy }) {
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [openCats, setOpenCats] = useState({});

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.NotebookResource.delete(id),
    onSuccess: onRefresh,
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, title }) => base44.entities.NotebookResource.update(id, { title }),
    onSuccess: () => { setRenamingId(null); onRefresh(); },
  });

  const toggleCat = (type) => setOpenCats(prev => ({ ...prev, [type]: !prev[type] }));

  const handleClick = (r) => {
    if (r.resource_type === 'flashcards') {
      const resTime = new Date(r.created_date).getTime();
      const nearby = allFlashcards.filter(fc => Math.abs(new Date(fc.created_date).getTime() - resTime) < 120000);
      const cards = nearby.length > 0 ? nearby : allFlashcards;
      if (cards.length > 0 && onOpenStudy) { onOpenStudy(cards, r.title); return; }
    }
    setExpandedId(expandedId === r.id ? null : r.id);
  };

  const populated = CREATED_CATEGORIES.filter(cat => resources.some(r => r.resource_type === cat.type));

  if (resources.length === 0) {
    return (
      <div className="text-center py-8 px-4 border border-dashed border-white/10 rounded-xl mx-3 mt-2">
        <div className="text-2xl mb-2">✨</div>
        <p className="text-slate-500 text-xs font-medium">Nothing generated yet</p>
        <p className="text-slate-600 text-[10px] mt-1">Use a tool above to create study materials</p>
      </div>
    );
  }

  return (
    <div className="px-3 space-y-1">
      {populated.map(cat => {
        const items = resources.filter(r => r.resource_type === cat.type);
        const isOpen = openCats[cat.type];
        return (
          <div key={cat.type}>
            <button onClick={() => toggleCat(cat.type)}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-all">
              <span className="flex items-center gap-1.5">
                <span>{RESOURCE_ICONS[cat.type] || '📄'}</span>
                <span className="font-medium">{cat.label}</span>
                <span className="text-[10px] text-slate-600 bg-white/5 px-1.5 rounded-full">{items.length}</span>
              </span>
              {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden ml-2">
                  <div className="space-y-0.5 pb-1">
                    {items.map(r => (
                      <div key={r.id} className="group">
                        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition-all"
                          onClick={() => handleClick(r)}>
                          {renamingId === r.id ? (
                            <div className="flex items-center gap-1 flex-1" onClick={e => e.stopPropagation()}>
                              <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') renameMutation.mutate({ id: r.id, title: renameValue }); if (e.key === 'Escape') setRenamingId(null); }}
                                className="flex-1 px-1.5 py-0.5 bg-white/10 border border-violet-500/50 rounded text-white text-[11px] focus:outline-none" />
                              <button onClick={() => renameMutation.mutate({ id: r.id, title: renameValue })} className="text-emerald-400"><Check className="w-3 h-3" /></button>
                              <button onClick={() => setRenamingId(null)} className="text-slate-400"><X className="w-3 h-3" /></button>
                            </div>
                          ) : (
                            <>
                              <p className="text-white text-[11px] flex-1 truncate">{r.title}</p>
                              {cat.type === 'flashcards' && <span className="text-[9px] text-amber-400 font-bold flex-shrink-0">▶</span>}
                            </>
                          )}
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={e => e.stopPropagation()}>
                            <button onClick={() => { setRenamingId(r.id); setRenameValue(r.title); }}
                              className="p-1 rounded text-slate-600 hover:text-violet-400 transition-all"><Pencil className="w-2.5 h-2.5" /></button>
                            <button onClick={() => deleteMutation.mutate(r.id)}
                              className="p-1 rounded text-slate-600 hover:text-red-400 transition-all"><Trash2 className="w-2.5 h-2.5" /></button>
                          </div>
                        </div>

                        <AnimatePresence>
                          {expandedId === r.id && r.resource_type !== 'flashcards' && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                              className="ml-2 overflow-hidden">
                              <div className="p-2 bg-white/[0.02] border border-white/10 rounded-lg mb-1">
                                <pre className="text-slate-400 text-[10px] whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto font-sans">
                                  {r.content?.slice(0, 800)}{r.content?.length > 800 ? '\n[…]' : ''}
                                </pre>
                                <div className="flex gap-1 mt-1.5">
                                  <button onClick={() => navigator.clipboard.writeText(r.content || '')}
                                    className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 text-slate-400 text-[10px] hover:bg-white/10 transition-all">
                                    <Copy className="w-2.5 h-2.5" /> Copy
                                  </button>
                                  <button onClick={() => { const w = window.open(); w.document.write(`<pre style="font-family:sans-serif;white-space:pre-wrap;padding:24px;background:#111;color:#e2e8f0">${r.content}</pre>`); }}
                                    className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 text-slate-400 text-[10px] hover:bg-white/10 transition-all">
                                    <ExternalLink className="w-2.5 h-2.5" /> Open
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// ── Main right panel ───────────────────────────────────────────────────────────
export default function StudioRightPanel({ activeTool, onSelectTool, resources, flashcards, onRefresh, onOpenStudy }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-white/10">
        <p className="text-white font-black text-sm tracking-wide uppercase">Studio</p>
        <p className="text-slate-600 text-[10px] mt-0.5">Select a tool to open in workspace</p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto py-3">

        {/* Tool groups */}
        {TOOL_GROUPS.map((group) => (
          <div key={group.group} className="mb-4">
            <p className="px-4 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-600">{group.group}</p>
            <div className="px-3 space-y-0.5">
              {group.items.map(tool => {
                const isActive = activeTool === tool.id;
                const Icon = tool.icon;
                return (
                  <button key={tool.id} onClick={() => onSelectTool(tool.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? `bg-gradient-to-r ${tool.color} text-white shadow-sm`
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}>
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{tool.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Divider */}
        <div className="mx-4 my-3 border-t border-white/10" />

        {/* Created Items */}
        <div className="mb-3">
          <div className="px-4 mb-2 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Created Items</p>
            {resources.length > 0 && (
              <span className="text-[10px] text-slate-600 bg-white/5 px-1.5 rounded-full">{resources.length}</span>
            )}
          </div>
          <CreatedItemsSection
            resources={resources}
            flashcards={flashcards}
            onRefresh={onRefresh}
            onSelectTool={onSelectTool}
            onOpenStudy={onOpenStudy}
          />
        </div>
      </div>
    </div>
  );
}