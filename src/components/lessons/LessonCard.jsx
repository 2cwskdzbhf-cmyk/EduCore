import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, Play, Pause, Mic, FileText, Trash2, Edit2, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LessonCard({ lesson, isTeacher, onEdit, onDelete, onRetranscribe, retranscribing }) {
  const [expanded, setExpanded] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
    >
      {/* Card header */}
      <div
        className="p-5 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-slate-500 font-medium">
                {format(new Date(lesson.created_date), 'dd MMM yyyy, HH:mm')}
              </span>
              {lesson.audio_url && (
                <span className="flex items-center gap-1 text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
                  <Mic className="w-3 h-3" /> Audio
                </span>
              )}
              {lesson.transcript_text && (
                <span className="flex items-center gap-1 text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                  <FileText className="w-3 h-3" /> Transcript
                </span>
              )}
            </div>
            <h3 className="text-white font-bold text-lg leading-tight truncate">{lesson.title}</h3>
            {lesson.teacher_name && (
              <p className="text-slate-400 text-sm mt-0.5">{lesson.teacher_name}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isTeacher && (
              <>
                <button
                  onClick={e => { e.stopPropagation(); onEdit(lesson); }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); onDelete(lesson); }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            {expanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </div>
        </div>

        {/* Preview snippet */}
        {!expanded && lesson.content_text && (
          <p className="text-slate-400 text-sm mt-2 line-clamp-2">{lesson.content_text}</p>
        )}
      </div>

      {/* Expanded body */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-white/10 pt-4 space-y-4">
              {/* Content */}
              {lesson.content_text && (
                <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                  {lesson.content_text}
                </div>
              )}

              {/* Audio player */}
              {lesson.audio_url && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={togglePlay}
                      className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg hover:scale-105 transition-transform flex-shrink-0"
                    >
                      {playing ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white ml-0.5" />}
                    </button>
                    <div className="flex-1">
                      <p className="text-white font-medium text-sm mb-1">Lesson Recording</p>
                      <audio
                        ref={audioRef}
                        src={lesson.audio_url}
                        onEnded={() => setPlaying(false)}
                        className="w-full h-8"
                        controls
                        style={{ accentColor: '#8b5cf6' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Transcript */}
              {lesson.transcript_text && (
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setTranscriptOpen(o => !o)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-400" />
                      <span className="text-blue-300 font-semibold text-sm">Transcript</span>
                    </div>
                    {transcriptOpen ? <ChevronUp className="w-4 h-4 text-blue-400" /> : <ChevronDown className="w-4 h-4 text-blue-400" />}
                  </button>
                  <AnimatePresence>
                    {transcriptOpen && (
                      <motion.div
                        initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 border-t border-blue-500/20">
                          {isTeacher && (
                            <div className="flex justify-end mb-2 pt-2">
                              <Button
                                size="sm" variant="ghost"
                                onClick={() => onRetranscribe(lesson)}
                                disabled={retranscribing}
                                className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 text-xs"
                              >
                                {retranscribing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                                Regenerate
                              </Button>
                            </div>
                          )}
                          <p className="text-slate-300 text-sm leading-relaxed">{lesson.transcript_text}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* No transcript yet — teacher can generate */}
              {isTeacher && lesson.audio_url && !lesson.transcript_text && (
                <Button
                  size="sm" variant="outline"
                  onClick={() => onRetranscribe(lesson)}
                  disabled={retranscribing}
                  className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 text-xs"
                >
                  {retranscribing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <FileText className="w-3 h-3 mr-1" />}
                  Generate Transcript
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}