import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Trophy, TrendingUp, TrendingDown, Zap, Target } from 'lucide-react';

export default function ModernLeaderboard({ classId, classData, user, isTeacher }) {
  const { data: allSubmissions = [] } = useQuery({
    queryKey: ['allClassSubmissions', classId],
    queryFn: () =>
      base44.entities.AssignmentSubmission.filter({
        class_id: classId
      }),
    enabled: !!classId && !!classData?.student_emails,
    refetchInterval: 10000
  });

  const leaderboard = (classData?.student_emails || [])
    .map((email) => {
      const studentSubs = allSubmissions.filter((s) => s.student_email === email);
      const totalQ = studentSubs.reduce((s, sub) => s + (sub.questions_answered || 0), 0);
      const totalC = studentSubs.reduce((s, sub) => s + (sub.correct_answers || 0), 0);
      const accuracy = totalQ > 0 ? (totalC / totalQ) * 100 : 0;
      const completed = studentSubs.filter((s) =>
        ['submitted', 'graded'].includes(s.status)
      ).length;
      return {
        email,
        accuracy,
        totalQ,
        totalC,
        incorrect: totalQ - totalC,
        completed,
        displayName: email.split('@')[0]
      };
    })
    .sort((a, b) => {
      if (a.totalQ === 0 && b.totalQ > 0) return 1;
      if (a.totalQ > 0 && b.totalQ === 0) return -1;
      return b.accuracy - a.accuracy;
    });

  const medalEmojis = ['🥇', '🥈', '🥉'];

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/10 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-10 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Trophy className="w-8 h-8 text-amber-400" />
            Class Leaderboard
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            {leaderboard.filter((s) => s.totalQ > 0).length} of{' '}
            {leaderboard.length} students active
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6">
          {/* My Stats (if student) */}
          {!isTeacher && user && (() => {
            const me = leaderboard.find((s) => s.email === user.email);
            const myRank = me ? leaderboard.indexOf(me) + 1 : null;
            if (!me || me.totalQ === 0) return null;
            return (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 backdrop-blur-xl bg-gradient-to-r from-purple-500/15 to-blue-500/15 border border-purple-500/40 rounded-2xl p-6">
                <p className="text-purple-300 text-sm font-semibold mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Your Position
                </p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-amber-400">#{myRank}</p>
                    <p className="text-slate-400 text-sm mt-1">Rank</p>
                  </div>
                  <div className="text-center">
                    <p
                      className={`text-3xl font-bold ${
                        me.accuracy >= 80
                          ? 'text-emerald-400'
                          : me.accuracy >= 60
                          ? 'text-amber-400'
                          : 'text-red-400'
                      }`}>
                      {me.accuracy.toFixed(1)}%
                    </p>
                    <p className="text-slate-400 text-sm mt-1">Accuracy</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-emerald-400">
                      {me.totalC}
                    </p>
                    <p className="text-slate-400 text-sm mt-1">Correct</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-red-400">
                      {me.incorrect}
                    </p>
                    <p className="text-slate-400 text-sm mt-1">Incorrect</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-white">
                      {me.totalQ}
                    </p>
                    <p className="text-slate-400 text-sm mt-1">Total Qs</p>
                  </div>
                </div>
              </motion.div>
            );
          })()}

          {/* Leaderboard */}
          {leaderboard.length > 0 ? (
            <div className="space-y-3">
              {leaderboard.map((student, index) => {
                const isMe = student.email === user?.email;
                const isActive = student.totalQ > 0;

                return (
                  <motion.div
                    key={student.email}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      'backdrop-blur-xl border rounded-2xl p-4 transition-all duration-300 hover:shadow-xl',
                      isMe
                        ? 'bg-gradient-to-r from-purple-500/15 to-blue-500/15 border-purple-500/40 shadow-lg shadow-purple-500/20'
                        : 'bg-white/5 border-white/10 opacity-75 hover:opacity-100'
                    )}>
                    <div className="flex items-center gap-4">
                      {/* Rank badge */}
                      <div
                        className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0',
                          index === 0
                            ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white'
                            : index === 1
                            ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-slate-800'
                            : index === 2
                            ? 'bg-gradient-to-br from-amber-600 to-orange-700 text-white'
                            : 'bg-white/10 text-slate-400'
                        )}>
                        {index < 3 ? medalEmojis[index] : index + 1}
                      </div>

                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {student.displayName.charAt(0).toUpperCase()}
                      </div>

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            'font-semibold truncate',
                            isMe
                              ? 'text-purple-300'
                              : isActive
                              ? 'text-white'
                              : 'text-slate-500'
                          )}>
                          {student.displayName}
                          {isMe && ' (You)'}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {student.completed} assignment
                          {student.completed !== 1 ? 's' : ''} completed
                        </p>
                      </div>

                      {/* Stats */}
                      {isActive ? (
                        <div className="flex items-center gap-4 text-center flex-shrink-0">
                          <div>
                            <p
                              className={cn(
                                'text-lg font-bold',
                                student.accuracy >= 80
                                  ? 'text-emerald-400'
                                  : student.accuracy >= 60
                                  ? 'text-amber-400'
                                  : 'text-red-400'
                              )}>
                              {student.accuracy.toFixed(1)}%
                            </p>
                            <p className="text-xs text-slate-400">Accuracy</p>
                          </div>
                          <div className="hidden sm:block">
                            <p className="text-lg font-bold text-emerald-400">
                              {student.totalC}
                            </p>
                            <p className="text-xs text-slate-400">Correct</p>
                          </div>
                          <div className="hidden md:block">
                            <p className="text-lg font-bold text-red-400">
                              {student.incorrect}
                            </p>
                            <p className="text-xs text-slate-400">Wrong</p>
                          </div>
                          <div className="hidden lg:block w-16">
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{
                                  width: `${Math.min(100, student.accuracy)}%`
                                }}
                                transition={{ duration: 1, ease: 'easeOut' }}
                                className={cn(
                                  'h-full rounded-full',
                                  student.accuracy >= 80
                                    ? 'bg-emerald-400'
                                    : student.accuracy >= 60
                                    ? 'bg-amber-400'
                                    : 'bg-red-400'
                                )}
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic flex-shrink-0">
                          No activity
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-24">
              <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-xl font-semibold text-white mb-2">
                No activity yet
              </p>
              <p className="text-slate-400">
                Complete assignments to appear on the leaderboard
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}