import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Shuffle, User } from 'lucide-react';

export default function RandomStudentPicker({ students = [] }) {
  const [selected, setSelected] = useState(() => new Set(students.map(s => s.email || s)));
  const [result, setResult] = useState(null);
  const [spinning, setSpinning] = useState(false);

  // sync when students list changes
  React.useEffect(() => {
    setSelected(new Set(students.map(s => s.email || s)));
  }, [students.length]);

  const toggle = (key) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const pick = () => {
    const pool = students.filter(s => selected.has(s.email || s));
    if (pool.length === 0) return;
    setSpinning(true);
    setResult(null);
    setTimeout(() => {
      const winner = pool[Math.floor(Math.random() * pool.length)];
      setResult(winner);
      setSpinning(false);
    }, 800);
  };

  const getName = (s) => s.full_name || (s.email || s).split('@')[0];
  const getKey = (s) => s.email || s;

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
        {students.map(s => {
          const key = getKey(s);
          const checked = selected.has(key);
          return (
            <button
              key={key}
              onClick={() => toggle(key)}
              className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                checked
                  ? 'border-purple-500/50 bg-purple-500/10 text-white'
                  : 'border-white/10 bg-white/5 text-slate-500'
              }`}
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                checked ? 'border-purple-400 bg-purple-500' : 'border-slate-600'
              }`}>
                {checked && <span className="text-white text-xs">✓</span>}
              </div>
              <User className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium truncate">{getName(s)}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-slate-400 text-sm">{selected.size} of {students.length} selected</p>
        <Button
          onClick={pick}
          disabled={selected.size === 0 || spinning}
          className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
        >
          <Shuffle className="w-4 h-4 mr-2" />
          {spinning ? 'Picking…' : 'Pick Student'}
        </Button>
      </div>

      <AnimatePresence>
        {result && !spinning && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center p-6 rounded-2xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30"
          >
            <p className="text-slate-400 text-sm mb-1">Selected</p>
            <p className="text-3xl font-bold text-white">🎉 {getName(result)}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}