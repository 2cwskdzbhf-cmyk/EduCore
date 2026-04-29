import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Users, Zap, Play, X, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TeacherLobbyPanel() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('sessionId');

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ending, setEnding] = useState(false);

  // Poll session for live participant updates
  useEffect(() => {
    if (!sessionId) return;
    const fetchSession = async () => {
      const sessions = await base44.entities.QuizLobbySession.filter({ id: sessionId });
      if (sessions[0]) setSession(sessions[0]);
    };
    fetchSession();
    const interval = setInterval(fetchSession, 2000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const startQuiz = async () => {
    setLoading(true);
    await base44.entities.QuizLobbySession.update(sessionId, {
      status: 'active',
      started_at: new Date().toISOString()
    });
    setLoading(false);
    // Teacher can navigate to a live quiz view
    navigate(createPageUrl(`StartLiveQuiz`));
  };

  const endSession = async () => {
    setEnding(true);
    await base44.entities.QuizLobbySession.update(sessionId, {
      status: 'ended',
      ended_at: new Date().toISOString()
    });
    setEnding(false);
    navigate(createPageUrl('TeacherDashboard'));
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
      </div>
    );
  }

  const participants = session.participant_names || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/40">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Quiz Lobby</h1>
              <p className="text-slate-400 text-sm">{session.class_name} · Waiting for students</p>
            </div>
          </div>

          {/* Participant counter */}
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 text-center mb-6 shadow-2xl">
            <motion.p
              key={participants.length}
              initial={{ scale: 1.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-6xl font-bold text-white mb-2"
            >
              {participants.length}
            </motion.p>
            <p className="text-slate-400">student{participants.length !== 1 ? 's' : ''} joined</p>

            {/* Live indicator */}
            <div className="flex items-center justify-center gap-2 mt-4">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-xs text-emerald-400 font-medium">LOBBY OPEN</span>
            </div>
          </div>

          {/* Students grid */}
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              Joined Students
            </h3>
            {participants.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">Waiting for students to join...</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <AnimatePresence>
                  {participants.map((name, i) => (
                    <motion.div
                      key={name + i}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span className="text-white text-sm truncate">{name}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Join code + quiz info */}
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 space-y-3">
            {session.join_code && (
              <div>
                <p className="text-slate-400 text-xs mb-1">Student Join Code</p>
                <p className="text-3xl font-bold tracking-widest text-amber-400">{session.join_code}</p>
                <p className="text-slate-500 text-xs mt-1">Students can enter this code on their dashboard</p>
              </div>
            )}
            {session.quiz_title && (
              <div>
                <p className="text-slate-400 text-xs">Quiz Topic</p>
                <p className="text-white font-semibold">{session.quiz_title}</p>
              </div>
            )}
            {session.questions_json && (() => {
              try {
                const qs = JSON.parse(session.questions_json);
                return (
                  <div>
                    <p className="text-slate-400 text-xs">Questions</p>
                    <p className="text-white font-semibold">{qs.length} question{qs.length !== 1 ? 's' : ''} loaded</p>
                  </div>
                );
              } catch { return null; }
            })()}
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            <Button
              onClick={startQuiz}
              disabled={loading || participants.length === 0}
              className="flex-1 py-5 text-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/30 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <Play className="w-5 h-5 mr-2" />
              )}
              {participants.length === 0 ? 'Waiting for students...' : 'Start Quiz Now'}
            </Button>
            <Button
              onClick={endSession}
              disabled={ending}
              variant="outline"
              className="px-5 border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              {ending ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
            </Button>
          </div>

          <p className="text-center text-slate-500 text-xs mt-4">
            Share your class name so students know to check their dashboard
          </p>
        </motion.div>
      </div>
    </div>
  );
}