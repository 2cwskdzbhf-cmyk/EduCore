import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Square, Loader2, X, Save, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';

export default function LessonForm({ classId, user, lesson, onSave, onCancel }) {
  const [title, setTitle] = useState(lesson?.title || '');
  const [contentText, setContentText] = useState(lesson?.content_text || '');
  const [audioUrl, setAudioUrl] = useState(lesson?.audio_url || '');
  const [saving, setSaving] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingMs, setRecordingMs] = useState(0);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState(lesson?.transcript_text || '');
  const [micError, setMicError] = useState('');

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    setMicError('');
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setMicError('Microphone access denied. Please allow microphone permission.');
      return;
    }
    chunksRef.current = [];
    const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      await handleAudioBlob(blob);
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
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleAudioBlob = async (blob) => {
    setUploadingAudio(true);
    const file = new File([blob], `lesson-${Date.now()}.webm`, { type: 'audio/webm' });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setAudioUrl(file_url);
    setUploadingAudio(false);

    // Auto-transcribe
    setTranscribing(true);
    try {
      const res = await base44.functions.invoke('transcribeAudio', { audio_url: file_url });
      setTranscript(res.data?.transcript || '');
    } catch {
      // transcript can be retried later
    }
    setTranscribing(false);
  };

  const formatTime = (ms) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const data = {
      class_id: classId,
      title: title.trim(),
      content_text: contentText.trim(),
      audio_url: audioUrl,
      transcript_text: transcript,
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
      className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 mb-6"
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
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Introduction to Fractions"
            className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
          />
        </div>

        <div>
          <Label className="text-slate-300 mb-1.5 block">Lesson Notes</Label>
          <Textarea
            value={contentText}
            onChange={e => setContentText(e.target.value)}
            placeholder="Write lesson notes, objectives, key points..."
            rows={5}
            className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 resize-none"
          />
        </div>

        {/* Audio recording */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <Label className="text-slate-300 mb-3 block">Audio Recording</Label>

          {micError && (
            <div className="flex items-center gap-2 text-red-400 text-sm mb-3">
              <AlertCircle className="w-4 h-4" /> {micError}
            </div>
          )}

          {!audioUrl && !uploadingAudio && (
            <div className="flex items-center gap-3">
              {!recording ? (
                <button
                  onClick={startRecording}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 transition-all font-medium text-sm"
                >
                  <Mic className="w-4 h-4" /> Start Recording
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="w-3 h-3 rounded-full bg-red-500"
                  />
                  <span className="text-red-300 font-mono font-bold">{formatTime(recordingMs)}</span>
                  <button
                    onClick={stopRecording}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700 border border-white/10 text-white hover:bg-slate-600 transition-all font-medium text-sm"
                  >
                    <Square className="w-4 h-4" /> Stop
                  </button>
                </div>
              )}
            </div>
          )}

          {uploadingAudio && (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Uploading audio...
            </div>
          )}

          {transcribing && (
            <div className="flex items-center gap-2 text-blue-400 text-sm mt-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Generating transcript with Whisper AI...
            </div>
          )}

          {audioUrl && !uploadingAudio && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                <Mic className="w-4 h-4" /> Recording saved
                <button
                  onClick={() => { setAudioUrl(''); setTranscript(''); }}
                  className="ml-2 text-xs text-slate-500 hover:text-red-400 underline"
                >
                  Remove
                </button>
              </div>
              <audio src={audioUrl} controls className="w-full h-8" style={{ accentColor: '#8b5cf6' }} />
            </div>
          )}
        </div>

        {/* Transcript preview */}
        {transcript && (
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
            <p className="text-blue-300 font-semibold text-sm mb-2">Auto-generated Transcript</p>
            <p className="text-slate-300 text-sm leading-relaxed line-clamp-4">{transcript}</p>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <Button
            onClick={handleSave}
            disabled={!title.trim() || saving || recording || uploadingAudio || transcribing}
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 font-semibold"
          >
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <><Save className="w-4 h-4 mr-2" /> {lesson ? 'Save Changes' : 'Create Lesson'}</>}
          </Button>
          <Button variant="ghost" onClick={onCancel} className="text-slate-400 hover:text-white">
            Cancel
          </Button>
        </div>
      </div>
    </motion.div>
  );
}