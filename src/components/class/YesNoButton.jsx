import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

export default function YesNoButton() {
  const [result, setResult] = useState(null);
  const [animKey, setAnimKey] = useState(0);

  const decide = () => {
    setResult(null);
    setTimeout(() => {
      setResult(Math.random() < 0.5 ? 'YES' : 'NO');
      setAnimKey(k => k + 1);
    }, 50);
  };

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <Button
        onClick={decide}
        className="w-40 h-40 rounded-full text-2xl font-black bg-gradient-to-br from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 shadow-2xl shadow-purple-500/40 transition-transform active:scale-95"
      >
        Decide!
      </Button>

      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key={animKey}
            initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            className={`text-7xl font-black px-10 py-4 rounded-3xl shadow-xl ${
              result === 'YES'
                ? 'text-emerald-400 bg-emerald-500/20 border-2 border-emerald-500/40'
                : 'text-red-400 bg-red-500/20 border-2 border-red-500/40'
            }`}
          >
            {result}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}