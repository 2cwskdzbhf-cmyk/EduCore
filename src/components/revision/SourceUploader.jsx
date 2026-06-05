import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Upload, Link2, FileText, Trash2, Eye, X, Loader2, Plus, FilePlus2, Pencil, Check, Search } from 'lucide-react';

const SOURCE_ICONS = {
  pdf: '📄', pptx: '📊', docx: '📝', image: '🖼️', text: '📄',
  url: '🔗', youtube: '🎬', audio: '🎵', gdoc: '📄', gslides: '📊',
};

function formatBytes(b) {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

export default function SourceUploader({ notebook, user, sources, onRefresh }) {
  const fileInputRef = useRef(null);
  const [addMode, setAddMode] = useState(null); // 'file' | 'url' | 'text'
  const [urlInput, setUrlInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [textName, setTextName] = useState('');
  const [viewSource, setViewSource] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [searchSources, setSearchSources] = useState('');
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RevisionSource.delete(id),
    onSuccess: onRefresh,
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }) => base44.entities.RevisionSource.update(id, { name }),
    onSuccess: () => { setRenamingId(null); setRenameValue(''); onRefresh(); },
  });

  const filteredSources = sources.filter(s =>
    !searchSources || s.name.toLowerCase().includes(searchSources.toLowerCase())
  );

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      const ext = file.name.split('.').pop().toLowerCase();
      const typeMap = { pdf: 'pdf', pptx: 'pptx', ppt: 'pptx', docx: 'docx', doc: 'docx', txt: 'text', png: 'image', jpg: 'image', jpeg: 'image', mp3: 'audio', wav: 'audio' };
      const type = typeMap[ext] || 'pdf';
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      // Extract text for text-based files
      let content_text = '';
      if (['pdf', 'docx', 'pptx', 'text'].includes(type)) {
        try {
          const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
            file_url,
            json_schema: { type: 'object', properties: { text: { type: 'string' } } }
          });
          content_text = extracted?.text || '';
        } catch {}
      }
      await base44.entities.RevisionSource.create({
        notebook_id: notebook.id,
        student_email: user.email,
        name: file.name,
        type,
        file_url,
        file_size_bytes: file.size,
        content_text: content_text.slice(0, 50000),
      });
    }
    // Update source count on notebook
    await base44.entities.RevisionNotebook.update(notebook.id, { source_count: sources.length + files.length });
    setUploading(false);
    setAddMode(null);
    onRefresh();
  };

  const addUrl = async () => {
    if (!urlInput.trim()) return;
    const isYoutube = urlInput.includes('youtube.com') || urlInput.includes('youtu.be');
    await base44.entities.RevisionSource.create({
      notebook_id: notebook.id,
      student_email: user.email,
      name: isYoutube ? `YouTube: ${urlInput.slice(0, 50)}` : urlInput.replace(/^https?:\/\//, '').slice(0, 60),
      type: isYoutube ? 'youtube' : 'url',
      url: urlInput,
    });
    await base44.entities.RevisionNotebook.update(notebook.id, { source_count: sources.length + 1 });
    setUrlInput('');
    setAddMode(null);
    onRefresh();
  };

  const addText = async () => {
    if (!textInput.trim()) return;
    await base44.entities.RevisionSource.create({
      notebook_id: notebook.id,
      student_email: user.email,
      name: textName || 'Text note',
      type: 'text',
      content_text: textInput,
    });
    await base44.entities.RevisionNotebook.update(notebook.id, { source_count: sources.length + 1 });
    setTextInput('');
    setTextName('');
    setAddMode(null);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-white font-black text-xl">Sources</h2>
          <p className="text-slate-400 text-sm">{sources.length} source{sources.length !== 1 ? 's' : ''} · The AI will use these to answer your questions</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => { setAddMode('url'); }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white text-sm font-medium transition-all">
            <Link2 className="w-4 h-4" /> URL
          </button>
          <button onClick={() => { setAddMode('text'); }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white text-sm font-medium transition-all">
            <FileText className="w-4 h-4" /> Text
          </button>
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold text-sm hover:brightness-110 transition-all">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload File
          </button>
          <input ref={fileInputRef} type="file" multiple accept=".pdf,.pptx,.ppt,.docx,.doc,.txt,.png,.jpg,.jpeg,.mp3,.wav" onChange={handleFileUpload} className="hidden" />
        </div>
      </div>

      {/* URL / Text form */}
      <AnimatePresence>
        {addMode === 'url' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-white font-semibold text-sm">Add URL or YouTube link</p>
              <button onClick={() => setAddMode(null)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <input value={urlInput} onChange={e => setUrlInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addUrl()}
              placeholder="https://..." className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500/50 placeholder:text-slate-500" />
            <button onClick={addUrl} disabled={!urlInput.trim()} className="px-4 py-2 rounded-xl bg-violet-500 text-white font-bold text-sm disabled:opacity-40">Add Source</button>
          </motion.div>
        )}
        {addMode === 'text' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-white font-semibold text-sm">Add text note</p>
              <button onClick={() => setAddMode(null)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <input value={textName} onChange={e => setTextName(e.target.value)} placeholder="Note title..."
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500/50 placeholder:text-slate-500" />
            <textarea value={textInput} onChange={e => setTextInput(e.target.value)} placeholder="Paste your notes here..." rows={6}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500/50 placeholder:text-slate-500 resize-none" />
            <button onClick={addText} disabled={!textInput.trim()} className="px-4 py-2 rounded-xl bg-violet-500 text-white font-bold text-sm disabled:opacity-40">Add Note</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search sources */}
      {sources.length > 3 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input value={searchSources} onChange={e => setSearchSources(e.target.value)}
            placeholder="Search sources..."
            className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50" />
        </div>
      )}

      {/* Drop zone */}
      {sources.length === 0 && !addMode && (
        <div onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-white/10 hover:border-violet-500/40 rounded-2xl p-16 text-center cursor-pointer transition-all group">
          <FilePlus2 className="w-12 h-12 text-slate-600 group-hover:text-violet-400 mx-auto mb-3 transition-colors" />
          <p className="text-slate-400 font-medium">Drop files here or click to upload</p>
          <p className="text-slate-600 text-sm mt-1">PDF, PowerPoint, Word, Images, Audio</p>
        </div>
      )}

      {/* Source list */}
      {filteredSources.length > 0 && (
        <div className="space-y-2">
          {filteredSources.map((s, i) => (
            <motion.div key={s.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
              className="group flex items-center gap-4 bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] rounded-2xl p-4 transition-all">
              <span className="text-2xl flex-shrink-0">{SOURCE_ICONS[s.type] || '📄'}</span>
              <div className="flex-1 min-w-0">
                {renamingId === s.id ? (
                  <div className="flex items-center gap-2">
                    <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') renameMutation.mutate({ id: s.id, name: renameValue }); if (e.key === 'Escape') setRenamingId(null); }}
                      className="flex-1 px-2 py-1 bg-white/10 border border-violet-500/50 rounded-lg text-white text-sm focus:outline-none" />
                    <button onClick={() => renameMutation.mutate({ id: s.id, name: renameValue })}
                      className="p-1 rounded-lg text-emerald-400 hover:bg-emerald-500/10"><Check className="w-4 h-4" /></button>
                    <button onClick={() => setRenamingId(null)}
                      className="p-1 rounded-lg text-slate-400 hover:bg-white/10"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <p className="text-white font-medium truncate text-sm">{s.name}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                  <span className="capitalize">{s.type}</span>
                  {s.file_size_bytes && <span>{formatBytes(s.file_size_bytes)}</span>}
                  {s.page_count && <span>{s.page_count} pages</span>}
                  {s.created_date && <span>{new Date(s.created_date).toLocaleDateString()}</span>}
                  {s.content_text && <span className="text-emerald-500">✓ Text extracted</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {(s.content_text || s.url || s.file_url) && (
                  <button onClick={() => setViewSource(s)}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                    <Eye className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => { setRenamingId(s.id); setRenameValue(s.name); }}
                  className="p-2 rounded-lg text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 transition-all">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => deleteMutation.mutate(s.id)}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* View source modal */}
      <AnimatePresence>
        {viewSource && (
          <motion.div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewSource(null)}>
            <motion.div className="bg-slate-900 border border-white/15 rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold">{viewSource.name}</h3>
                <button onClick={() => setViewSource(null)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              {viewSource.content_text && (
                <pre className="text-slate-300 text-sm whitespace-pre-wrap font-mono bg-white/5 p-4 rounded-xl overflow-auto max-h-96">{viewSource.content_text.slice(0, 5000)}{viewSource.content_text.length > 5000 ? '\n\n[Content truncated...]' : ''}</pre>
              )}
              {viewSource.url && !viewSource.content_text && (
                <a href={viewSource.url} target="_blank" rel="noreferrer" className="text-violet-400 hover:underline">{viewSource.url}</a>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}