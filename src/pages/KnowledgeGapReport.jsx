import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Zap,
  Target,
  CheckCircle2,
  Lightbulb,
  TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils';

export default function KnowledgeGapReport() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const attemptId = searchParams.get('attempt_id');

  useEffect(() => {
    const checkAuth = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    checkAuth();
  }, []);

  // Fetch quiz attempt with AI analysis
  const { data: attempt, isLoading, refetch } = useQuery({
    queryKey: ['quizAttempt', attemptId],
    queryFn: async () => {
      if (!attemptId) return null;
      const attempts = await base44.entities.QuizAttempt.filter({ id: attemptId });
      return attempts?.[0];
    },
    enabled: !!attemptId,
    refetchInterval: 3000,
  });

  // Trigger analysis if not done yet
  const triggerAnalysisMutation = useMutation({
    mutationFn: () =>
      base44.functions.invoke('analyzeQuizGapsAndGenerateReport', {
        quiz_attempt_id: attemptId,
      }),
    onSuccess: () => {
      setTimeout(() => refetch(), 1000);
    },
  });

  // Fetch related assignment
  const { data: assignment } = useQuery({
    queryKey: ['catchUpAssignment', attempt?.topic_id],
    queryFn: async () => {
      if (!attempt?.topic_id) return null;
      const assignments = await base44.entities.Assignment.filter({
        teacher_email: 'ai-system@educore.internal',
        topic_id: attempt.topic_id,
      });
      return assignments?.[0];
    },
    enabled: !!attempt?.topic_id,
  });

  // Fetch related lesson
  const { data: lesson } = useQuery({
    queryKey: ['catchUpLesson', attempt?.topic_id],
    queryFn: async () => {
      if (!attempt?.topic_id) return null;
      const lessons = await base44.entities.Lesson.filter({
        topic_id: attempt.topic_id,
      });
      return lessons?.[0];
    },
    enabled: !!attempt?.topic_id,
  });

  // Fetch topic info
  const { data: topic } = useQuery({
    queryKey: ['topic', attempt?.topic_id],
    queryFn: async () => {
      if (!attempt?.topic_id) return null;
      const topics = await base44.entities.Topic.filter({ id: attempt.topic_id });
      return topics?.[0];
    },
    enabled: !!attempt?.topic_id,
  });

  if (!attemptId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-slate-400">No quiz attempt specified</p>
        </div>
      </div>
    );
  }

  const analysis = attempt?.ai_analysis;
  const isAnalyzing = !analysis && !isLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('StudentDashboard'))}
            className="text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">Knowledge Gap Analysis</h1>
            <p className="text-slate-400">AI-powered personalized feedback & practice plan</p>
          </div>
        </div>

        {/* Loading or Analyze Button */}
        {!analysis && (
          <Card className="bg-blue-500/10 border-blue-500/30 mb-8">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Zap className="w-6 h-6 text-blue-400" />
                  <div>
                    <p className="font-semibold text-white">AI Analysis Pending</p>
                    <p className="text-sm text-slate-400">
                      {isAnalyzing
                        ? 'Click to generate your personalized gap analysis'
                        : 'Analyzing your quiz responses...'}
                    </p>
                  </div>
                </div>
                {isAnalyzing && (
                  <Button
                    onClick={() => triggerAnalysisMutation.mutate()}
                    disabled={triggerAnalysisMutation.isPending}
                    className="bg-gradient-to-r from-blue-500 to-purple-500"
                  >
                    {triggerAnalysisMutation.isPending ? 'Analyzing...' : 'Generate Report'}
                  </Button>
                )}
                {!isAnalyzing && (
                  <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quiz Performance Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid md:grid-cols-3 gap-4 mb-8"
        >
          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-slate-400 text-sm mb-2">Your Score</p>
                <p className="text-4xl font-bold text-white">{attempt?.accuracy_percent}%</p>
                <p className="text-xs text-slate-500 mt-1">
                  {attempt?.correct_answers}/{attempt?.questions_answered}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-slate-400 text-sm mb-2">Questions Attempted</p>
                <p className="text-4xl font-bold text-white">{attempt?.questions_answered}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {attempt?.questions_answered - attempt?.correct_answers} incorrect
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-slate-400 text-sm mb-2">Time Spent</p>
                <p className="text-4xl font-bold text-white">
                  {attempt?.time_taken_seconds ? Math.floor(attempt.time_taken_seconds / 60) : '—'}
                </p>
                <p className="text-xs text-slate-500 mt-1">minutes</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* AI Analysis Results */}
        {analysis && (
          <>
            {/* Knowledge Gaps */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-red-500/10 border-red-500/30 mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-300">
                    <AlertCircle className="w-5 h-5" />
                    Identified Knowledge Gaps
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {analysis.gaps?.length > 0 ? (
                      analysis.gaps.map((gap, idx) => (
                        <Badge key={idx} className="bg-red-500/20 text-red-300 capitalize">
                          {gap}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-slate-400">No specific gaps identified</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Focus Areas */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-yellow-500/10 border-yellow-500/30 mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-300">
                    <Target className="w-5 h-5" />
                    Priority Focus Areas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analysis.focus_areas?.length > 0 ? (
                      analysis.focus_areas.map((area, idx) => (
                        <div key={idx} className="p-3 bg-white/5 rounded-lg border border-white/10">
                          <p className="font-medium text-white capitalize">{area}</p>
                          <p className="text-sm text-slate-400 mt-1">
                            This area showed the most difficulty in your quiz
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400">No focus areas identified</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Recommendations */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-emerald-500/10 border-emerald-500/30 mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-emerald-300">
                    <Lightbulb className="w-5 h-5" />
                    Personalized Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-white leading-relaxed">{analysis.recommendations}</p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Auto-Assigned Practice */}
            {(assignment || lesson) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card className="bg-purple-500/10 border-purple-500/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-purple-300">
                      <BookOpen className="w-5 h-5" />
                      Catch-Up Practice Assigned
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {lesson && (
                        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium text-white">{lesson.title}</p>
                              <p className="text-sm text-slate-400 mt-1">{lesson.content_type} lesson</p>
                            </div>
                            <Badge className="bg-emerald-500/20 text-emerald-300">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Auto-Created
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-300 mb-3">
                            {lesson.duration_minutes || 30} min • {lesson.xp_reward || 50} XP
                          </p>
                          <Button
                            onClick={() => navigate(createPageUrl(`Lesson?id=${lesson.id}`))}
                            className="bg-gradient-to-r from-purple-500 to-blue-500 w-full"
                          >
                            Start Lesson
                          </Button>
                        </div>
                      )}

                      {assignment && (
                        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium text-white">{assignment.title}</p>
                              <p className="text-sm text-slate-400 mt-1">Practice module</p>
                            </div>
                            <Badge className="bg-emerald-500/20 text-emerald-300">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Ready
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-300 mb-3">
                            {assignment.estimated_minutes || 45} min • {assignment.difficulty}
                          </p>
                          <Button
                            onClick={() =>
                              navigate(
                                createPageUrl(`TakeAssignment?assignment_id=${assignment.id}`)
                              )
                            }
                            variant="outline"
                            className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10 w-full"
                          >
                            <TrendingDown className="w-4 h-4 mr-2" />
                            Start Practice
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}