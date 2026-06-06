import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { TrendingUp, Loader2, Plus, Trash2, Table, FunctionSquare, GitBranch } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

const MODES = [
  { id: 'function', label: 'Function', icon: FunctionSquare, placeholder: 'e.g. y = x^2 - 3x + 2' },
  { id: 'data', label: 'Data Table', icon: Table, placeholder: 'Enter data as CSV: x,y\n1,2\n3,4\n5,6' },
  { id: 'equation', label: 'Equation Set', icon: GitBranch, placeholder: 'e.g. y = 2x + 1 and y = -x + 7' },
];

function evaluateFunction(expr, x) {
  try {
    // Basic safe eval for common math functions
    const safe = expr
      .replace(/\^/g, '**')
      .replace(/sin\(/g, 'Math.sin(')
      .replace(/cos\(/g, 'Math.cos(')
      .replace(/tan\(/g, 'Math.tan(')
      .replace(/sqrt\(/g, 'Math.sqrt(')
      .replace(/abs\(/g, 'Math.abs(')
      .replace(/log\(/g, 'Math.log10(')
      .replace(/ln\(/g, 'Math.log(')
      .replace(/π/g, 'Math.PI')
      .replace(/pi/gi, 'Math.PI')
      .replace(/e(?![a-z])/g, 'Math.E');
    // Extract right side of y = ...
    const rhs = safe.includes('=') ? safe.split('=').slice(1).join('=').trim() : safe;
    // eslint-disable-next-line no-new-func
    const fn = new Function('x', `return ${rhs}`);
    const val = fn(x);
    return isFinite(val) ? val : null;
  } catch {
    return null;
  }
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const data = [];
  for (const line of lines) {
    const parts = line.split(',').map(s => s.trim());
    if (parts.length >= 2) {
      const x = parseFloat(parts[0]);
      const y = parseFloat(parts[1]);
      if (!isNaN(x) && !isNaN(y)) data.push({ x, y });
    }
  }
  return data;
}

export default function GraphGenerator({ user }) {
  const [mode, setMode] = useState('function');
  const [input, setInput] = useState('');
  const [xMin, setXMin] = useState('-10');
  const [xMax, setXMax] = useState('10');
  const [chartType, setChartType] = useState('line');
  const [graphData, setGraphData] = useState(null);
  const [aiInfo, setAiInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generate = async () => {
    if (!input.trim()) return;
    setError('');
    setLoading(true);
    setGraphData(null);
    setAiInfo(null);

    try {
      // AI analysis
      const info = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyse this graph input and provide information for a student:
Mode: ${mode}
Input: ${input}
X range: ${xMin} to ${xMax}

Return JSON:
{
  "title": "descriptive graph title",
  "description": "what this graph shows",
  "key_features": ["list of key features like roots, intercepts, turning points, intersections"],
  "real_world_context": "brief real-world application",
  "functions": ["list of function expressions to plot, cleaned up, right-hand side only (e.g. x**2 - 3*x + 2)"]
}`,
        response_json_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            key_features: { type: 'array', items: { type: 'string' } },
            real_world_context: { type: 'string' },
            functions: { type: 'array', items: { type: 'string' } },
          },
        },
      });
      setAiInfo(info);

      // Generate plot data
      if (mode === 'data') {
        const pts = parseCSV(input);
        if (pts.length === 0) { setError('Could not parse data. Use format: x,y per line.'); setLoading(false); return; }
        setGraphData([{ name: 'Data', points: pts }]);
      } else {
        const fns = info.functions || [input];
        const min = parseFloat(xMin) || -10;
        const max = parseFloat(xMax) || 10;
        const step = (max - min) / 200;
        const datasets = fns.map((fn, idx) => {
          const points = [];
          for (let x = min; x <= max; x += step) {
            const y = evaluateFunction(fn, x);
            if (y !== null) points.push({ x: parseFloat(x.toFixed(3)), y: parseFloat(y.toFixed(4)) });
          }
          return { name: fns.length > 1 ? `f${idx + 1}(x)` : 'y', points };
        });
        setGraphData(datasets);
      }
    } catch (e) {
      setError('Failed to generate graph. Check your input.');
    }
    setLoading(false);
  };

  // Merge datasets for recharts
  const mergedData = useMemo(() => {
    if (!graphData) return [];
    if (graphData.length === 1) return graphData[0].points.map(p => ({ x: p.x, y: p.y }));
    // multi-line: merge by x
    const allX = [...new Set(graphData.flatMap(d => d.points.map(p => p.x)))].sort((a, b) => a - b);
    return allX.map(x => {
      const obj = { x };
      graphData.forEach((d, i) => {
        const pt = d.points.find(p => p.x === x);
        obj[d.name] = pt ? pt.y : null;
      });
      return obj;
    });
  }, [graphData]);

  return (
    <div className="space-y-6">
      {/* Mode selector */}
      <div className="flex gap-2">
        {MODES.map(m => (
          <button key={m.id} onClick={() => { setMode(m.id); setInput(''); setGraphData(null); setAiInfo(null); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
              mode === m.id
                ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-300'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}>
            <m.icon className="w-4 h-4" />
            {m.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={MODES.find(m => m.id === mode)?.placeholder}
          rows={mode === 'data' ? 5 : 2}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-cyan-500/50 resize-none font-mono"
        />
        {mode !== 'data' && (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-slate-400 text-sm">X range:</span>
            <input value={xMin} onChange={e => setXMin(e.target.value)}
              className="w-20 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm font-mono focus:outline-none focus:border-cyan-500/50" placeholder="-10" />
            <span className="text-slate-500">to</span>
            <input value={xMax} onChange={e => setXMax(e.target.value)}
              className="w-20 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm font-mono focus:outline-none focus:border-cyan-500/50" placeholder="10" />
            <div className="flex gap-1.5 ml-auto">
              {['line', 'scatter', 'bar'].map(ct => (
                <button key={ct} onClick={() => setChartType(ct)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${chartType === ct ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-white/5 text-slate-400 border border-white/10 hover:text-white'}`}>
                  {ct}
                </button>
              ))}
            </div>
          </div>
        )}
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button onClick={generate} disabled={loading || !input.trim()}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
          {loading ? 'Generating...' : 'Generate Graph'}
        </button>
      </div>

      {/* Chart */}
      <AnimatePresence>
        {graphData && mergedData.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {aiInfo && (
              <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl px-4 py-3">
                <div className="font-bold text-white text-base mb-1">{aiInfo.title}</div>
                <p className="text-slate-400 text-sm">{aiInfo.description}</p>
              </div>
            )}

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <ResponsiveContainer width="100%" height={350}>
                {chartType === 'bar' ? (
                  <BarChart data={mergedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="x" stroke="#64748b" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid #4c1d95', borderRadius: 8, color: '#e2e8f0' }} />
                    <Legend />
                    {(graphData.length > 1 ? graphData.map(d => d.name) : ['y']).map((k, i) => (
                      <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </BarChart>
                ) : chartType === 'scatter' ? (
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="x" type="number" stroke="#64748b" tick={{ fontSize: 11 }} name="x" />
                    <YAxis dataKey="y" type="number" stroke="#64748b" tick={{ fontSize: 11 }} name="y" />
                    <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid #4c1d95', borderRadius: 8, color: '#e2e8f0' }} cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter data={mergedData} fill={COLORS[0]} />
                  </ScatterChart>
                ) : (
                  <LineChart data={mergedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="x" stroke="#64748b" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid #4c1d95', borderRadius: 8, color: '#e2e8f0' }} />
                    <Legend />
                    <ReferenceLine y={0} stroke="#ffffff20" />
                    <ReferenceLine x={0} stroke="#ffffff20" />
                    {(graphData.length > 1 ? graphData.map(d => d.name) : ['y']).map((k, i) => (
                      <Line key={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]} dot={false} strokeWidth={2} connectNulls={false} />
                    ))}
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>

            {aiInfo?.key_features?.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4">
                  <div className="text-xs text-violet-400 font-semibold uppercase tracking-wider mb-2">Key Features</div>
                  <ul className="space-y-1">
                    {aiInfo.key_features.map((f, i) => <li key={i} className="text-slate-300 text-sm flex gap-1.5"><span className="text-violet-400">•</span>{f}</li>)}
                  </ul>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                  <div className="text-xs text-amber-400 font-semibold uppercase tracking-wider mb-2">Real-World Context</div>
                  <p className="text-slate-300 text-sm">{aiInfo.real_world_context}</p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}