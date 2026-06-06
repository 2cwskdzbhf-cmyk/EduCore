import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { GitCompare, Search, Sparkles, Layers } from 'lucide-react';
import SourceComparison from './SourceComparison';
import SourceGapFinder from './SourceGapFinder';
import SourceCleanUp from './SourceCleanUp';

const TABS = [
  {
    id: 'compare',
    label: 'Source Comparison',
    icon: GitCompare,
    color: 'text-blue-400',
    activeGradient: 'from-blue-600 to-violet-600',
    desc: 'Compare similarities, differences, conflicts & missing perspectives across sources',
  },
  {
    id: 'gaps',
    label: 'Gap Finder',
    icon: Search,
    color: 'text-amber-400',
    activeGradient: 'from-amber-500 to-orange-600',
    desc: 'Scan your sources for missing definitions, examples, case studies & exam topics',
  },
  {
    id: 'cleanup',
    label: 'Source Clean-Up',
    icon: Sparkles,
    color: 'text-fuchsia-400',
    activeGradient: 'from-violet-600 to-fuchsia-600',
    desc: 'Rewrite messy notes into clean headings, bullets, definitions & examples',
  },
];

export default function DeepSourceTools({ user, notebooks }) {
  const [activeTab, setActiveTab] = useState('compare');

  const { data: sources = [] } = useQuery({
    queryKey: ['deepToolsSources', user?.email],
    queryFn: () => base44.entities.RevisionSource.filter({ student_email: user.email }),
    enabled: !!user?.email,
  });

  const activeTabConfig = TABS.find(t => t.id === activeTab);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white mb-1 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Layers className="w-5 h-5 text-white" />
          </div>
          Deep Source Tools
        </h1>
        <p className="text-slate-400 text-sm">Analyse, compare, and refine your study sources with AI</p>
      </div>

      {/* Tab cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`text-left rounded-2xl p-4 border transition-all ${
              activeTab === tab.id
                ? 'bg-white/10 border-white/20'
                : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/8'
            }`}>
            <div className={`flex items-center gap-2 mb-2 ${activeTab === tab.id ? tab.color : 'text-slate-500'}`}>
              <tab.icon className="w-4 h-4" />
              <span className={`text-sm font-bold ${activeTab === tab.id ? 'text-white' : 'text-slate-400'}`}>{tab.label}</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">{tab.desc}</p>
          </button>
        ))}
      </div>

      {/* Panel */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl border border-white/10 bg-white/5 p-6">
          {/* Panel header */}
          <div className="flex items-center gap-2 mb-5 pb-4 border-b border-white/10">
            <div className={`w-7 h-7 rounded-xl bg-gradient-to-br ${activeTabConfig.activeGradient} flex items-center justify-center`}>
              <activeTabConfig.icon className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">{activeTabConfig.label}</p>
              <p className="text-slate-500 text-xs">{sources.length} sources available</p>
            </div>
          </div>

          {activeTab === 'compare' && <SourceComparison notebooks={notebooks} sources={sources} />}
          {activeTab === 'gaps' && <SourceGapFinder notebooks={notebooks} sources={sources} />}
          {activeTab === 'cleanup' && <SourceCleanUp notebooks={notebooks} sources={sources} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}