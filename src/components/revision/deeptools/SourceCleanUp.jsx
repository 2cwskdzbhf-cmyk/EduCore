import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Sparkles, Loader2, Copy, Check, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

export default function SourceCleanUp({ notebooks, sources }) {
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedNotebook, setSelectedNotebook] = useState('');
  const [customText, setCustomText] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const filteredSources = selectedNotebook
    ? sources.filter(s => s.notebook_id === selectedNotebook)
    : sources;

  const getInputText = () => {
    if (useCustom) return customText;
    const src = sources.find(s => s.id === selectedSource);
    return src?.content_text || '';
  };

  const runCleanUp = async () => {
    const text = getInputText();
    if (!text.trim()) return;
    setLoading(true);
    setResult('');

    const prompt = `You are an expert academic editor. Rewrite the following messy or unstructured notes into a clean, well-structured document using:
- Clear headings (##) and subheadings (###)
- Concise bullet points under each section
- Bold key terms followed by their definitions
- Labelled examples (Example:) where relevant
- Short, clear sentences

Preserve ALL content — do not remove information. Only reformat and clarify.
Return ONLY the formatted markdown, no preamble.

NOTES TO CLEAN:
${text.slice(0, 6000)}`;

    try {
      const res = await base44.integrations.Core.InvokeLLM({ prompt });
      setResult(typeof res === 'string' ? res : res?.result || JSON.stringify(res));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Source mode toggle */}
      <div className="flex gap-2">
        <button onClick={() => setUseCustom(false)}
          className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${!useCustom ? 'bg-violet-500/20 border-violet-500/40 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}>
          From Source
        </button>
        <button onClick={() => setUseCustom(true)}
          className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${useCustom ? 'bg-violet-500/20 border-violet-500/40 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}>
          Paste Notes
        </button>
      </div>

      {!useCustom ? (
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1.5 block">Notebook</label>
            <select
              value={selectedNotebook}
              onChange={e => { setSelectedNotebook(e.target.value); setSelectedSource(''); }}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50 w-full"
            >
              <option value="">All notebooks</option>
              {notebooks.map(nb => <option key={nb.id} value={nb.id}>{nb.icon} {nb.name}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1.5 block">Source to clean</label>
            <select
              value={selectedSource}
              onChange={e => setSelectedSource(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50 w-full"
            >
              <option value="">Select a source…</option>
              {filteredSources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
      ) : (
        <div>
          <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1.5 block">Paste your messy notes</label>
          <textarea
            value={customText}
            onChange={e => setCustomText(e.target.value)}
            rows={8}
            placeholder="Paste your unstructured notes here…"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50 resize-none"
          />
        </div>
      )}

      <button
        onClick={runCleanUp}
        disabled={(!useCustom && !selectedSource) || (useCustom && !customText.trim()) || loading}
        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-all"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {loading ? 'Cleaning notes…' : 'Clean Up Notes'}
      </button>

      {/* Result */}
      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2 text-violet-400">
              <FileText className="w-4 h-4" />
              <span className="text-sm font-bold">Cleaned Notes</span>
            </div>
            <button onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-slate-300 transition-all">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="p-5 prose prose-invert prose-sm max-w-none
            prose-headings:text-white prose-p:text-slate-300 prose-li:text-slate-300
            prose-strong:text-violet-300 prose-code:text-emerald-300 max-h-[500px] overflow-y-auto">
            <ReactMarkdown>{result}</ReactMarkdown>
          </div>
        </motion.div>
      )}
    </div>
  );
}