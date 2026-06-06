import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { FlaskConical, Sparkles, RotateCcw, ArrowRight } from 'lucide-react';

const EXAMPLES = [
  'H2 + O2 → H2O',
  'CH4 + O2 → CO2 + H2O',
  'Fe + HCl → FeCl2 + H2',
  'Na + H2O → NaOH + H2',
  'CaCO3 → CaO + CO2',
];

export default function ChemistryBalancer() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const balance = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('callOpenAI', {
        prompt: `You are an expert chemistry teacher. Balance the following chemical equation and explain each step.
Equation: ${input}

Provide: the balanced equation, reaction type, step-by-step balancing, ionic equation if applicable, state symbols, and safety notes.`,
        response_json_schema: {
          type: 'object',
          properties: {
            unbalanced: { type: 'string' },
            balanced: { type: 'string' },
            type: { type: 'string' },
            steps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  step: { type: 'number' },
                  explanation: { type: 'string' },
                  state: { type: 'string' },
                },
                required: ['step', 'explanation', 'state'],
                additionalProperties: false,
              },
            },
            ionic_equation: { type: 'string' },
            ionic_explanation: { type: 'string' },
            state_symbols: { type: 'string' },
            notes: { type: 'string' },
          },
          required: ['unbalanced', 'balanced', 'type', 'steps', 'ionic_equation', 'ionic_explanation', 'state_symbols', 'notes'],
          additionalProperties: false,
        },
      });
      setResult(res.data);
    } catch (e) {
      setResult({ error: 'Could not balance equation. Please check the format and try again.' });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <label className="text-slate-300 text-sm font-semibold mb-2 block">Enter a chemical equation to balance</label>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && balance()}
          placeholder="e.g. H2 + O2 → H2O or H2 + O2 -> H2O"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 font-mono text-sm"
        />
        <div className="flex flex-wrap gap-2 mt-3 mb-4">
          {EXAMPLES.map(ex => (
            <button key={ex} onClick={() => setInput(ex)}
              className="text-xs px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-slate-400 hover:text-white hover:border-emerald-500/40 transition-all font-mono">
              {ex}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={balance} disabled={loading || !input.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-semibold transition-all">
            <FlaskConical className="w-4 h-4" />
            {loading ? 'Balancing...' : 'Balance Equation'}
          </button>
          {result && <button onClick={() => { setResult(null); setInput(''); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-slate-400 hover:text-white rounded-xl transition-all">
            <RotateCcw className="w-4 h-4" /> Clear
          </button>}
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-slate-400 p-4">
          <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          Balancing your equation...
        </div>
      )}

      {result?.error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">{result.error}</div>
      )}

      <AnimatePresence>
        {result && !result.error && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Balanced equation banner */}
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 text-center">
              <div className="text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-2">Balanced Equation</div>
              <div className="text-2xl font-mono font-bold text-white">{result.balanced}</div>
              <div className="mt-2 text-xs text-slate-400 font-mono">{result.state_symbols}</div>
              <span className="inline-block mt-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-semibold">
                {result.type}
              </span>
            </div>

            {/* Steps */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" /> Balancing Steps
              </h3>
              <div className="space-y-3">
                {result.steps?.map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 text-xs font-bold flex-shrink-0 mt-0.5">
                      {step.step}
                    </div>
                    <div className="flex-1">
                      <div className="text-slate-300 text-sm">{step.explanation}</div>
                      {step.state && (
                        <div className="mt-2 bg-slate-900/60 rounded-lg px-3 py-2 font-mono text-sm text-emerald-300 border border-white/5">
                          {step.state}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ionic equation */}
            {result.ionic_equation && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-5">
                <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-blue-400" /> Net Ionic Equation
                </h3>
                <div className="font-mono text-blue-200 text-lg mb-2">{result.ionic_equation}</div>
                <div className="text-slate-400 text-sm">{result.ionic_explanation}</div>
              </div>
            )}

            {result.notes && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-amber-300 text-sm">
                <span className="font-semibold">⚗️ Note: </span>{result.notes}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}