import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { GitCompare, ScanSearch, Sparkles, Layers } from 'lucide-react';
import SourceComparison from './SourceComparison';
import SourceGapFinder from './SourceGapFinder';
import SourceCleanUp from './SourceCleanUp';

const TABS = [
  {
    id: 'comparison',
    label: 'Source Comparison',
    icon: GitCompare,
    color: 'text-violet-400',
    desc: 'Compare 2+ sources — similarities, differences, conflicts',
  },
  {
    id: 'gaps',
    label: 'Gap Finder',
    icon: ScanSearch,
    color: 'text-amber-400',
    desc: 'Find missing definitions, examples, exam topics',
  },
  {
    id: 'cleanup',
    label: 'Source Clean-Up',
    icon: Sparkles,
    color: 'text-emerald-400',
    desc: 'Rewrite messy notes into clean structured markdown',
  },
];

export default function DeepSourceHub({ user, notebooks }) {
  const [activeTab, setActiveTab] = useState('comparison');

  const { data: sources = [] } = useQuery({
    queryKey: ['deepSourceTools', user?.email],
    queryFn: () => base44.entities.RevisionSource.filter({ student_email: user.email }),
    enabled: !!user?.email,
  });

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white mb-1 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Layers className="w-5 h-5 text-white" />
          </div>
          Deep Source Tools
        </h1>
        <p className="text-slate-400 text-sm">Analyse, audit, and clean your study materials with AI</p>
      </div>

      {/* Tab cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`text-left rounded-2xl p-4 border transition-all ${
              activeTab === tab.id
                ? 'bg-amber-500/15 border-amber-500/40'
                : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/8'
            }`}>
            <tab.icon className={`w-5 h-5 mb-2 ${activeTab === tab.id ? tab.color : 'text-slate-500'}`} />
            <p className={`text-sm font-bold ${activeTab === tab.id ? 'text-white' : 'text-slate-400'}`}>{tab.label}</p>
            <p className="text-xs text-slate-600 mt-0.5 leading-snug">{tab.desc}</p>
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t border-white/10" />

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}>
          {activeTab === 'comparison' && <SourceComparison notebooks={notebooks} sources={sources} />}
          {activeTab === 'gaps' && <SourceGapFinder notebooks={notebooks} sources={sources} />}
          {activeTab === 'cleanup' && <SourceCleanUp notebooks={notebooks} sources={sources} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}