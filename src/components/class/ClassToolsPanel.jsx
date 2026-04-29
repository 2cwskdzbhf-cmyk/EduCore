import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { X, Shuffle, Users, ToggleLeft } from 'lucide-react';
import RandomStudentPicker from './RandomStudentPicker';
import RandomGroupGenerator from './RandomGroupGenerator';
import YesNoButton from './YesNoButton';

export default function ClassToolsPanel({ students = [], onClose, inline = false }) {
  const [activeTab, setActiveTab] = useState('picker');

  const tabs = [
    { id: 'picker', label: '🎯 Student Picker', icon: Shuffle },
    { id: 'groups', label: '👥 Groups', icon: Users },
    { id: 'yesno', label: '❓ Yes / No', icon: ToggleLeft },
  ];

  const content = (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">🛠 Class Tools</h2>
        {!inline && (
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {students.length === 0 && (
        <p className="text-amber-400 text-sm mb-4 text-center">No students in this class yet.</p>
      )}

      <div className="flex gap-2 mb-6 bg-white/5 p-1 rounded-xl">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              activeTab===t.id ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab==='picker' && <motion.div key="picker" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} transition={{duration:0.25}}><RandomStudentPicker students={students}/></motion.div>}
        {activeTab==='groups' && <motion.div key="groups" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} transition={{duration:0.25}}><RandomGroupGenerator students={students}/></motion.div>}
        {activeTab==='yesno' && <motion.div key="yesno" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} transition={{duration:0.25}}><YesNoButton/></motion.div>}
      </AnimatePresence>
    </GlassCard>
  );

  if (inline) return content;

  return (
    <motion.div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}>
      <motion.div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        initial={{scale:0.9,y:20}} animate={{scale:1,y:0}} exit={{scale:0.9,y:20}} onClick={e=>e.stopPropagation()}>
        {content}
      </motion.div>
    </motion.div>
  );
}