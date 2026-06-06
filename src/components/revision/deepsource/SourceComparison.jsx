import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { GitCompare, Loader2, CheckCircle2, AlertTriangle, XCircle, Eye } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function SourceComparison({ notebooks, sources }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedNotebook, setSelectedNotebook] = useState('');

  const notebookSources = sources.filter(s =>
    selectedNotebook ? s.notebook_id === selectedNotebook : true
  ).filter(s => s.content_text);

  const toggleSource = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
    setResult(null);
  };

  const compare = async () => {
    if (selectedIds.length < 2) return;
    setLoading(true);
    setResult(null);
    const selected = notebookSources.filter(s => selectedIds.includes(s.id));
    const sourceParts = selected.map((s, i) =>
      `SOURCE ${i + 1} — "${s.name}":\n${s.content_text.slice(0, 3000)}`
    ).join('\n\n---\n\n');

    try {
      const res = await base44.functions.invoke('callOpenAI', {
        prompt: `You are an academic analyst. Compare the following ${selected.length} sources and produce a structured analysis.

${sourceParts}

Return ONLY valid JSON with this shape:
{
  "similarities": ["point 1", "point 2"],
  "differences": ["point 1", "point 2"],
  "conflicts": ["point 1", "point 2"],
  "missing_perspectives": ["point 1", "point 2"],
  "summary": "2-3 sentence overall summary"
}`,
        response_json_schema: {
          type: 'object',
          properties: {
            similarities: { type: 'array', items: { type: 'string' } },
            differences: { type: 'array', items: { type: 'string' } },
            conflicts: { type: 'array', items: { type: 'string' } },
            missing_perspectives: { type: 'array', items: { type: 'string' } },
            summary: { type: 'string' },
          },
        },
      });
      setResult(typeof res.data === 'string' ? JSON.parse(res.data) : res.data);
    } finally {
      setLoading(false);
    }
  };

  const SECTIONS = [
    { key: 'similarities', label: 'Similarities', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    { key: 'differences', label: 'Differences', icon: GitCompare, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    { key: 'conflicts', label: 'Conflicts', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
    { key: 'missing_perspectives', label: 'Missing Perspectives', icon: Eye, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  ];

  return (
    <div className="space-y-5">
      {/* Notebook filter */}
      <div className="flex items-center gap-3">
        <select
          value={selectedNotebook}
          onChange={e => { setSelectedNotebook(e.target.value); setSelectedIds([]); setResult(null); }}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50"
        >
          <option value="">All notebooks</option>
          {notebooks.map(nb => (
            <option key={nb.id} value={nb.id}>{nb.icon || '📚'} {nb.name}</option>
          ))}
        </select>
        <span className="text-xs text-slate-500">Select 2+ sources to compare</span>
      </div>

      {/* Source picker */}
      {notebookSources.length === 0 ? (
        <p className="text-slate-500 text-sm">No sources with content found. Upload sources to your notebooks first.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {notebookSources.map(s => {
            const selected = selectedIds.includes(s.id);
            return (
              <button key={s.id} onClick={() => toggleSource(s.id)}
                className={`text-left px-4 py-3 rounded-xl border transition-all text-sm ${
                  selected
                    ? 'bg-violet-500/20 border-violet-500/40 text-white'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-white'
                }`}>
                <div className="font-medium truncate">{s.name}</div>
                <div className="text-xs mt-0.5 opacity-60">{s.type} · {Math.round((s.content_text?.length || 0) / 100) / 10}k chars</div>
              </button>
            );
          })}
        </div>
      )}

      {selectedIds.length >= 2 && (
        <button onClick={compare} disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-all disabled:opacity-50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitCompare className="w-4 h-4" />}
          {loading ? 'Comparing…' : `Compare ${selectedIds.length} Sources`}
        </button>
      )}

      {result && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {result.summary && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-slate-300 text-sm italic">
              {result.summary}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SECTIONS.map(sec => (
              <div key={sec.key} className={`rounded-2xl border p-4 ${sec.bg}`}>
                <div className={`flex items-center gap-2 mb-3 font-bold text-sm ${sec.color}`}>
                  <sec.icon className="w-4 h-4" />
                  {sec.label}
                </div>
                {(result[sec.key] || []).length === 0 ? (
                  <p className="text-slate-600 text-xs">None identified.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {result[sec.key].map((item, i) => (
                      <li key={i} className="text-slate-300 text-xs flex gap-2">
                        <span className="mt-0.5 opacity-40">•</span>{item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}