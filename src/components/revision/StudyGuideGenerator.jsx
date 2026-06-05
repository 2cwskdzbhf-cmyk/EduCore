import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Loader2, Download, BookOpen, FileText, Lightbulb, AlertTriangle } from 'lucide-react';

const GUIDE_TYPES = [
  { id: 'summary', label: '📋 Topic Summary', icon: '📋', prompt: 'Create a comprehensive topic summary with key concepts clearly explained.' },
  { id: 'keyfacts', label: '⭐ Key Facts', icon: '⭐', prompt: 'List all the key facts, dates, formulas, and definitions I must know for the exam.' },
  { id: 'glossary', label: '📖 Glossary', icon: '📖', prompt: 'Create a full glossary of all important terms and definitions.' },
  { id: 'examtips', label: '🎯 Exam Tips', icon: '🎯', prompt: 'Give me specific exam tips, common mistakes to avoid, and how to structure answers for this topic.' },
  { id: 'mistakes', label: '⚠️ Common Mistakes', icon: '⚠️', prompt: 'List the most common exam mistakes students make on this topic and how to avoid them.' },
  { id: 'mindmap', label: '🗺️ Mind Map Outline', icon: '🗺️', prompt: 'Create a structured mind map outline with the main topic, sub-topics, and key points for each branch.' },
];

export default function StudyGuideGenerator({ notebook, user, sources }) {
  const [loading, setLoading] = useState(null);
  const [output, setOutput] = useState(null);
  const [activeType, setActiveType] = useState(null);

  const contextText = sources.filter(s => s.content_text).map(s => `${s.name}:\n${s.content_text.slice(0, 6000)}`).join('\n\n---\n\n');

  const generate = async (type) => {
    if (!contextText) { alert('Upload sources with text content first!'); return; }
    setLoading(type.id);
    setActiveType(type);
    setOutput(null);

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: type.prompt + ' Format with clear headings using ## and bullet points. Be concise but thorough.',
        system_prompt: `You are creating a study guide for a GCSE/A-Level student studying ${notebook.subject || 'the subject'} (${notebook.exam_board || 'general'}). Use the following revision notes:\n\n${contextText}`,
      });
      setOutput(result);
    } catch {}
    setLoading(null);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(output || '');
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-white font-black text-xl">Study Guide Generator</h2>
        <p className="text-slate-400 text-sm">AI-powered study materials generated from your notes</p>
      </div>

      {!contextText && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-300 text-sm">
          ⚠️ Upload sources with text content in the Sources tab to generate study guides.
        </div>
      )}

      {/* Guide type buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {GUIDE_TYPES.map(type => (
          <motion.button key={type.id} onClick={() => generate(type)} disabled={!!loading || !contextText}
            whileHover={!loading ? { scale: 1.02 } : {}} whileTap={!loading ? { scale: 0.98 } : {}}
            className={`p-4 rounded-2xl border-2 text-left font-medium text-sm transition-all ${
              activeType?.id === type.id && output
                ? 'border-violet-500 bg-violet-500/20 text-violet-200'
                : 'border-white/10 bg-white/5 text-white hover:border-violet-500/40 hover:bg-white/10'
            } disabled:opacity-40 disabled:cursor-not-allowed`}>
            <span className="text-2xl block mb-2">{type.icon}</span>
            {type.label}
            {loading === type.id && <Loader2 className="w-3.5 h-3.5 animate-spin inline ml-2" />}
          </motion.button>
        ))}
      </div>

      {/* Output */}
      {output && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
            <p className="text-white font-bold text-sm">{activeType?.icon} {activeType?.label}</p>
            <div className="flex gap-2">
              <button onClick={copyToClipboard} className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
                Copy
              </button>
            </div>
          </div>
          <div className="p-6 prose prose-invert prose-sm max-w-none">
            {output.split('\n').map((line, i) => {
              if (line.startsWith('## ')) return <h2 key={i} className="text-white font-black text-lg mt-5 mb-2">{line.replace('## ', '')}</h2>;
              if (line.startsWith('### ')) return <h3 key={i} className="text-violet-300 font-bold text-base mt-4 mb-1">{line.replace('### ', '')}</h3>;
              if (line.startsWith('- ') || line.startsWith('• ')) return <p key={i} className="text-slate-300 text-sm flex gap-2 my-0.5"><span className="text-violet-400 flex-shrink-0">•</span><span>{line.replace(/^[-•] /, '')}</span></p>;
              if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="text-white font-bold text-sm my-1">{line.slice(2, -2)}</p>;
              if (!line.trim()) return <div key={i} className="h-2" />;
              return <p key={i} className="text-slate-300 text-sm my-1">{line}</p>;
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}