import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/ui/GlassCard';
import { useQuery } from '@tanstack/react-query';
import {
  Trophy,
  Target,
  Timer,
  RotateCcw,
  ArrowRight,
  CheckCircle2,
  XCircle
} from 'lucide-react';

export default function PracticeQuizResults() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session');
  const accuracy = parseInt(urlParams.get('accuracy') || '0');
  const totalTime = parseInt(urlParams.get('time') || '0');
  const lessonId = urlParams.get('lesson');
  const topicId = urlParams.get('topic');

  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    fetchUser();
  }, []);

  const { data: attempts = [] } = useQuery({
    queryKey: ['practiceAttempts', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      return base44.entities.PracticeAttempt.filter({ session_id: sessionId });
    },
    enabled: !!sessionId
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['questions', attempts.map(a => a.question_id).join(',')],
    queryFn: async () => {
      if (attempts.length === 0) return [];
      const questionIds = [...new Set(attempts.map(a => a.question_id))];
      const allQuestions = await base44.entities.QuestionBankItem.filter({
        id: { $in: questionIds }
      });
      return allQuestions;
    },
    enabled: attempts.length > 0
  });

  const correctCount = attempts.filter(a => a.is_correct).length;
  const totalQuestions = attempts.length;
  const avgTime = totalTime / totalQuestions;

  const missedQuestions = attempts.filter(a => !a.is_correct);

  const handleRetry = () => {
    if (lessonId) {
      navigate(createPageUrl(`PracticeQuizPlay?lessonId=${lessonId}&count=${totalQuestions}`));
    } else if (topicId) {
      navigate(createPageUrl(`PracticeQuizPlay?topicId=${topicId}&count=${totalQuestions}`));
    }
  };

  const handleRetryMissed = () => {
    // Navigate with specific question IDs
    const missedIds = missedQuestions.map(q => q.question_id).join(',');
    navigate(createPageUrl(`PracticeQuizPlay?questionIds=${missedIds}`));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <GlassCard className={`p-8 text-center ${
            accuracy >= 80 ? 'border-emerald-500/30' : accuracy >= 60 ? 'border-blue-500/30' : 'border-amber-500/30'
          }`}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${
                accuracy >= 80 ? 'bg-emerald-500/20' : accuracy >= 60 ? 'bg-blue-500/20' : 'bg-amber-500/20'
              }`}
            >
              <Trophy className={`w-10 h-10 ${
                accuracy >= 80 ? 'text-emerald-400' : accuracy >= 60 ? 'text-blue-400' : 'text-amber-400'
              }`} />
            </motion.div>

            <h1 className="text-3xl font-bold text-white mb-2">
              {accuracy >= 80 ? 'Excellent Work!' : accuracy >= 60 ? 'Good Job!' : 'Keep Practicing!'}
            </h1>
            <p className="text-slate-400 mb-8">
              {accuracy >= 80 ? 'You mastered this practice!' : accuracy >= 60 ? 'You\'re on the right track!' : 'Practice makes perfect!'}
            </p>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-white/5 rounded-xl p-5 border border-white/10">
                <Target className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                <p className="text-3xl font-bold text-white">{accuracy}%</p>
                <p className="text-sm text-slate-400">Accuracy</p>
              </div>
              <div className="bg-white/5 rounded-xl p-5 border border-white/10">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                <p className="text-3xl font-bold text-white">{correctCount}/{totalQuestions}</p>
                <p className="text-sm text-slate-400">Correct</p>
              </div>
              <div className="bg-white/5 rounded-xl p-5 border border-white/10">
                <Timer className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                <p className="text-3xl font-bold text-white">{Math.round(avgTime / 1000)}s</p>
                <p className="text-sm text-slate-400">Avg Time</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleRetry}
                variant="outline"
                className="flex-1 border-white/20 text-white hover:bg-white/10"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Retry Practice
              </Button>
              {missedQuestions.length > 0 && (
                <Button
                  onClick={handleRetryMissed}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500"
                >
                  <Target className="w-4 h-4 mr-2" />
                  Retry Missed ({missedQuestions.length})
                </Button>
              )}
            </div>
          </GlassCard>
        </motion.div>

        {/* Question Breakdown */}
        {questions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-xl font-bold text-white mb-4">Question Breakdown</h2>
            <div className="space-y-3">
              {questions.map((question) => {
                const attempt = attempts.find(a => a.question_id === question.id);
                return (
                  <GlassCard key={question.id} className={`p-5 ${
                    attempt?.is_correct ? 'border-emerald-500/30' : 'border-red-500/30'
                  }`}>
                    <div className="flex items-start gap-4">
                      {attempt?.is_correct ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-2">{question.prompt}</h3>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-slate-400">
                            Your answer: <span className={attempt?.is_correct ? 'text-emerald-400' : 'text-red-400'}>
                              {attempt?.submitted_answer}
                            </span>
                          </span>
                          {!attempt?.is_correct && (
                            <span className="text-slate-400">
                              Correct: <span className="text-emerald-400">{question.correct_answer}</span>
                            </span>
                          )}
                        </div>
                        {question.explanation && (
                          <p className="text-sm text-slate-400 mt-2 italic">{question.explanation}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-xs text-slate-500">
                          {Math.round((attempt?.time_to_answer_ms || 0) / 1000)}s
                        </span>
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 text-center"
        >
          <Button
            onClick={() => navigate(lessonId ? createPageUrl(`Lesson?id=${lessonId}`) : createPageUrl('StudentDashboard'))}
            variant="ghost"
            className="text-slate-400 hover:text-white"
          >
            {lessonId ? 'Back to Lesson' : 'Back to Dashboard'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}