import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import GlassCard from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Zap, Play, Users, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

export default function UpcomingLiveSessions({ teacherEmail }) {
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['upcomingLiveSessions', teacherEmail],
    queryFn: async () => {
      if (!teacherEmail) return [];
      const allSessions = await base44.entities.LiveQuizSession.filter(
        { host_email: teacherEmail },
        '-created_date'
      );
      return allSessions.filter(s => s.status === 'lobby' || s.status === 'live');
    },
    enabled: !!teacherEmail,
    refetchInterval: 5000
  });

  const { data: allPlayers = [] } = useQuery({
    queryKey: ['allSessionPlayers'],
    queryFn: async () => {
      if (sessions.length === 0) return [];
      const playerData = await Promise.all(
        sessions.map(s => base44.entities.LiveQuizPlayer.filter({ session_id: s.id }))
      );
      return playerData.flat();
    },
    enabled: sessions.length > 0
  });

  if (isLoading) {
    return (
      <GlassCard className="p-6">
        <Skeleton className="h-8 w-48 mb-4 bg-white/10" />
        <Skeleton className="h-20 bg-white/10" />
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Zap className="w-5 h-5 text-amber-400" />
        <h3 className="text-lg font-bold text-white">Live Sessions</h3>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <Zap className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm mb-3">No active sessions</p>
          <Link to={createPageUrl('CreateQuiz')}>
            <Button size="sm" className="bg-gradient-to-r from-amber-500 to-orange-500">
              <Play className="w-4 h-4 mr-2" />
              Start Live Quiz
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session, i) => {
            const playerCount = allPlayers.filter(p => p.session_id === session.id).length;
            const joinCode = session.join_code || session.id.substring(0, 6).toUpperCase();

            return (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 p-4 rounded-xl border border-amber-500/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-amber-500/30 rounded text-xs font-mono font-bold text-amber-200">
                        {joinCode}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        session.status === 'live' 
                          ? 'bg-emerald-500/30 text-emerald-200' 
                          : 'bg-slate-500/30 text-slate-200'
                      }`}>
                        {session.status === 'live' ? 'Live' : 'Lobby'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-300">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {playerCount} players
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(session.created_date), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <Link to={createPageUrl(
                    session.status === 'live' 
                      ? `TeacherLiveQuizPlay?sessionId=${session.id}`
                      : `TeacherLiveQuizLobby?sessionId=${session.id}`
                  )}>
                    <Button size="sm" className="bg-gradient-to-r from-amber-500 to-orange-500">
                      {session.status === 'live' ? 'View' : 'Join'}
                    </Button>
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}