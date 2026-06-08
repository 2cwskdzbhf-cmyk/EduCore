import React, { useState, useRef, useEffect } from 'react';
import QuizBuilder from './QuizBuilder';
import QuizBuilderTool from './QuizBuilderTool';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import {
  Send, Loader2, RefreshCw, Copy, BookmarkPlus,
  RotateCcw, ChevronRight, GraduationCap, BrainCircuit,
  AlertTriangle, ThumbsUp, ThumbsDown,
  Calculator, FlaskConical, BarChart2, Network,
  Video, Mic2, MessageSquare, FileText, StickyNote, BookOpen,
  Layers, Zap, ClipboardCheck, Timer, CheckCircle, XCircle,
  ChevronDown, ChevronUp, Sparkles, RotateCcw as Reset
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function cleanText(str) {
  return str.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1').replace(/_([^_]+)_/g, '$1').trim();
}

function getSourceContext(sources) {
  return sources.filter(s => s.content_text)
    .map(s => `### ${s.name}\n${s.content_text.slice(0, 8000)}`).join('\n\n---\n\n');
}

function NoSources() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="text-5xl mb-4">📚</div>
      <h3 className="text-white font-bold text-lg mb-2">No sources yet</h3>
      <p className="text-slate-400 text-sm">Add sources in the left panel first, then use any tool here.</p>
    </div>
  );
}

// ─── AI Tutor Chat ────────────────────────────────────────────────────────────
const QUICK_CHIPS = [
  { label: '📋 Summarise', prompt: 'Summarise all my sources clearly with headings and bullet points.' },
  { label: '💡 Explain Simply', prompt: 'Explain the main concepts simply, as if I\'m a GCSE student.' },
  { label: '❓ Quiz Me', prompt: 'Ask me a challenging question to test my understanding of my sources.' },
  { label: '📖 Study Guide', prompt: 'Generate a complete structured revision study guide from my sources.' },
  { label: '🔢 Key Formulas', prompt: 'Extract all key formulas, equations, rules, and definitions from my sources.' },
  { label: '📝 Exam Questions', prompt: 'Generate 10 likely exam questions with full model answers from my sources.' },
  { label: '📅 Timeline', prompt: 'Create a chronological timeline of all key events and developments from my sources.' },
  { label: '⚠️ Common Mistakes', prompt: 'What are the most common mistakes students make on these topics?' },
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

  const buildSystemPrompt = () => {
    const ctx = getSourceContext(allSources);
    const modeInstr = mode === 'alevel' ? 'Use precise academic language.' : mode === 'simple' ? 'Use very simple language, no jargon.' : 'The student is GCSE level. Be clear and supportive.';
    return `You are an expert AI tutor for "${notebook.name}"${notebook.subject ? ` (${notebook.subject})` : ''}.
${modeInstr}
${ctx ? `SOURCES:\n${ctx}` : 'No sources yet. Help with general questions.'}`;
  };

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs); setInput(''); setLoading(true);
    try {
      const resp = await base44.integrations.Core.InvokeLLM({
        prompt: text, system_prompt: buildSystemPrompt(),
        conversation_history: newMsgs.slice(-14, -1).map(m => ({ role: m.role, content: m.content })),
      });
      const assistantMsg = { role: 'assistant', content: resp, timestamp: new Date().toISOString() };
      const finalMsgs = [...newMsgs, assistantMsg];
      setMessages(finalMsgs);
      await saveChat(finalMsgs);

      // Auto-save notable responses as resources
      const t = text.toLowerCase();
      let rType = null;
      if (t.includes('summary') || t.includes('summarise')) rType = 'summary';
      else if (t.includes('study guide')) rType = 'study_guide';
      else if (t.includes('exam question')) rType = 'exam_questions';
      if (rType) {
        const res = await base44.entities.NotebookResource.create({
          notebook_id: notebook.id, student_email: user.email,
          title: `${notebook.name} — ${rType.replace(/_/g, ' ')}`,
          resource_type: rType, content: resp,
          source_ids: allSources.map(s => s.id), source_count: allSources.length,
        });
        onResourceCreated(res);
      }
    } catch { setMessages(m => [...m, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.', timestamp: new Date().toISOString() }]); }
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
      {/* Header */}
      <div className="flex-shrink-0 px-5 py-3 border-b border-white/10 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center">
          <BrainCircuit className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-white font-bold text-sm">Studio AI</h2>
          <p className="text-[10px] text-slate-500">{allSources.filter(s=>s.content_text).length} sources loaded</p>
        </div>
        <div className="flex gap-1">
          {[{id:'gcse',l:'GCSE'},{id:'alevel',l:'A-Level'},{id:'simple',l:'Simple'}].map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${mode === m.id ? 'bg-violet-500/30 text-violet-300 border border-violet-500/40' : 'text-slate-500 hover:text-white bg-white/5'}`}>
              {m.l}
            </button>
          ))}
        </div>
        {messages.length > 0 && (
          <button onClick={() => setMessages([])} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <RefreshCw className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Quick chips */}
      <div className="flex-shrink-0 px-4 py-2 flex gap-1.5 overflow-x-auto scrollbar-hide border-b border-white/5">
        {QUICK_CHIPS.map(c => (
          <button key={c.label} onClick={() => sendMessage(c.prompt)} disabled={loading}
            className="flex-shrink-0 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300 hover:text-white hover:bg-violet-500/15 hover:border-violet-500/30 transition-all font-medium whitespace-nowrap disabled:opacity-40">
            {c.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-xl mx-auto mb-4 shadow-lg shadow-violet-500/30">
              <BrainCircuit className="w-7 h-7 text-white" />
            </div>
            <p className="text-white font-bold text-base mb-1">Studio AI Assistant</p>
            <p className="text-slate-400 text-sm">Fully connected to your sources. Ask anything.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md shadow-violet-500/20">
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
                  <button onClick={() => navigator.clipboard.writeText(m.content)} className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-all"><Copy className="w-3 h-3" /></button>
                  <button onClick={() => saveToNotes(m.content)} className="p-1.5 rounded-lg text-slate-600 hover:text-violet-400 hover:bg-violet-500/10 transition-all"><BookmarkPlus className="w-3 h-3" /></button>
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
                {[0,1,2].map(i => (
                  <motion.div key={i} className="w-1.5 h-1.5 bg-violet-400 rounded-full"
                    animate={{ y: [0,-5,0] }} transition={{ duration: 0.5, delay: i*0.12, repeat: Infinity }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-4 border-t border-white/10">
        <div className="flex gap-2.5 items-end bg-white/5 border border-white/15 focus-within:border-violet-500/50 rounded-2xl p-3 transition-all">
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            placeholder="Ask anything about your sources…" rows={1}
            style={{ maxHeight: '120px', overflowY: 'auto' }}
            className="flex-1 bg-transparent text-white text-sm resize-none focus:outline-none placeholder:text-slate-500 leading-relaxed" />
          <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center disabled:opacity-40 flex-shrink-0 hover:brightness-110 transition-all shadow-lg shadow-violet-500/30">
            {loading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Flashcard Tool ───────────────────────────────────────────────────────────
const DIFFICULTY_PROMPTS = {
  easy: 'Generate EASY flashcards — focus on key definitions, basic facts, and simple recall. Keep answers short and clear.',
  medium: 'Generate MEDIUM difficulty flashcards — mix definitions, explanations, and applied questions.',
  hard: 'Generate HARD flashcards — focus on deeper understanding, multi-step concepts, cause/effect, and comparisons.',
  'exam-level': 'Generate EXAM-LEVEL flashcards — use precise academic language, include complex analysis, evaluation questions, and mark-scheme style answers.',
};

function FlashcardTool({ notebook, user, allSources, onResourceCreated, onOpenStudy }) {
  const [phase, setPhase] = useState('setup'); // 'setup' | 'generating'
  const [difficulty, setDifficulty] = useState('medium');
  const [cardCount, setCardCount] = useState('25');
  const [includeDefinitions, setIncludeDefinitions] = useState(true);
  const [includeExamples, setIncludeExamples] = useState(true);
  const [progress, setProgress] = useState(null);
  const cancelRef = useRef(false);

  const hasContent = allSources.some(s => s.content_text);
  if (!hasContent) return <NoSources />;

  const targetCount = cardCount === '200+' ? 200 : parseInt(cardCount, 10);

  // Wraps a promise with a hard timeout; resolves with null on timeout
  const withTimeout = (promise, ms) =>
    Promise.race([promise, new Promise(res => setTimeout(() => res(null), ms))]);

  const generate = async () => {
    setPhase('generating');
    cancelRef.current = false;
    setProgress({ generated: 0, batchLabel: 'Preparing sources…' });

    const sourceParts = allSources.filter(s => s.content_text);
    // Cap source context to avoid runaway — max 12000 chars total across all sources
    const MAX_CTX = 12000;
    let combined = '';
    const usedSourceIds = [];
    for (const src of sourceParts) {
      if (combined.length >= MAX_CTX) break;
      combined += `\n### ${src.name}\n${src.content_text.slice(0, MAX_CTX - combined.length)}`;
      usedSourceIds.push(src.id);
    }

    const diffPrompt = DIFFICULTY_PROMPTS[difficulty] || DIFFICULTY_PROMPTS.medium;
    const extraInstructions = [
      includeDefinitions ? 'Include definition cards (term → definition).' : 'Do NOT include pure definition cards.',
      includeExamples ? 'Include worked examples and real-world application cards.' : 'Do NOT include example cards.',
    ].join(' ');

    // Determine batches needed — max 40 cards per LLM call, capped at 5 batches
    const PER_BATCH = 40;
    const batchCount = Math.min(5, Math.ceil(targetCount / PER_BATCH));
    const cardsPerBatch = Math.ceil(targetCount / batchCount);

    const rawCards = [];

    for (let i = 0; i < batchCount; i++) {
      if (cancelRef.current || rawCards.length >= targetCount) break;
      setProgress({ generated: rawCards.length, batchLabel: `Generating batch ${i + 1} of ${batchCount}…` });

      const result = await withTimeout(
        base44.integrations.Core.InvokeLLM({
          prompt: `${diffPrompt} ${extraInstructions}
Generate exactly ${cardsPerBatch} unique revision flashcards for "${notebook.subject || notebook.name}".
Front: clear concise question or term. Back: accurate plain text answer (no markdown).
Return only cards not already generated in previous batches.
SOURCES:\n${combined}`,
          response_json_schema: {
            type: 'object',
            properties: {
              flashcards: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: { front: { type: 'string' }, back: { type: 'string' } },
                  required: ['front', 'back'],
                  additionalProperties: false,
                }
              }
            },
            required: ['flashcards'],
            additionalProperties: false,
          }
        }),
        12000 // 12s timeout per batch
      );

      const batchCards = result?.flashcards || [];
      for (const card of batchCards) {
        if (cancelRef.current || rawCards.length >= targetCount) break;
        if (!card.front?.trim() || !card.back?.trim()) continue;
        rawCards.push({ front: cleanText(card.front), back: cleanText(card.back), sourceId: usedSourceIds[0] || null });
      }
      setProgress({ generated: rawCards.length, batchLabel: `Generated ${rawCards.length} cards…` });
    }

    if (cancelRef.current || rawCards.length === 0) {
      setPhase('setup');
      setProgress(null);
      return;
    }

    // Bulk-create all cards at once (no per-card await loop)
    setProgress({ generated: rawCards.length, batchLabel: 'Saving cards…' });
    const allCreated = await base44.entities.RevisionFlashcard.bulkCreate(
      rawCards.map(c => ({
        notebook_id: notebook.id,
        student_email: user.email,
        front: c.front,
        back: c.back,
        is_ai_generated: true,
        source_id: c.sourceId,
      }))
    );

    const title = `${notebook.name} — Flashcards (${allCreated.length} cards)`;
    const res = await base44.entities.NotebookResource.create({
      notebook_id: notebook.id, student_email: user.email,
      title, resource_type: 'flashcards',
      content: JSON.stringify({ totalCards: allCreated.length, difficulty, includeDefinitions, includeExamples }),
      source_ids: usedSourceIds, source_count: usedSourceIds.length,
    });
    onResourceCreated(res);
    onOpenStudy(allCreated, title);

    setPhase('setup');
    setProgress(null);
  };

  // ── Generating screen ──
  if (phase === 'generating') return (
    <div className="flex flex-col items-center justify-center h-full gap-5 p-8"
      style={{ background: 'linear-gradient(135deg, #EDE8F5 0%, #c8d4f5 100%)' }}>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
        style={{ background: 'linear-gradient(135deg, #7091E6, #3D52A0)' }}>
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
      <p className="font-bold text-lg" style={{ color: '#3D52A0' }}>Generating Flashcards…</p>
      {progress && <p className="text-sm" style={{ color: '#8697C4' }}>{progress.batchLabel}</p>}
      {progress && (
        <p className="font-black text-3xl" style={{ color: '#7091E6' }}>{progress.generated} cards</p>
      )}
      <div className="w-48 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(112,145,230,0.2)' }}>
        <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, #7091E6, #3D52A0)' }}
          animate={{ width: progress ? `${Math.min(100, (progress.generated / targetCount) * 100)}%` : '5%' }}
          transition={{ duration: 0.5 }} />
      </div>
      <button onClick={() => { cancelRef.current = true; }}
        className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
        style={{ background: 'rgba(220,55,55,0.1)', border: '1px solid rgba(220,55,55,0.3)', color: '#dc3535' }}>
        Cancel
      </button>
    </div>
  );

  // ── Setup panel ──
  const SELECT_STYLE = {
    background: 'rgba(255,255,255,0.5)',
    border: '1px solid rgba(255,255,255,0.4)',
    borderRadius: '12px',
    color: '#3D52A0',
    padding: '10px 14px',
    fontSize: '14px',
    fontWeight: '500',
    width: '100%',
    outline: 'none',
    cursor: 'pointer',
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-6"
      style={{ background: 'linear-gradient(135deg, #EDE8F5 0%, #c8d4f5 100%)' }}>
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-md rounded-3xl p-8"
        style={{
          background: 'rgba(255,255,255,0.25)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.3)',
          boxShadow: '0 4px 20px rgba(61,82,160,0.15)',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #7091E6, #3D52A0)' }}>
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-black text-lg" style={{ color: '#3D52A0' }}>Flashcard Options</h2>
            <p className="text-sm" style={{ color: '#8697C4' }}>Customise your flashcard set</p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Difficulty */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#8697C4' }}>Difficulty</label>
            <select value={difficulty} onChange={e => setDifficulty(e.target.value)} style={SELECT_STYLE}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="exam-level">Exam-Level</option>
            </select>
          </div>

          {/* Number of cards */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#8697C4' }}>Number of Flashcards</label>
            <select value={cardCount} onChange={e => setCardCount(e.target.value)} style={SELECT_STYLE}>
              {['10','25','50','100','150','200+'].map(n => (
                <option key={n} value={n}>{n} cards</option>
              ))}
            </select>
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            {[
              { label: 'Include Definitions', desc: 'Term → definition cards', val: includeDefinitions, set: setIncludeDefinitions },
              { label: 'Include Examples', desc: 'Real-world applications', val: includeExamples, set: setIncludeExamples },
            ].map(({ label, desc, val, set }) => (
              <div key={label} className="flex items-center justify-between p-3 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.4)' }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#3D52A0' }}>{label}</p>
                  <p className="text-xs" style={{ color: '#8697C4' }}>{desc}</p>
                </div>
                <button onClick={() => set(v => !v)}
                  className="relative w-11 h-6 rounded-full transition-all duration-300 flex-shrink-0"
                  style={{ background: val ? 'linear-gradient(135deg, #7091E6, #3D52A0)' : 'rgba(134,151,196,0.3)' }}>
                  <motion.span animate={{ x: val ? 20 : 2 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                    className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm block" />
                </button>
              </div>
            ))}
          </div>

          {/* Generate button */}
          <button onClick={generate}
            className="w-full py-3.5 rounded-2xl text-white font-bold text-base transition-all hover:brightness-110 active:scale-[0.98] shadow-lg"
            style={{ background: 'linear-gradient(135deg, #7091E6, #3D52A0)', boxShadow: '0 4px 20px rgba(61,82,160,0.3)' }}>
            ✨ Generate Flashcards
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Quiz Tool ────────────────────────────────────────────────────────────────
function QuizTool({ notebook, user, allSources, onResourceCreated }) {
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const hasContent = allSources.some(s => s.content_text);
  if (!hasContent) return <NoSources />;

  const generate = async () => {
    setLoading(true); setQuestions([]); setAnswers({}); setSubmitted(false);
    const ctx = getSourceContext(allSources);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate a 10-question multiple choice quiz from these sources. Cover the most important concepts.\n\nSOURCES:\n${ctx}`,
      response_json_schema: {
        type: 'object',
        properties: {
          questions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                question: { type: 'string' },
                options: { type: 'array', items: { type: 'string' } },
                correct_index: { type: 'number' },
                explanation: { type: 'string' },
              },
              required: ['question','options','correct_index','explanation'],
              additionalProperties: false,
            }
          }
        },
        required: ['questions'], additionalProperties: false,
      }
    });
    const qs = result?.questions || [];
    setQuestions(qs);
    const res = await base44.entities.NotebookResource.create({
      notebook_id: notebook.id, student_email: user.email,
      title: `${notebook.name} — Quiz`, resource_type: 'quiz',
      content: JSON.stringify(qs), source_ids: allSources.map(s => s.id), source_count: allSources.length,
    });
    onResourceCreated(res);
    setLoading(false);
  };

  const submit = () => {
    let correct = 0;
    questions.forEach((q, i) => { if (answers[i] === q.correct_index) correct++; });
    setScore(correct); setSubmitted(true);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
      <p className="text-white font-bold">Generating Quiz…</p>
    </div>
  );

  if (questions.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
        <Zap className="w-8 h-8 text-white" />
      </div>
      <div>
        <h2 className="text-white font-bold text-xl mb-2">Quiz Generator</h2>
        <p className="text-slate-400 text-sm max-w-md">Auto-generates a 10-question multiple choice quiz from your sources with instant marking.</p>
      </div>
      <button onClick={generate} className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-xl font-bold text-base hover:brightness-110 transition-all shadow-lg">
        Generate Quiz
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex-shrink-0 px-6 py-4 border-b border-white/10 flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold">Multiple Choice Quiz</h2>
          <p className="text-slate-400 text-xs">{questions.length} questions · {notebook.name}</p>
        </div>
        <div className="flex gap-2">
          {submitted && <span className="px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-xl text-sm font-bold">{score}/{questions.length} correct</span>}
          <button onClick={generate} className="px-3 py-1.5 bg-white/5 border border-white/10 text-slate-400 rounded-xl text-xs hover:text-white transition-all">New Quiz</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {questions.map((q, qi) => (
          <div key={qi} className={`p-5 rounded-2xl border transition-all ${
            submitted ? (answers[qi] === q.correct_index ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30') : 'bg-white/[0.04] border-white/10'
          }`}>
            <p className="text-white font-semibold mb-4"><span className="text-slate-500 mr-2">Q{qi+1}.</span>{q.question}</p>
            <div className="grid grid-cols-1 gap-2">
              {q.options.map((opt, oi) => (
                <button key={oi} onClick={() => !submitted && setAnswers(a => ({ ...a, [qi]: oi }))}
                  className={`text-left px-4 py-2.5 rounded-xl border text-sm transition-all ${
                    submitted
                      ? oi === q.correct_index ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200' : answers[qi] === oi ? 'bg-red-500/20 border-red-500/40 text-red-300' : 'bg-white/[0.03] border-white/10 text-slate-400'
                      : answers[qi] === oi ? 'bg-violet-500/20 border-violet-500/40 text-violet-200' : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.07]'
                  }`}>
                  <span className="font-bold mr-2 text-slate-500">{['A','B','C','D'][oi]}.</span>{opt}
                </button>
              ))}
            </div>
            {submitted && <p className="text-slate-400 text-xs mt-3 italic">{q.explanation}</p>}
          </div>
        ))}
      </div>
      {!submitted && (
        <div className="flex-shrink-0 p-4 border-t border-white/10">
          <button onClick={submit} disabled={Object.keys(answers).length < questions.length}
            className="w-full py-3 bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-xl font-bold disabled:opacity-40 hover:brightness-110 transition-all">
            Submit Quiz ({Object.keys(answers).length}/{questions.length} answered)
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Simple text-generation tool ───────────────────────────────────────────────
function SimpleGenTool({ tool, notebook, user, allSources, onResourceCreated }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  const hasContent = allSources.some(s => s.content_text);

  const PROMPTS = {
    test: `Generate a 5-question long-form exam test with mark schemes for "${notebook.name}". Include extended writing questions, calculation questions, and evaluation questions. Provide full model answers and mark allocation.`,
    exam_sim: `Create a full timed exam simulation for "${notebook.name}". Include a mix of multiple choice, short answer, and extended response questions. Provide total marks, time allowed, and a detailed mark scheme.`,
    summary: `Write a comprehensive, well-structured summary of all key topics from the following sources. Use clear headings, bullet points, and highlight the most important concepts.`,
    topic_breakdown: `Provide a complete topic breakdown for "${notebook.name}". For each main topic: key concepts, important facts, formulas if applicable, likely exam questions, and common misconceptions.`,
  };

  const CONFIGS = {
    test: { label: 'Test', icon: ClipboardCheck, color: 'from-rose-500 to-pink-600', resource_type: 'exam_questions', desc: 'Long-form exam questions with mark scheme' },
    exam_sim: { label: 'Exam Simulation', icon: Timer, color: 'from-red-500 to-orange-600', resource_type: 'exam_questions', desc: 'Full timed exam with analytics' },
    summary: { label: 'Summary', icon: FileText, color: 'from-cyan-500 to-sky-600', resource_type: 'summary', desc: 'Comprehensive source summary' },
    topic_breakdown: { label: 'Topic Breakdown', icon: BookOpen, color: 'from-slate-500 to-slate-600', resource_type: 'topic_breakdown', desc: 'Full topic overview and breakdown' },
  };

  const cfg = CONFIGS[tool] || CONFIGS.summary;

  if (!hasContent) return <NoSources />;

  const generate = async () => {
    setLoading(true); setResult('');
    const ctx = getSourceContext(allSources);
    const prompt = `${PROMPTS[tool]}\n\nSOURCES:\n${ctx}`;
    const content = await base44.integrations.Core.InvokeLLM({ prompt });
    setResult(typeof content === 'string' ? content : JSON.stringify(content));
    const res = await base44.entities.NotebookResource.create({
      notebook_id: notebook.id, student_email: user.email,
      title: `${notebook.name} — ${cfg.label}`, resource_type: cfg.resource_type,
      content: typeof content === 'string' ? content : JSON.stringify(content),
      source_ids: allSources.map(s => s.id), source_count: allSources.length,
    });
    onResourceCreated(res);
    setLoading(false);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <Loader2 className="w-10 h-10 text-white animate-spin" />
      <p className="text-white font-bold">Generating {cfg.label}…</p>
      <p className="text-slate-400 text-sm">This may take a moment</p>
    </div>
  );

  if (!result) return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8 text-center">
      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${cfg.color} flex items-center justify-center shadow-lg`}>
        <cfg.icon className="w-8 h-8 text-white" />
      </div>
      <div>
        <h2 className="text-white font-bold text-xl mb-2">{cfg.label}</h2>
        <p className="text-slate-400 text-sm max-w-md">{cfg.desc}</p>
      </div>
      <button onClick={generate} className={`px-8 py-3 bg-gradient-to-r ${cfg.color} text-white rounded-xl font-bold text-base hover:brightness-110 transition-all shadow-lg`}>
        Generate {cfg.label}
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-6 py-4 border-b border-white/10 flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold">{cfg.label}</h2>
          <p className="text-slate-400 text-xs">{notebook.name}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigator.clipboard.writeText(result)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 text-slate-400 rounded-xl text-xs hover:text-white transition-all"><Copy className="w-3 h-3" /> Copy</button>
          <button onClick={generate} className="px-3 py-1.5 bg-white/5 border border-white/10 text-slate-400 rounded-xl text-xs hover:text-white transition-all">Regenerate</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <pre className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed font-sans">{result}</pre>
      </div>
    </div>
  );
}

// ─── Equation Solver ──────────────────────────────────────────────────────────
function EquationTool({ notebook, user, allSources, onResourceCreated }) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const solve = async () => {
    if (!input.trim()) return;
    setLoading(true); setResult(null);
    const res = await base44.functions.invoke('callOpenAI', {
      prompt: `You are an expert maths tutor. Solve step by step: ${input}. Provide problem type, final answer, and numbered steps with title, explanation and working.`,
      response_json_schema: {
        type: 'object',
        properties: {
          problem_type: { type: 'string' }, answer: { type: 'string' },
          steps: { type: 'array', items: { type: 'object', properties: { step: { type: 'number' }, title: { type: 'string' }, explanation: { type: 'string' }, working: { type: 'string' } }, required: ['step','title','explanation','working'], additionalProperties: false } },
          notes: { type: 'string' },
        },
        required: ['problem_type','answer','steps','notes'], additionalProperties: false,
      }
    });
    setResult(res.data);
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex-shrink-0 px-6 py-4 border-b border-white/10">
        <h2 className="text-white font-bold flex items-center gap-2"><Calculator className="w-5 h-5 text-violet-400" /> Equation Solver</h2>
        <p className="text-slate-400 text-xs mt-0.5">Step-by-step solutions for any maths problem</p>
      </div>
      <div className="p-6 space-y-4">
        <div className="flex gap-3">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && solve()}
            placeholder="e.g. 2x² + 5x - 3 = 0 or d/dx(x³ + 2x)"
            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 font-mono text-sm" />
          <button onClick={solve} disabled={loading || !input.trim()}
            className="px-5 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-bold disabled:opacity-40 hover:brightness-110 transition-all">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Solve'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {['2x² + 5x - 3 = 0','3x + 2y = 12, x - y = 1','d/dx (x³ + 4x²)','∫(2x + 3)dx'].map(ex => (
            <button key={ex} onClick={() => setInput(ex)} className="text-xs px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-400 hover:text-white hover:border-violet-500/40 transition-all font-mono">{ex}</button>
          ))}
        </div>

        <AnimatePresence>
          {result && !result.error && (
            <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-violet-500/10 border border-violet-500/30 rounded-2xl p-4">
                  <div className="text-xs text-violet-400 font-semibold uppercase tracking-wider mb-1">Type</div>
                  <div className="text-white font-bold">{result.problem_type}</div>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4">
                  <div className="text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-1">Answer</div>
                  <div className="text-white font-bold font-mono">{result.answer}</div>
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <h3 className="text-white font-bold mb-4">Step-by-Step Solution</h3>
                <div className="space-y-3">
                  {result.steps?.map((step, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="w-7 h-7 rounded-full bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-violet-300 text-xs font-bold flex-shrink-0 mt-0.5">{step.step}</div>
                      <div className="flex-1">
                        <div className="text-white font-semibold text-sm">{step.title}</div>
                        <div className="text-slate-400 text-sm mt-0.5">{step.explanation}</div>
                        {step.working && <div className="mt-2 bg-slate-900/60 rounded-lg px-3 py-2 font-mono text-sm text-emerald-300 border border-white/5">{step.working}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {result.notes && <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-amber-300 text-sm">💡 {result.notes}</div>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Chemistry Balancer ───────────────────────────────────────────────────────
function ChemistryTool() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const balance = async () => {
    if (!input.trim()) return;
    setLoading(true); setResult(null);
    const res = await base44.functions.invoke('callOpenAI', {
      prompt: `Balance this chemical equation and explain step by step: ${input}`,
      response_json_schema: {
        type: 'object',
        properties: {
          unbalanced: { type: 'string' }, balanced: { type: 'string' }, type: { type: 'string' },
          steps: { type: 'array', items: { type: 'object', properties: { step: { type: 'number' }, explanation: { type: 'string' }, state: { type: 'string' } }, required: ['step','explanation','state'], additionalProperties: false } },
          ionic_equation: { type: 'string' }, ionic_explanation: { type: 'string' }, state_symbols: { type: 'string' }, notes: { type: 'string' },
        },
        required: ['unbalanced','balanced','type','steps','ionic_equation','ionic_explanation','state_symbols','notes'], additionalProperties: false,
      }
    });
    setResult(res.data);
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex-shrink-0 px-6 py-4 border-b border-white/10">
        <h2 className="text-white font-bold flex items-center gap-2"><FlaskConical className="w-5 h-5 text-emerald-400" /> Chemistry Balancer</h2>
        <p className="text-slate-400 text-xs mt-0.5">Balance equations with ionic explanations</p>
      </div>
      <div className="p-6 space-y-4">
        <div className="flex gap-3">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && balance()}
            placeholder="e.g. H2 + O2 → H2O or CH4 + O2 -> CO2 + H2O"
            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 font-mono text-sm" />
          <button onClick={balance} disabled={loading || !input.trim()}
            className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold disabled:opacity-40 hover:brightness-110 transition-all">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Balance'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {['H2 + O2 → H2O','CH4 + O2 → CO2 + H2O','Fe + HCl → FeCl2 + H2'].map(ex => (
            <button key={ex} onClick={() => setInput(ex)} className="text-xs px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-400 hover:text-white hover:border-emerald-500/40 transition-all font-mono">{ex}</button>
          ))}
        </div>
        <AnimatePresence>
          {result && !result.error && (
            <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} className="space-y-4">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 text-center">
                <div className="text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-2">Balanced Equation</div>
                <div className="text-2xl font-mono font-bold text-white">{result.balanced}</div>
                <div className="text-xs text-slate-400 mt-1 font-mono">{result.state_symbols}</div>
                <span className="inline-block mt-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-semibold">{result.type}</span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <h3 className="text-white font-bold mb-4">Balancing Steps</h3>
                <div className="space-y-3">
                  {result.steps?.map((step, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 text-xs font-bold flex-shrink-0">{step.step}</div>
                      <div className="flex-1">
                        <div className="text-slate-300 text-sm">{step.explanation}</div>
                        {step.state && <div className="mt-1.5 bg-slate-900/60 rounded-lg px-3 py-1.5 font-mono text-sm text-emerald-300 border border-white/5">{step.state}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {result.ionic_equation && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4">
                  <div className="text-xs text-blue-400 font-semibold mb-2">Net Ionic Equation</div>
                  <div className="font-mono text-blue-200 text-lg mb-1">{result.ionic_equation}</div>
                  <div className="text-slate-400 text-xs">{result.ionic_explanation}</div>
                </div>
              )}
              {result.notes && <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-amber-300 text-sm">⚗️ {result.notes}</div>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Graph Generator ──────────────────────────────────────────────────────────
function GraphTool() {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('function');
  const [chartType, setChartType] = useState('line');
  const [xFrom, setXFrom] = useState('-10');
  const [xTo, setXTo] = useState('10');
  const [chartData, setChartData] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  function evalFn(expr, x) {
    try {
      const safe = expr.replace(/\^/g,'**').replace(/sin/g,'Math.sin').replace(/cos/g,'Math.cos').replace(/sqrt/g,'Math.sqrt').replace(/abs/g,'Math.abs').replace(/π/g,'Math.PI').replace(/pi/g,'Math.PI');
      return Function('x', `return ${safe}`)(x);
    } catch { return null; }
  }

  function parseDataTable(text) {
    try {
      const lines = text.trim().split('\n');
      const xs = lines[0].replace(/x[:\s]*/i,'').split(',').map(Number);
      const ys = lines[1].replace(/y[:\s]*/i,'').split(',').map(Number);
      return xs.map((x,i) => ({ x, y: ys[i] }));
    } catch { return []; }
  }

  const generate = async () => {
    setLoading(true);
    let data = [];
    if (mode === 'data') {
      data = parseDataTable(input);
    } else {
      const fn = input.replace(/y\s*=\s*/i,'').trim();
      const from = parseFloat(xFrom)||(-10), to = parseFloat(xTo)||10;
      for (let i = 0; i <= 100; i++) {
        const x = parseFloat((from + i*(to-from)/100).toFixed(3));
        const y = evalFn(fn, x);
        if (y !== null && isFinite(y) && Math.abs(y) < 1000) data.push({ x, y: parseFloat(y.toFixed(4)) });
      }
    }
    setChartData(data);
    const res = await base44.functions.invoke('callOpenAI', {
      prompt: `Analyse this graph input: "${input}" (mode: ${mode}). Describe it, list key features (intercepts, turning points, asymptotes), domain, range, and tips.`,
      response_json_schema: {
        type: 'object',
        properties: { description: { type: 'string' }, key_features: { type: 'array', items: { type: 'string' } }, domain: { type: 'string' }, range: { type: 'string' }, tips: { type: 'string' } },
        required: ['description','key_features','domain','range','tips'], additionalProperties: false,
      }
    });
    setAnalysis(res.data);
    setLoading(false);
  };

  const ChartComponent = chartType === 'bar' ? BarChart : chartType === 'scatter' ? ScatterChart : LineChart;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex-shrink-0 px-6 py-4 border-b border-white/10">
        <h2 className="text-white font-bold flex items-center gap-2"><BarChart2 className="w-5 h-5 text-blue-400" /> Graph Generator</h2>
        <p className="text-slate-400 text-xs mt-0.5">Plot functions, data, and equations</p>
      </div>
      <div className="p-6 space-y-4">
        <div className="flex gap-2 mb-2">
          {['function','data','equation'].map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${mode===m ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}>{m}</button>
          ))}
        </div>
        <textarea value={input} onChange={e => setInput(e.target.value)}
          placeholder={mode==='data' ? 'x: 1,2,3,4,5\ny: 2,4,6,8,10' : 'e.g. y = x^2 - 4x + 3'} rows={mode==='data'?4:2}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 font-mono text-sm resize-none" />
        {mode !== 'data' && (
          <div className="flex gap-3 items-center flex-wrap">
            <span className="text-slate-400 text-sm">x from</span>
            <input value={xFrom} onChange={e => setXFrom(e.target.value)} className="w-16 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none" />
            <span className="text-slate-400 text-sm">to</span>
            <input value={xTo} onChange={e => setXTo(e.target.value)} className="w-16 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none" />
            <div className="ml-auto flex gap-1.5">
              {['line','bar','scatter'].map(ct => (
                <button key={ct} onClick={() => setChartType(ct)} className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${chartType===ct ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'bg-white/5 border-white/10 text-slate-400'}`}>{ct}</button>
              ))}
            </div>
          </div>
        )}
        <button onClick={generate} disabled={!input.trim() || loading}
          className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-xl font-bold disabled:opacity-40 hover:brightness-110 transition-all">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Plotting…</> : 'Generate Graph'}
        </button>

        {chartData.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <ResponsiveContainer width="100%" height={280}>
              {chartType === 'bar' ? (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="x" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid #7c3aed', borderRadius: 8 }} />
                  <Bar dataKey="y" fill="#8b5cf6" radius={[3,3,0,0]} />
                </BarChart>
              ) : chartType === 'scatter' ? (
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="x" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="y" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid #7c3aed', borderRadius: 8 }} />
                  <Scatter data={chartData} fill="#8b5cf6" />
                </ScatterChart>
              ) : (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="x" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid #7c3aed', borderRadius: 8 }} />
                  <Line type="monotone" dataKey="y" stroke="#8b5cf6" dot={false} strokeWidth={2} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        )}

        {analysis && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-5 space-y-3">
            <h3 className="text-white font-bold flex items-center gap-2"><Sparkles className="w-4 h-4 text-blue-400" /> Analysis</h3>
            <p className="text-slate-300 text-sm">{analysis.description}</p>
            {analysis.key_features?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {analysis.key_features.map((f,i) => <span key={i} className="px-2 py-1 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-200 text-xs">{f}</span>)}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-slate-500">Domain: </span><span className="text-slate-300">{analysis.domain}</span></div>
              <div><span className="text-slate-500">Range: </span><span className="text-slate-300">{analysis.range}</span></div>
            </div>
            {analysis.tips && <p className="text-amber-300 text-sm">💡 {analysis.tips}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Mind Map Tool ────────────────────────────────────────────────────────────
let nodeIdCounter = 2000;
function MindMapNode({ node, onEdit, onDelete, onAddChild, depth=0 }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(node.label);
  const COLORS = ['from-violet-500 to-purple-600','from-blue-500 to-cyan-600','from-emerald-500 to-teal-600','from-amber-500 to-orange-600','from-rose-500 to-pink-600'];
  const BG = ['bg-violet-500/10 border-violet-500/30','bg-blue-500/10 border-blue-500/30','bg-emerald-500/10 border-emerald-500/30','bg-amber-500/10 border-amber-500/30','bg-rose-500/10 border-rose-500/30'];
  const save = () => { onEdit(node.id, text); setEditing(false); };
  return (
    <div className="flex flex-col items-center">
      <div className={`relative group border rounded-xl px-3 py-2 min-w-[80px] max-w-[160px] text-center ${BG[depth%BG.length]}`}>
        {editing ? (
          <div className="flex items-center gap-1">
            <input autoFocus value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')save();}} className="bg-transparent text-white text-xs w-full focus:outline-none text-center" />
            <button onClick={save} className="text-emerald-400"><CheckCircle className="w-3 h-3"/></button>
          </div>
        ) : (
          <span className={`text-xs font-semibold bg-gradient-to-r ${COLORS[depth%COLORS.length]} bg-clip-text text-transparent`}>{node.label}</span>
        )}
        <div className="absolute -top-2 -right-2 hidden group-hover:flex gap-0.5">
          <button onClick={()=>setEditing(true)} className="w-4 h-4 bg-slate-700 rounded-full flex items-center justify-center"><Pencil className="w-2 h-2 text-slate-300"/></button>
          <button onClick={()=>onAddChild(node.id)} className="w-4 h-4 bg-slate-700 rounded-full flex items-center justify-center hover:bg-emerald-600"><Add className="w-2 h-2 text-slate-300"/></button>
          {depth>0 && <button onClick={()=>onDelete(node.id)} className="w-4 h-4 bg-slate-700 rounded-full flex items-center justify-center hover:bg-red-600"><XCircle className="w-2 h-2 text-slate-300"/></button>}
        </div>
      </div>
      {node.children?.length > 0 && (
        <div className="mt-2">
          <div className="w-px h-3 bg-white/20 mx-auto"/>
          <div className="flex gap-3 items-start">
            {node.children.map(child => (
              <div key={child.id} className="flex flex-col items-center">
                <div className="w-px h-3 bg-white/20 mx-auto"/>
                <MindMapNode node={child} onEdit={onEdit} onDelete={onDelete} onAddChild={onAddChild} depth={depth+1}/>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Stub for missing icon
const Pencil = ({ className }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>;
const Add = ({ className }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>;

function MindMapTool({ notebook, user, allSources, onResourceCreated }) {
  const [notes, setNotes] = useState('');
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(false);
  const hasContent = allSources.some(s => s.content_text);

  const autoLoad = () => {
    const ctx = allSources.filter(s=>s.content_text).map(s=>s.content_text.slice(0,3000)).join('\n');
    setNotes(ctx);
  };

  const generate = async () => {
    if (!notes.trim()) return;
    setLoading(true); setTree(null);
    const res = await base44.functions.invoke('callOpenAI', {
      prompt: `Convert these notes into a hierarchical mind map. Central topic with 3-6 main branches, each with 1-4 sub-concepts. Keep labels short (2-5 words).\n\nNotes:\n${notes.slice(0,4000)}`,
      response_json_schema: {
        type: 'object',
        properties: {
          id: { type: 'string' }, label: { type: 'string' },
          children: { type: 'array', items: {
            type: 'object',
            properties: { id: { type: 'string' }, label: { type: 'string' }, children: { type: 'array', items: {
              type: 'object',
              properties: { id: { type: 'string' }, label: { type: 'string' }, children: { type: 'array', items: { type: 'string' } } },
              required: ['id','label','children'], additionalProperties: false,
            }}},
            required: ['id','label','children'], additionalProperties: false,
          }},
        },
        required: ['id','label','children'], additionalProperties: false,
      }
    });
    const t = res.data;
    setTree(t);
    const content = JSON.stringify(t);
    const r = await base44.entities.NotebookResource.create({
      notebook_id: notebook.id, student_email: user.email,
      title: `${notebook.name} — Mind Map`, resource_type: 'mind_map', content,
      source_ids: allSources.map(s => s.id), source_count: allSources.length,
    });
    onResourceCreated(r);
    setLoading(false);
  };

  const editNode = (id, label) => {
    const update = n => n.id===id ? {...n,label} : {...n, children: n.children?.map(update)||[]};
    setTree(t => update(t));
  };
  const deleteNode = (id) => {
    const remove = n => ({...n, children: (n.children||[]).filter(c=>c.id!==id).map(remove)});
    setTree(t => remove(t));
  };
  const addChild = (parentId) => {
    const newNode = { id: `node-${nodeIdCounter++}`, label: 'New Concept', children: [] };
    const add = n => n.id===parentId ? {...n, children: [...(n.children||[]), newNode]} : {...n, children: n.children?.map(add)||[]};
    setTree(t => add(t));
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <Loader2 className="w-10 h-10 text-pink-400 animate-spin" />
      <p className="text-white font-bold">Generating Mind Map…</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-6 py-4 border-b border-white/10">
        <h2 className="text-white font-bold flex items-center gap-2"><Network className="w-5 h-5 text-pink-400" /> Mind Map Generator</h2>
        <p className="text-slate-400 text-xs mt-0.5">Convert notes into visual concept maps</p>
      </div>

      {!tree ? (
        <div className="flex-1 p-6 space-y-4">
          {hasContent && (
            <button onClick={autoLoad} className="w-full py-2 bg-pink-500/10 border border-pink-500/30 text-pink-300 rounded-xl text-sm hover:bg-pink-500/20 transition-all">
              ✨ Auto-load from sources
            </button>
          )}
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            placeholder={hasContent ? "Click 'Auto-load from sources' or paste notes here…" : "Paste your notes here to generate a mind map…"}
            rows={8} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500/50 text-sm resize-none" />
          <button onClick={generate} disabled={!notes.trim()}
            className="px-8 py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-xl font-bold disabled:opacity-40 hover:brightness-110 transition-all shadow-lg">
            Generate Mind Map
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-6">
          <div className="flex justify-between mb-4">
            <p className="text-slate-500 text-xs">Hover nodes to edit · + to add · × to delete</p>
            <button onClick={() => setTree(null)} className="text-xs text-slate-500 hover:text-white transition-colors">← Back</button>
          </div>
          <div className="min-w-max flex justify-center py-4">
            <MindMapNode node={tree} onEdit={editNode} onDelete={deleteNode} onAddChild={addChild} depth={0} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Media placeholder tools ──────────────────────────────────────────────────
function MediaTool({ tool, notebook, user, allSources, onResourceCreated }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const hasContent = allSources.some(s => s.content_text);

  const CONFIGS = {
    explainer: { label: 'Explainer Video Script', icon: Video, color: 'from-blue-600 to-indigo-600', prompt: `Create a detailed explainer video script for "${notebook.name}". Include an engaging hook, clear explanations of key concepts with visual cues, analogies, and a memorable summary. Format for a 2-3 minute video.`, resource_type: 'video_overview' },
    podcast: { label: 'Podcast Script', icon: Mic2, color: 'from-violet-600 to-purple-700', prompt: `Write a podcast-style dialogue between two hosts (Alex and Sam) discussing "${notebook.name}". Include an intro, main content broken into chapters, interesting questions, clear explanations, and an outro. Make it engaging and educational.`, resource_type: 'audio_overview' },
    voice_tutor: { label: 'Voice Tutor Session', icon: MessageSquare, color: 'from-emerald-600 to-teal-700', prompt: `Create an interactive voice tutor session for "${notebook.name}". Include key questions the student might ask, detailed explanations, follow-up questions, exam tips, and practice problems. Format as a Q&A dialogue.`, resource_type: 'notes' },
  };

  const cfg = CONFIGS[tool] || CONFIGS.explainer;
  if (!hasContent) return <NoSources />;

  const generate = async () => {
    setLoading(true); setResult('');
    const ctx = getSourceContext(allSources);
    const content = await base44.integrations.Core.InvokeLLM({ prompt: `${cfg.prompt}\n\nSOURCES:\n${ctx}` });
    const text = typeof content === 'string' ? content : JSON.stringify(content);
    setResult(text);
    const res = await base44.entities.NotebookResource.create({
      notebook_id: notebook.id, student_email: user.email,
      title: `${notebook.name} — ${cfg.label}`, resource_type: cfg.resource_type,
      content: text, source_ids: allSources.map(s => s.id), source_count: allSources.length,
    });
    onResourceCreated(res);
    setLoading(false);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <Loader2 className="w-10 h-10 text-white animate-spin" />
      <p className="text-white font-bold">Generating {cfg.label}…</p>
    </div>
  );

  if (!result) return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8 text-center">
      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${cfg.color} flex items-center justify-center shadow-lg`}>
        <cfg.icon className="w-8 h-8 text-white" />
      </div>
      <div>
        <h2 className="text-white font-bold text-xl mb-2">{cfg.label}</h2>
        <p className="text-slate-400 text-sm max-w-md">Generates a full {cfg.label.toLowerCase()} from your sources.</p>
      </div>
      <button onClick={generate} className={`px-8 py-3 bg-gradient-to-r ${cfg.color} text-white rounded-xl font-bold hover:brightness-110 transition-all shadow-lg`}>
        Generate
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-6 py-4 border-b border-white/10 flex justify-between items-center">
        <div><h2 className="text-white font-bold">{cfg.label}</h2><p className="text-xs text-slate-400">{notebook.name}</p></div>
        <div className="flex gap-2">
          <button onClick={() => navigator.clipboard.writeText(result)} className="flex items-center gap-1 px-3 py-1.5 bg-white/5 border border-white/10 text-slate-400 rounded-xl text-xs hover:text-white"><Copy className="w-3 h-3" /> Copy</button>
          <button onClick={generate} className="px-3 py-1.5 bg-white/5 border border-white/10 text-slate-400 rounded-xl text-xs hover:text-white">Regenerate</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <pre className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed font-sans">{result}</pre>
      </div>
    </div>
  );
}

// ─── Notes Tool ───────────────────────────────────────────────────────────────
function NotesTool({ notebook, user, onResourceCreated }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saved, setSaved] = useState(false);

  const save = async () => {
    if (!content.trim()) return;
    await base44.entities.NotebookResource.create({
      notebook_id: notebook.id, student_email: user.email,
      title: title || `Note — ${new Date().toLocaleDateString()}`,
      resource_type: 'notes', content, source_count: 0,
    });
    onResourceCreated();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-6 py-4 border-b border-white/10">
        <h2 className="text-white font-bold flex items-center gap-2"><StickyNote className="w-5 h-5 text-amber-400" /> Notes</h2>
        <p className="text-slate-400 text-xs mt-0.5">Write and save personal study notes</p>
      </div>
      <div className="flex-1 p-6 space-y-4 flex flex-col">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Note title…"
          className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50 text-sm" />
        <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Write your notes here…"
          className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50 text-sm resize-none min-h-[300px]" />
        <button onClick={save} disabled={!content.trim()}
          className={`px-8 py-3 rounded-xl font-bold text-white disabled:opacity-40 transition-all ${saved ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-500 to-yellow-600 hover:brightness-110'}`}>
          {saved ? '✓ Saved!' : 'Save Note'}
        </button>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function StudioCenterPanel({ activeTool, tool, notebook, user, allSources, onResourceCreated, onOpenStudy }) {
  const t = activeTool || tool || 'chat';
  const props = { notebook, user, allSources, onResourceCreated, onOpenStudy };

  return (
    <AnimatePresence mode="wait">
      <motion.div key={t} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }} className="flex flex-col h-full">
        {t === 'chat' && <AIChatTool {...props} />}
        {t === 'flashcards' && <FlashcardTool {...props} />}
        {t === 'quiz' && <QuizBuilder {...props} />}
        {t === 'test' && <SimpleGenTool tool="test" {...props} />}
        {t === 'exam_sim' && <SimpleGenTool tool="exam_sim" {...props} />}
        {t === 'equation' && <EquationTool {...props} />}
        {t === 'chemistry' && <ChemistryTool {...props} />}
        {t === 'graph' && <GraphTool {...props} />}
        {t === 'mindmap' && <MindMapTool {...props} />}
        {t === 'explainer' && <MediaTool tool="explainer" {...props} />}
        {t === 'podcast' && <MediaTool tool="podcast" {...props} />}
        {t === 'voice_tutor' && <MediaTool tool="voice_tutor" {...props} />}
        {t === 'summary' && <SimpleGenTool tool="summary" {...props} />}
        {t === 'notes' && <NotesTool {...props} />}
        {t === 'topic_breakdown' && <SimpleGenTool tool="topic_breakdown" {...props} />}
      </motion.div>
    </AnimatePresence>
  );
}