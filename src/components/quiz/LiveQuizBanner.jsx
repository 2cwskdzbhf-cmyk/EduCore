import React from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

export default function LiveQuizBanner({ session, user }) {
  const navigate = useNavigate();

  const handleJoin = async () => {
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
      navigate(`/live-quiz-lobby-new?sessionId=${session.id}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      <button
        onClick={handleJoin}
        className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center gap-2 hover:from-purple-700 hover:to-blue-700 transition-all"
      >
        <Zap className="w-4 h-4 text-white animate-pulse" />
        <span className="text-white text-sm font-semibold">
          Live Quiz Available — {session.class_name} — Join Now
        </span>
        <Zap className="w-4 h-4 text-white animate-pulse" />
      </button>
    </motion.div>
  );
}