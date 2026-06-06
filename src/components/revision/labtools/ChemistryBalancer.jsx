import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { FlaskConical, Loader2, ArrowRight } from 'lucide-react';

const EXAMPLES = [
  'Fe + O2 → Fe2O3',
  'H2 + O2 → H2O',
  'CH4 + O2 → CO2 + H2O',
  'Al + HCl → AlCl3 + H2',
  'CaCO3 + HCl → CaCl2 + H2O + CO2',
];

function FormulaDisplay({ formula }) {
  // Convert H2O → H₂O style
  const formatted = formula.replace(/(\d+)/g, (m) => {
    const subs = { '0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉' };
    return m.split('').map(d => subs[d] || d).join('');
  });
  return <span className="font-mono">{formatted}</span>;
}

export default function ChemistryBalancer({ user }) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const balance = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert chemistry teacher. Balance the following chemical equation and explain the process.
Equation: ${input}

Return a JSON object with:
{
  "reaction_type": "string (e.g. Combustion, Neutralisation, Redox)",
  "unbalanced": "the original unbalanced equation",
  "balanced": "the correctly balanced equation with coefficients",
  "ionic_equation": "the full ionic equation (if applicable, else 'N/A')",
  "net_ionic_equation": "the net ionic equation (if applicable, else 'N/A')",
  "steps": [
    {
      "step_number": 1,
      "title": "short title",
      "explanation": "what we do in this step"
    }
  ],
  "atom_counts": [
    {
      "element": "element symbol",
      "left_side": number,
      "right_side": number
    }
  ],
  "reaction_conditions": "temperature, catalyst, state symbols etc if relevant",
  "real_world_application": "brief real-world example of this reaction"
}`,
        response_json_schema: {
          type: 'object',
          properties: {
            reaction_type: { type: 'string' },
            unbalanced: { type: 'string' },
            balanced: { type: 'string' },
            ionic_equation: { type: 'string' },
            net_ionic_equation: { type: 'string' },
            steps: { type: 'array', items: { type: 'object', properties: { step_number: { type: 'number' }, title: { type: 'string' }, explanation: { type: 'string' } } } },
            atom_counts: { type: 'array', items: { type: 'object', properties: { element: { type: 'string' }, left_side: { type: 'number' }, right_side: { type: 'number' } } } },
            reaction_conditions: { type: 'string' },
            real_world_application: { type: 'string' },
          },
        },
      });
      setResult(res);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Input */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <label className="text-sm text-slate-400 font-medium mb-2 block">Enter unbalanced equation</label>
        <div className="flex gap-3">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && balance()}
            placeholder="e.g. Fe + O2 → Fe2O3"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-emerald-500/50 font-mono"
          />
          <button onClick={balance} disabled={loading || !input.trim()}
            className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all flex-shrink-0">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
            {loading ? 'Balancing...' : 'Balance'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {EXAMPLES.map(ex => (
            <button key={ex} onClick={() => setInput(ex)}
              className="text-xs px-2.5 py-1 bg-white/5 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-300 border border-white/10 hover:border-emerald-500/30 rounded-lg transition-all font-mono">
              {ex}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Balanced equation display */}
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5">
              <div className="text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-3">{result.reaction_type}</div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="text-center">
                  <div className="text-xs text-slate-500 mb-1">Unbalanced</div>
                  <div className="text-slate-400 text-base font-mono bg-white/5 rounded-xl px-4 py-2">{result.unbalanced}</div>
                </div>
                <ArrowRight className="w-5 h-5 text-emerald-400 flex-shrink-0 mx-2" />
                <div className="text-center">
                  <div className="text-xs text-slate-500 mb-1">Balanced ✓</div>
                  <div className="text-white text-base font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2">{result.balanced}</div>
                </div>
              </div>
            </div>

            {/* Atom count table */}
            {result.atom_counts?.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10">
                  <h3 className="text-sm font-bold text-slate-300">Atom Count Check</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-4 py-2 text-left text-slate-400 font-medium">Element</th>
                      <th className="px-4 py-2 text-center text-slate-400 font-medium">Left Side</th>
                      <th className="px-4 py-2 text-center text-slate-400 font-medium">Right Side</th>
                      <th className="px-4 py-2 text-center text-slate-400 font-medium">Balanced?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.atom_counts.map((a, i) => (
                      <tr key={i} className="border-b border-white/5">
                        <td className="px-4 py-2 text-white font-mono font-bold">{a.element}</td>
                        <td className="px-4 py-2 text-center text-slate-300">{a.left_side}</td>
                        <td className="px-4 py-2 text-center text-slate-300">{a.right_side}</td>
                        <td className="px-4 py-2 text-center">
                          <span className={`text-xs font-bold ${a.left_side === a.right_side ? 'text-emerald-400' : 'text-red-400'}`}>
                            {a.left_side === a.right_side ? '✓' : '✗'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Steps */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Balancing Steps</h3>
              {result.steps?.map((step, i) => (
                <div key={i} className="flex gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 text-xs font-bold flex-shrink-0 mt-0.5">
                    {step.step_number}
                  </div>
                  <div>
                    <div className="text-white text-sm font-semibold">{step.title}</div>
                    <div className="text-slate-400 text-sm mt-0.5">{step.explanation}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Ionic equations + context */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.ionic_equation && result.ionic_equation !== 'N/A' && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                  <div className="text-xs text-blue-400 font-semibold mb-2">Full Ionic Equation</div>
                  <p className="text-slate-300 text-sm font-mono">{result.ionic_equation}</p>
                  {result.net_ionic_equation && result.net_ionic_equation !== 'N/A' && (
                    <>
                      <div className="text-xs text-blue-400 font-semibold mt-3 mb-1">Net Ionic Equation</div>
                      <p className="text-slate-300 text-sm font-mono">{result.net_ionic_equation}</p>
                    </>
                  )}
                </div>
              )}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                <div className="text-xs text-amber-400 font-semibold mb-2">Real-World Application</div>
                <p className="text-slate-300 text-sm">{result.real_world_application}</p>
                {result.reaction_conditions && result.reaction_conditions !== 'N/A' && (
                  <>
                    <div className="text-xs text-amber-400 font-semibold mt-3 mb-1">Conditions</div>
                    <p className="text-slate-300 text-sm">{result.reaction_conditions}</p>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}