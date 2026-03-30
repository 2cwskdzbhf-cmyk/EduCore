import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Shuffle, User } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';

export default function RandomGroupGenerator({ students = [] }) {
  const [selected, setSelected] = useState(() => new Set(students.map(s => s.email || s)));
  const [mode, setMode] = useState('groups'); // 'groups' | 'size'
  const [numGroups, setNumGroups] = useState(3);
  const [groupSize, setGroupSize] = useState(3);
  const [groups, setGroups] = useState([]);

  // sync when students list changes - always select all
  React.useEffect(() => {
    if (students.length > 0) {
      setSelected(new Set(students.map(s => s.email || s)));
    }
  }, [JSON.stringify(students.map(s => s.email || s))]);

  const toggle = (key) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const getName = (s) => s.full_name || (s.email || s).split('@')[0];
  const getKey = (s) => s.email || s;

  const generate = () => {
    const pool = [...students.filter(s => selected.has(getKey(s)))];
    // shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    let count = mode === 'groups' ? numGroups : Math.ceil(pool.length / groupSize);
    count = Math.max(1, Math.min(count, pool.length));
    const result = Array.from({ length: count }, () => []);
    pool.forEach((s, i) => result[i % count].push(s));
    setGroups(result);
  };

  const groupColors = ['from-purple-500/20 to-purple-600/10 border-purple-500/30',
    'from-blue-500/20 to-blue-600/10 border-blue-500/30',
    'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
    'from-amber-500/20 to-amber-600/10 border-amber-500/30',
    'from-pink-500/20 to-pink-600/10 border-pink-500/30',
    'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30'];

  return (
    <div className="space-y-4">
      {/* Student checkboxes */}
      <div className="grid sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
        {students.map(s => {
          const key = getKey(s);
          const checked = selected.has(key);
          return (
            <button key={key} onClick={() => toggle(key)}
              className={`flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all ${
                checked ? 'border-emerald-500/50 bg-emerald-500/10 text-white' : 'border-white/10 bg-white/5 text-slate-500'
              }`}>
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                checked ? 'border-emerald-400 bg-emerald-500' : 'border-slate-600'}`}>
                {checked && <span className="text-white text-xs">✓</span>}
              </div>
              <User className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm truncate">{getName(s)}</span>
            </button>
          );
        })}
      </div>

      {/* Mode + input */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex rounded-lg overflow-hidden border border-white/10">
          <button onClick={() => setMode('groups')}
            className={`px-3 py-1.5 text-sm transition-all ${mode === 'groups' ? 'bg-purple-500 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
            # Groups
          </button>
          <button onClick={() => setMode('size')}
            className={`px-3 py-1.5 text-sm transition-all ${mode === 'size' ? 'bg-purple-500 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
            Per group
          </button>
        </div>
        <Input
          type="number" min="1" max="20"
          value={mode === 'groups' ? numGroups : groupSize}
          onChange={e => mode === 'groups' ? setNumGroups(+e.target.value) : setGroupSize(+e.target.value)}
          className="bg-white/5 border-white/10 text-white w-20"
        />
        <Button onClick={generate} disabled={selected.size === 0}
          className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600">
          <Shuffle className="w-4 h-4 mr-2" /> Generate Groups
        </Button>
      </div>

      {/* Results */}
      <AnimatePresence>
        {groups.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {groups.map((group, gi) => (
              <div key={gi} className={`p-4 rounded-xl bg-gradient-to-br border ${groupColors[gi % groupColors.length]}`}>
                <p className="text-white font-bold mb-2 text-sm">Group {gi + 1}</p>
                <div className="space-y-1">
                  {group.map(s => (
                    <p key={getKey(s)} className="text-slate-200 text-sm flex items-center gap-2">
                      <User className="w-3 h-3 flex-shrink-0" /> {getName(s)}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}