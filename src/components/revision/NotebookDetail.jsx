import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft, Upload, MessageSquare, Layers, BookOpen, Zap,
  FileText, Link2, Loader2, Plus, Trash2, X, Play, RotateCcw
} from 'lucide-react';
import SourceUploader from './SourceUploader';
import NotebookAIChat from './NotebookAIChat';
import FlashcardStudy from './FlashcardStudy';
import QuizGenerator from './QuizGenerator';
import StudyGuideGenerator from './StudyGuideGenerator';

const TABS = [
  { id: 'sources', label: 'Sources', icon: Upload },
  { id: 'chat', label: 'AI Chat', icon: MessageSquare },
  { id: 'flashcards', label: 'Flashcards', icon: Layers },
  { id: 'quiz', label: 'Quiz', icon: Zap },
  { id: 'studyguide', label: 'Study Guide', icon: BookOpen },
];

const COLOR_MAP = {
  purple: 'from-violet-600 to-purple-700',
  blue: 'from-blue-600 to-cyan-700',
  emerald: 'from-emerald-600 to-teal-700',
  rose: 'from-rose-600 to-pink-700',
  amber: 'from-amber-500 to-orange-600',
};

export default function NotebookDetail({ notebook, user, onBack }) {
  const [activeTab, setActiveTab] = useState('sources');
  const queryClient = useQueryClient();

  const { data: sources = [], refetch: refetchSources } = useQuery({
    queryKey: ['revisionSources', notebook.id],
    queryFn: () => base44.entities.RevisionSource.filter({ notebook_id: notebook.id }, '-created_date'),
    enabled: !!notebook.id,
  });

  const { data: flashcards = [], refetch: refetchCards } = useQuery({
    queryKey: ['revisionFlashcards', notebook.id],
    queryFn: () => base44.entities.RevisionFlashcard.filter({ notebook_id: notebook.id }),
    enabled: !!notebook.id,
  });

  const now = new Date();
  const dueCards = flashcards.filter(f => !f.next_review || new Date(f.next_review) <= now);
  const notebookColor = COLOR_MAP[notebook.color] || COLOR_MAP.purple;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-900/20 to-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-slate-950/90 backdrop-blur-xl border-b border-white/10">
        <div className="px-4 md:px-6 py-3 flex items-center gap-4">
          <button onClick={onBack} className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 text-sm">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${notebookColor} flex items-center justify-center text-lg flex-shrink-0`}>
            {notebook.icon || '📚'}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-black truncate">{notebook.name}</h1>
            <p className="text-slate-500 text-xs">{notebook.subject || 'No subject'}{notebook.exam_board ? ` · ${notebook.exam_board}` : ''}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 flex-shrink-0">
            <span>{sources.length} sources</span>
            <span>·</span>
            <span>{flashcards.length} cards</span>
            {dueCards.length > 0 && (
              <span className="text-amber-400 font-bold">· {dueCards.length} due</span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 md:px-6 overflow-x-auto pb-0.5">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                activeTab === t.id
                  ? 'border-violet-400 text-violet-300'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}>
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
              {t.id === 'flashcards' && dueCards.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-black">
                  {dueCards.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'sources' && (
            <motion.div key="sources" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <SourceUploader notebook={notebook} user={user} sources={sources} onRefresh={refetchSources} />
            </motion.div>
          )}
          {activeTab === 'chat' && (
            <motion.div key="chat" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <NotebookAIChat notebook={notebook} user={user} sources={sources} />
            </motion.div>
          )}
          {activeTab === 'flashcards' && (
            <motion.div key="flashcards" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <FlashcardStudy notebook={notebook} user={user} flashcards={flashcards} sources={sources} onRefresh={refetchCards} />
            </motion.div>
          )}
          {activeTab === 'quiz' && (
            <motion.div key="quiz" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <QuizGenerator notebook={notebook} user={user} sources={sources} />
            </motion.div>
          )}
          {activeTab === 'studyguide' && (
            <motion.div key="studyguide" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <StudyGuideGenerator notebook={notebook} user={user} sources={sources} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}