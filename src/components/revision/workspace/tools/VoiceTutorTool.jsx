import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  MessageSquare, Send, Loader2, ChevronRight, Mic, MicOff,
  Volume2, RotateCcw, ChevronLeft, ChevronRight as ChevronR,
  Play, Pause, X, Gauge, Rewind
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SetupShell, LoadingScreen, ToolLabel, ToolSelect, TopicRow, G } from './ToolSetupShell';

function getCtx(allSources) {
  return allSources.filter(s => s.content_text)
    .map(s => `### ${s.name}\n${s.content_text.slice(0, 3000)}`).join('\n\n---\n\n');
}

const VOICE_MAP = {
  friendly:  'honey',
  formal:    'storm',
  energetic: 'spark',
};

// Tiny inline audio player for a single TTS utterance
function SpeechBubble({ content, audioUrl, isUser }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  };

  const changeSpeed = (s) => {
    setSpeed(s);
    if (audioRef.current) audioRef.current.playbackRate = s;
  };

  const repeat = () => {
    if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play(); setPlaying(true); }
  };

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] px-4 py-3 rounded-2xl text-sm" style={{ background: 'linear-gradient(135deg,#7091E6,#3D52A0)', color: '#fff', borderBottomRightRadius: '4px' }}>
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[90%]">
        <div className="px-4 py-3 rounded-2xl text-sm leading-relaxed mb-1.5"
          style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.4)', color: G.primary, borderBottomLeftRadius: '4px' }}>
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
        {audioUrl && (
          <div className="flex items-center gap-1.5 pl-2 flex-wrap">
            <audio ref={audioRef} src={audioUrl} onEnded={() => setPlaying(false)} />
            <button onClick={toggle}
              className="w-7 h-7 rounded-full flex items-center justify-center shadow-sm"
              style={{ background: 'linear-gradient(135deg,#7091E6,#3D52A0)' }}>
              {playing ? <Pause className="w-3 h-3 text-white" /> : <Play className="w-3 h-3 text-white ml-0.5" />}
            </button>
            <button onClick={repeat} title="Repeat"
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/40 transition-all"
              style={{ border: '1px solid rgba(112,145,230,0.3)', color: G.accent }}>
              <Rewind className="w-3 h-3" />
            </button>
            {[0.75, 1, 1.25, 1.5].map(s => (
              <button key={s} onClick={() => changeSpeed(s)}
                className="px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all"
                style={{ background: speed === s ? 'rgba(112,145,230,0.2)' : 'rgba(255,255,255,0.4)', border: `1px solid ${speed === s ? 'rgba(112,145,230,0.5)' : 'rgba(255,255,255,0.3)'}`, color: G.primary }}>
                {s}×
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const PRACTICE_QS_PROMPT = (topic, difficulty) =>
  `Generate 5 practice questions on "${topic}" at ${difficulty} level. Return as JSON with questions array, each item: {question, hint, model_answer}.`;

export default function VoiceTutorTool({ notebook, user, allSources, onResourceCreated }) {
  const [phase, setPhase] = useState('setup');
  const [customTopic, setCustomTopic] = useState('');
  const [voiceStyle, setVoiceStyle] = useState('friendly');
  const [speed, setSpeed] = useState('normal');
  const [difficulty, setDifficulty] = useState('gcse');
  const [tutorMode, setTutorMode] = useState('explain');

  // Chat state: each message = { role, content, audioUrl? }
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Practice mode
  const [practiceQs, setPracticeQs] = useState([]);
  const [practiceIdx, setPracticeIdx] = useState(0);
  const [practiceAnswer, setPracticeAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [generatingSetup, setGeneratingSetup] = useState(false);

  const topic = customTopic.trim() || notebook.name;
  const hasSource = allSources.some(s => s.content_text);
  const ttsVoice = VOICE_MAP[voiceStyle] || 'honey';
  const styleMap = { friendly: 'friendly and encouraging', formal: 'formal and academic', energetic: 'upbeat and energetic' };
  const speedMap = { slow: 'Use short sentences, explain thoroughly.', normal: 'Use natural conversational pace.', fast: 'Be concise and efficient.' };
  const diffMap = { simple: 'simple/beginner', gcse: 'GCSE', alevel: 'A-Level' };

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const systemPrompt = () => {
    const ctx = hasSource && !customTopic.trim() ? getCtx(allSources) : '';
    return `You are a ${styleMap[voiceStyle]} voice tutor explaining "${topic}" at ${diffMap[difficulty]} level. ${speedMap[speed]} Use analogies and clear examples. Keep responses to 3-5 sentences max for voice clarity.${ctx ? `\n\nSOURCE MATERIAL:\n${ctx.slice(0, 6000)}` : ''}`;
  };

  // Generate TTS for a text string
  const speak = async (text) => {
    const clean = text.replace(/[*#`]/g, '').slice(0, 4800);
    const res = await base44.integrations.Core.GenerateSpeech({ text: clean, voice: ttsVoice });
    return res?.url || null;
  };

  const startSession = async () => {
    setGeneratingSetup(true);
    if (tutorMode === 'practice') {
      const ctx = hasSource && !customTopic.trim() ? getCtx(allSources) : '';
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `${PRACTICE_QS_PROMPT(topic, diffMap[difficulty])}${ctx ? `\n\nSOURCES:\n${ctx.slice(0, 6000)}` : ''}`,
        response_json_schema: {
          type: 'object',
          properties: {
            questions: { type: 'array', items: { type: 'object', properties: { question: { type: 'string' }, hint: { type: 'string' }, model_answer: { type: 'string' } }, required: ['question', 'hint', 'model_answer'] } }
          },
          required: ['questions'],
        }
      });
      setPracticeQs(result?.questions || []);
      setPracticeIdx(0); setPracticeAnswer(''); setFeedback(''); setShowHint(false);
    } else {
      const intro = await base44.integrations.Core.InvokeLLM({
        prompt: `Introduce yourself as a voice tutor and give a brief overview of "${topic}" at ${diffMap[difficulty]} level. Be ${styleMap[voiceStyle]}. Keep it to 3-4 sentences — it will be spoken aloud.`,
        system_prompt: systemPrompt(),
      });
      const introText = typeof intro === 'string' ? intro : JSON.stringify(intro);
      const audioUrl = await speak(introText);
      setMessages([{ role: 'assistant', content: introText, audioUrl }]);
    }
    setGeneratingSetup(false);
    setPhase('result');
  };

  const sendMessage = async (text) => {
    if (!text.trim() || chatLoading) return;
    const userMsg = { role: 'user', content: text };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput('');
    setChatLoading(true);
    const resp = await base44.integrations.Core.InvokeLLM({
      prompt: text,
      system_prompt: systemPrompt(),
      conversation_history: newMsgs.slice(-8, -1).map(m => ({ role: m.role, content: m.content })),
    });
    const respText = typeof resp === 'string' ? resp : JSON.stringify(resp);
    const audioUrl = await speak(respText);
    setMessages([...newMsgs, { role: 'assistant', content: respText, audioUrl }]);
    setChatLoading(false);
  };

  // Browser speech recognition
  const toggleMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Speech recognition not supported in this browser.'); return; }
    if (micActive) {
      recognitionRef.current?.stop();
      setMicActive(false);
      return;
    }
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-GB';
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      setMicActive(false);
    };
    rec.onerror = () => setMicActive(false);
    rec.onend = () => setMicActive(false);
    rec.start();
    recognitionRef.current = rec;
    setMicActive(true);
  };

  const submitAnswer = async () => {
    if (!practiceAnswer.trim() || feedbackLoading) return;
    const q = practiceQs[practiceIdx];
    setFeedbackLoading(true);
    const fb = await base44.integrations.Core.InvokeLLM({
      prompt: `Student answered: "${practiceAnswer}"\nModel answer: "${q.model_answer}"\nGive brief, ${styleMap[voiceStyle]} feedback (2-3 sentences max for voice). Note what was correct and what to improve.`,
    });
    setFeedback(typeof fb === 'string' ? fb : JSON.stringify(fb));
    setFeedbackLoading(false);
  };

  if (generatingSetup) return <LoadingScreen label={tutorMode === 'practice' ? 'Generating Practice Questions…' : 'Starting Tutor Session…'} />;

  if (phase === 'result') {
    if (tutorMode === 'practice') {
      if (practiceIdx >= practiceQs.length) {
        return (
          <div className="flex flex-col items-center justify-center h-full gap-4 p-8"
            style={{ background: 'linear-gradient(135deg, #EDE8F5 0%, #c8d4f5 100%)' }}>
            <div className="text-5xl">🎉</div>
            <h2 className="font-black text-xl" style={{ color: G.primary }}>Practice Complete!</h2>
            <p style={{ color: G.secondary }}>You answered all {practiceQs.length} questions.</p>
            <button onClick={() => { setPhase('setup'); setPracticeQs([]); }}
              className="px-6 py-3 rounded-2xl text-white font-bold"
              style={{ background: 'linear-gradient(135deg, #7091E6, #3D52A0)' }}>← Back to Setup</button>
          </div>
        );
      }
      const q = practiceQs[practiceIdx];
      return (
        <div className="flex flex-col h-full" style={{ background: 'linear-gradient(135deg, #EDE8F5 0%, #c8d4f5 100%)' }}>
          <div className="flex-shrink-0 px-5 py-3 flex items-center justify-between"
            style={{ background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.3)' }}>
            <h2 className="font-bold text-sm" style={{ color: G.primary }}>Practice — {topic}</h2>
            <span className="text-xs font-semibold" style={{ color: G.secondary }}>{practiceIdx + 1}/{practiceQs.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.4)' }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: G.secondary }}>Question {practiceIdx + 1}</p>
              <p className="font-semibold text-base" style={{ color: G.primary }}>{q.question}</p>
            </div>
            {showHint && (
              <div className="rounded-xl p-3 text-sm" style={{ background: 'rgba(112,145,230,0.1)', border: '1px solid rgba(112,145,230,0.25)', color: G.accent }}>
                💡 Hint: {q.hint}
              </div>
            )}
            <textarea value={practiceAnswer} onChange={e => setPracticeAnswer(e.target.value)}
              placeholder="Type your answer…" rows={4} className="w-full resize-none rounded-2xl p-4 text-sm focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.4)', color: G.primary }} />
            {feedback && (
              <div className="rounded-2xl p-4 text-sm" style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(112,145,230,0.3)', color: G.primary }}>
                <p className="font-bold text-xs uppercase tracking-widest mb-1" style={{ color: G.accent }}>Tutor Feedback</p>
                {feedback}
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(112,145,230,0.2)' }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: G.secondary }}>Model Answer:</p>
                  <p style={{ color: G.primary }}>{q.model_answer}</p>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              {!feedback ? (
                <>
                  <button onClick={() => setShowHint(v => !v)}
                    className="px-4 py-2 rounded-xl text-sm font-semibold"
                    style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(112,145,230,0.25)', color: G.secondary }}>
                    💡 {showHint ? 'Hide Hint' : 'Show Hint'}
                  </button>
                  <button onClick={submitAnswer} disabled={!practiceAnswer.trim() || feedbackLoading}
                    className="flex-1 py-2 rounded-xl text-white font-bold text-sm disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, #7091E6, #3D52A0)' }}>
                    {feedbackLoading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Submit Answer'}
                  </button>
                </>
              ) : (
                <button onClick={() => { setPracticeIdx(i => i + 1); setPracticeAnswer(''); setFeedback(''); setShowHint(false); }}
                  className="flex-1 py-2 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-1"
                  style={{ background: 'linear-gradient(135deg, #7091E6, #3D52A0)' }}>
                  Next Question <ChevronR className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Explain / chat mode
    return (
      <div className="flex flex-col h-full" style={{ background: 'linear-gradient(135deg, #EDE8F5 0%, #c8d4f5 100%)' }}>
        <div className="flex-shrink-0 px-5 py-3 flex items-center justify-between"
          style={{ background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.3)' }}>
          <div>
            <h2 className="font-bold text-sm" style={{ color: G.primary }}>Voice Tutor — {topic}</h2>
            <p className="text-xs" style={{ color: G.secondary }}>{voiceStyle} · {difficulty} · {speed}</p>
          </div>
          <button onClick={() => { setPhase('setup'); setMessages([]); }}
            className="p-1.5 rounded-xl hover:bg-white/30 transition-all" style={{ color: G.secondary }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <SpeechBubble content={m.content} audioUrl={m.audioUrl} isUser={m.role === 'user'} />
            </motion.div>
          ))}
          {chatLoading && (
            <div className="flex justify-start">
              <div className="px-4 py-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.4)' }}>
                <div className="flex items-center gap-2">
                  <Volume2 className="w-3.5 h-3.5" style={{ color: G.accent }} />
                  <div className="flex gap-1">
                    {[0,1,2].map(i => (
                      <motion.div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: G.accent }}
                        animate={{ y: [0,-5,0] }} transition={{ duration: 0.5, delay: i * 0.12, repeat: Infinity }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex-shrink-0 p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.3)' }}>
          <div className="flex gap-2 items-end rounded-2xl p-3"
            style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.4)' }}>
            {/* Mic button */}
            <button onClick={toggleMic}
              className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${micActive ? 'animate-pulse' : ''}`}
              style={{ background: micActive ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'rgba(255,255,255,0.5)', border: '1px solid rgba(112,145,230,0.3)', color: micActive ? '#fff' : G.accent }}
              title={micActive ? 'Listening… click to stop' : 'Speak your question'}>
              {micActive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <textarea value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
              placeholder={micActive ? '🎤 Listening…' : 'Ask a question or say something…'} rows={1}
              className="flex-1 bg-transparent text-sm resize-none focus:outline-none"
              style={{ color: G.primary, maxHeight: '100px', overflowY: 'auto' }} />
            <button onClick={() => sendMessage(input)} disabled={!input.trim() || chatLoading}
              className="w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-40 flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #7091E6, #3D52A0)' }}>
              {chatLoading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
            </button>
          </div>
          <p className="text-center text-xs mt-1.5" style={{ color: G.secondary }}>
            Each response is spoken aloud · use 🎤 to reply verbally
          </p>
        </div>
      </div>
    );
  }

  return (
    <SetupShell icon={MessageSquare} title="Voice Tutor" subtitle="AI tutor that speaks explanations aloud"
      onGenerate={startSession} generating={generatingSetup} generateLabel="🎓 Start Session">
      <TopicRow customTopic={customTopic} setCustomTopic={setCustomTopic} allSources={allSources} />
      <div>
        <ToolLabel>Session Mode</ToolLabel>
        <ToolSelect value={tutorMode} onChange={setTutorMode} options={[
          { value: 'explain', label: 'Explain & Chat — tutor explains, you ask questions' },
          { value: 'practice', label: 'Practice Questions — tutor quizzes you' },
        ]} />
      </div>
      <div>
        <ToolLabel>Voice Style</ToolLabel>
        <ToolSelect value={voiceStyle} onChange={setVoiceStyle} options={[
          { value: 'friendly', label: 'Friendly & Encouraging 😊 (warm voice)' },
          { value: 'formal', label: 'Formal & Academic 📖 (authoritative voice)' },
          { value: 'energetic', label: 'Energetic & Enthusiastic ⚡ (quick voice)' },
        ]} />
      </div>
      <div>
        <ToolLabel>Response Speed</ToolLabel>
        <ToolSelect value={speed} onChange={setSpeed} options={[
          { value: 'slow', label: 'Slow — thorough explanations' },
          { value: 'normal', label: 'Normal — balanced pace' },
          { value: 'fast', label: 'Fast — concise responses' },
        ]} />
      </div>
      <div>
        <ToolLabel>Difficulty Level</ToolLabel>
        <ToolSelect value={difficulty} onChange={setDifficulty} options={[
          { value: 'simple', label: 'Simple / Beginner' },
          { value: 'gcse', label: 'GCSE' },
          { value: 'alevel', label: 'A-Level' },
        ]} />
      </div>
    </SetupShell>
  );
}