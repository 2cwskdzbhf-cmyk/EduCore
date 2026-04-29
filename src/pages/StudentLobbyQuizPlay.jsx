import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle, Zap, Trophy, Clock } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';

const QUESTION_TIME = 20;

export default function StudentLobbyQuizPlay() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('sessionId');

  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(null);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  // Poll session for question changes
  useEffect(() => {
    if (!sessionId) return;
    const poll = async () => {
      const sessions = await base44.entities.QuizLobbySession.filter({ id: sessionId });
      const sess = sessions[0];
      if (!sess) return;
      setSession(sess);

      if (sess.status === 'ended') {
        navigate('/');
        return;
      }

      const newIdx = sess.current_question_index ?? -1;
      if (newIdx !== currentIndex && newIdx >= 0) {
        setCurrentIndex(newIdx);
        setSelectedAnswer(null);
        setSubmitted(false);
        setIsCorrect(null);
        setTimeLeft(QUESTION_TIME);
      }
    };
    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [sessionId, currentIndex, navigate]);

  // Countdown timer — reset when question changes
  useEffect(() => {
    if (currentIndex < 0) return;
    setTimeLeft(QUESTION_TIME);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [currentIndex]);

  const questions = session?.questions || [];
  const q = questions[currentIndex];

  const submitAnswer = (answer) => {
    if (submitted) return;
    setSelectedAnswer(answer);
    setSubmitted(true);

    const correct = String(q?.correct_answer || '').trim().toLowerCase();
    const given = String(answer || '').trim().toLowerCase();
    const right = correct === given;
    setIsCorrect(right);
    if (right) {
      const points = Math.max(100, Math.round((timeLeft / QUESTION_TIME) * 500));
      setScore(s => s + points);
      setCorrectCount(c => c + 1);
    }
  };

  // Loading
  if (!session || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-purple-400" />
      </div>
    );
  }

  // Waiting for teacher to advance
  if (currentIndex < 0 || !q) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center p-4">
        <GlassCard className="p-10 text-center max-w-sm w-full">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center"
          >
            <Zap className="w-8 h-8 text-white" />
          </motion.div>
          <h2 className="text-xl font-bold text-white mb-2">Quiz Starting...</h2>
          <p className="text-slate-400 text-sm">Waiting for the teacher to begin</p>
          <div className="mt-4 text-2xl font-bold text-amber-400">Score: {score}</div>
        </GlassCard>
      </div>
    );
  }

  // Build choices: if MCQ use q.choices, otherwise show text input style answer options
  const choices = q.choices && q.choices.length > 0 ? q.choices : null;

  const choiceColors = [
    'from-red-500/20 to-red-600/20 border-red-500/40 hover:border-red-400/70',
    'from-blue-500/20 to-blue-600/20 border-blue-500/40 hover:border-blue-400/70',
    'from-yellow-500/20 to-yellow-600/20 border-yellow-500/40 hover:border-yellow-400/70',
    'from-green-500/20 to-green-600/20 border-green-500/40 hover:border-green-400/70',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-4 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4 max-w-2xl mx-auto w-full">
        <div className="text-white font-bold text-lg">Score: <span className="text-amber-400">{score}</span></div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xl ${timeLeft <= 5 ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white'}`}>
          <Clock className="w-4 h-4" />
          <span className="tabular-nums">{timeLeft}s</span>
        </div>
        <div className="text-slate-400 text-sm">Q{currentIndex + 1}/{questions.length}</div>
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full space-y-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="w-full"
          >
            <GlassCard className="p-8 text-center mb-6">
              <h2 className="text-2xl font-bold text-white">{q.prompt || q.question_text || q.question}</h2>
            </GlassCard>

            {/* Answer options or free-text */}
            {submitted ? (
              <GlassCard className={`p-6 text-center ${isCorrect ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-red-500/40 bg-red-500/10'}`}>
                {isCorrect ? (
                  <>
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                    <p className="text-xl font-bold text-emerald-400">Correct! +{Math.max(100, Math.round((timeLeft / QUESTION_TIME) * 500))} pts</p>
                  </>
                ) : (
                  <>
                    <XCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
                    <p className="text-xl font-bold text-red-400">Incorrect</p>
                    <p className="text-slate-300 mt-2">Answer: <span className="text-emerald-400 font-bold">{q.correct_answer}</span></p>
                    {selectedAnswer && <p className="text-slate-500 text-sm mt-1">Your answer: {selectedAnswer}</p>}
                  </>
                )}
                <p className="text-slate-400 text-sm mt-4">Waiting for next question...</p>
              </GlassCard>
            ) : choices ? (
              <div className="grid grid-cols-2 gap-3">
                {choices.map((choice, i) => (
                  <motion.button
                    key={i}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => submitAnswer(choice)}
                    className={`p-5 rounded-2xl border-2 bg-gradient-to-br ${choiceColors[i % 4]} text-white font-semibold text-lg text-left transition-all hover:scale-[1.02] active:scale-[0.98]`}
                  >
                    <span className="text-xs opacity-60 block mb-1">{['A', 'B', 'C', 'D'][i]}</span>
                    {choice}
                  </motion.button>
                ))}
              </div>
            ) : (
              // Numeric / short answer
              <GlassCard className="p-6">
                <p className="text-slate-400 text-sm mb-3 text-center">Type your answer</p>
                <input
                  type="text"
                  placeholder="Your answer..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.value.trim()) submitAnswer(e.target.value.trim());
                  }}
                  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white text-xl text-center focus:outline-none focus:border-purple-400"
                  autoFocus
                />
                <p className="text-xs text-slate-500 text-center mt-2">Press Enter to submit</p>
              </GlassCard>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}