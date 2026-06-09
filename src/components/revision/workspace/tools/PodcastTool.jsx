import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Mic2, Play, Pause, Download, ChevronDown, ChevronRight,
  Loader2, FileText, X
} from 'lucide-react';
import { SetupShell, LoadingScreen, ToolLabel, ToolSelect, TopicRow, G } from './ToolSetupShell';

function getCtx(allSources) {
  return allSources.filter(s => s.content_text)
    .map(s => `### ${s.name}\n${s.content_text.slice(0, 4000)}`).join('\n\n---\n\n');
}

// Voice mapping: Alex = storm (authoritative), Sam = honey (warm)
const VOICE_A = 'storm';
const VOICE_B = 'honey';

function AudioPlayer({ url, title }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  };

  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <div className="rounded-2xl p-5 space-y-4"
      style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.4)' }}>
      <audio ref={audioRef} src={url}
        onTimeUpdate={() => setProgress(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => setPlaying(false)} />

      {/* Waveform visual */}
      <div className="flex items-center gap-1 justify-center h-10">
        {Array.from({ length: 32 }).map((_, i) => (
          <div key={i} className="rounded-full transition-all"
            style={{
              width: 3,
              background: progress > 0 && (i / 32) < (progress / Math.max(duration, 1))
                ? 'linear-gradient(180deg, #7091E6, #3D52A0)'
                : 'rgba(112,145,230,0.25)',
              height: `${20 + Math.sin(i * 0.9) * 14 + Math.cos(i * 1.7) * 8}px`,
            }} />
        ))}
      </div>

      {/* Progress bar */}
      <div>
        <div className="h-1.5 rounded-full overflow-hidden cursor-pointer"
          style={{ background: 'rgba(112,145,230,0.2)' }}
          onClick={e => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            if (audioRef.current) { audioRef.current.currentTime = pct * duration; }
          }}>
          <div className="h-full rounded-full transition-all"
            style={{ width: `${duration > 0 ? (progress / duration) * 100 : 0}%`, background: 'linear-gradient(90deg, #7091E6, #3D52A0)' }} />
        </div>
        <div className="flex justify-between text-xs mt-1" style={{ color: G.secondary }}>
          <span>{fmt(progress)}</span><span>{fmt(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold truncate flex-1 mr-3" style={{ color: G.primary }}>{title}</p>
        <div className="flex items-center gap-2">
          <button onClick={toggle}
            className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #7091E6, #3D52A0)' }}>
            {playing ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white ml-0.5" />}
          </button>
          <a href={url} download={`${title}.mp3`}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105"
            style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(112,145,230,0.3)' }}>
            <Download className="w-4 h-4" style={{ color: G.accent }} />
          </a>
        </div>
      </div>
    </div>
  );
}

export default function PodcastTool({ notebook, user, allSources, onResourceCreated }) {
  const [phase, setPhase] = useState('setup');
  const [customTopic, setCustomTopic] = useState('');
  const [tone, setTone] = useState('exam_focused');
  const [length, setLength] = useState('medium');
  const [difficulty, setDifficulty] = useState('gcse');
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [chapters, setChapters] = useState([]);
  const [showScript, setShowScript] = useState(false);
  const [activeChapter, setActiveChapter] = useState(0);

  const topic = customTopic.trim() || notebook.name;
  const hasSource = allSources.some(s => s.content_text);
  const toneMap = { fun: 'fun, enthusiastic, and humorous', serious: 'professional and informative', exam_focused: 'exam-focused, concise, and revision-driven' };
  const lengthMap = { short: '3 chapters, ~150 words each', medium: '4 chapters, ~200 words each', long: '5 chapters, ~250 words each' };
  const diffMap = { simple: 'simple language', gcse: 'GCSE level', alevel: 'A-Level depth' };

  const generate = async () => {
    setGenerating(true);
    setGenStep('Writing script…');
    const ctx = hasSource && !customTopic.trim() ? getCtx(allSources) : '';

    // Step 1: Generate script
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Write a two-host podcast episode between hosts Alex and Sam about: "${topic}".
- Tone: ${toneMap[tone]}
- Length: ${lengthMap[length]}
- Difficulty: ${diffMap[difficulty]}
- Each chapter must have a clear title and dialogue alternating between Alex and Sam.
- Keep each speaker turn SHORT (1–2 sentences max) for natural flow.
- Start with INTRO chapter, end with OUTRO chapter.
- Alex and Sam lines must be labelled exactly as "Alex: ..." and "Sam: ..."
${ctx ? `\n\nSOURCE MATERIAL:\n${ctx.slice(0, 8000)}` : ''}`,
      response_json_schema: {
        type: 'object',
        properties: {
          chapters: {
            type: 'array',
            items: {
              type: 'object',
              properties: { title: { type: 'string' }, content: { type: 'string' } },
              required: ['title', 'content'],
            }
          }
        },
        required: ['chapters'],
      }
    });

    const chs = result?.chapters || [];
    setChapters(chs);

    // Step 2: Build combined narration text (interleave voices)
    // We generate ONE audio by concatenating all dialogue into a single narrated script
    // voiced by a single narrator (the TTS limit is one voice per call).
    // We generate chapter-by-chapter and combine.
    setGenStep('Generating audio (this may take a moment)…');

    // Build full script as plain readable text for TTS
    const fullScript = chs.map(ch => {
      const lines = ch.content.split('\n').filter(l => l.trim());
      const narrated = lines.map(l => {
        if (l.startsWith('Alex:')) return l.replace('Alex:', 'Alex says:');
        if (l.startsWith('Sam:')) return l.replace('Sam:', 'Sam says:');
        return l;
      }).join(' ');
      return `Chapter: ${ch.title}. ${narrated}`;
    }).join('. ');

    // Truncate to 4500 chars (TTS limit is 5000)
    const ttsText = fullScript.slice(0, 4500);

    const speechResult = await base44.integrations.Core.GenerateSpeech({
      text: ttsText,
      voice: tone === 'fun' ? 'sunny' : tone === 'serious' ? 'storm' : 'river',
    });

    const url = speechResult?.url || '';
    setAudioUrl(url);

    // Save resource
    const fullText = chs.map(ch => `## ${ch.title}\n\n${ch.content}`).join('\n\n---\n\n');
    const res = await base44.entities.NotebookResource.create({
      notebook_id: notebook.id, student_email: user.email,
      title: `Podcast — ${topic}`,
      resource_type: 'audio_overview', content: fullText,
      source_ids: allSources.map(s => s.id), source_count: allSources.length,
    });
    onResourceCreated(res);
    setGenerating(false);
    setGenStep('');
    setPhase('result');
  };

  if (generating) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 p-8">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="w-1.5 rounded-full animate-pulse"
            style={{ height: 20 + i * 6, background: 'linear-gradient(180deg, #7091E6, #3D52A0)', animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>
      <p className="font-semibold text-sm" style={{ color: G.primary }}>{genStep}</p>
    </div>
  );

  if (phase === 'result') {
    const renderDialogue = (text) => text.split('\n').map((line, i) => {
      const isAlex = line.startsWith('Alex:');
      const isSam = line.startsWith('Sam:');
      if (!isAlex && !isSam) return line ? <p key={i} className="text-xs italic mb-1" style={{ color: G.secondary }}>{line}</p> : null;
      const colon = line.indexOf(':');
      const speaker = line.slice(0, colon);
      const words = line.slice(colon + 1);
      return (
        <div key={i} className="mb-2 flex gap-2">
          <span className="text-xs font-black flex-shrink-0 w-8" style={{ color: isAlex ? G.accent : G.primary }}>{speaker}</span>
          <span className="text-sm" style={{ color: G.primary }}>{words}</span>
        </div>
      );
    });

    return (
      <div className="flex flex-col h-full" style={{ background: 'linear-gradient(135deg, #EDE8F5 0%, #c8d4f5 100%)' }}>
        {/* Header */}
        <div className="flex-shrink-0 px-4 py-3 flex items-center justify-between"
          style={{ background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.3)' }}>
          <div className="flex items-center gap-2">
            <Mic2 className="w-4 h-4" style={{ color: G.accent }} />
            <span className="font-bold text-sm" style={{ color: G.primary }}>Podcast — {topic}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowScript(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{ background: showScript ? 'rgba(112,145,230,0.2)' : 'rgba(255,255,255,0.5)', border: '1px solid rgba(112,145,230,0.3)', color: G.primary }}>
              <FileText className="w-3 h-3" />{showScript ? 'Hide Script' : 'Show Script'}
            </button>
            <button onClick={() => { setPhase('setup'); setAudioUrl(''); setChapters([]); }}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(112,145,230,0.25)', color: G.secondary }}>
              ← Back
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Audio player — always visible */}
          {audioUrl && <AudioPlayer url={audioUrl} title={`Podcast — ${topic}`} />}

          {/* Chapter nav */}
          <div className="flex gap-2 flex-wrap">
            {chapters.map((ch, i) => (
              <button key={i} onClick={() => setActiveChapter(i)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: activeChapter === i ? 'linear-gradient(135deg, #7091E6, #3D52A0)' : 'rgba(255,255,255,0.5)',
                  color: activeChapter === i ? '#fff' : G.primary,
                  border: '1px solid rgba(255,255,255,0.3)',
                }}>
                {ch.title}
              </button>
            ))}
          </div>

          {/* Script (hidden by default) */}
          {showScript && chapters[activeChapter] && (
            <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.4)' }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: G.secondary }}>
                📄 Script — {chapters[activeChapter].title}
              </p>
              <div>{renderDialogue(chapters[activeChapter].content)}</div>
            </div>
          )}

          {!audioUrl && (
            <div className="rounded-2xl p-6 text-center" style={{ background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.3)' }}>
              <p style={{ color: G.secondary }} className="text-sm">Audio generation failed. Showing script only.</p>
              {chapters[activeChapter] && (
                <div className="mt-4 text-left">{renderDialogue(chapters[activeChapter].content)}</div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <SetupShell icon={Mic2} title="Podcast Mode" subtitle="Generate a real audio podcast episode" onGenerate={generate} generating={generating} generateLabel="🎙️ Generate Podcast Audio">
      <TopicRow customTopic={customTopic} setCustomTopic={setCustomTopic} allSources={allSources} />
      <div>
        <ToolLabel>Tone</ToolLabel>
        <ToolSelect value={tone} onChange={setTone} options={[
          { value: 'fun', label: 'Fun & Enthusiastic 🎉' },
          { value: 'serious', label: 'Serious & Professional 📘' },
          { value: 'exam_focused', label: 'Exam-Focused & Concise 🎯' },
        ]} />
      </div>
      <div>
        <ToolLabel>Episode Length</ToolLabel>
        <ToolSelect value={length} onChange={setLength} options={[
          { value: 'short', label: 'Short (3 chapters)' },
          { value: 'medium', label: 'Medium (4 chapters)' },
          { value: 'long', label: 'Long (5 chapters)' },
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
    </SetupShell>
  );
}