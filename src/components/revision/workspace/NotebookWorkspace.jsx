import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ChevronLeft, BookOpen, Layers, Zap, X } from 'lucide-react';
import WorkspaceLeftPanel from './WorkspaceLeftPanel';
import StudioCentrePanel from './StudioCenterPanel';
import StudioRightPanel from './StudioRightPanel';
import FlashcardStudyOverlay from './FlashcardStudyOverlay';

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
  const [activeTool, setActiveTool] = useState('chat');
  const [mobilePanel, setMobilePanel] = useState(null); // 'sources' | 'tools' | null
  const [studySession, setStudySession] = useState(null);

  const { data: sources = [], refetch: refetchSources } = useQuery({
    queryKey: ['revisionSources', notebook.id],
    queryFn: () => base44.entities.RevisionSource.filter({ notebook_id: notebook.id }, '-created_date'),
    enabled: !!notebook.id,
  });

  const { data: flashcards = [], refetch: refetchFlashcards } = useQuery({
    queryKey: ['revisionFlashcards', notebook.id],
    queryFn: () => base44.entities.RevisionFlashcard.filter({ notebook_id: notebook.id }),
    enabled: !!notebook.id,
  });

  const { data: resources = [], refetch: refetchResources } = useQuery({
    queryKey: ['notebookResources', notebook.id],
    queryFn: () => base44.entities.NotebookResource.filter({ notebook_id: notebook.id }, '-created_date'),
    enabled: !!notebook.id,
  });

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

  const handleResourceCreated = useCallback(() => {
    refetchResources();
    refetchFlashcards();
  }, [refetchResources, refetchFlashcards]);

  const openStudyMode = useCallback((cards, title) => {
    setStudySession({ cards, title });
  }, []);

  const closeStudyMode = useCallback(() => {
    setStudySession(null);
    refetchFlashcards();
  }, [refetchFlashcards]);

  const isStudying = !!studySession;

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col z-50">
      {/* Top bar */}
      {!isStudying && (
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
              {notebook.subject || ''}{notebook.exam_board ? ` · ${notebook.exam_board}` : ''}
            </p>
          </div>
          <div className="hidden md:flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {sources.length} sources</span>
            <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> {flashcards.length} cards</span>
            <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {resources.length} items</span>
          </div>
          {/* Mobile panel toggles */}
          <div className="flex gap-1 lg:hidden">
            <button onClick={() => setMobilePanel(mobilePanel === 'sources' ? null : 'sources')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${mobilePanel === 'sources' ? 'bg-violet-500/20 text-violet-300' : 'bg-white/5 text-slate-400'}`}>
              Sources
            </button>
            <button onClick={() => setMobilePanel(mobilePanel === 'tools' ? null : 'tools')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${mobilePanel === 'tools' ? 'bg-violet-500/20 text-violet-300' : 'bg-white/5 text-slate-400'}`}>
              Studio
            </button>
          </div>
        </div>
      )}

      {/* 3-column layout — no toolbar */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT — Sources */}
        {!isStudying && (
          <div className={`
            ${mobilePanel === 'sources' ? 'flex' : 'hidden'} lg:flex
            w-full lg:w-[22vw] xl:w-[20vw] flex-col flex-shrink-0
            border-r border-white/10 bg-slate-950/60
            lg:relative absolute inset-0 top-0 z-20 lg:z-auto
          `}>
            {mobilePanel === 'sources' && (
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
        )}

        {/* CENTER — Active tool (full width when no side panels on mobile) */}
        {!isStudying && (
          <div className={`flex-1 flex flex-col min-w-0 bg-slate-900/30 ${mobilePanel !== null ? 'hidden lg:flex' : 'flex'}`}>
            <StudioCentrePanel
              activeTool={activeTool}
              notebook={notebook}
              user={user}
              allSources={sources}
              resources={resources}
              flashcards={flashcards}
              onResourceCreated={handleResourceCreated}
              onRefreshFlashcards={refetchFlashcards}
              onRefreshResources={refetchResources}
            />
          </div>
        )}

        {/* RIGHT — Studio tool launcher + Created Items */}
        {!isStudying && (
          <div className={`
            ${mobilePanel === 'tools' ? 'flex' : 'hidden'} lg:flex
            w-full lg:w-[240px] xl:w-[260px] flex-col flex-shrink-0
            border-l border-white/10 bg-slate-950/80
            lg:relative absolute inset-0 top-0 z-20 lg:z-auto
          `}>
            {mobilePanel === 'tools' && (
              <div className="lg:hidden flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/10">
                <p className="text-white font-bold text-sm">Studio</p>
                <button onClick={() => setMobilePanel(null)}><X className="w-4 h-4 text-slate-400" /></button>
              </div>
            )}
            <StudioRightPanel
              activeTool={activeTool}
              onSelectTool={(id) => { setActiveTool(id); setMobilePanel(null); }}
              resources={resources}
              flashcards={flashcards}
              onRefresh={handleResourceCreated}
              onOpenStudy={openStudyMode}
            />
          </div>
        )}

        {/* Study mode — fills entire area */}
        {isStudying && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-hidden">
            <FlashcardStudyOverlay
              cards={studySession.cards}
              title={studySession.title}
              onClose={closeStudyMode}
              onRefresh={refetchFlashcards}
              mode="fullscreen"
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}