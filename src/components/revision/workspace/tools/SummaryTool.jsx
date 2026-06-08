import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { FileText, Copy, Layers, Zap } from 'lucide-react';
import { SetupShell, ResultShell, LoadingScreen, ToolLabel, ToolSelect, TopicRow, G } from './ToolSetupShell';

function getCtx(allSources) {
  return allSources.filter(s => s.content_text).map(s => `### ${s.name}\n${s.content_text.slice(0, 5000)}`).join('\n\n---\n\n');
}

function SummarySection({ title, content, color }) {
  return (
    <div className="rounded-2xl p-4 mb-3" style={{ background: color || 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.4)' }}>
      <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: G.accent }}>{title}</p>
      {Array.isArray(content)
        ? <ul className="space-y-1">{content.map((item, i) => <li key={i} className="flex gap-2 text-sm" style={{ color: G.primary }}><span style={{ color: G.accent }}>•</span>{item}</li>)}</ul>
        : <p className="text-sm leading-relaxed" style={{ color: G.primary }}>{content}</p>
      }
    </div>
  );
}

export default function SummaryTool({ notebook, user, allSources, onResourceCreated }) {
  const [phase, setPhase] = useState('setup');
  const [customTopic, setCustomTopic] = useState('');
  const [length, setLength] = useState('medium');
  const [difficulty, setDifficulty] = useState('gcse');
  const [generating, setGenerating] = useState(false);
  const [summary, setSummary] = useState(null);
  const [converting, setConverting] = useState(null);

  const topic = customTopic.trim() || notebook.name;
  const hasSource = allSources.some(s => s.content_text);
  const lengthMap = { short: '3-4 bullet points per section, concise', medium: '5-7 bullet points per section, balanced', long: '8-12 bullet points per section, comprehensive' };
  const diffMap = { simple: 'simple/beginner language', gcse: 'GCSE academic level', alevel: 'A-Level depth and precision' };

  const generate = async () => {
    setGenerating(true);
    const ctx = hasSource && !customTopic.trim() ? getCtx(allSources) : '';

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Create a structured revision summary for: "${topic}".
- Length: ${lengthMap[length]}
- Language level: ${diffMap[difficulty]}
- Include ALL these sections: overview, key_concepts, key_terms, common_misconceptions, exam_tips
${ctx ? `\n\nSOURCE MATERIAL:\n${ctx.slice(0, 12000)}` : ''}`,
      response_json_schema: {
        type: 'object',
        properties: {
          overview: { type: 'string' },
          key_concepts: { type: 'array', items: { type: 'string' } },
          key_terms: { type: 'array', items: { type: 'string' } },
          common_misconceptions: { type: 'array', items: { type: 'string' } },
          exam_tips: { type: 'array', items: { type: 'string' } },
        },
        required: ['overview', 'key_concepts', 'key_terms', 'common_misconceptions', 'exam_tips'],
        additionalProperties: false,
      }
    });

    setSummary(result);

    const fullText = [
      `# ${topic} — Summary\n`,
      `## Overview\n${result.overview}\n`,
      `## Key Concepts\n${result.key_concepts?.map(c => `- ${c}`).join('\n')}\n`,
      `## Key Terms\n${result.key_terms?.map(c => `- ${c}`).join('\n')}\n`,
      `## Common Misconceptions\n${result.common_misconceptions?.map(c => `- ${c}`).join('\n')}\n`,
      `## Exam Tips\n${result.exam_tips?.map(c => `- ${c}`).join('\n')}`,
    ].join('\n');

    const res = await base44.entities.NotebookResource.create({
      notebook_id: notebook.id, student_email: user.email,
      title: `Summary — ${topic}`,
      resource_type: 'summary', content: fullText,
      source_ids: allSources.map(s => s.id), source_count: allSources.length,
    });
    onResourceCreated(res);
    setGenerating(false);
    setPhase('result');
  };

  const turnIntoFlashcards = async () => {
    if (!summary || converting) return;
    setConverting('flashcards');
    const allTerms = [...(summary.key_concepts || []), ...(summary.key_terms || [])];
    const cards = allTerms.slice(0, 20).map(item => {
      const [front, ...rest] = item.split(':');
      return { front: front.trim(), back: rest.join(':').trim() || item };
    });
    await base44.entities.RevisionFlashcard.bulkCreate(
      cards.map(c => ({ notebook_id: notebook.id, student_email: user.email, front: c.front, back: c.back, is_ai_generated: true }))
    );
    const res = await base44.entities.NotebookResource.create({
      notebook_id: notebook.id, student_email: user.email,
      title: `Flashcards from Summary — ${topic}`,
      resource_type: 'flashcards', content: JSON.stringify({ totalCards: cards.length }),
    });
    onResourceCreated(res);
    setConverting(null);
    alert(`Created ${cards.length} flashcards from key terms ✓`);
  };

  const turnIntoQuiz = async () => {
    if (!summary || converting) return;
    setConverting('quiz');
    const allPoints = [...(summary.key_concepts || []), ...(summary.exam_tips || [])].join('\n');
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Create 8 multiple-choice quiz questions from these revision points:\n${allPoints}\n\nMake questions test understanding, not just recall.`,
      response_json_schema: {
        type: 'object',
        properties: {
          questions: {
            type: 'array',
            items: {
              type: 'object',
              properties: { question: { type: 'string' }, options: { type: 'array', items: { type: 'string' } }, correct_index: { type: 'number' }, explanation: { type: 'string' } },
              required: ['question', 'options', 'correct_index', 'explanation'], additionalProperties: false,
            }
          }
        },
        required: ['questions'], additionalProperties: false,
      }
    });
    const res = await base44.entities.NotebookResource.create({
      notebook_id: notebook.id, student_email: user.email,
      title: `Quiz from Summary — ${topic}`,
      resource_type: 'quiz', content: JSON.stringify(result?.questions || []),
      source_ids: allSources.map(s => s.id), source_count: allSources.length,
    });
    onResourceCreated(res);
    setConverting(null);
    alert('Quiz created and saved ✓');
  };

  if (generating) return <LoadingScreen label="Generating Summary…" />;

  if (phase === 'result' && summary) {
    return (
      <ResultShell
        title={`Summary — ${topic}`}
        subtitle={`${length} · ${difficulty}`}
        onRegenerate={() => { setPhase('setup'); setSummary(null); }}
        onBack={() => { setPhase('setup'); setSummary(null); }}
        extraActions={
          <>
            <button onClick={() => navigator.clipboard.writeText(JSON.stringify(summary, null, 2))}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(112,145,230,0.3)', color: G.primary }}>
              <Copy className="w-3 h-3 inline mr-1" />Copy
            </button>
            <button onClick={turnIntoFlashcards} disabled={!!converting}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold disabled:opacity-50"
              style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(112,145,230,0.3)', color: G.primary }}>
              <Layers className="w-3 h-3 inline mr-1" />{converting === 'flashcards' ? '…' : 'Flashcards'}
            </button>
            <button onClick={turnIntoQuiz} disabled={!!converting}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold disabled:opacity-50"
              style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(112,145,230,0.3)', color: G.primary }}>
              <Zap className="w-3 h-3 inline mr-1" />{converting === 'quiz' ? '…' : 'Quiz'}
            </button>
          </>
        }
      >
        <SummarySection title="Overview" content={summary.overview} />
        <SummarySection title="Key Concepts" content={summary.key_concepts} />
        <SummarySection title="Key Terms" content={summary.key_terms} color="rgba(112,145,230,0.08)" />
        <SummarySection title="⚠️ Common Misconceptions" content={summary.common_misconceptions} color="rgba(239,68,68,0.05)" />
        <SummarySection title="📝 Exam Tips" content={summary.exam_tips} color="rgba(52,211,153,0.06)" />
      </ResultShell>
    );
  }

  return (
    <SetupShell icon={FileText} title="Summary Generator" subtitle="Structured revision notes from any topic" onGenerate={generate} generating={generating} generateLabel="📄 Generate Summary">
      <TopicRow customTopic={customTopic} setCustomTopic={setCustomTopic} allSources={allSources} />
      <div>
        <ToolLabel>Summary Length</ToolLabel>
        <ToolSelect value={length} onChange={setLength} options={[
          { value: 'short', label: 'Short — key points only' },
          { value: 'medium', label: 'Medium — balanced detail' },
          { value: 'long', label: 'Long — comprehensive notes' },
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