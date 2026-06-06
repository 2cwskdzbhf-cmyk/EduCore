import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Video, Radio, Mic } from 'lucide-react';
import ExplainerVideo from './ExplainerVideo';
import PodcastMode from './PodcastMode';
import VoiceTutor from './VoiceTutor';

const TABS = [
  { id: 'video', label: 'Explainer Videos', icon: Video, color: 'text-blue-400', desc: 'Visual animated explanations' },
  { id: 'podcast', label: 'Podcast Mode', icon: Radio, color: 'text-violet-400', desc: 'Two AI hosts discuss your notes' },
  { id: 'voice', label: 'Voice Tutor', icon: Mic, color: 'text-emerald-400', desc: 'Real-time voice conversation' },
];

export default function AudioLearningHub({ user, notebooks }) {
  const [activeTab, setActiveTab] = useState('video');

  const { data: sources = [] } = useQuery({
    queryKey: ['audioLearningSources', user?.email],
    queryFn: () => base44.entities.RevisionSource.filter({ student_email: user.email }),
    enabled: !!user?.email,
  });

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white mb-1 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Radio className="w-5 h-5 text-white" />
          </div>
          AI Audio &amp; Video Learning
        </h1>
        <p className="text-slate-400 text-sm">Listen, watch, and talk — learn from your notes in a whole new way</p>
      </div>

      {/* Tab cards */}
      <div className="grid grid-cols-3 gap-3">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`text-left rounded-2xl p-4 border transition-all ${
              activeTab === tab.id
                ? 'bg-violet-500/20 border-violet-500/40'
                : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/8'
            }`}>
            <tab.icon className={`w-5 h-5 mb-2 ${activeTab === tab.id ? tab.color : 'text-slate-500'}`} />
            <p className={`text-sm font-bold ${activeTab === tab.id ? 'text-white' : 'text-slate-400'}`}>{tab.label}</p>
            <p className="text-xs text-slate-600 mt-0.5">{tab.desc}</p>
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}>
          {activeTab === 'video' && <ExplainerVideo notebooks={notebooks} sources={sources} />}
          {activeTab === 'podcast' && <PodcastMode notebooks={notebooks} sources={sources} />}
          {activeTab === 'voice' && <VoiceTutor notebooks={notebooks} sources={sources} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}