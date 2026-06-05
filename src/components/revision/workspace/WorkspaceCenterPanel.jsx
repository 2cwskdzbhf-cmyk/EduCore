import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import {
  Send, Loader2, RefreshCw, Copy, ThumbsUp, ThumbsDown, BookmarkPlus,
  RotateCcw, ChevronRight, AlertTriangle, BookOpen, X, ChevronDown
} from 'lucide-react';

// ─── Chips available in both modes ───────────────────────────────────────────
const STUDIO_CHIPS = [
  { label: '📋 Summarise', prompt: 'Summarise the key content from my sources with clear headings and bullet points.' },
  { label: '📖 Revision Guide', prompt: 'Generate a complete structured revision guide with topic summary, key facts, definitions, and exam tips.' },
  { label: '🗂️ Create Flashcards', prompt: 'BATCH_FLASHCARDS' },
  { label: '❓ Generate Quiz', prompt: 'Create a 10-question multiple choice quiz with 4 options each, correct answers, and brief explanations, based entirely on my sources.' },
  { label: '🧠 Mind Map', prompt: 'Create a detailed mind map outline with a central topic, main branches, and sub-branches covering all key concepts from my sources. Use indented text formatting.' },
  { label: '📝 Exam Questions', prompt: 'Generate 10 exam-style questions with full model answers and mark scheme guidance, based on my sources.' },
  { label: '🔢 Key Formulas', prompt: 'Extract and explain all key formulas, equations, rules, and definitions from my sources.' },
  { label: '📊 Data Table', prompt: 'Organise the key information from my sources into a clear structured table with relevant columns and headings.' },
  { label: '🗺️ Topic Overview', prompt: 'Give me a complete topic overview with all key themes, people, dates, concepts, and connections.' },
  { label: '📅 Timeline', prompt: 'Create a detailed chronological timeline of all key events, dates, and developments from my sources.' },
  { label: '🔍 Compare Docs', prompt: 'Compare and contrast the key themes, arguments, and content across all my uploaded sources.' },
  { label: '🎯 Revision Plan', prompt: 'Create a structured weekly revision plan based on the topics in my sources, including time estimates and priority areas.' },
];

const TUTOR_CHIPS = [
  { label: '🧒 Explain Simply', prompt: 'Explain the most important concept from my notes as if I am 13 years old. Use simple language, analogies, and fun examples.' },
  { label: '🎯 Test Me', prompt: 'Ask me a question about my notes to test my understanding. Wait for my answer before revealing the full explanation.' },
  { label: '📖 Teach Step-by-Step', prompt: 'Teach me the main topic from my notes step by step. Break it into small clear stages.' },
  { label: '❓ Common Mistakes', prompt: 'What are the most common mistakes students make on this topic? Explain how to avoid them.' },
  { label: '🔗 Real Life Examples', prompt: 'Give me real-life examples or applications of the concepts in my notes to help me understand why they matter.' },
  { label: '💡 Give Me a Hint', prompt: 'Give me a hint about the key concept I should focus on first, without giving away the full answer.' },
  { label: '🗂️ Create Flashcards', prompt: 'BATCH_FLASHCARDS' },
  { label: '📝 Exam Questions', prompt: 'Generate 10 exam-style questions with full model answers and mark scheme guidance, based on my sources.' },
  { label: '📋 Summarise', prompt: 'Summarise the key content from my sources with clear headings and bullet points.' },
  { label: '🔢 Key Formulas', prompt: 'Extract and explain all key formulas, equations, rules, and definitions from my sources.' },
  { label: '📅 Timeline', prompt: 'Create a detailed chronological timeline of all key events, dates, and developments from my sources.' },
  { label: '🎯 Revision Plan', prompt: 'Create a structured weekly revision plan based on the topics in my sources, including time estimates and priority areas.' },
];

const SUGGESTED = [
  'What are the key topics I need to know for the exam?',
  'What are the most common mistakes students make?',
  'Explain the most difficult concept simply.',
  'What connections exist between different topics?',
];

const RESOURCE_TYPE_MAP = {
  flashcard: 'flashcards', flashcards: 'flashcards',
  quiz: 'quiz', quizz: 'quiz',
  'mind map': 'mind_map', mindmap: 'mind_map',
  'study guide': 'study_guide', 'revision guide': 'study_guide',
  formula: 'formula_sheet', formulas: 'formula_sheet', equations: 'formula_sheet',
  'exam question': 'exam_questions', 'exam questions': 'exam_questions',
  summary: 'summary', summarise: 'summary', summarize: 'summary',
  table: 'data_table', 'data table': 'data_table',
  timeline: 'summary', 'revision plan': 'study_guide',
  'mind map': 'mind_map', compare: 'report',
};

function detectResourceType(prompt) {
  const lower = prompt.toLowerCase();
  for (const [key, val] of Object.entries(RESOURCE_TYPE_MAP)) {
    if (lower.includes(key)) return val;
  }
  return null;
}

// ─── Batched flashcard generation (shared logic) ──────────────────────────────
async function batchGenerateFlashcards({ notebook, user, sources, onProgress, cancelRef }) {
  const CHUNK = 6000;
  const batches = [];
  for (const src of sources.filter(s => s.content_text)) {
    for (let offset = 0; offset < src.content_text.length; offset += CHUNK) {
      batches.push({ sourceName: src.name, sourceId: src.id, chunk: src.content_text.slice(offset, offset + CHUNK) });
    }
  }
  if (batches.length === 0) throw new Error('No source content available.');

  const allCreated = [];
  for (let i = 0; i < batches.length; i++) {
    if (cancelRef.cancelled) break;
    const batch = batches[i];
    onProgress({ generated: allCreated.length, batchLabel: `Batch ${i + 1}/${batches.length} — ${batch.sourceName}` });

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Create comprehensive revision flashcards for a student studying "${notebook.subject || notebook.name}".

Extract EVERY concept, definition, formula, fact, and example from this text (source: "${batch.sourceName}"). Generate as many cards as the content supports — aim for maximum coverage.

Rules:
- Front: concise question/prompt (e.g. "Define X", "What is the formula for Y?")
- Back: accurate, complete answer with **bold** key terms
- No duplicates, no vague questions

Return a JSON object with a "flashcards" array.

TEXT:
${batch.chunk}`,
      response_json_schema: {
        type: 'object',
        properties: {
          flashcards: {
            type: 'array',
            items: {
              type: 'object',
              properties: { front: { type: 'string' }, back: { type: 'string' } },
              required: ['front', 'back']
            }
          }
        }
      }
    });

    const cards = result?.flashcards || [];
    for (const card of cards) {
      if (cancelRef.cancelled) break;
      if (!card.front?.trim() || !card.back?.trim()) continue;
      const rec = await base44.entities.RevisionFlashcard.create({
        notebook_id: notebook.id, student_email: user.email,
        front: card.front, back: card.back, is_ai_generated: true,
        source_id: batch.sourceId || null,
      });
      allCreated.push(rec);
    }
  }
  return allCreated;
}

// ─── Source Indicator ─────────────────────────────────────────────────────────
function SourcesIndicator({ activeSources }) {
  const [open, setOpen] = useState(false);
  const withContent = activeSources.filter(s => s.content_text);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/8 transition-all text-xs text-slate-400 hover:text-white"
      >
        <BookOpen className="w-3 h-3" />
        <span>{withContent.length} source{withContent.length !== 1 ? 's' : ''}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1.5 z-30 w-64 rounded-2xl border border-white/15 bg-slate-900 shadow-2xl overflow-hidden"
          >
            <div className="px-3 py-2.5 border-b border-white/10 flex items-center justify-between">
              <p className="text-white text-xs font-bold">Sources in use</p>
              <button onClick={() => setOpen(false)}><X className="w-3 h-3 text-slate-500" /></button>
            </div>
            <div className="max-h-56 overflow-y-auto p-2 space-y-1">
              {activeSources.length === 0 && <p className="text-slate-600 text-xs text-center py-3">No sources selected</p>}
              {activeSources.map(src => (
                <div key={src.id} className="flex items-start gap-2 p-2 rounded-xl hover:bg-white/5 transition-all">
                  <span className="text-sm leading-none mt-0.5 flex-shrink-0">
                    {src.type === 'pdf' ? '📄' : src.type === 'youtube' ? '🎬' : src.type === 'url' ? '🌐' : src.type === 'audio' ? '🎧' : src.type === 'gdoc' || src.type === 'gslides' ? '📎' : '📝'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 text-xs font-medium truncate">{src.name}</p>
                    {src.content_text
                      ? <p className="text-slate-500 text-[10px] mt-0.5">{src.content_text.length.toLocaleString()} chars</p>
                      : <p className="text-amber-500 text-[10px] mt-0.5">No text content</p>
                    }
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function WorkspaceCenterPanel({
  notebook, user, selectedSources, allSources,
  onResourceCreated, resources = [], flashcards = [],
  tutorMode = false,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [likedMsgs, setLikedMsgs] = useState({});
  const [genProgress, setGenProgress] = useState(null); // { generated, batchLabel }
  const [cancelRef] = useState({ cancelled: false });
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  const activeSources = selectedSources.length > 0 ? selectedSources : allSources;
  const chips = tutorMode ? TUTOR_CHIPS : STUDIO_CHIPS;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    base44.entities.RevisionChat.filter({ notebook_id: notebook.id, student_email: user.email })
      .then(chats => { if (chats[0]?.messages?.length) setMessages(chats[0].messages); });
  }, [notebook.id]);

  const saveChat = useCallback(async (msgs) => {
    const existing = await base44.entities.RevisionChat.filter({ notebook_id: notebook.id, student_email: user.email });
    if (existing[0]) await base44.entities.RevisionChat.update(existing[0].id, { messages: msgs });
    else await base44.entities.RevisionChat.create({ notebook_id: notebook.id, student_email: user.email, messages: msgs });
  }, [notebook.id, user.email]);

  // ── Batched flashcard generation from chat ──────────────────────────────────
  const handleBatchFlashcards = useCallback(async () => {
    setLoading(true);
    cancelRef.cancelled = false;
    const infoMsg = { role: 'assistant', content: `⚡ Generating flashcards from all ${activeSources.filter(s => s.content_text).length} sources — this may take a minute for large notebooks…`, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, infoMsg]);

    try {
      const created = await batchGenerateFlashcards({
        notebook, user, sources: activeSources,
        onProgress: setGenProgress,
        cancelRef,
      });

      const num = (resources?.filter(r => r.resource_type === 'flashcards').length || 0) + 1;
      const title = `${notebook.name} — Flashcards #${num} (${created.length} cards)`;
      const res = await base44.entities.NotebookResource.create({
        notebook_id: notebook.id, student_email: user.email,
        title, resource_type: 'flashcards',
        content: JSON.stringify({ totalCards: created.length }),
        source_ids: activeSources.map(s => s.id), source_count: activeSources.length,
      });
      onResourceCreated(res);

      const doneMsg = { role: 'assistant', content: `✅ Done! Created **${created.length} flashcards** and saved them to your Studio. You can study them from the Studio panel on the right.`, timestamp: new Date().toISOString() };
      const finalMsgs = [...messages, infoMsg, doneMsg];
      setMessages(finalMsgs);
      await saveChat(finalMsgs);
    } catch (e) {
      const errMsg = { role: 'assistant', content: `Sorry, flashcard generation failed: ${e.message}`, timestamp: new Date().toISOString() };
      setMessages(prev => [...prev, errMsg]);
    }
    setGenProgress(null);
    setLoading(false);
  }, [activeSources, notebook, user, resources, onResourceCreated, saveChat, messages, cancelRef]);

  // ── Regular message send ────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || loading) return;

    // Special: batch flashcard generation
    if (text === 'BATCH_FLASHCARDS') {
      await handleBatchFlashcards();
      return;
    }

    const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    const contextParts = activeSources
      .filter(s => s.content_text)
      .map(s => `### Source: ${s.name}\n${s.content_text.slice(0, 8000)}`)
      .join('\n\n---\n\n');

    const tutorInstructions = tutorMode
      ? `You are a patient and encouraging AI tutor. Guide students to discover answers with hints. Break complex ideas into smaller steps. Celebrate effort. Keep responses focused (3-6 sentences unless explaining step-by-step). Ask follow-up questions to check understanding.`
      : `You are an expert AI revision assistant. Provide comprehensive, well-structured responses. Use markdown with headings and bullet points. Always cite sources when relevant.`;

    const systemPrompt = `${tutorInstructions}

You are helping a student studying "${notebook.name}"${notebook.subject ? ` (${notebook.subject})` : ''}${notebook.exam_board ? ` for ${notebook.exam_board}` : ''}.

IMPORTANT: Ground EVERY response in the provided source materials. Cite sources using "According to [Source Name]..." when relevant. If asked to generate flashcards, quizzes, summaries, study guides, or any study materials, do so comprehensively from the sources.

${contextParts ? `SOURCE MATERIALS (use these to answer everything):\n\n${contextParts}` : 'NOTE: No sources uploaded yet. Encourage the student to upload materials first.'}`;

    const history = newMessages.slice(-14).map(m => ({ role: m.role, content: m.content }));

    try {
      const resp = await base44.integrations.Core.InvokeLLM({
        prompt: text,
        system_prompt: systemPrompt,
        conversation_history: history.slice(0, -1),
      });

      const assistantMsg = { role: 'assistant', content: resp, timestamp: new Date().toISOString() };
      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);
      await saveChat(finalMessages);

      // Auto-detect and save generated resource to Studio
      const resourceType = detectResourceType(text);
      if (resourceType && resourceType !== 'flashcards') {
        const num = (resources?.filter(r => r.resource_type === resourceType).length || 0) + 1;
        const label = resourceType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const title = `${notebook.name} — ${label} #${num}`;
        const res = await base44.entities.NotebookResource.create({
          notebook_id: notebook.id, student_email: user.email,
          title, resource_type: resourceType,
          content: typeof resp === 'string' ? resp : JSON.stringify(resp),
          source_ids: activeSources.map(s => s.id), source_count: activeSources.length,
        });
        onResourceCreated(res);
      }

      // If the response contains flashcard-like content, also try to parse and save
      if (resourceType === 'flashcards') {
        let pairs = [];
        // Try JSON parse
        try {
          const jsonMatch = resp.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const arr = JSON.parse(jsonMatch[0]);
            if (Array.isArray(arr)) pairs = arr.filter(c => c.front && c.back);
          }
        } catch {}
        // Try Q:/A: pattern
        if (pairs.length === 0) {
          const lines = resp.split('\n');
          let front = null;
          for (const line of lines) {
            const qMatch = line.match(/^(?:Q:|Question:|Front:|\d+[\.\)])\s*(.+)/i);
            const aMatch = line.match(/^(?:A:|Answer:|Back:)\s*(.+)/i);
            if (qMatch) front = qMatch[1].trim();
            else if (aMatch && front) { pairs.push({ front, back: aMatch[1].trim() }); front = null; }
          }
        }
        if (pairs.length > 0) {
          for (const pair of pairs) {
            await base44.entities.RevisionFlashcard.create({
              notebook_id: notebook.id, student_email: user.email,
              front: pair.front, back: pair.back, is_ai_generated: true,
            });
          }
          const title = `${notebook.name} — Flashcards (${pairs.length} cards)`;
          const res = await base44.entities.NotebookResource.create({
            notebook_id: notebook.id, student_email: user.email,
            title, resource_type: 'flashcards',
            content: JSON.stringify(pairs),
            source_ids: activeSources.map(s => s.id), source_count: activeSources.length,
          });
          onResourceCreated(res);
        }
      }
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.', timestamp: new Date().toISOString() }]);
    }
    setLoading(false);
  }, [loading, messages, activeSources, tutorMode, notebook, user, resources, onResourceCreated, saveChat, handleBatchFlashcards]);

  const clearChat = async () => {
    setMessages([]);
    const existing = await base44.entities.RevisionChat.filter({ notebook_id: notebook.id, student_email: user.email });
    if (existing[0]) await base44.entities.RevisionChat.update(existing[0].id, { messages: [] });
  };

  const copyMsg = (content) => navigator.clipboard.writeText(content);

  const saveToNotes = async (content) => {
    const res = await base44.entities.NotebookResource.create({
      notebook_id: notebook.id, student_email: user.email,
      title: `Saved Note — ${new Date().toLocaleDateString()}`,
      resource_type: 'notes', content,
      source_count: activeSources.length,
    });
    onResourceCreated(res);
  };

  const hasContent = activeSources.some(s => s.content_text);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-white/10 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-white font-bold text-sm">{tutorMode ? '🎓 AI Tutor' : '🤖 AI Assistant'}</h2>
          <p className="text-[10px] text-slate-500 mt-0.5 truncate">
            {tutorMode ? 'Source-linked tutor' : 'Studio chat'} · {activeSources.filter(s => s.content_text).length} sources loaded
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <SourcesIndicator activeSources={activeSources} />
          {messages.length > 0 && (
            <button onClick={clearChat} className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-400 transition-colors px-2 py-1.5 rounded-xl hover:bg-red-500/10">
              <RefreshCw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Quick chips */}
      <div className="flex-shrink-0 px-3 py-2 border-b border-white/10 flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {chips.map(c => (
          <button key={c.label} onClick={() => sendMessage(c.prompt)} disabled={loading}
            className="flex-shrink-0 px-2.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300 hover:text-white hover:bg-violet-500/15 hover:border-violet-500/30 transition-all font-medium whitespace-nowrap disabled:opacity-50">
            {c.label}
          </button>
        ))}
      </div>

      {/* No sources warning */}
      {!hasContent && (
        <div className="flex-shrink-0 mx-3 mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-amber-300 text-xs"><span className="font-semibold">No source content yet.</span> Add sources in the left panel for grounded answers.</p>
        </div>
      )}

      {/* Flashcard generation progress */}
      <AnimatePresence>
        {genProgress && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="flex-shrink-0 mx-3 mt-2 overflow-hidden">
            <div className="rounded-2xl p-3 border border-amber-500/25" style={{ background: 'rgba(245,158,11,0.07)' }}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
                  <p className="text-amber-300 text-xs font-bold">Generating flashcards…</p>
                </div>
                <button onClick={() => { cancelRef.cancelled = true; }} className="text-slate-500 hover:text-red-400 text-[10px] transition-colors">Cancel</button>
              </div>
              <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400"
                  animate={{ width: '60%' }} transition={{ duration: 1.2, repeat: Infinity, repeatType: 'reverse' }} />
              </div>
              <p className="text-slate-500 text-[10px] mt-1 truncate">{genProgress.batchLabel} · {genProgress.generated} saved</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-2xl mx-auto mb-4 shadow-lg shadow-violet-500/30">
              {tutorMode ? '🎓' : '🤖'}
            </div>
            <p className="text-white font-bold text-base mb-1">{tutorMode ? 'Your AI Tutor' : 'AI Assistant'}</p>
            <p className="text-slate-400 text-sm mb-6">
              {tutorMode
                ? "I'll teach, test, and guide you step by step using your sources."
                : "I'll answer questions and create study materials from your sources."}
            </p>
            <div className="space-y-2 max-w-sm mx-auto">
              {SUGGESTED.map(q => (
                <button key={q} onClick={() => sendMessage(q)}
                  className="w-full text-left px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/8 text-slate-300 text-xs transition-all flex items-center justify-between gap-2">
                  <span>"{q}"</span>
                  <ChevronRight className="w-3 h-3 flex-shrink-0 text-slate-500" />
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[88%] ${m.role === 'user' ? 'order-1' : ''}`}>
              {m.role === 'assistant' && (
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-[10px]">
                    {tutorMode ? '🎓' : '🤖'}
                  </div>
                  <span className="text-xs text-slate-500">{tutorMode ? 'AI Tutor' : 'AI Assistant'}</span>
                </div>
              )}
              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-gradient-to-br from-violet-600 to-purple-700 text-white rounded-br-sm shadow-lg shadow-violet-500/20'
                  : 'bg-white/[0.06] border border-white/10 text-slate-200 rounded-bl-sm'
              }`}>
                <p className="whitespace-pre-wrap">{m.content}</p>
                <p className="text-[10px] opacity-40 mt-1.5">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              {m.role === 'assistant' && (
                <div className="flex items-center gap-1 mt-1.5 pl-1">
                  <button onClick={() => copyMsg(m.content)} title="Copy"
                    className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-all">
                    <Copy className="w-3 h-3" />
                  </button>
                  <button onClick={() => saveToNotes(m.content)} title="Save to Notes"
                    className="p-1.5 rounded-lg text-slate-600 hover:text-violet-400 hover:bg-violet-500/10 transition-all">
                    <BookmarkPlus className="w-3 h-3" />
                  </button>
                  <button onClick={() => setLikedMsgs(l => ({ ...l, [i]: l[i] === 'up' ? null : 'up' }))}
                    className={`p-1.5 rounded-lg transition-all ${likedMsgs[i] === 'up' ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-600 hover:text-emerald-400 hover:bg-white/5'}`}>
                    <ThumbsUp className="w-3 h-3" />
                  </button>
                  <button onClick={() => setLikedMsgs(l => ({ ...l, [i]: l[i] === 'down' ? null : 'down' }))}
                    className={`p-1.5 rounded-lg transition-all ${likedMsgs[i] === 'down' ? 'text-red-400 bg-red-500/10' : 'text-slate-600 hover:text-red-400 hover:bg-white/5'}`}>
                    <ThumbsDown className="w-3 h-3" />
                  </button>
                  <button onClick={() => sendMessage(messages[i - 1]?.content || '')} title="Regenerate"
                    className="p-1.5 rounded-lg text-slate-600 hover:text-amber-400 hover:bg-amber-500/10 transition-all">
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        ))}

        {loading && !genProgress && (
          <div className="flex justify-start">
            <div className="bg-white/[0.06] border border-white/10 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div key={i} className="w-1.5 h-1.5 bg-violet-400 rounded-full"
                    animate={{ y: [0, -5, 0] }} transition={{ duration: 0.5, delay: i * 0.12, repeat: Infinity }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-3 border-t border-white/10">
        <div className="flex gap-2 items-end bg-white/5 border border-white/15 focus-within:border-violet-500/50 rounded-2xl p-3 transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            placeholder={tutorMode ? "Ask your tutor anything, or say 'I don't understand...'" : "Ask a question or create something..."}
            rows={1}
            style={{ maxHeight: '128px', overflowY: 'auto' }}
            className="flex-1 bg-transparent text-white text-sm resize-none focus:outline-none placeholder:text-slate-500 leading-relaxed"
          />
          <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center disabled:opacity-40 flex-shrink-0 hover:brightness-110 transition-all shadow-lg shadow-violet-500/30">
            {loading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
          </button>
        </div>
        <p className="text-[10px] text-slate-600 mt-1.5 px-1">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}