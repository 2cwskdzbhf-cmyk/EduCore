import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, Mic, FileText, Trash2, Edit2, RefreshCw, Loader2, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';

function MediaItem({ item, isTeacher, onRetranscribe, retranscribing }) {
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const isTranscribing = retranscribing === item.id;

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.type === 'audio' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'}`}>
            {item.type === 'audio' ? '🎙' : '🎬'} {item.label || (item.type === 'audio' ? 'Recording' : 'Video')}
          </span>
        </div>
        {item.transcript && (
          <button onClick={() => setTranscriptOpen(o => !o)}
            className="text-xs text-slate-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
            <FileText className="w-3 h-3" /> Transcript
            {transcriptOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      <div className="px-3 pb-3">
        {item.type === 'audio' ? (
          <audio src={item.url} controls className="w-full h-8" style={{ accentColor: '#8b5cf6' }} />
        ) : (
          <video src={item.url} controls className="w-full max-h-48 rounded-lg" />
        )}
      </div>

      <AnimatePresence>
        {item.transcript && transcriptOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/10">
            <div className="px-3 pb-3 pt-2">
              {isTeacher && (
                <div className="flex justify-end mb-2">
                  <Button size="sm" variant="ghost" onClick={() => onRetranscribe(item)} disabled={isTranscribing}
                    className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 text-xs h-6 px-2">
                    {isTranscribing ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Regenerating...</> : <><RefreshCw className="w-3 h-3 mr-1" />Regenerate</>}
                  </Button>
                </div>
              )}
              <p className="text-slate-300 text-sm leading-relaxed max-h-48 overflow-y-auto">{item.transcript}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!item.transcript && (
        <div className="px-3 pb-3">
          {isTeacher ? (
            <Button size="sm" variant="ghost" onClick={() => onRetranscribe(item)} disabled={isTranscribing}
              className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 text-xs h-6 px-2">
              {isTranscribing ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Transcribing...</> : <><FileText className="w-3 h-3 mr-1" />Generate Transcript</>}
            </Button>
          ) : (
            <p className="text-slate-600 text-xs">No transcript available</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function LessonCard({ lesson, isTeacher, onEdit, onDelete, onRetranscribe, retranscribing }) {
  const [expanded, setExpanded] = useState(false);

  // Normalise media: prefer media_items array, fall back to legacy audio_url
  const mediaItems = lesson.media_items?.length
    ? lesson.media_items
    : lesson.audio_url
      ? [{ id: 'legacy', type: 'audio', label: 'Recording', url: lesson.audio_url, transcript: lesson.transcript_text || '' }]
      : [];

  const audioCount = mediaItems.filter(m => m.type === 'audio').length;
  const videoCount = mediaItems.filter(m => m.type === 'video').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
    >
      {/* Card header */}
      <div className="p-5 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-2 mb-1">
              <span className="text-xs text-slate-500 font-medium">
                {format(new Date(lesson.created_date), 'dd MMM yyyy')}
              </span>
              {audioCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
                  <Mic className="w-3 h-3" /> {audioCount} audio
                </span>
              )}
              {videoCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                  <Video className="w-3 h-3" /> {videoCount} video
                </span>
              )}
              {mediaItems.some(m => m.transcript) && (
                <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  <FileText className="w-3 h-3" /> Transcript
                </span>
              )}
            </div>
            <h3 className="text-white font-bold text-lg leading-tight">{lesson.title}</h3>
            {lesson.teacher_name && (
              <p className="text-slate-400 text-sm mt-0.5">{lesson.teacher_name}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isTeacher && (
              <>
                <button onClick={e => { e.stopPropagation(); onEdit(lesson); }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={e => { e.stopPropagation(); onDelete(lesson); }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            {expanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </div>
        </div>

        {!expanded && lesson.content_text && (
          <p className="text-slate-400 text-sm mt-2 line-clamp-2">{lesson.content_text}</p>
        )}
      </div>

      {/* Expanded body */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-white/10 pt-4 space-y-4">
              {lesson.content_text && (
                <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                  {lesson.content_text}
                </div>
              )}

              {mediaItems.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Media</p>
                  {mediaItems.map(item => (
                    <MediaItem
                      key={item.id}
                      item={item}
                      isTeacher={isTeacher}
                      onRetranscribe={onRetranscribe}
                      retranscribing={retranscribing}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}