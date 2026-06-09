import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  MessageSquare, Send, Loader2, ChevronRight,
  Volume2, VolumeX, Mic, MicOff, RotateCcw,
  Minus, Plus, FileText
} from 'lucide-react';
import { motion } from 'framer-motion';
import { SetupShell, LoadingScreen, ToolLabel, ToolSelect, TopicRow, G } from './ToolSetupShell';

function getCtx(allSources) {
  return allSources.filter(s => s.content_text)
    .map(s => `### ${s.name}\n${s.content_text.slice(0, 4000)}`).join('\n\n---\n\n');
}

const VOICE_MAP = {
  friendly: 'honey',
  formal: 'storm',
  energetic: 'sunny',
};

const PRACTICE_QS_PROMPT = (topic, difficulty) =>
  `Generate 5 practice questions on "${topic}" at ${difficulty} level. Return JSON array with {question, hint, model_answer}.`;

// Speak text using GenerateSpeech → Audio element
async function speakText(text, voice, rate = 1.0) {
  const truncated = text.slice(0, 4500);
  const result = await base44.integrations.Core.GenerateSpeech({ text: truncated, voice });
  return result?.url || null;
}

function AudioMessage({ text, voice, autoPlay = false, showTranscript = false }) {
  const audioRef = useRef(null);
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [showText, setShowText] = useState(showTranscript);

  useEffect(() => {
    if (autoPlay) loadAndPlay();
  }, []);

  const loadAndPlay = async () => {
    if (url) { audioRef.current?.play(); setPlaying(true); return; }
    setLoading(true);
    const u = await speakText(text, voice);
    setUrl(u);
    setLoading(false);
    if (u) {
      setTimeout(() => { audioRef.current?.play(); setPlaying(true); }, 100);
    }
  };

  const toggle = () => {
    const a = audioRef.current;
    if (!a) { loadAndPlay(); return; }
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  };

  return (
    <div className="rounded-2xl p-3 space-y-2"
      style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.4)' }}>
      {url && <audio ref={audioRef} src={url} onEnded={() => setPlaying(false)} />}

      <div className="flex items-center gap-2">
        <button onClick={toggle} disabled={loading}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #7091E6, #3D52A0)' }}>
          {loading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> :
           playing ? <VolumeX className="w-4 h-4 text-white" /> :
           <Volume2 className="w-4 h-4 text-white" />}
        </button>
        <div className="flex gap-0.5 flex-1 items-center h-6">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="rounded-full"
              style={{
                width: 3,
                height: playing ? `${10 + Math.sin(i * 1.2 + Date.now() * 0.005) * 8}px` : `${4 + Math.sin(i * 0.9) * 4}px`,
                background: playing ? 'linear-gradient(180deg,#7091E6,#3D52A0)' : 'rgba(112,145,230,0.3)',
                transition: 'height 0.1s',
              }} />
          ))}
        </div>
        <button onClick={() => setShowText(v => !v)}
          className="px-2 py-1 rounded-lg text-xs flex items-center gap-1 transition-all"
          style={{ background: showText ? 'rgba(112,145,230,0.15)' : 'transparent', color: G.secondary, border: '1px solid transparent' }}>
          <FileText className="w-3 h-3" />
          {showText ? 'Hide' : 'Show'}
        </button>
      </div>

      {showText && (
        <p className="text-sm leading-relaxed pl-2 border-l-2 whitespace-pre-wrap"
          style={{ color: G.primary, borderColor: 'rgba(112,145,230,0.4)' }}>{text}</p>
      )}
    </div>
  );
}

export default function VoiceTutorTool({ notebook, user, allSources, onResourceCreated }) {
  const [phase, setPhase] = useState('setup');
  const [customTopic, setCustomTopic] = useState('');
  const [voiceStyle, setVoiceStyle] = useState('friendly');
  const [speed, setSpeed] = useState('normal');
  const [difficulty, setDifficulty] = useState('gcse');
  const [tutorMode, setTutorMode] = useState('explain');

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [showTranscripts, setShowTranscripts] = useState(false);

  const [practiceQs, setPracticeQs] = useState([]);
  const [practiceIdx, setPracticeIdx] = useState(0);
  const [practiceAnswer, setPracticeAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [generatingSetup, setGeneratingSetup] = useState(false);

  // Mic (Web Speech API)
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const topic = customTopic.trim() || notebook.name;
  const hasSource = allSources.some(s => s.content_text);
  const voice = VOICE_MAP[voiceStyle] || 'honey';

  const styleMap = { friendly: 'friendly and encouraging', formal: 'formal and academic', energetic: 'upbeat and energetic' };
  const speedMap = { slow: 'Use short sentences. Explain each concept very thoroughly.', normal: 'Use a natural conversational pace.', fast: 'Be concise and efficient. Short answers.' };
  const diffMap = { simple: 'simple/beginner', gcse: 'GCSE', alevel: 'A-Level' };

  const systemPrompt = () => {
    const ctx = hasSource && !customTopic.trim() ? getCtx(allSources) : '';
    return `You are a ${styleMap[voiceStyle]} voice tutor explaining "${topic}" at ${diffMap[difficulty]} level. ${speedMap[speed]} Use analogies and clear examples. Keep responses under 150 words for natural speech. Do not use markdown headers or bullet points — speak naturally.${ctx ? `\n\nSOURCE MATERIAL:\n${ctx.slice(0, 6000)}` : ''}`;
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
        prompt: `You are starting a voice tutoring session on "${topic}" at ${diffMap[difficulty]} level. Greet the student and give a short, natural introduction of the topic. Keep it under 100 words. Speak naturally without any markdown.`,
        system_prompt: systemPrompt(),
      });
      const introText = typeof intro === 'string' ? intro : JSON.stringify(intro);
      setMessages([{ role: 'assistant', content: introText }]);
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
    const content = typeof resp === 'string' ? resp : JSON.stringify(resp);
    setMessages([...newMsgs, { role: 'assistant', content }]);
    setChatLoading(false);
  };

  const startMic = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { alert('Speech recognition not supported in this browser.'); return; }
    const rec = new SpeechRecognition();
    rec.lang = 'en-GB'; rec.interimResults = false;
    rec.onresult = (e) => { const transcript = e.results[0][0].transcript; setInput(transcript); setListening(false); };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };

  const repeatLast = () => {
    // Re-trigger the last assistant message audio (handled by AudioMessage re-mount via key)
    const last = [...messages].reverse().find(m => m.role === 'assistant');
    if (last) { setMessages(msgs => [...msgs.filter(m => m !== last), { ...last, _replay: Date.now() }]); }
  };

  const adjustSpeed = (dir) => {
    const order = ['slow', 'normal', 'fast'];
    const idx = order.indexOf(speed);
    const next = order[Math.max(0, Math.min(2, idx + dir))];
    setSpeed(next);
  };

  const submitAnswer = async () => {
    if (!practiceAnswer.trim() || feedbackLoading) return;
    const q = practiceQs[practiceIdx];
    setFeedbackLoading(true);
    const fb = await base44.integrations.Core.InvokeLLM({
      prompt: `Student answered: "${practiceAnswer}". Model answer: "${q.model_answer}". Give brief encouraging feedback in 2 sentences. Speak naturally, no markdown. Use ${styleMap[voiceStyle]} tone.`,
    });
    setFeedback(typeof fb === 'string' ? fb : JSON.stringify(fb));
    setFeedbackLoading(false);
  };

  if (generatingSetup) return <LoadingScreen label={tutorMode === 'practice' ? 'Generating Practice Questions…' : 'Starting Voice Session…'} />;

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
            {/* Question audio */}
            <AudioMessage key={`q-${practiceIdx}`} text={q.question} voice={voice} autoPlay />

            {showHint && (
              <AudioMessage key={`h-${practiceIdx}`} text={`Here's a hint: ${q.hint}`} voice={voice} autoPlay />
            )}

            <textarea value={practiceAnswer} onChange={e => setPracticeAnswer(e.target.value)}
              placeholder="Type or speak your answer…" rows={4}
              className="w-full resize-none rounded-2xl p-4 text-sm focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.4)', color: G.primary }} />

            {feedback && (
              <AudioMessage key={`fb-${practiceIdx}`} text={feedback} voice={voice} autoPlay showTranscript />
            )}

            <div className="flex gap-2">
              {!feedback ? (
                <>
                  <button onClick={() => setShowHint(v => !v)}
                    className="px-4 py-2 rounded-xl text-sm font-semibold"
                    style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(112,145,230,0.25)', color: G.secondary }}>
                    💡 {showHint ? 'Hide Hint' : 'Hint'}
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
                  Next <ChevronRight className="w-4 h-4" />
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
        {/* Header */}
        <div className="flex-shrink-0 px-4 py-3 flex items-center justify-between"
          style={{ background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.3)' }}>
          <div>
            <h2 className="font-bold text-sm" style={{ color: G.primary }}>🎧 Voice Tutor — {topic}</h2>
            <p className="text-xs" style={{ color: G.secondary }}>{voiceStyle} · {difficulty} · {speed}</p>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Speed controls */}
            <button onClick={() => adjustSpeed(-1)} title="Slower"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all hover:bg-white/30"
              style={{ color: G.secondary, border: '1px solid rgba(255,255,255,0.3)' }}>
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-xs font-semibold px-1" style={{ color: G.primary }}>{speed}</span>
            <button onClick={() => adjustSpeed(1)} title="Faster"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all hover:bg-white/30"
              style={{ color: G.secondary, border: '1px solid rgba(255,255,255,0.3)' }}>
              <Plus className="w-3 h-3" />
            </button>
            <button onClick={repeatLast} title="Repeat last"
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/30"
              style={{ color: G.secondary, border: '1px solid rgba(255,255,255,0.3)' }}>
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setShowTranscripts(v => !v)} title="Show/hide transcripts"
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/30"
              style={{ color: showTranscripts ? G.accent : G.secondary, border: '1px solid rgba(255,255,255,0.3)' }}>
              <FileText className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => { setPhase('setup'); setMessages([]); }}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold ml-1"
              style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(112,145,230,0.3)', color: G.secondary }}>
              ← Back
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <motion.div key={`${i}-${m._replay || ''}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'user' ? (
                <div className="max-w-[80%] px-4 py-3 rounded-2xl text-sm"
                  style={{ background: 'linear-gradient(135deg, #7091E6, #3D52A0)', color: '#fff', borderBottomRightRadius: 4 }}>
                  {m.content}
                </div>
              ) : (
                <div className="max-w-[85%]">
                  <AudioMessage
                    key={`${i}-${m._replay || ''}`}
                    text={m.content}
                    voice={voice}
                    autoPlay={i === messages.length - 1 && m.role === 'assistant'}
                    showTranscript={showTranscripts}
                  />
                </div>
              )}
            </motion.div>
          ))}
          {chatLoading && (
            <div className="flex justify-start">
              <div className="px-4 py-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.4)' }}>
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <motion.div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: G.accent }}
                      animate={{ y: [0, -5, 0] }} transition={{ duration: 0.5, delay: i * 0.12, repeat: Infinity }} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex-shrink-0 p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.3)' }}>
          <div className="flex gap-2 items-end rounded-2xl p-3"
            style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.4)' }}>
            {/* Mic button */}
            <button onClick={startMic} disabled={listening}
              className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${listening ? 'animate-pulse' : 'hover:scale-105'}`}
              style={{ background: listening ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'rgba(112,145,230,0.15)', border: '1px solid rgba(112,145,230,0.3)' }}>
              {listening ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4" style={{ color: G.accent }} />}
            </button>
            <textarea value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
              placeholder={listening ? 'Listening…' : 'Ask a question or say something…'} rows={1}
              className="flex-1 bg-transparent text-sm resize-none focus:outline-none"
              style={{ color: G.primary, maxHeight: 100, overflowY: 'auto' }} />
            <button onClick={() => sendMessage(input)} disabled={!input.trim() || chatLoading}
              className="w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-40 flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #7091E6, #3D52A0)' }}>
              {chatLoading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SetupShell icon={MessageSquare} title="Voice Tutor" subtitle="AI tutor that speaks out loud" onGenerate={startSession} generating={generatingSetup} generateLabel="🎧 Start Voice Session">
      <TopicRow customTopic={customTopic} setCustomTopic={setCustomTopic} allSources={allSources} />
      <div>
        <ToolLabel>Session Mode</ToolLabel>
        <ToolSelect value={tutorMode} onChange={setTutorMode} options={[
          { value: 'explain', label: 'Explain & Chat — tutor speaks & answers' },
          { value: 'practice', label: 'Practice Questions — tutor quizzes you' },
        ]} />
      </div>
      <div>
        <ToolLabel>Tutor Voice</ToolLabel>
        <ToolSelect value={voiceStyle} onChange={setVoiceStyle} options={[
          { value: 'friendly', label: 'Friendly & Warm (Honey) 😊' },
          { value: 'formal', label: 'Formal & Academic (Storm) 📖' },
          { value: 'energetic', label: 'Energetic & Bright (Sunny) ⚡' },
        ]} />
      </div>
      <div>
        <ToolLabel>Starting Speed</ToolLabel>
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