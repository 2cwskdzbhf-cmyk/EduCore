import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Play, Pause, Loader2, Video, ChevronRight, RotateCcw, Sparkles } from 'lucide-react';

// Renders an animated "slide" with diagram + narration
function SlideRenderer({ slide, isActive }) {
  if (!slide) return null;
  return (
    <AnimatePresence mode="wait">
      {isActive && (
        <motion.div
          key={slide.title}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0 p-6 flex flex-col"
        >
          {/* Slide number + type pill */}
          <div className="flex items-center justify-between mb-4">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              slide.type === 'intro' ? 'bg-violet-500/30 text-violet-200' :
              slide.type === 'concept' ? 'bg-blue-500/30 text-blue-200' :
              slide.type === 'example' ? 'bg-emerald-500/30 text-emerald-200' :
              'bg-amber-500/30 text-amber-200'
            }`}>{slide.type?.toUpperCase()}</span>
            <span className="text-slate-600 text-xs">{slide.duration}s</span>
          </div>

          {/* Title */}
          <h3 className="text-white font-black text-xl mb-4 leading-tight">{slide.title}</h3>

          {/* Diagram area */}
          <div className="flex-1 flex items-center justify-center mb-4">
            <DiagramRenderer diagram={slide.diagram} />
          </div>

          {/* Key point */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <p className="text-slate-200 text-sm leading-relaxed">{slide.narration}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DiagramRenderer({ diagram }) {
  if (!diagram) return null;

  if (diagram.type === 'steps') {
    return (
      <div className="flex flex-col gap-2 w-full max-w-sm">
        {(diagram.items || []).map((item, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.15 }}
            className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-violet-500 flex items-center justify-center text-white text-xs font-black flex-shrink-0">{i + 1}</div>
            <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
              <p className="text-white text-sm font-semibold">{item.label}</p>
              {item.detail && <p className="text-slate-400 text-xs mt-0.5">{item.detail}</p>}
            </div>
          </motion.div>
        ))}
      </div>
    );
  }

  if (diagram.type === 'compare') {
    return (
      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        {(diagram.items || []).map((item, i) => (
          <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}
            className={`rounded-xl p-3 border text-center ${i % 2 === 0 ? 'bg-blue-500/10 border-blue-500/20' : 'bg-violet-500/10 border-violet-500/20'}`}>
            <p className={`text-sm font-bold ${i % 2 === 0 ? 'text-blue-300' : 'text-violet-300'}`}>{item.label}</p>
            {item.detail && <p className="text-slate-400 text-xs mt-1">{item.detail}</p>}
          </motion.div>
        ))}
      </div>
    );
  }

  if (diagram.type === 'list') {
    return (
      <div className="space-y-2 w-full max-w-sm">
        {(diagram.items || []).map((item, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
            className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-violet-400 flex-shrink-0" />
            <div>
              <span className="text-white text-sm font-semibold">{item.label}</span>
              {item.detail && <span className="text-slate-400 text-xs ml-2">{item.detail}</span>}
            </div>
          </motion.div>
        ))}
      </div>
    );
  }

  // Fallback: big concept pill
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {(diagram.items || []).map((item, i) => (
        <motion.div key={i} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}
          className="px-4 py-2 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30 text-violet-200 text-sm font-semibold">
          {item.label}
        </motion.div>
      ))}
    </div>
  );
}

export default function ExplainerVideo({ notebooks, sources }) {
  const [phase, setPhase] = useState('setup');
  const [selectedNotebook, setSelectedNotebook] = useState(null);
  const [slides, setSlides] = useState([]);
  const [audioUrls, setAudioUrls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  const timerRef = useRef(null);

  const notebookSources = selectedNotebook
    ? sources.filter(s => s.notebook_id === selectedNotebook.id && s.content_text)
    : [];
  const sourceContext = notebookSources.map(s => s.content_text?.slice(0, 600)).join('\n').slice(0, 2000);

  const generate = async () => {
    if (!selectedNotebook || !sourceContext) return;
    setLoading(true);
    setPhase('generating');
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Create a 4-slide visual explainer video script for the topic: "${selectedNotebook.name} - ${selectedNotebook.subject || 'General'}"

Source material: ${sourceContext}

Each slide needs a visual diagram and narration. Types: intro, concept, example, summary.

Return JSON:
{
  "title": "video title",
  "slides": [
    {
      "type": "intro|concept|example|summary",
      "title": "slide title",
      "narration": "spoken explanation, 1-2 clear sentences",
      "duration": 10,
      "diagram": {
        "type": "steps|compare|list|concepts",
        "items": [{"label": "...", "detail": "..."}]
      }
    }
  ]
}

Rules:
- Exactly 4 slides
- type: intro, concept, example, summary (in that order)
- diagram items: 3-5 items max, short labels
- narration: clear, concise, educational
- duration: 8-15 seconds per slide`,
        response_json_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            slides: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  title: { type: 'string' },
                  narration: { type: 'string' },
                  duration: { type: 'number' },
                  diagram: {
                    type: 'object',
                    properties: {
                      type: { type: 'string' },
                      items: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            label: { type: 'string' },
                            detail: { type: 'string' }
                          },
                          required: ['label', 'detail'],
                          additionalProperties: false
                        }
                      }
                    },
                    required: ['type', 'items'],
                    additionalProperties: false
                  }
                },
                required: ['type', 'title', 'narration', 'duration', 'diagram'],
                additionalProperties: false
              }
            }
          },
          required: ['title', 'slides'],
          additionalProperties: false
        }
      });

      setSlides(res.slides);

      // Generate narration audio
      const urls = [];
      for (let i = 0; i < res.slides.length; i++) {
        setAudioProgress(Math.round((i / res.slides.length) * 100));
        try {
          const audio = await base44.integrations.Core.GenerateSpeech({
            text: res.slides[i].narration,
            voice: 'river',
          });
          urls.push(audio.url);
        } catch {
          urls.push(null);
        }
      }
      setAudioUrls(urls);
      setCurrentSlide(0);
      setPhase('playing');
    } catch (e) {
      console.error(e);
      setPhase('setup');
    }
    setLoading(false);
  };

  const playSlide = (idx) => {
    setCurrentSlide(idx);
    clearTimeout(timerRef.current);
    if (audioRef.current && audioUrls[idx]) {
      audioRef.current.src = audioUrls[idx];
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const onAudioEnded = () => {
    const nextIdx = currentSlide + 1;
    if (nextIdx < slides.length) {
      playSlide(nextIdx);
    } else {
      setIsPlaying(false);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
    else {
      if (audioRef.current.src) { audioRef.current.play(); setIsPlaying(true); }
      else playSlide(currentSlide);
    }
  };

  if (phase === 'setup') {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h2 className="text-white font-black text-xl mb-1">AI Explainer Videos</h2>
          <p className="text-slate-400 text-sm">Generate animated visual explanations from your notes with narration.</p>
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
              <p className="text-slate-500 text-sm text-center py-4">Add sources to a notebook first.</p>
            )}
          </div>
          <button onClick={generate} disabled={!selectedNotebook || loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:brightness-110 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-violet-500/25">
            <Sparkles className="w-4 h-4" /> Generate Explainer Video
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto space-y-4">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-xl animate-pulse">
          <Video className="w-10 h-10 text-white" />
        </div>
        <p className="text-white font-bold text-xl">Building your video...</p>
        <p className="text-slate-400 text-sm">Generating slides + narration audio</p>
        <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full"
            animate={{ width: `${audioProgress}%` }} />
        </div>
        <p className="text-slate-500 text-xs">{audioProgress}%</p>
      </div>
    );
  }

  // Player
  const totalDuration = slides.reduce((s, sl) => s + (sl.duration || 10), 0);
  return (
    <div className="max-w-xl mx-auto space-y-4">
      <audio ref={audioRef} onEnded={onAudioEnded} />

      {/* Video canvas */}
      <div className="relative bg-gradient-to-br from-slate-900 to-violet-950 border border-violet-500/20 rounded-2xl overflow-hidden"
        style={{ aspectRatio: '16/9' }}>
        <div className="absolute inset-0">
          {slides.map((slide, i) => (
            <SlideRenderer key={i} slide={slide} isActive={currentSlide === i} />
          ))}
        </div>

        {/* Slide dots */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {slides.map((_, i) => (
            <button key={i} onClick={() => playSlide(i)}
              className={`transition-all rounded-full ${i === currentSlide ? 'w-5 h-2 bg-violet-400' : 'w-2 h-2 bg-white/20 hover:bg-white/40'}`} />
          ))}
        </div>

        {/* Play overlay when stopped */}
        {!isPlaying && (
          <button onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-all">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Play className="w-8 h-8 text-white ml-1" />
            </div>
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-white font-bold text-sm truncate">{slides[currentSlide]?.title}</p>
          <span className="text-slate-500 text-xs ml-2 flex-shrink-0">{currentSlide + 1}/{slides.length}</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => playSlide(Math.max(0, currentSlide - 1))}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-white transition-all">
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
          <button onClick={togglePlay}
            className="flex-1 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-400 text-white font-bold text-sm transition-all flex items-center justify-center gap-2">
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button onClick={() => playSlide(Math.min(slides.length - 1, currentSlide + 1))}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-white transition-all">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Slide list */}
      <div className="bg-white/5 border border-white/10 rounded-2xl divide-y divide-white/5 overflow-hidden">
        {slides.map((slide, i) => (
          <button key={i} onClick={() => playSlide(i)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-white/5 transition-all ${currentSlide === i ? 'bg-violet-500/10' : ''}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${currentSlide === i ? 'bg-violet-500 text-white' : 'bg-white/10 text-slate-400'}`}>{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold truncate ${currentSlide === i ? 'text-violet-200' : 'text-slate-300'}`}>{slide.title}</p>
              <p className="text-slate-600 text-xs">{slide.duration}s · {slide.type}</p>
            </div>
          </button>
        ))}
      </div>

      <button onClick={() => { setPhase('setup'); setSlides([]); setAudioUrls([]); setIsPlaying(false); }}
        className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 text-sm transition-all flex items-center justify-center gap-2">
        <RotateCcw className="w-3.5 h-3.5" /> Generate New Video
      </button>
    </div>
  );
}