import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, BookOpen, Layers, Zap, Menu, X } from 'lucide-react';
import WorkspaceLeftPanel from './WorkspaceLeftPanel';
import WorkspaceCenterPanel from './WorkspaceCenterPanel';
import WorkspaceRightPanel from './WorkspaceRightPanel';

const COLOR_MAP = {
  purple: 'from-violet-600 to-purple-700',
  blue: 'from-blue-600 to-cyan-700',
  emerald: 'from-emerald-600 to-teal-700',
  rose: 'from-rose-600 to-pink-700',
  amber: 'from-amber-500 to-orange-600',
  slate: 'from-slate-600 to-slate-700',
};

export default function NotebookWorkspace({ notebook, user, onBack }) {
  const queryClient = useQueryClient();
  const [selectedSourceIds, setSelectedSourceIds] = useState([]);
  const [mobilePanel, setMobilePanel] = useState(null); // 'left' | 'right' | null

  const { data: sources = [], refetch: refetchSources } = useQuery({
    queryKey: ['revisionSources', notebook.id],
    queryFn: () => base44.entities.RevisionSource.filter({ notebook_id: notebook.id }, '-created_date'),
    enabled: !!notebook.id,
  });

  const { data: flashcards = [] } = useQuery({
    queryKey: ['revisionFlashcards', notebook.id],
    queryFn: () => base44.entities.RevisionFlashcard.filter({ notebook_id: notebook.id }),
    enabled: !!notebook.id,
  });

  const { data: resources = [], refetch: refetchResources } = useQuery({
    queryKey: ['notebookResources', notebook.id],
    queryFn: () => base44.entities.NotebookResource.filter({ notebook_id: notebook.id }, '-created_date'),
    enabled: !!notebook.id,
  });

  const now = new Date();
  const dueCards = flashcards.filter(f => !f.next_review || new Date(f.next_review) <= now);
  const notebookColor = COLOR_MAP[notebook.color] || COLOR_MAP.purple;

  const toggleSource = useCallback((id) => {
    setSelectedSourceIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedSourceIds(prev =>
      prev.length === sources.length ? [] : sources.map(s => s.id)
    );
  }, [sources]);

  const selectedSources = sources.filter(s => selectedSourceIds.includes(s.id));

  const handleResourceCreated = useCallback(() => {
    refetchResources();
  }, [refetchResources]);

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col z-50">
      {/* Top bar */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 bg-slate-950/90 backdrop-blur-xl border-b border-white/10 z-10">
        <button onClick={onBack} className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm font-medium">
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back</span>
        </button>

        <div className="w-px h-5 bg-white/10" />

        <div className={`w-7 h-7 rounded-xl bg-gradient-to-br ${notebookColor} flex items-center justify-center text-sm flex-shrink-0`}>
          {notebook.icon || '📚'}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-white font-bold text-sm truncate leading-tight">{notebook.name}</h1>
          <p className="text-slate-600 text-[10px] leading-tight">
            {notebook.subject || ''}
            {notebook.exam_board ? ` · ${notebook.exam_board}` : ''}
          </p>
        </div>

        {/* Stats */}
        <div className="hidden md:flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {sources.length} sources</span>
          <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> {flashcards.length} cards</span>
          {dueCards.length > 0 && <span className="text-amber-400 font-bold flex items-center gap-1"><Zap className="w-3 h-3" /> {dueCards.length} due</span>}
        </div>

        {/* Mobile panel toggles */}
        <div className="flex gap-1 lg:hidden">
          <button onClick={() => setMobilePanel(mobilePanel === 'left' ? null : 'left')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${mobilePanel === 'left' ? 'bg-violet-500/20 text-violet-300' : 'bg-white/5 text-slate-400'}`}>
            Sources
          </button>
          <button onClick={() => setMobilePanel(mobilePanel === 'right' ? null : 'right')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${mobilePanel === 'right' ? 'bg-violet-500/20 text-violet-300' : 'bg-white/5 text-slate-400'}`}>
            Studio
          </button>
        </div>
      </div>

      {/* 3-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT — Sources */}
        <div className={`
          ${mobilePanel === 'left' ? 'flex' : 'hidden'} lg:flex
          w-full lg:w-[22%] xl:w-[20%] flex-shrink-0 flex-col
          border-r border-white/10 bg-slate-950/60 backdrop-blur-sm
          lg:relative absolute inset-0 top-0 z-20 lg:z-auto
        `}>
          {mobilePanel === 'left' && (
            <div className="lg:hidden flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/10">
              <p className="text-white font-bold text-sm">Sources</p>
              <button onClick={() => setMobilePanel(null)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
          )}
          <WorkspaceLeftPanel
            notebook={notebook}
            user={user}
            sources={sources}
            selectedSourceIds={selectedSourceIds}
            onSelectSource={toggleSource}
            onToggleAll={toggleAll}
            onRefresh={refetchSources}
          />
        </div>

        {/* CENTER — Chat */}
        <div className={`
          flex-1 flex flex-col min-w-0
          ${mobilePanel !== null ? 'hidden lg:flex' : 'flex'}
          border-r border-white/10 bg-slate-900/30
        `}>
          <WorkspaceCenterPanel
            notebook={notebook}
            user={user}
            selectedSources={selectedSources}
            allSources={sources}
            onResourceCreated={handleResourceCreated}
          />
        </div>

        {/* RIGHT — Studio */}
        <div className={`
          ${mobilePanel === 'right' ? 'flex' : 'hidden'} lg:flex
          w-full lg:w-[28%] xl:w-[26%] flex-shrink-0 flex-col
          bg-slate-950/60 backdrop-blur-sm overflow-y-auto
          lg:relative absolute inset-0 top-0 z-20 lg:z-auto
        `}>
          {mobilePanel === 'right' && (
            <div className="lg:hidden flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/10">
              <p className="text-white font-bold text-sm">Studio</p>
              <button onClick={() => setMobilePanel(null)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
          )}
          <WorkspaceRightPanel
            notebook={notebook}
            user={user}
            resources={resources}
            selectedSources={selectedSources}
            allSources={sources}
            onResourceCreated={handleResourceCreated}
            onRefresh={refetchResources}
          />
        </div>
      </div>
    </div>
  );
}