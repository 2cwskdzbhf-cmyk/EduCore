import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Users, Loader2, Zap, Clock, CheckCircle2 } from 'lucide-react';

export default function StudentLobbyRoom() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('sessionId');

  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [joined, setJoined] = useState(false);
  const [dots, setDots] = useState('');

  // Animated dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Load user
  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  // Join lobby on mount
  useEffect(() => {
    if (!user || !sessionId || joined) return;

    const joinLobby = async () => {
      const sessions = await base44.entities.QuizLobbySession.filter({ id: sessionId });
      if (!sessions[0] || sessions[0].status === 'ended') {
        navigate('/');
        return;
      }
      const sess = sessions[0];
      setSession(sess);

      // Add student to participants if not already there
      if (!sess.participant_emails?.includes(user.email)) {
        const updatedEmails = [...(sess.participant_emails || []), user.email];
        const updatedNames = [...(sess.participant_names || []), user.full_name || user.email.split('@')[0]];
        await base44.entities.QuizLobbySession.update(sessionId, {
          participant_emails: updatedEmails,
          participant_names: updatedNames
        });
      }
      setJoined(true);
    };

    joinLobby();
  }, [user, sessionId, joined, navigate]);

  // Poll for session status changes
  useEffect(() => {
    if (!sessionId) return;
    const interval = setInterval(async () => {
      const sessions = await base44.entities.QuizLobbySession.filter({ id: sessionId });
      const sess = sessions[0];
      if (!sess) return;
      setSession(sess);

      if (sess.status === 'active') {
        navigate(createPageUrl(`TeacherLiveQuizPlay?sessionId=${sess.live_session_id || sessionId}`));
      } else if (sess.status === 'ended') {
        navigate('/');
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [sessionId, navigate]);

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
      </div>
    );
  }

  const participantCount = session.participant_emails?.length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        {/* Header card */}
        <div className="relative backdrop-blur-xl bg-white/5 rounded-3xl border border-white/10 shadow-2xl overflow-hidden p-8 text-center">
          {/* Glowing background effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/10 pointer-events-none" />

          {/* Icon */}
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/40"
          >
            <Zap className="w-10 h-10 text-white" />
          </motion.div>

          <h1 className="text-2xl font-bold text-white mb-1">Waiting for Quiz to Start{dots}</h1>
          <p className="text-slate-400 text-sm mb-6">The teacher will start the quiz shortly</p>

          {/* Session info */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 text-left space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Class</p>
                <p className="text-white font-medium text-sm">{session.class_name || 'Your Class'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Teacher</p>
                <p className="text-white font-medium text-sm">{session.teacher_name || session.teacher_email?.split('@')[0]}</p>
              </div>
            </div>
            {session.quiz_title && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Quiz Topic</p>
                  <p className="text-white font-medium text-sm">{session.quiz_title}</p>
                </div>
              </div>
            )}
          </div>

          {/* Participant count */}
          <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-2xl p-4 mb-6">
            <p className="text-4xl font-bold text-white">{participantCount}</p>
            <p className="text-slate-400 text-sm mt-1">student{participantCount !== 1 ? 's' : ''} in the lobby</p>
          </div>

          {/* Participant names */}
          {session.participant_names?.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              <AnimatePresence>
                {session.participant_names.map((name, i) => (
                  <motion.span
                    key={name + i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-xs bg-white/10 text-slate-300 px-3 py-1 rounded-full"
                  >
                    {name}
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Loading bar */}
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-3">You're in! Waiting for your teacher...</p>
        </div>
      </motion.div>
    </div>
  );
}