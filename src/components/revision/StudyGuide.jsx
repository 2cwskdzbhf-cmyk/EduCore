import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { FileText, Sparkles, Download, Loader2, ChevronDown, ChevronRight } from 'lucide-react';

const GUIDE_TYPES = [
  { id: 'summary', label: '📋 Topic Summary', prompt: 'Create a comprehensive topic summary covering all key concepts from the materials.' },
  { id: 'keyfacts', label: '📌 Key Facts', prompt: 'List all key facts, important dates, and crucial figures from the study materials in a structured format.' },
  { id: 'definitions', label: '📖 Definitions & Glossary', prompt: 'Create a comprehensive glossary of all key terms and definitions from the materials.' },
  { id: 'examtips', label: '🎯 Exam Tips', prompt: 'Provide specific exam tips, common mistakes to avoid, and mark-scheme advice based on the content.' },
  { id: 'revision_notes', label: '✏️ Condensed Notes', prompt: 'Create condensed revision notes covering all the most important points in bullet point format.' },
  { id: 'formulas', label: '🔢 Formulas & Methods', prompt: 'Extract and list all formulas, equations, and step-by-step methods from the materials.' },
  { id: 'timeline', label: '📅 Timeline / Dates', prompt: 'Create a chronological timeline of all important dates and events from the materials.' },
  { id: 'common_mistakes', label: '⚠️ Common Mistakes', prompt: 'List common mistakes students make and how to avoid them, based on the content.' },
];

function Section({ title, content }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-all">
        <h3 className="text-white font-bold text-sm">{title}</h3>
        {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-5 pb-5 border-t border-white/10 pt-4">
              <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{content}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function StudyGuide({ notebook, user }) {
  const [selectedType, setSelectedType] = useState(null);
  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(false);

  const { data: sources = [] } = useQuery({
    queryKey: ['revisionSources', notebook.id],
    queryFn: () => base44.entities.RevisionSource.filter({ notebook_id: notebook.id }),
  });

  const generate = async (type) => {
    setSelectedType(type);
    setLoading(true);
    setGuide(null);

    const context = sources.map(s => s.content_text || s.name).filter(Boolean).join('\n\n');
    const guideType = GUIDE_TYPES.find(g => g.id === type);

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `${guideType.prompt}

Study Materials for ${notebook.name} (${notebook.subject || 'General'} ${notebook.exam_board ? `- ${notebook.exam_board}` : ''}):

${context || 'No specific materials uploaded. Create general GCSE/A-Level content for ' + (notebook.subject || notebook.name) + '.'}

Format the response clearly with headers, bullet points, and sections where appropriate. Make it suitable for revision.`,
    });

    setGuide({ type, content: res.result || res, generatedAt: new Date() });
    setLoading(false);
  };

  const exportText = () => {
    if (!guide) return;
    const blob = new Blob([guide.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${notebook.name} - Study Guide.txt`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-black text-white mb-1">Study Guide Generator</h2>
        <p className="text-slate-400 text-sm">AI-generated study materials from your notebook sources</p>
      </div>

      {/* Guide type picker */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {GUIDE_TYPES.map(gt => (
          <button key={gt.id} onClick={() => generate(gt.id)}
            disabled={loading}
            className={`p-4 rounded-2xl border text-left transition-all hover:border-violet-500/40 hover:bg-violet-500/5 ${
              selectedType === gt.id && guide
                ? 'border-violet-500/60 bg-violet-500/10'
                : 'border-white/10 bg-white/5'
            } disabled:opacity-50`}>
            <p className="text-sm text-white font-semibold leading-snug">{gt.label}</p>
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-400 mx-auto mb-3" />
          <p className="text-white font-semibold">Generating your study guide...</p>
          <p className="text-slate-400 text-sm mt-1">This may take a moment</p>
        </motion.div>
      )}

      {/* Generated guide */}
      {guide && !loading && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-white font-bold">
              {GUIDE_TYPES.find(g => g.id === guide.type)?.label}
            </p>
            <button onClick={exportText}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-semibold hover:bg-white/15 transition-all">
              <Download className="w-4 h-4" /> Export
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap prose prose-invert max-w-none">
              {guide.content}
            </div>
          </div>

          <p className="text-slate-600 text-xs">Generated {guide.generatedAt.toLocaleTimeString()}</p>
        </motion.div>
      )}

      {!guide && !loading && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-white font-bold mb-1">Select a guide type above</p>
          <p className="text-slate-400 text-sm">AI will generate comprehensive study materials from your sources</p>
        </div>
      )}
    </div>
  );
}