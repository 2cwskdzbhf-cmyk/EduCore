import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Send, Loader2, RefreshCw, GraduationCap, Lightbulb, HelpCircle, BookOpen, Target, Smile } from 'lucide-react';

const TUTOR_MODES = [
  { id: 'gcse', label: 'GCSE', desc: 'Foundation & Higher tier support' },
  { id: 'alevel', label: 'A-Level', desc: 'Advanced concepts & analysis' },
  { id: 'simple', label: 'Simple', desc: 'Easy explanations for everyone' },
];

const TUTOR_ACTIONS = [
  { label: '🧒 Explain Like I\'m 13', prompt: 'Explain the most important concept from my notes as if I am 13 years old. Use simple language, analogies, and examples.' },
  { label: '💡 Give Me a Hint', prompt: 'Give me a hint about the key concept I should focus on, without giving the full answer. Encourage me to think.' },
  { label: '🎯 Test My Knowledge', prompt: 'Ask me a question about my notes to test my understanding. Wait for my answer before explaining.' },
  { label: '📖 Teach Step-by-Step', prompt: 'Teach me the main topic from my notes step by step. Break it into small clear stages and check my understanding at each step.' },
  { label: '❓ What Are Common Mistakes?', prompt: 'What are the most common mistakes students make on this topic? Explain how to avoid them.' },
  { label: '🔗 Connect to Real Life', prompt: 'Give me a real-life example or application of the concepts in my notes to help me understand why it matters.' },
];

const SYSTEM_PROMPT = (notebook, sources, mode) => {
  const contextParts = sources.filter(s => s.content_text)
    .map(s => `### ${s.name}\n${s.content_text.slice(0, 6000)}`).join('\n\n---\n\n');

  const modeInstr = mode === 'alevel'
    ? 'The student is studying at A-Level. Use precise academic language, encourage deeper analysis and evaluation. Push them to think critically.'
    : mode === 'simple'
    ? 'Use very simple language. Short sentences. No jargon. Use analogies. Perfect for students who find the topic difficult.'
    : 'The student is studying at GCSE level. Be encouraging, clear, and supportive. Cover both foundation and higher tier content.';

  return `You are a patient and encouraging AI tutor helping a student revise "${notebook.name}"${notebook.subject ? ` (${notebook.subject})` : ''}${notebook.exam_board ? ` for ${notebook.exam_board}` : ''}.

${modeInstr}

TUTOR PRINCIPLES:
- Guide students to discover answers themselves with hints rather than giving answers directly
- Break complex ideas into smaller steps
- Celebrate progress and effort
- When a student makes a mistake, explain gently what went wrong and why
- Ask follow-up questions to check understanding
- Keep responses focused and not too long (3-5 sentences unless explaining step-by-step)
- ALWAYS cite which source your information comes from when relevant

${contextParts ? `STUDENT'S REVISION NOTES:\n\n${contextParts}` : 'NOTE: The student has not uploaded any notes yet. Encourage them to upload their materials first, but you can still help with general questions.'}`;
};

export default function AITutorMode({ notebook, user, sources }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('gcse');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    const history = newMessages.slice(-12).map(m => ({ role: m.role, content: m.content }));

    try {
      const resp = await base44.integrations.Core.InvokeLLM({
        prompt: text,
        system_prompt: SYSTEM_PROMPT(notebook, sources, mode),
        conversation_history: history.slice(0, -1),
      });
      const assistantMsg = { role: 'assistant', content: resp, timestamp: new Date().toISOString() };
      setMessages([...newMessages, assistantMsg]);
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.', timestamp: new Date().toISOString() }]);
    }
    setLoading(false);
  };

  const hasContent = sources.some(s => s.content_text);

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[500px] max-w-3xl mx-auto">
      {/* Mode selector */}
      <div className="flex-shrink-0 flex items-center gap-2 mb-4">
        <GraduationCap className="w-4 h-4 text-violet-400 flex-shrink-0" />
        <span className="text-slate-400 text-xs font-semibold">Study Level:</span>
        <div className="flex gap-1">
          {TUTOR_MODES.map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === m.id ? 'bg-violet-500/30 text-violet-300 border border-violet-500/40' : 'text-slate-500 hover:text-white bg-white/5'}`}>
              {m.label}
            </button>
          ))}
        </div>
        {messages.length > 0 && (
          <button onClick={() => setMessages([])} className="ml-auto text-xs text-slate-500 hover:text-red-400 flex items-center gap-1 transition-all">
            <RefreshCw className="w-3 h-3" /> New Session
          </button>
        )}
      </div>

      {/* Quick action buttons */}
      <div className="flex-shrink-0 flex gap-2 flex-wrap mb-4">
        {TUTOR_ACTIONS.map(a => (
          <button key={a.label} onClick={() => sendMessage(a.prompt)} disabled={loading}
            className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-violet-500/20 hover:border-violet-500/30 text-xs font-medium transition-all disabled:opacity-40">
            {a.label}
          </button>
        ))}
      </div>

      {!hasContent && (
        <div className="flex-shrink-0 mb-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
          <p className="text-amber-300 text-sm font-medium">⚠️ No sources uploaded yet</p>
          <p className="text-slate-400 text-xs mt-1">Upload your notes in the Sources tab for personalised tutoring grounded in your materials.</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-500/30">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <p className="text-white font-black text-xl mb-2">AI Tutor</p>
            <p className="text-slate-400 text-sm mb-2">I'll teach you step-by-step, give hints, and test your knowledge.</p>
            <p className="text-slate-500 text-xs">Choose a quick action above or ask me anything!</p>
          </div>
        )}
        {messages.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-1">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
            )}
            <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              m.role === 'user'
                ? 'bg-gradient-to-br from-violet-600 to-purple-700 text-white rounded-br-sm'
                : 'bg-white/[0.07] border border-white/10 text-slate-200 rounded-bl-sm'
            }`}>
              <p className="whitespace-pre-wrap">{m.content}</p>
              <p className="text-xs opacity-40 mt-1.5">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </motion.div>
        ))}
        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
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
            placeholder="Ask your tutor anything, or say 'I don't understand...' "
            rows={1}
            className="flex-1 bg-transparent text-white text-sm resize-none focus:outline-none placeholder:text-slate-500 px-2 py-1.5 max-h-32"
          />
          <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center disabled:opacity-40 flex-shrink-0 hover:brightness-110 transition-all">
            {loading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
          </button>
        </div>
        <p className="text-xs text-slate-600 mt-1 px-1">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}