import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Sparkles, Loader2, Copy, Check, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function SourceCleanUp({ notebooks, sources }) {
  const [selectedNotebook, setSelectedNotebook] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const notebookSources = sources.filter(s =>
    (selectedNotebook ? s.notebook_id === selectedNotebook : true) && s.content_text
  );

  const selectedSource = notebookSources.find(s => s.id === selectedId);

  const cleanUp = async () => {
    if (!selectedSource) return;
    setLoading(true);
    setResult('');
    try {
      const res = await base44.functions.invoke('callOpenAI', {
        prompt: `You are an expert academic editor. Rewrite the following messy notes into a clean, well-structured document.

Use this exact structure:
- # Main Heading
- ## Subheadings for each major section
- Bullet points for key facts and points
- **Definition:** [term] — [clear definition] for any definitions
- **Example:** [description] for any examples
- Keep all the original information but reorganise and clarify it.
- Remove repetition, fix grammar, and add structure where missing.

NOTES TO CLEAN UP:
${selectedSource.content_text.slice(0, 6000)}

Return ONLY the cleaned markdown. No preamble.`,
      });
      setResult(typeof res.data === 'string' ? res.data : res.data?.content || res.data?.result || JSON.stringify(res.data));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([result], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedSource?.name || 'cleaned-notes'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        <select
          value={selectedNotebook}
          onChange={e => { setSelectedNotebook(e.target.value); setSelectedId(''); setResult(''); }}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50"
        >
          <option value="">All notebooks</option>
          {notebooks.map(nb => (
            <option key={nb.id} value={nb.id}>{nb.icon || '📚'} {nb.name}</option>
          ))}
        </select>

        <select
          value={selectedId}
          onChange={e => { setSelectedId(e.target.value); setResult(''); }}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50 flex-1 min-w-48"
        >
          <option value="">Select a source to clean up…</option>
          {notebookSources.map(s => (
            <option key={s.id} value={s.id}>{s.name} ({s.type})</option>
          ))}
        </select>
      </div>

      {notebookSources.length === 0 && (
        <p className="text-slate-500 text-sm">No sources with content found. Upload sources to your notebooks first.</p>
      )}

      {selectedSource && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-slate-400">
          <span className="font-semibold text-slate-300">{selectedSource.name}</span> · {selectedSource.type} · ~{Math.round(selectedSource.content_text.length / 5)} words
        </div>
      )}

      {selectedId && (
        <button onClick={cleanUp} disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-all disabled:opacity-50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? 'Cleaning up…' : 'Clean Up Notes'}
        </button>
      )}

      {result && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Cleaned Notes</span>
            <div className="flex gap-2">
              <button onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-xs text-slate-300 transition-all">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-xs text-slate-300 transition-all">
                <Download className="w-3.5 h-3.5" />
                Download .md
              </button>
            </div>
          </div>

          {/* Rendered output */}
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 prose prose-invert prose-sm max-w-none
            prose-headings:text-white prose-h1:text-xl prose-h2:text-base prose-h2:text-violet-300
            prose-strong:text-amber-300 prose-li:text-slate-300 prose-p:text-slate-300
            overflow-y-auto max-h-[500px]">
            <ReactMarkdown>{result}</ReactMarkdown>
          </div>
        </motion.div>
      )}
    </div>
  );
}