import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, FlaskConical, BarChart2, Network, Beaker } from 'lucide-react';
import EquationSolver from '@/components/ailab/EquationSolver';
import ChemistryBalancer from '@/components/ailab/ChemistryBalancer';
import GraphGenerator from '@/components/ailab/GraphGenerator';
import MindMapGenerator from '@/components/ailab/MindMapGenerator';

const TOOLS = [
  {
    id: 'equation',
    label: 'Equation Solver',
    icon: Calculator,
    color: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-500/10 border-violet-500/30',
    active: 'bg-violet-500/20 border-violet-500/40 text-violet-300',
    description: 'Step-by-step maths solutions',
  },
  {
    id: 'chemistry',
    label: 'Chemistry Balancer',
    icon: FlaskConical,
    color: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
    active: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
    description: 'Balance & explain equations',
  },
  {
    id: 'graph',
    label: 'Graph Generator',
    icon: BarChart2,
    color: 'from-blue-500 to-cyan-600',
    bg: 'bg-blue-500/10 border-blue-500/30',
    active: 'bg-blue-500/20 border-blue-500/40 text-blue-300',
    description: 'Visualise functions & data',
  },
  {
    id: 'mindmap',
    label: 'Mind Map',
    icon: Network,
    color: 'from-pink-500 to-rose-600',
    bg: 'bg-pink-500/10 border-pink-500/30',
    active: 'bg-pink-500/20 border-pink-500/40 text-pink-300',
    description: 'Convert notes to visual maps',
  },
];

export default function AILabTools() {
  const [active, setActive] = useState('equation');
  const current = TOOLS.find(t => t.id === active);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900 p-4 lg:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Beaker className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">AI Lab Tools</h1>
            <p className="text-slate-400 text-sm">Advanced AI-powered science & maths toolkit</p>
          </div>
        </div>
      </div>

      {/* Tool cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {TOOLS.map(tool => (
          <button key={tool.id} onClick={() => setActive(tool.id)}
            className={`p-4 rounded-2xl border text-left transition-all ${
              active === tool.id ? tool.active : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-white'
            }`}>
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center mb-3 shadow-lg`}>
              <tool.icon className="w-5 h-5 text-white" />
            </div>
            <div className="font-bold text-sm">{tool.label}</div>
            <div className="text-xs text-slate-500 mt-0.5">{tool.description}</div>
          </button>
        ))}
      </div>

      {/* Tool content */}
      <AnimatePresence mode="wait">
        <motion.div key={active} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
          {active === 'equation' && <EquationSolver />}
          {active === 'chemistry' && <ChemistryBalancer />}
          {active === 'graph' && <GraphGenerator />}
          {active === 'mindmap' && <MindMapGenerator />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}