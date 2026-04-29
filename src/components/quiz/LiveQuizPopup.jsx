import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Zap, X, Users, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LiveQuizPopup({ session, user, onDismiss }) {
  const navigate = useNavigate();
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    setJoining(true);
    // Add student to participants
    const current = await base44.entities.QuizLobbySession.filter({ id: session.id });
    const sess = current[0];
    if (sess && sess.status !== 'ended') {
      const emails = sess.participant_emails || [];
      const names = sess.participant_names || [];
      if (!emails.includes(user.email)) {
        await base44.entities.QuizLobbySession.update(session.id, {
          participant_emails: [...emails, user.email],
          participant_names: [...names, user.full_name || user.email.split('@')[0]]
        });
      }
      navigate(`/student-lobby?sessionId=${session.id}`);
    }
    setJoining(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
        onClick={onDismiss}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 30 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="w-full max-w-sm relative"
          onClick={e => e.stopPropagation()}
        >
          {/* Card */}
          <div className="relative backdrop-blur-xl bg-slate-900/95 border border-purple-500/30 rounded-3xl overflow-hidden shadow-2xl shadow-purple-900/50">
            {/* Top gradient strip */}
            <div className="h-1.5 w-full bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500" />

            {/* Dismiss button */}
            <button
              onClick={onDismiss}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-7">
              {/* Icon + pulse */}
              <div className="flex justify-center mb-5">
                <div className="relative">
                  <motion.div
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="absolute inset-0 rounded-2xl bg-amber-500/30 blur-md"
                  />
                  <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                    <Zap className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>

              {/* Text */}
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white mb-1">Live Quiz Available!</h2>
                <p className="text-slate-400 text-sm">Your teacher has opened a quiz lobby</p>
              </div>

              {/* Info */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 space-y-2.5">
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500">Class</p>
                    <p className="text-white text-sm font-medium">{session.class_name || 'Your Class'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500">Teacher</p>
                    <p className="text-white text-sm font-medium">
                      {session.teacher_name || session.teacher_email?.split('@')[0]}
                    </p>
                  </div>
                </div>
                {session.quiz_title && (
                  <div className="flex items-center gap-3">
                    <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500">Topic</p>
                      <p className="text-white text-sm font-medium">{session.quiz_title}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Participants joined */}
              {(session.participant_emails?.length || 0) > 0 && (
                <p className="text-center text-slate-400 text-sm mb-4">
                  <span className="text-white font-semibold">{session.participant_emails.length}</span> student{session.participant_emails.length !== 1 ? 's' : ''} already joined
                </p>
              )}

              {/* Buttons */}
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleJoin}
                  disabled={joining}
                  className="w-full py-5 text-base font-semibold bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 shadow-lg shadow-purple-500/30"
                >
                  {joining ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Joining...</>
                  ) : (
                    <><Zap className="w-4 h-4 mr-2" /> Join Quiz</>
                  )}
                </Button>
                <button
                  onClick={onDismiss}
                  className="w-full py-2.5 text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}