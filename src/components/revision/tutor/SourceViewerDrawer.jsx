import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Search, ChevronUp, ChevronDown } from 'lucide-react';

const TYPE_LABELS = {
  pdf: 'PDF', pptx: 'PowerPoint', docx: 'Word Document', image: 'Image',
  text: 'Text', url: 'Web Page', youtube: 'YouTube', audio: 'Audio',
  gdoc: 'Google Doc', gslides: 'Google Slides',
};

export default function SourceViewerDrawer({ source, onClose }) {
  const [search, setSearch] = useState('');
  const [matchIndex, setMatchIndex] = useState(0);
  const contentRef = useRef(null);

  const text = source?.content_text || '';
  const matches = search.trim()
    ? [...text.matchAll(new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'))]
    : [];

  const highlighted = search.trim()
    ? text.replace(
        new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
        '<mark class="bg-yellow-400/30 text-yellow-200 rounded px-0.5">$1</mark>'
      )
    : text;

  const scrollToMatch = (idx) => {
    const marks = contentRef.current?.querySelectorAll('mark');
    if (marks?.[idx]) marks[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  useEffect(() => {
    if (matches.length > 0) scrollToMatch(matchIndex);
  }, [matchIndex, search]);

  return (
    <motion.div
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-[#0f0f1a] border-l border-white/[0.08] z-[300] flex flex-col shadow-2xl"
    >
      {/* Header */}
      <div className="flex-shrink-0 flex items-start justify-between gap-3 p-4 border-b border-white/[0.07]">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">{TYPE_LABELS[source.type] || 'Source'}</p>
          <h3 className="text-white font-bold text-sm mt-0.5 truncate">{source.name}</h3>
          <p className="text-slate-600 text-[10px] mt-0.5">{Math.round(text.length / 1000)}k characters</p>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/10 transition-all flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search bar */}
      <div className="flex-shrink-0 p-3 border-b border-white/[0.07]">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setMatchIndex(0); }}
              placeholder="Search in source..."
              className="w-full pl-8 pr-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500/40 transition-all"
            />
          </div>
          {matches.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <span>{matchIndex + 1}/{matches.length}</span>
              <button onClick={() => setMatchIndex(i => Math.max(0, i - 1))} className="p-1 rounded-lg hover:bg-white/10 transition-all">
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setMatchIndex(i => Math.min(matches.length - 1, i + 1))} className="p-1 rounded-lg hover:bg-white/10 transition-all">
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div ref={contentRef} className="flex-1 overflow-y-auto p-4">
        {text ? (
          <div
            className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap font-mono"
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-500 text-sm">No text content available</p>
            <p className="text-slate-700 text-xs mt-1">This source may be an image or unsupported format.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}