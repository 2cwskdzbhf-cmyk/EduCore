import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Cpu, CalendarDays, BarChart2, Zap } from 'lucide-react';
import TopicAutoDetection from './TopicAutoDetection';
import RevisionTimeline from './RevisionTimeline';
import NotebookInsights from './NotebookInsights';

const TABS = [
  {
    id: 'topics',
    label: 'Topic Auto-Detection',
    icon: Cpu,
    color: 'text-violet-400',
    desc: 'AI scans sources and creates topic folders, subtopics, flashcards & quiz sets',
  },
  {
    id: 'timeline',
    label: 'Revision Timeline',
    icon: CalendarDays,
    color: 'text-blue-400',
    desc: 'Calendar view of what you revised, streaks, and overdue cards',
  },
  {
    id: 'insights',
    label: 'Notebook Insights',
    icon: BarChart2,
    color: 'text-emerald-400',
    desc: 'Graphs of strongest/weakest topics, flashcard & quiz accuracy',
  },
];

export default function NotebookSuperpowers({ user, notebooks }) {
  const [activeTab, setActiveTab] = useState('topics');

  const { data: sources = [] } = useQuery({
    queryKey: ['superpowerSources', user?.email],
    queryFn: () => base44.entities.RevisionSource.filter({ student_email: user.email }),
    enabled: !!user?.email,
  });

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white mb-1 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Zap className="w-5 h-5 text-white" />
          </div>
          Notebook Superpowers
        </h1>
        <p className="text-slate-400 text-sm">AI-powered tools to turbocharge your revision notebooks</p>
      </div>

      {/* Tab cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`text-left rounded-2xl p-4 border transition-all ${
              activeTab === tab.id
                ? 'bg-violet-500/15 border-violet-500/40'
                : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/8'
            }`}>
            <tab.icon className={`w-5 h-5 mb-2 ${activeTab === tab.id ? tab.color : 'text-slate-500'}`} />
            <p className={`text-sm font-bold ${activeTab === tab.id ? 'text-white' : 'text-slate-400'}`}>{tab.label}</p>
            <p className="text-xs text-slate-600 mt-0.5 leading-snug">{tab.desc}</p>
          </button>
        ))}
      </div>

      <div className="border-t border-white/10" />

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}>
          {activeTab === 'topics' && (
            <TopicAutoDetection notebooks={notebooks} sources={sources} user={user} />
          )}
          {activeTab === 'timeline' && (
            <RevisionTimeline user={user} />
          )}
          {activeTab === 'insights' && (
            <NotebookInsights user={user} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}