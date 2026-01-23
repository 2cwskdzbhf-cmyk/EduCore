import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import GlassCard from '@/components/ui/GlassCard';
import { Zap, X, Loader2 } from 'lucide-react';

export default function LiveQuizJoinModal({ session, onClose }) {
  const navigate = useNavigate();
  const [user, setUser] = React.useState(null);
  const [nickname, setNickname] = useState('');

  React.useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
      
      // Set default nickname from first name
      const firstName = userData.full_name ? userData.full_name.split(' ')[0] : userData.email.split('@')[0];
      setNickname(firstName);
    };
    fetchUser();
  }, []);

  const joinMutation = useMutation({
    mutationFn: async () => {
      const trimmedNickname = nickname.trim();
      
      // Validate nickname length
      if (trimmedNickname.length < 2 || trimmedNickname.length > 16) {
        throw new Error('Nickname must be between 2-16 characters');
      }

      // Check for duplicate nicknames and auto-append number
      const existingPlayers = await base44.entities.LiveQuizPlayer.filter({ 
        session_id: session.id 
      });
      
      let finalNickname = trimmedNickname;
      let counter = 2;
      
      while (existingPlayers.some(p => p.nickname === finalNickname)) {
        finalNickname = `${trimmedNickname} ${counter}`;
        counter++;
      }

      console.log('[DEBUG] Creating player with nickname:', finalNickname);

      const player = await base44.entities.LiveQuizPlayer.create({
        session_id: session.id,
        nickname: finalNickname,
        student_email: user.email,
        total_points: 0,
        correct_count: 0,
        questions_answered: 0,
        average_response_time_ms: 0,
        current_streak: 0,
        longest_streak: 0,
        connected: true
      });

      console.log('[DEBUG] Player created:', player.id);
      return player;
    },
    onSuccess: () => {
      navigate(createPageUrl(`StudentLiveQuizPlay?sessionId=${session.id}`));
    },
    onError: (error) => {
      console.error('[ERROR] Failed to join quiz:', error);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = nickname.trim();
    if (trimmed.length >= 2 && trimmed.length <= 16) {
      joinMutation.mutate();
    }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="max-w-md w-full"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <GlassCard className="p-8">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Join Live Quiz!</h2>
                <p className="text-sm text-slate-400">A live quiz is starting</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-white mb-2">Choose your nickname</Label>
              <Input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Enter a fun nickname"
                minLength={2}
                maxLength={16}
                className="bg-white/5 border-white/10 text-white"
                autoFocus
              />
              <p className="text-xs text-slate-400 mt-1">2-16 characters</p>
            </div>

            <Button
              type="submit"
              disabled={!nickname.trim() || nickname.trim().length < 2 || nickname.trim().length > 16 || joinMutation.isPending}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/30"
            >
              {joinMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 mr-2" />
                  Join Quiz
                </>
              )}
            </Button>

            {joinMutation.isError && (
              <p className="text-red-400 text-sm text-center">
                Failed to join. {joinMutation.error?.message || 'Please try again.'}
              </p>
            )}
          </form>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}