import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import {
  Mic, Play, Pause, SkipForward, SkipBack, Loader2,
  Radio, ChevronDown, ChevronUp, Volume2, BookOpen
} from 'lucide-react';

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export default function PodcastMode({ notebooks, sources }) {
  const [phase, setPhase] = useState('setup'); // setup | generating | playing
  const [selectedNotebook, setSelectedNotebook] = useState(null);
  const [script, setScript] = useState(null); // { title, chapters: [{title, hostA, hostB}] }
  const [loading, setLoading] = useState(false);
  const [audioSegments, setAudioSegments] = useState([]); // [{url, speaker, text}]
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [currentChapter, setCurrentChapter] = useState(0);
  const [currentSegment, setCurrentSegment] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [chaptersOpen, setChaptersOpen] = useState(false);
  const audioRef = useRef(null);
  const segmentQueue = useRef([]);

  const notebookSources = selectedNotebook
    ? sources.filter(s => s.notebook_id === selectedNotebook.id && s.content_text)
    : [];

  const sourceContext = notebookSources
    .map(s => `[${s.name}]: ${s.content_text?.slice(0, 800)}`)
    .join('\n\n')
    .slice(0, 3000);

  const generateScript = async () => {
    if (!selectedNotebook || !sourceContext) return;
    setLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are creating a podcast script for two AI hosts, Alex (enthusiastic teacher) and Sam (curious student), discussing study notes.

Topic: ${selectedNotebook.name} (${selectedNotebook.subject || 'General'})

Source material:
${sourceContext}

Write a natural, engaging 3-chapter podcast discussion. For each chapter, Alex explains a concept clearly and Sam asks great follow-up questions.

Return JSON with this exact structure:
{
  "title": "podcast episode title",
  "chapters": [
    {
      "title": "chapter title",
      "lines": [
        {"speaker": "Alex", "text": "..."},
        {"speaker": "Sam", "text": "..."}
      ]
    }
  ]
}

Rules:
- 3 chapters, 4-6 lines each
- Conversational, not lecture-style
- Include real examples from the source material
- Sam should ask clarifying questions Alex answers clearly`,
        response_json_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            chapters: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  lines: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        speaker: { type: 'string' },
                        text: { type: 'string' }
                      },
                      required: ['speaker', 'text'],
                      additionalProperties: false
                    }
                  }
                },
                required: ['title', 'lines'],
                additionalProperties: false
              }
            }
          },
          required: ['title', 'chapters'],
          additionalProperties: false
        }
      });
      setScript(res);
      setPhase('generating');
      await generateAudio(res);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const generateAudio = async (scriptData) => {
    setGeneratingAudio(true);
    const allLines = scriptData.chapters.flatMap(c => c.lines);
    const segments = [];
    for (let i = 0; i < allLines.length; i++) {
      const line = allLines[i];
      setAudioProgress(Math.round((i / allLines.length) * 100));
      try {
        const result = await base44.integrations.Core.GenerateSpeech({
          text: line.text.slice(0, 500),
          voice: line.speaker === 'Alex' ? 'storm' : 'honey',
        });
        segments.push({ url: result.url, speaker: line.speaker, text: line.text });
      } catch {
        segments.push({ url: null, speaker: line.speaker, text: line.text });
      }
    }
    setAudioSegments(segments);
    setGeneratingAudio(false);
    setPhase('playing');
    setCurrentSegment(0);
  };

  useEffect(() => {
    if (phase !== 'playing' || audioSegments.length === 0) return;
    const seg = audioSegments[currentSegment];
    if (!seg?.url) {
      // Skip missing
      if (currentSegment + 1 < audioSegments.length) setCurrentSegment(s => s + 1);
      return;
    }
    if (audioRef.current) {
      audioRef.current.src = seg.url;
      audioRef.current.playbackRate = speed;
      if (isPlaying) audioRef.current.play();
    }
  }, [currentSegment, phase, audioSegments]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
    else { audioRef.current.play(); setIsPlaying(true); }
  };

  const onEnded = () => {
    if (currentSegment + 1 < audioSegments.length) {
      setCurrentSegment(s => s + 1);
    } else {
      setIsPlaying(false);
    }
  };

  const skipToChapter = (chapterIndex) => {
    if (!script) return;
    let segIdx = 0;
    for (let i = 0; i < chapterIndex; i++) {
      segIdx += script.chapters[i].lines.length;
    }
    setCurrentSegment(segIdx);
    setCurrentChapter(chapterIndex);
    setChaptersOpen(false);
    if (audioRef.current && audioSegments[segIdx]?.url) {
      audioRef.current.src = audioSegments[segIdx].url;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Compute current chapter from segment index
  useEffect(() => {
    if (!script) return;
    let count = 0;
    for (let i = 0; i < script.chapters.length; i++) {
      count += script.chapters[i].lines.length;
      if (currentSegment < count) { setCurrentChapter(i); break; }
    }
  }, [currentSegment, script]);

  const currentSpeaker = audioSegments[currentSegment]?.speaker;

  // Setup screen
  if (phase === 'setup') {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h2 className="text-white font-black text-xl mb-1">AI Podcast Mode</h2>
          <p className="text-slate-400 text-sm">Two AI hosts discuss your notes in a natural conversation.</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
          <p className="text-white font-bold text-sm">Choose a notebook</p>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {notebooks.filter(nb => sources.some(s => s.notebook_id === nb.id && s.content_text)).map(nb => (
              <button key={nb.id} onClick={() => setSelectedNotebook(nb)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                  selectedNotebook?.id === nb.id
                    ? 'bg-violet-500/20 border-violet-500/40 text-white'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:border-white/20'
                }`}>
                <span className="text-xl">{nb.icon || '📚'}</span>
                <div>
                  <p className="font-semibold text-sm">{nb.name}</p>
                  <p className="text-xs text-slate-500">{nb.subject || 'No subject'}</p>
                </div>
              </button>
            ))}
            {notebooks.filter(nb => sources.some(s => s.notebook_id === nb.id && s.content_text)).length === 0 && (
              <p className="text-slate-500 text-sm text-center py-4">Add sources to a notebook first to generate a podcast.</p>
            )}
          </div>

          {selectedNotebook && (
            <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3 flex gap-2 items-start">
              <Radio className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-violet-300">
                <p className="font-bold">Alex & Sam will discuss:</p>
                <p className="text-violet-400 mt-0.5">{notebookSources.length} source{notebookSources.length !== 1 ? 's' : ''} from "{selectedNotebook.name}"</p>
              </div>
            </div>
          )}

          <button
            onClick={generateScript}
            disabled={!selectedNotebook || loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:brightness-110 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-500/25">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
            {loading ? 'Writing script...' : 'Generate Podcast'}
          </button>
        </div>
      </div>
    );
  }

  // Generating audio
  if (phase === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto space-y-4">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-xl shadow-violet-500/30 animate-pulse">
          <Radio className="w-10 h-10 text-white" />
        </div>
        <p className="text-white font-bold text-xl">{script?.title}</p>
        <p className="text-slate-400 text-sm">Generating audio for Alex & Sam...</p>
        <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
            animate={{ width: `${audioProgress}%` }} transition={{ duration: 0.3 }} />
        </div>
        <p className="text-slate-500 text-xs">{audioProgress}%</p>
      </div>
    );
  }

  // Player
  return (
    <div className="max-w-lg mx-auto space-y-4">
      <audio ref={audioRef} onEnded={onEnded} />

      {/* Episode card */}
      <div className="bg-gradient-to-br from-violet-900/40 to-purple-900/30 border border-violet-500/30 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Radio className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="text-white font-black text-base">{script?.title}</p>
            <p className="text-slate-400 text-xs mt-0.5">{selectedNotebook?.name} · {audioSegments.length} segments</p>
          </div>
        </div>

        {/* Now speaking */}
        <AnimatePresence mode="wait">
          <motion.div key={currentSegment} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`rounded-xl p-3 mb-4 text-sm leading-relaxed ${
              currentSpeaker === 'Alex'
                ? 'bg-blue-500/10 border border-blue-500/20 text-blue-200'
                : 'bg-violet-500/10 border border-violet-500/20 text-violet-200'
            }`}>
            <span className="font-bold mr-2">{currentSpeaker}:</span>
            {audioSegments[currentSegment]?.text}
          </motion.div>
        </AnimatePresence>

        {/* Progress */}
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-4">
          <motion.div className="h-full bg-gradient-to-r from-violet-400 to-purple-400 rounded-full"
            animate={{ width: `${((currentSegment + 1) / audioSegments.length) * 100}%` }} transition={{ duration: 0.3 }} />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => setCurrentSegment(s => Math.max(0, s - 1))}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-white transition-all">
            <SkipBack className="w-5 h-5" />
          </button>
          <button onClick={togglePlay}
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 hover:brightness-110 text-white transition-all flex items-center justify-center shadow-lg">
            {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-0.5" />}
          </button>
          <button onClick={() => setCurrentSegment(s => Math.min(audioSegments.length - 1, s + 1))}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-white transition-all">
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Speed + segment count */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-1">
            <Volume2 className="w-3.5 h-3.5 text-slate-500" />
            <div className="flex gap-1">
              {SPEEDS.map(s => (
                <button key={s} onClick={() => setSpeed(s)}
                  className={`px-2 py-0.5 rounded text-xs font-bold transition-all ${speed === s ? 'bg-violet-500/30 text-violet-300' : 'text-slate-500 hover:text-white'}`}>
                  {s}x
                </button>
              ))}
            </div>
          </div>
          <span className="text-slate-600 text-xs">{currentSegment + 1}/{audioSegments.length}</span>
        </div>
      </div>

      {/* Chapters */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <button onClick={() => setChaptersOpen(o => !o)}
          className="w-full flex items-center justify-between p-4 text-sm text-white font-bold hover:bg-white/5 transition-all">
          <span className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-violet-400" /> Chapters</span>
          {chaptersOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>
        {chaptersOpen && (
          <div className="border-t border-white/10">
            {script?.chapters.map((ch, i) => (
              <button key={i} onClick={() => skipToChapter(i)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-white/5 transition-all border-b border-white/5 last:border-0 ${currentChapter === i ? 'text-violet-300' : 'text-slate-400'}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${currentChapter === i ? 'bg-violet-500/30 text-violet-300' : 'bg-white/5 text-slate-500'}`}>{i + 1}</span>
                {ch.title}
              </button>
            ))}
          </div>
        )}
      </div>

      <button onClick={() => { setPhase('setup'); setScript(null); setAudioSegments([]); setIsPlaying(false); }}
        className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 text-sm transition-all">
        Generate New Podcast
      </button>
    </div>
  );
}