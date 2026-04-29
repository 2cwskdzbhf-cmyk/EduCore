import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Loader2, X, Save, AlertCircle, Video, Plus, Trash2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';

function MediaRecorderItem({ item, onUpdate, onDelete, onTranscribe, transcribingId }) {
  const isTranscribing = transcribingId === item.id;
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.type === 'audio' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'}`}>
            {item.type === 'audio' ? '🎙 Audio' : '🎬 Video'}
          </span>
          <Input
            value={item.label}
            onChange={e => onUpdate({ ...item, label: e.target.value })}
            placeholder="Label (e.g. Part 1)"
            className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-7 text-xs flex-1"
          />
        </div>
        <button onClick={() => onDelete(item.id)} className="text-slate-500 hover:text-red-400 transition-colors flex-shrink-0">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {item.type === 'audio' ? (
        <audio src={item.url} controls className="w-full h-7" style={{ accentColor: '#8b5cf6' }} />
      ) : (
        <video src={item.url} controls className="w-full max-h-36 rounded-lg" />
      )}
      {item.transcript ? (
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-2">
          <p className="text-blue-300 text-xs font-semibold mb-1 flex items-center gap-1"><FileText className="w-3 h-3" /> Transcript</p>
          <p className="text-slate-300 text-xs leading-relaxed line-clamp-3">{item.transcript}</p>
        </div>
      ) : (
        <Button size="sm" variant="ghost"
          onClick={() => onTranscribe(item)}
          disabled={isTranscribing}
          className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 text-xs h-6 px-2"
        >
          {isTranscribing ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Transcribing...</> : <><FileText className="w-3 h-3 mr-1" />Generate Transcript</>}
        </Button>
      )}
    </div>
  );
}

export default function LessonForm({ classId, user, lesson, onSave, onCancel }) {
  const [title, setTitle] = useState(lesson?.title || '');
  const [contentText, setContentText] = useState(lesson?.content_text || '');
  const [mediaItems, setMediaItems] = useState(() => {
    if (lesson?.media_items?.length) return lesson.media_items;
    if (lesson?.audio_url) return [{
      id: 'legacy', type: 'audio', label: 'Recording', url: lesson.audio_url,
      transcript: lesson.transcript_text || ''
    }];
    return [];
  });
  const [saving, setSaving] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingMs, setRecordingMs] = useState(0);
  const [recordingType, setRecordingType] = useState('audio'); // 'audio' | 'video'
  const [uploading, setUploading] = useState(false);
  const [micError, setMicError] = useState('');
  const [transcribingId, setTranscribingId] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const videoPreviewRef = useRef(null);

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      if (mediaRecorderRef.current?.state !== 'inactive') {
        mediaRecorderRef.current?.stop();
      }
    };
  }, []);

  const formatTime = (ms) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };

  const genId = () => Math.random().toString(36).slice(2);

  const startRecording = async (type) => {
    setMicError('');
    setRecordingType(type);
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(
        type === 'video' ? { audio: true, video: true } : { audio: true }
      );
    } catch {
      setMicError('Microphone/camera access denied. Please grant permission.');
      return;
    }
    if (type === 'video' && videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = stream;
    }
    chunksRef.current = [];
    const mimeType = type === 'video' ? 'video/webm' : 'audio/webm';
    const mr = new MediaRecorder(stream, { mimeType });
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      if (videoPreviewRef.current) videoPreviewRef.current.srcObject = null;
      const blob = new Blob(chunksRef.current, { type: mimeType });
      await handleBlob(blob, type);
    };
    mediaRecorderRef.current = mr;
    mr.start(250);
    setRecording(true);
    setRecordingMs(0);
    timerRef.current = setInterval(() => setRecordingMs(ms => ms + 100), 100);
  };

  const stopRecording = () => {
    clearInterval(timerRef.current);
    setRecording(false);
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleBlob = async (blob, type) => {
    setUploading(true);
    const ext = type === 'video' ? 'webm' : 'webm';
    const file = new File([blob], `lesson-${type}-${Date.now()}.${ext}`, { type: blob.type });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const newItem = { id: genId(), type, label: `${type === 'audio' ? 'Recording' : 'Video'} ${mediaItems.filter(m => m.type === type).length + 1}`, url: file_url, transcript: '' };
    setUploading(false);

    // Auto-transcribe
    setTranscribingId(newItem.id);
    setMediaItems(prev => [...prev, newItem]);
    try {
      const res = await base44.functions.invoke('transcribeAudio', { audio_url: file_url });
      const t = res.data?.transcript || '';
      setMediaItems(prev => prev.map(m => m.id === newItem.id ? { ...m, transcript: t } : m));
    } catch {
      // transcript can be re-generated later
    }
    setTranscribingId(null);
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const newItem = { id: genId(), type, label: `${type === 'audio' ? 'Audio' : 'Video'} ${mediaItems.filter(m => m.type === type).length + 1}`, url: file_url, transcript: '' };
    setUploading(false);
    setTranscribingId(newItem.id);
    setMediaItems(prev => [...prev, newItem]);
    try {
      const res = await base44.functions.invoke('transcribeAudio', { audio_url: file_url });
      const t = res.data?.transcript || '';
      setMediaItems(prev => prev.map(m => m.id === newItem.id ? { ...m, transcript: t } : m));
    } catch {}
    setTranscribingId(null);
    e.target.value = '';
  };

  const handleTranscribe = async (item) => {
    setTranscribingId(item.id);
    try {
      const res = await base44.functions.invoke('transcribeAudio', { audio_url: item.url });
      const t = res.data?.transcript || '';
      setMediaItems(prev => prev.map(m => m.id === item.id ? { ...m, transcript: t } : m));
    } catch {}
    setTranscribingId(null);
  };

  const updateItem = (updated) => setMediaItems(prev => prev.map(m => m.id === updated.id ? updated : m));
  const deleteItem = (id) => setMediaItems(prev => prev.filter(m => m.id !== id));

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const data = {
      class_id: classId,
      title: title.trim(),
      content_text: contentText.trim(),
      media_items: mediaItems,
      // Keep legacy fields for backward compat
      audio_url: mediaItems.find(m => m.type === 'audio')?.url || '',
      transcript_text: mediaItems.find(m => m.type === 'audio')?.transcript || '',
      created_by: user.email,
      teacher_name: user.full_name || user.email.split('@')[0],
      is_published: true,
    };
    if (lesson?.id) {
      await base44.entities.ClassLesson.update(lesson.id, data);
    } else {
      await base44.entities.ClassLesson.create(data);
    }
    setSaving(false);
    onSave();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 mb-4"
    >
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-white font-bold text-lg">{lesson ? 'Edit Lesson' : 'New Lesson'}</h3>
        <button onClick={onCancel} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-slate-300 mb-1.5 block">Lesson Title *</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Introduction to Fractions"
            className="bg-white/5 border-white/10 text-white placeholder:text-slate-500" />
        </div>

        <div>
          <Label className="text-slate-300 mb-1.5 block">Lesson Notes</Label>
          <Textarea value={contentText} onChange={e => setContentText(e.target.value)}
            placeholder="Write lesson notes, objectives, key points..."
            rows={4}
            className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 resize-none" />
        </div>

        {/* Media section */}
        <div className="space-y-3">
          <Label className="text-slate-300 block">Media (Audio & Video)</Label>

          {/* Existing media items */}
          <AnimatePresence>
            {mediaItems.map(item => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}>
                <MediaRecorderItem
                  item={item}
                  onUpdate={updateItem}
                  onDelete={deleteItem}
                  onTranscribe={handleTranscribe}
                  transcribingId={transcribingId}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {micError && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" /> {micError}
            </div>
          )}

          {/* Recording controls */}
          {!recording && !uploading && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => startRecording('audio')}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 hover:bg-red-500/25 transition-all text-sm font-medium"
              >
                <Mic className="w-4 h-4" /> Record Audio
              </button>
              <button
                onClick={() => startRecording('video')}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-300 hover:bg-blue-500/25 transition-all text-sm font-medium"
              >
                <Video className="w-4 h-4" /> Record Video
              </button>
              <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-all text-sm font-medium cursor-pointer">
                <Plus className="w-4 h-4" /> Upload Audio
                <input type="file" accept="audio/*" className="hidden" onChange={e => handleFileUpload(e, 'audio')} />
              </label>
              <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-all text-sm font-medium cursor-pointer">
                <Plus className="w-4 h-4" /> Upload Video
                <input type="file" accept="video/*" className="hidden" onChange={e => handleFileUpload(e, 'video')} />
              </label>
            </div>
          )}

          {recording && (
            <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }}
                className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-red-300 font-mono font-bold">{formatTime(recordingMs)}</span>
              <span className="text-red-300/70 text-sm">{recordingType === 'video' ? 'Recording video...' : 'Recording audio...'}</span>
              <button onClick={stopRecording}
                className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-700 border border-white/10 text-white hover:bg-slate-600 transition-all text-sm">
                <Square className="w-3.5 h-3.5" /> Stop
              </button>
            </div>
          )}

          {/* Video preview during recording */}
          {recording && recordingType === 'video' && (
            <video ref={videoPreviewRef} autoPlay muted className="w-full max-h-40 rounded-xl bg-black" />
          )}

          {uploading && (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Processing & transcribing...
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-1">
          <Button onClick={handleSave}
            disabled={!title.trim() || saving || recording || uploading}
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 font-semibold">
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <><Save className="w-4 h-4 mr-2" /> {lesson ? 'Save Changes' : 'Create Lesson'}</>}
          </Button>
          <Button variant="ghost" onClick={onCancel} className="text-slate-400 hover:text-white">Cancel</Button>
        </div>
      </div>
    </motion.div>
  );
}