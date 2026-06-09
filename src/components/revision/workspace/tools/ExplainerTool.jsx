import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Video, Play, Pause, Download, Loader2,
  ChevronLeft, ChevronRight, FileText, Volume2, VolumeX
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SetupShell, LoadingScreen, ToolLabel, ToolSelect, Toggle, TopicRow, G } from './ToolSetupShell';

function getCtx(allSources) {
  return allSources.filter(s => s.content_text)
    .map(s => `### ${s.name}\n${s.content_text.slice(0, 4000)}`).join('\n\n---\n\n');
}

const VOICE_BY_STYLE = { overview: 'river', stepbystep: 'storm' };
const DIFF_VOICE = { simple: 'sunny', gcse: 'river', alevel: 'storm' };

// Animated scene viewer — shows key points with entrance animations
function SceneViewer({ scenes, audioUrl }) {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  const scene = scenes[idx];
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  const toggleAudio = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); } else { a.play(); setPlaying(true); }
  };

  return (
    <div className="space-y-3">
      {/* Video-style scene area */}
      <div className="relative rounded-2xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #3D52A0 0%, #7091E6 100%)', minHeight: 220, border: '1px solid rgba(255,255,255,0.3)' }}>

        {/* Scene number badge */}
        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-xs font-bold text-white"
          style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)' }}>
          Scene {idx + 1} / {scenes.length}
        </div>

        {/* Scene content */}
        <AnimatePresence mode="wait">
          <motion.div key={idx}
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center justify-center p-8 text-center min-h-[220px]">

            {/* Scene title */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
              className="text-white font-black text-xl mb-3 leading-tight" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
              {scene?.title}
            </motion.div>

            {/* Key points with staggered animation */}
            <div className="space-y-2 w-full max-w-xs">
              {(scene?.key_points || []).map((pt, i) => (
                <motion.div key={i} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 + i * 0.12 }}
                  className="flex items-start gap-2 text-left rounded-xl px-3 py-2"
                  style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
                  <span className="text-white font-black text-sm flex-shrink-0">→</span>
                  <span className="text-white text-sm">{pt}</span>
                </motion.div>
              ))}
            </div>

            {/* Visual cue label */}
            {scene?.visual_cue && (
              <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}
                className="mt-3 px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.3)' }}>
                🎬 {scene.visual_cue}
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Scene navigation arrows */}
        <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
          style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)' }}>
          <ChevronLeft className="w-4 h-4 text-white" />
        </button>
        <button onClick={() => setIdx(i => Math.min(scenes.length - 1, i + 1))} disabled={idx === scenes.length - 1}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
          style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)' }}>
          <ChevronRight className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Scene dots */}
      <div className="flex justify-center gap-1.5">
        {scenes.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)}
            className="rounded-full transition-all"
            style={{ width: i === idx ? 20 : 8, height: 8, background: i === idx ? '#7091E6' : 'rgba(112,145,230,0.3)' }} />
        ))}
      </div>

      {/* Audio player */}
      {audioUrl && (
        <div className="rounded-2xl p-4 space-y-3"
          style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.4)' }}>
          <audio ref={audioRef} src={audioUrl}
            onTimeUpdate={() => setProgress(audioRef.current?.currentTime || 0)}
            onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
            onEnded={() => setPlaying(false)} />
          <div className="flex items-center gap-3">
            <button onClick={toggleAudio}
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #7091E6, #3D52A0)' }}>
              {playing ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
            </button>
            <div className="flex-1 space-y-1">
              <div className="h-1.5 rounded-full overflow-hidden cursor-pointer"
                style={{ background: 'rgba(112,145,230,0.2)' }}
                onClick={e => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = (e.clientX - rect.left) / rect.width;
                  if (audioRef.current) audioRef.current.currentTime = pct * duration;
                }}>
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${duration > 0 ? (progress / duration) * 100 : 0}%`, background: 'linear-gradient(90deg, #7091E6, #3D52A0)' }} />
              </div>
              <div className="flex justify-between text-xs" style={{ color: G.secondary }}>
                <span>{fmt(progress)}</span><span>🎙️ Narration</span><span>{fmt(duration)}</span>
              </div>
            </div>
            <a href={audioUrl} download="explainer-narration.mp3"
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105"
              style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(112,145,230,0.3)' }}>
              <Download className="w-3.5 h-3.5" style={{ color: G.accent }} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExplainerTool({ notebook, user, allSources, onResourceCreated }) {
  const [phase, setPhase] = useState('setup');
  const [customTopic, setCustomTopic] = useState('');
  const [length, setLength] = useState('medium');
  const [difficulty, setDifficulty] = useState('gcse');
  const [mode, setMode] = useState('overview');
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState('');
  const [scenes, setScenes] = useState([]);
  const [audioUrl, setAudioUrl] = useState('');
  const [fullScript, setFullScript] = useState('');
  const [showTranscript, setShowTranscript] = useState(false);

  const topic = customTopic.trim() || notebook.name;
  const hasSource = allSources.some(s => s.content_text);
  const sceneCounts = { short: 3, medium: 5, long: 7 };

  const generate = async () => {
    setGenerating(true);
    setGenStep('Building explainer scenes…');
    const ctx = hasSource && !customTopic.trim() ? getCtx(allSources) : '';
    const numScenes = sceneCounts[length] || 5;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Create an animated explainer video content plan for: "${topic}".
- Difficulty: ${difficulty}
- Style: ${mode === 'overview' ? 'overview, big picture' : 'step-by-step numbered stages'}
- Number of scenes: ${numScenes}
- Each scene should have a punchy title, 2-3 key bullet points, and a visual cue description.
- Also produce a clean narration_script for the full video (natural spoken English, no markdown, under 400 words total).
${ctx ? `\n\nSOURCE MATERIAL:\n${ctx.slice(0, 8000)}` : ''}`,
      response_json_schema: {
        type: 'object',
        properties: {
          scenes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                key_points: { type: 'array', items: { type: 'string' } },
                visual_cue: { type: 'string' },
                narration: { type: 'string' },
              },
              required: ['title', 'key_points', 'visual_cue', 'narration'],
            }
          },
          narration_script: { type: 'string' },
        },
        required: ['scenes', 'narration_script'],
      }
    });

    const sceneData = result?.scenes || [];
    const script = result?.narration_script || sceneData.map(s => s.narration).join(' ');
    setScenes(sceneData);
    setFullScript(script);

    setGenStep('Generating audio narration…');
    const voiceKey = DIFF_VOICE[difficulty] || 'river';
    const speechResult = await base44.integrations.Core.GenerateSpeech({
      text: script.slice(0, 4500),
      voice: voiceKey,
    });
    setAudioUrl(speechResult?.url || '');

    const res = await base44.entities.NotebookResource.create({
      notebook_id: notebook.id, student_email: user.email,
      title: `Explainer — ${topic}`,
      resource_type: 'video_overview', content: script,
      source_ids: allSources.map(s => s.id), source_count: allSources.length,
    });
    onResourceCreated(res);
    setGenerating(false);
    setGenStep('');
    setPhase('result');
  };

  if (generating) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 p-8">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-2xl animate-pulse"
          style={{ background: 'linear-gradient(135deg, #7091E6, #3D52A0)' }} />
        <Video className="absolute inset-0 m-auto w-8 h-8 text-white" />
      </div>
      <p className="font-semibold text-sm" style={{ color: G.primary }}>{genStep}</p>
      <p className="text-xs" style={{ color: G.secondary }}>Building your animated explainer…</p>
    </div>
  );

  if (phase === 'result' && scenes.length > 0) {
    return (
      <div className="flex flex-col h-full" style={{ background: 'linear-gradient(135deg, #EDE8F5 0%, #c8d4f5 100%)' }}>
        {/* Header */}
        <div className="flex-shrink-0 px-4 py-3 flex items-center justify-between"
          style={{ background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.3)' }}>
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4" style={{ color: G.accent }} />
            <span className="font-bold text-sm" style={{ color: G.primary }}>Explainer — {topic}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowTranscript(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{ background: showTranscript ? 'rgba(112,145,230,0.2)' : 'rgba(255,255,255,0.5)', border: '1px solid rgba(112,145,230,0.3)', color: G.primary }}>
              <FileText className="w-3 h-3" />{showTranscript ? 'Hide Transcript' : 'View Transcript'}
            </button>
            <button onClick={() => { setPhase('setup'); setScenes([]); setAudioUrl(''); setFullScript(''); }}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(112,145,230,0.25)', color: G.secondary }}>
              ← Back
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <SceneViewer scenes={scenes} audioUrl={audioUrl} />

          {/* Transcript */}
          {showTranscript && fullScript && (
            <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.4)' }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: G.secondary }}>📄 Narration Transcript</p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: G.primary }}>{fullScript}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <SetupShell icon={Video} title="Explainer Video" subtitle="Animated scenes with real audio narration" onGenerate={generate} generating={generating} generateLabel="🎬 Generate Explainer">
      <TopicRow customTopic={customTopic} setCustomTopic={setCustomTopic} allSources={allSources} />
      <div>
        <ToolLabel>Video Length</ToolLabel>
        <ToolSelect value={length} onChange={setLength} options={[
          { value: 'short', label: 'Short (3 scenes)' },
          { value: 'medium', label: 'Medium (5 scenes)' },
          { value: 'long', label: 'Long (7 scenes)' },
        ]} />
      </div>
      <div>
        <ToolLabel>Difficulty Level</ToolLabel>
        <ToolSelect value={difficulty} onChange={setDifficulty} options={[
          { value: 'simple', label: 'Simple / Beginner' },
          { value: 'gcse', label: 'GCSE' },
          { value: 'alevel', label: 'A-Level' },
        ]} />
      </div>
      <div>
        <ToolLabel>Explanation Style</ToolLabel>
        <ToolSelect value={mode} onChange={setMode} options={[
          { value: 'overview', label: 'Overview — big picture' },
          { value: 'stepbystep', label: 'Step-by-Step — numbered stages' },
        ]} />
      </div>
    </SetupShell>
  );
}