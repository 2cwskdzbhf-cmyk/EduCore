import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Network, Copy, BookmarkPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import { SetupShell, ResultShell, LoadingScreen, ToolLabel, ToolSelect, TopicRow, Toggle, G } from './ToolSetupShell';

function getCtx(allSources) {
  return allSources.filter(s => s.content_text).map(s => `### ${s.name}\n${s.content_text.slice(0, 6000)}`).join('\n\n---\n\n');
}

const COLORS = [
  { bg: '#3D52A0', text: '#fff' },
  { bg: '#7091E6', text: '#fff' },
  { bg: '#8697C4', text: '#fff' },
  { bg: '#ADB8DA', text: '#3D52A0' },
  { bg: 'rgba(112,145,230,0.25)', text: '#3D52A0' },
];

function MindMapNode({ node, depth = 0 }) {
  const [expanded, setExpanded] = useState(true);
  const c = COLORS[Math.min(depth, COLORS.length - 1)];
  const hasChildren = node.children?.length > 0;

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={() => hasChildren && setExpanded(v => !v)}
        className="px-3 py-2 rounded-xl text-xs font-bold text-center min-w-[90px] max-w-[180px] transition-all hover:brightness-95 active:scale-95"
        style={{ background: c.bg, color: c.text, border: depth === 0 ? '2px solid rgba(61,82,160,0.3)' : '1px solid rgba(255,255,255,0.3)', boxShadow: depth === 0 ? '0 4px 16px rgba(61,82,160,0.2)' : '0 2px 8px rgba(61,82,160,0.1)' }}>
        {node.label}
      </button>

      {hasChildren && expanded && (
        <div className="mt-2">
          <div className="w-px h-3 mx-auto" style={{ background: 'rgba(61,82,160,0.3)' }} />
          <div className="flex gap-3 flex-wrap justify-center items-start">
            {node.children.map((child, i) => (
              <div key={child.id || i} className="flex flex-col items-center">
                <div className="w-px h-3" style={{ background: 'rgba(61,82,160,0.3)' }} />
                <MindMapNode node={child} depth={depth + 1} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MindMapTool({ notebook, user, allSources, onResourceCreated }) {
  const [phase, setPhase] = useState('setup');
  const [customTopic, setCustomTopic] = useState('');
  const [complexity, setComplexity] = useState('medium');
  const [branches, setBranches] = useState('5');
  const [includeExamples, setIncludeExamples] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [tree, setTree] = useState(null);

  const topicOrSources = customTopic.trim() || getCtx(allSources);

  const generate = async () => {
    if (!topicOrSources) return;
    setGenerating(true);
    const complexityMap = { simple: '2-3 sub-concepts per branch', medium: '3-4 sub-concepts per branch', detailed: '4-6 sub-concepts per branch with deeper nesting' };
    const examplesInstr = includeExamples ? 'Include real-world example nodes labelled "(Example)".' : 'Do not include example nodes.';

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Create a hierarchical mind map for: "${customTopic || notebook.name}".
Complexity: ${complexity} (${complexityMap[complexity]}).
Number of main branches: exactly ${branches}.
${examplesInstr}
Each node label must be 2-6 words. Return a nested JSON tree.
${customTopic ? '' : `\n\nSOURCES:\n${topicOrSources.slice(0, 12000)}`}`,
      response_json_schema: {
        type: 'object',
        properties: {
          id: { type: 'string' }, label: { type: 'string' },
          children: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' }, label: { type: 'string' },
                children: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: { id: { type: 'string' }, label: { type: 'string' }, children: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, label: { type: 'string' }, children: { type: 'array', items: { type: 'string' } } }, required: ['id', 'label', 'children'], additionalProperties: false } } },
                    required: ['id', 'label', 'children'], additionalProperties: false,
                  }
                }
              },
              required: ['id', 'label', 'children'], additionalProperties: false,
            }
          }
        },
        required: ['id', 'label', 'children'], additionalProperties: false,
      }
    });

    setTree(result);
    const res = await base44.entities.NotebookResource.create({
      notebook_id: notebook.id, student_email: user.email,
      title: `Mind Map — ${customTopic || notebook.name}`,
      resource_type: 'mind_map', content: JSON.stringify(result),
      source_ids: allSources.map(s => s.id), source_count: allSources.length,
    });
    onResourceCreated(res);
    setGenerating(false);
    setPhase('result');
  };

  const convertToNotes = async () => {
    if (!tree) return;
    const flatten = (node, depth = 0) => {
      const indent = '  '.repeat(depth);
      const lines = [`${indent}${depth === 0 ? '# ' : depth === 1 ? '## ' : '- '}${node.label}`];
      (node.children || []).forEach(c => lines.push(...flatten(c, depth + 1)));
      return lines;
    };
    const notesText = flatten(tree).join('\n');
    const res = await base44.entities.NotebookResource.create({
      notebook_id: notebook.id, student_email: user.email,
      title: `Notes from Mind Map — ${customTopic || notebook.name}`,
      resource_type: 'notes', content: notesText,
    });
    onResourceCreated(res);
    alert('Converted to Notes ✓');
  };

  if (generating) return <LoadingScreen label="Generating Mind Map…" />;

  if (phase === 'result' && tree) {
    return (
      <ResultShell
        title={`Mind Map — ${tree.label}`}
        subtitle={`${complexity} complexity · ${branches} branches`}
        onRegenerate={() => { setPhase('setup'); setTree(null); }}
        onBack={() => { setPhase('setup'); setTree(null); }}
        extraActions={
          <button onClick={convertToNotes} className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:brightness-110"
            style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(112,145,230,0.3)', color: G.primary }}>
            <BookmarkPlus className="w-3 h-3 inline mr-1" />Convert to Notes
          </button>
        }
      >
        <div className="flex justify-center overflow-auto pb-6">
          <div className="min-w-max py-4">
            <MindMapNode node={tree} depth={0} />
          </div>
        </div>
      </ResultShell>
    );
  }

  return (
    <SetupShell icon={Network} title="Mind Map Generator" subtitle="Visual concept map from topic or sources" onGenerate={generate} generating={generating} generateLabel="🗺️ Generate Mind Map">
      <TopicRow customTopic={customTopic} setCustomTopic={setCustomTopic} allSources={allSources} />
      <div>
        <ToolLabel>Complexity</ToolLabel>
        <ToolSelect value={complexity} onChange={setComplexity} options={[
          { value: 'simple', label: 'Simple — key concepts only' },
          { value: 'medium', label: 'Medium — balanced detail' },
          { value: 'detailed', label: 'Detailed — deep nesting' },
        ]} />
      </div>
      <div>
        <ToolLabel>Number of Main Branches</ToolLabel>
        <ToolSelect value={branches} onChange={setBranches} options={['3','4','5','6','7','8'].map(n => ({ value: n, label: `${n} branches` }))} />
      </div>
      <Toggle value={includeExamples} onChange={setIncludeExamples} label="Include Examples" desc="Add real-world example nodes" />
    </SetupShell>
  );
}