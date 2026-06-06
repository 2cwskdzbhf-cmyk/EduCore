import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Send, Loader2, RefreshCw, Copy, BookmarkPlus, ThumbsUp, ThumbsDown,
  RotateCcw, ChevronRight, AlertTriangle, GraduationCap, BookOpen,
  ChevronDown, ChevronUp, Mic, MicOff, Zap, FileText, Layers,
  Brain, X, PanelRight, ChevronLeft
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import TutorContextPanel from './TutorContextPanel';
import SourceViewerDrawer from './SourceViewerDrawer';

// ── Chips ─────────────────────────────────────────────────────────────────────
const QUICK_CHIPS = [
  { label: '📋 Summarise', prompt: 'Summarise all my sources clearly with headings and bullet points. Cover every key topic.' },
  { label: '🗂️ Flashcards', prompt: 'Generate 20 high-quality revision flashcards covering the most important concepts, definitions, and facts from my sources. Output as JSON array: [{"front":"...","back":"..."},...]' },
  { label: '❓ Quiz Me', prompt: 'Create a 10-question multiple choice quiz with 4 options each, mark the correct answer, and provide brief explanations.' },
  { label: '📖 Study Guide', prompt: 'Generate a complete structured revision study guide with topic summary, key facts, definitions, and exam tips from my sources.' },
  { label: '💡 Explain Simply', prompt: 'Explain the main concepts simply, as if I am a GCSE student. Use analogies and examples.' },
  { label: '🧒 ELI13', prompt: 'Explain the most important concept as if I am 13 years old. No jargon. Short sentences.' },
  { label: '📝 Exam Questions', prompt: 'Generate 10 likely exam questions with full model answers and mark scheme guidance based on my sources.' },
  { label: '🧠 Mind Map', prompt: 'Create a detailed mind map outline with main topics, subtopics, and connections from my sources.' },
  { label: '🔢 Key Formulas', prompt: 'Extract and explain every key formula, equation, rule, and definition from my sources.' },
  { label: '🎯 Test Me', prompt: 'Ask me a challenging question from my sources to test my understanding. Wait for my answer before explaining.' },
  { label: '⚠️ Common Mistakes', prompt: 'What are the most common mistakes students make on these topics? Explain how to avoid each one.' },
  { label: '📅 Timeline', prompt: 'Create a chronological timeline of all key events, dates, and developments from my sources.' },
  { label: '🔄 Compare Topics', prompt: 'Compare and contrast the main topics in my sources. What are the key similarities and differences?' },
];

const SUGGESTED = [
  'What are the key topics I need to know for the exam?',
  'Explain the most difficult concept in my notes simply.',
  'What connections exist between the different topics?',
  'What are the most common exam mistakes on this subject?',
];

const MODES = [
  { id: 'gcse', label: 'GCSE' },
  { id: 'alevel', label: 'A-Level' },
  { id: 'simple', label: 'Simple' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function cleanText(str) {
  return str
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .trim();
}

function detectResourceType(prompt) {
  const t = prompt.toLowerCase();
  if (t.includes('flashcard')) return 'flashcards';
  if (t.includes('quiz') || t.includes('multiple choice')) return 'quiz';
  if (t.includes('mind map')) return 'mind_map';
  if (t.includes('study guide') || t.includes('revision guide')) return 'study_guide';
  if (t.includes('formula') || t.includes('equation')) return 'formula_sheet';
  if (t.includes('exam question') || t.includes('mark scheme')) return 'exam_questions';
  if (t.includes('summary') || t.includes('summarise') || t.includes('summarize')) return 'summary';
  if (t.includes('timeline')) return 'summary';
  if (t.includes('data table') || t.includes('table')) return 'data_table';
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
  // Fallback: Q:/A: pattern
  const lines = resp.split('\n').filter(l => l.trim());
  const pairs = [];
  let front = null;
  for (const line of lines) {
    const qMatch = line.match(/^(?:Q:|Question:|Front:|\d+[\.\)])\s*(.+)/i);
    const aMatch = line.match(/^(?:A:|Answer:|Back:)\s*(.+)/i);
    if (qMatch) front = qMatch[1].trim();
    else if (aMatch && front) { pairs.push({ front, back: aMatch[1].trim() }); front = null; }
  }
  return pairs;
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function AITutorLayout({ notebook, user, onBack }) {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('gcse');
  const [likedMsgs, setLikedMsgs] = useState({});
  const [genProgress, setGenProgress] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [rightOpen, setRightOpen] = useState(true);
  const [activeSource, setActiveSource] = useState(null); // for drawer
  const [listening, setListening] = useState(false);
  const cancelGen = useRef({ cancelled: false });
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: sources = [], refetch: refetchSources, isFetched: sourcesFetched } = useQuery({
    queryKey: ['revisionSources', notebook.id],
    queryFn: () => base44.entities.RevisionSource.filter({ notebook_id: notebook.id }, '-created_date'),
    enabled: !!notebook.id,
    staleTime: 0, // always fresh
  });

  const { data: flashcards = [], refetch: refetchFlashcards } = useQuery({
    queryKey: ['revisionFlashcards', notebook.id],
    queryFn: () => base44.entities.RevisionFlashcard.filter({ notebook_id: notebook.id }),
    enabled: !!notebook.id,
  });

  const { data: resources = [], refetch: refetchResources } = useQuery({
    queryKey: ['notebookResources', notebook.id],
    queryFn: () => base44.entities.NotebookResource.filter({ notebook_id: notebook.id }, '-created_date'),
    enabled: !!notebook.id,
  });

  // Derive source stats for display and prompt building
  const sourcesWithText = sources.filter(s => s.content_text && s.content_text.length > 0);
  const totalSourceChars = sourcesWithText.reduce((acc, s) => acc + s.content_text.length, 0);

  const handleResourceCreated = useCallback(() => {
    refetchResources();
    refetchFlashcards();
  }, [refetchResources, refetchFlashcards]);

  // Real-time subscriptions for instant sync
  useEffect(() => {
    const unsub1 = base44.entities.RevisionFlashcard.subscribe(() => refetchFlashcards());
    const unsub2 = base44.entities.NotebookResource.subscribe(() => refetchResources());
    const unsub3 = base44.entities.RevisionSource.subscribe(() => refetchSources());
    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Load chat history
  useEffect(() => {
    base44.entities.RevisionChat.filter({ notebook_id: notebook.id, student_email: user.email })
      .then(chats => { if (chats[0]?.messages?.length) setMessages(chats[0].messages); });
  }, [notebook.id]);

  const saveChat = async (msgs) => {
    const existing = await base44.entities.RevisionChat.filter({ notebook_id: notebook.id, student_email: user.email });
    if (existing[0]) await base44.entities.RevisionChat.update(existing[0].id, { messages: msgs });
    else await base44.entities.RevisionChat.create({ notebook_id: notebook.id, student_email: user.email, messages: msgs });
  };

  // ── System prompt ─────────────────────────────────────────────────────────
  // NOTE: uses sourcesWithText from component scope (derived above), not a stale closure
  const buildSystemPrompt = useCallback((currentSources) => {
    const sw = (currentSources || sources).filter(s => s.content_text && s.content_text.length > 0);
    const allSourceNames = (currentSources || sources).map(s => `- ${s.name} (${s.type})`).join('\n') || 'None';

    // Distribute character budget across sources evenly (max 60k total)
    const TOTAL_BUDGET = 60000;
    const perSourceBudget = sw.length > 0 ? Math.floor(TOTAL_BUDGET / sw.length) : TOTAL_BUDGET;
    const contextParts = sw
      .map(s => `=== SOURCE: "${s.name}" (${s.type}) ===\n${s.content_text.slice(0, perSourceBudget)}`)
      .join('\n\n');

    const modeInstr = mode === 'alevel'
      ? 'The student is at A-Level. Use precise academic language, encourage deeper analysis and evaluation.'
      : mode === 'simple'
      ? 'Use very simple language. Short sentences. No jargon. Use analogies and everyday examples.'
      : 'The student is studying at GCSE level. Be encouraging, clear, and supportive.';

    const noSourcesTotally = (currentSources || sources).length === 0;
    const noTextExtracted = (currentSources || sources).length > 0 && sw.length === 0;

    let sourceSection;
    if (noSourcesTotally) {
      sourceSection = `NO SOURCES: This notebook has no sources attached yet. If the student asks you to summarise, create flashcards, quizzes, or any content, respond with exactly: "This notebook doesn't have any sources yet. Add sources first in the Sources tab, then I can summarise, create flashcards, or help with any topic."`;
    } else if (noTextExtracted) {
      sourceSection = `SOURCES ATTACHED (${(currentSources || sources).length} files) — text extraction still processing:
${allSourceNames}

The files are attached but text is still being extracted. Tell the student their sources are processing and to try again in a moment. For now, answer general subject questions.`;
    } else {
      sourceSection = `YOU HAVE ${sw.length} SOURCE(S) FULLY LOADED (${Math.round((sw.reduce((a,s)=>a+s.content_text.length,0))/1000)}k chars total):
${allSourceNames}

THE COMPLETE SOURCE CONTENT IS BELOW. USE IT TO ANSWER EVERYTHING:

${contextParts}

END OF SOURCES. Always cite the source name when answering (e.g. "According to your Chemistry Notes...").`;
    }

    return `You are the AI Tutor for notebook "${notebook.name}"${notebook.subject ? ` — ${notebook.subject}` : ''}${notebook.exam_board ? ` (${notebook.exam_board})` : ''}.

ABSOLUTE RULES (never break these):
1. The student's notebook sources are provided below in full. You have them. NEVER ask for sources.
2. NEVER say "provide", "paste", "upload", "share", or "send" sources/notes/text. They are already here.
3. NEVER say "I don't have access to your notes" — you do, they are below.
4. For ANY task (summarise, flashcards, quiz, explain, timeline, exam questions) — start immediately using the sources below.
5. If there truly are no sources, say only: "This notebook doesn't have any sources yet. Add sources in the Sources tab and I can help immediately."
6. Always reference which source you're drawing from. E.g. "Based on your ${notebook.name} notes..."

${modeInstr}

Flashcard format: JSON array [{"front":"question","back":"plain text answer"}]. No asterisks, no markdown in flashcard text.

${sourceSection}`;
  }, [sources, mode, notebook]);

  // ── Voice input ───────────────────────────────────────────────────────────
  const toggleVoice = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return;
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = 'en-GB';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput(prev => prev + (prev ? ' ' : '') + transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
  };

  // ── Bulk flashcard generation ─────────────────────────────────────────────
  const generateFlashcardsBatch = async () => {
    if (generating) { cancelGen.current.cancelled = true; return; }
    const sourceParts = sources.filter(s => s.content_text);
    if (!sourceParts.length) {
      setMessages(m => [...m, { role: 'assistant', content: 'No sources with text content found. Please add some sources first.', timestamp: new Date().toISOString() }]);
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
    setGenProgress({ generated: 0, batchLabel: 'Starting...' });
    let totalCreated = 0;
    const startMsg = { role: 'assistant', content: `Starting flashcard generation across ${sourceParts.length} source(s) — ${batches.length} batch(es). Cards save as they are generated...`, timestamp: new Date().toISOString() };
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
- Back: accurate plain text answer. No asterisks, no markdown, no bold.
- Cover every concept, definition, formula, fact from the text.
- Output as JSON: {"flashcards": [{"front":"...","back":"..."},...]}

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
            front: cleanText(card.front), back: cleanText(card.back),
            is_ai_generated: true, source_id: batch.sourceId || null,
          });
          totalCreated++;
        }
        setGenProgress(p => ({ ...p, generated: totalCreated }));
      }
    } catch (e) { console.error(e); }

    if (totalCreated > 0) {
      await base44.entities.NotebookResource.create({
        notebook_id: notebook.id, student_email: user.email,
        title: `${notebook.name} — AI Flashcards (${totalCreated})`,
        resource_type: 'flashcards', content: `${totalCreated} flashcards generated`,
        source_ids: sources.map(s => s.id), source_count: sources.length,
      });
      handleResourceCreated();
    }
    const doneMsg = { role: 'assistant', content: `Done! Created ${totalCreated} flashcard${totalCreated !== 1 ? 's' : ''} from your sources. They are now in the Flashcards tab.${cancelGen.current.cancelled ? ' (Cancelled early.)' : ''}`, timestamp: new Date().toISOString() };
    const finalMsgs = [...updatedMsgs, doneMsg];
    setMessages(finalMsgs);
    await saveChat(finalMsgs);
    setGenerating(false);
    setGenProgress(null);
  };

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = async (text) => {
    if (!text.trim() || loading || generating) return;
    const t = text.toLowerCase();
    const isBulk = (t.includes('generate') || t.includes('create') || t.includes('make')) &&
      t.includes('flashcard') &&
      (t.includes('all') || t.includes('every') || t.includes('maximum') || t.includes('batch') || t.includes('from') || t.includes('sources') || t.includes('complete'));
    if (isBulk) { setInput(''); await generateFlashcardsBatch(); return; }

    const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    const history = newMessages.slice(-14).map(m => ({ role: m.role, content: m.content }));

    // Always pass current sources snapshot to avoid stale closure
    const currentSources = sources;
    const sw = currentSources.filter(s => s.content_text && s.content_text.length > 0);
    const isSourceBased = /summar|flashcard|quiz|explain|study guide|timeline|mind map|formula|exam question|key topic|revision/i.test(text);
    const effectivePrompt = (isSourceBased && sw.length > 0)
      ? `${text}\n\n[SYSTEM NOTE: The notebook sources are fully loaded in the system prompt. Do NOT ask for any sources. Begin your response immediately using the source content above.]`
      : text;

    try {
      const resp = await base44.integrations.Core.InvokeLLM({
        prompt: effectivePrompt,
        system_prompt: buildSystemPrompt(currentSources),
        conversation_history: history.slice(0, -1),
      });
      const assistantMsg = { role: 'assistant', content: resp, timestamp: new Date().toISOString() };
      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);
      await saveChat(finalMessages);

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
          await base44.entities.NotebookResource.create({
            notebook_id: notebook.id, student_email: user.email,
            title: `${notebook.name} — Flashcards`,
            resource_type: 'flashcards', content: JSON.stringify(pairs),
            source_ids: sources.map(s => s.id), source_count: sources.length,
          });
          handleResourceCreated();
        }
      } else if (resourceType) {
        const titleMap = { quiz: 'Quiz', mind_map: 'Mind Map', study_guide: 'Study Guide', formula_sheet: 'Formula Sheet', exam_questions: 'Exam Questions', summary: 'Summary', data_table: 'Data Table' };
        await base44.entities.NotebookResource.create({
          notebook_id: notebook.id, student_email: user.email,
          title: `${notebook.name} — ${titleMap[resourceType] || resourceType}`,
          resource_type: resourceType, content: resp,
          source_ids: sources.map(s => s.id), source_count: sources.length,
        });
        handleResourceCreated();
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
    await base44.entities.NotebookResource.create({
      notebook_id: notebook.id, student_email: user.email,
      title: `Saved Note — ${new Date().toLocaleDateString('en-GB')}`,
      resource_type: 'notes', content, source_count: 0,
    });
    handleResourceCreated();
  };

  const hasContent = sourcesWithText.length > 0;

  return (
    <div className="fixed inset-0 bg-[#0d0d14] flex flex-col z-50">
      {/* Top bar */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.07] bg-[#0d0d14]/95 backdrop-blur-xl z-10">
        <button onClick={onBack} className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm font-medium">
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back</span>
        </button>
        <div className="w-px h-5 bg-white/10" />
        <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-sm flex-shrink-0">
          {notebook.icon || '📚'}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-white font-bold text-sm truncate leading-tight">{notebook.name}</h1>
          <p className="text-slate-600 text-[10px] leading-tight">{notebook.subject || ''}{notebook.exam_board ? ` · ${notebook.exam_board}` : ''}</p>
        </div>
        <div className="hidden md:flex items-center gap-3 text-xs text-slate-500">
          <span className={`flex items-center gap-1 ${hasContent ? 'text-emerald-500' : ''}`}>
            <BookOpen className="w-3 h-3" /> {sourcesWithText.length}/{sources.length} sources
          </span>
          <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> {flashcards.length} cards</span>
        </div>
        {/* Mode selector */}
        <div className="flex gap-1 bg-white/5 rounded-lg p-0.5">
          {MODES.map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${mode === m.id ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
              {m.label}
            </button>
          ))}
        </div>
        <button onClick={() => setRightOpen(o => !o)}
          className={`p-2 rounded-lg transition-all ${rightOpen ? 'bg-violet-500/20 text-violet-300' : 'text-slate-500 hover:text-white bg-white/5'}`}>
          <PanelRight className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Chat Panel ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chips */}
          <div className="flex-shrink-0 px-4 pt-3 pb-2 flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {QUICK_CHIPS.map(c => (
              <button key={c.label} onClick={() => sendMessage(c.prompt)} disabled={loading || generating}
                className="flex-shrink-0 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-[11px] text-slate-300 hover:text-white hover:bg-violet-500/15 hover:border-violet-500/30 transition-all font-medium whitespace-nowrap disabled:opacity-40">
                {c.label}
              </button>
            ))}
          </div>

          {/* Source status bar */}
          {sourcesFetched && (
            <div className={`mx-4 mb-2 px-3 py-2 rounded-xl flex items-center gap-2 text-[11px] ${
              hasContent
                ? 'bg-emerald-500/8 border border-emerald-500/15'
                : sources.length > 0
                ? 'bg-amber-500/8 border border-amber-500/20'
                : 'bg-amber-500/10 border border-amber-500/20'
            }`}>
              {hasContent ? (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                  <span className="text-emerald-400 font-semibold">
                    {sourcesWithText.length} source{sourcesWithText.length !== 1 ? 's' : ''} loaded
                    {totalSourceChars > 0 && ` · ${Math.round(totalSourceChars / 1000)}k chars`}
                  </span>
                  <span className="text-slate-600 truncate">— {sourcesWithText.map(s => s.name).join(', ')}</span>
                </>
              ) : sources.length > 0 ? (
                <>
                  <Loader2 className="w-3 h-3 text-amber-400 animate-spin flex-shrink-0" />
                  <span className="text-amber-300 font-semibold">{sources.length} source{sources.length !== 1 ? 's' : ''} attached — text still processing</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span className="text-amber-300 font-semibold">No sources yet</span>
                  <span className="text-slate-500">— add PDFs, notes, or websites in the Sources tab</span>
                </>
              )}
            </div>
          )}

          {/* Progress bar */}
          <AnimatePresence>
            {genProgress && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="mx-4 mb-2 rounded-xl p-3 border border-violet-500/25 bg-violet-500/[0.07] overflow-hidden flex-shrink-0">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin" />
                    <p className="text-violet-300 text-xs font-semibold">Generating flashcards...</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-violet-400 text-xs font-bold">{genProgress.generated} saved</span>
                    <button onClick={() => { cancelGen.current.cancelled = true; }} className="text-red-400 hover:text-red-300 p-0.5 rounded">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
                  <motion.div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-400"
                    animate={{ width: '70%' }} transition={{ duration: 1.2, repeat: Infinity, repeatType: 'reverse' }} />
                </div>
                <p className="text-slate-500 text-[10px] mt-1 truncate">{genProgress.batchLabel}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-5">
            {messages.length === 0 && (
              <div className="text-center py-10">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-violet-500/20">
                  <Brain className="w-7 h-7 text-white" />
                </div>
                <p className="text-white font-bold text-base mb-1">AI Tutor</p>
                {hasContent ? (
                  <p className="text-emerald-400 text-sm mb-1 font-medium">✓ {sourcesWithText.length} source{sourcesWithText.length !== 1 ? 's' : ''} loaded — ready to help</p>
                ) : (
                  <p className="text-amber-400 text-sm mb-1 font-medium">Add sources to get started</p>
                )}
                <p className="text-slate-600 text-xs mb-7">Everything generated saves instantly to your notebook.</p>
                <div className="space-y-2 max-w-sm mx-auto">
                  {SUGGESTED.map(q => (
                    <button key={q} onClick={() => sendMessage(q)}
                      className="w-full text-left px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] hover:border-violet-500/25 text-slate-300 text-sm transition-all flex items-center justify-between gap-2">
                      <span>{q}</span>
                      <ChevronRight className="w-4 h-4 flex-shrink-0 text-slate-600" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
                className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-lg shadow-violet-500/20">
                    <GraduationCap className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className={`max-w-[82%] ${m.role === 'user' ? 'order-1' : ''}`}>
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-gradient-to-br from-violet-600 to-purple-700 text-white rounded-tr-sm shadow-lg shadow-violet-500/20'
                      : 'bg-white/[0.05] border border-white/[0.08] text-slate-200 rounded-tl-sm'
                  }`}>
                    {m.role === 'assistant' ? (
                      <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-white/10 prose-pre:rounded-xl prose-code:text-violet-300 prose-code:bg-white/10 prose-code:px-1 prose-code:rounded">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    )}
                    <p className="text-[10px] opacity-30 mt-2">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  {m.role === 'assistant' && (
                    <div className="flex items-center gap-0.5 mt-1.5 pl-0.5">
                      <ActionBtn icon={Copy} title="Copy" onClick={() => copyMsg(m.content)} />
                      <ActionBtn icon={BookmarkPlus} title="Save to Notes" onClick={() => saveToNotes(m.content)} hoverClass="hover:text-violet-400 hover:bg-violet-500/10" />
                      <ActionBtn icon={ThumbsUp} title="Good" onClick={() => setLikedMsgs(l => ({ ...l, [i]: l[i] === 'up' ? null : 'up' }))} activeClass={likedMsgs[i] === 'up' ? 'text-emerald-400 bg-emerald-500/10' : ''} hoverClass="hover:text-emerald-400" />
                      <ActionBtn icon={ThumbsDown} title="Bad" onClick={() => setLikedMsgs(l => ({ ...l, [i]: l[i] === 'down' ? null : 'down' }))} activeClass={likedMsgs[i] === 'down' ? 'text-red-400 bg-red-500/10' : ''} hoverClass="hover:text-red-400" />
                      <ActionBtn icon={RotateCcw} title="Regenerate" onClick={() => sendMessage(messages[i - 1]?.content || '')} hoverClass="hover:text-amber-400" />
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white/[0.05] border border-white/[0.08] rounded-2xl rounded-tl-sm px-5 py-4">
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map(i => (
                      <motion.div key={i} className="w-2 h-2 bg-violet-400 rounded-full"
                        animate={{ y: [0, -6, 0] }} transition={{ duration: 0.55, delay: i * 0.13, repeat: Infinity }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div className="flex-shrink-0 p-4 border-t border-white/[0.07]">
            <div className="flex gap-2.5 items-end bg-white/[0.04] border border-white/[0.1] focus-within:border-violet-500/50 rounded-2xl p-3 transition-all shadow-inner">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                placeholder="Ask anything, generate flashcards, create a quiz..."
                rows={1}
                style={{ maxHeight: '120px', overflowY: 'auto' }}
                className="flex-1 bg-transparent text-white text-sm resize-none focus:outline-none placeholder:text-slate-600 leading-relaxed"
              />
              <button onClick={toggleVoice}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${listening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'text-slate-500 hover:text-white hover:bg-white/10'}`}>
                {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading || generating}
                className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center disabled:opacity-40 flex-shrink-0 hover:brightness-110 transition-all shadow-lg shadow-violet-500/30">
                {loading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
              </button>
            </div>
            <div className="flex items-center justify-between mt-1.5 px-1">
              <p className="text-[10px] text-slate-600">Enter to send · Shift+Enter for new line</p>
              {messages.length > 0 && (
                <button onClick={clearChat} className="text-[10px] text-slate-600 hover:text-red-400 flex items-center gap-1 transition-colors">
                  <RefreshCw className="w-2.5 h-2.5" /> Clear chat
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Right Context Panel ── */}
        <AnimatePresence initial={false}>
          {rightOpen && (
            <motion.div
              key="context"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 340, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
              className="flex-shrink-0 overflow-hidden border-l border-white/[0.07] bg-[#0e0e17]"
            >
              <div className="w-[340px] h-full flex flex-col">
                <TutorContextPanel
                  notebook={notebook}
                  user={user}
                  sources={sources}
                  flashcards={flashcards}
                  resources={resources}
                  onRefreshSources={refetchSources}
                  onOpenSource={setActiveSource}
                  onResourceCreated={handleResourceCreated}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Source viewer drawer */}
      <AnimatePresence>
        {activeSource && (
          <SourceViewerDrawer source={activeSource} onClose={() => setActiveSource(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function ActionBtn({ icon: Icon, title, onClick, hoverClass = 'hover:text-slate-300', activeClass = '' }) {
  return (
    <button onClick={onClick} title={title}
      className={`p-1.5 rounded-lg text-slate-600 ${hoverClass} hover:bg-white/[0.06] transition-all ${activeClass}`}>
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}