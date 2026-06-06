import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Play, Pause, Loader2, Sparkles, ChevronRight, RotateCcw, Volume2 } from 'lucide-react';

const STEP_ICONS = ['🎯', '💡', '🔍', '⚙️', '📊', '✅', '🧠', '🔗'];

export default function ExplainerMode({ sources, notebook }) {
  const [phase, setPhase] = useState('setup'); // setup | generating | ready | playing
  const [topic, setTopic] = useState('');
  const [explainer, setExplainer] = useState(null); // { title, summary, steps: [{heading, body, visual}], audioUrl }
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const audioRef = useRef(null);
  const timerRef = useRef(null);

  const sourceText = sources.slice(0, 3).map(s => s.content_text || '').join('\n\n').slice(0, 4000);

  const generate = async () => {
    const subject = topic || notebook?.name || 'the topic';
    setError('');
    setPhase('generating');
    setProgress(20);

    try {
      // Generate structured explainer
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Create a clear, engaging explainer for a student about: "${subject}".
${sourceText ? `\nUse this source material:\n${sourceText}` : ''}

Rules:
- Make it suitable for a 45-60 second explainer
- Use simple, clear language
- Include real examples
- 4-6 steps max`,
        response_json_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            summary: { type: 'string' },
            steps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  heading: { type: 'string' },
                  body: { type: 'string' },
                  visual: { type: 'string', description: 'An emoji or short symbol representing this step visually' },
                  example: { type: 'string' }
                },
                required: ['heading', 'body', 'visual'],
                additionalProperties: false
              }
            },
            key_takeaway: { type: 'string' }
          },
          required: ['title', 'summary', 'steps', 'key_takeaway'],
          additionalProperties: false
        }
      });

      setProgress(60);

      // Build narration script
      const narrationParts = [
        `Today we're exploring: ${res.title}. ${res.summary}`,
        ...res.steps.map((s, i) => `Step ${i + 1}: ${s.heading}. ${s.body}${s.example ? ' For example: ' + s.example : ''}`),
        `Key takeaway: ${res.key_takeaway}`
      ];
      const fullNarration = narrationParts.join(' ... ');

      setProgress(70);

      // Generate audio
      let audioUrl = null;
      try {
        const audioRes = await base44.integrations.Core.GenerateSpeech({
          text: fullNarration.slice(0, 4800),
          voice: 'sunny',
        });
        audioUrl = audioRes.url;
      } catch { /* audio optional */ }

      setProgress(100);
      setExplainer({ ...res, audioUrl, narration: narrationParts });
      setCurrentStep(0);
      setPhase('ready');
    } catch (e) {
      setError('Failed to generate explainer: ' + e.message);
      setPhase('setup');
    }
  };

  // Auto-advance steps during playback
  useEffect(() => {
    if (!isPlaying || !explainer) return;
    const stepsCount = explainer.steps.length + 2; // intro + steps + takeaway
    const totalDuration = explainer.audioUrl ? null : 8000; // 8s per step if no audio

    if (!explainer.audioUrl) {
      timerRef.current = setInterval(() => {
        setCurrentStep(prev => {
          if (prev + 1 >= stepsCount) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, totalDuration / stepsCount);
    }

    return () => clearInterval(timerRef.current);
  }, [isPlaying, explainer]);

  // Audio playback sync
  useEffect(() => {
    if (!explainer?.audioUrl || !audioRef.current) return;
    if (isPlaying) {
      audioRef.current.src = explainer.audioUrl;
      audioRef.current.play().catch(() => {});

      const stepsCount = (explainer.steps?.length || 0) + 2;
      audioRef.current.onloadedmetadata = () => {
        const duration = audioRef.current.duration * 1000;
        const interval = duration / stepsCount;
        timerRef.current = setInterval(() => {
          if (!audioRef.current) return;
          const elapsed = audioRef.current.currentTime * 1000;
          const step = Math.min(Math.floor(elapsed / interval), stepsCount - 1);
          setCurrentStep(step);
        }, 300);
      };
      audioRef.current.onended = () => {
        setIsPlaying(false);
        clearInterval(timerRef.current);
      };
    } else {
      audioRef.current.pause();
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isPlaying]);

  const togglePlay = () => setIsPlaying(p => !p);
  const restart = () => { setCurrentStep(0); if (audioRef.current) audioRef.current.currentTime = 0; };

  const allSteps = explainer ? [
    { heading: explainer.title, body: explainer.summary, visual: '🎬', isIntro: true },
    ...(explainer.steps || []),
    { heading: 'Key Takeaway', body: explainer.key_takeaway, visual: '⭐', isTakeaway: true }
  ] : [];

  const step = allSteps[currentStep];

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div>
        <h2 className="text-white font-black text-xl mb-1 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" /> AI Explainer
        </h2>
        <p className="text-slate-400 text-sm">Animated step-by-step topic explainer with AI narration.</p>
      </div>

      {phase === 'setup' && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-slate-400 text-xs mb-1.5 block">What topic do you want explained?</label>
            <input value={topic} onChange={e => setTopic(e.target.value)}
              placeholder={notebook?.name || 'e.g. Photosynthesis, The French Revolution...'}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50" />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button onClick={generate}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25">
            <Sparkles className="w-4 h-4" /> Generate Explainer
          </button>
        </div>
      )}

      {phase === 'generating' && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center space-y-4">
          <Sparkles className="w-12 h-12 text-amber-400 mx-auto animate-pulse" />
          <p className="text-white font-bold">Creating your explainer...</p>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
              animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
          </div>
        </div>
      )}

      {(phase === 'ready' || phase === 'playing') && explainer && (
        <div className="space-y-4">
          {/* Main display */}
          <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
            {/* Visual panel */}
            <AnimatePresence mode="wait">
              <motion.div key={currentStep}
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -10 }}
                transition={{ duration: 0.35 }}
                className="p-8 text-center min-h-[200px] flex flex-col items-center justify-center">
                {/* Big visual */}
                <motion.div
                  animate={isPlaying ? { scale: [1, 1.05, 1], rotate: [0, 2, -2, 0] } : {}}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="text-7xl mb-5 select-none">
                  {step?.visual || '📚'}
                </motion.div>
                <h3 className="text-white font-black text-lg mb-2 leading-tight">{step?.heading}</h3>
                <p className="text-slate-300 text-sm leading-relaxed max-w-sm">{step?.body}</p>
                {step?.example && (
                  <div className="mt-3 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-200 text-xs">
                    Example: {step.example}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Step dots */}
            <div className="flex gap-1.5 justify-center pb-4">
              {allSteps.map((_, i) => (
                <button key={i} onClick={() => setCurrentStep(i)}
                  className={`transition-all rounded-full ${
                    i === currentStep ? 'w-6 h-2 bg-amber-400' : 'w-2 h-2 bg-white/20 hover:bg-white/40'
                  }`} />
              ))}
            </div>

            {/* Controls */}
            <div className="border-t border-white/10 px-6 py-4 flex items-center justify-between">
              <button onClick={restart}
                className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all">
                <RotateCcw className="w-4 h-4" />
              </button>
              <button onClick={togglePlay}
                className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30 hover:brightness-110 transition-all">
                {isPlaying ? <Pause className="w-6 h-6 text-white" /> : <Play className="w-6 h-6 text-white ml-0.5" />}
              </button>
              <button onClick={() => { setPhase('setup'); setExplainer(null); setIsPlaying(false); }}
                className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all text-xs font-medium">
                New
              </button>
            </div>
          </div>

          {/* Step list */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-3">Steps</p>
            <div className="space-y-1.5">
              {allSteps.map((s, i) => (
                <button key={i} onClick={() => setCurrentStep(i)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all ${
                    i === currentStep ? 'bg-amber-500/15 border border-amber-500/30' : 'hover:bg-white/5'
                  }`}>
                  <span className="text-lg flex-shrink-0">{s.visual}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${i === currentStep ? 'text-white' : 'text-slate-400'}`}>
                      {s.heading}
                    </p>
                  </div>
                  {i === currentStep && <ChevronRight className="w-4 h-4 text-amber-400 flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <audio ref={audioRef} />
    </div>
  );
}