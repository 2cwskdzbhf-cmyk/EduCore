import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Cpu, Loader2, FolderOpen, BookOpen, Brain, ClipboardList, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';

export default function TopicAutoDetection({ notebooks, sources, user }) {
  const [selectedNotebook, setSelectedNotebook] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [expandedTopics, setExpandedTopics] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const notebookSources = sources.filter(s =>
    selectedNotebook ? s.notebook_id === selectedNotebook : false
  ).filter(s => s.content_text);

  const toggleTopic = (i) => setExpandedTopics(p => ({ ...p, [i]: !p[i] }));

  const detect = async () => {
    if (!selectedNotebook || notebookSources.length === 0) return;
    setLoading(true);
    setResult(null);
    setSaved(false);

    const combined = notebookSources.map(s =>
      `SOURCE: "${s.name}"\n${s.content_text.slice(0, 2500)}`
    ).join('\n\n---\n\n');

    try {
      const res = await base44.functions.invoke('callOpenAI', {
        prompt: `You are an academic curriculum designer. Analyse these study sources and extract a structured topic hierarchy.

${combined}

Return ONLY valid JSON:
{
  "topics": [
    {
      "name": "Topic Name",
      "description": "1-2 sentence description",
      "subtopics": ["Subtopic A", "Subtopic B", "Subtopic C"],
      "flashcard_prompts": ["Question 1?", "Question 2?", "Question 3?"],
      "quiz_prompts": ["Quiz question 1?", "Quiz question 2?"]
    }
  ]
}

Identify 3-6 main topics. Each topic should have 2-5 subtopics, 3-5 flashcard prompts, and 2-3 quiz prompts.`,
        response_json_schema: {
          type: 'object',
          properties: {
            topics: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  subtopics: { type: 'array', items: { type: 'string' } },
                  flashcard_prompts: { type: 'array', items: { type: 'string' } },
                  quiz_prompts: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
      });
      const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
      setResult(data.topics || []);
      setExpandedTopics(Object.fromEntries((data.topics || []).map((_, i) => [i, true])));
    } finally {
      setLoading(false);
    }
  };

  const saveToNotebook = async () => {
    if (!result || !selectedNotebook || !user) return;
    setSaving(true);
    try {
      // Save a resource summarising the detected topics
      const content = result.map(t =>
        `## ${t.name}\n${t.description}\n\n**Subtopics:** ${t.subtopics.join(', ')}\n\n**Flashcard prompts:**\n${t.flashcard_prompts.map(f => `- ${f}`).join('\n')}\n\n**Quiz prompts:**\n${t.quiz_prompts.map(q => `- ${q}`).join('\n')}`
      ).join('\n\n---\n\n');

      await base44.entities.NotebookResource.create({
        notebook_id: selectedNotebook,
        student_email: user.email,
        title: 'Auto-Detected Topics',
        resource_type: 'study_guide',
        content,
        source_count: notebookSources.length,
      });

      // Generate and save flashcards for each topic
      for (const topic of result) {
        for (const prompt of topic.flashcard_prompts) {
          const fcRes = await base44.functions.invoke('callOpenAI', {
            prompt: `Create a single flashcard for the question: "${prompt}" in the context of ${topic.name}.
Return JSON: { "front": "question", "back": "concise answer (2-4 sentences)" }`,
            response_json_schema: {
              type: 'object',
              properties: { front: { type: 'string' }, back: { type: 'string' } },
            },
          });
          const fc = typeof fcRes.data === 'string' ? JSON.parse(fcRes.data) : fcRes.data;
          if (fc.front && fc.back) {
            await base44.entities.RevisionFlashcard.create({
              notebook_id: selectedNotebook,
              student_email: user.email,
              front: fc.front,
              back: fc.back,
              is_ai_generated: true,
            });
          }
        }
      }
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1.5 block">Select Notebook</label>
          <select
            value={selectedNotebook}
            onChange={e => { setSelectedNotebook(e.target.value); setResult(null); setSaved(false); }}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50"
          >
            <option value="">Choose a notebook…</option>
            {notebooks.map(nb => {
              const count = sources.filter(s => s.notebook_id === nb.id && s.content_text).length;
              return <option key={nb.id} value={nb.id}>{nb.icon || '📚'} {nb.name} ({count} sources)</option>;
            })}
          </select>
        </div>
        <button onClick={detect}
          disabled={!selectedNotebook || notebookSources.length === 0 || loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4" />}
          {loading ? 'Detecting topics…' : 'Auto-Detect Topics'}
        </button>
      </div>

      {selectedNotebook && notebookSources.length === 0 && (
        <p className="text-slate-500 text-sm">This notebook has no sources with text content yet.</p>
      )}

      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-300 font-semibold">{result.length} topics detected from {notebookSources.length} sources</p>
            <button onClick={saveToNotebook} disabled={saving || saved}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                saved ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
              } disabled:opacity-50`}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              {saved ? 'Saved to Notebook!' : saving ? 'Saving…' : 'Save Topics & Flashcards'}
            </button>
          </div>

          {result.map((topic, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
              <button onClick={() => toggleTopic(i)}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/5 transition-all text-left">
                <FolderOpen className="w-4 h-4 text-violet-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm">{topic.name}</p>
                  <p className="text-slate-500 text-xs truncate">{topic.description}</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{topic.subtopics?.length} subtopics</span>
                  <span className="flex items-center gap-1"><Brain className="w-3 h-3" />{topic.flashcard_prompts?.length} cards</span>
                  {expandedTopics[i] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
              </button>

              <AnimatePresence>
                {expandedTopics[i] && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-white/10">
                    <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-violet-400 mb-2 flex items-center gap-1"><FolderOpen className="w-3 h-3" />Subtopics</p>
                        <ul className="space-y-1">
                          {topic.subtopics?.map((st, j) => (
                            <li key={j} className="text-xs text-slate-300 flex gap-2"><span className="text-slate-600">•</span>{st}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-blue-400 mb-2 flex items-center gap-1"><Brain className="w-3 h-3" />Flashcard Prompts</p>
                        <ul className="space-y-1">
                          {topic.flashcard_prompts?.map((f, j) => (
                            <li key={j} className="text-xs text-slate-300 flex gap-2"><span className="text-slate-600">•</span>{f}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-emerald-400 mb-2 flex items-center gap-1"><ClipboardList className="w-3 h-3" />Quiz Prompts</p>
                        <ul className="space-y-1">
                          {topic.quiz_prompts?.map((q, j) => (
                            <li key={j} className="text-xs text-slate-300 flex gap-2"><span className="text-slate-600">•</span>{q}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}