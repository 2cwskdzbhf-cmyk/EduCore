import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import GlassCard from '@/components/ui/GlassCard';
import { BarChart3, TrendingDown, AlertCircle, Trophy } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function QuizAnalytics({ classId }) {
  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['quizAnalytics', classId],
    queryFn: async () => {
      if (!classId) return [];
      return base44.entities.AssignmentSubmission.filter({ class_id: classId });
    },
    enabled: !!classId
  });

  const { data: quizAttempts = [] } = useQuery({
    queryKey: ['quizAttempts', classId],
    queryFn: async () => {
      if (!classId) return [];
      return base44.entities.QuizAttempt.filter({ class_id: classId });
    },
    enabled: !!classId
  });

  const { data: liveQuizAnswers = [] } = useQuery({
    queryKey: ['liveQuizAnswers', classId],
    queryFn: async () => {
      if (!classId) return [];
      const sessions = await base44.entities.LiveQuizSession.filter({ class_id: classId });
      if (!sessions.length) return [];
      const allAnswers = await Promise.all(
        sessions.map(s => base44.entities.LiveQuizAnswer.filter({ session_id: s.id }))
      );
      return allAnswers.flat();
    },
    enabled: !!classId
  });

  if (isLoading) {
    return (
      <GlassCard className="p-6">
        <Skeleton className="h-8 w-48 mb-4 bg-white/10" />
        <div className="space-y-3">
          <Skeleton className="h-20 bg-white/10" />
          <Skeleton className="h-20 bg-white/10" />
        </div>
      </GlassCard>
    );
  }

  // Calculate overall stats
  const totalAttempts = quizAttempts.length + liveQuizAnswers.length;
  const averageScore = totalAttempts > 0
    ? Math.round(
        quizAttempts.reduce((sum, a) => sum + (a.accuracy_percent || 0), 0) / quizAttempts.length
      )
    : 0;

  // Find most common incorrect answers (from live quiz answers)
  const incorrectAnswers = liveQuizAnswers.filter(a => !a.is_correct);
  const questionErrorCounts = {};
  incorrectAnswers.forEach(a => {
    const qId = a.question_id || 'unknown';
    questionErrorCounts[qId] = (questionErrorCounts[qId] || 0) + 1;
  });

  const topIncorrectQuestions = Object.entries(questionErrorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // Calculate completion rate
  const completedSubmissions = submissions.filter(s => s.status === 'submitted' || s.status === 'graded').length;
  const completionRate = submissions.length > 0
    ? Math.round((completedSubmissions / submissions.length) * 100)
    : 0;

  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="w-5 h-5 text-purple-400" />
        <h3 className="text-lg font-bold text-white">Quiz Analytics</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white/5 p-4 rounded-xl">
          <Trophy className="w-5 h-5 text-amber-400 mb-2" />
          <p className="text-2xl font-bold text-white">{averageScore}%</p>
          <p className="text-xs text-slate-400">Avg Score</p>
        </div>
        <div className="bg-white/5 p-4 rounded-xl">
          <BarChart3 className="w-5 h-5 text-blue-400 mb-2" />
          <p className="text-2xl font-bold text-white">{totalAttempts}</p>
          <p className="text-xs text-slate-400">Total Attempts</p>
        </div>
        <div className="bg-white/5 p-4 rounded-xl">
          <TrendingDown className="w-5 h-5 text-emerald-400 mb-2" />
          <p className="text-2xl font-bold text-white">{completionRate}%</p>
          <p className="text-xs text-slate-400">Completion Rate</p>
        </div>
      </div>

      {topIncorrectQuestions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-orange-400" />
            <h4 className="text-sm font-semibold text-white">Most Challenging Questions</h4>
          </div>
          <div className="space-y-2">
            {topIncorrectQuestions.map(([qId, count], i) => (
              <div key={qId} className="flex items-center justify-between bg-orange-500/10 p-3 rounded-lg border border-orange-500/30">
                <span className="text-sm text-slate-300">
                  Question #{i + 1}
                </span>
                <span className="text-sm font-semibold text-orange-300">
                  {count} incorrect
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {totalAttempts === 0 && (
        <div className="text-center py-8 text-slate-400">
          <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No quiz data yet</p>
        </div>
      )}
    </GlassCard>
  );
}