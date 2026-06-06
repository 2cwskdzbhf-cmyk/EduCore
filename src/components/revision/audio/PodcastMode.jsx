import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import {
  Mic, Play, Pause, SkipForward, SkipBack, Loader2,
  Radio, ChevronDown, ChevronUp, Volume2, RefreshCw
} from 'lucide-react';

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
const HOST_A = { name: 'Alex', voice: 'storm', color: 'text-blue-400', bg: 'bg-blue-500/20' };
const HOST_B = { name: 'Sam', voice: 'honey', color: 'text-rose-400', bg: 'bg-rose-500/20' };

function parseScript(raw) {
  // Parse "ALEX: ..." / "SAM: ..." lines into segments
  const lines = raw.split('\n').filter(l => l.trim());
  const segments = [];
  for (const line of lines) {
    const alexMatch = line.match(/^ALEX:\s*(.+)/i);
    const samMatch = line.match(/^SAM:\s*(.+)/i);
    if (alexMatch) segments.push({ host: 'alex', text: alexMatch[1].trim() });
    else if (samMatch) segments.push({ host: 'sam', text: samMatch[1].trim() });
  }
  return segments.length > 0 ? segments : [{ host: 'alex', text: raw }];
}

export default function PodcastMode({ sources, notebook }) {
  const [phase, setPhase] = useState('setup'); // setup | generating | ready | playing
  const [topic, setTopic] = useState('');
  const [segments, setSegments] = useState([]);
  const [audioUrls, setAudioUrls] = useState({});
  const [currentSeg, setCurrentSeg] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [speedIdx, setSpeedIdx] = useState(1);
  const [generatingProgress, setGeneratingProgress] = useState(0);
  const [chapters, setChapters] = useState([]);
  const [showChapters, setShowChapters] = useState(false);
  const [error, setError] = useState('');
  const audioRef = useRef(null);

  const sourceText = sources.slice(0, 3).map(s => s.content_text || s.name).join('\n\n').slice(0, 4000);

  const generate = async () => {
    if (!sourceText && !topic) { setError('Add sources to your notebook first.'); return; }
    setError('');
    setPhase('generating');
    setGeneratingProgress(10);

    try {
      // Step 1: Generate script
      const scriptRes = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a podcast script writer. Write a lively, engaging 2-host educational podcast conversation about: "${topic || notebook?.name || 'the topic'}".

${sourceText ? `Use this source material:\n${sourceText}` : ''}

Rules:
- Exactly 12–16 exchanges total
- Format EVERY line as: "ALEX: [speech]" or "SAM: [speech]"
- Alex is enthusiastic and explains concepts clearly
- Sam asks smart questions and gives examples
- Cover the main ideas, give 1-2 concrete examples, end with a summary
- Keep each turn 1-3 sentences max
- No markdown, no stage directions, just the dialogue lines

Start with Alex introducing the topic.`,
        response_json_schema: {
          type: 'object',
          properties: {
            script: { type: 'string' },
            chapters: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  segment_index: { type: 'number' }
                },
                required: ['title', 'segment_index'],
                additionalProperties: false
              }
            }
          },
          required: ['script', 'chapters'],
          additionalProperties: false
        }
      });

      setGeneratingProgress(40);
      const parsed = parseScript(scriptRes.script || '');
      setSegments(parsed);
      setChapters(scriptRes.chapters || []);

      // Step 2: Generate audio for each segment (in parallel batches)
      const urls = {};
      const batchSize = 3;
      for (let i = 0; i < parsed.length; i += batchSize) {
        const batch = parsed.slice(i, i + batchSize);
        await Promise.all(batch.map(async (seg, j) => {
          const idx = i + j;
          const host = seg.host === 'alex' ? HOST_A : HOST_B;
          try {
            const r = await base44.integrations.Core.GenerateSpeech({
              text: seg.text,
              voice: host.voice,
            });
            urls[idx] = r.url;
          } catch {
            urls[idx] = null;
          }
        }));
        setGeneratingProgress(40 + Math.round(((i + batchSize) / parsed.length) * 55));
      }

      setAudioUrls(urls);
      setCurrentSeg(0);
      setPhase('ready');
    } catch (e) {
      setError('Failed to generate podcast: ' + e.message);
      setPhase('setup');
    }
  };

  // Auto-advance segments
  useEffect(() => {
    if (!isPlaying || !audioRef.current) return;
    const audio = audioRef.current;

    const url = audioUrls[currentSeg];
    if (!url) {
      // Skip missing audio
      if (currentSeg + 1 < segments.length) setCurrentSeg(s => s + 1);
      else { setIsPlaying(false); setPhase('ready'); }
      return;
    }

    audio.src = url;
    audio.playbackRate = speed;
    audio.play().catch(() => {});

    const onEnd = () => {
      if (currentSeg + 1 < segments.length) {
        setCurrentSeg(s => s + 1);
      } else {
        setIsPlaying(false);
        setCurrentSeg(0);
        setPhase('ready');
      }
    };
    audio.addEventListener('ended', onEnd);
    return () => audio.removeEventListener('ended', onEnd);
  }, [isPlaying, currentSeg, audioUrls, speed, segments.length]);

  const togglePlay = () => {
    if (phase === 'ready') setPhase('playing');
    if (!isPlaying) {
      setIsPlaying(true);
    } else {
      audioRef.current?.pause();
      setIsPlaying(false);
    }
  };

  const skipNext = () => {
    audioRef.current?.pause();
    if (currentSeg + 1 < segments.length) setCurrentSeg(s => s + 1);
  };
  const skipPrev = () => {
    audioRef.current?.pause();
    if (currentSeg > 0) setCurrentSeg(s => s - 1);
  };

  const cycleSpeed = () => {
    const next = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(next);
    setSpeed(SPEEDS[next]);
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[next];
  };

  const jumpToChapter = (idx) => {
    audioRef.current?.pause();
    setCurrentSeg(idx);
    setIsPlaying(true);
    setPhase('playing');
    setShowChapters(false);
  };

  const curHost = segments[currentSeg]?.host === 'alex' ? HOST_A : HOST_B;

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div>
        <h2 className="text-white font-black text-xl mb-1 flex items-center gap-2">
          <Radio className="w-5 h-5 text-rose-400" /> AI Podcast Mode
        </h2>
        <p className="text-slate-400 text-sm">Two AI hosts discuss your notes in a conversational podcast.</p>
      </div>

      {phase === 'setup' && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
          <div className="flex gap-3">
            {[HOST_A, HOST_B].map(h => (
              <div key={h.name} className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl ${h.bg} border border-white/10`}>
                <div className={`w-7 h-7 rounded-full ${h.bg} border border-white/20 flex items-center justify-center text-xs font-black ${h.color}`}>
                  {h.name[0]}
                </div>
                <div>
                  <p className={`text-xs font-bold ${h.color}`}>{h.name}</p>
                  <p className="text-slate-500 text-[10px]">{h.name === 'Alex' ? 'Explains' : 'Questions'}</p>
                </div>
              </div>
            ))}
          </div>
          <div>
            <label className="text-slate-400 text-xs mb-1.5 block">Topic focus (optional)</label>
            <input value={topic} onChange={e => setTopic(e.target.value)}
              placeholder={notebook?.name || 'Leave blank to cover all sources'}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50" />
          </div>
          {!sourceText && (
            <p className="text-amber-400 text-xs">No source text found — add PDFs or notes to your notebook for best results.</p>
          )}
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button onClick={generate}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:brightness-110 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-500/25">
            <Radio className="w-4 h-4" /> Generate Podcast
          </button>
        </div>
      )}

      {phase === 'generating' && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center space-y-4">
          <Radio className="w-12 h-12 text-rose-400 mx-auto animate-pulse" />
          <p className="text-white font-bold">Producing your podcast...</p>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full"
              animate={{ width: `${generatingProgress}%` }} transition={{ duration: 0.5 }} />
          </div>
          <p className="text-slate-400 text-xs">{generatingProgress < 40 ? 'Writing script...' : 'Generating voices...'}</p>
        </div>
      )}

      {(phase === 'ready' || phase === 'playing') && segments.length > 0 && (
        <div className="space-y-4">
          {/* Player */}
          <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-white/10 rounded-2xl p-6">
            {/* Now speaking */}
            <AnimatePresence mode="wait">
              <motion.div key={currentSeg} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-8 h-8 rounded-full ${curHost.bg} flex items-center justify-center font-black text-sm ${curHost.color}`}>
                    {curHost.name[0]}
                  </div>
                  <span className={`font-bold text-sm ${curHost.color}`}>{curHost.name}</span>
                  {isPlaying && <span className="flex gap-0.5 ml-1">{[0,1,2].map(i => (
                    <motion.span key={i} className={`w-1 rounded-full ${curHost.bg}`}
                      animate={{ height: ['4px','12px','4px'] }} transition={{ duration: 0.6, delay: i*0.15, repeat: Infinity }} />
                  ))}</span>}
                </div>
                <p className="text-white text-sm leading-relaxed">{segments[currentSeg]?.text}</p>
              </motion.div>
            </AnimatePresence>

            {/* Progress dots */}
            <div className="flex gap-1 flex-wrap mb-5">
              {segments.map((seg, i) => (
                <button key={i} onClick={() => { audioRef.current?.pause(); setCurrentSeg(i); setIsPlaying(false); }}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentSeg ? (seg.host === 'alex' ? 'bg-blue-400 w-4' : 'bg-rose-400 w-4') :
                    i < currentSeg ? 'bg-white/30' : 'bg-white/10'
                  }`} />
              ))}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between">
              <button onClick={skipPrev} disabled={currentSeg === 0}
                className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-30 transition-all">
                <SkipBack className="w-5 h-5" />
              </button>
              <button onClick={togglePlay}
                className="w-14 h-14 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/30 hover:brightness-110 transition-all">
                {isPlaying ? <Pause className="w-6 h-6 text-white" /> : <Play className="w-6 h-6 text-white ml-0.5" />}
              </button>
              <button onClick={skipNext} disabled={currentSeg >= segments.length - 1}
                className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-30 transition-all">
                <SkipForward className="w-5 h-5" />
              </button>
            </div>

            {/* Speed + restart */}
            <div className="flex items-center justify-between mt-4 text-xs text-slate-500">
              <button onClick={cycleSpeed}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition-all">
                <Volume2 className="w-3 h-3" /> {speed}x
              </button>
              <span>{currentSeg + 1} / {segments.length}</span>
              <button onClick={() => { audioRef.current?.pause(); setPhase('setup'); setSegments([]); setAudioUrls({}); }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-all">
                <RefreshCw className="w-3 h-3" /> New
              </button>
            </div>
          </div>

          {/* Chapters */}
          {chapters.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <button onClick={() => setShowChapters(s => !s)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm text-white font-bold hover:bg-white/5 transition-all">
                <span>Chapters ({chapters.length})</span>
                {showChapters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showChapters && (
                <div className="border-t border-white/10 divide-y divide-white/5">
                  {chapters.map((ch, i) => (
                    <button key={i} onClick={() => jumpToChapter(Math.min(ch.segment_index, segments.length - 1))}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/5 transition-all">
                      <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-black flex items-center justify-center">{i + 1}</span>
                      <span className="text-slate-300 text-sm">{ch.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Transcript */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-3">Transcript</p>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {segments.map((seg, i) => {
                const h = seg.host === 'alex' ? HOST_A : HOST_B;
                return (
                  <div key={i} className={`flex gap-2 ${i === currentSeg ? 'opacity-100' : 'opacity-50'}`}>
                    <span className={`text-xs font-bold w-8 flex-shrink-0 ${h.color}`}>{h.name}</span>
                    <p className="text-slate-300 text-xs leading-relaxed">{seg.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <audio ref={audioRef} />
    </div>
  );
}