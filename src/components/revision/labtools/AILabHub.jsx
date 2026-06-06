import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, FlaskConical, TrendingUp, Network, Beaker } from 'lucide-react';
import EquationSolver from './EquationSolver';
import ChemistryBalancer from './ChemistryBalancer';
import GraphGenerator from './GraphGenerator';
import MindMapGenerator from './MindMapGenerator';

const TOOLS = [
  {
    id: 'equation',
    label: 'Equation Solver',
    icon: Calculator,
    color: 'violet',
    description: 'Step-by-step maths solutions for algebra, simultaneous equations, quadratics & more',
    gradient: 'from-violet-500/20 to-purple-600/10',
    border: 'border-violet-500/30',
    accent: 'text-violet-300',
  },
  {
    id: 'chemistry',
    label: 'Chemistry Balancer',
    icon: FlaskConical,
    color: 'emerald',
    description: 'Balance equations, get ionic equations & step-by-step explanations',
    gradient: 'from-emerald-500/20 to-teal-600/10',
    border: 'border-emerald-500/30',
    accent: 'text-emerald-300',
  },
  {
    id: 'graph',
    label: 'Graph Generator',
    icon: TrendingUp,
    color: 'cyan',
    description: 'Plot functions, data tables & equations with AI-powered key feature detection',
    gradient: 'from-cyan-500/20 to-blue-600/10',
    border: 'border-cyan-500/30',
    accent: 'text-cyan-300',
  },
  {
    id: 'mindmap',
    label: 'Mind Map Generator',
    icon: Network,
    color: 'pink',
    description: 'Convert notes into an interactive, editable mind map with auto-grouped concepts',
    gradient: 'from-pink-500/20 to-rose-600/10',
    border: 'border-pink-500/30',
    accent: 'text-pink-300',
  },
];

export default function AILabHub({ user }) {
  const [activeTool, setActiveTool] = useState(null);

  const tool = TOOLS.find(t => t.id === activeTool);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
          <Beaker className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-white font-black text-xl">AI Lab Tools</h2>
          <p className="text-slate-400 text-sm">Advanced AI-powered tools for maths, science & visual learning</p>
        </div>
      </div>

      {/* Tool grid — shown when no tool is active */}
      {!activeTool && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TOOLS.map(t => (
            <motion.button
              key={t.id}
              onClick={() => setActiveTool(t.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`bg-gradient-to-br ${t.gradient} border ${t.border} rounded-2xl p-5 text-left transition-all hover:shadow-lg hover:shadow-black/30`}>
              <div className={`w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-4`}>
                <t.icon className={`w-5 h-5 ${t.accent}`} />
              </div>
              <div className={`text-base font-bold text-white mb-1.5`}>{t.label}</div>
              <p className="text-slate-400 text-sm leading-relaxed">{t.description}</p>
            </motion.button>
          ))}
        </div>
      )}

      {/* Active tool */}
      <AnimatePresence mode="wait">
        {activeTool && tool && (
          <motion.div key={activeTool} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
            {/* Sub-nav */}
            <div className="flex gap-1.5 mb-5 flex-wrap">
              {TOOLS.map(t => (
                <button key={t.id} onClick={() => setActiveTool(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    activeTool === t.id
                      ? `bg-gradient-to-r ${t.gradient} ${t.border} ${t.accent}`
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}>
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              ))}
            </div>

            {activeTool === 'equation' && <EquationSolver user={user} />}
            {activeTool === 'chemistry' && <ChemistryBalancer user={user} />}
            {activeTool === 'graph' && <GraphGenerator user={user} />}
            {activeTool === 'mindmap' && <MindMapGenerator user={user} />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}