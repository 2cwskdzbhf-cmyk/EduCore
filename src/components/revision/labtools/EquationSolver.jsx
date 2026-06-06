import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Calculator, Loader2, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';

const EXAMPLES = [
  '2x² + 5x - 3 = 0',
  '3x + 2y = 12, x - y = 1',
  'sin(x) = √3/2',
  'x³ - 6x² + 11x - 6 = 0',
  'log₂(x) + log₂(x-2) = 3',
];

export default function EquationSolver({ user }) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedStep, setExpandedStep] = useState(null);

  const solve = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert maths tutor. Solve the following equation/problem step by step.
Equation/Problem: ${input}

Return a JSON object with:
{
  "problem_type": "string (e.g. Quadratic Equation, Simultaneous Equations, Trigonometry)",
  "summary": "one-line summary of the approach",
  "steps": [
    {
      "step_number": 1,
      "title": "short step title",
      "working": "the actual mathematical working",
      "explanation": "why we do this step in plain English"
    }
  ],
  "final_answer": "the final answer(s)",
  "answer_check": "brief verification that the answer is correct",
  "tips": ["any useful tips or common mistakes to avoid"]
}`,
        response_json_schema: {
          type: 'object',
          properties: {
            problem_type: { type: 'string' },
            summary: { type: 'string' },
            steps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  step_number: { type: 'number' },
                  title: { type: 'string' },
                  working: { type: 'string' },
                  explanation: { type: 'string' },
                },
              },
            },
            final_answer: { type: 'string' },
            answer_check: { type: 'string' },
            tips: { type: 'array', items: { type: 'string' } },
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
        <label className="text-sm text-slate-400 font-medium mb-2 block">Enter equation or problem</label>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && e.ctrlKey && solve()}
          placeholder="e.g. 2x² + 5x - 3 = 0  or  3x + 2y = 12, x - y = 1"
          rows={3}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-violet-500/50 resize-none font-mono"
        />
        <div className="flex items-center justify-between mt-3">
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map(ex => (
              <button key={ex} onClick={() => setInput(ex)}
                className="text-xs px-2.5 py-1 bg-white/5 hover:bg-violet-500/20 text-slate-400 hover:text-violet-300 border border-white/10 hover:border-violet-500/30 rounded-lg transition-all">
                {ex}
              </button>
            ))}
          </div>
          <button onClick={solve} disabled={loading || !input.trim()}
            className="ml-3 flex-shrink-0 flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
            {loading ? 'Solving...' : 'Solve'}
          </button>
        </div>
      </div>

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between bg-violet-500/10 border border-violet-500/20 rounded-2xl px-5 py-4">
              <div>
                <div className="text-xs text-violet-400 font-semibold uppercase tracking-wider mb-1">{result.problem_type}</div>
                <div className="text-slate-300 text-sm">{result.summary}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500 mb-1">Answer</div>
                <div className="text-lg font-black text-white font-mono">{result.final_answer}</div>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Step-by-Step Solution</h3>
              {result.steps?.map((step, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                  <button onClick={() => setExpandedStep(expandedStep === i ? null : i)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-300 text-xs font-bold flex-shrink-0">
                        {step.step_number}
                      </div>
                      <div>
                        <div className="text-white text-sm font-semibold">{step.title}</div>
                        <div className="text-slate-400 text-xs font-mono mt-0.5">{step.working}</div>
                      </div>
                    </div>
                    {expandedStep === i ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </button>
                  <AnimatePresence>
                    {expandedStep === i && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="px-4 pb-4 pt-1 border-t border-white/5">
                          <p className="text-slate-300 text-sm">{step.explanation}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* Check + Tips */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                <div className="text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-2">✓ Answer Check</div>
                <p className="text-slate-300 text-sm">{result.answer_check}</p>
              </div>
              {result.tips?.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold uppercase tracking-wider mb-2">
                    <Lightbulb className="w-3.5 h-3.5" /> Tips
                  </div>
                  <ul className="space-y-1">
                    {result.tips.map((t, i) => <li key={i} className="text-slate-300 text-sm flex gap-1.5"><span className="text-amber-400">•</span>{t}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}