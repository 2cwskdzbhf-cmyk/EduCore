import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, File, FileText, Globe, Youtube, Mic, Trash2, Edit2, Eye, X, Check, Plus, Image, Link } from 'lucide-react';

const SOURCE_TYPES = [
  { id: 'text', icon: FileText, label: 'Text Note', color: 'text-blue-400', accept: null },
  { id: 'pdf', icon: File, label: 'PDF', color: 'text-red-400', accept: '.pdf' },
  { id: 'docx', icon: FileText, label: 'Word Doc', color: 'text-blue-500', accept: '.docx,.doc' },
  { id: 'pptx', icon: File, label: 'PowerPoint', color: 'text-orange-400', accept: '.pptx,.ppt' },
  { id: 'image', icon: Image, label: 'Image', color: 'text-emerald-400', accept: '.jpg,.jpeg,.png,.gif,.webp' },
  { id: 'url', icon: Globe, label: 'Website URL', color: 'text-cyan-400', accept: null },
  { id: 'youtube', icon: Youtube, label: 'YouTube', color: 'text-red-500', accept: null },
  { id: 'audio', icon: Mic, label: 'Audio', color: 'text-purple-400', accept: '.mp3,.m4a,.wav,.ogg' },
];

const TYPE_ICONS = {
  text: FileText, pdf: File, docx: FileText, pptx: File, image: Image, url: Globe, youtube: Youtube, audio: Mic, gdoc: FileText, gslides: File,
};

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AddSourceModal({ notebook, user, onClose, onAdded }) {
  const [step, setStep] = useState('pick'); // pick | form
  const [type, setType] = useState(null);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setLoading(true);
    let fileUrl = null;
    let contentText = text;
    let fileSizeBytes = 0;

    if (file) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      fileUrl = file_url;
      fileSizeBytes = file.size;
    }

    await base44.entities.RevisionSource.create({
      notebook_id: notebook.id,
      student_email: user.email,
      name: name.trim(),
      type,
      content_text: contentText || null,
      file_url: fileUrl,
      url: url || null,
      file_size_bytes: fileSizeBytes || null,
    });

    // Update notebook source count
    await base44.entities.RevisionNotebook.update(notebook.id, {
      source_count: (notebook.source_count || 0) + 1,
    });

    setLoading(false);
    onAdded();
    onClose();
  };

  const showUrlField = type === 'url' || type === 'youtube';
  const showTextArea = type === 'text';
  const showFilePicker = type && !showUrlField && !showTextArea;
  const acceptedExt = SOURCE_TYPES.find(t => t.id === type)?.accept;

  return (
    <motion.div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="w-full max-w-md bg-slate-950/95 border border-white/10 rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto"
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-black text-xl">Add Source</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
          </div>

          {step === 'pick' && (
            <div className="grid grid-cols-2 gap-3">
              {SOURCE_TYPES.map(t => (
                <button key={t.id} onClick={() => { setType(t.id); setStep('form'); }}
                  className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-violet-500/30 transition-all text-left">
                  <t.icon className={`w-5 h-5 ${t.color} flex-shrink-0`} />
                  <span className="text-white text-sm font-semibold">{t.label}</span>
                </button>
              ))}
            </div>
          )}

          {step === 'form' && (
            <div className="space-y-3">
              <button onClick={() => setStep('pick')} className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mb-2">← Back</button>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Source name *"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 text-sm" />

              {showUrlField && (
                <input value={url} onChange={e => setUrl(e.target.value)}
                  placeholder={type === 'youtube' ? 'YouTube URL' : 'Website URL'}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 text-sm" />
              )}

              {showTextArea && (
                <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Paste your notes here..."
                  rows={6} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 text-sm resize-none" />
              )}

              {showFilePicker && (
                <label className="block">
                  <input type="file" accept={acceptedExt} onChange={e => setFile(e.target.files[0])} className="hidden" />
                  <div className={`flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all ${file ? 'border-violet-500/60 bg-violet-500/10' : 'border-white/10 hover:border-violet-500/40 hover:bg-white/5'}`}>
                    {file ? (
                      <>
                        <Check className="w-8 h-8 text-violet-400 mb-2" />
                        <p className="text-white font-semibold text-sm">{file.name}</p>
                        <p className="text-slate-400 text-xs mt-0.5">{formatSize(file.size)}</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-slate-500 mb-2" />
                        <p className="text-slate-300 text-sm font-semibold">Click to upload</p>
                        <p className="text-slate-500 text-xs mt-0.5">{acceptedExt?.replace(/\./g, '').toUpperCase()}</p>
                      </>
                    )}
                  </div>
                </label>
              )}

              <button onClick={handleAdd} disabled={!name.trim() || loading || (showFilePicker && !file) || (showUrlField && !url)}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-black text-sm hover:brightness-110 transition-all disabled:opacity-40 shadow-lg shadow-violet-500/30">
                {loading ? 'Adding...' : 'Add Source'}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function SourcesPanel({ notebook, user }) {
  const [showAdd, setShowAdd] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: sources = [], refetch } = useQuery({
    queryKey: ['revisionSources', notebook.id],
    queryFn: () => base44.entities.RevisionSource.filter({ notebook_id: notebook.id }, '-created_date'),
  });

  const handleDelete = async (id) => {
    await base44.entities.RevisionSource.delete(id);
    await base44.entities.RevisionNotebook.update(notebook.id, { source_count: Math.max(0, (notebook.source_count || 1) - 1) });
    refetch();
  };

  const handleRename = async (id) => {
    if (!renameValue.trim()) return;
    await base44.entities.RevisionSource.update(id, { name: renameValue.trim() });
    setRenamingId(null);
    refetch();
  };

  const filtered = sources.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5">
      <AnimatePresence>
        {showAdd && <AddSourceModal notebook={notebook} user={user} onClose={() => setShowAdd(false)} onAdded={refetch} />}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-black text-xl">Sources</h2>
          <p className="text-slate-400 text-sm">{sources.length} source{sources.length !== 1 ? 's' : ''} added</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold text-sm hover:brightness-110 transition-all shadow-lg shadow-violet-500/30">
          <Plus className="w-4 h-4" /> Add Source
        </button>
      </div>

      {sources.length > 2 && (
        <div className="relative">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sources..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50" />
        </div>
      )}

      {filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="rounded-2xl border-2 border-dashed border-white/10 p-16 text-center">
          <Upload className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-white font-bold mb-1">No sources yet</p>
          <p className="text-slate-400 text-sm mb-5">Upload PDFs, notes, URLs and more to teach your AI assistant</p>
          <button onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold text-sm hover:brightness-110 transition-all">
            <Plus className="w-4 h-4" /> Add Source
          </button>
        </motion.div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.map((src, i) => {
              const IconComp = TYPE_ICONS[src.type] || File;
              return (
                <motion.div key={src.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-4 p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/[0.08] transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                    <IconComp className="w-5 h-5 text-slate-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {renamingId === src.id ? (
                      <div className="flex items-center gap-2">
                        <input value={renameValue} onChange={e => setRenameValue(e.target.value)} autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') handleRename(src.id); if (e.key === 'Escape') setRenamingId(null); }}
                          className="flex-1 bg-white/10 border border-violet-500/50 rounded-lg px-3 py-1 text-white text-sm focus:outline-none" />
                        <button onClick={() => handleRename(src.id)} className="text-emerald-400 hover:text-emerald-300"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setRenamingId(null)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <p className="text-white font-semibold text-sm truncate">{src.name}</p>
                    )}
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                      <span className="capitalize">{src.type}</span>
                      {src.file_size_bytes && <span>{formatSize(src.file_size_bytes)}</span>}
                      {src.page_count && <span>{src.page_count} pages</span>}
                      {src.created_date && <span>{new Date(src.created_date).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    {src.file_url && (
                      <a href={src.file_url} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                        <Eye className="w-4 h-4" />
                      </a>
                    )}
                    <button onClick={() => { setRenamingId(src.id); setRenameValue(src.name); }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(src.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}