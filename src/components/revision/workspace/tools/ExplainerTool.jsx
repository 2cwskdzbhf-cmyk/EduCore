import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Video, Play, Pause, Download, ChevronLeft, ChevronRight,
  Loader2, FileText, X, Volume2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SetupShell, LoadingScreen, ToolLabel, ToolSelect, Toggle, TopicRow, G } from './ToolSetupShell';

function getCtx(allSources) {
  return allSources.filter(s => s.content_text)
    .map(s => `### ${s.name}\n${s.content_text.slice(0, 3000)}`).join('\n\n---\n\n');
}

const VOICE_MAP = {
  simple: 'honey',
  gcse: 'river',
  alevel: 'storm',
};

// Animated scene card that simulates a "video frame"
function SceneCard({ scene, active }) {
  return (
    <AnimatePresence mode="wait">
      {active && (
        <motion.div key={scene.scene_number}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.35 }}
          className="rounded-2xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.5)', minHeight: '200px' }}>
          {/* Scene header bar */}
          <div className="px-5 py-3 flex items-center gap-3"
            style={{ background: 'linear-gradient(135deg,rgba(112,145,230,0.25),rgba(61,82,160,0.2))', borderBottom: '1px solid rgba(112,145,230,0.2)' }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white"
              style={{ background: 'linear-gradient(135deg,#7091E6,#3D52A0)' }}>{scene.scene_number}</div>
            <p className="font-bold text-sm flex-1" style={{ color: G.primary }}>{scene.title}</p>
          </div>
          {/* Visual cue */}
          {scene.visual_cue && (
            <div className="mx-5 mt-4 rounded-xl px-4 py-3 flex items-start gap-2"
              style={{ background: 'rgba(112,145,230,0.1)', border: '1px dashed rgba(112,145,230,0.35)' }}>
              <span className="text-lg">🎬</span>
              <p className="text-xs italic" style={{ color: G.secondary }}>{scene.visual_cue}</p>
            </div>
          )}
          {/* Narration */}
          <div className="px-5 py-4">
            <p className="text-sm leading-relaxed" style={{ color: G.primary }}>{scene.narration}</p>
          </div>
          {/* Key points */}
          {scene.key_points?.length > 0 && (
            <div className="px-5 pb-4 space-y-1.5">
              {scene.key_points.map((pt, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-2 text-xs"
                  style={{ color: G.primary }}>
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-black flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#7091E6,#3D52A0)' }}>{i + 1}</span>
                  {pt}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AudioPlayer({ url, onDownload }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => { setPlaying(false); setProgress(0); }, [url]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  };

  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-3 rounded-xl px-4 py-3"
      style={{ background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.35)' }}>
      <audio ref={audioRef} src={url}
        onTimeUpdate={e => setProgress(e.target.currentTime)}
        onLoadedMetadata={e => setDuration(e.target.duration)}
        onEnded={() => setPlaying(false)} />
      <button onClick={toggle}
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-md"
        style={{ background: 'linear-gradient(135deg,#7091E6,#3D52A0)' }}>
        {playing ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
      </button>
      <div className="flex-1">
        <input type="range" min={0} max={duration || 100} value={progress} step={0.1}
          onChange={e => { if (audioRef.current) audioRef.current.currentTime = Number(e.target.value); setProgress(Number(e.target.value)); }}
          className="w-full accent-[#7091E6] h-1" />
        <div className="flex justify-between text-xs mt-0.5" style={{ color: G.secondary }}>
          <span>{fmt(progress)}</span><span>{fmt(duration)}</span>
        </div>
      </div>
      {url && (
        <a href={url} download className="p-2 rounded-lg hover:bg-white/30 transition-all" style={{ color: G.accent }} title="Download narration">
          <Download className="w-3.5 h-3.5" />
        </a>
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
  const [genStatus, setGenStatus] = useState('');
  const [scenes, setScenes] = useState([]);
  const [audioUrls, setAudioUrls] = useState([]);
  const [activeScene, setActiveScene] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);

  const topic = customTopic.trim() || notebook.name;
  const hasSource = allSources.some(s => s.content_text);
  const sceneCount = { short: 4, medium: 6, long: 9 };
  const diffMap = { gcse: 'GCSE level', alevel: 'A-Level depth', simple: 'simple/beginner language' };

  const generate = async () => {
    setGenerating(true);
    setGenStatus('Writing explainer script…');
    const ctx = hasSource && !customTopic.trim() ? getCtx(allSources) : '';
    const voice = VOICE_MAP[difficulty] || 'river';

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Create a structured explainer video for: "${topic}".
- Audience: ${diffMap[difficulty]}
- Style: ${mode === 'stepbystep' ? 'step-by-step numbered process' : 'big-picture overview'}
- Number of scenes: ${sceneCount[length] || 6}
- Each scene needs: title, narration (2-4 sentences), visual_cue (what appears on screen), and 2-3 key_points as bullet points.
- Start with an INTRO scene (hook the viewer).
- End with an OUTRO scene (summary + call to action).
${ctx ? `\nSOURCE MATERIAL:\n${ctx.slice(0, 8000)}` : ''}`,
      response_json_schema: {
        type: 'object',
        properties: {
          scenes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                scene_number: { type: 'number' },
                title: { type: 'string' },
                narration: { type: 'string' },
                visual_cue: { type: 'string' },
                key_points: { type: 'array', items: { type: 'string' } },
              },
              required: ['scene_number', 'title', 'narration'],
            }
          }
        },
        required: ['scenes'],
      }
    });

    const sc = result?.scenes || [];
    setScenes(sc);

    // Generate audio narration for each scene
    const urls = [];
    for (let i = 0; i < sc.length; i++) {
      setGenStatus(`Generating narration — scene ${i + 1} of ${sc.length}…`);
      const audioRes = await base44.integrations.Core.GenerateSpeech({
        text: sc[i].narration.slice(0, 4800),
        voice,
      });
      urls.push(audioRes?.url || '');
    }
    setAudioUrls(urls);

    const fullText = sc.map(s => `## Scene ${s.scene_number}: ${s.title}\n\n${s.narration}\n\nVisual: ${s.visual_cue || ''}\n\nKey points:\n${(s.key_points || []).map(p => `- ${p}`).join('\n')}`).join('\n\n---\n\n');
    const res = await base44.entities.NotebookResource.create({
      notebook_id: notebook.id, student_email: user.email,
      title: `Explainer — ${topic}`,
      resource_type: 'video_overview', content: fullText,
      source_ids: allSources.map(s => s.id), source_count: allSources.length,
    });
    onResourceCreated(res);
    setActiveScene(0);
    setGenerating(false);
    setGenStatus('');
    setPhase('result');
  };

  if (generating) return <LoadingScreen label={genStatus || 'Generating Explainer…'} />;

  if (phase === 'result' && scenes.length > 0) {
    const scene = scenes[activeScene];
    const audioUrl = audioUrls[activeScene];

    return (
      <div className="flex flex-col h-full" style={{ background: 'linear-gradient(135deg, #EDE8F5 0%, #c8d4f5 100%)' }}>
        {/* Header */}
        <div className="flex-shrink-0 px-5 py-3 flex items-center justify-between gap-3"
          style={{ background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.3)' }}>
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4" style={{ color: G.accent }} />
            <h2 className="font-bold text-sm truncate" style={{ color: G.primary }}>Explainer — {topic}</h2>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => setShowTranscript(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{ background: showTranscript ? 'rgba(112,145,230,0.2)' : 'rgba(255,255,255,0.5)', border: '1px solid rgba(112,145,230,0.3)', color: G.primary }}>
              <FileText className="w-3.5 h-3.5" />
              {showTranscript ? 'Hide' : 'Transcript'}
            </button>
            <button onClick={() => { setPhase('setup'); setScenes([]); setAudioUrls([]); }}
              className="p-1.5 rounded-xl hover:bg-white/30 transition-all" style={{ color: G.secondary }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex-shrink-0 px-5 py-2 flex items-center gap-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.25)' }}>
          <span className="text-xs font-semibold" style={{ color: G.secondary }}>Scene {activeScene + 1}/{scenes.length}</span>
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(112,145,230,0.15)' }}>
            <div className="h-full rounded-full transition-all" style={{ background: 'linear-gradient(90deg,#7091E6,#3D52A0)', width: `${((activeScene + 1) / scenes.length) * 100}%` }} />
          </div>
        </div>

        {/* Scene content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Audio narration */}
          {audioUrl && <AudioPlayer url={audioUrl} />}

          {/* Animated scene card */}
          <div style={{ minHeight: '200px' }}>
            <SceneCard scene={scene} active={true} />
          </div>

          {/* Transcript */}
          {showTranscript && (
            <div className="rounded-2xl p-4 text-xs leading-relaxed"
              style={{ background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(112,145,230,0.2)', color: G.primary }}>
              <p className="font-bold uppercase tracking-widest mb-2 text-[10px]" style={{ color: G.secondary }}>Transcript</p>
              {scenes.map(s => (
                <p key={s.scene_number} className="mb-2"><strong style={{ color: G.accent }}>Scene {s.scene_number} — {s.title}:</strong> {s.narration}</p>
              ))}
            </div>
          )}
        </div>

        {/* Scene navigation */}
        <div className="flex-shrink-0 p-4 flex items-center justify-between gap-3"
          style={{ background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(16px)', borderTop: '1px solid rgba(255,255,255,0.3)' }}>
          <button onClick={() => setActiveScene(s => Math.max(0, s - 1))} disabled={activeScene === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-30"
            style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.4)', color: G.primary }}>
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <div className="flex gap-1.5">
            {scenes.map((_, i) => (
              <button key={i} onClick={() => setActiveScene(i)}
                className="w-2 h-2 rounded-full transition-all"
                style={{ background: i === activeScene ? G.accent : 'rgba(112,145,230,0.3)' }} />
            ))}
          </div>
          <button onClick={() => setActiveScene(s => Math.min(scenes.length - 1, s + 1))} disabled={activeScene === scenes.length - 1}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-30"
            style={{ background: 'linear-gradient(135deg,#7091E6,#3D52A0)', color: '#fff' }}>
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <SetupShell icon={Video} title="Explainer Video" subtitle="Animated scenes + narration audio for any topic"
      onGenerate={generate} generating={generating} generateLabel="🎬 Generate Explainer">
      <TopicRow customTopic={customTopic} setCustomTopic={setCustomTopic} allSources={allSources} />
      <div>
        <ToolLabel>Video Length</ToolLabel>
        <ToolSelect value={length} onChange={setLength} options={[
          { value: 'short', label: 'Short (4 scenes)' },
          { value: 'medium', label: 'Medium (6 scenes)' },
          { value: 'long', label: 'Long (9 scenes)' },
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
        <ToolLabel>Explanation Mode</ToolLabel>
        <ToolSelect value={mode} onChange={setMode} options={[
          { value: 'overview', label: 'Overview — big picture' },
          { value: 'stepbystep', label: 'Step-by-Step — numbered stages' },
        ]} />
      </div>
    </SetupShell>
  );
}