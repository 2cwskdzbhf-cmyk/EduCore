import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { BarChart2, TrendingUp, Sparkles, RotateCcw, Table } from 'lucide-react';

const MODES = [
  { id: 'function', label: 'Function', icon: TrendingUp, placeholder: 'e.g. y = x^2 - 4x + 3' },
  { id: 'data', label: 'Data Table', icon: Table, placeholder: 'x: 1,2,3,4,5\ny: 2,4,6,8,10' },
  { id: 'equation', label: 'Equation', icon: BarChart2, placeholder: 'e.g. y = 2x + 1 for x from -5 to 5' },
];

const COLORS = ['#8b5cf6', '#06d6a0', '#f59e0b', '#ef4444', '#3b82f6'];

function evalFunction(expr, x) {
  try {
    const safe = expr
      .replace(/\^/g, '**')
      .replace(/sin/g, 'Math.sin')
      .replace(/cos/g, 'Math.cos')
      .replace(/tan/g, 'Math.tan')
      .replace(/sqrt/g, 'Math.sqrt')
      .replace(/abs/g, 'Math.abs')
      .replace(/log/g, 'Math.log10')
      .replace(/ln/g, 'Math.log')
      .replace(/π/g, 'Math.PI')
      .replace(/pi/g, 'Math.PI');
    // eslint-disable-next-line no-new-func
    return Function('x', `return ${safe}`)(x);
  } catch {
    return null;
  }
}

function parseFunction(expr) {
  const match = expr.match(/y\s*=\s*(.+)/i);
  return match ? match[1].trim() : expr.trim();
}

function generatePoints(expr, from = -10, to = 10, steps = 100) {
  const fn = parseFunction(expr);
  const points = [];
  const step = (to - from) / steps;
  for (let i = 0; i <= steps; i++) {
    const x = parseFloat((from + i * step).toFixed(4));
    const y = evalFunction(fn, x);
    if (y !== null && isFinite(y) && Math.abs(y) < 1000) {
      points.push({ x: parseFloat(x.toFixed(3)), y: parseFloat(y.toFixed(4)) });
    }
  }
  return points;
}

function parseDataTable(text) {
  try {
    const lines = text.trim().split('\n');
    const xs = lines[0].replace(/x[:\s]*/i, '').split(',').map(Number);
    const ys = lines[1].replace(/y[:\s]*/i, '').split(',').map(Number);
    return xs.map((x, i) => ({ x, y: ys[i] }));
  } catch {
    return [];
  }
}

export default function GraphGenerator() {
  const [mode, setMode] = useState('function');
  const [input, setInput] = useState('');
  const [xFrom, setXFrom] = useState('-10');
  const [xTo, setXTo] = useState('10');
  const [chartType, setChartType] = useState('line');
  const [aiSuggest, setAiSuggest] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const chartData = useMemo(() => {
    if (!generated || !input.trim()) return [];
    if (mode === 'data') return parseDataTable(input);
    const from = parseFloat(xFrom) || -10;
    const to = parseFloat(xTo) || 10;
    return generatePoints(input, from, to, 120);
  }, [generated, input, mode, xFrom, xTo]);

  const getAISuggestion = async () => {
    if (!input.trim()) return;
    setAiLoading(true);
    try {
      const res = await base44.functions.invoke('callOpenAI', {
        prompt: `Analyse this graph input and provide helpful information. Input: "${input}", Mode: ${mode}. Describe what it shows, list key features (intercepts, turning points, asymptotes), suggest domain and range, and give interpretation tips.`,
        response_json_schema: {
          type: 'object',
          properties: {
            description: { type: 'string' },
            key_features: { type: 'array', items: { type: 'string' } },
            domain: { type: 'string' },
            range: { type: 'string' },
            tips: { type: 'string' },
          },
          required: ['description', 'key_features', 'domain', 'range', 'tips'],
          additionalProperties: false,
        },
      });
      setAiSuggest(res.data);
    } catch (e) {
      // silent
    }
    setAiLoading(false);
  };

  const handleGenerate = () => {
    setGenerated(false);
    setAiSuggest(null);
    setTimeout(() => setGenerated(true), 50);
    getAISuggestion();
  };

  const renderChart = () => {
    if (!chartData.length) return null;
    const color = COLORS[0];
    if (chartType === 'bar') {
      return (
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
          <XAxis dataKey="x" stroke="#94a3b8" tick={{ fontSize: 11 }} />
          <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid #7c3aed', borderRadius: 8 }} />
          <Bar dataKey="y" fill={color} radius={[3, 3, 0, 0]} />
        </BarChart>
      );
    }
    if (chartType === 'scatter') {
      return (
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
          <XAxis dataKey="x" stroke="#94a3b8" tick={{ fontSize: 11 }} name="x" />
          <YAxis dataKey="y" stroke="#94a3b8" tick={{ fontSize: 11 }} name="y" />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: '#1e1b4b', border: '1px solid #7c3aed', borderRadius: 8 }} />
          <Scatter data={chartData} fill={color} />
        </ScatterChart>
      );
    }
    return (
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
        <XAxis dataKey="x" stroke="#94a3b8" tick={{ fontSize: 11 }} />
        <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
        <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid #7c3aed', borderRadius: 8 }} />
        <Line type="monotone" dataKey="y" stroke={color} dot={false} strokeWidth={2} />
      </LineChart>
    );
  };

  return (
    <div className="space-y-4">
      {/* Mode selector */}
      <div className="flex gap-2">
        {MODES.map(m => (
          <button key={m.id} onClick={() => { setMode(m.id); setGenerated(false); setInput(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
              mode === m.id ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}>
            <m.icon className="w-4 h-4" />{m.label}
          </button>
        ))}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
        <label className="text-slate-300 text-sm font-semibold block">
          {mode === 'data' ? 'Enter data (x and y rows)' : 'Enter function or equation'}
        </label>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={MODES.find(m => m.id === mode)?.placeholder}
          rows={mode === 'data' ? 4 : 2}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 font-mono text-sm resize-none"
        />
        {mode !== 'data' && (
          <div className="flex gap-3 items-center">
            <span className="text-slate-400 text-sm">x from</span>
            <input value={xFrom} onChange={e => setXFrom(e.target.value)} className="w-20 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500/50" />
            <span className="text-slate-400 text-sm">to</span>
            <input value={xTo} onChange={e => setXTo(e.target.value)} className="w-20 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500/50" />
            <div className="ml-auto flex gap-2">
              {['line', 'bar', 'scatter'].map(ct => (
                <button key={ct} onClick={() => setChartType(ct)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${chartType === ct ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}>
                  {ct}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={handleGenerate} disabled={!input.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-semibold transition-all">
            <BarChart2 className="w-4 h-4" /> Generate Graph
          </button>
          {generated && <button onClick={() => { setGenerated(false); setInput(''); setAiSuggest(null); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-slate-400 hover:text-white rounded-xl transition-all">
            <RotateCcw className="w-4 h-4" /> Clear
          </button>}
        </div>
      </div>

      <AnimatePresence>
        {generated && chartData.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <ResponsiveContainer width="100%" height={320}>
                {renderChart()}
              </ResponsiveContainer>
            </div>

            {aiLoading && (
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                Analysing graph...
              </div>
            )}

            {aiSuggest && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-5 space-y-3">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-400" /> Graph Analysis
                </h3>
                <p className="text-slate-300 text-sm">{aiSuggest.description}</p>
                {aiSuggest.key_features?.length > 0 && (
                  <div>
                    <div className="text-xs text-blue-400 font-semibold uppercase tracking-wider mb-2">Key Features</div>
                    <div className="flex flex-wrap gap-2">
                      {aiSuggest.key_features.map((f, i) => (
                        <span key={i} className="px-2 py-1 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-200 text-xs">{f}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-slate-500">Domain: </span><span className="text-slate-300">{aiSuggest.domain}</span></div>
                  <div><span className="text-slate-500">Range: </span><span className="text-slate-300">{aiSuggest.range}</span></div>
                </div>
                {aiSuggest.tips && <p className="text-amber-300 text-sm">💡 {aiSuggest.tips}</p>}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}