import React from 'react';
import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';

export default function StreakBadge({ streak = 0, size = "default" }) {
  const sizeClasses = {
    small: "px-2 py-1 text-xs",
    default: "px-3 py-1.5 text-sm",
    large: "px-4 py-2 text-base"
  };

  const iconSizes = {
    small: "w-3 h-3",
    default: "w-4 h-4",
    large: "w-5 h-5"
  };

  return (
    <motion.div
      className={`inline-flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full font-bold shadow-lg shadow-orange-500/25 ${sizeClasses[size]}`}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <motion.div
        animate={{ 
          scale: [1, 1.2, 1],
          rotate: [0, -5, 5, 0]
        }}
        transition={{ 
          duration: 0.5,
          repeat: Infinity,
          repeatDelay: 2
        }}
      >
        <Flame className={iconSizes[size]} />
      </motion.div>
      {streak} day{streak !== 1 ? 's' : ''}
    </motion.div>
  );
}