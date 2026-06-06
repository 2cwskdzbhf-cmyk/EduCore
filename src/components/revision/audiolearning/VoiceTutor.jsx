import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Mic, MicOff, Volume2, VolumeX, Loader2, MessageSquare, Brain, Zap, RotateCcw, BookOpen } from 'lucide-react';

// Use browser Web Speech API for recognition + Base44 GenerateSpeech for AI response TTS
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export default function VoiceTutor({ notebooks, sources }) {
  const [selectedNotebook, setSelectedNotebook] = useState(null);
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [muted, setMuted] = useState(false);
  const [mode, setMode] = useState('explain'); // explain | quiz | test
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);
  const messagesEndRef = useRef(null);

  const notebookSources = selectedNotebook
    ? sources.filter(s => s.notebook_id === selectedNotebook.id && s.content_text)
    : [];
  const sourceContext = notebookSources.map(s => `[${s.name}]: ${s.content_text?.slice(0, 600)}`).join('\n').slice(0, 2500);

  const hasSpeechRecognition = !!SpeechRecognition;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const systemPrompt = `You are a friendly, engaging AI voice tutor helping a student study "${selectedNotebook?.name || 'their notes'}".

${sourceContext ? `Here are the student's study materials:\n${sourceContext}` : 'No sources uploaded yet.'}

Mode: ${mode === 'explain' ? 'Explain concepts clearly when asked' : mode === 'quiz' ? 'Quiz the student with questions, mark their answers, give feedback' : 'Test the student verbally, ask questions, mark responses'}

Rules:
- Keep responses SHORT (2-4 sentences max) since this is voice conversation
- Be encouraging and supportive
- Ask follow-up questions to check understanding
- If in quiz/test mode, ask one question at a time and wait for the answer
- Reference the actual study material when possible`;

  const getAIResponse = async (userMessage) => {
    setIsThinking(true);
    const history = messages.map(m => ({ role: m.role, content: m.content }));
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `${systemPrompt}

Conversation history:
${history.map(h => `${h.role === 'user' ? 'Student' : 'Tutor'}: ${h.content}`).join('\n')}

Student just said: "${userMessage}"

Respond as the Voice Tutor (2-4 sentences, conversational tone):`,
      });

      const aiText = typeof res === 'string' ? res : res;
      setMessages(prev => [...prev, { role: 'assistant', content: aiText }]);

      if (!muted) await speakText(aiText);
    } catch (e) {
      const fallback = "I didn't catch that. Could you try again?";
      setMessages(prev => [...prev, { role: 'assistant', content: fallback }]);
      if (!muted) await speakText(fallback);
    }
    setIsThinking(false);
  };

  const speakText = async (text) => {
    setIsSpeaking(true);
    try {
      const result = await base44.integrations.Core.GenerateSpeech({
        text: text.slice(0, 500),
        voice: 'sunny',
      });
      if (audioRef.current) {
        audioRef.current.src = result.url;
        await audioRef.current.play();
        await new Promise(resolve => { audioRef.current.onended = resolve; });
      }
    } catch {
      // Fallback to browser TTS
      if ('speechSynthesis' in window) {
        const utt = new SpeechSynthesisUtterance(text);
        utt.rate = 1.1;
        window.speechSynthesis.speak(utt);
        await new Promise(resolve => { utt.onend = resolve; });
      }
    }
    setIsSpeaking(false);
  };

  const startListening = () => {
    if (!hasSpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-GB';

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e) => {
      const t = Array.from(e.results).map(r => r[0].transcript).join('');
      setTranscript(t);
    };
    recognition.onend = async () => {
      setIsListening(false);
      const finalTranscript = transcript;
      setTranscript('');
      if (finalTranscript.trim()) {
        setMessages(prev => [...prev, { role: 'user', content: finalTranscript }]);
        await getAIResponse(finalTranscript);
      }
    };
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const startSession = async () => {
    setStarted(true);
    setMessages([]);
    const greeting = mode === 'explain'
      ? `Hi! I'm your AI Tutor for ${selectedNotebook?.name || 'your notes'}. Ask me anything — I'll explain it clearly. What would you like to understand?`
      : mode === 'quiz'
      ? `Let's quiz you on ${selectedNotebook?.name || 'your notes'}! I'll ask you questions and give you feedback. Ready? Here's your first question...`
      : `Time to test your knowledge of ${selectedNotebook?.name || 'your notes'}! I'll ask you questions one by one. Let's begin!`;

    setMessages([{ role: 'assistant', content: greeting }]);
    if (!muted) await speakText(greeting);

    if (mode !== 'explain') await getAIResponse('__start_quiz__');
  };

  if (!started) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h2 className="text-white font-black text-xl mb-1">Voice Tutor Mode</h2>
          <p className="text-slate-400 text-sm">Real-time voice conversation with your AI tutor.</p>
        </div>

        {!hasSpeechRecognition && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-amber-300 text-sm">
            ⚠️ Your browser doesn't support voice recognition. Use Chrome or Edge for the full experience.
          </div>
        )}

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
          {/* Mode select */}
          <div>
            <p className="text-white font-bold text-sm mb-2">Tutor mode</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'explain', label: 'Explain', icon: BookOpen, desc: 'Ask questions' },
                { id: 'quiz', label: 'Quiz Me', icon: Zap, desc: 'Test with Q&A' },
                { id: 'test', label: 'Verbal Test', icon: Brain, desc: 'Oral exam' },
              ].map(m => (
                <button key={m.id} onClick={() => setMode(m.id)}
                  className={`flex flex-col items-center p-3 rounded-xl border text-xs font-bold transition-all ${
                    mode === m.id ? 'bg-violet-500/20 border-violet-500/40 text-violet-200' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                  }`}>
                  <m.icon className="w-4 h-4 mb-1" />
                  <span>{m.label}</span>
                  <span className="text-slate-600 font-normal">{m.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notebook select */}
          <div>
            <p className="text-white font-bold text-sm mb-2">Notebook</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {notebooks.map(nb => (
                <button key={nb.id} onClick={() => setSelectedNotebook(nb)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all ${
                    selectedNotebook?.id === nb.id ? 'bg-violet-500/20 border-violet-500/40 text-white' : 'bg-white/5 border-white/10 text-slate-300 hover:border-white/20'
                  }`}>
                  <span className="text-lg">{nb.icon || '📚'}</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{nb.name}</p>
                    <p className="text-xs text-slate-500">{sources.filter(s => s.notebook_id === nb.id && s.content_text).length} sources loaded</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button onClick={startSession} disabled={!selectedNotebook}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:brightness-110 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-violet-500/25">
            <Mic className="w-4 h-4" /> Start Voice Session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 200px)', minHeight: 500 }}>
      <audio ref={audioRef} />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${isSpeaking ? 'bg-violet-400 animate-pulse' : isThinking ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
          <span className="text-white font-bold text-sm">
            {isSpeaking ? 'Speaking...' : isThinking ? 'Thinking...' : 'Listening'}
          </span>
          <span className="text-slate-600 text-xs">· {selectedNotebook?.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMuted(m => !m)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
            {muted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-slate-300" />}
          </button>
          <button onClick={() => { setStarted(false); setMessages([]); stopListening(); }}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
            <RotateCcw className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-sm ${
                msg.role === 'user' ? 'bg-violet-500/30 text-violet-300' : 'bg-blue-500/30 text-blue-300'
              }`}>
                {msg.role === 'user' ? '👤' : '🤖'}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-violet-500/20 border border-violet-500/20 text-violet-100'
                  : 'bg-white/5 border border-white/10 text-slate-200'
              }`}>
                {msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isThinking && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-500/30 flex items-center justify-center text-sm">🤖</div>
            <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div key={i} className="w-2 h-2 rounded-full bg-slate-500"
                    animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, delay: i * 0.15, duration: 0.6 }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Transcript preview */}
      {isListening && transcript && (
        <div className="mb-2 px-4 py-2 bg-violet-500/10 border border-violet-500/20 rounded-xl text-violet-300 text-sm italic">
          "{transcript}"
        </div>
      )}

      {/* Mic button */}
      <div className="flex flex-col items-center gap-2">
        <button
          onMouseDown={hasSpeechRecognition ? startListening : undefined}
          onMouseUp={hasSpeechRecognition ? stopListening : undefined}
          onTouchStart={hasSpeechRecognition ? startListening : undefined}
          onTouchEnd={hasSpeechRecognition ? stopListening : undefined}
          disabled={isThinking || isSpeaking}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl ${
            isListening
              ? 'bg-red-500 shadow-red-500/40 scale-110'
              : isThinking || isSpeaking
              ? 'bg-white/10 cursor-not-allowed opacity-50'
              : 'bg-gradient-to-br from-violet-500 to-purple-600 hover:brightness-110 shadow-violet-500/40 cursor-pointer'
          }`}>
          {isThinking ? <Loader2 className="w-8 h-8 text-white animate-spin" /> :
           isListening ? <MicOff className="w-8 h-8 text-white" /> :
           <Mic className="w-8 h-8 text-white" />}
        </button>
        <p className="text-slate-500 text-xs text-center">
          {isListening ? 'Release to send' : isThinking ? 'Thinking...' : isSpeaking ? 'AI speaking...' : 'Hold to speak'}
        </p>
        {!hasSpeechRecognition && (
          <p className="text-amber-400 text-xs">Voice input requires Chrome/Edge</p>
        )}
      </div>
    </div>
  );
}