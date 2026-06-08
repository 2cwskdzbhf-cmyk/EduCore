import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import {
  Send, Loader2, RefreshCw, Copy, BookmarkPlus, ThumbsUp, ThumbsDown,
  RotateCcw, ChevronRight, AlertTriangle, GraduationCap, BookOpen,
  ChevronDown, ChevronUp, X, BrainCircuit, ClipboardList
} from 'lucide-react';
import QuizTestHub from '../quiztools/QuizTestHub';

// ─── Quick chips ──────────────────────────────────────────────────────────────
const QUICK_CHIPS = [
  { label: '📋 Summarise', prompt: 'Summarise all my sources clearly with headings and bullet points. Cover every key topic.' },
  { label: '💡 Explain Simply', prompt: 'Explain the main concepts simply, as if I\'m a GCSE student. Use analogies and examples.' },
  { label: '🧒 ELI13', prompt: 'Explain the most important concept as if I\'m 13 years old. No jargon. Short sentences.' },
  { label: '🗂️ Create Flashcards', prompt: 'Generate 20 high-quality revision flashcards covering the most important concepts, definitions, and facts from my sources. Format as a JSON array: [{"front":"...","back":"..."},...]' },
  { label: '❓ Multiple-Choice Quiz', prompt: 'Create a 10-question multiple choice quiz with 4 options each, mark the correct answer, and provide brief explanations. Cover the key topics from my sources.' },
  { label: '📖 Study Guide', prompt: 'Generate a complete, structured revision study guide with topic summary, key facts, definitions, formulas, and exam tips from my sources.' },
  { label: '🔢 Key Formulas', prompt: 'Extract and explain every key formula, equation, rule, and definition from my sources.' },
  { label: '📝 Exam Questions', prompt: 'Generate 10 likely exam questions with full model answers and mark scheme guidance based on my sources.' },
  { label: '🧠 Mind Map', prompt: 'Create a detailed mind map outline with main topics, subtopics, and connections from my sources.' },
  { label: '📊 Data Table', prompt: 'Organise the key information from my sources into a structured table for easy comparison and revision.' },
  { label: '🗺️ Topic Overview', prompt: 'Give me a complete topic overview covering all key themes, people, dates, events, and concepts from my sources.' },
  { label: '🔗 Real-Life Examples', prompt: 'Give real-life examples and applications for the concepts in my sources to help me understand why they matter.' },
  { label: '⚠️ Common Mistakes', prompt: 'What are the most common mistakes students make on these topics? Explain how to avoid each one.' },
  { label: '🎯 Test Me', prompt: 'Ask me a challenging question from my sources to test my understanding. Wait for my response before explaining.' },
  { label: '🔄 Compare Topics', prompt: 'Compare and contrast the main topics in my sources. What are the similarities and key differences?' },
  { label: '📅 Timeline', prompt: 'Create a chronological timeline of all key events, dates, and developments from my sources.' },
  { label: '📈 Revision Plan', prompt: 'Create a structured revision plan for the topics in my sources, prioritising the most important areas.' },
];

const SUGGESTED = [
  'What are the key topics I need to know for the exam?',
  'What are the most common mistakes students make on this topic?',
  'Explain the most difficult concept in my notes simply.',
  'What connections exist between the different topics in my sources?',
];

const TUTOR_MODES = [
  { id: 'gcse', label: 'GCSE' },
  { id: 'alevel', label: 'A-Level' },
  { id: 'simple', label: 'Simple' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function cleanText(str) {
  return str
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .trim();
}

function detectResourceType(text) {
  const t = text.toLowerCase();
  if (t.includes('flashcard')) return 'flashcards';
  if (t.includes('quiz') || t.includes('multiple choice') || t.includes('mcq')) return 'quiz';
  if (t.includes('mind map')) return 'mind_map';
  if (t.includes('study guide') || t.includes('revision guide')) return 'study_guide';
  if (t.includes('formula') || t.includes('equation')) return 'formula_sheet';
  if (t.includes('exam question') || t.includes('mark scheme')) return 'exam_questions';
  if (t.includes('summary') || t.includes('summarise') || t.includes('summarize')) return 'summary';
  if (t.includes('data table') || t.includes('table')) return 'data_table';
  if (t.includes('timeline') || t.includes('revision plan') || t.includes('topic overview')) return 'summary';
  return null;
}

function parseFlashcards(resp) {
  const jsonMatch = resp.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try {
      const arr = JSON.parse(jsonMatch[0]);
      const valid = arr.filter(c => c.front && c.back);
      if (valid.length > 0) return valid;
    } catch {}
  }
  const lines = resp.split('\n').filter(l => l.trim());
  const pairs = [];
  let front = null;
  for (const line of lines) {
    const qMatch = line.match(/^(?:Q:|Question:|Front:|\d+[\.\)])\s*(.+)/i);
    const aMatch = line.match(/^(?:A:|Answer:|Back:)\s*(.+)/i);
    if (qMatch) { front = qMatch[1].trim(); }
    else if (aMatch && front) { pairs.push({ front, back: aMatch[1].trim() }); front = null; }
  }
  return pairs;
}

// ─── Sources Badge ────────────────────────────────────────────────────────────
function SourcesBadge({ sources }) {
  const [open, setOpen] = useState(false);
  if (!sources.length) return null;
  const withContent = sources.filter(s => s.content_text);
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[11px] font-medium hover:bg-violet-500/20 transition-all">
        <BookOpen className="w-3 h-3" />
        {withContent.length}/{sources.length} sources
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.97 }}
            className="absolute left-0 top-full mt-1.5 w-72 bg-slate-900 border border-white/15 rounded-2xl shadow-xl z-50 p-2 max-h-60 overflow-y-auto">
            <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wide px-2 pt-1 pb-1.5">Sources in context</p>
            {sources.map(s => (
              <div key={s.id} className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white/5 transition-all">
                <span className="text-sm">{s.type === 'pdf' ? '📄' : s.type === 'url' ? '🌐' : s.type === 'youtube' ? '🎬' : s.type === 'gdoc' ? '📝' : s.type === 'gslides' ? '📊' : '📋'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">{s.name}</p>
                  <p className={`text-[10px] ${s.content_text ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {s.content_text ? `${Math.round(s.content_text.length / 1000)}k chars loaded` : 'No text extracted'}
                  </p>
                </div>
                {s.content_text && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function WorkspaceCenterPanel({ notebook, user, selectedSources, allSources, onResourceCreated }) {
  const [panelTab, setPanelTab] = useState('chat'); // 'chat' | 'quiz'
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('gcse');
  const [likedMsgs, setLikedMsgs] = useState({});
  const [genProgress, setGenProgress] = useState(null);
  const [generating, setGenerating] = useState(false);
  const cancelGen = useRef({ cancelled: false });
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    base44.entities.RevisionChat.filter({ notebook_id: notebook.id, student_email: user.email })
      .then(chats => { if (chats[0]?.messages?.length) setMessages(chats[0].messages); });
  }, [notebook.id]);

  const saveChat = async (msgs) => {
    const existing = await base44.entities.RevisionChat.filter({ notebook_id: notebook.id, student_email: user.email });
    if (existing[0]) await base44.entities.RevisionChat.update(existing[0].id, { messages: msgs });
    else await base44.entities.RevisionChat.create({ notebook_id: notebook.id, student_email: user.email, messages: msgs });
  };

  const getActiveSources = () => selectedSources.length > 0 ? selectedSources : allSources;

  const buildSystemPrompt = () => {
    const active = getActiveSources().filter(s => s.content_text);
    const contextParts = active.map(s => `### Source: ${s.name}\n${s.content_text.slice(0, 8000)}`).join('\n\n---\n\n');

    const modeInstr = mode === 'alevel'
      ? 'The student is at A-Level. Use precise academic language, encourage deeper analysis and evaluation.'
      : mode === 'simple'
      ? 'Use very simple language. Short sentences. No jargon. Use analogies and everyday examples.'
      : 'The student is studying at GCSE level. Be encouraging, clear, and supportive.';

    return `You are an expert AI tutor and study assistant helping a student revise "${notebook.name}"${notebook.subject ? ` (${notebook.subject})` : ''}${notebook.exam_board ? ` for ${notebook.exam_board}` : ''}.

${modeInstr}

CAPABILITIES — you can do all of the following on request:
- Answer questions grounded in the source materials below
- Generate flashcards as a JSON array: [{"front":"...","back":"..."},...]
- Generate multiple-choice quizzes with answer explanations
- Create study guides, revision plans, mind maps, timelines, data tables
- Extract key formulas, definitions, and exam tips
- Generate exam-style questions with model answers and mark schemes
- Explain concepts simply (ELI13 mode), deeply (A-Level mode), or step-by-step
- Compare topics and documents
- Cite sources when information comes from a specific source
- Encourage and support the student throughout

${contextParts ? `STUDENT'S SOURCE MATERIALS:\n\n${contextParts}` : 'NOTE: No sources uploaded yet. Encourage the student to add materials, but still help with general questions.'}`;
  };

  // ── Batch flashcard generation ────────────────────────────────────────────
  const generateFlashcardsBatch = async () => {
    if (generating) { cancelGen.current.cancelled = true; return; }
    const sourceParts = allSources.filter(s => s.content_text);
    if (!sourceParts.length) {
      setMessages(m => [...m, { role: 'assistant', content: '⚠️ No sources with text content found. Please add some sources first.', timestamp: new Date().toISOString() }]);
      return;
    }

    setGenerating(true);
    cancelGen.current.cancelled = false;

    const CHUNK = 6000;
    const batches = [];
    for (const src of sourceParts) {
      for (let offset = 0; offset < src.content_text.length; offset += CHUNK) {
        batches.push({ sourceName: src.name, sourceId: src.id, chunk: src.content_text.slice(offset, offset + CHUNK) });
      }
    }

    setGenProgress({ generated: 0, batchLabel: 'Starting…' });
    let totalCreated = 0;

    const startMsg = { role: 'assistant', content: `🚀 Starting full flashcard generation across ${sourceParts.length} source(s) — ${batches.length} batch(es). Cards save as they're generated…`, timestamp: new Date().toISOString() };
    const updatedMsgs = [...messages, startMsg];
    setMessages(updatedMsgs);

    try {
      for (let i = 0; i < batches.length; i++) {
        if (cancelGen.current.cancelled) break;
        const batch = batches[i];
        setGenProgress({ generated: totalCreated, batchLabel: `Batch ${i + 1}/${batches.length} — ${batch.sourceName}` });

        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Generate comprehensive revision flashcards for "${notebook.subject || notebook.name}".

Rules:
- Front: clear exam-style question. No asterisks, no markdown. Example: "Define osmosis"
- Back: accurate plain text answer. No asterisks, no bold, no markdown formatting.
- Cover every concept, definition, formula, fact from the text.
- Maximum coverage, no duplicates.

TEXT (${batch.sourceName}):
${batch.chunk}`,
          response_json_schema: {
            type: 'object',
            properties: {
              flashcards: {
                type: 'array',
                items: { type: 'object', properties: { front: { type: 'string' }, back: { type: 'string' } }, required: ['front', 'back'] }
              }
            }
          }
        });

        const cards = result?.flashcards || [];
        for (const card of cards) {
          if (cancelGen.current.cancelled) break;
          if (!card.front?.trim() || !card.back?.trim()) continue;
          await base44.entities.RevisionFlashcard.create({
            notebook_id: notebook.id, student_email: user.email,
            front: cleanText(card.front), back: cleanText(card.back), is_ai_generated: true,
            source_id: batch.sourceId || null,
          });
          totalCreated++;
        }
        setGenProgress(p => ({ ...p, generated: totalCreated }));
      }
    } catch (e) { console.error(e); }

    if (totalCreated > 0) {
      const res = await base44.entities.NotebookResource.create({
        notebook_id: notebook.id, student_email: user.email,
        title: `${notebook.name} — AI Flashcards (${totalCreated})`,
        resource_type: 'flashcards', content: `${totalCreated} flashcards generated`,
        source_ids: allSources.map(s => s.id), source_count: allSources.length,
      });
      onResourceCreated(res);
    }

    const doneMsg = { role: 'assistant', content: `✅ Done! Created **${totalCreated} flashcards** from your sources. They're now in the Flashcards section.${cancelGen.current.cancelled ? ' (Cancelled early.)' : ''}`, timestamp: new Date().toISOString() };
    const finalMsgs = [...updatedMsgs, doneMsg];
    setMessages(finalMsgs);
    await saveChat(finalMsgs);

    setGenerating(false);
    setGenProgress(null);
  };

  // ── Standard send ─────────────────────────────────────────────────────────
  const sendMessage = async (text) => {
    if (!text.trim() || loading || generating) return;

    // Intercept bulk flashcard requests
    const t = text.toLowerCase();
    const isBulkFlashcard = (t.includes('generate') || t.includes('create') || t.includes('make')) &&
      t.includes('flashcard') &&
      (t.includes('all') || t.includes('every') || t.includes('maximum') || t.includes('batch') || t.includes('hundreds') || t.includes('from') || t.includes('sources') || t.includes('complete'));
    if (isBulkFlashcard) {
      setInput('');
      await generateFlashcardsBatch();
      return;
    }

    const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    const history = newMessages.slice(-14).map(m => ({ role: m.role, content: m.content }));
    const activeSources = getActiveSources();

    try {
      const resp = await base44.integrations.Core.InvokeLLM({
        prompt: text,
        system_prompt: buildSystemPrompt(),
        conversation_history: history.slice(0, -1),
      });

      const assistantMsg = { role: 'assistant', content: resp, timestamp: new Date().toISOString() };
      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);
      await saveChat(finalMessages);

      // Auto-detect resource type and save to Studio
      const resourceType = detectResourceType(text);

      if (resourceType === 'flashcards') {
        const pairs = parseFlashcards(resp);
        if (pairs.length > 0) {
          for (const pair of pairs) {
            await base44.entities.RevisionFlashcard.create({
              notebook_id: notebook.id, student_email: user.email,
              front: cleanText(pair.front), back: cleanText(pair.back), is_ai_generated: true,
            });
          }
          const res = await base44.entities.NotebookResource.create({
            notebook_id: notebook.id, student_email: user.email,
            title: `${notebook.name} — Flashcards`,
            resource_type: 'flashcards', content: JSON.stringify(pairs),
            source_ids: activeSources.map(s => s.id), source_count: activeSources.length,
          });
          onResourceCreated(res);
        }
      } else if (resourceType) {
        const titleMap = {
          quiz: 'Quiz', mind_map: 'Mind Map', study_guide: 'Study Guide',
          formula_sheet: 'Formula Sheet', exam_questions: 'Exam Questions',
          summary: 'Summary', data_table: 'Data Table', report: 'Report',
        };
        const res = await base44.entities.NotebookResource.create({
          notebook_id: notebook.id, student_email: user.email,
          title: `${notebook.name} — ${titleMap[resourceType] || resourceType}`,
          resource_type: resourceType, content: resp,
          source_ids: activeSources.map(s => s.id), source_count: activeSources.length,
        });
        onResourceCreated(res);
      }
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.', timestamp: new Date().toISOString() }]);
    }
    setLoading(false);
  };

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
      resource_type: 'notes', content, source_count: 0,
    });
    onResourceCreated(res);
  };

  const hasContent = (selectedSources.length > 0 ? selectedSources : allSources).some(s => s.content_text);

  return (
    <div className="flex flex-col h-full">
      {/* Tab switcher */}
      <div className="flex-shrink-0 flex border-b border-white/10">
        <button onClick={() => setPanelTab('chat')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-all border-b-2 ${panelTab === 'chat' ? 'border-blue-500' : 'border-transparent hover:opacity-70'}`}
          style={{ color: panelTab === 'chat' ? '#3D52A0' : '#8697C4' }}>
          <BrainCircuit className="w-3.5 h-3.5" /> AI Tutor
        </button>
        <button onClick={() => setPanelTab('quiz')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-all border-b-2 ${panelTab === 'quiz' ? 'border-blue-500' : 'border-transparent hover:opacity-70'}`}
          style={{ color: panelTab === 'quiz' ? '#3D52A0' : '#8697C4' }}>
          <ClipboardList className="w-3.5 h-3.5" /> Quiz {'&'} Test
        </button>
      </div>

      {/* Quiz & Test Tools panel */}
      {panelTab === 'quiz' && (
        <div className="flex-1 overflow-y-auto p-4">
          <QuizTestHub notebook={notebook} user={user} sources={allSources} />
        </div>
      )}

      {/* Chat panel — only rendered when tab is 'chat' */}
      {panelTab === 'chat' && <>

      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-white/10 flex items-center gap-2">
        <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center flex-shrink-0">
          <BrainCircuit className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-sm leading-tight" style={{ color: '#3D52A0' }}>Studio AI</h2>
          <p className="text-[10px] leading-tight" style={{ color: '#8697C4' }}>
            {selectedSources.length > 0 ? `${selectedSources.length} source${selectedSources.length !== 1 ? 's' : ''} selected` : `All ${allSources.length} sources`}
          </p>
        </div>

        {/* Study level mode */}
        <div className="flex gap-1">
          {TUTOR_MODES.map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${mode === m.id ? 'bg-violet-500/30 text-violet-300 border border-violet-500/40' : 'text-slate-500 hover:text-white bg-white/5'}`}>
              {m.label}
            </button>
          ))}
        </div>

        {messages.length > 0 && (
          <button onClick={clearChat} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <RefreshCw className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Sources badge */}
      <div className="flex-shrink-0 px-4 pt-2 pb-0">
        <SourcesBadge sources={allSources} />
      </div>

      {/* Quick chips */}
      <div className="flex-shrink-0 px-4 pt-2 pb-1.5 flex gap-1.5 overflow-x-auto scrollbar-hide">
        {QUICK_CHIPS.map(c => (
          <button key={c.label} onClick={() => sendMessage(c.prompt)} disabled={loading || generating}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap disabled:opacity-40 transition-all"
            style={{ background: 'rgba(112,145,230,0.12)', border: '1px solid rgba(112,145,230,0.25)', color: '#3D52A0' }}>
            {c.label}
          </button>
        ))}
      </div>

      {/* No sources warning */}
      {!hasContent && allSources.length === 0 && (
        <div className="flex-shrink-0 mx-4 mt-1 mb-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-300 text-xs font-semibold">No sources added yet</p>
            <p className="text-slate-400 text-xs mt-0.5">Add PDFs, notes, or websites in the Sources panel.</p>
          </div>
        </div>
      )}

      {/* Generation progress bar */}
      <AnimatePresence>
        {genProgress && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="flex-shrink-0 mx-4 mb-2 rounded-2xl p-3 border border-amber-500/25 overflow-hidden"
            style={{ background: 'rgba(245,158,11,0.07)' }}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
                <p className="text-amber-300 text-xs font-bold">Generating flashcards…</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-amber-400 text-xs font-bold">{genProgress.generated} saved</span>
                <button onClick={() => { cancelGen.current.cancelled = true; }} className="text-red-400 hover:text-red-300">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400"
                animate={{ width: '60%' }} transition={{ duration: 1, repeat: Infinity, repeatType: 'reverse' }} />
            </div>
            <p className="text-slate-500 text-[10px] mt-1 truncate">{genProgress.batchLabel}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-xl mx-auto mb-3 shadow-lg shadow-violet-500/30">
              <BrainCircuit className="w-6 h-6 text-white" />
            </div>
            <p className="font-bold text-sm mb-1" style={{ color: '#3D52A0' }}>Studio AI Assistant</p>
            <p className="text-xs mb-1" style={{ color: '#8697C4' }}>Fully connected to your sources.</p>
            <p className="text-[11px] mb-5" style={{ color: '#8697C4' }}>All generated content saves directly to Studio.</p>
            <div className="space-y-2 max-w-xs mx-auto">
              {SUGGESTED.map(q => (
                <button key={q} onClick={() => sendMessage(q)}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-center justify-between gap-2"
                  style={{ background: 'rgba(112,145,230,0.08)', border: '1px solid rgba(112,145,230,0.2)', color: '#3D52A0' }}>
                  <span>"{q}"</span>
                  <ChevronRight className="w-3 h-3 flex-shrink-0 text-slate-500" />
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md shadow-violet-500/20">
                <GraduationCap className="w-3 h-3 text-white" />
              </div>
            )}
            <div className={`max-w-[88%] ${m.role === 'user' ? 'order-1' : ''}`}>
              <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'rounded-br-sm shadow-lg'
                  : 'rounded-bl-sm'
              }`} style={m.role === 'user'
                ? { background: 'linear-gradient(135deg, #7091E6, #3D52A0)', color: '#fff', boxShadow: '0 4px 15px rgba(112,145,230,0.3)' }
                : { background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(112,145,230,0.2)', color: '#3D52A0', backdropFilter: 'blur(12px)' }
              }>
                <p className="whitespace-pre-wrap">{m.content}</p>
                <p className="text-[10px] mt-1" style={{ opacity: 0.5 }}>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              {m.role === 'assistant' && (
                <div className="flex items-center gap-1 mt-1 pl-0.5">
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

        {loading && (
          <div className="flex gap-2 justify-start">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-3 h-3 text-white" />
            </div>
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
      <div className="flex-shrink-0 p-4 border-t border-white/10">
        <div className="flex gap-2.5 items-end rounded-2xl p-3 transition-all" style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(112,145,230,0.3)', backdropFilter: 'blur(12px)' }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            placeholder="Ask anything, generate flashcards, create a quiz…"
            rows={1}
            style={{ maxHeight: '128px', overflowY: 'auto', color: '#3D52A0' }}
            className="flex-1 bg-transparent text-sm resize-none focus:outline-none leading-relaxed placeholder:text-blue-300"
          />
          <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading || generating}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center disabled:opacity-40 flex-shrink-0 hover:brightness-110 transition-all shadow-lg shadow-violet-500/30">
            {loading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
          </button>
        </div>
        <p className="text-[10px] mt-1.5 px-1" style={{ color: '#8697C4' }}>Enter to send · Shift+Enter for new line · Generated content auto-saves to Studio</p>
      </div>
      </>}
    </div>
  );
}