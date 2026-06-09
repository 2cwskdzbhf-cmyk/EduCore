import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Mic2, Play, Pause, Download, ChevronDown, ChevronRight,
  Loader2, FileText, X, Volume2
} from 'lucide-react';
import { SetupShell, LoadingScreen, ToolLabel, ToolSelect, TopicRow, G } from './ToolSetupShell';

function getCtx(allSources) {
  return allSources.filter(s => s.content_text)
    .map(s => `### ${s.name}\n${s.content_text.slice(0, 3000)}`).join('\n\n---\n\n');
}

// Map voice style → GenerateSpeech voice names
const VOICE_MAP = {
  friendly:  { alex: 'honey',  sam: 'sunny'  },
  serious:   { alex: 'storm',  sam: 'river'  },
  energetic: { alex: 'spark',  sam: 'sunny'  },
};

function AudioPlayer({ url, label, onDownload }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    setPlaying(false);
    setProgress(0);
  }, [url]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  };

  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.4)' }}>
      <audio ref={audioRef} src={url}
        onTimeUpdate={e => setProgress(e.target.currentTime)}
        onLoadedMetadata={e => setDuration(e.target.duration)}
        onEnded={() => setPlaying(false)} />
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#7091E6,#3D52A0)' }}>
          <Volume2 className="w-5 h-5 text-white" />
        </div>
        <p className="font-bold text-sm flex-1 truncate" style={{ color: G.primary }}>{label}</p>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={toggle}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-md"
          style={{ background: 'linear-gradient(135deg,#7091E6,#3D52A0)' }}>
          {playing
            ? <Pause className="w-4 h-4 text-white" />
            : <Play className="w-4 h-4 text-white ml-0.5" />}
        </button>
        <div className="flex-1">
          <input type="range" min={0} max={duration || 100} value={progress} step={0.1}
            onChange={e => { if (audioRef.current) audioRef.current.currentTime = Number(e.target.value); setProgress(Number(e.target.value)); }}
            className="w-full accent-[#7091E6] h-1.5" />
          <div className="flex justify-between text-xs mt-0.5" style={{ color: G.secondary }}>
            <span>{fmt(progress)}</span><span>{fmt(duration)}</span>
          </div>
        </div>
        <a href={url} download className="p-2 rounded-xl transition-all hover:bg-white/30"
          style={{ border: '1px solid rgba(112,145,230,0.3)', color: G.accent }} title="Download">
          <Download className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}

export default function PodcastTool({ notebook, user, allSources, onResourceCreated }) {
  const [phase, setPhase] = useState('setup');
  const [customTopic, setCustomTopic] = useState('');
  const [tone, setTone] = useState('friendly');
  const [length, setLength] = useState('medium');
  const [difficulty, setDifficulty] = useState('gcse');
  const [generating, setGenerating] = useState(false);
  const [genStatus, setGenStatus] = useState('');
  const [chapters, setChapters] = useState([]);
  const [audioUrls, setAudioUrls] = useState([]);
  const [activeChapter, setActiveChapter] = useState(0);
  const [showScript, setShowScript] = useState(false);

  const topic = customTopic.trim() || notebook.name;
  const hasSource = allSources.some(s => s.content_text);
  const lengthMap = { short: '3 chapters', medium: '5 chapters', long: '7 chapters' };
  const diffMap = { simple: 'simple language', gcse: 'GCSE level', alevel: 'A-Level depth' };

  // Extract plain narration text for TTS (strips "Alex:" / "Sam:" labels into one voice)
  const toNarration = (content) =>
    content.split('\n').filter(l => l.trim()).map(l => l.replace(/^(Alex|Sam):\s*/i, '')).join(' ');

  const generate = async () => {
    setGenerating(true);
    setGenStatus('Writing podcast script…');
    const ctx = hasSource && !customTopic.trim() ? getCtx(allSources) : '';
    const voices = VOICE_MAP[tone] || VOICE_MAP.friendly;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Write a two-host podcast episode between hosts Alex and Sam discussing: "${topic}".
- Tone: ${tone}
- Length: ${lengthMap[length]}
- Difficulty: ${diffMap[difficulty]}
- Each chapter has a title. Start with [INTRO], end with [OUTRO].
- Each speaker line starts with "Alex:" or "Sam:". Natural conversation. Educational.
${ctx ? `\nSOURCE MATERIAL:\n${ctx.slice(0, 8000)}` : ''}`,
      response_json_schema: {
        type: 'object',
        properties: {
          chapters: {
            type: 'array',
            items: {
              type: 'object',
              properties: { title: { type: 'string' }, content: { type: 'string' } },
              required: ['title', 'content'], additionalProperties: false,
            }
          }
        },
        required: ['chapters'], additionalProperties: false,
      }
    });

    const chs = result?.chapters || [];
    setChapters(chs);

    // Generate audio for each chapter
    const urls = [];
    for (let i = 0; i < chs.length; i++) {
      setGenStatus(`Generating audio — chapter ${i + 1} of ${chs.length}…`);
      const narration = toNarration(chs[i].content).slice(0, 4800);
      const audioRes = await base44.integrations.Core.GenerateSpeech({
        text: narration,
        voice: voices.alex,
      });
      urls.push(audioRes?.url || '');
    }
    setAudioUrls(urls);

    // Save resource
    const fullText = chs.map(ch => `## ${ch.title}\n\n${ch.content}`).join('\n\n---\n\n');
    const res = await base44.entities.NotebookResource.create({
      notebook_id: notebook.id, student_email: user.email,
      title: `Podcast — ${topic}`,
      resource_type: 'audio_overview', content: fullText,
      source_ids: allSources.map(s => s.id), source_count: allSources.length,
    });
    onResourceCreated(res);
    setActiveChapter(0);
    setGenerating(false);
    setGenStatus('');
    setPhase('result');
  };

  if (generating) return <LoadingScreen label={genStatus || 'Generating Podcast…'} />;

  if (phase === 'result') {
    const ch = chapters[activeChapter];
    const audioUrl = audioUrls[activeChapter];

    const renderDialogue = (text) => text.split('\n').map((line, i) => {
      const isAlex = /^Alex:/i.test(line);
      const isSam = /^Sam:/i.test(line);
      if (!isAlex && !isSam) return <p key={i} className="text-xs italic mb-1" style={{ color: G.secondary }}>{line}</p>;
      const colon = line.indexOf(':');
      const speaker = line.slice(0, colon);
      const words = line.slice(colon + 1);
      return (
        <div key={i} className="mb-2.5 flex gap-2 items-start">
          <span className="text-xs font-black px-2 py-0.5 rounded-lg flex-shrink-0"
            style={{ background: isAlex ? 'rgba(112,145,230,0.15)' : 'rgba(61,82,160,0.12)', color: isAlex ? G.accent : G.primary }}>
            {speaker}
          </span>
          <span className="text-sm" style={{ color: G.primary }}>{words}</span>
        </div>
      );
    });

    return (
      <div className="flex flex-col h-full" style={{ background: 'linear-gradient(135deg, #EDE8F5 0%, #c8d4f5 100%)' }}>
        {/* Header */}
        <div className="flex-shrink-0 px-5 py-3 flex items-center justify-between gap-3"
          style={{ background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.3)' }}>
          <div className="flex items-center gap-2">
            <Mic2 className="w-4 h-4" style={{ color: G.accent }} />
            <h2 className="font-bold text-sm" style={{ color: G.primary }}>Podcast — {topic}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowScript(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{ background: showScript ? 'rgba(112,145,230,0.2)' : 'rgba(255,255,255,0.5)', border: '1px solid rgba(112,145,230,0.3)', color: G.primary }}>
              <FileText className="w-3.5 h-3.5" />
              {showScript ? 'Hide Script' : 'Show Script'}
            </button>
            <button onClick={() => { setPhase('setup'); setChapters([]); setAudioUrls([]); }}
              className="p-1.5 rounded-xl transition-all hover:bg-white/30" style={{ color: G.secondary }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chapter tabs */}
        <div className="flex-shrink-0 px-4 py-2 flex gap-2 overflow-x-auto"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.25)' }}>
          {chapters.map((c, i) => (
            <button key={i} onClick={() => setActiveChapter(i)}
              className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: activeChapter === i ? 'linear-gradient(135deg,#7091E6,#3D52A0)' : 'rgba(255,255,255,0.45)',
                color: activeChapter === i ? '#fff' : G.primary,
                border: '1px solid rgba(255,255,255,0.3)'
              }}>
              {i + 1}. {c.title}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Audio player — always shown */}
          {audioUrl ? (
            <AudioPlayer url={audioUrl} label={ch?.title || `Chapter ${activeChapter + 1}`} />
          ) : (
            <div className="rounded-2xl p-4 text-center text-sm" style={{ background: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.3)', color: G.secondary }}>
              Audio unavailable for this chapter.
            </div>
          )}

          {/* Script — only if user toggled it */}
          {showScript && ch && (
            <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.4)' }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: G.secondary }}>Script</p>
              <div>{renderDialogue(ch.content)}</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <SetupShell icon={Mic2} title="Podcast Mode" subtitle="AI-generated audio podcast with two voices"
      onGenerate={generate} generating={generating} generateLabel="🎙️ Generate Podcast">
      <TopicRow customTopic={customTopic} setCustomTopic={setCustomTopic} allSources={allSources} />
      <div>
        <ToolLabel>Voice Style</ToolLabel>
        <ToolSelect value={tone} onChange={setTone} options={[
          { value: 'friendly', label: 'Friendly & Warm 😊' },
          { value: 'serious', label: 'Serious & Professional 📘' },
          { value: 'energetic', label: 'Energetic & Upbeat ⚡' },
        ]} />
      </div>
      <div>
        <ToolLabel>Episode Length</ToolLabel>
        <ToolSelect value={length} onChange={setLength} options={[
          { value: 'short', label: 'Short (3 chapters)' },
          { value: 'medium', label: 'Medium (5 chapters)' },
          { value: 'long', label: 'Long (7 chapters)' },
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