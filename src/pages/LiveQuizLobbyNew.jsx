import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Users, Zap, Play, X, Loader2, CheckCircle2, Copy, Check, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─────────────────────────────────────────────
// TEACHER VIEW
// ─────────────────────────────────────────────
function TeacherLobby({ session, sessionId }) {
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [copied, setCopied] = useState(false);

  const participants = session.participant_names || [];

  const handleCopy = () => {
    navigator.clipboard.writeText(session.join_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStart = async () => {
    setStarting(true);
    await base44.entities.QuizLobbySession.update(sessionId, {
      status: 'active',
      started_at: new Date().toISOString()
    });
    setStarting(false);
    navigate(`/live-quiz-play?sessionId=${sessionId}`);
  };

  const handleEnd = async () => {
    setEnding(true);
    await base44.entities.QuizLobbySession.update(sessionId, {
      status: 'ended',
      ended_at: new Date().toISOString()
    });
    navigate('/TeacherDashboard');
  };

  let questionCount = 0;
  try { questionCount = JSON.parse(session.questions_json || '[]').length; } catch {}

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
              <p className="text-slate-400 text-sm">
                {session.quiz_title || session.class_name} · {questionCount} question{questionCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Join code */}
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 text-center mb-6">
            <p className="text-slate-400 text-xs uppercase tracking-widest mb-2">Student Join Code</p>
            <div className="flex items-center justify-center gap-3">
              <p className="text-5xl font-mono font-bold tracking-widest text-amber-400">
                {session.join_code}
              </p>
              <button
                onClick={handleCopy}
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-slate-500 text-xs mt-2">Students enter this on their dashboard</p>
          </div>

          {/* Participant counter */}
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 text-center mb-6">
            <motion.p
              key={participants.length}
              initial={{ scale: 1.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-6xl font-bold text-white mb-2"
            >
              {participants.length}
            </motion.p>
            <p className="text-slate-400">student{participants.length !== 1 ? 's' : ''} joined</p>
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

          {/* Controls */}
          <div className="flex gap-3">
            <Button
              onClick={handleStart}
              disabled={starting || participants.length === 0}
              className="flex-1 py-5 text-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/30 disabled:opacity-50"
            >
              {starting ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <Play className="w-5 h-5 mr-2" />
              )}
              {participants.length === 0 ? 'Waiting for students...' : `Start Quiz (${participants.length} ready)`}
            </Button>
            <Button
              onClick={handleEnd}
              disabled={ending}
              variant="outline"
              className="px-5 border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              {ending ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// STUDENT VIEW
// ─────────────────────────────────────────────
function StudentLobby({ session, sessionId, user }) {
  const navigate = useNavigate();
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500);
    return () => clearInterval(interval);
  }, []);

  // Poll for status change
  useEffect(() => {
    const interval = setInterval(async () => {
      const results = await base44.entities.QuizLobbySession.filter({ id: sessionId });
      const s = results[0];
      if (!s) return;
      if (s.status === 'active') {
        navigate(`/live-quiz-play?sessionId=${sessionId}`);
      } else if (s.status === 'ended') {
        navigate('/');
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [sessionId, navigate]);

  const participantCount = session.participant_emails?.length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
        <div className="relative backdrop-blur-xl bg-white/5 rounded-3xl border border-white/10 shadow-2xl overflow-hidden p-8 text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/10 pointer-events-none" />

          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/40"
          >
            <Zap className="w-10 h-10 text-white" />
          </motion.div>

          <h1 className="text-2xl font-bold text-white mb-1">Waiting for Quiz to Start{dots}</h1>
          <p className="text-slate-400 text-sm mb-6">Your teacher will start the quiz shortly</p>

          {/* Session info */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 text-left space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Quiz</p>
                <p className="text-white font-medium text-sm">{session.quiz_title || session.class_name || 'Live Quiz'}</p>
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
          </div>

          {/* Participant count */}
          <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-2xl p-4 mb-6">
            <p className="text-4xl font-bold text-white">{participantCount}</p>
            <p className="text-slate-400 text-sm mt-1">student{participantCount !== 1 ? 's' : ''} in lobby</p>
          </div>

          {/* Names */}
          {session.participant_names?.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              {session.participant_names.map((name, i) => (
                <span key={name + i} className="text-xs bg-white/10 text-slate-300 px-3 py-1 rounded-full">{name}</span>
              ))}
            </div>
          )}

          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ repeat: Infinity, duration: 1.8 }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-3">You're in! Waiting for your teacher...</p>
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ROOT — detects teacher vs student
// ─────────────────────────────────────────────
export default function LiveQuizLobbyNew() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('sessionId');

  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [joined, setJoined] = useState(false);

  useEffect(() => { base44.auth.me().then(setUser); }, []);

  // Fetch & poll session
  const fetchSession = useCallback(async () => {
    if (!sessionId) return;
    const results = await base44.entities.QuizLobbySession.filter({ id: sessionId });
    if (results[0]) setSession(results[0]);
  }, [sessionId]);

  useEffect(() => {
    fetchSession();
    const interval = setInterval(fetchSession, 2000);
    return () => clearInterval(interval);
  }, [fetchSession]);

  // Student: auto-join lobby
  useEffect(() => {
    if (!user || !session || joined) return;
    const isTeacher = session.teacher_email === user.email;
    if (isTeacher) { setJoined(true); return; }

    const joinLobby = async () => {
      if (session.status === 'ended') { navigate('/'); return; }
      if (!session.participant_emails?.includes(user.email)) {
        await base44.entities.QuizLobbySession.update(sessionId, {
          participant_emails: [...(session.participant_emails || []), user.email],
          participant_names: [...(session.participant_names || []), user.full_name || user.email.split('@')[0]]
        });
      }
      setJoined(true);
    };
    joinLobby();
  }, [user, session, joined, sessionId, navigate]);

  if (!session || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
      </div>
    );
  }

  const isTeacher = session.teacher_email === user.email;

  if (isTeacher) {
    return <TeacherLobby session={session} sessionId={sessionId} />;
  }
  return <StudentLobby session={session} sessionId={sessionId} user={user} />;
}