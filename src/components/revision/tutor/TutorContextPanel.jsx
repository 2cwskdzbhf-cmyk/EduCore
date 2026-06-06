import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import {
  BookOpen, Layers, FileText, Brain, ChevronRight,
  Trash2, Plus, ExternalLink, Zap, BarChart2
} from 'lucide-react';
import AddSourcesModal from '../workspace/AddSourcesModal';

const TYPE_ICONS = {
  pdf: '📄', pptx: '📊', docx: '📝', image: '🖼️', text: '📄',
  url: '🌐', youtube: '🎬', audio: '🎵', gdoc: '📄', gslides: '📊',
};

const RESOURCE_ICONS = {
  flashcards: '🗂️', quiz: '❓', study_guide: '📖', summary: '📋',
  notes: '📝', mind_map: '🧠', formula_sheet: '🔢', exam_questions: '📝',
  data_table: '📊', report: '📃',
};

const TABS = [
  { id: 'sources', label: 'Sources', icon: BookOpen },
  { id: 'flashcards', label: 'Flashcards', icon: Layers },
  { id: 'quizzes', label: 'Quizzes', icon: Brain },
  { id: 'notes', label: 'Notes', icon: FileText },
  { id: 'summaries', label: 'Summaries', icon: BarChart2 },
];

export default function TutorContextPanel({ notebook, user, sources, flashcards, resources, onRefreshSources, onOpenSource, onResourceCreated }) {
  const [activeTab, setActiveTab] = useState('sources');
  const [showAddModal, setShowAddModal] = useState(false);

  const deleteSourceMutation = useMutation({
    mutationFn: (id) => base44.entities.RevisionSource.delete(id),
    onSuccess: onRefreshSources,
  });

  const deleteResourceMutation = useMutation({
    mutationFn: (id) => base44.entities.NotebookResource.delete(id),
    onSuccess: onResourceCreated,
  });

  const quizResources = resources.filter(r => r.resource_type === 'quiz');
  const noteResources = resources.filter(r => r.resource_type === 'notes');
  const summaryResources = resources.filter(r => ['summary', 'study_guide', 'mind_map', 'report'].includes(r.resource_type));

  const renderContent = () => {
    switch (activeTab) {
      case 'sources':
        return (
          <div className="flex flex-col h-full">
            <div className="p-3 border-b border-white/[0.06]">
              <button onClick={() => setShowAddModal(true)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs font-semibold hover:brightness-110 transition-all">
                <Plus className="w-3.5 h-3.5" /> Add Sources
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {sources.length === 0 && (
                <div className="text-center py-10">
                  <BookOpen className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-slate-500 text-xs">No sources yet</p>
                  <p className="text-slate-600 text-[10px] mt-1">Add PDFs, links, or notes</p>
                </div>
              )}
              {sources.map(s => (
                <div key={s.id} className="group flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-white/[0.04] transition-all cursor-pointer border border-transparent hover:border-white/[0.06]"
                  onClick={() => s.content_text && onOpenSource(s)}>
                  <span className="text-base flex-shrink-0 leading-none mt-0.5">{TYPE_ICONS[s.type] || '📄'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium truncate">{s.name}</p>
                    <p className={`text-[10px] mt-0.5 ${s.content_text ? 'text-emerald-500' : 'text-slate-600'}`}>
                      {s.content_text ? `${Math.round(s.content_text.length / 1000)}k chars` : 'No text extracted'}
                    </p>
                  </div>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    {s.content_text && (
                      <button onClick={e => { e.stopPropagation(); onOpenSource(s); }}
                        className="p-1 rounded-lg text-slate-600 hover:text-violet-400 hover:bg-violet-500/10 transition-all">
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                    <button onClick={e => { e.stopPropagation(); deleteSourceMutation.mutate(s.id); }}
                      className="p-1 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'flashcards':
        return (
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {flashcards.length === 0 ? (
              <EmptyState icon={Layers} label="No flashcards yet" sub="Ask the AI tutor to generate some" />
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-slate-400 text-xs">{flashcards.length} cards total</p>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <Zap className="w-3 h-3 text-amber-400" />
                    {flashcards.filter(f => !f.next_review || new Date(f.next_review) <= new Date()).length} due
                  </div>
                </div>
                {flashcards.slice(0, 20).map(f => (
                  <div key={f.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.07] hover:border-violet-500/20 transition-all">
                    <p className="text-white text-xs font-medium leading-snug">{f.front}</p>
                    <p className="text-slate-500 text-[10px] mt-1.5 leading-snug line-clamp-2">{f.back}</p>
                  </div>
                ))}
                {flashcards.length > 20 && (
                  <p className="text-slate-600 text-[10px] text-center pt-1">+ {flashcards.length - 20} more cards</p>
                )}
              </>
            )}
          </div>
        );

      case 'quizzes':
        return (
          <ResourceList items={quizResources} emptyLabel="No quizzes yet" emptySub="Ask the AI to create a quiz" onDelete={id => deleteResourceMutation.mutate(id)} />
        );

      case 'notes':
        return (
          <ResourceList items={noteResources} emptyLabel="No notes yet" emptySub="Save AI responses as notes" onDelete={id => deleteResourceMutation.mutate(id)} />
        );

      case 'summaries':
        return (
          <ResourceList items={summaryResources} emptyLabel="No summaries yet" emptySub="Ask the AI to summarise your sources" onDelete={id => deleteResourceMutation.mutate(id)} />
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex-shrink-0 overflow-x-auto border-b border-white/[0.06]" style={{ scrollbarWidth: 'none' }}>
        <div className="flex px-2 pt-2 gap-0.5">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-[11px] font-semibold transition-all whitespace-nowrap border-b-2 ${
                  activeTab === tab.id
                    ? 'text-white border-violet-500 bg-violet-500/10'
                    : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-white/[0.04]'
                }`}>
                <Icon className="w-3 h-3" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {renderContent()}
      </div>

      {/* Add Sources Modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddSourcesModal
            notebook={notebook}
            user={user}
            sources={sources}
            onRefresh={onRefreshSources}
            onClose={() => setShowAddModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ResourceList({ items, emptyLabel, emptySub, onDelete }) {
  const [expanded, setExpanded] = useState(null);
  if (!items.length) return <div className="p-3"><EmptyState label={emptyLabel} sub={emptySub} /></div>;
  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
      {items.map(item => (
        <div key={item.id}>
          <div
            className="group flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-white/[0.04] cursor-pointer transition-all border border-transparent hover:border-white/[0.06]"
            onClick={() => setExpanded(expanded === item.id ? null : item.id)}>
            <span className="text-base flex-shrink-0 leading-none mt-0.5">{RESOURCE_ICONS[item.resource_type] || '📋'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{item.title}</p>
              <p className="text-slate-600 text-[10px] mt-0.5">{new Date(item.created_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
            </div>
            <button onClick={e => { e.stopPropagation(); onDelete(item.id); }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
          <AnimatePresence>
            {expanded === item.id && item.content && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mx-2 mb-1">
                <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.06] text-slate-300 text-[11px] leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {item.content.slice(0, 800)}{item.content.length > 800 ? '...' : ''}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon: Icon = FileText, label, sub }) {
  return (
    <div className="text-center py-10">
      <Icon className="w-8 h-8 text-slate-700 mx-auto mb-2" />
      <p className="text-slate-500 text-xs font-medium">{label}</p>
      {sub && <p className="text-slate-700 text-[10px] mt-1">{sub}</p>}
    </div>
  );
}