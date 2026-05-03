import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, X, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { BattleSound } from './BattleSoundEngine';

export default function BattleInvitePopup({ invite, onAccept, onDecline }) {
  const [showQuestions, setShowQuestions] = useState(false);

  useEffect(() => {
    BattleSound.invite();
  }, []);

  const questions = (() => {
    try { return JSON.parse(invite.questions_json || '[]'); } catch { return []; }
  })();

  return (
    <motion.div
      className="fixed inset-0 z-[999] flex items-center justify-center p-6"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

      <motion.div className="relative z-10 max-w-sm w-full"
        initial={{ scale: 0.5, rotate: -5, y: 60 }}
        animate={{ scale: 1, rotate: 0, y: 0 }}
        exit={{ scale: 0.5, y: 60, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
        {/* Glow ring */}
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 opacity-70 blur-md animate-pulse" />

        <div className="relative bg-slate-900 border border-white/20 rounded-3xl p-8 text-center">
          <motion.div
            className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center"
            animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 0.6, repeat: 2 }}>
            <Swords className="w-10 h-10 text-white" />
          </motion.div>

          <h2 className="text-2xl font-black text-white mb-2">⚔️ Battle Challenge!</h2>
          <p className="text-slate-300 mb-1">
            <span className="text-orange-400 font-bold text-lg">{invite.challenger_name}</span>
          </p>
          <p className="text-slate-400 text-sm mb-4">has challenged you to a 1v1 Battle!</p>

          {/* Question count info */}
          {questions.length > 0 && (
            <p className="text-slate-500 text-xs mb-3">📝 {questions.length} question{questions.length !== 1 ? 's' : ''} selected</p>
          )}

          {/* View questions toggle */}
          {questions.length > 0 && (
            <div className="mb-5">
              <button
                onClick={() => setShowQuestions(!showQuestions)}
                className="flex items-center gap-1.5 mx-auto text-xs text-blue-400 hover:text-blue-300 transition-colors font-bold">
                {showQuestions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {showQuestions ? 'Hide Questions' : 'View Selected Questions'}
              </button>

              <AnimatePresence>
                {showQuestions && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="mt-3 overflow-hidden">
                    <div className="space-y-2 max-h-48 overflow-y-auto text-left">
                      {questions.map((q, i) => (
                        <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-3">
                          <p className="text-white text-xs font-bold">Q{i + 1}: {q.question_text}</p>
                          <p className="text-slate-500 text-xs mt-0.5">{q.options?.length} options</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <motion.button onClick={onDecline}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm transition-colors"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}>
              <X className="w-4 h-4" /> Decline
            </motion.button>
            <motion.button onClick={onAccept}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-black text-sm shadow-lg shadow-green-500/40"
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Check className="w-4 h-4" /> Accept!
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}