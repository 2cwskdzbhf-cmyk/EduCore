import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import {
  Upload, Link2, FileText, Trash2, X, Loader2, FilePlus2,
  Pencil, Check, Search, Globe, HardDrive, Sparkles, ChevronDown,
  FileImage, FileAudio, CheckSquare, Square, Plus
} from 'lucide-react';

const TYPE_ICONS = {
  pdf: '📄', pptx: '📊', docx: '📝', image: '🖼️', text: '📄',
  url: '🔗', youtube: '🎬', audio: '🎵', gdoc: '📄', gslides: '📊',
};

function formatBytes(b) {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

export default function WorkspaceLeftPanel({ notebook, user, sources, selectedSourceIds, onSelectSource, onToggleAll, onRefresh }) {
  const fileInputRef = useRef(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [addMode, setAddMode] = useState(null); // 'url' | 'text' | 'ai'
  const [urlInput, setUrlInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [textName, setTextName] = useState('');
  const [aiTopic, setAiTopic] = useState('');
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [gdrivePicking, setGdrivePicking] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RevisionSource.delete(id),
    onSuccess: onRefresh,
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }) => base44.entities.RevisionSource.update(id, { name }),
    onSuccess: () => { setRenamingId(null); setRenameValue(''); onRefresh(); },
  });

  const filtered = sources.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase())
  );

  const allSelected = sources.length > 0 && sources.every(s => selectedSourceIds.includes(s.id));

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    setShowAddMenu(false);
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
        notebook_id: notebook.id, student_email: user.email,
        name: file.name, type, file_url, file_size_bytes: file.size,
        content_text: content_text.slice(0, 50000),
      });
    }
    await base44.entities.RevisionNotebook.update(notebook.id, { source_count: sources.length + files.length });
    setUploading(false);
    onRefresh();
  };

  const addUrl = async () => {
    if (!urlInput.trim()) return;
    setUploading(true);
    const isYoutube = urlInput.includes('youtube.com') || urlInput.includes('youtu.be');
    await base44.entities.RevisionSource.create({
      notebook_id: notebook.id, student_email: user.email,
      name: isYoutube ? `YouTube: ${urlInput.slice(0, 50)}` : urlInput.replace(/^https?:\/\//, '').slice(0, 60),
      type: isYoutube ? 'youtube' : 'url', url: urlInput,
    });
    await base44.entities.RevisionNotebook.update(notebook.id, { source_count: sources.length + 1 });
    setUrlInput(''); setAddMode(null); setUploading(false); onRefresh();
  };

  const addText = async () => {
    if (!textInput.trim()) return;
    setUploading(true);
    await base44.entities.RevisionSource.create({
      notebook_id: notebook.id, student_email: user.email,
      name: textName || 'Text note', type: 'text', content_text: textInput,
    });
    await base44.entities.RevisionNotebook.update(notebook.id, { source_count: sources.length + 1 });
    setTextInput(''); setTextName(''); setAddMode(null); setUploading(false); onRefresh();
  };

  const addAiSearch = async () => {
    if (!aiTopic.trim()) return;
    setUploading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Search the internet and write comprehensive revision notes on: "${aiTopic}". Cover key concepts, definitions, important facts, and exam tips. Format in clear markdown with headings and bullet points. Aim for 600-1000 words.`,
        add_context_from_internet: true,
        model: 'gemini_3_flash',
      });
      const content = typeof result === 'string' ? result : result?.content || result?.text || JSON.stringify(result);
      await base44.entities.RevisionSource.create({
        notebook_id: notebook.id, student_email: user.email,
        name: `🌐 AI Research: ${aiTopic.slice(0, 60)}`, type: 'text',
        content_text: content.slice(0, 50000),
      });
      await base44.entities.RevisionNotebook.update(notebook.id, { source_count: sources.length + 1 });
      setAiTopic(''); setAddMode(null); onRefresh();
    } finally { setUploading(false); }
  };

  const openGoogleDrive = async () => {
    setGdrivePicking(true); setShowAddMenu(false);
    try {
      const res = await base44.functions.invoke('getDriveAccessToken', {});
      const token = res?.data?.accessToken || res?.accessToken;
      if (!token) { alert('Could not get Google Drive access.'); setGdrivePicking(false); return; }
      const loadPicker = () => {
        window.gapi.load('picker', () => {
          new window.google.picker.PickerBuilder()
            .addView(window.google.picker.ViewId.DOCS)
            .setOAuthToken(token)
            .setCallback(async (data) => {
              if (data.action !== window.google.picker.Action.PICKED) { setGdrivePicking(false); return; }
              const doc = data.docs[0];
              const mime = doc.mimeType || '';
              let type = mime.includes('presentation') ? 'gslides' : mime.includes('pdf') ? 'pdf' : 'gdoc';
              let content_text = '';
              try {
                const r = await fetch(`https://www.googleapis.com/drive/v3/files/${doc.id}/export?mimeType=text/plain`, { headers: { Authorization: `Bearer ${token}` } });
                if (r.ok) content_text = await r.text();
              } catch {}
              await base44.entities.RevisionSource.create({
                notebook_id: notebook.id, student_email: user.email,
                name: doc.name || 'Google Drive file', type,
                url: `https://drive.google.com/file/d/${doc.id}`,
                content_text: content_text.slice(0, 50000),
              });
              await base44.entities.RevisionNotebook.update(notebook.id, { source_count: sources.length + 1 });
              setGdrivePicking(false); onRefresh();
            }).build().setVisible(true);
        });
      };
      if (!window.gapi) {
        const s = document.createElement('script'); s.src = 'https://apis.google.com/js/api.js'; s.onload = loadPicker; document.body.appendChild(s);
      } else { loadPicker(); }
    } catch (e) { alert('Failed: ' + e.message); setGdrivePicking(false); }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-bold text-sm">Sources</h2>
          <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">{sources.length}</span>
        </div>

        {/* Add Sources button */}
        <div className="relative">
          <button onClick={() => setShowAddMenu(v => !v)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold text-sm hover:brightness-110 transition-all">
            {uploading || gdrivePicking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add Sources
            {!uploading && !gdrivePicking && <ChevronDown className="w-3 h-3 ml-auto" />}
          </button>
          <AnimatePresence>
            {showAddMenu && (
              <motion.div initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.96 }}
                className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900 border border-white/15 rounded-2xl p-1.5 z-50 shadow-2xl">
                {[
                  { label: 'Upload File', icon: <Upload className="w-3.5 h-3.5" />, color: 'text-emerald-400', action: () => { fileInputRef.current?.click(); setShowAddMenu(false); } },
                  { label: 'Google Drive', icon: <HardDrive className="w-3.5 h-3.5" />, color: 'text-blue-400', action: openGoogleDrive },
                  { label: 'Website URL', icon: <Link2 className="w-3.5 h-3.5" />, color: 'text-violet-400', action: () => { setAddMode('url'); setShowAddMenu(false); } },
                  { label: 'Text Note', icon: <FileText className="w-3.5 h-3.5" />, color: 'text-slate-300', action: () => { setAddMode('text'); setShowAddMenu(false); } },
                  { label: 'AI Web Search', icon: <Sparkles className="w-3.5 h-3.5" />, color: 'text-amber-400', action: () => { setAddMode('ai'); setShowAddMenu(false); } },
                ].map(item => (
                  <button key={item.label} onClick={item.action}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/8 transition-all text-sm ${item.color}`}>
                    {item.icon}
                    <span className="text-slate-200">{item.label}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <input ref={fileInputRef} type="file" multiple accept=".pdf,.pptx,.ppt,.docx,.doc,.txt,.png,.jpg,.jpeg,.mp3,.wav" onChange={handleFileUpload} className="hidden" />
      </div>

      {/* Inline forms */}
      <AnimatePresence>
        {addMode === 'url' && (
          <motion.div key="url" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex-shrink-0 p-4 border-b border-white/10 bg-violet-500/5 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-violet-300 text-xs font-semibold flex items-center gap-1.5"><Link2 className="w-3 h-3" /> Website URL</p>
              <button onClick={() => setAddMode(null)}><X className="w-3.5 h-3.5 text-slate-400" /></button>
            </div>
            <input value={urlInput} onChange={e => setUrlInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addUrl()}
              placeholder="https://..." className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-violet-500/50 placeholder:text-slate-500" />
            <button onClick={addUrl} disabled={!urlInput.trim() || uploading} className="w-full py-2 rounded-xl bg-violet-500 text-white font-bold text-xs disabled:opacity-40 flex items-center justify-center gap-1">
              {uploading && <Loader2 className="w-3 h-3 animate-spin" />} Add URL
            </button>
          </motion.div>
        )}
        {addMode === 'text' && (
          <motion.div key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex-shrink-0 p-4 border-b border-white/10 bg-white/[0.02] space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-slate-300 text-xs font-semibold flex items-center gap-1.5"><FileText className="w-3 h-3" /> Text Note</p>
              <button onClick={() => setAddMode(null)}><X className="w-3.5 h-3.5 text-slate-400" /></button>
            </div>
            <input value={textName} onChange={e => setTextName(e.target.value)} placeholder="Title..."
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-violet-500/50 placeholder:text-slate-500" />
            <textarea value={textInput} onChange={e => setTextInput(e.target.value)} placeholder="Paste notes here..." rows={4}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-violet-500/50 placeholder:text-slate-500 resize-none" />
            <button onClick={addText} disabled={!textInput.trim() || uploading} className="w-full py-2 rounded-xl bg-violet-500 text-white font-bold text-xs disabled:opacity-40">Add Note</button>
          </motion.div>
        )}
        {addMode === 'ai' && (
          <motion.div key="ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex-shrink-0 p-4 border-b border-white/10 bg-amber-500/5 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-amber-300 text-xs font-semibold flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> AI Web Search</p>
              <button onClick={() => setAddMode(null)}><X className="w-3.5 h-3.5 text-slate-400" /></button>
            </div>
            <input value={aiTopic} onChange={e => setAiTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && !uploading && addAiSearch()}
              placeholder="e.g. Photosynthesis, French Revolution..."
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500/50 placeholder:text-slate-500" />
            <button onClick={addAiSearch} disabled={!aiTopic.trim() || uploading}
              className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs disabled:opacity-40 flex items-center justify-center gap-1">
              {uploading ? <><Loader2 className="w-3 h-3 animate-spin" /> Searching...</> : <><Globe className="w-3 h-3" /> Search & Generate</>}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <div className="flex-shrink-0 px-4 py-2 border-b border-white/10">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sources..."
            className="w-full pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/40" />
        </div>
      </div>

      {/* Select all */}
      {sources.length > 0 && (
        <div className="flex-shrink-0 px-4 py-2 border-b border-white/10 flex items-center justify-between">
          <button onClick={onToggleAll} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
            {allSelected ? <CheckSquare className="w-3.5 h-3.5 text-violet-400" /> : <Square className="w-3.5 h-3.5" />}
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
          <span className="text-xs text-slate-500">{selectedSourceIds.length} selected</span>
        </div>
      )}

      {/* Source list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {sources.length === 0 && !uploading && (
          <div onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-white/10 hover:border-violet-500/30 rounded-xl cursor-pointer transition-all group">
            <FilePlus2 className="w-8 h-8 text-slate-600 group-hover:text-violet-400 mb-2 transition-colors" />
            <p className="text-slate-500 text-xs text-center">Add sources to get started</p>
          </div>
        )}
        {filtered.map((s, i) => {
          const selected = selectedSourceIds.includes(s.id);
          return (
            <motion.div key={s.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
              className={`group relative flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                selected ? 'border-violet-500/40 bg-violet-500/10' : 'border-white/8 bg-white/[0.03] hover:bg-white/[0.07]'
              }`}
              onClick={() => onSelectSource(s.id)}>
              <button className="flex-shrink-0 mt-0.5" onClick={e => { e.stopPropagation(); onSelectSource(s.id); }}>
                {selected ? <CheckSquare className="w-3.5 h-3.5 text-violet-400" /> : <Square className="w-3.5 h-3.5 text-slate-600" />}
              </button>
              <span className="text-base flex-shrink-0 leading-none mt-0.5">{TYPE_ICONS[s.type] || '📄'}</span>
              <div className="flex-1 min-w-0">
                {renamingId === s.id ? (
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') renameMutation.mutate({ id: s.id, name: renameValue }); if (e.key === 'Escape') setRenamingId(null); }}
                      className="flex-1 px-1.5 py-0.5 bg-white/10 border border-violet-500/50 rounded text-white text-xs focus:outline-none" />
                    <button onClick={() => renameMutation.mutate({ id: s.id, name: renameValue })} className="text-emerald-400"><Check className="w-3 h-3" /></button>
                    <button onClick={() => setRenamingId(null)} className="text-slate-400"><X className="w-3 h-3" /></button>
                  </div>
                ) : (
                  <p className="text-white text-xs font-medium truncate leading-snug">{s.name}</p>
                )}
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-600">
                  {s.created_date && <span>{new Date(s.created_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>}
                  {s.file_size_bytes && <span>{formatBytes(s.file_size_bytes)}</span>}
                  {s.content_text && <span className="text-emerald-600">✓</span>}
                </div>
              </div>
              <div className="flex-shrink-0 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                <button onClick={() => { setRenamingId(s.id); setRenameValue(s.name); }}
                  className="p-1 rounded text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 transition-all">
                  <Pencil className="w-3 h-3" />
                </button>
                <button onClick={() => deleteMutation.mutate(s.id)}
                  className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}