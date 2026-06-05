import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import {
  Upload, Link2, FileText, Trash2, X, Loader2, Plus,
  Pencil, Check, Globe, HardDrive, Sparkles, Search,
  FileIcon, Image, Headphones, CheckSquare, Square
} from 'lucide-react';

const SOURCE_ICONS = {
  pdf: '📄', pptx: '📊', docx: '📝', image: '🖼️', text: '📝',
  url: '🔗', youtube: '🎬', audio: '🎵', gdoc: '📄', gslides: '📊',
};

function formatBytes(b) {
  if (!b) return '';
  if (b < 1024) return `${b}B`;
  if (b < 1048576) return `${(b/1024).toFixed(0)}KB`;
  return `${(b/1048576).toFixed(1)}MB`;
}

function loadGooglePicker(token, onFilePicked) {
  const open = () => {
    window.gapi.load('picker', () => {
      const picker = new window.google.picker.PickerBuilder()
        .addView(window.google.picker.ViewId.DOCS)
        .setOAuthToken(token)
        .setCallback((data) => {
          if (data.action === window.google.picker.Action.PICKED) onFilePicked(data.docs[0]);
        })
        .build();
      picker.setVisible(true);
    });
  };
  if (!window.gapi) {
    const s = document.createElement('script');
    s.src = 'https://apis.google.com/js/api.js';
    s.onload = open;
    document.body.appendChild(s);
  } else { open(); }
}

export default function WorkspaceLeftPanel({ notebook, user, sources, selectedSourceIds, onSelectionChange, onRefresh }) {
  const fileInputRef = useRef(null);
  const [addMode, setAddMode] = useState(null);
  const [urlInput, setUrlInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [textName, setTextName] = useState('');
  const [aiTopic, setAiTopic] = useState('');
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [gdriveBusy, setGdriveBusy] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RevisionSource.delete(id),
    onSuccess: onRefresh,
  });
  const renameMutation = useMutation({
    mutationFn: ({ id, name }) => base44.entities.RevisionSource.update(id, { name }),
    onSuccess: () => { setRenamingId(null); setRenameValue(''); onRefresh(); },
  });

  const filteredSources = sources.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSource = (id) => {
    if (selectedSourceIds.includes(id)) {
      onSelectionChange(selectedSourceIds.filter(x => x !== id));
    } else {
      onSelectionChange([...selectedSourceIds, id]);
    }
  };
  const toggleAll = () => {
    if (selectedSourceIds.length === sources.length) onSelectionChange([]);
    else onSelectionChange(sources.map(s => s.id));
  };

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
            file_url, json_schema: { type: 'object', properties: { text: { type: 'string' } } }
          });
          content_text = extracted?.text || '';
        } catch {}
      }
      const created = await base44.entities.RevisionSource.create({
        notebook_id: notebook.id, student_email: user.email,
        name: file.name, type, file_url, file_size_bytes: file.size,
        content_text: content_text.slice(0, 50000),
      });
      onSelectionChange([...selectedSourceIds, created.id]);
    }
    await base44.entities.RevisionNotebook.update(notebook.id, { source_count: sources.length + files.length });
    setUploading(false); setAddMode(null); onRefresh();
  };

  const addUrl = async () => {
    if (!urlInput.trim()) return;
    setUploading(true);
    const isYoutube = urlInput.includes('youtube.com') || urlInput.includes('youtu.be');
    const created = await base44.entities.RevisionSource.create({
      notebook_id: notebook.id, student_email: user.email,
      name: isYoutube ? `YouTube: ${urlInput.slice(0, 40)}` : urlInput.replace(/^https?:\/\//, '').slice(0, 50),
      type: isYoutube ? 'youtube' : 'url', url: urlInput,
    });
    onSelectionChange([...selectedSourceIds, created.id]);
    setUrlInput(''); setAddMode(null); setUploading(false); onRefresh();
  };

  const addText = async () => {
    if (!textInput.trim()) return;
    setUploading(true);
    const created = await base44.entities.RevisionSource.create({
      notebook_id: notebook.id, student_email: user.email,
      name: textName || 'Text note', type: 'text', content_text: textInput,
    });
    onSelectionChange([...selectedSourceIds, created.id]);
    setTextInput(''); setTextName(''); setAddMode(null); setUploading(false); onRefresh();
  };

  const addAiSearch = async () => {
    if (!aiTopic.trim()) return;
    setUploading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an educational research assistant. Search the internet and write comprehensive, accurate revision notes for UK school students on: "${aiTopic}". Cover key concepts, definitions, important facts, and exam tips. Format with clear markdown headings and bullet points. Aim for 600-900 words.`,
        add_context_from_internet: true,
        model: 'gemini_3_flash',
      });
      const content = typeof result === 'string' ? result : result?.content || JSON.stringify(result);
      const created = await base44.entities.RevisionSource.create({
        notebook_id: notebook.id, student_email: user.email,
        name: `🌐 ${aiTopic.slice(0, 55)}`,
        type: 'text', content_text: content.slice(0, 50000),
      });
      onSelectionChange([...selectedSourceIds, created.id]);
      setAiTopic(''); setAddMode(null);
    } finally {
      setUploading(false); onRefresh();
    }
  };

  const openGDrive = async () => {
    setGdriveBusy(true);
    try {
      const res = await base44.functions.invoke('getDriveAccessToken', {});
      const token = res?.data?.accessToken || res?.accessToken;
      if (!token) { alert('Could not access Google Drive.'); return; }
      loadGooglePicker(token, async (doc) => {
        setGdriveBusy(true);
        const mime = doc.mimeType || '';
        let type = 'gdoc';
        if (mime.includes('presentation')) type = 'gslides';
        else if (mime.includes('pdf')) type = 'pdf';
        let content_text = '';
        try {
          const r = await fetch(`https://www.googleapis.com/drive/v3/files/${doc.id}/export?mimeType=text/plain`, { headers: { Authorization: `Bearer ${token}` } });
          if (r.ok) content_text = await r.text();
        } catch {}
        const created = await base44.entities.RevisionSource.create({
          notebook_id: notebook.id, student_email: user.email,
          name: doc.name || 'Drive file', type,
          url: `https://drive.google.com/file/d/${doc.id}`,
          content_text: content_text.slice(0, 50000),
        });
        onSelectionChange([...selectedSourceIds, created.id]);
        setGdriveBusy(false); onRefresh();
      });
    } finally {
      setGdriveBusy(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-bold text-sm">Sources</h2>
          <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
            {selectedSourceIds.length}/{sources.length}
          </span>
        </div>
        <button
          onClick={() => setAddMode(addMode ? null : 'menu')}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold text-sm hover:brightness-110 transition-all">
          <Plus className="w-4 h-4" /> Add Sources
        </button>
      </div>

      {/* Add source menu */}
      <AnimatePresence>
        {addMode === 'menu' && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="flex-shrink-0 overflow-hidden border-b border-white/10 bg-slate-900/50">
            <div className="p-3 grid grid-cols-2 gap-2">
              {[
                { id: 'file', icon: <Upload className="w-4 h-4" />, label: 'Upload File', color: 'text-emerald-400' },
                { id: 'gdrive', icon: <HardDrive className="w-4 h-4" />, label: 'Google Drive', color: 'text-blue-400' },
                { id: 'url', icon: <Link2 className="w-4 h-4" />, label: 'URL / YouTube', color: 'text-violet-400' },
                { id: 'ai', icon: <Sparkles className="w-4 h-4" />, label: 'AI Web Search', color: 'text-amber-400' },
                { id: 'text', icon: <FileText className="w-4 h-4" />, label: 'Text Note', color: 'text-slate-300' },
              ].map(m => (
                <button key={m.id}
                  onClick={() => { if (m.id === 'file') { fileInputRef.current?.click(); setAddMode(null); } else if (m.id === 'gdrive') { setAddMode(null); openGDrive(); } else setAddMode(m.id); }}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-medium transition-all ${m.color}`}>
                  {m.icon} {m.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
        {['url', 'text', 'ai'].includes(addMode) && (
          <motion.div key={addMode} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="flex-shrink-0 overflow-hidden border-b border-white/10 bg-slate-900/50">
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white font-semibold">
                  {addMode === 'url' ? '🔗 Add URL' : addMode === 'ai' ? '✨ AI Web Search' : '📝 Text Note'}
                </span>
                <button onClick={() => setAddMode(null)}><X className="w-3.5 h-3.5 text-slate-400" /></button>
              </div>
              {addMode === 'text' && (
                <input value={textName} onChange={e => setTextName(e.target.value)} placeholder="Title..."
                  className="w-full px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-violet-500/50 placeholder:text-slate-500" />
              )}
              {addMode === 'text' ? (
                <textarea value={textInput} onChange={e => setTextInput(e.target.value)} placeholder="Paste your notes..." rows={4}
                  className="w-full px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-violet-500/50 placeholder:text-slate-500 resize-none" />
              ) : (
                <input value={addMode === 'url' ? urlInput : aiTopic}
                  onChange={e => addMode === 'url' ? setUrlInput(e.target.value) : setAiTopic(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !uploading && (addMode === 'url' ? addUrl() : addAiSearch())}
                  placeholder={addMode === 'url' ? 'https://...' : 'e.g. Photosynthesis, French Revolution...'}
                  className="w-full px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-violet-500/50 placeholder:text-slate-500" />
              )}
              <button onClick={addMode === 'url' ? addUrl : addMode === 'text' ? addText : addAiSearch}
                disabled={uploading || (addMode === 'url' ? !urlInput.trim() : addMode === 'text' ? !textInput.trim() : !aiTopic.trim())}
                className="w-full py-2 rounded-lg bg-violet-500 text-white text-xs font-bold disabled:opacity-40 flex items-center justify-center gap-1">
                {uploading ? <><Loader2 className="w-3 h-3 animate-spin" /> Working...</> : 'Add Source'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <input ref={fileInputRef} type="file" multiple accept=".pdf,.pptx,.ppt,.docx,.doc,.txt,.png,.jpg,.jpeg,.mp3,.wav" onChange={handleFileUpload} className="hidden" />

      {/* Search */}
      {sources.length > 0 && (
        <div className="flex-shrink-0 px-3 py-2 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sources..."
              className="w-full pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50" />
          </div>
        </div>
      )}

      {/* Select all */}
      {sources.length > 0 && (
        <div className="flex-shrink-0 px-3 py-1.5 border-b border-white/10 flex items-center justify-between">
          <button onClick={toggleAll} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
            {selectedSourceIds.length === sources.length
              ? <CheckSquare className="w-3.5 h-3.5 text-violet-400" />
              : <Square className="w-3.5 h-3.5" />}
            {selectedSourceIds.length === sources.length ? 'Deselect all' : 'Select all'}
          </button>
          {selectedSourceIds.length > 0 && (
            <span className="text-xs text-violet-400">{selectedSourceIds.length} selected</span>
          )}
        </div>
      )}

      {/* Source list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {gdriveBusy && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Opening Google Drive...
          </div>
        )}
        {uploading && !gdriveBusy && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing source...
          </div>
        )}

        {filteredSources.length === 0 && !uploading && (
          <div className="text-center py-8 text-slate-600">
            <FileIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">No sources yet</p>
          </div>
        )}

        {filteredSources.map((s) => {
          const isSelected = selectedSourceIds.includes(s.id);
          return (
            <motion.div key={s.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              className={`group relative rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-violet-500/10 border-violet-500/30'
                  : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]'
              }`}>
              <div className="flex items-start gap-2 p-2.5" onClick={() => toggleSource(s.id)}>
                <div className={`mt-0.5 flex-shrink-0 ${isSelected ? 'text-violet-400' : 'text-slate-600'}`}>
                  {isSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                </div>
                <span className="text-base flex-shrink-0 mt-0.5">{SOURCE_ICONS[s.type] || '📄'}</span>
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
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-slate-600 text-[10px] capitalize">{s.type}</span>
                    {s.file_size_bytes && <span className="text-slate-600 text-[10px]">{formatBytes(s.file_size_bytes)}</span>}
                    {s.created_date && <span className="text-slate-600 text-[10px]">{new Date(s.created_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>}
                  </div>
                  {s.content_text && <span className="text-emerald-600 text-[10px]">✓ indexed</span>}
                </div>
              </div>
              {/* Action buttons */}
              <div className="absolute top-1.5 right-1.5 hidden group-hover:flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
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