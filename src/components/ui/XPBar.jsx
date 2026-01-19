import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export default function XPBar({ currentXP = 0, levelXP = 1000, level = 1, showLabel = true }) {
  const percentage = Math.min((currentXP / levelXP) * 100, 100);

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Level {level}
            </div>
          </div>
          <span className="text-sm text-slate-500 font-medium">
            {currentXP.toLocaleString()} / {levelXP.toLocaleString()} XP
          </span>
        </div>
      )}
      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}