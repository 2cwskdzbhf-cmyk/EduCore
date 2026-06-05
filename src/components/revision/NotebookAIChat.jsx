import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Send, Loader2, Lightbulb, BookOpen, Layers, FileText, RefreshCw } from 'lucide-react';

const QUICK_ACTIONS = [
  { label: '📋 Summarise', prompt: 'Summarise the key content from my sources in this notebook. Use clear headings and bullet points.' },
  { label: '💡 Explain Simply', prompt: 'Explain the main concepts simply, as if I am a GCSE student. Use plain language.' },
  { label: '🔬 Explain Deeply', prompt: 'Explain the main concepts in depth, covering all nuances and connections between ideas. Suitable for A-Level study.' },
  { label: '❓ Create Quiz', prompt: 'Create a 5-question multiple choice quiz from my notes with answers.' },
  { label: '🗂️ Create Flashcards', prompt: 'Generate 10 flashcard-style Q&A pairs from the most important content in my notes.' },
  { label: '📖 Study Guide', prompt: 'Generate a structured study guide with topic summary, key facts, definitions, and exam tips.' },
  { label: '📊 Compare Sources', prompt: 'Compare and contrast the main ideas across my different sources. Highlight agreements and disagreements.' },
  { label: '🔍 Find Info', prompt: 'What are the most important pieces of information in my notes that I should know for an exam?' },
  { label: '🧠 ELI13', prompt: 'Explain the most important topic from my notes as simply as possible, like I am 13 years old. Use analogies and simple language.' },
];

const SUGGESTED = [
  'What are the key topics I should revise?',
  'What are the most common exam mistakes?',
  'Give me exam tips for this subject.',
  'Create flashcard-style Q&A from my notes.',
];

export default function NotebookAIChat({ notebook, user, sources }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load previous chat
  useEffect(() => {
    base44.entities.RevisionChat.filter({ notebook_id: notebook.id, student_email: user.email })
      .then(chats => {
        if (chats[0]?.messages?.length) setMessages(chats[0].messages);
      });
  }, [notebook.id]);

  const saveChat = async (msgs) => {
    const existing = await base44.entities.RevisionChat.filter({ notebook_id: notebook.id, student_email: user.email });
    if (existing[0]) {
      await base44.entities.RevisionChat.update(existing[0].id, { messages: msgs });
    } else {
      await base44.entities.RevisionChat.create({ notebook_id: notebook.id, student_email: user.email, messages: msgs });
    }
  };

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    // Build context from sources
    const contextParts = sources
      .filter(s => s.content_text)
      .map(s => `### Source: ${s.name}\n${s.content_text.slice(0, 8000)}`)
      .join('\n\n---\n\n');

    const systemPrompt = `You are a helpful revision assistant for a student. You have access to their uploaded revision notes and materials for the notebook "${notebook.name}"${notebook.subject ? ` (${notebook.subject})` : ''}.

ALWAYS ground your responses in the provided source materials. If information is from a specific source, cite it (e.g., "According to [Source Name]..."). If the answer is not in the sources, say so clearly.

Keep responses clear, educational, and student-friendly. Use bullet points and structure where helpful.

${contextParts ? `NOTEBOOK SOURCES:\n\n${contextParts}` : 'NOTE: No sources have been uploaded yet. Ask the student to upload their notes first.'}`;

    const history = newMessages.slice(-10).map(m => ({ role: m.role, content: m.content }));

    try {
      const resp = await base44.integrations.Core.InvokeLLM({
        prompt: text,
        system_prompt: systemPrompt,
        conversation_history: history.slice(0, -1),
      });
      const assistantMsg = {
        role: 'assistant',
        content: resp,
        timestamp: new Date().toISOString(),
      };
      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);
      await saveChat(finalMessages);
    } catch (e) {
      const errMsg = { role: 'assistant', content: 'Sorry, something went wrong. Please try again.', timestamp: new Date().toISOString() };
      setMessages(m => [...m, errMsg]);
    }
    setLoading(false);
  };

  const clearChat = async () => {
    setMessages([]);
    const existing = await base44.entities.RevisionChat.filter({ notebook_id: notebook.id, student_email: user.email });
    if (existing[0]) await base44.entities.RevisionChat.update(existing[0].id, { messages: [] });
  };

  const hasContent = sources.some(s => s.content_text);

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] min-h-[500px]">
      {/* Quick actions */}
      <div className="flex-shrink-0 flex gap-2 flex-wrap mb-4">
        {QUICK_ACTIONS.map(a => (
          <button key={a.label} onClick={() => sendMessage(a.prompt)}
            className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-violet-500/20 hover:border-violet-500/30 text-xs font-medium transition-all">
            {a.label}
          </button>
        ))}
        {messages.length > 0 && (
          <button onClick={clearChat} className="ml-auto px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-500 hover:text-red-400 text-xs transition-all flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Source warning */}
      {!hasContent && sources.length === 0 && (
        <div className="flex-shrink-0 mb-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
          <p className="text-amber-300 text-sm font-medium">⚠️ No sources uploaded yet</p>
          <p className="text-slate-400 text-xs mt-1">Upload your notes in the Sources tab for grounded AI answers with citations.</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">🤖</div>
            <p className="text-white font-bold text-lg mb-1">AI Revision Assistant</p>
            <p className="text-slate-400 text-sm mb-6">Ask me anything about your notebook content</p>
            <div className="space-y-2 max-w-sm mx-auto">
              {SUGGESTED.map(q => (
                <button key={q} onClick={() => sendMessage(q)}
                  className="w-full text-left px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 text-sm transition-all">
                  "{q}"
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              m.role === 'user'
                ? 'bg-gradient-to-br from-violet-600 to-purple-700 text-white rounded-br-sm'
                : 'bg-white/[0.07] border border-white/10 text-slate-200 rounded-bl-sm'
            }`}>
              <p className="whitespace-pre-wrap">{m.content}</p>
              <p className="text-xs opacity-50 mt-1">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </motion.div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/[0.07] border border-white/10 rounded-2xl rounded-bl-sm px-4 py-3">
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
      <div className="flex-shrink-0 mt-4">
        <div className="flex gap-2 items-end bg-white/5 border border-white/10 focus-within:border-violet-500/50 rounded-2xl p-2 transition-all">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            placeholder="Ask anything about your notes..."
            rows={1}
            className="flex-1 bg-transparent text-white text-sm resize-none focus:outline-none placeholder:text-slate-500 px-2 py-1.5 max-h-32"
          />
          <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center disabled:opacity-40 flex-shrink-0 hover:brightness-110 transition-all">
            {loading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
          </button>
        </div>
        <p className="text-xs text-slate-600 mt-1 px-1">Press Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}