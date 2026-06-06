import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Calendar, BarChart2 } from 'lucide-react';
import TopicAutoDetection from './TopicAutoDetection';
import RevisionTimeline from './RevisionTimeline';
import NotebookInsights from './NotebookInsights';

const TABS = [
  { id: 'topics', label: 'Topic Auto-Detection', icon: Sparkles, color: 'from-violet-500 to-purple-600', desc: 'AI builds topics, flashcards & quizzes from your sources' },
  { id: 'timeline', label: 'Revision Timeline', icon: Calendar, color: 'from-orange-500 to-red-500', desc: 'Track what you revised, when, and what\'s overdue' },
  { id: 'insights', label: 'Notebook Insights', icon: BarChart2, color: 'from-blue-500 to-cyan-500', desc: 'Graphs showing strengths, weaknesses and accuracy' },
];

export default function NotebookSuperpowers({ user, notebooks }) {
  const [activeTab, setActiveTab] = useState(null);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white mb-1">Notebook Superpowers ⚡</h2>
        <p className="text-slate-400 text-sm">AI-powered tools to supercharge your revision</p>
      </div>

      {/* Tab cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {TABS.map(tab => (
          <motion.button
            key={tab.id}
            onClick={() => setActiveTab(activeTab === tab.id ? null : tab.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`p-5 rounded-2xl border text-left transition-all ${
              activeTab === tab.id
                ? 'border-violet-500/50 bg-violet-500/10'
                : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tab.color} flex items-center justify-center mb-3`}>
              <tab.icon className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-white font-bold text-sm mb-1">{tab.label}</h3>
            <p className="text-slate-400 text-xs leading-relaxed">{tab.desc}</p>
          </motion.button>
        ))}
      </div>

      {/* Content panel */}
      <AnimatePresence mode="wait">
        {activeTab && (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-6"
          >
            {activeTab === 'topics' && <TopicAutoDetection user={user} notebooks={notebooks} />}
            {activeTab === 'timeline' && <RevisionTimeline user={user} notebooks={notebooks} />}
            {activeTab === 'insights' && <NotebookInsights user={user} notebooks={notebooks} />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}