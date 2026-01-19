import React from 'react';
import { motion } from 'framer-motion';
import { Target, Zap } from 'lucide-react';
import ProgressRing from '@/components/ui/ProgressRing';

export default function DailyGoal({ currentXP = 0, goalXP = 50 }) {
  const progress = Math.min((currentXP / goalXP) * 100, 100);
  const isComplete = currentXP >= goalXP;

  return (
    <motion.div
      className={`rounded-2xl p-6 ${isComplete ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' : 'bg-white border border-slate-100'} shadow-sm`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Target className={`w-5 h-5 ${isComplete ? 'text-white' : 'text-slate-600'}`} />
            <h3 className={`font-semibold ${isComplete ? 'text-white' : 'text-slate-800'}`}>
              Daily Goal
            </h3>
          </div>
          <p className={`text-sm ${isComplete ? 'text-emerald-100' : 'text-slate-500'}`}>
            {isComplete ? '🎉 Goal completed!' : `Earn ${goalXP - currentXP} more XP today`}
          </p>
          <div className="flex items-center gap-1 mt-3">
            <Zap className={`w-4 h-4 ${isComplete ? 'text-yellow-300' : 'text-amber-500'}`} />
            <span className={`font-bold ${isComplete ? 'text-white' : 'text-slate-700'}`}>
              {currentXP} / {goalXP} XP
            </span>
          </div>
        </div>
        <ProgressRing 
          progress={progress} 
          size={80} 
          strokeWidth={6} 
          color={isComplete ? "#fff" : "#10b981"}
        >
          {isComplete ? (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-2xl"
            >
              ✨
            </motion.span>
          ) : (
            <span className={`text-lg font-bold ${isComplete ? 'text-white' : 'text-emerald-600'}`}>
              {Math.round(progress)}%
            </span>
          )}
        </ProgressRing>
      </div>
    </motion.div>
  );
}