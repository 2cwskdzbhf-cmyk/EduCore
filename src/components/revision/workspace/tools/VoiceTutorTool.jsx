import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { MessageSquare, Send, Loader2, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { SetupShell, ResultShell, LoadingScreen, ToolLabel, ToolSelect, TopicRow, G } from './ToolSetupShell';

function getCtx(allSources) {
  return allSources.filter(s => s.content_text).map(s => `### ${s.name}\n${s.content_text.slice(0, 5000)}`).join('\n\n---\n\n');
}

const PRACTICE_QS_PROMPT = (topic, difficulty) =>
  `Generate 5 practice questions on "${topic}" at ${difficulty} level. Each question should test understanding. Return as JSON array with {question, hint, model_answer} for each.`;

export default function VoiceTutorTool({ notebook, user, allSources, onResourceCreated }) {
  const [phase, setPhase] = useState('setup');
  const [customTopic, setCustomTopic] = useState('');
  const [voiceStyle, setVoiceStyle] = useState('friendly');
  const [speed, setSpeed] = useState('normal');
  const [difficulty, setDifficulty] = useState('gcse');
  const [tutorMode, setTutorMode] = useState('explain');

  // Chat state
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

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

  const styleMap = { friendly: 'friendly and encouraging', formal: 'formal and academic', energetic: 'upbeat and energetic' };
  const speedMap = { slow: 'Use short sentences, explain each concept thoroughly before moving on.', normal: 'Use a natural conversational pace.', fast: 'Be concise and efficient.' };
  const diffMap = { simple: 'simple/beginner', gcse: 'GCSE', alevel: 'A-Level' };

  const systemPrompt = () => {
    const ctx = hasSource && !customTopic.trim() ? getCtx(allSources) : '';
    return `You are a ${styleMap[voiceStyle]} voice tutor explaining "${topic}" at ${diffMap[difficulty]} level.
${speedMap[speed]}
When explaining: use analogies, clear examples, and check for understanding.
${ctx ? `SOURCE MATERIAL:\n${ctx.slice(0, 8000)}` : ''}`;
  };

  const startSession = async () => {
    setGeneratingSetup(true);
    if (tutorMode === 'practice') {
      const ctx = hasSource && !customTopic.trim() ? getCtx(allSources) : '';
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `${PRACTICE_QS_PROMPT(topic, diffMap[difficulty])}${ctx ? `\n\nSOURCES:\n${ctx.slice(0, 8000)}` : ''}`,
        response_json_schema: {
          type: 'object',
          properties: {
            questions: {
              type: 'array',
              items: {
                type: 'object',
                properties: { question: { type: 'string' }, hint: { type: 'string' }, model_answer: { type: 'string' } },
                required: ['question', 'hint', 'model_answer'], additionalProperties: false,
              }
            }
          },
          required: ['questions'], additionalProperties: false,
        }
      });
      setPracticeQs(result?.questions || []);
      setPracticeIdx(0);
      setPracticeAnswer('');
      setFeedback('');
      setShowHint(false);
    } else {
      // Start with a tutor introduction
      const intro = await base44.integrations.Core.InvokeLLM({
        prompt: `Introduce yourself as a voice tutor and give a brief, engaging overview of "${topic}" at ${diffMap[difficulty]} level. Be ${styleMap[voiceStyle]}. Keep it to 3-4 paragraphs.`,
        system_prompt: systemPrompt(),
      });
      const introMsg = { role: 'assistant', content: typeof intro === 'string' ? intro : JSON.stringify(intro) };
      setMessages([introMsg]);
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
      conversation_history: newMsgs.slice(-10, -1).map(m => ({ role: m.role, content: m.content })),
    });
    setMessages([...newMsgs, { role: 'assistant', content: typeof resp === 'string' ? resp : JSON.stringify(resp) }]);
    setChatLoading(false);
  };

  const submitAnswer = async () => {
    if (!practiceAnswer.trim() || feedbackLoading) return;
    const q = practiceQs[practiceIdx];
    setFeedbackLoading(true);
    const fb = await base44.integrations.Core.InvokeLLM({
      prompt: `Student answered: "${practiceAnswer}"\nModel answer: "${q.model_answer}"\nGive brief, encouraging feedback (2-3 sentences). Note what was correct and what to improve. Use ${styleMap[voiceStyle]} tone.`,
    });
    setFeedback(typeof fb === 'string' ? fb : JSON.stringify(fb));
    setFeedbackLoading(false);
  };

  const nextQuestion = () => {
    setPracticeIdx(i => i + 1);
    setPracticeAnswer('');
    setFeedback('');
    setShowHint(false);
  };

  if (generatingSetup) return <LoadingScreen label={tutorMode === 'practice' ? 'Generating Practice Questions…' : 'Starting Tutor Session…'} />;

  if (phase === 'result') {
    if (tutorMode === 'practice') {
      if (practiceIdx >= practiceQs.length) {
        return (
          <div className="flex flex-col items-center justify-center h-full gap-4 p-8" style={{ background: 'linear-gradient(135deg, #EDE8F5 0%, #c8d4f5 100%)' }}>
            <div className="text-5xl">🎉</div>
            <h2 className="font-black text-xl" style={{ color: G.primary }}>Practice Complete!</h2>
            <p style={{ color: G.secondary }}>You answered all {practiceQs.length} questions.</p>
            <button onClick={() => { setPhase('setup'); setPracticeQs([]); }}
              className="px-6 py-3 rounded-2xl text-white font-bold" style={{ background: 'linear-gradient(135deg, #7091E6, #3D52A0)' }}>
              ← Back to Setup
            </button>
          </div>
        );
      }

      const q = practiceQs[practiceIdx];
      return (
        <div className="flex flex-col h-full" style={{ background: 'linear-gradient(135deg, #EDE8F5 0%, #c8d4f5 100%)' }}>
          <div className="flex-shrink-0 px-5 py-3 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.3)' }}>
            <h2 className="font-bold text-sm" style={{ color: G.primary }}>Practice Questions — {topic}</h2>
            <span className="text-xs font-semibold" style={{ color: G.secondary }}>{practiceIdx + 1} / {practiceQs.length}</span>
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
              placeholder="Type your answer here…" rows={4}
              className="w-full resize-none rounded-2xl p-4 text-sm focus:outline-none"
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
                  <button onClick={() => setShowHint(v => !v)} className="px-4 py-2 rounded-xl text-sm font-semibold"
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
                <button onClick={nextQuestion} className="flex-1 py-2 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-1"
                  style={{ background: 'linear-gradient(135deg, #7091E6, #3D52A0)' }}>
                  Next Question <ChevronRight className="w-4 h-4" />
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
        <div className="flex-shrink-0 px-5 py-3 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.3)' }}>
          <div>
            <h2 className="font-bold text-sm" style={{ color: G.primary }}>Voice Tutor — {topic}</h2>
            <p className="text-xs" style={{ color: G.secondary }}>{voiceStyle} · {difficulty}</p>
          </div>
          <button onClick={() => { setPhase('setup'); setMessages([]); }} className="px-3 py-1.5 rounded-xl text-xs font-semibold"
            style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(112,145,230,0.3)', color: G.secondary }}>
            ← Back
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed`}
                style={m.role === 'user'
                  ? { background: 'linear-gradient(135deg, #7091E6, #3D52A0)', color: '#fff', borderBottomRightRadius: '4px' }
                  : { background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.4)', color: G.primary, borderBottomLeftRadius: '4px' }}>
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            </motion.div>
          ))}
          {chatLoading && (
            <div className="flex justify-start">
              <div className="px-4 py-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.4)' }}>
                <div className="flex gap-1">{[0,1,2].map(i => <motion.div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: G.accent }} animate={{ y: [0,-5,0] }} transition={{ duration: 0.5, delay: i*0.12, repeat: Infinity }} />)}</div>
              </div>
            </div>
          )}
        </div>
        <div className="flex-shrink-0 p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.3)' }}>
          <div className="flex gap-2 items-end rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.4)' }}>
            <textarea value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
              placeholder="Ask a question or request an explanation…" rows={1}
              className="flex-1 bg-transparent text-sm resize-none focus:outline-none"
              style={{ color: G.primary, maxHeight: '100px', overflowY: 'auto' }} />
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
    <SetupShell icon={MessageSquare} title="Voice Tutor" subtitle="Interactive AI tutor for any topic" onGenerate={startSession} generating={generatingSetup} generateLabel="🎓 Start Session">
      <TopicRow customTopic={customTopic} setCustomTopic={setCustomTopic} allSources={allSources} />
      <div>
        <ToolLabel>Session Mode</ToolLabel>
        <ToolSelect value={tutorMode} onChange={setTutorMode} options={[
          { value: 'explain', label: 'Explain & Chat — tutor explains & answers' },
          { value: 'practice', label: 'Practice Questions — tutor quizzes you' },
        ]} />
      </div>
      <div>
        <ToolLabel>Tutor Style</ToolLabel>
        <ToolSelect value={voiceStyle} onChange={setVoiceStyle} options={[
          { value: 'friendly', label: 'Friendly & Encouraging 😊' },
          { value: 'formal', label: 'Formal & Academic 📖' },
          { value: 'energetic', label: 'Energetic & Enthusiastic ⚡' },
        ]} />
      </div>
      <div>
        <ToolLabel>Explanation Speed</ToolLabel>
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