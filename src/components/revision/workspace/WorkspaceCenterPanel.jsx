import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import {
  Send, Loader2, RefreshCw, Copy, ThumbsUp, ThumbsDown, BookmarkPlus,
  RotateCcw, ChevronRight, AlertTriangle
} from 'lucide-react';

const QUICK_CHIPS = [
  { label: '📋 Summarise', prompt: 'Summarise the key content from my sources with clear headings and bullet points.' },
  { label: '💡 Explain Simply', prompt: 'Explain the main concepts simply, as if I am a GCSE student.' },
  { label: '🗂️ Create Flashcards', prompt: 'Generate 10 flashcard Q&A pairs from the most important content.' },
  { label: '❓ Generate Quiz', prompt: 'Create a 5-question multiple choice quiz with answers from my notes.' },
  { label: '🧠 Mind Map', prompt: 'Create a structured mind map outline with main topics and subtopics from the content.' },
  { label: '📖 Revision Guide', prompt: 'Generate a complete structured revision guide with topic summary, key facts, definitions, and exam tips.' },
  { label: '🔢 Key Formulas', prompt: 'Extract and explain all key formulas, equations, and rules from my sources.' },
  { label: '📝 Exam Questions', prompt: 'Generate 8 likely exam questions with model answers based on my notes.' },
  { label: '📊 Data Table', prompt: 'Organise the key information from my sources into a clear structured table.' },
  { label: '🗺️ Topic Overview', prompt: 'Give me a complete topic overview with all key themes, people, dates, and concepts.' },
];

const SUGGESTED = [
  'What are the key topics I need to know for the exam?',
  'What are the most common mistakes students make?',
  'Explain the most difficult concept simply.',
  'What connections exist between different topics?',
];

export default function WorkspaceCenterPanel({ notebook, user, selectedSources, allSources, onResourceCreated }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [likedMsgs, setLikedMsgs] = useState({});
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

    const activeSources = selectedSources.length > 0 ? selectedSources : allSources;
    const contextParts = activeSources
      .filter(s => s.content_text)
      .map(s => `### Source: ${s.name}\n${s.content_text.slice(0, 8000)}`)
      .join('\n\n---\n\n');

    const systemPrompt = `You are an expert AI revision assistant for a student studying "${notebook.name}"${notebook.subject ? ` (${notebook.subject})` : ''}.
Ground your responses in the provided source materials. Cite sources when relevant (e.g. "According to [Source Name]...").
Keep responses clear, educational, and well-structured. Use markdown formatting with headings and bullet points where helpful.
${contextParts ? `\nSOURCE MATERIALS:\n\n${contextParts}` : '\nNote: No sources uploaded yet. Encourage the student to upload materials.'}`;

    const history = newMessages.slice(-12).map(m => ({ role: m.role, content: m.content }));

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

      // Auto-detect if content was generated and save to studio
      const lowerPrompt = text.toLowerCase();
      let resourceType = null;
      if (lowerPrompt.includes('flashcard')) resourceType = 'flashcards';
      else if (lowerPrompt.includes('quiz')) resourceType = 'quiz';
      else if (lowerPrompt.includes('mind map')) resourceType = 'mind_map';
      else if (lowerPrompt.includes('revision guide') || lowerPrompt.includes('study guide')) resourceType = 'study_guide';
      else if (lowerPrompt.includes('formula')) resourceType = 'formula_sheet';
      else if (lowerPrompt.includes('exam question')) resourceType = 'exam_questions';
      else if (lowerPrompt.includes('summary') || lowerPrompt.includes('summarise')) resourceType = 'summary';
      else if (lowerPrompt.includes('table') || lowerPrompt.includes('data table')) resourceType = 'data_table';
      else if (lowerPrompt.includes('report')) resourceType = 'report';

      if (resourceType) {
        const title = `${notebook.name} — ${resourceType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`;
        const res = await base44.entities.NotebookResource.create({
          notebook_id: notebook.id, student_email: user.email,
          title, resource_type: resourceType, content: resp,
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
    await base44.entities.NotebookResource.create({
      notebook_id: notebook.id, student_email: user.email,
      title: `Saved Note — ${new Date().toLocaleDateString()}`,
      resource_type: 'notes', content,
      source_count: selectedSources.length,
    });
    onResourceCreated();
  };

  const hasSelectedContent = (selectedSources.length > 0 ? selectedSources : allSources).some(s => s.content_text);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-5 py-3.5 border-b border-white/10 flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-sm">AI Assistant</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {selectedSources.length > 0 ? `${selectedSources.length} source${selectedSources.length !== 1 ? 's' : ''} selected` : `All ${allSources.length} sources`}
          </p>
        </div>
        {messages.length > 0 && (
          <button onClick={clearChat} className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10">
            <RefreshCw className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Quick chips */}
      <div className="flex-shrink-0 px-4 py-2.5 border-b border-white/10 flex gap-1.5 overflow-x-auto scrollbar-hide">
        {QUICK_CHIPS.map(c => (
          <button key={c.label} onClick={() => sendMessage(c.prompt)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300 hover:text-white hover:bg-violet-500/15 hover:border-violet-500/30 transition-all font-medium whitespace-nowrap">
            {c.label}
          </button>
        ))}
      </div>

      {/* No sources warning */}
      {!hasSelectedContent && allSources.length === 0 && (
        <div className="flex-shrink-0 mx-4 mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-300 text-xs font-semibold">No sources added yet</p>
            <p className="text-slate-400 text-xs mt-0.5">Add sources in the left panel for grounded AI answers with citations.</p>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-2xl mx-auto mb-4 shadow-lg shadow-violet-500/30">🤖</div>
            <p className="text-white font-bold text-base mb-1">Ask me anything</p>
            <p className="text-slate-400 text-sm mb-6">I'll answer using your uploaded sources</p>
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
                  <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-[10px]">🤖</div>
                  <span className="text-xs text-slate-500">AI Assistant</span>
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

        {loading && (
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
      <div className="flex-shrink-0 p-4 border-t border-white/10">
        <div className="flex gap-2.5 items-end bg-white/5 border border-white/15 focus-within:border-violet-500/50 rounded-2xl p-3 transition-all shadow-inner">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            placeholder="Ask a question or create something..."
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