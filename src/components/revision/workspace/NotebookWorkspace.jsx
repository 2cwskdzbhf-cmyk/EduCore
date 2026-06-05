import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Brain } from 'lucide-react';
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
  const [selectedSourceIds, setSelectedSourceIds] = useState([]);
  const [pendingSave, setPendingSave] = useState(null);

  const { data: sources = [], refetch: refetchSources } = useQuery({
    queryKey: ['revisionSources', notebook.id],
    queryFn: async () => {
      const s = await base44.entities.RevisionSource.filter({ notebook_id: notebook.id }, '-created_date');
      // Auto-select all on first load
      setSelectedSourceIds(prev => prev.length === 0 ? s.map(x => x.id) : prev);
      return s;
    },
    enabled: !!notebook.id,
  });

  const notebookColor = COLOR_MAP[notebook.color] || COLOR_MAP.purple;

  return (
    <div className="flex flex-col h-screen bg-slate-950 overflow-hidden">
      {/* Top bar */}
      <div className="flex-shrink-0 h-12 bg-slate-950/95 backdrop-blur-xl border-b border-white/10 flex items-center px-4 gap-4 z-30">
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors flex-shrink-0">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${notebookColor} flex items-center justify-center text-sm flex-shrink-0`}>
          {notebook.icon || '📚'}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-white font-bold text-sm truncate">{notebook.name}</h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 flex-shrink-0">
          {notebook.subject && <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">{notebook.subject}</span>}
          {notebook.exam_board && <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">{notebook.exam_board}</span>}
          <span>{sources.length} sources</span>
        </div>
      </div>

      {/* 3-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT — Sources (~20%) */}
        <div className="w-[22%] min-w-[200px] max-w-[280px] flex-shrink-0 bg-slate-950/60 border-r border-white/10 overflow-hidden flex flex-col">
          <WorkspaceLeftPanel
            notebook={notebook}
            user={user}
            sources={sources}
            selectedSourceIds={selectedSourceIds}
            onSelectionChange={setSelectedSourceIds}
            onRefresh={refetchSources}
          />
        </div>

        {/* CENTER — AI Chat (~55%) */}
        <div className="flex-1 overflow-hidden flex flex-col bg-slate-950/40">
          <WorkspaceCenterPanel
            notebook={notebook}
            user={user}
            sources={sources}
            selectedSourceIds={selectedSourceIds}
            onSendToStudio={(data) => setPendingSave(data)}
          />
        </div>

        {/* RIGHT — Studio (~25%) */}
        <div className="w-[26%] min-w-[220px] max-w-[320px] flex-shrink-0 bg-slate-950/60 border-l border-white/10 overflow-hidden flex flex-col">
          <WorkspaceRightPanel
            notebook={notebook}
            user={user}
            sources={sources}
            selectedSourceIds={selectedSourceIds}
            pendingSave={pendingSave}
            onPendingSaveComplete={() => setPendingSave(null)}
          />
        </div>
      </div>
    </div>
  );
}