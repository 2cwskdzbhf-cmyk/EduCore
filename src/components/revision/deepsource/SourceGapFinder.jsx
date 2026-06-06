import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { ScanSearch, Loader2, BookOpen, FlaskConical, FileText, GraduationCap, AlertCircle } from 'lucide-react';

const GAP_TYPES = [
  { key: 'missing_definitions', label: 'Missing Definitions', icon: BookOpen, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  { key: 'missing_examples', label: 'Missing Examples', icon: FlaskConical, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  { key: 'missing_case_studies', label: 'Missing Case Studies', icon: FileText, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  { key: 'missing_exam_topics', label: 'Missing Exam Topics', icon: GraduationCap, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
];

export default function SourceGapFinder({ notebooks, sources }) {
  const [selectedNotebook, setSelectedNotebook] = useState('');
  const [subject, setSubject] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const notebookSources = sources.filter(s =>
    (selectedNotebook ? s.notebook_id === selectedNotebook : true) && s.content_text
  );

  const scan = async () => {
    if (notebookSources.length === 0) return;
    setLoading(true);
    setResult(null);

    const combined = notebookSources.map(s =>
      `SOURCE: "${s.name}"\n${s.content_text.slice(0, 2000)}`
    ).join('\n\n---\n\n');

    const subjectHint = subject ? `The subject is: ${subject}.` : '';

    try {
      const res = await base44.functions.invoke('callOpenAI', {
        prompt: `You are an expert academic content auditor. ${subjectHint}
Analyse the following study sources and identify what is MISSING or INSUFFICIENT.

${combined}

Return ONLY valid JSON with this shape:
{
  "missing_definitions": ["term or concept that needs defining", ...],
  "missing_examples": ["topic that lacks worked examples", ...],
  "missing_case_studies": ["topic that needs real-world case studies", ...],
  "missing_exam_topics": ["exam-required topic not covered", ...],
  "overall_coverage": "short paragraph rating how complete these sources are"
}`,
        response_json_schema: {
          type: 'object',
          properties: {
            missing_definitions: { type: 'array', items: { type: 'string' } },
            missing_examples: { type: 'array', items: { type: 'string' } },
            missing_case_studies: { type: 'array', items: { type: 'string' } },
            missing_exam_topics: { type: 'array', items: { type: 'string' } },
            overall_coverage: { type: 'string' },
          },
        },
      });
      setResult(typeof res.data === 'string' ? JSON.parse(res.data) : res.data);
    } finally {
      setLoading(false);
    }
  };

  const totalGaps = result
    ? GAP_TYPES.reduce((acc, g) => acc + (result[g.key]?.length || 0), 0)
    : 0;

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={selectedNotebook}
          onChange={e => { setSelectedNotebook(e.target.value); setResult(null); }}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50"
        >
          <option value="">All notebooks</option>
          {notebooks.map(nb => (
            <option key={nb.id} value={nb.id}>{nb.icon || '📚'} {nb.name}</option>
          ))}
        </select>
        <input
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder="Subject hint, e.g. A-Level Biology"
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 w-64"
        />
      </div>

      {notebookSources.length === 0 ? (
        <p className="text-slate-500 text-sm">No sources with content found in the selected notebook.</p>
      ) : (
        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-500">{notebookSources.length} source{notebookSources.length !== 1 ? 's' : ''} will be scanned</div>
          <button onClick={scan} disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-all disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanSearch className="w-4 h-4" />}
            {loading ? 'Scanning…' : 'Find Gaps'}
          </button>
        </div>
      )}

      {result && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Summary bar */}
          <div className={`flex items-center gap-3 rounded-2xl border p-4 ${
            totalGaps === 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'
          }`}>
            <AlertCircle className={`w-5 h-5 flex-shrink-0 ${totalGaps === 0 ? 'text-emerald-400' : 'text-amber-400'}`} />
            <div>
              <p className={`text-sm font-bold ${totalGaps === 0 ? 'text-emerald-300' : 'text-amber-300'}`}>
                {totalGaps === 0 ? 'Great coverage! No major gaps found.' : `${totalGaps} gap${totalGaps !== 1 ? 's' : ''} identified across your sources`}
              </p>
              {result.overall_coverage && (
                <p className="text-xs text-slate-400 mt-1">{result.overall_coverage}</p>
              )}
            </div>
          </div>

          {/* Gap cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {GAP_TYPES.map(g => (
              <div key={g.key} className={`rounded-2xl border p-4 ${g.bg}`}>
                <div className={`flex items-center gap-2 mb-3 font-bold text-sm ${g.color}`}>
                  <g.icon className="w-4 h-4" />
                  {g.label}
                  <span className="ml-auto text-xs opacity-60">{result[g.key]?.length || 0} found</span>
                </div>
                {(result[g.key] || []).length === 0 ? (
                  <p className="text-slate-600 text-xs">None identified ✓</p>
                ) : (
                  <ul className="space-y-1.5">
                    {result[g.key].map((item, i) => (
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