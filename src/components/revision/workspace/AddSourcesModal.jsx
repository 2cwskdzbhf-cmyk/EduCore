import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import {
  X, Upload, Link2, FileText, HardDrive, Sparkles,
  Search, Loader2, Globe, Youtube, ChevronDown
} from 'lucide-react';

const SOURCE_LIMIT = 50;

export default function AddSourcesModal({ notebook, user, sources, onRefresh, onClose }) {
  const fileInputRef = useRef(null);
  const [activeForm, setActiveForm] = useState(null); // 'url' | 'text' | 'ai' | null
  const [urlInput, setUrlInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [textName, setTextName] = useState('');
  const [aiTopic, setAiTopic] = useState('');
  const [uploading, setUploading] = useState(false);
  const [gdrivePicking, setGdrivePicking] = useState(false);
  const [researchDepth, setResearchDepth] = useState('fast');
  const [sourceType, setSourceType] = useState('web');

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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
        notebook_id: notebook.id, student_email: user.email,
        name: file.name, type, file_url, file_size_bytes: file.size,
        content_text: content_text.slice(0, 50000),
      });
    }
    await base44.entities.RevisionNotebook.update(notebook.id, { source_count: sources.length + files.length });
    setUploading(false);
    onRefresh();
    onClose();
  };

  // ── URL ──────────────────────────────────────────────────────────────────
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
    setUrlInput(''); setUploading(false); onRefresh(); onClose();
  };

  // ── Text note ────────────────────────────────────────────────────────────
  const addText = async () => {
    if (!textInput.trim()) return;
    setUploading(true);
    await base44.entities.RevisionSource.create({
      notebook_id: notebook.id, student_email: user.email,
      name: textName || 'Text note', type: 'text', content_text: textInput,
    });
    await base44.entities.RevisionNotebook.update(notebook.id, { source_count: sources.length + 1 });
    setTextInput(''); setTextName(''); setUploading(false); onRefresh(); onClose();
  };

  // ── AI search ────────────────────────────────────────────────────────────
  const addAiSearch = async () => {
    if (!aiTopic.trim()) return;
    setUploading(true);
    try {
      const isDeep = researchDepth === 'deep';
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an educational research assistant for school students (GCSE / A-Level level).
Search the internet and gather ${isDeep ? 'very comprehensive, in-depth' : 'comprehensive'} revision notes on:

"${aiTopic}"

Cover: key concepts, definitions, important facts, formulas, exam tips.
Format in clear markdown with headings and bullet points. Aim for ${isDeep ? '1200-2000' : '600-1000'} words.`,
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
      setAiTopic(''); onRefresh(); onClose();
    } finally { setUploading(false); }
  };

  // ── Google Drive ─────────────────────────────────────────────────────────
  const [driveError, setDriveError] = useState(null);

  const openGoogleDrive = async () => {
    setGdrivePicking(true);
    setDriveError(null);
    try {
      const res = await base44.functions.invoke('getDriveAccessToken', {});
      const token = res?.data?.accessToken;
      if (!token) {
        setDriveError('Could not get Google Drive access. Please try again.');
        setGdrivePicking(false);
        return;
      }

      const launchPicker = () => {
        window.gapi.load('picker', () => {
          const docsView = new window.google.picker.DocsView()
            .setIncludeFolders(false)
            .setMimeTypes([
              'application/vnd.google-apps.document',
              'application/vnd.google-apps.presentation',
              'application/pdf',
              'text/plain',
            ].join(','));

          new window.google.picker.PickerBuilder()
            .addView(docsView)
            .setOAuthToken(token)
            .setCallback(async (data) => {
              if (data.action === window.google.picker.Action.CANCEL) {
                setGdrivePicking(false);
                return;
              }
              if (data.action !== window.google.picker.Action.PICKED) return;

              const doc = data.docs[0];
              const mime = doc.mimeType || '';
              const isGoogleDoc = mime === 'application/vnd.google-apps.document';
              const isGoogleSlides = mime === 'application/vnd.google-apps.presentation';
              const type = isGoogleSlides ? 'gslides' : mime.includes('pdf') ? 'pdf' : 'gdoc';

              let content_text = '';
              try {
                if (isGoogleDoc || isGoogleSlides) {
                  const r = await fetch(
                    `https://www.googleapis.com/drive/v3/files/${doc.id}/export?mimeType=text/plain`,
                    { headers: { Authorization: `Bearer ${token}` } }
                  );
                  if (r.ok) content_text = await r.text();
                }
              } catch (_) {}

              await base44.entities.RevisionSource.create({
                notebook_id: notebook.id,
                student_email: user.email,
                name: doc.name || 'Google Drive file',
                type,
                url: `https://drive.google.com/file/d/${doc.id}`,
                content_text: content_text.slice(0, 50000),
              });
              await base44.entities.RevisionNotebook.update(notebook.id, { source_count: sources.length + 1 });
              setGdrivePicking(false);
              onRefresh();
              onClose();
            })
            .build()
            .setVisible(true);
        });
      };

      if (!window.gapi) {
        const s = document.createElement('script');
        s.src = 'https://apis.google.com/js/api.js';
        s.onload = launchPicker;
        document.body.appendChild(s);
      } else {
        launchPicker();
      }
    } catch (e) {
      setDriveError('Drive access failed: ' + e.message);
      setGdrivePicking(false);
    }
  };

  const sourcesUsed = sources.length;
  const progressPct = Math.min((sourcesUsed / SOURCE_LIMIT) * 100, 100);

  return (
    <motion.div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onClose}
    >
      <motion.div
        className="relative w-full max-w-2xl rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #0d1117 0%, #0a0e1a 40%, #060810 100%)',
          border: '1px solid rgba(99,102,241,0.2)',
          boxShadow: '0 0 80px rgba(99,102,241,0.15), 0 40px 80px rgba(0,0,0,0.7)',
        }}
        initial={{ opacity: 0, scale: 0.93, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        onClick={e => e.stopPropagation()}
      >
        {/* Glow accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.5), rgba(34,211,238,0.4), transparent)' }} />

        {/* Close */}
        <button onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/10 transition-all z-10">
          <X className="w-4 h-4" />
        </button>

        <div className="p-7 pb-6">
          {/* Header */}
          <div className="text-center mb-7">
            <h2 className="text-white font-black text-xl mb-1.5">Add Sources to your Notebook</h2>
            <p className="text-sm font-medium"
              style={{ background: 'linear-gradient(90deg, #60a5fa, #34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Upload files, paste links, or let AI research a topic for you
            </p>
          </div>

          {/* ── Search / AI section ── */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              {/* Source type pill */}
              <div className="relative">
                <select
                  value={sourceType}
                  onChange={e => { setSourceType(e.target.value); setActiveForm('ai'); }}
                  className="appearance-none pl-3 pr-7 py-2 rounded-xl text-xs font-semibold text-white focus:outline-none cursor-pointer"
                  style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}
                >
                  <option value="web">🌐 Web</option>
                  <option value="drive">📁 Drive</option>
                  <option value="text">📝 Text</option>
                  <option value="audio">🎵 Audio</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
              </div>

              {/* Research depth pill */}
              <div className="relative">
                <select
                  value={researchDepth}
                  onChange={e => setResearchDepth(e.target.value)}
                  className="appearance-none pl-3 pr-7 py-2 rounded-xl text-xs font-semibold text-white focus:outline-none cursor-pointer"
                  style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)' }}
                >
                  <option value="fast">⚡ Fast research</option>
                  <option value="deep">🔍 Deep research</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Search / AI input */}
            <div className="relative">
              <input
                value={aiTopic}
                onChange={e => { setAiTopic(e.target.value); setActiveForm('ai'); }}
                onKeyDown={e => e.key === 'Enter' && !uploading && addAiSearch()}
                placeholder="Search a topic or paste a URL..."
                className="w-full pl-4 pr-12 py-3.5 rounded-2xl text-white text-sm placeholder:text-slate-500 focus:outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(99,102,241,0.3)',
                  boxShadow: activeForm === 'ai' ? '0 0 0 2px rgba(99,102,241,0.2), 0 0 24px rgba(99,102,241,0.08)' : 'none',
                }}
              />
              <button
                onClick={addAiSearch}
                disabled={!aiTopic.trim() || uploading}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all disabled:opacity-30 hover:bg-indigo-500/20"
                style={{ color: '#818cf8' }}
              >
                {uploading && activeForm === 'ai' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <span className="text-slate-600 text-xs font-medium">or drop your files</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
          </div>
          <p className="text-center text-slate-600 text-xs mb-5">pdf, images, docs, audio, and more</p>

          {/* ── Upload action buttons ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
            {/* Upload files */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="group flex flex-col items-center gap-2 py-4 px-3 rounded-2xl transition-all hover:scale-[1.03] active:scale-[0.98]"
              style={{
                background: 'rgba(52,211,153,0.06)',
                border: '1px solid rgba(52,211,153,0.18)',
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 20px rgba(52,211,153,0.12)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >
              {uploading ? <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" /> : <Upload className="w-5 h-5 text-emerald-400" />}
              <span className="text-xs font-semibold text-white">Upload files</span>
            </button>

            {/* Websites */}
            <button
              onClick={() => setActiveForm(activeForm === 'url' ? null : 'url')}
              className="group flex flex-col items-center gap-2 py-4 px-3 rounded-2xl transition-all hover:scale-[1.03] active:scale-[0.98]"
              style={{
                background: activeForm === 'url' ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.06)',
                border: `1px solid ${activeForm === 'url' ? 'rgba(239,68,68,0.4)' : 'rgba(239,68,68,0.18)'}`,
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 20px rgba(239,68,68,0.1)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >
              <Youtube className="w-5 h-5 text-red-400" />
              <span className="text-xs font-semibold text-white">Websites</span>
            </button>

            {/* Drive */}
            <button
              onClick={openGoogleDrive}
              disabled={gdrivePicking}
              className="group flex flex-col items-center gap-2 py-4 px-3 rounded-2xl transition-all hover:scale-[1.03] active:scale-[0.98]"
              style={{
                background: driveError ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.06)',
                border: `1px solid ${driveError ? 'rgba(239,68,68,0.35)' : 'rgba(59,130,246,0.18)'}`,
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 20px rgba(59,130,246,0.12)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >
              {gdrivePicking ? <Loader2 className="w-5 h-5 text-blue-400 animate-spin" /> : <HardDrive className={`w-5 h-5 ${driveError ? 'text-red-400' : 'text-blue-400'}`} />}
              <span className="text-xs font-semibold text-white">Drive</span>
            </button>

            {/* Copied text */}
            <button
              onClick={() => setActiveForm(activeForm === 'text' ? null : 'text')}
              className="group flex flex-col items-center gap-2 py-4 px-3 rounded-2xl transition-all hover:scale-[1.03] active:scale-[0.98]"
              style={{
                background: activeForm === 'text' ? 'rgba(148,163,184,0.12)' : 'rgba(148,163,184,0.06)',
                border: `1px solid ${activeForm === 'text' ? 'rgba(148,163,184,0.35)' : 'rgba(148,163,184,0.15)'}`,
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 20px rgba(148,163,184,0.08)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >
              <FileText className="w-5 h-5 text-slate-300" />
              <span className="text-xs font-semibold text-white">Copied text</span>
            </button>
          </div>

          {/* Drive error */}
          {driveError && (
            <p className="text-red-400 text-xs text-center mb-3 px-2">{driveError}</p>
          )}

          {/* ── Inline sub-forms ── */}
          <AnimatePresence>
            {activeForm === 'url' && (
              <motion.div
                key="url-form"
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden mb-4"
              >
                <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
                  <p className="text-red-300 text-xs font-semibold flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5" /> Website or YouTube URL</p>
                  <input
                    value={urlInput} onChange={e => setUrlInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addUrl()}
                    placeholder="https://..."
                    className="w-full px-3 py-2.5 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}
                    autoFocus
                  />
                  <button onClick={addUrl} disabled={!urlInput.trim() || uploading}
                    className="px-5 py-2 rounded-xl text-white font-bold text-sm disabled:opacity-40 flex items-center gap-2 transition-all hover:brightness-110"
                    style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}>
                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                    Add URL
                  </button>
                </div>
              </motion.div>
            )}

            {activeForm === 'text' && (
              <motion.div
                key="text-form"
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden mb-4"
              >
                <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(148,163,184,0.04)', border: '1px solid rgba(148,163,184,0.15)' }}>
                  <p className="text-slate-300 text-xs font-semibold flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Paste your text</p>
                  <input value={textName} onChange={e => setTextName(e.target.value)} placeholder="Title (optional)..."
                    className="w-full px-3 py-2.5 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(148,163,184,0.15)' }} />
                  <textarea value={textInput} onChange={e => setTextInput(e.target.value)} placeholder="Paste your notes, article, or any text here..." rows={5}
                    className="w-full px-3 py-2.5 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none resize-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(148,163,184,0.15)' }}
                    autoFocus />
                  <button onClick={addText} disabled={!textInput.trim() || uploading}
                    className="px-5 py-2 rounded-xl text-white font-bold text-sm disabled:opacity-40 flex items-center gap-2 transition-all hover:brightness-110"
                    style={{ background: 'linear-gradient(135deg, #475569, #334155)' }}>
                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                    Add Note
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Drive error */}
          {driveError && (
            <div className="mb-4 px-3 py-2.5 rounded-xl text-xs text-red-300 flex items-start gap-2"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <span className="mt-0.5">⚠️</span>
              <span>{driveError}</span>
            </div>
          )}

          {/* ── Progress bar ── */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Sources used</span>
              <span className="font-medium text-slate-400">{sourcesUsed} / {SOURCE_LIMIT}</span>
            </div>
            <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #6366f1, #22d3ee)' }}
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.pptx,.ppt,.docx,.doc,.txt,.png,.jpg,.jpeg,.mp3,.wav"
          onChange={handleFileUpload}
          className="hidden"
        />
      </motion.div>
    </motion.div>
  );
}