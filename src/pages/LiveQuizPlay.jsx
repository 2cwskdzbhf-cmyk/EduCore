import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Zap, CheckCircle2, XCircle, Clock, Trophy, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LiveQuizPlay() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('sessionId');

  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);

  useEffect(() => { base44.auth.me().then(setUser); }, []);

  useEffect(() => {
    if (!sessionId) return;
    base44.entities.QuizLobbySession.filter({ id: sessionId }).then(results => {
      const s = results[0];
      if (!s) { navigate('/'); return; }
      setSession(s);
      try {
        const qs = JSON.parse(s.questions_json || '[]');
        setQuestions(qs);
      } catch {
        navigate('/');
      }
    });
  }, [sessionId, navigate]);

  // Timer per question
  useEffect(() => {
    if (answered || finished || questions.length === 0) return;
    setTimeLeft(20);
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(interval);
          setAnswered(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [currentIndex, answered, finished, questions.length]);

  const handleAnswer = (idx) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    const q = questions[currentIndex];
    if (idx === q.correct_index) {
      setScore(s => s + Math.max(100, timeLeft * 50));
      setCorrect(c => c + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex >= questions.length - 1) {
      setFinished(true);
    } else {
      setCurrentIndex(i => i + 1);
      setSelected(null);
      setAnswered(false);
    }
  };

  if (!session || !user || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (finished) {
    const pct = Math.round((correct / questions.length) * 100);
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center">
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-10 shadow-2xl">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
              <Trophy className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Quiz Complete!</h1>
            <p className="text-slate-400 mb-8">{session.quiz_title || 'Live Quiz'}</p>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-white/5 rounded-2xl p-4">
                <p className="text-3xl font-bold text-white">{pct}%</p>
                <p className="text-slate-400 text-sm mt-1">Accuracy</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-4">
                <p className="text-3xl font-bold text-amber-400">{score}</p>
                <p className="text-slate-400 text-sm mt-1">Score</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 col-span-2">
                <p className="text-2xl font-bold text-emerald-400">{correct}/{questions.length}</p>
                <p className="text-slate-400 text-sm mt-1">Correct Answers</p>
              </div>
            </div>
            <Button onClick={() => navigate('/')} className="w-full bg-gradient-to-r from-purple-500 to-blue-500">
              Back to Dashboard
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  const q = questions[currentIndex];
  const isMultipleChoice = q.question_type === 'multiple_choice' || (q.options && q.options.length > 0);
  const optionColors = ['from-blue-500 to-blue-600', 'from-purple-500 to-purple-600', 'from-amber-500 to-amber-600', 'from-rose-500 to-rose-600'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-4 flex flex-col">
      {/* Progress bar */}
      <div className="max-w-2xl mx-auto w-full mb-6">
        <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
          <span>Question {currentIndex + 1} / {questions.length}</span>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span className={timeLeft <= 5 ? 'text-red-400 font-bold' : ''}>{timeLeft}s</span>
          </div>
        </div>
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
            animate={{ width: `${((currentIndex) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
          >
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 mb-6">
              {q.image_url && (
                <img src={q.image_url} alt="Question" className="w-full max-h-48 object-contain rounded-xl mb-4" />
              )}
              <p className="text-xl font-semibold text-white leading-relaxed">{q.prompt}</p>
            </div>

            {isMultipleChoice ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(q.options || []).filter(o => o).map((option, idx) => {
                  const isCorrect = idx === q.correct_index;
                  const isSelected = idx === selected;
                  let btnClass = `relative p-5 rounded-2xl text-left font-medium transition-all border `;
                  if (!answered) {
                    btnClass += `bg-white/5 border-white/10 text-white hover:bg-white/10 cursor-pointer`;
                  } else if (isCorrect) {
                    btnClass += `bg-emerald-500/20 border-emerald-500/50 text-emerald-300`;
                  } else if (isSelected && !isCorrect) {
                    btnClass += `bg-red-500/20 border-red-500/50 text-red-300`;
                  } else {
                    btnClass += `bg-white/3 border-white/5 text-slate-500`;
                  }
                  return (
                    <button key={idx} onClick={() => handleAnswer(idx)} disabled={answered} className={btnClass}>
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-lg bg-gradient-to-br ${optionColors[idx % 4]} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span>{option}</span>
                        {answered && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400 ml-auto" />}
                        {answered && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-400 ml-auto" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              // Written question — just show answer after time up
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                {!answered ? (
                  <p className="text-slate-300">Write your answer — time remaining: <span className="text-white font-bold">{timeLeft}s</span></p>
                ) : (
                  <div>
                    <p className="text-slate-400 text-sm mb-2">Correct keywords:</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {(q.answer_keywords || [q.correct_answer]).filter(Boolean).map((kw, i) => (
                        <span key={i} className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-sm">{kw}</span>
                      ))}
                    </div>
                  </div>
                )}
                {!answered && (
                  <Button onClick={() => setAnswered(true)} className="mt-4 bg-purple-500 hover:bg-purple-600">
                    Submit
                  </Button>
                )}
              </div>
            )}

            {answered && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
                {q.explanation && (
                  <div className="backdrop-blur-xl bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 mb-4">
                    <p className="text-blue-300 text-sm"><span className="font-semibold">Explanation: </span>{q.explanation}</p>
                  </div>
                )}
                <Button
                  onClick={handleNext}
                  className="w-full py-4 text-base bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                >
                  {currentIndex >= questions.length - 1 ? 'See Results' : 'Next Question'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}