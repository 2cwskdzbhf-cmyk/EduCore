import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, X, Check } from 'lucide-react';
import { BattleSound } from './BattleSoundEngine';

export default function BattleInvitePopup({ invite, onAccept, onDecline }) {
  useEffect(() => {
    BattleSound.invite();
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[999] flex items-center justify-center p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

      {/* Card */}
      <motion.div
        className="relative z-10 max-w-sm w-full"
        initial={{ scale: 0.5, rotate: -5, y: 60 }}
        animate={{ scale: 1, rotate: 0, y: 0 }}
        exit={{ scale: 0.5, y: 60, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        {/* Glow ring */}
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 opacity-70 blur-md animate-pulse" />

        <div className="relative bg-slate-900 border border-white/20 rounded-3xl p-8 text-center">
          {/* Icon */}
          <motion.div
            className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center"
            animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 0.6, repeat: 2 }}
          >
            <Swords className="w-10 h-10 text-white" />
          </motion.div>

          <h2 className="text-2xl font-black text-white mb-2">⚔️ Battle Challenge!</h2>
          <p className="text-slate-300 mb-1">
            <span className="text-orange-400 font-bold text-lg">{invite.challenger_name}</span>
          </p>
          <p className="text-slate-400 text-sm mb-8">has challenged you to a 1v1 Battle!</p>

          <div className="grid grid-cols-2 gap-3">
            <motion.button
              onClick={onDecline}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
            >
              <X className="w-4 h-4" /> Decline
            </motion.button>
            <motion.button
              onClick={onAccept}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-black text-sm shadow-lg shadow-green-500/40"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Check className="w-4 h-4" /> Accept!
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}