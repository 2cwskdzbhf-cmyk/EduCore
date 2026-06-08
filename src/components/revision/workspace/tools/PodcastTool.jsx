import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Mic2, Copy, ChevronDown, ChevronRight } from 'lucide-react';
import { SetupShell, ResultShell, LoadingScreen, ToolLabel, ToolSelect, TopicRow, G } from './ToolSetupShell';

function getCtx(allSources) {
  return allSources.filter(s => s.content_text).map(s => `### ${s.name}\n${s.content_text.slice(0, 5000)}`).join('\n\n---\n\n');
}

function ChapterList({ chapters, activeChapter, setActiveChapter }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: G.secondary }}>Chapters</p>
      <div className="space-y-1">
        {chapters.map((ch, i) => (
          <button key={i} onClick={() => setActiveChapter(i === activeChapter ? null : i)}
            className="w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 transition-all"
            style={{ background: activeChapter === i ? 'rgba(112,145,230,0.15)' : 'rgba(255,255,255,0.4)', border: `1px solid ${activeChapter === i ? 'rgba(112,145,230,0.35)' : 'rgba(255,255,255,0.3)'}` }}>
            {activeChapter === i ? <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: G.accent }} /> : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: G.secondary }} />}
            <span className="text-xs font-semibold" style={{ color: G.primary }}>{ch.title}</span>
          </button>
        ))}
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
  const [chapters, setChapters] = useState([]);
  const [activeChapter, setActiveChapter] = useState(0);

  const topic = customTopic.trim() || notebook.name;
  const hasSource = allSources.some(s => s.content_text);
  const toneMap = { fun: 'fun, enthusiastic, and humorous', serious: 'professional and informative', exam_focused: 'exam-focused, concise, and revision-driven' };
  const lengthMap = { short: '3–4 chapters, ~300 words each', medium: '5–6 chapters, ~400 words each', long: '7–8 chapters, ~500 words each' };
  const diffMap = { simple: 'simple language', gcse: 'GCSE level', alevel: 'A-Level depth' };

  const generate = async () => {
    setGenerating(true);
    const ctx = hasSource && !customTopic.trim() ? getCtx(allSources) : '';

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Write a two-host podcast episode between hosts Alex and Sam discussing: "${topic}".
- Tone: ${toneMap[tone]}
- Length: ${lengthMap[length]}
- Difficulty: ${diffMap[difficulty]}
- Structure each chapter with a title. Start with an [INTRO] and end with an [OUTRO].
- Use natural conversational dialogue. Each speaker line starts with "Alex:" or "Sam:".
- Make it educational and engaging.
${ctx ? `\n\nSOURCE MATERIAL:\n${ctx.slice(0, 10000)}` : ''}`,
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
    setActiveChapter(0);

    const fullText = chs.map(ch => `## ${ch.title}\n\n${ch.content}`).join('\n\n---\n\n');
    const res = await base44.entities.NotebookResource.create({
      notebook_id: notebook.id, student_email: user.email,
      title: `Podcast — ${topic}`,
      resource_type: 'audio_overview', content: fullText,
      source_ids: allSources.map(s => s.id), source_count: allSources.length,
    });
    onResourceCreated(res);
    setGenerating(false);
    setPhase('result');
  };

  if (generating) return <LoadingScreen label="Writing Podcast Episode…" />;

  if (phase === 'result' && chapters.length > 0) {
    const ch = chapters[activeChapter];
    // Colour Alex/Sam lines
    const renderDialogue = (text) => text.split('\n').map((line, i) => {
      const isAlex = line.startsWith('Alex:');
      const isSam = line.startsWith('Sam:');
      if (!isAlex && !isSam) return <p key={i} className="text-xs italic mb-1" style={{ color: G.secondary }}>{line}</p>;
      const [speaker, ...rest] = line.split(':');
      return (
        <div key={i} className="mb-2">
          <span className="text-xs font-black mr-1" style={{ color: isAlex ? G.accent : G.primary }}>{speaker}:</span>
          <span className="text-sm" style={{ color: G.primary }}>{rest.join(':')}</span>
        </div>
      );
    });

    return (
      <ResultShell
        title={`Podcast — ${topic}`}
        subtitle={`${chapters.length} chapters · ${tone} · ${difficulty}`}
        onRegenerate={() => { setPhase('setup'); setChapters([]); }}
        onBack={() => { setPhase('setup'); setChapters([]); }}
        extraActions={
          <button onClick={() => navigator.clipboard.writeText(chapters.map(c => `## ${c.title}\n\n${c.content}`).join('\n\n---\n\n'))}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold"
            style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(112,145,230,0.3)', color: G.primary }}>
            <Copy className="w-3 h-3 inline mr-1" />Copy All
          </button>
        }
      >
        <ChapterList chapters={chapters} activeChapter={activeChapter} setActiveChapter={setActiveChapter} />
        {ch && (
          <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.4)' }}>
            <h3 className="font-bold text-sm mb-3" style={{ color: G.primary }}>{ch.title}</h3>
            <div>{renderDialogue(ch.content)}</div>
          </div>
        )}
        <div className="flex gap-2 mt-3 flex-wrap">
          {chapters.map((_, i) => (
            <button key={i} onClick={() => setActiveChapter(i)}
              className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
              style={{ background: activeChapter === i ? 'linear-gradient(135deg, #7091E6, #3D52A0)' : 'rgba(255,255,255,0.4)', color: activeChapter === i ? '#fff' : G.primary, border: '1px solid rgba(255,255,255,0.3)' }}>
              {i + 1}
            </button>
          ))}
        </div>
      </ResultShell>
    );
  }

  return (
    <SetupShell icon={Mic2} title="Podcast Mode" subtitle="Two-host educational podcast episode" onGenerate={generate} generating={generating} generateLabel="🎙️ Generate Podcast">
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
          { value: 'short', label: 'Short (3–4 chapters)' },
          { value: 'medium', label: 'Medium (5–6 chapters)' },
          { value: 'long', label: 'Long (7–8 chapters)' },
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