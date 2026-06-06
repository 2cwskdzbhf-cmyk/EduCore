import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Mic, MicOff, Volume2, Loader2, MessageSquare, Brain, X, RefreshCw, Zap } from 'lucide-react';

const TUTOR_MODES = [
  { id: 'explain', label: 'Explain Topics', desc: 'Ask anything, get clear explanations', icon: Brain },
  { id: 'quiz', label: 'Verbal Quiz', desc: 'Tutor tests you on your material', icon: Zap },
  { id: 'discuss', label: 'Free Discussion', desc: 'Open conversation about your notes', icon: MessageSquare },
];

function buildSystemPrompt(mode, sources, notebookName) {
  const sourceContext = sources.slice(0, 3).map(s => s.content_text || '').join('\n\n').slice(0, 4000);
  const base = `You are an expert AI tutor for a student studying "${notebookName || 'their subject'}".
${sourceContext ? `\nYou have full access to these study materials:\n${sourceContext}\n` : ''}
Keep responses concise (2-4 sentences max) — this is a voice conversation.
Speak naturally and directly. No bullet points or markdown.`;

  if (mode === 'quiz') return base + `\nYour role: Actively quiz the student. After each response, immediately ask them a question about the material. Start by asking a question.`;
  if (mode === 'explain') return base + `\nYour role: Explain topics clearly with examples. Answer questions thoroughly but concisely.`;
  return base + `\nYour role: Have an engaging academic discussion. Ask follow-up questions to deepen understanding.`;
}

export default function VoiceTutor({ sources, notebook }) {
  const [mode, setMode] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [currentAudioUrl, setCurrentAudioUrl] = useState(null);
  const audioRef = useRef(null);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);

  const sourceText = sources.slice(0, 3).map(s => s.content_text || s.name).join('\n\n').slice(0, 4000);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startSession = async (selectedMode) => {
    setMode(selectedMode);
    setMessages([]);
    setError('');

    // Generate opening message
    setIsThinking(true);
    try {
      const opening = selectedMode === 'quiz'
        ? `Let's test your knowledge on ${notebook?.name || 'your material'}! Here's your first question:`
        : `Hi! I'm your AI tutor for ${notebook?.name || 'this topic'}. What would you like to ${selectedMode === 'explain' ? 'understand' : 'discuss'} today?`;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt: buildSystemPrompt(selectedMode, sources, notebook?.name) + `\n\nGenerate a natural opening message as the tutor.`,
      });

      const aiText = typeof res === 'string' ? res : res;
      addMessage('assistant', aiText);
      await speakText(aiText);
    } catch {
      addMessage('assistant', `Hi! I'm ready to help you study ${notebook?.name || 'your material'}. What would you like to know?`);
    }
    setIsThinking(false);
  };

  const addMessage = (role, content) => {
    setMessages(prev => [...prev, { role, content, timestamp: Date.now() }]);
  };

  const speakText = async (text) => {
    setIsSpeaking(true);
    try {
      const r = await base44.integrations.Core.GenerateSpeech({
        text: text.slice(0, 500),
        voice: 'river',
      });
      setCurrentAudioUrl(r.url);
      if (audioRef.current) {
        audioRef.current.src = r.url;
        await audioRef.current.play();
        await new Promise(resolve => {
          audioRef.current.onended = resolve;
        });
      }
    } catch {
      // Fall back to browser TTS
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text.slice(0, 300));
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
        await new Promise(resolve => { utterance.onend = resolve; });
      }
    }
    setIsSpeaking(false);
  };

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setError('Speech recognition not supported in your browser. Try Chrome.');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-GB';

    recognition.onresult = (e) => {
      const t = Array.from(e.results).map(r => r[0].transcript).join('');
      setTranscript(t);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (transcript.trim()) sendMessage(transcript.trim());
    };

    recognition.onerror = (e) => {
      setIsListening(false);
      if (e.error !== 'no-speech') setError('Microphone error: ' + e.error);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setTranscript('');
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const sendMessage = async (text) => {
    if (!text.trim()) return;
    addMessage('user', text);
    setTranscript('');
    setIsThinking(true);

    // Build conversation history for context
    const history = messages.slice(-8).map(m => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`).join('\n');

    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `${buildSystemPrompt(mode, sources, notebook?.name)}

Conversation so far:
${history}

Student: ${text}

Respond as the tutor. Keep it conversational and concise (2-4 sentences). ${mode === 'quiz' ? 'After answering, ask a follow-up question.' : ''}`,
      });
      const aiText = typeof res === 'string' ? res : String(res);
      addMessage('assistant', aiText);
      await speakText(aiText);
    } catch (e) {
      setError('Failed to get response: ' + e.message);
    }
    setIsThinking(false);
  };

  const endSession = () => {
    window.speechSynthesis?.cancel();
    audioRef.current?.pause();
    recognitionRef.current?.stop();
    setMode(null);
    setMessages([]);
    setIsListening(false);
    setIsSpeaking(false);
    setTranscript('');
    setError('');
  };

  // Mode selection
  if (!mode) {
    return (
      <div className="max-w-lg mx-auto space-y-5">
        <div>
          <h2 className="text-white font-black text-xl mb-1 flex items-center gap-2">
            <Mic className="w-5 h-5 text-violet-400" /> Voice Tutor
          </h2>
          <p className="text-slate-400 text-sm">Real-time voice conversation with your AI tutor — speak naturally.</p>
        </div>
        <div className="space-y-3">
          {TUTOR_MODES.map(m => (
            <button key={m.id} onClick={() => startSession(m.id)}
              className="w-full flex items-center gap-4 p-4 bg-white/5 border border-white/10 hover:border-violet-500/40 hover:bg-white/8 rounded-2xl transition-all text-left group">
              <div className="w-12 h-12 rounded-2xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-500/30 transition-all">
                <m.icon className="w-6 h-6 text-violet-400" />
              </div>
              <div>
                <p className="text-white font-bold">{m.label}</p>
                <p className="text-slate-400 text-sm">{m.desc}</p>
              </div>
            </button>
          ))}
        </div>
        {!sourceText && (
          <p className="text-amber-400 text-xs text-center">Tip: Add sources to your notebook for topic-aware tutoring</p>
        )}
      </div>
    );
  }

  const activeMode = TUTOR_MODES.find(m => m.id === mode);

  return (
    <div className="max-w-xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <activeMode.icon className="w-5 h-5 text-violet-400" />
          <span className="text-white font-bold">{activeMode.label}</span>
          {isSpeaking && (
            <span className="flex gap-0.5">
              {[0,1,2].map(i => (
                <motion.span key={i} className="w-1 h-3 bg-violet-400 rounded-full"
                  animate={{ scaleY: [1,2,1] }} transition={{ duration: 0.5, delay: i * 0.1, repeat: Infinity }} />
              ))}
            </span>
          )}
        </div>
        <button onClick={endSession}
          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
        {messages.map((msg, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black ${
              msg.role === 'assistant' ? 'bg-violet-500/30 text-violet-300' : 'bg-blue-500/30 text-blue-300'
            }`}>
              {msg.role === 'assistant' ? 'AI' : 'You'}
            </div>
            <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'assistant'
                ? 'bg-white/8 border border-white/10 text-white'
                : 'bg-violet-500/20 border border-violet-500/30 text-violet-100'
            }`}>
              {msg.content}
            </div>
          </motion.div>
        ))}
        {isThinking && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-violet-500/30 flex items-center justify-center text-xs font-black text-violet-300">AI</div>
            <div className="px-4 py-3 rounded-2xl bg-white/8 border border-white/10 flex gap-1.5 items-center">
              {[0,1,2].map(i => (
                <motion.span key={i} className="w-2 h-2 bg-slate-400 rounded-full"
                  animate={{ y: [0,-6,0] }} transition={{ duration: 0.6, delay: i*0.1, repeat: Infinity }} />
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && <p className="text-red-400 text-xs mb-2 text-center">{error}</p>}

      {/* Transcript preview */}
      {transcript && (
        <div className="mb-2 px-3 py-2 bg-violet-500/10 border border-violet-500/20 rounded-xl text-violet-200 text-sm">
          {transcript}
        </div>
      )}

      {/* Mic button */}
      <div className="flex items-center justify-center gap-4">
        <motion.button
          onMouseDown={startListening}
          onMouseUp={stopListening}
          onTouchStart={startListening}
          onTouchEnd={stopListening}
          disabled={isThinking || isSpeaking}
          animate={isListening ? { scale: [1, 1.05, 1] } : {}}
          transition={{ repeat: Infinity, duration: 0.8 }}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg ${
            isListening
              ? 'bg-gradient-to-br from-red-500 to-rose-600 shadow-red-500/40 scale-110'
              : isThinking || isSpeaking
              ? 'bg-white/10 text-slate-600 cursor-not-allowed'
              : 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/40 hover:brightness-110'
          }`}>
          {isListening ? <MicOff className="w-8 h-8 text-white" /> : <Mic className="w-8 h-8 text-white" />}
        </motion.button>
      </div>
      <p className="text-center text-slate-500 text-xs mt-2">
        {isListening ? 'Listening… release to send' : isThinking ? 'Thinking...' : isSpeaking ? 'Speaking...' : 'Hold to speak'}
      </p>

      <audio ref={audioRef} />
    </div>
  );
}