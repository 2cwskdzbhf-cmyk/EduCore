import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/ui/GlassCard';
import { ChevronRight, ChevronLeft, Trophy, Loader2, Clock, X, Users, Zap } from 'lucide-react';

const QUESTION_TIME = 20;

export default function TeacherLobbyQuizPlay() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('sessionId');

  const [session, setSession] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [ended, setEnded] = useState(false);
  const timerRef = useRef(null);

  // Poll session for participant updates
  useEffect(() => {
    if (!sessionId) return;
    const fetch = async () => {
      const sessions = await base44.entities.QuizLobbySession.filter({ id: sessionId });
      if (sessions[0]) setSession(sessions[0]);
    };
    fetch();
    const interval = setInterval(fetch, 3000);
    return () => clearInterval(interval);
  }, [sessionId]);

  // Sync currentIndex to session
  useEffect(() => {
    if (!session) return;
    if (session.current_question_index !== undefined && session.current_question_index >= 0) {
      setCurrentIndex(session.current_question_index);
    }
  }, [session]);

  // Countdown timer — reset on question change
  useEffect(() => {
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
  const participants = session?.participant_names || [];

  const goToQuestion = async (idx) => {
    if (idx < 0 || idx >= questions.length) return;
    setCurrentIndex(idx);
    await base44.entities.QuizLobbySession.update(sessionId, {
      current_question_index: idx
    });
  };

  const endQuiz = async () => {
    await base44.entities.QuizLobbySession.update(sessionId, {
      status: 'ended',
      ended_at: new Date().toISOString()
    });
    setEnded(true);
    setTimeout(() => navigate('/TeacherDashboard'), 1500);
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-purple-400" />
      </div>
    );
  }

  if (ended) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
        <GlassCard className="p-10 text-center max-w-sm w-full">
          <Trophy className="w-14 h-14 text-amber-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Quiz Ended!</h2>
          <p className="text-slate-400">Redirecting to dashboard...</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm">Question {currentIndex + 1} of {questions.length}</p>
            <p className="text-white font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              {participants.length} players
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-2xl ${timeLeft <= 5 ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white'}`}>
              <Clock className="w-5 h-5" />
              <span className="tabular-nums">{timeLeft}s</span>
            </div>
            <Button onClick={endQuiz} variant="outline" size="sm" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
              <X className="w-4 h-4 mr-1" /> End Quiz
            </Button>
          </div>
        </div>

        {/* Question card */}
        <GlassCard className="p-8 text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
            >
              <p className="text-slate-400 text-sm mb-3">Q{currentIndex + 1}</p>
              <h2 className="text-3xl font-bold text-white mb-6">{q?.prompt || q?.question_text || q?.question || 'No question text'}</h2>
              {q?.correct_answer && (
                <div className="inline-block bg-emerald-500/20 border border-emerald-500/30 rounded-xl px-6 py-3">
                  <p className="text-xs text-emerald-300 mb-1">Correct Answer</p>
                  <p className="text-xl font-bold text-emerald-400">{q.correct_answer}</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </GlassCard>

        {/* Navigation */}
        <div className="flex gap-3">
          <Button
            onClick={() => goToQuestion(currentIndex - 1)}
            disabled={currentIndex === 0}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10 disabled:opacity-30"
          >
            <ChevronLeft className="w-5 h-5 mr-1" /> Previous
          </Button>
          {currentIndex < questions.length - 1 ? (
            <Button
              onClick={() => goToQuestion(currentIndex + 1)}
              className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 py-4 text-lg"
            >
              Next Question <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={endQuiz}
              className="flex-1 py-4 text-lg bg-gradient-to-r from-amber-500 to-orange-500"
            >
              <Trophy className="w-5 h-5 mr-2" /> End Quiz & Show Results
            </Button>
          )}
        </div>

        {/* Question dots */}
        <div className="flex gap-2 justify-center flex-wrap pt-2">
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => goToQuestion(i)}
              className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${
                i === currentIndex
                  ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white scale-110 shadow-lg shadow-purple-500/40'
                  : i < currentIndex
                  ? 'bg-emerald-500/30 text-emerald-400'
                  : 'bg-white/10 text-slate-400'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {/* Participants panel */}
        {participants.length > 0 && (
          <GlassCard className="p-4">
            <p className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" /> Participants
            </p>
            <div className="flex flex-wrap gap-2">
              {participants.map((name, i) => (
                <span key={i} className="text-xs bg-white/10 text-slate-300 px-3 py-1 rounded-full">{name}</span>
              ))}
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}