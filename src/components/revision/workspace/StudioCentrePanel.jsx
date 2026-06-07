import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import {
  Send, Loader2, RefreshCw, GraduationCap, BrainCircuit,
  BookmarkPlus, Copy, RotateCcw,
  Layers, Zap, ClipboardCheck, Timer, Calculator, FlaskConical,
  BarChart2, Network, Video, Mic2, MessageSquare, FileText, StickyNote, BookOpen
} from 'lucide-react';
import FlashcardStudyOverlay from './FlashcardStudyOverlay';
import EquationSolver from '@/components/ailab/EquationSolver';
import ChemistryBalancer from '@/components/ailab/ChemistryBalancer';
import GraphGenerator from '@/components/ailab/GraphGenerator';
import MindMapGenerator from '@/components/ailab/MindMapGenerator';

// ── helpers ────────────────────────────────────────────────────────────────────
function cleanText(str = '') {
  return str.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1').replace(/_([^_]+)_/g, '$1').trim();
}
function getContext(sources) {
  return sources.filter(s => s.content_text)
    .map(s => `### ${s.name}\n${s.content_text.slice(0, 8000)}`).join('\n\n---\n\n');
}

// ── No-source guard ────────────────────────────────────────────────────────────
function NoSources({ onAddSource }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 py-16">
      <div className="text-5xl mb-4">📂</div>
      <h3 className="text-white font-bold text-lg mb-2">No sources yet</h3>
      <p className="text-slate-400 text-sm max-w-sm">This notebook has no sources yet. Add sources first to use this tool.</p>
    </div>
  );
}

// ── Tool header ────────────────────────────────────────────────────────────────
function ToolHeader({ icon: ToolIcon, label, color, children }) {
  return (
    <div className="flex-shrink-0 px-6 py-4 border-b border-white/10 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0 shadow-lg`}>
        <ToolIcon className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-white font-bold text-base leading-tight">{label}</h2>
      </div>
      {children}
    </div>
  );
}

// ── AI Chat (AI Tutor) ─────────────────────────────────────────────────────────
const QUICK_CHIPS = [
  { label: '📋 Summarise', prompt: 'Summarise all my sources clearly with headings and bullet points.' },
  { label: '💡 Explain Simply', prompt: 'Explain the main concepts simply, as if I\'m a GCSE student.' },
  { label: '🧒 ELI13', prompt: 'Explain the most important concept as if I\'m 13 years old.' },
  { label: '🔢 Key Formulas', prompt: 'Extract and explain every key formula, equation, and definition.' },
  { label: '📝 Exam Questions', prompt: 'Generate 10 likely exam questions with full model answers.' },
  { label: '⚠️ Common Mistakes', prompt: 'What are the most common mistakes students make on these topics?' },
  { label: '🎯 Test Me', prompt: 'Ask me a challenging question from my sources to test my understanding.' },
  { label: '📅 Timeline', prompt: 'Create a chronological timeline of all key events and dates.' },
];

function AIChatTool({ notebook, user, allSources, onResourceCreated }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('gcse');
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  useEffect(() => {
    base44.entities.RevisionChat.filter({ notebook_id: notebook.id, student_email: user.email })
      .then(chats => { if (chats[0]?.messages?.length) setMessages(chats[0].messages); });
  }, [notebook.id]);

  const saveChat = async (msgs) => {
    const existing = await base44.entities.RevisionChat.filter({ notebook_id: notebook.id, student_email: user.email });
    if (existing[0]) await base44.entities.RevisionChat.update(existing[0].id, { messages: msgs });
    else await base44.entities.RevisionChat.create({ notebook_id: notebook.id, student_email: user.email, messages: msgs });
  };

  const buildSystem = () => {
    const ctx = getContext(allSources);
    const modeInstr = mode === 'alevel' ? 'Use precise academic A-Level language.' : mode === 'simple' ? 'Use very simple language, no jargon.' : 'Be encouraging and clear for a GCSE student.';
    return `You are an expert AI tutor helping a student revise "${notebook.name}"${notebook.subject ? ` (${notebook.subject})` : ''}. ${modeInstr}\n\n${ctx ? `STUDENT SOURCES:\n\n${ctx}` : 'No sources uploaded yet. Help with general questions.'}`;
  };

  const send = async (text) => {
    if (!text.trim() || loading) return;
    const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs); setInput(''); setLoading(true);
    try {
      const resp = await base44.integrations.Core.InvokeLLM({
        prompt: text,
        system_prompt: buildSystem(),
        conversation_history: newMsgs.slice(-14, -1).map(m => ({ role: m.role, content: m.content })),
      });
      const assistantMsg = { role: 'assistant', content: resp, timestamp: new Date().toISOString() };
      const final = [...newMsgs, assistantMsg];
      setMessages(final);
      await saveChat(final);
      // Auto-save notes/summaries
      const t = text.toLowerCase();
      if (t.includes('summar') || t.includes('overview') || t.includes('guide')) {
        const res = await base44.entities.NotebookResource.create({
          notebook_id: notebook.id, student_email: user.email,
          title: `Summary — ${new Date().toLocaleDateString()}`,
          resource_type: 'summary', content: resp, source_count: allSources.length,
        });
        onResourceCreated(res);
      }
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.', timestamp: new Date().toISOString() }]);
    }
    setLoading(false);
  };

  const saveToNotes = async (content) => {
    const res = await base44.entities.NotebookResource.create({
      notebook_id: notebook.id, student_email: user.email,
      title: `Saved Note — ${new Date().toLocaleDateString()}`,
      resource_type: 'notes', content, source_count: 0,
    });
    onResourceCreated(res);
  };

  return (
    <div className="flex flex-col h-full">
      <ToolHeader icon={BrainCircuit} label="AI Tutor" color="from-violet-600 to-purple-700">
        <div className="flex gap-1">
          {[{id:'gcse',l:'GCSE'},{id:'alevel',l:'A-Level'},{id:'simple',l:'Simple'}].map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${mode === m.id ? 'bg-violet-500/30 text-violet-300 border border-violet-500/40' : 'text-slate-500 hover:text-white bg-white/5'}`}>
              {m.l}
            </button>
          ))}
        </div>
        {messages.length > 0 && (
          <button onClick={async () => { setMessages([]); const ex = await base44.entities.RevisionChat.filter({ notebook_id: notebook.id, student_email: user.email }); if (ex[0]) await base44.entities.RevisionChat.update(ex[0].id, { messages: [] }); }}
            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all ml-1">
            <RefreshCw className="w-3 h-3" />
          </button>
        )}
      </ToolHeader>

      {/* Quick chips */}
      <div className="flex-shrink-0 px-6 py-2 flex gap-1.5 overflow-x-auto border-b border-white/5">
        {QUICK_CHIPS.map(c => (
          <button key={c.label} onClick={() => send(c.prompt)} disabled={loading}
            className="flex-shrink-0 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300 hover:text-white hover:bg-violet-500/15 hover:border-violet-500/30 transition-all font-medium whitespace-nowrap disabled:opacity-40">
            {c.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-xl mx-auto mb-4 shadow-lg shadow-violet-500/30">
              <BrainCircuit className="w-7 h-7 text-white" />
            </div>
            <p className="text-white font-bold text-base mb-1">Studio AI Assistant</p>
            <p className="text-slate-400 text-sm mb-1">Connected to your {allSources.length} source{allSources.length !== 1 ? 's' : ''}.</p>
            <p className="text-slate-500 text-xs">Ask anything — generated content saves to Created Items.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                <GraduationCap className="w-3.5 h-3.5 text-white" />
              </div>
            )}
            <div className={`max-w-[85%]`}>
              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-gradient-to-br from-violet-600 to-purple-700 text-white rounded-br-sm'
                  : 'bg-white/[0.06] border border-white/10 text-slate-200 rounded-bl-sm'
              }`}>
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
              {m.role === 'assistant' && (
                <div className="flex items-center gap-1 mt-1 pl-0.5">
                  <button onClick={() => navigator.clipboard.writeText(m.content)} className="p-1.5 rounded text-slate-600 hover:text-slate-300 transition-all"><Copy className="w-3 h-3" /></button>
                  <button onClick={() => saveToNotes(m.content)} className="p-1.5 rounded text-slate-600 hover:text-violet-400 transition-all"><BookmarkPlus className="w-3 h-3" /></button>
                </div>
              )}
            </div>
          </motion.div>
        ))}
        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="bg-white/[0.06] border border-white/10 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                {[0,1,2].map(i => <motion.div key={i} className="w-1.5 h-1.5 bg-violet-400 rounded-full" animate={{ y: [0,-5,0] }} transition={{ duration: 0.5, delay: i*0.12, repeat: Infinity }} />)}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-white/10">
        <div className="flex gap-3 items-end bg-white/5 border border-white/15 focus-within:border-violet-500/50 rounded-2xl p-3 transition-all">
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder="Ask anything about your sources…" rows={1}
            style={{ maxHeight: '120px', overflowY: 'auto' }}
            className="flex-1 bg-transparent text-white text-sm resize-none focus:outline-none placeholder:text-slate-500 leading-relaxed" />
          <button onClick={() => send(input)} disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center disabled:opacity-40 flex-shrink-0 hover:brightness-110 transition-all">
            {loading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Flashcards Tool ────────────────────────────────────────────────────────────
function FlashcardsTool({ notebook, user, allSources, flashcards, onResourceCreated, onRefreshFlashcards }) {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(null);
  const [studyCards, setStudyCards] = useState(null);
  const cancelRef = useRef({ cancelled: false });

  const generate = async () => {
    const sourceParts = allSources.filter(s => s.content_text);
    if (!sourceParts.length) return;
    setGenerating(true); cancelRef.current.cancelled = false;
    const CHUNK = 6000;
    const batches = [];
    for (const src of sourceParts) {
      for (let o = 0; o < src.content_text.length; o += CHUNK) {
        batches.push({ sourceName: src.name, sourceId: src.id, chunk: src.content_text.slice(o, o + CHUNK) });
      }
    }
    setProgress({ generated: 0, total: batches.length * 40, label: 'Starting…' });
    const allCreated = [];
    for (let i = 0; i < batches.length; i++) {
      if (cancelRef.current.cancelled) break;
      const batch = batches[i];
      setProgress(p => ({ ...p, label: `Batch ${i+1}/${batches.length} — ${batch.sourceName}` }));
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate comprehensive revision flashcards for "${notebook.subject || notebook.name}". Extract every concept, definition, formula, and fact.
Rules: Front = clear exam-style question. Back = accurate plain text answer. No markdown symbols.
TEXT (${batch.sourceName}): ${batch.chunk}`,
        response_json_schema: {
          type: 'object',
          properties: { flashcards: { type: 'array', items: { type: 'object', properties: { front: { type: 'string' }, back: { type: 'string' } }, required: ['front','back'] } } }
        }
      });
      const cards = result?.flashcards || [];
      for (const card of cards) {
        if (cancelRef.current.cancelled) break;
        if (!card.front?.trim() || !card.back?.trim()) continue;
        const rec = await base44.entities.RevisionFlashcard.create({
          notebook_id: notebook.id, student_email: user.email,
          front: cleanText(card.front), back: cleanText(card.back), is_ai_generated: true, source_id: batch.sourceId,
        });
        allCreated.push(rec);
      }
      setProgress(p => ({ ...p, generated: allCreated.length }));
    }
    if (allCreated.length > 0) {
      const title = `${notebook.name} — Flashcards (${allCreated.length} cards)`;
      const res = await base44.entities.NotebookResource.create({
        notebook_id: notebook.id, student_email: user.email,
        title, resource_type: 'flashcards',
        content: JSON.stringify({ totalCards: allCreated.length }),
        source_ids: allSources.map(s => s.id), source_count: allSources.length,
      });
      onResourceCreated(res);
      onRefreshFlashcards();
      setStudyCards(allCreated);
    }
    setGenerating(false); setProgress(null);
  };

  if (studyCards) {
    return (
      <div className="flex flex-col h-full" style={{ background: 'radial-gradient(ellipse at 50% 30%, #1e1b4b 0%, #0f0f1a 70%)' }}>
        <FlashcardStudyOverlay cards={studyCards} title={`${notebook.name} — Flashcards`} onClose={() => setStudyCards(null)} onRefresh={onRefreshFlashcards} mode="inline" />
      </div>
    );
  }

  if (flashcards.length > 0 && !generating) {
    return (
      <div className="flex flex-col h-full">
        <ToolHeader icon={Layers} label="Flashcards" color="from-amber-500 to-orange-500">
          <button onClick={generate} disabled={generating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-semibold hover:bg-amber-500/30 transition-all disabled:opacity-50">
            + Generate More
          </button>
        </ToolHeader>
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="text-slate-400 text-sm">{flashcards.length} cards in this notebook</span>
            <button onClick={() => setStudyCards(flashcards)}
              className="px-4 py-2 bg-gradient-to-br from-amber-500 to-orange-500 text-white font-bold text-sm rounded-xl hover:brightness-110 transition-all shadow-lg shadow-amber-500/20">
              ▶ Study All Cards
            </button>
          </div>
          <div className="grid gap-3">
            {flashcards.slice(0, 20).map((card, i) => (
              <div key={card.id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <p className="text-white font-semibold text-sm mb-2">{cleanText(card.front)}</p>
                <p className="text-slate-400 text-sm border-t border-white/10 pt-2 mt-2">{cleanText(card.back)}</p>
              </div>
            ))}
            {flashcards.length > 20 && <p className="text-slate-600 text-sm text-center py-2">+ {flashcards.length - 20} more cards</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ToolHeader icon={Layers} label="Flashcards" color="from-amber-500 to-orange-500" />
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        {generating && progress ? (
          <div className="w-full max-w-sm">
            <div className="text-4xl mb-4">🗂️</div>
            <p className="text-white font-bold text-lg mb-1">Generating Flashcards…</p>
            <p className="text-amber-300 text-sm mb-4 font-semibold">{progress.generated} cards saved</p>
            <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden mb-2">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400"
                animate={{ width: '60%' }} transition={{ duration: 1.5, repeat: Infinity, repeatType: 'reverse' }} />
            </div>
            <p className="text-slate-500 text-xs truncate">{progress.label}</p>
            <button onClick={() => { cancelRef.current.cancelled = true; }} className="mt-4 text-red-400 text-xs hover:text-red-300">Cancel</button>
          </div>
        ) : (
          <>
            <div className="text-5xl mb-4">🗂️</div>
            <h3 className="text-white font-bold text-xl mb-2">Generate Flashcards</h3>
            <p className="text-slate-400 text-sm mb-6 max-w-sm">AI will create high-quality flashcards from all your notebook sources — covering every concept, definition, and formula.</p>
            <button onClick={generate} disabled={!allSources.some(s => s.content_text)}
              className="px-8 py-3.5 bg-gradient-to-br from-amber-500 to-orange-500 text-white font-bold text-base rounded-2xl hover:brightness-110 transition-all shadow-xl shadow-amber-500/25 disabled:opacity-50">
              Generate Flashcards
            </button>
            {!allSources.some(s => s.content_text) && <p className="text-slate-500 text-xs mt-3">Add sources first</p>}
          </>
        )}
      </div>
    </div>
  );
}

// ── Generic Generate Tool (Quiz, Test, Exam Sim, Summary, Topic Breakdown) ──────
function GenerateTool({ icon: Icon, label, color, prompt, resourceType, notebook, user, allSources, onResourceCreated }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const generate = async () => {
    setLoading(true); setResult(null);
    const ctx = getContext(allSources);
    try {
      const content = await base44.integrations.Core.InvokeLLM({ prompt: `${prompt}\n\nSOURCE MATERIALS:\n${ctx}` });
      setResult(content);
      const num = Date.now();
      const res = await base44.entities.NotebookResource.create({
        notebook_id: notebook.id, student_email: user.email,
        title: `${notebook.name} — ${label}`,
        resource_type: resourceType, content: typeof content === 'string' ? content : JSON.stringify(content),
        source_ids: allSources.map(s => s.id), source_count: allSources.length,
      });
      onResourceCreated(res);
    } catch {}
    setLoading(false);
  };

  const hasSources = allSources.some(s => s.content_text);

  return (
    <div className="flex flex-col h-full">
      <ToolHeader icon={Icon} label={label} color={color}>
        {result && (
          <button onClick={() => { setResult(null); }}
            className="px-3 py-1.5 bg-white/5 border border-white/10 text-slate-400 rounded-xl text-xs hover:text-white transition-all">
            Regenerate
          </button>
        )}
      </ToolHeader>
      {!result ? (
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          {loading ? (
            <div>
              <Loader2 className="w-10 h-10 text-violet-400 animate-spin mx-auto mb-4" />
              <p className="text-white font-bold text-lg">Generating {label}…</p>
              <p className="text-slate-400 text-sm mt-1">Using your notebook sources</p>
            </div>
          ) : (
            <>
              <div className="text-5xl mb-4">{label === 'Quiz' ? '⚡' : label === 'Test' ? '📝' : label === 'Exam Simulation' ? '⏱️' : label === 'Summary' ? '📋' : '🗺️'}</div>
              <h3 className="text-white font-bold text-xl mb-2">Generate {label}</h3>
              <p className="text-slate-400 text-sm mb-6 max-w-sm">AI will generate a {label.toLowerCase()} based on all your notebook sources.</p>
              <button onClick={generate} disabled={!hasSources}
                className={`px-8 py-3.5 bg-gradient-to-br ${color} text-white font-bold text-base rounded-2xl hover:brightness-110 transition-all shadow-xl disabled:opacity-50`}>
                Generate {label}
              </button>
              {!hasSources && <p className="text-slate-500 text-xs mt-3">Add sources first</p>}
            </>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="flex gap-2 mb-4">
            <button onClick={() => navigator.clipboard.writeText(result)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 text-slate-300 text-xs rounded-xl hover:bg-white/10 transition-all">
              <Copy className="w-3 h-3" /> Copy
            </button>
            <button onClick={generate} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 text-slate-300 text-xs rounded-xl hover:bg-white/10 transition-all">
              <RotateCcw className="w-3 h-3" /> Regenerate
            </button>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <pre className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed font-sans">{result}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Notes Tool ─────────────────────────────────────────────────────────────────
function NotesTool({ notebook, user, allSources, resources, onResourceCreated, onRefresh }) {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const notes = resources.filter(r => r.resource_type === 'notes');

  const save = async () => {
    if (!text.trim()) return;
    setSaving(true);
    await base44.entities.NotebookResource.create({
      notebook_id: notebook.id, student_email: user.email,
      title: title || `Note — ${new Date().toLocaleDateString()}`,
      resource_type: 'notes', content: text, source_count: 0,
    });
    setTitle(''); setText(''); setSaving(false); onRefresh();
  };

  return (
    <div className="flex flex-col h-full">
      <ToolHeader icon={StickyNote} label="Notes" color="from-amber-500 to-yellow-600" />
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {/* New note form */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Note title…"
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500/50 placeholder:text-slate-500" />
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Write your note here…" rows={6}
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500/50 placeholder:text-slate-500 resize-none" />
          <button onClick={save} disabled={!text.trim() || saving}
            className="px-6 py-2.5 bg-gradient-to-br from-amber-500 to-yellow-600 text-white font-bold text-sm rounded-xl hover:brightness-110 transition-all disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Note'}
          </button>
        </div>
        {/* Existing notes */}
        {notes.length > 0 && (
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-3">Saved Notes ({notes.length})</p>
            <div className="space-y-3">
              {notes.map(note => (
                <div key={note.id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <p className="text-white font-semibold text-sm mb-1">{note.title}</p>
                  <p className="text-slate-400 text-xs mb-2">{new Date(note.created_date).toLocaleDateString()}</p>
                  <pre className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed font-sans max-h-40 overflow-y-auto">{note.content}</pre>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Media placeholder ─────────────────────────────────────────────────────────
function MediaTool({ icon: Icon, label, color, description, comingSoon = false, notebook, user, allSources, onResourceCreated }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const generate = async () => {
    const ctx = getContext(allSources);
    if (!ctx) return;
    setLoading(true);
    try {
      let prompt = '';
      if (label === 'Podcast Mode') {
        prompt = `Create an engaging podcast script with two AI hosts (Host A and Host B) discussing the following topic in a conversational, educational way. Include chapters, key points, and a natural back-and-forth dialogue. Make it 3-5 minutes long.\n\nSOURCES:\n${ctx}`;
      } else if (label === 'Explainer Video') {
        prompt = `Create a detailed explainer video script for an educational animation. Include: scene descriptions, narrator text, visual suggestions, on-screen text, and timing cues. Make it 60-90 seconds long.\n\nSOURCES:\n${ctx}`;
      } else {
        prompt = `Create a detailed tutoring session script where an AI tutor guides a student through the following material. Include questions, explanations, and interactive prompts.\n\nSOURCES:\n${ctx}`;
      }
      const content = await base44.integrations.Core.InvokeLLM({ prompt });
      setResult(content);
      const res = await base44.entities.NotebookResource.create({
        notebook_id: notebook.id, student_email: user.email,
        title: `${notebook.name} — ${label}`,
        resource_type: label === 'Podcast Mode' ? 'audio_overview' : 'video_overview',
        content, source_ids: allSources.map(s => s.id), source_count: allSources.length,
      });
      onResourceCreated(res);
    } catch {}
    setLoading(false);
  };

  const hasSources = allSources.some(s => s.content_text);

  return (
    <div className="flex flex-col h-full">
      <ToolHeader icon={Icon} label={label} color={color} />
      {!result ? (
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          {loading ? (
            <div>
              <Loader2 className="w-10 h-10 text-violet-400 animate-spin mx-auto mb-4" />
              <p className="text-white font-bold text-lg">Generating {label} Script…</p>
            </div>
          ) : (
            <>
              <div className="text-5xl mb-4">{label === 'Podcast Mode' ? '🎙️' : label === 'Explainer Video' ? '🎬' : '🗣️'}</div>
              <h3 className="text-white font-bold text-xl mb-2">{label}</h3>
              <p className="text-slate-400 text-sm mb-6 max-w-sm">{description}</p>
              <button onClick={generate} disabled={!hasSources}
                className={`px-8 py-3.5 bg-gradient-to-br ${color} text-white font-bold text-base rounded-2xl hover:brightness-110 transition-all shadow-xl disabled:opacity-50`}>
                Generate {label}
              </button>
              {!hasSources && <p className="text-slate-500 text-xs mt-3">Add sources first</p>}
            </>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="flex gap-2 mb-4">
            <button onClick={() => navigator.clipboard.writeText(result)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 text-slate-300 text-xs rounded-xl hover:bg-white/10 transition-all">
              <Copy className="w-3 h-3" /> Copy Script
            </button>
            <button onClick={() => setResult(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 text-slate-300 text-xs rounded-xl hover:bg-white/10 transition-all">
              <RotateCcw className="w-3 h-3" /> Regenerate
            </button>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <pre className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed font-sans">{result}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

// ── AI Lab tools wrapper (source-aware) ────────────────────────────────────────
function AILabTool({ icon: Icon, label, color, children }) {
  return (
    <div className="flex flex-col h-full">
      <ToolHeader icon={Icon} label={label} color={color} />
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {children}
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────
export default function StudioCentrePanel({ activeTool, notebook, user, allSources, resources, flashcards, onResourceCreated, onRefreshFlashcards, onRefreshResources }) {
  const hasSources = allSources.length > 0;

  const renderTool = () => {
    if (!hasSources && !['chat', 'notes', 'equation', 'chemistry', 'graph', 'mindmap'].includes(activeTool)) {
      return <NoSources />;
    }

    switch (activeTool) {
      case 'chat':
        return <AIChatTool notebook={notebook} user={user} allSources={allSources} onResourceCreated={onResourceCreated} />;
      case 'flashcards':
        return <FlashcardsTool notebook={notebook} user={user} allSources={allSources} flashcards={flashcards} onResourceCreated={onResourceCreated} onRefreshFlashcards={onRefreshFlashcards} />;
      case 'quiz':
        return <GenerateTool icon={Zap} label="Quiz" color="from-indigo-500 to-blue-600" resourceType="quiz"
          prompt="Generate a 10-question multiple choice quiz. For each question provide: the question, 4 options (A-D), the correct answer, and a brief explanation. Cover the key topics thoroughly."
          notebook={notebook} user={user} allSources={allSources} onResourceCreated={onResourceCreated} />;
      case 'test':
        return <GenerateTool icon={ClipboardCheck} label="Test" color="from-rose-500 to-pink-600" resourceType="test"
          prompt="Generate a formal test with 8-12 questions of varying formats (short answer, long answer, calculations, essay). Include a mark scheme and model answers for each question."
          notebook={notebook} user={user} allSources={allSources} onResourceCreated={onResourceCreated} />;
      case 'exam_sim':
        return <GenerateTool icon={Timer} label="Exam Simulation" color="from-red-500 to-orange-600" resourceType="exam_questions"
          prompt="Generate a full exam simulation with 15-20 questions in exam style. Include: structured questions, extended writing tasks, data analysis. Provide a full mark scheme, model answers, grade boundaries, and weak area analysis."
          notebook={notebook} user={user} allSources={allSources} onResourceCreated={onResourceCreated} />;
      case 'equation':
        return <AILabTool icon={Calculator} label="Equation Solver" color="from-violet-500 to-purple-600"><EquationSolver /></AILabTool>;
      case 'chemistry':
        return <AILabTool icon={FlaskConical} label="Chemistry Balancer" color="from-emerald-500 to-teal-600"><ChemistryBalancer /></AILabTool>;
      case 'graph':
        return <AILabTool icon={BarChart2} label="Graph Generator" color="from-blue-500 to-cyan-600"><GraphGenerator /></AILabTool>;
      case 'mindmap':
        return (
          <div className="flex flex-col h-full">
            <ToolHeader icon={Network} label="Mind Map Generator" color="from-pink-500 to-rose-600" />
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <MindMapGenerator preloadedText={allSources.filter(s => s.content_text).map(s => s.content_text.slice(0, 3000)).join('\n\n')} />
            </div>
          </div>
        );
      case 'explainer':
        return <MediaTool icon={Video} label="Explainer Video" color="from-blue-600 to-indigo-600"
          description="AI generates a detailed explainer video script with scenes, narration, and visual cues based on your sources."
          notebook={notebook} user={user} allSources={allSources} onResourceCreated={onResourceCreated} />;
      case 'podcast':
        return <MediaTool icon={Mic2} label="Podcast Mode" color="from-violet-600 to-purple-700"
          description="Two AI hosts discuss your notebook content in a natural, educational podcast format with chapters."
          notebook={notebook} user={user} allSources={allSources} onResourceCreated={onResourceCreated} />;
      case 'voice_tutor':
        return <MediaTool icon={MessageSquare} label="Voice Tutor" color="from-emerald-600 to-teal-700"
          description="AI generates an interactive tutoring session script with questions, explanations, and guided learning."
          notebook={notebook} user={user} allSources={allSources} onResourceCreated={onResourceCreated} />;
      case 'summary':
        return <GenerateTool icon={FileText} label="Summary" color="from-cyan-500 to-sky-600" resourceType="summary"
          prompt="Write a comprehensive, well-structured summary of all sources. Include: executive summary, detailed sections for each main topic, key definitions, important facts, and exam tips. Use clear headings."
          notebook={notebook} user={user} allSources={allSources} onResourceCreated={onResourceCreated} />;
      case 'notes':
        return <NotesTool notebook={notebook} user={user} allSources={allSources} resources={resources} onResourceCreated={onResourceCreated} onRefresh={onRefreshResources} />;
      case 'topic_breakdown':
        return <GenerateTool icon={BookOpen} label="Topic Breakdown" color="from-slate-500 to-slate-600" resourceType="topic_breakdown"
          prompt="Create a complete topic breakdown covering: all main topics and subtopics, key people/dates/events, definitions, formulas, examples, connections between topics, and exam focus areas. Be thorough and structured."
          notebook={notebook} user={user} allSources={allSources} onResourceCreated={onResourceCreated} />;
      default:
        return <AIChatTool notebook={notebook} user={user} allSources={allSources} onResourceCreated={onResourceCreated} />;
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div key={activeTool} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.15 }} className="flex flex-col h-full">
        {renderTool()}
      </motion.div>
    </AnimatePresence>
  );
}