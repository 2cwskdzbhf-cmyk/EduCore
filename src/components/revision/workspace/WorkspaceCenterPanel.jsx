import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import {
  Send, Loader2, RefreshCw, ThumbsUp, ThumbsDown, Copy, BookmarkPlus,
  RotateCcw, Zap, Sparkles, Check
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const CHIPS = [
  { label: '📋 Summarise topic', prompt: 'Summarise the key content from my selected sources with clear headings and bullet points.' },
  { label: '🃏 Create flashcards', prompt: 'Generate 10 flashcard-style Q&A pairs from the most important content in my sources.' },
  { label: '❓ Generate quiz', prompt: 'Create a 5-question multiple choice quiz from my sources with answers.' },
  { label: '🗺️ Generate mind map', prompt: 'Create a structured mind map outline with main topics and subtopics from my sources.' },
  { label: '📖 Revision guide', prompt: 'Generate a structured revision guide with topic summary, key facts, definitions, and exam tips.' },
  { label: '🔑 Key formulas', prompt: 'List all key formulas, equations, and rules from my sources.' },
  { label: '💡 Explain simply', prompt: 'Explain the main concepts as simply as possible, as if I am 13 years old. Use analogies.' },
  { label: '📝 Exam questions', prompt: 'Generate 5 exam-style questions with mark scheme answers based on my sources.' },
];

const SUGGESTED = [
  'What are the key topics I should know?',
  'What are the most common exam mistakes?',
  'Give me a 5-minute revision summary.',
  'What would likely come up in an exam?',
];

export default function WorkspaceCenterPanel({ notebook, user, sources, selectedSourceIds, onSendToStudio }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);
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

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    const activeSources = sources.filter(s => selectedSourceIds.includes(s.id) && s.content_text);
    const contextParts = activeSources
      .map(s => `### Source: ${s.name}\n${s.content_text.slice(0, 8000)}`)
      .join('\n\n---\n\n');

    const prompt = `You are a helpful AI revision assistant for UK school students studying "${notebook.name}"${notebook.subject ? ` (${notebook.subject})` : ''}.

Always ground your responses in the provided source materials. Cite sources where relevant. Be clear, educational, and student-friendly. Use markdown formatting with headers and bullet points where helpful.

${contextParts ? `SELECTED SOURCES:\n\n${contextParts}` : 'No sources selected — give a general helpful response but encourage the student to upload and select their notes.'}

Previous conversation:
${newMessages.slice(-8, -1).map(m => `${m.role === 'user' ? 'Student' : 'AI'}: ${m.content}`).join('\n')}

Student: ${text}`;

    try {
      const resp = await base44.integrations.Core.InvokeLLM({ prompt });
      const content = typeof resp === 'string' ? resp : resp?.content || JSON.stringify(resp);
      const assistantMsg = { role: 'assistant', content, timestamp: new Date().toISOString() };
      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);
      await saveChat(finalMessages);
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

  const copyMsg = (idx, content) => {
    navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  const saveToStudio = (content, prompt) => {
    const typeGuess = prompt.toLowerCase().includes('flashcard') ? 'flashcards'
      : prompt.toLowerCase().includes('quiz') ? 'quiz'
      : prompt.toLowerCase().includes('mind map') ? 'mind_map'
      : prompt.toLowerCase().includes('formula') ? 'formula_sheet'
      : prompt.toLowerCase().includes('exam') ? 'exam_questions'
      : 'notes';
    onSendToStudio({ content, resource_type: typeGuess, title: `${notebook.name} — ${new Date().toLocaleDateString('en-GB')}` });
  };

  const activeSourceCount = sources.filter(s => selectedSourceIds.includes(s.id)).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-5 py-3.5 border-b border-white/10 flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-sm">AI Chat</h2>
          <p className="text-slate-500 text-[11px]">
            {activeSourceCount > 0 ? `Using ${activeSourceCount} selected source${activeSourceCount !== 1 ? 's' : ''}` : 'No sources selected'}
          </p>
        </div>
        {messages.length > 0 && (
          <button onClick={clearChat} className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-400 transition-colors">
            <RotateCcw className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Suggestion chips */}
      <div className="flex-shrink-0 px-4 py-2.5 border-b border-white/10 overflow-x-auto">
        <div className="flex gap-1.5 min-w-max">
          {CHIPS.map(c => (
            <button key={c.label} onClick={() => sendMessage(c.prompt)}
              className="flex-shrink-0 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-slate-300 hover:bg-violet-500/15 hover:border-violet-500/30 hover:text-white text-[11px] font-medium transition-all whitespace-nowrap">
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {messages.length === 0 && (
          <div className="text-center py-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-500/30">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <p className="text-white font-bold text-lg mb-1">AI Revision Assistant</p>
            <p className="text-slate-400 text-sm mb-6">Ask anything about your notebook, or try a suggestion</p>
            <div className="space-y-2 max-w-sm mx-auto">
              {SUGGESTED.map(q => (
                <button key={q} onClick={() => sendMessage(q)}
                  className="w-full text-left px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] text-slate-300 hover:text-white text-sm transition-all">
                  "{q}"
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} gap-3`}>
            {m.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-1">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
            )}
            <div className={`group max-w-[85%] ${m.role === 'user' ? '' : 'w-full'}`}>
              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-gradient-to-br from-violet-600 to-purple-700 text-white rounded-tr-sm'
                  : 'bg-white/[0.05] border border-white/10 text-slate-200 rounded-tl-sm'
              }`}>
                {m.role === 'assistant' ? (
                  <div className="prose prose-invert prose-sm max-w-none text-slate-200 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:leading-relaxed [&_ul]:my-2 [&_li]:my-0.5">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                )}
              </div>
              {/* Action row for AI messages */}
              {m.role === 'assistant' && (
                <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => copyMsg(i, m.content)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 text-[10px] transition-all">
                    {copiedIdx === i ? <><Check className="w-3 h-3 text-emerald-400" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                  </button>
                  <button onClick={() => saveToStudio(m.content, messages[i - 1]?.content || '')}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 text-[10px] transition-all">
                    <BookmarkPlus className="w-3 h-3" /> Save to Studio
                  </button>
                  <button onClick={() => sendMessage(messages[i - 1]?.content || 'Please elaborate')}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 text-[10px] transition-all">
                    <RefreshCw className="w-3 h-3" /> Regenerate
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        ))}

        {loading && (
          <div className="flex justify-start gap-3">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-1">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="bg-white/[0.05] border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div key={i} className="w-2 h-2 bg-violet-400 rounded-full"
                    animate={{ y: [0, -6, 0] }} transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-white/10">
        <div className="flex gap-2 items-end bg-white/[0.04] border border-white/10 focus-within:border-violet-500/40 rounded-2xl p-2.5 transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            placeholder="Ask a question or create something..."
            rows={2}
            className="flex-1 bg-transparent text-white text-sm resize-none focus:outline-none placeholder:text-slate-500 px-1 py-0.5 max-h-36"
          />
          <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center disabled:opacity-40 flex-shrink-0 hover:brightness-110 transition-all self-end">
            {loading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
          </button>
        </div>
        <p className="text-[10px] text-slate-600 mt-1 px-1">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}