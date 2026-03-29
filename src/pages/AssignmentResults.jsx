import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/ui/GlassCard';
import { 
  ChevronLeft,
  Trophy,
  Clock,
  Target,
  TrendingUp
} from 'lucide-react';

export default function AssignmentResults() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const assignmentId = urlParams.get('assignmentId');
  const classId = urlParams.get('classId');

  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    fetchUser();
  }, []);

  const { data: assignment } = useQuery({
    queryKey: ['assignment', assignmentId],
    queryFn: async () => {
      if (!assignmentId) return null;
      const assignments = await base44.entities.Assignment.filter({ id: assignmentId });
      return assignments[0] || null;
    },
    enabled: !!assignmentId
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['assignmentSubmissions', assignmentId],
    queryFn: async () => {
      if (!assignmentId) return [];
      return base44.entities.AssignmentSubmission.filter({ assignment_id: assignmentId }, '-percentage');
    },
    enabled: !!assignmentId
  });

  const { data: allSubmissions = [] } = useQuery({
    queryKey: ['allAssignmentSubmissions', classId],
    queryFn: async () => {
      if (!classId) return [];
      return base44.entities.AssignmentSubmission.filter({ class_id: classId }, '-created_date', 100);
    },
    enabled: !!classId
  });

  // Find current user's submission
  const userSubmission = submissions.find(s => s.student_email === user?.email);

  if (!userSubmission) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Get user's ranking
  const userRanking = submissions.findIndex(s => s.student_email === user?.email) + 1;
  const totalParticipants = submissions.length;

  // Calculate time per question
  const totalQuestions = userSubmission.max_score || 1;
  const timePerQuestion = 0; // We don't have this data yet, would need to track it

  // Get top performers
  const topPerformers = submissions.slice(0, 5);

  const handleBack = () => {
    navigate(createPageUrl(`StudentClassDetail?classId=${classId}`));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to Class
        </button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">Assignment Complete!</h1>
          <p className="text-slate-400">{assignment?.title}</p>
        </motion.div>

        {/* Main Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Accuracy */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <GlassCard className="p-8 text-center h-full">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
                <Target className="w-8 h-8 text-white" />
              </div>
              <p className="text-slate-400 text-sm mb-2">Accuracy</p>
              <p className="text-5xl font-bold text-white mb-2">
                {Math.round(userSubmission.percentage)}%
              </p>
              <p className="text-xs text-slate-400">
                {userSubmission.score} of {userSubmission.max_score} correct
              </p>
            </GlassCard>
          </motion.div>

          {/* Your Ranking */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <GlassCard className="p-8 text-center h-full">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <p className="text-slate-400 text-sm mb-2">Your Rank</p>
              <p className="text-5xl font-bold text-white mb-2">
                #{userRanking}
              </p>
              <p className="text-xs text-slate-400">
                out of {totalParticipants} students
              </p>
            </GlassCard>
          </motion.div>

          {/* Class Average */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <GlassCard className="p-8 text-center h-full">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/30">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <p className="text-slate-400 text-sm mb-2">Class Average</p>
              <p className="text-5xl font-bold text-white mb-2">
                {totalParticipants > 0 
                  ? Math.round(submissions.reduce((sum, s) => sum + (s.percentage || 0), 0) / totalParticipants)
                  : 0
                }%
              </p>
              <p className="text-xs text-slate-400">
                {userSubmission.percentage >= 80 ? 'Above average!' : userSubmission.percentage >= 50 ? 'On track' : 'Keep improving'}
              </p>
            </GlassCard>
          </motion.div>
        </div>

        {/* Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <GlassCard className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <Trophy className="w-6 h-6 text-amber-400" />
              <h2 className="text-2xl font-bold text-white">Leaderboard</h2>
            </div>

            <div className="space-y-3">
              {submissions.length === 0 ? (
                <p className="text-slate-400 text-center py-8">No submissions yet</p>
              ) : (
                submissions.map((submission, idx) => {
                  const isUser = submission.student_email === user?.email;
                  const medalEmoji = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '';

                  return (
                    <motion.div
                      key={submission.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * (idx + 1) }}
                      className={`
                        flex items-center justify-between p-4 rounded-xl border transition-all
                        ${isUser
                          ? 'bg-purple-500/15 border-purple-500/50 ring-2 ring-purple-500/30'
                          : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.07] hover:border-white/20'
                        }
                      `}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="text-2xl font-bold w-8 text-center">
                          {medalEmoji || `#${idx + 1}`}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-white text-sm">
                            {submission.student_email === user?.email ? 'You' : submission.student_email?.split('@')[0]}
                            {isUser && <span className="ml-2 text-purple-300 text-xs">(You)</span>}
                          </p>
                          <p className="text-xs text-slate-400">
                            {new Date(submission.submitted_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-bold text-white">
                            {Math.round(submission.percentage)}%
                          </p>
                          <p className="text-xs text-slate-400">
                            {submission.score}/{submission.max_score}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </GlassCard>
        </motion.div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-center mt-8">
          <Button
            onClick={handleBack}
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 shadow-lg shadow-purple-500/30"
          >
            Back to Class
          </Button>
        </div>
      </div>
    </div>
  );
}