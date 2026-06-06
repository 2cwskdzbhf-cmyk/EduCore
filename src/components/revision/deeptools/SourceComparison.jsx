import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { GitCompare, Loader2, CheckCircle2, AlertTriangle, XCircle, Eye } from 'lucide-react';
import { motion } from 'framer-motion';

const CATEGORY_CONFIG = {
  similarities: { label: 'Similarities', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  differences: { label: 'Differences', icon: GitCompare, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  conflicts: { label: 'Conflicts', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  missing_perspectives: { label: 'Missing Perspectives', icon: Eye, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
};

export default function SourceComparison({ notebooks, sources }) {
  const [selectedSources, setSelectedSources] = useState([]);
  const [selectedNotebook, setSelectedNotebook] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const filteredSources = selectedNotebook
    ? sources.filter(s => s.notebook_id === selectedNotebook)
    : sources;

  const toggleSource = (id) => {
    setSelectedSources(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const runComparison = async () => {
    const chosen = sources.filter(s => selectedSources.includes(s.id));
    if (chosen.length < 2) return;
    setLoading(true);
    setResult(null);
    try {
      const sourceTexts = chosen.map((s, i) =>
        `SOURCE ${i + 1} — "${s.name}":\n${(s.content_text || '').slice(0, 3000)}`
      ).join('\n\n---\n\n');

      const prompt = `You are an expert academic analyst. Compare the following ${chosen.length} sources and return a JSON object with exactly these keys:
- similarities: array of strings (shared concepts, agreements)
- differences: array of strings (different approaches, perspectives, data)
- conflicts: array of strings (contradictions, opposing claims)
- missing_perspectives: array of strings (important angles not covered by any source)

Each array should have 3-6 concise, specific bullet points. Return ONLY valid JSON.

${sourceTexts}`;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            similarities: { type: 'array', items: { type: 'string' } },
            differences: { type: 'array', items: { type: 'string' } },
            conflicts: { type: 'array', items: { type: 'string' } },
            missing_perspectives: { type: 'array', items: { type: 'string' } },
          }
        }
      });
      setResult(res);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-5">
      {/* Notebook filter */}
      <div>
        <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1.5 block">Filter by Notebook</label>
        <select
          value={selectedNotebook}
          onChange={e => { setSelectedNotebook(e.target.value); setSelectedSources([]); }}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50 w-full max-w-xs"
        >
          <option value="">All notebooks</option>
          {notebooks.map(nb => <option key={nb.id} value={nb.id}>{nb.icon} {nb.name}</option>)}
        </select>
      </div>

      {/* Source picker */}
      <div>
        <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2 block">
          Select 2+ sources to compare ({selectedSources.length} selected)
        </label>
        {filteredSources.length === 0 ? (
          <p className="text-slate-500 text-sm">No sources found. Upload sources to a notebook first.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
            {filteredSources.map(s => (
              <button key={s.id} onClick={() => toggleSource(s.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                  selectedSources.includes(s.id)
                    ? 'bg-violet-500/20 border-violet-500/40 text-white'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-white'
                }`}>
                <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                  selectedSources.includes(s.id) ? 'bg-violet-500 border-violet-500' : 'border-slate-600'
                }`}>
                  {selectedSources.includes(s.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">{s.name}</p>
                  <p className="text-xs text-slate-600 capitalize">{s.type}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Run button */}
      <button
        onClick={runComparison}
        disabled={selectedSources.length < 2 || loading}
        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-blue-600 rounded-xl text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-all"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitCompare className="w-4 h-4" />}
        {loading ? 'Comparing…' : 'Compare Sources'}
      </button>

      {/* Results */}
      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
            <div key={key} className={`rounded-2xl border p-4 ${cfg.bg}`}>
              <div className={`flex items-center gap-2 mb-3 ${cfg.color}`}>
                <cfg.icon className="w-4 h-4" />
                <span className="text-sm font-bold">{cfg.label}</span>
                <span className="ml-auto text-xs opacity-60">{(result[key] || []).length}</span>
              </div>
              <ul className="space-y-1.5">
                {(result[key] || []).map((item, i) => (
                  <li key={i} className="text-xs text-slate-300 flex gap-2">
                    <span className="text-slate-600 flex-shrink-0">•</span>
                    {item}
                  </li>
                ))}
                {(!result[key] || result[key].length === 0) && (
                  <li className="text-xs text-slate-600 italic">None identified</li>
                )}
              </ul>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}