import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Send, Sparkles, Bot, User, Lightbulb, BookOpen, Zap, FileText, Brain } from 'lucide-react';

const QUICK_ACTIONS = [
  { label: '📋 Summarise', prompt: 'Please summarise all the key content from my sources.' },
  { label: '💡 Explain', prompt: 'Explain the main concepts from my materials in simple terms.' },
  { label: '🎯 Key Facts', prompt: 'List the most important facts and key points from my notes.' },
  { label: '❓ Test Me', prompt: 'Ask me 5 questions to test my understanding of these materials.' },
  { label: '🧠 Tutor Mode', prompt: 'Teach me the content step by step, adapting to my understanding.' },
  { label: '👶 Explain Like I\'m 13', prompt: 'Explain all the content in the simplest way possible, as if I\'m 13 years old.' },
];

const SUGGESTED_QUESTIONS = [
  'What are the most important topics I should focus on?',
  'Can you create a study plan for this subject?',
  'What common mistakes should I avoid in exams?',
  'Compare and contrast the main concepts in my notes',
  'What exam tips can you give me based on my materials?',
];

export default function AIChat({ notebook, user }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi! I'm your AI study assistant for **${notebook.name}**. I'll answer questions based on your uploaded sources. Upload some sources first, then ask me anything! 📚`,
      timestamp: new Date().toISOString(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatRecord, setChatRecord] = useState(null);
  const bottomRef = useRef(null);

  const { data: sources = [] } = useQuery({
    queryKey: ['revisionSources', notebook.id],
    queryFn: () => base44.entities.RevisionSource.filter({ notebook_id: notebook.id }),
  });

  useEffect(() => {
    // Load or create chat record
    base44.entities.RevisionChat.filter({ notebook_id: notebook.id, student_email: user.email })
      .then(records => {
        if (records.length > 0) {
          setChatRecord(records[0]);
          if (records[0].messages?.length > 0) {
            setMessages(records[0].messages);
          }
        }
      });
  }, [notebook.id, user.email]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const buildContext = () => {
    if (sources.length === 0) return 'No sources uploaded yet.';
    return sources.map((s, i) => `[Source ${i + 1}: ${s.name}]\n${s.content_text || s.url || '(file uploaded)'}`).join('\n\n---\n\n');
  };

  const sendMessage = async (prompt) => {
    const text = prompt || input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    const context = buildContext();
    const systemPrompt = `You are a helpful AI study assistant for a student. The student has uploaded the following study materials:

${context}

Your job is to:
1. Answer questions based ONLY on the provided materials
2. Always cite which source you're referring to (e.g. "According to Source 1...")
3. If information isn't in the sources, say so clearly
4. Be encouraging and educational
5. Use clear, student-friendly language
6. For GCSE/A-Level topics, provide exam-relevant answers`;

    const conversationHistory = newMessages.slice(-10).map(m => ({ role: m.role, content: m.content }));

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: text,
      system_prompt: systemPrompt,
      conversation_history: conversationHistory,
    });

    const assistantMsg = {
      role: 'assistant',
      content: res.result || res,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...newMessages, assistantMsg];
    setMessages(updatedMessages);
    setLoading(false);

    // Save chat history
    if (chatRecord) {
      await base44.entities.RevisionChat.update(chatRecord.id, { messages: updatedMessages });
    } else {
      const newRecord = await base44.entities.RevisionChat.create({
        notebook_id: notebook.id,
        student_email: user.email,
        messages: updatedMessages,
      });
      setChatRecord(newRecord);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-5 h-[calc(100vh-220px)]">
      {/* Chat area */}
      <div className="flex-1 flex flex-col rounded-2xl border border-white/10 bg-slate-950/50 overflow-hidden min-h-[500px]">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white font-bold'
                    : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
                }`}>
                  {msg.role === 'user' ? (user?.full_name?.charAt(0) || 'U') : <Bot className="w-4 h-4" />}
                </div>
                <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white'
                      : 'bg-white/10 text-slate-200 border border-white/10'
                  }`}>
                    {msg.content}
                  </div>
                  <p className="text-slate-600 text-xs mt-1 px-1">
                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white/10 border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <motion.div key={i} className="w-2 h-2 bg-slate-400 rounded-full"
                      animate={{ y: [0, -6, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
                  ))}
                </div>
                <span className="text-slate-400 text-xs">Thinking...</span>
              </div>
            </motion.div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-white/10 p-4">
          {sources.length === 0 && (
            <p className="text-amber-400 text-xs text-center mb-3 flex items-center justify-center gap-1">
              <Lightbulb className="w-3 h-3" /> Add sources to the notebook for best results
            </p>
          )}
          <div className="flex gap-3">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ask anything about your notes..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50"
            />
            <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
              className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white hover:brightness-110 transition-all disabled:opacity-40 shadow-lg shadow-violet-500/30 flex-shrink-0">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="lg:w-64 flex flex-col gap-4">
        {/* Quick Actions */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-white font-bold text-sm mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4 text-violet-400" /> Quick Actions</p>
          <div className="space-y-2">
            {QUICK_ACTIONS.map(a => (
              <button key={a.label} onClick={() => sendMessage(a.prompt)}
                className="w-full text-left px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-medium transition-all">
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Suggested Questions */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-white font-bold text-sm mb-3 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-400" /> Suggested Questions</p>
          <div className="space-y-2">
            {SUGGESTED_QUESTIONS.map(q => (
              <button key={q} onClick={() => sendMessage(q)}
                className="w-full text-left px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs transition-all leading-relaxed">
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}