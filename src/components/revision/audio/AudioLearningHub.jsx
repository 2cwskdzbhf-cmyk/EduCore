import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Radio, Mic, Sparkles, Headphones } from 'lucide-react';
import PodcastMode from './PodcastMode';
import VoiceTutor from './VoiceTutor';
import ExplainerMode from './ExplainerMode';

const TABS = [
  { id: 'explainer', label: 'AI Explainer', icon: Sparkles, color: 'text-amber-400', desc: 'Animated step-by-step explanations with narration' },
  { id: 'podcast', label: 'Podcast Mode', icon: Radio, color: 'text-rose-400', desc: 'Two AI hosts discuss your notes conversationally' },
  { id: 'voice', label: 'Voice Tutor', icon: Mic, color: 'text-violet-400', desc: 'Real-time voice conversation with your AI tutor' },
];

export default function AudioLearningHub({ user, notebooks }) {
  const [activeTab, setActiveTab] = useState('explainer');
  const [selectedNotebook, setSelectedNotebook] = useState(null);

  const notebookId = selectedNotebook?.id || notebooks[0]?.id;
  const activeNotebook = selectedNotebook || notebooks[0] || null;

  const { data: sources = [] } = useQuery({
    queryKey: ['audioSources', notebookId],
    queryFn: () => base44.entities.RevisionSource.filter({ notebook_id: notebookId }),
    enabled: !!notebookId,
  });

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white mb-1 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/30">
            <Headphones className="w-5 h-5 text-white" />
          </div>
          AI Audio Learning
        </h1>
        <p className="text-slate-400 text-sm">Explainer videos, podcast conversations, and voice tutoring — powered by your notes</p>
      </div>

      {/* Notebook selector */}
      {notebooks.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-500 text-xs">Using notebook:</span>
          {notebooks.slice(0, 6).map(nb => (
            <button key={nb.id} onClick={() => setSelectedNotebook(nb)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                (nb.id === notebookId)
                  ? 'bg-violet-500/20 border border-violet-500/40 text-violet-200'
                  : 'bg-white/5 border border-white/10 text-slate-400 hover:border-white/20'
              }`}>
              <span>{nb.icon || '📚'}</span>{nb.name}
            </button>
          ))}
        </div>
      )}

      {/* Tab cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`text-left rounded-2xl p-4 border transition-all ${
              activeTab === tab.id
                ? 'bg-white/10 border-white/20'
                : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/8'
            }`}>
            <tab.icon className={`w-5 h-5 mb-2 ${activeTab === tab.id ? tab.color : 'text-slate-500'}`} />
            <p className={`text-sm font-bold ${activeTab === tab.id ? 'text-white' : 'text-slate-400'}`}>{tab.label}</p>
            <p className="text-xs text-slate-600 mt-0.5 leading-tight">{tab.desc}</p>
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}>
          {activeTab === 'explainer' && (
            <ExplainerMode sources={sources} notebook={activeNotebook} />
          )}
          {activeTab === 'podcast' && (
            <PodcastMode sources={sources} notebook={activeNotebook} />
          )}
          {activeTab === 'voice' && (
            <VoiceTutor sources={sources} notebook={activeNotebook} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}