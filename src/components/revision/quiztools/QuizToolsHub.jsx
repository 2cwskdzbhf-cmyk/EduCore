import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, BookMarked, Zap } from 'lucide-react';
import QuizGenerator from './QuizGenerator';
import MarkSchemeMode from './MarkSchemeMode';
import AutoMarker from './AutoMarker';

const TABS = [
  { id: 'generate', label: 'Quiz Generator', icon: ClipboardList, desc: 'Create quizzes in any format' },
  { id: 'markscheme', label: 'Mark Scheme', icon: BookMarked, desc: 'AQA · OCR · Edexcel · WJEC' },
  { id: 'automark', label: 'Auto-Marking', icon: Zap, desc: 'AI marks your answers instantly' },
];

export default function QuizToolsHub({ user, notebooks }) {
  const [tab, setTab] = useState('generate');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-white font-black text-2xl">Quiz & Test Tools</h2>
        <p className="text-slate-400 text-sm mt-1">Mark schemes, multiple formats, and instant AI marking</p>
      </div>

      {/* Tab strip */}
      <div className="grid grid-cols-3 gap-3">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex flex-col items-start gap-1 p-4 rounded-2xl border text-left transition-all ${
              tab === t.id
                ? 'bg-violet-500/15 border-violet-500/40 text-white'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/8'
            }`}>
            <t.icon className={`w-5 h-5 mb-1 ${tab === t.id ? 'text-violet-400' : 'text-slate-500'}`} />
            <span className="font-bold text-sm">{t.label}</span>
            <span className="text-xs opacity-60">{t.desc}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
          {tab === 'generate' && <QuizGenerator user={user} notebooks={notebooks} />}
          {tab === 'markscheme' && <MarkSchemeMode user={user} notebooks={notebooks} />}
          {tab === 'automark' && <AutoMarker user={user} notebooks={notebooks} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}