import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Video, Copy } from 'lucide-react';
import { SetupShell, ResultShell, LoadingScreen, ToolLabel, ToolSelect, Toggle, TopicRow, ProseBlock, G } from './ToolSetupShell';

function getCtx(allSources) {
  return allSources.filter(s => s.content_text).map(s => `### ${s.name}\n${s.content_text.slice(0, 5000)}`).join('\n\n---\n\n');
}

export default function ExplainerTool({ notebook, user, allSources, onResourceCreated }) {
  const [phase, setPhase] = useState('setup');
  const [customTopic, setCustomTopic] = useState('');
  const [length, setLength] = useState('medium');
  const [difficulty, setDifficulty] = useState('gcse');
  const [mode, setMode] = useState('overview');
  const [subtitles, setSubtitles] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState('');

  const topic = customTopic.trim() || notebook.name;
  const hasSource = allSources.some(s => s.content_text);

  const lengthMap = { short: '1-2 minutes (~200 words)', medium: '3-4 minutes (~450 words)', long: '6-8 minutes (~900 words)' };
  const diffMap = { gcse: 'GCSE level', alevel: 'A-Level level', simple: 'simple language for beginners' };
  const modeMap = { overview: 'overview/summary style', stepbystep: 'step-by-step breakdown with numbered stages' };

  const generate = async () => {
    setGenerating(true);
    const ctx = hasSource && !customTopic.trim() ? getCtx(allSources) : '';
    const subtitleNote = subtitles ? 'Also include a [SUBTITLES] section at the bottom with a clean text transcript formatted for on-screen captions.' : '';

    const content = await base44.integrations.Core.InvokeLLM({
      prompt: `Write a detailed explainer video script on: "${topic}".
- Length: ${lengthMap[length]}
- Audience level: ${diffMap[difficulty]}
- Style: ${modeMap[mode]}
- Format: Use [HOOK], [INTRO], numbered [SCENE X] sections with visual cue descriptions in (parentheses), and [OUTRO].
- Each scene: narration text + what should appear on screen.
${subtitleNote}
${ctx ? `\n\nSOURCE MATERIAL:\n${ctx.slice(0, 10000)}` : ''}`,
    });

    const text = typeof content === 'string' ? content : JSON.stringify(content);
    setResult(text);

    const res = await base44.entities.NotebookResource.create({
      notebook_id: notebook.id, student_email: user.email,
      title: `Explainer Script — ${topic}`,
      resource_type: 'video_overview', content: text,
      source_ids: allSources.map(s => s.id), source_count: allSources.length,
    });
    onResourceCreated(res);
    setGenerating(false);
    setPhase('result');
  };

  if (generating) return <LoadingScreen label="Writing Explainer Script…" />;

  if (phase === 'result' && result) {
    // Split off subtitles section if present
    const [mainScript, subtitleSection] = result.split(/\[SUBTITLES\]/i);
    return (
      <ResultShell
        title={`Explainer Script — ${topic}`}
        subtitle={`${length} · ${difficulty} · ${mode}`}
        onRegenerate={() => { setPhase('setup'); setResult(''); }}
        onBack={() => { setPhase('setup'); setResult(''); }}
        extraActions={
          <button onClick={() => navigator.clipboard.writeText(result)} className="px-3 py-1.5 rounded-xl text-xs font-semibold"
            style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(112,145,230,0.3)', color: G.primary }}>
            <Copy className="w-3 h-3 inline mr-1" />Copy
          </button>
        }
      >
        <ProseBlock>{mainScript.trim()}</ProseBlock>
        {subtitleSection && (
          <div className="mt-4">
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: G.secondary }}>Subtitle Transcript</p>
            <div className="rounded-2xl p-4 text-xs leading-relaxed whitespace-pre-wrap"
              style={{ background: 'rgba(112,145,230,0.08)', border: '1px solid rgba(112,145,230,0.2)', color: G.primary }}>
              {subtitleSection.trim()}
            </div>
          </div>
        )}
      </ResultShell>
    );
  }

  return (
    <SetupShell icon={Video} title="Explainer Video Script" subtitle="AI-written video scripts from any topic" onGenerate={generate} generating={generating} generateLabel="🎬 Generate Script">
      <TopicRow customTopic={customTopic} setCustomTopic={setCustomTopic} allSources={allSources} />
      <div>
        <ToolLabel>Video Length</ToolLabel>
        <ToolSelect value={length} onChange={setLength} options={[
          { value: 'short', label: 'Short (1–2 min)' },
          { value: 'medium', label: 'Medium (3–4 min)' },
          { value: 'long', label: 'Long (6–8 min)' },
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
          { value: 'overview', label: 'Overview — big picture summary' },
          { value: 'stepbystep', label: 'Step-by-Step — numbered stages' },
        ]} />
      </div>
      <Toggle value={subtitles} onChange={setSubtitles} label="Include Subtitle Transcript" desc="Clean caption text at the bottom of the script" />
    </SetupShell>
  );
}