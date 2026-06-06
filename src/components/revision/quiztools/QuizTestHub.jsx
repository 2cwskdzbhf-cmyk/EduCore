import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, BookMarked, Cpu, ChevronRight } from 'lucide-react';
import QuizGenerator from './QuizGenerator';
import MarkSchemeMode from './MarkSchemeMode';
import QuizSession from './QuizSession';

const TABS = [
  { id: 'generate', label: 'Generate Quiz', icon: ClipboardList, desc: 'Create quizzes in any format from your sources' },
  { id: 'markscheme', label: 'Mark Scheme AI', icon: BookMarked, desc: 'Exam-board answers with model answers & commentary' },
];

export default function QuizTestHub({ notebook, user, sources }) {
  const [tab, setTab] = useState('generate');
  const [activeQuiz, setActiveQuiz] = useState(null); // { questions, title, format }

  if (activeQuiz) {
    return (
      <QuizSession
        quiz={activeQuiz}
        notebook={notebook}
        user={user}
        onBack={() => setActiveQuiz(null)}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-white font-black text-xl flex items-center gap-2">
          <Cpu className="w-5 h-5 text-violet-400" /> Quiz & Test Tools
        </h2>
        <p className="text-slate-500 text-sm mt-0.5">AI-powered quizzes, mark schemes, and auto-marking</p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-2">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
              tab === t.id
                ? 'bg-violet-500/20 border-violet-500/30 text-violet-300'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'generate' && (
          <motion.div key="generate" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <QuizGenerator notebook={notebook} user={user} sources={sources} onStartQuiz={setActiveQuiz} />
          </motion.div>
        )}
        {tab === 'markscheme' && (
          <motion.div key="markscheme" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <MarkSchemeMode notebook={notebook} user={user} sources={sources} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}