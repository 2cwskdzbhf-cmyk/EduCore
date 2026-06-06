import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Brain, Target, Zap, Clock, TrendingUp } from 'lucide-react';
import WeakTopicDetector from './WeakTopicDetector';
import AdaptiveRevision from './AdaptiveRevision';
import ExamSimulation from './ExamSimulation';
import MemoryCurve from './MemoryCurve';

const TABS = [
  { id: 'weak', label: 'Weak Topics', icon: Target, color: 'text-red-400', desc: 'See your weakest areas ranked' },
  { id: 'adaptive', label: 'Adaptive Revision', icon: Brain, color: 'text-violet-400', desc: 'AI-powered targeted revision' },
  { id: 'exam', label: 'Exam Simulation', icon: Clock, color: 'text-blue-400', desc: 'Timed exams with auto-marking' },
  { id: 'memory', label: 'Memory Curve', icon: TrendingUp, color: 'text-emerald-400', desc: 'Spaced repetition tracking' },
];

export default function SmartStudyHub({ user, notebooks }) {
  const [activeTab, setActiveTab] = useState('weak');

  const { data: flashcards = [] } = useQuery({
    queryKey: ['smartStudyFlashcards', user?.email],
    queryFn: () => base44.entities.RevisionFlashcard.filter({ student_email: user.email }),
    enabled: !!user?.email,
  });

  const activeConfig = TABS.find(t => t.id === activeTab);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white mb-1 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Zap className="w-5 h-5 text-white" />
          </div>
          Smart Study Modes
        </h1>
        <p className="text-slate-400 text-sm">AI-powered adaptive learning — targeting your exact weaknesses</p>
      </div>

      {/* Tab cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`text-left rounded-2xl p-4 border transition-all ${
              activeTab === tab.id
                ? 'bg-violet-500/20 border-violet-500/40'
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
          {activeTab === 'weak' && (
            <WeakTopicDetector
              flashcards={flashcards}
              notebooks={notebooks}
              onStartAdaptive={() => setActiveTab('adaptive')}
            />
          )}
          {activeTab === 'adaptive' && (
            <AdaptiveRevision flashcards={flashcards} notebooks={notebooks} />
          )}
          {activeTab === 'exam' && (
            <ExamSimulation flashcards={flashcards} notebooks={notebooks} />
          )}
          {activeTab === 'memory' && (
            <MemoryCurve
              flashcards={flashcards}
              notebooks={notebooks}
              onStudyDue={() => setActiveTab('adaptive')}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}