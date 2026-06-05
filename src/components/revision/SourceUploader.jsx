import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import {
  Upload, Link2, FileText, Trash2, Eye, X, Loader2, FilePlus2,
  Pencil, Check, Search, Globe, HardDrive, Sparkles
} from 'lucide-react';

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

// Load the Google API + Picker script
function loadGooglePicker(apiKey, clientId, accessToken, onFilePicked) {
  const load = () => {
    window.gapi.load('picker', () => {
      const picker = new window.google.picker.PickerBuilder()
        .addView(window.google.picker.ViewId.DOCS)
        .setOAuthToken(accessToken)
        .setCallback((data) => {
          if (data.action === window.google.picker.Action.PICKED) {
            onFilePicked(data.docs[0]);
          }
        })
        .build();
      picker.setVisible(true);
    });
  };
  if (!window.gapi) {
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = load;
    document.body.appendChild(script);
  } else {
    load();
  }
}

export default function SourceUploader({ notebook, user, sources, onRefresh }) {
  const fileInputRef = useRef(null);
  const [addMode, setAddMode] = useState(null); // 'file' | 'url' | 'text' | 'ai' | 'gdrive'
  const [urlInput, setUrlInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [textName, setTextName] = useState('');
  const [aiTopic, setAiTopic] = useState('');
  const [viewSource, setViewSource] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [searchSources, setSearchSources] = useState('');
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [gdrivePicking, setGdrivePicking] = useState(false);
  const [driveAccessToken, setDriveAccessToken] = useState(null);

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

  // ── File upload ──────────────────────────────────────────────────────────
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      const ext = file.name.split('.').pop().toLowerCase();
      const typeMap = { pdf: 'pdf', pptx: 'pptx', ppt: 'pptx', docx: 'docx', doc: 'docx', txt: 'text', png: 'image', jpg: 'image', jpeg: 'image', mp3: 'audio', wav: 'audio' };
      const type = typeMap[ext] || 'pdf';
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
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
    await base44.entities.RevisionNotebook.update(notebook.id, { source_count: sources.length + files.length });
    setUploading(false);
    setAddMode(null);
    onRefresh();
  };

  // ── URL ──────────────────────────────────────────────────────────────────
  const addUrl = async () => {
    if (!urlInput.trim()) return;
    setUploading(true);
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
    setUploading(false);
    onRefresh();
  };

  // ── Text note ────────────────────────────────────────────────────────────
  const addText = async () => {
    if (!textInput.trim()) return;
    setUploading(true);
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
    setUploading(false);
    onRefresh();
  };

  // ── AI web search ─────────────────────────────────────────────────────────
  const addAiSearch = async () => {
    if (!aiTopic.trim()) return;
    setUploading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an educational research assistant for school students (GCSE / A-Level level).
Search the internet and gather comprehensive, accurate revision notes on the following topic:

"${aiTopic}"

Write clear, detailed revision notes covering:
- Key concepts and definitions
- Important facts, dates, people, formulas (where relevant)
- How things work / explanations
- Common exam points and tips

Format the notes in well-structured markdown with headings and bullet points. Aim for 600-1000 words.`,
        add_context_from_internet: true,
        model: 'gemini_3_flash',
      });

      const content = typeof result === 'string' ? result : result?.content || result?.text || JSON.stringify(result);

      await base44.entities.RevisionSource.create({
        notebook_id: notebook.id,
        student_email: user.email,
        name: `🌐 AI Research: ${aiTopic.slice(0, 60)}`,
        type: 'text',
        content_text: content.slice(0, 50000),
      });
      await base44.entities.RevisionNotebook.update(notebook.id, { source_count: sources.length + 1 });
      setAiTopic('');
      setAddMode(null);
      onRefresh();
    } finally {
      setUploading(false);
    }
  };

  // ── Google Drive Picker ───────────────────────────────────────────────────
  const openGoogleDrivePicker = async () => {
    setGdrivePicking(true);
    try {
      // Get the access token via backend function
      const res = await base44.functions.invoke('getDriveAccessToken', {});
      const token = res?.data?.accessToken || res?.accessToken;
      if (!token) { alert('Could not get Google Drive access. Please try again.'); setGdrivePicking(false); return; }
      setDriveAccessToken(token);

      loadGooglePicker(null, null, token, async (doc) => {
        setGdrivePicking(true);
        // Determine type from mimeType
        const mime = doc.mimeType || '';
        let type = 'gdoc';
        if (mime.includes('presentation')) type = 'gslides';
        else if (mime.includes('pdf')) type = 'pdf';
        else if (mime.includes('document')) type = 'gdoc';

        // Try to fetch content via Drive export API
        let content_text = '';
        try {
          const exportMime = mime.includes('presentation') ? 'text/plain' : 'text/plain';
          const exportUrl = `https://www.googleapis.com/drive/v3/files/${doc.id}/export?mimeType=${encodeURIComponent(exportMime)}`;
          const fileRes = await fetch(exportUrl, { headers: { Authorization: `Bearer ${token}` } });
          if (fileRes.ok) content_text = await fileRes.text();
        } catch {}

        await base44.entities.RevisionSource.create({
          notebook_id: notebook.id,
          student_email: user.email,
          name: doc.name || 'Google Drive file',
          type,
          url: doc.url || `https://drive.google.com/file/d/${doc.id}`,
          content_text: content_text.slice(0, 50000),
        });
        await base44.entities.RevisionNotebook.update(notebook.id, { source_count: sources.length + 1 });
        setGdrivePicking(false);
        setAddMode(null);
        onRefresh();
      });
    } catch (e) {
      alert('Failed to open Google Drive picker: ' + e.message);
      setGdrivePicking(false);
    }
  };

  const addModes = [
    { id: 'gdrive', icon: <HardDrive className="w-5 h-5" />, label: 'Google Drive', color: 'text-blue-400', bg: 'hover:bg-blue-500/10 hover:border-blue-500/30' },
    { id: 'url',    icon: <Link2 className="w-5 h-5" />,     label: 'URL / YouTube', color: 'text-violet-400', bg: 'hover:bg-violet-500/10 hover:border-violet-500/30' },
    { id: 'file',   icon: <Upload className="w-5 h-5" />,    label: 'Upload File',   color: 'text-emerald-400', bg: 'hover:bg-emerald-500/10 hover:border-emerald-500/30' },
    { id: 'ai',     icon: <Sparkles className="w-5 h-5" />,  label: 'AI Web Search', color: 'text-amber-400', bg: 'hover:bg-amber-500/10 hover:border-amber-500/30' },
    { id: 'text',   icon: <FileText className="w-5 h-5" />,  label: 'Text Note',     color: 'text-slate-300', bg: 'hover:bg-white/10 hover:border-white/20' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-white font-black text-xl">Sources</h2>
        <p className="text-slate-400 text-sm">{sources.length} source{sources.length !== 1 ? 's' : ''} · The AI will use these to answer your questions</p>
      </div>

      {/* Add source buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {addModes.map(m => (
          <button key={m.id}
            onClick={() => {
              if (m.id === 'file') { fileInputRef.current?.click(); return; }
              if (m.id === 'gdrive') { openGoogleDrivePicker(); return; }
              setAddMode(addMode === m.id ? null : m.id);
            }}
            disabled={(m.id === 'gdrive' && gdrivePicking) || (m.id === 'file' && uploading)}
            className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-2xl border border-white/10 bg-white/[0.03] transition-all text-sm font-medium ${m.color} ${m.bg} ${addMode === m.id ? 'ring-1 ring-white/20 bg-white/10' : ''}`}>
            {(m.id === 'gdrive' && gdrivePicking) || (m.id === 'file' && uploading)
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : m.icon}
            <span className="text-xs text-slate-400">{m.label}</span>
          </button>
        ))}
      </div>
      <input ref={fileInputRef} type="file" multiple accept=".pdf,.pptx,.ppt,.docx,.doc,.txt,.png,.jpg,.jpeg,.mp3,.wav" onChange={handleFileUpload} className="hidden" />

      {/* Inline forms */}
      <AnimatePresence>
        {addMode === 'url' && (
          <motion.div key="url" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3 overflow-hidden">
            <div className="flex items-center justify-between">
              <p className="text-white font-semibold text-sm flex items-center gap-2"><Link2 className="w-4 h-4 text-violet-400" /> Add URL or YouTube link</p>
              <button onClick={() => setAddMode(null)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <input value={urlInput} onChange={e => setUrlInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addUrl()}
              placeholder="https://..." className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500/50 placeholder:text-slate-500" />
            <button onClick={addUrl} disabled={!urlInput.trim() || uploading}
              className="px-4 py-2 rounded-xl bg-violet-500 text-white font-bold text-sm disabled:opacity-40 flex items-center gap-2">
              {uploading && <Loader2 className="w-3 h-3 animate-spin" />} Add Source
            </button>
          </motion.div>
        )}

        {addMode === 'text' && (
          <motion.div key="text" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3 overflow-hidden">
            <div className="flex items-center justify-between">
              <p className="text-white font-semibold text-sm flex items-center gap-2"><FileText className="w-4 h-4 text-slate-400" /> Add text note</p>
              <button onClick={() => setAddMode(null)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <input value={textName} onChange={e => setTextName(e.target.value)} placeholder="Note title..."
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500/50 placeholder:text-slate-500" />
            <textarea value={textInput} onChange={e => setTextInput(e.target.value)} placeholder="Paste your notes here..." rows={6}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500/50 placeholder:text-slate-500 resize-none" />
            <button onClick={addText} disabled={!textInput.trim() || uploading}
              className="px-4 py-2 rounded-xl bg-violet-500 text-white font-bold text-sm disabled:opacity-40 flex items-center gap-2">
              {uploading && <Loader2 className="w-3 h-3 animate-spin" />} Add Note
            </button>
          </motion.div>
        )}

        {addMode === 'ai' && (
          <motion.div key="ai" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 space-y-3 overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-semibold text-sm flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-400" /> AI Web Search</p>
                <p className="text-slate-400 text-xs mt-0.5">AI will search the internet and write revision notes on your topic</p>
              </div>
              <button onClick={() => setAddMode(null)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <input value={aiTopic} onChange={e => setAiTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !uploading && addAiSearch()}
              placeholder="e.g. Photosynthesis, The French Revolution, Quadratic equations..."
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500/50 placeholder:text-slate-500" />
            <button onClick={addAiSearch} disabled={!aiTopic.trim() || uploading}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm disabled:opacity-40 flex items-center gap-2">
              {uploading ? <><Loader2 className="w-3 h-3 animate-spin" /> Searching the web...</> : <><Globe className="w-3 h-3" /> Search & Generate Notes</>}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      {sources.length > 3 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input value={searchSources} onChange={e => setSearchSources(e.target.value)}
            placeholder="Search sources..."
            className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50" />
        </div>
      )}

      {/* Empty drop zone */}
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
                <pre className="text-slate-300 text-sm whitespace-pre-wrap font-mono bg-white/5 p-4 rounded-xl overflow-auto max-h-96">
                  {viewSource.content_text.slice(0, 5000)}{viewSource.content_text.length > 5000 ? '\n\n[Content truncated...]' : ''}
                </pre>
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