import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, Sparkles, ChevronRight, RotateCcw } from 'lucide-react';

const EXAMPLES = [
  '2x² + 5x - 3 = 0',
  '3x + 2y = 12, x - y = 1',
  'd/dx (x³ + 4x² - 2x + 1)',
  '∫(2x + 3)dx',
  'sin²(x) + cos²(x)',
];

export default function EquationSolver() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const solve = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('callOpenAI', {
        prompt: `You are an expert maths tutor. Solve the following equation or expression step by step.
Equation/Expression: ${input}

Provide: problem type, final answer, step-by-step working with titles and explanations, and any helpful notes.`,
        response_json_schema: {
          type: 'object',
          properties: {
            problem_type: { type: 'string' },
            answer: { type: 'string' },
            steps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  step: { type: 'number' },
                  title: { type: 'string' },
                  explanation: { type: 'string' },
                  working: { type: 'string' },
                },
                required: ['step', 'title', 'explanation', 'working'],
                additionalProperties: false,
              },
            },
            notes: { type: 'string' },
          },
          required: ['problem_type', 'answer', 'steps', 'notes'],
          additionalProperties: false,
        },
      });
      setResult(res.data);
    } catch (e) {
      setResult({ error: 'Failed to solve. Please check your equation and try again.' });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <label className="text-slate-300 text-sm font-semibold mb-2 block">Enter your equation or expression</label>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && e.ctrlKey && solve()}
          placeholder="e.g. 2x² + 5x - 3 = 0"
          rows={3}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 resize-none font-mono text-sm"
        />
        <div className="flex flex-wrap gap-2 mt-3 mb-4">
          {EXAMPLES.map(ex => (
            <button key={ex} onClick={() => setInput(ex)}
              className="text-xs px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-slate-400 hover:text-white hover:border-violet-500/40 transition-all">
              {ex}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={solve} disabled={loading || !input.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white rounded-xl font-semibold transition-all">
            <Sparkles className="w-4 h-4" />
            {loading ? 'Solving...' : 'Solve Step by Step'}
          </button>
          {result && <button onClick={() => { setResult(null); setInput(''); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-slate-400 hover:text-white rounded-xl transition-all">
            <RotateCcw className="w-4 h-4" /> Clear
          </button>}
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-slate-400 p-4">
          <div className="w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
          Solving your equation...
        </div>
      )}

      {result?.error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">{result.error}</div>
      )}

      <AnimatePresence>
        {result && !result.error && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-violet-500/10 border border-violet-500/30 rounded-2xl p-4">
                <div className="text-xs text-violet-400 font-semibold uppercase tracking-wider mb-1">Problem Type</div>
                <div className="text-white font-bold">{result.problem_type}</div>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4">
                <div className="text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-1">Answer</div>
                <div className="text-white font-bold font-mono">{result.answer}</div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-violet-400" /> Step-by-Step Solution
              </h3>
              <div className="space-y-3">
                {result.steps?.map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-7 h-7 rounded-full bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-violet-300 text-xs font-bold flex-shrink-0 mt-0.5">
                      {step.step}
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-semibold text-sm">{step.title}</div>
                      <div className="text-slate-400 text-sm mt-0.5">{step.explanation}</div>
                      {step.working && (
                        <div className="mt-2 bg-slate-900/60 rounded-lg px-3 py-2 font-mono text-sm text-emerald-300 border border-white/5">
                          {step.working}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {result.notes && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-amber-300 text-sm">
                <span className="font-semibold">💡 Note: </span>{result.notes}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}