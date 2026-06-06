import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, Loader2, BookOpen, FileQuestion, FlaskConical, GraduationCap, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

const GAP_TYPES = [
  { key: 'missing_definitions', label: 'Missing Definitions', icon: BookOpen, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  { key: 'missing_examples', label: 'Missing Examples', icon: FlaskConical, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  { key: 'missing_case_studies', label: 'Missing Case Studies', icon: FileQuestion, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  { key: 'missing_exam_topics', label: 'Missing Exam Topics', icon: GraduationCap, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
];

export default function SourceGapFinder({ notebooks, sources }) {
  const [selectedNotebook, setSelectedNotebook] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);

  const filteredSources = selectedNotebook
    ? sources.filter(s => s.notebook_id === selectedNotebook)
    : sources;

  const runGapFinder = async () => {
    if (filteredSources.length === 0) return;
    setLoading(true);
    setResult(null);

    const combined = filteredSources
      .map(s => `Source: "${s.name}"\n${(s.content_text || '').slice(0, 2000)}`)
      .join('\n\n---\n\n');

    setScannedCount(filteredSources.length);

    const prompt = `You are an expert academic reviewer. Analyse the following study sources and identify gaps.

Return a JSON object with these exact keys:
- missing_definitions: array of terms/concepts that are mentioned but not defined, or should be defined but aren't
- missing_examples: array of topics that lack concrete examples or worked examples
- missing_case_studies: array of topics that would benefit from real-world case studies not present
- missing_exam_topics: array of likely exam-required topics that appear absent or under-covered

Each array should have 3-7 specific, actionable items. Return ONLY valid JSON.

SOURCES:
${combined}`;

    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            missing_definitions: { type: 'array', items: { type: 'string' } },
            missing_examples: { type: 'array', items: { type: 'string' } },
            missing_case_studies: { type: 'array', items: { type: 'string' } },
            missing_exam_topics: { type: 'array', items: { type: 'string' } },
          }
        }
      });
      setResult(res);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const totalGaps = result
    ? Object.values(result).reduce((sum, arr) => sum + (arr?.length || 0), 0)
    : 0;

  return (
    <div className="space-y-5">
      {/* Notebook selector */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1.5 block">Notebook to scan</label>
          <select
            value={selectedNotebook}
            onChange={e => { setSelectedNotebook(e.target.value); setResult(null); }}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50 w-full"
          >
            <option value="">All notebooks ({sources.length} sources)</option>
            {notebooks.map(nb => {
              const count = sources.filter(s => s.notebook_id === nb.id).length;
              return <option key={nb.id} value={nb.id}>{nb.icon} {nb.name} ({count} sources)</option>;
            })}
          </select>
        </div>
        <button
          onClick={runGapFinder}
          disabled={filteredSources.length === 0 || loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-all"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {loading ? `Scanning ${scannedCount} sources…` : 'Find Gaps'}
        </button>
      </div>

      {filteredSources.length === 0 && (
        <p className="text-slate-500 text-sm">No sources in the selected notebook. Add sources first.</p>
      )}

      {/* Summary */}
      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
            <RefreshCw className="w-5 h-5 text-violet-400" />
            <div>
              <p className="text-white font-bold text-sm">Gap Analysis Complete</p>
              <p className="text-slate-400 text-xs">{scannedCount} sources scanned · {totalGaps} gaps identified</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {GAP_TYPES.map(({ key, label, icon: Icon, color, bg }) => (
              <div key={key} className={`rounded-2xl border p-4 ${bg}`}>
                <div className={`flex items-center gap-2 mb-3 ${color}`}>
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-bold">{label}</span>
                  <span className="ml-auto text-xs opacity-60">{(result[key] || []).length} found</span>
                </div>
                <ul className="space-y-1.5">
                  {(result[key] || []).map((item, i) => (
                    <li key={i} className="text-xs text-slate-300 flex gap-2">
                      <span className="text-slate-600 flex-shrink-0 mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                  {(!result[key] || result[key].length === 0) && (
                    <li className="text-xs text-slate-600 italic">No gaps identified here ✓</li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}