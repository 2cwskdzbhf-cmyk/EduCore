import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, BookOpen, Layers, Zap, X } from 'lucide-react';
import WorkspaceLeftPanel from './WorkspaceLeftPanel';
import WorkspaceCenterPanel from './WorkspaceCenterPanel';
import WorkspaceRightPanel from './WorkspaceRightPanel';
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
  const [mobilePanel, setMobilePanel] = useState(null); // 'left' | 'right' | null

  // Study state — null = idle, { cards, title, fullscreen } = studying
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

  // Open study — starts in expanded sidebar mode (not fullscreen)
  const openStudyMode = useCallback((cards, title) => {
    setStudySession({ cards, title, fullscreen: false });
  }, []);

  const closeStudyMode = useCallback(() => {
    setStudySession(null);
    refetchFlashcards();
  }, [refetchFlashcards]);

  const enterFullscreen = useCallback(() => {
    setStudySession(s => s ? { ...s, fullscreen: true } : s);
  }, []);

  const exitFullscreen = useCallback(() => {
    setStudySession(s => s ? { ...s, fullscreen: false } : s);
  }, []);

  const isStudying = !!studySession;
  const isFullscreen = studySession?.fullscreen === true;

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col z-50">
      {/* Top bar — hide in fullscreen */}
      <AnimatePresence>
        {!isFullscreen && (
          <motion.div
            key="topbar"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 bg-slate-950/90 backdrop-blur-xl border-b border-white/10 z-10"
          >
            <button onClick={isStudying ? closeStudyMode : onBack} className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm font-medium">
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{isStudying ? 'Studio' : 'Back'}</span>
            </button>

            <div className="w-px h-5 bg-white/10" />

            <div className={`w-7 h-7 rounded-xl bg-gradient-to-br ${notebookColor} flex items-center justify-center text-sm flex-shrink-0`}>
              {notebook.icon || '📚'}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-white font-bold text-sm truncate leading-tight">{notebook.name}</h1>
              {isStudying && (
                <p className="text-violet-400 text-[10px] leading-tight font-medium">Studying: {studySession.title}</p>
              )}
              {!isStudying && (
                <p className="text-slate-600 text-[10px] leading-tight">
                  {notebook.subject || ''}
                  {notebook.exam_board ? ` · ${notebook.exam_board}` : ''}
                </p>
              )}
            </div>

            {/* Stats */}
            {!isStudying && (
              <div className="hidden md:flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {sources.length} sources</span>
                <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> {flashcards.length} cards</span>
                {dueCards.length > 0 && <span className="text-amber-400 font-bold flex items-center gap-1"><Zap className="w-3 h-3" /> {dueCards.length} due</span>}
              </div>
            )}

            {/* Mobile panel toggles — only when not studying */}
            {!isStudying && (
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
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3-column layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT — Sources — fade out when studying */}
        <AnimatePresence initial={false}>
          {!isStudying && (
            <motion.div
              key="left-panel"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden flex-shrink-0"
              style={{ minWidth: 0 }}
            >
              <div className={`
                ${mobilePanel === 'left' ? 'flex' : 'hidden'} lg:flex
                w-full lg:w-[22vw] xl:w-[20vw] h-full flex-col
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* CENTER — Chat — fade out when studying */}
        <AnimatePresence initial={false}>
          {!isStudying && (
            <motion.div
              key="center-panel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className={`
                flex-1 flex flex-col min-w-0
                ${mobilePanel !== null ? 'hidden lg:flex' : 'flex'}
                border-r border-white/10 bg-slate-900/30
              `}
            >
              <WorkspaceCenterPanel
                notebook={notebook}
                user={user}
                selectedSources={selectedSources}
                allSources={sources}
                resources={resources}
                flashcards={flashcards}
                onResourceCreated={handleResourceCreated}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* RIGHT — Studio / Study — expands to fill when studying */}
        <motion.div
          layout
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className={`
            flex-col bg-slate-950/60 backdrop-blur-sm overflow-hidden
            ${isStudying ? 'flex flex-1' : `${mobilePanel === 'right' ? 'flex' : 'hidden'} lg:flex lg:w-[28%] xl:w-[26%] flex-shrink-0`}
            lg:relative absolute inset-0 top-0 z-20 lg:z-auto
          `}
          style={isStudying ? {} : {}}
        >
          {mobilePanel === 'right' && !isStudying && (
            <div className="lg:hidden flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/10">
              <p className="text-white font-bold text-sm">Studio</p>
              <button onClick={() => setMobilePanel(null)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
          )}

          {/* Studio panel — hidden during study */}
          <AnimatePresence>
            {!isStudying && (
              <motion.div
                key="studio"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="flex-1 overflow-y-auto"
              >
                <WorkspaceRightPanel
                  notebook={notebook}
                  user={user}
                  resources={resources}
                  flashcards={flashcards}
                  selectedSources={selectedSources}
                  allSources={sources}
                  onResourceCreated={handleResourceCreated}
                  onRefresh={refetchResources}
                  onOpenStudy={openStudyMode}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Flashcard study view — shown when studying (inline expanded) */}
          <AnimatePresence>
            {isStudying && !isFullscreen && (
              <motion.div
                key="study-inline"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                className="flex-1 overflow-hidden"
              >
                <FlashcardStudyOverlay
                  cards={studySession.cards}
                  title={studySession.title}
                  onClose={closeStudyMode}
                  onRefresh={refetchFlashcards}
                  mode="inline"
                  onEnterFullscreen={enterFullscreen}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Fullscreen overlay — renders above everything */}
      <AnimatePresence>
        {isStudying && isFullscreen && (
          <motion.div
            key="study-fullscreen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 z-[200]"
          >
            <FlashcardStudyOverlay
              cards={studySession.cards}
              title={studySession.title}
              onClose={closeStudyMode}
              onRefresh={refetchFlashcards}
              mode="fullscreen"
              onExitFullscreen={exitFullscreen}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}