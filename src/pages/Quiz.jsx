import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { 
  ChevronLeft, 
  ChevronRight, 
  Trophy,
  Clock,
  Zap,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export default function QuizPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const quizId = urlParams.get('id');

  const [user, setUser] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [startTime] = useState(Date.now());
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    fetchUser();
  }, []);

  const { data: quiz, isLoading } = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: async () => {
      if (!quizId) return null;
      const quizzes = await base44.entities.Quiz.filter({ id: quizId });
      return quizzes[0] || null;
    },
    enabled: !!quizId
  });

  const { data: progress } = useQuery({
    queryKey: ['studentProgress', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const progressList = await base44.entities.StudentProgress.filter({ student_email: user.email });
      return progressList[0] || null;
    },
    enabled: !!user?.email
  });

  const submitQuizMutation = useMutation({
    mutationFn: async (results) => {
      if (!progress || !quiz) return;

      const accuracyPercent = results.score;
      const questionsAnswered = results.totalQuestions;
      const correctAnswers = results.correctCount;

      // Calculate new overall accuracy
      const newTotalQuestions = (progress.total_questions_answered || 0) + questionsAnswered;
      const newTotalCorrect = (progress.total_correct_answers || 0) + correctAnswers;
      const newAccuracy = newTotalQuestions > 0 ? Math.round((newTotalCorrect / newTotalQuestions) * 100 * 10) / 10 : 0;

      // Update topic mastery based on quiz score
      const topicMastery = { ...progress.topic_mastery };
      const currentMastery = topicMastery[quiz.topic_id] || 0;
      topicMastery[quiz.topic_id] = Math.max(currentMastery, results.score);

      // Update weak/strong areas
      let weakAreas = [...(progress.weak_areas || [])];
      let strongAreas = [...(progress.strong_areas || [])];

      if (results.score >= 80) {
        if (!strongAreas.includes(quiz.topic_id)) {
          strongAreas.push(quiz.topic_id);
        }
        weakAreas = weakAreas.filter(id => id !== quiz.topic_id);
      } else if (results.score < 50) {
        if (!weakAreas.includes(quiz.topic_id)) {
          weakAreas.push(quiz.topic_id);
        }
        strongAreas = strongAreas.filter(id => id !== quiz.topic_id);
      }

      // Save quiz attempt
      await base44.entities.QuizAttempt.create({
        student_email: user.email,
        quiz_id: quizId,
        topic_id: quiz.topic_id,
        lesson_id: quiz.lesson_id,
        questions_answered: questionsAnswered,
        correct_answers: correctAnswers,
        accuracy_percent: accuracyPercent,
        time_taken_seconds: results.totalTime,
        answers: results.answers,
        completed_at: new Date().toISOString()
      });

      // Update progress
      await base44.entities.StudentProgress.update(progress.id, {
        total_questions_answered: newTotalQuestions,
        total_correct_answers: newTotalCorrect,
        accuracy_percent: newAccuracy,
        quizzes_completed: (progress.quizzes_completed || 0) + 1,
        topic_mastery: topicMastery,
        weak_areas: weakAreas,
        strong_areas: strongAreas,
        last_activity_date: new Date().toISOString().split('T')[0]
      });

      return { accuracy: newAccuracy };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['studentProgress']);
    }
  });

  if (!quizId || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const questions = quiz?.questions || [];
  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;

  // If no quiz or no questions, show error state
  if (!quiz || totalQuestions === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-slate-600 mb-4">This quiz has no questions yet.</p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  const handleAnswer = (answer) => {
    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);
    setAnswers({
      ...answers,
      [currentQuestion.id]: {
        answer,
        is_correct: answer.toLowerCase().trim() === currentQuestion.correct_answer.toLowerCase().trim(),
        time_spent_seconds: timeSpent
      }
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setQuestionStartTime(Date.now());
    } else {
      calculateResults();
    }
  };

  const calculateResults = async () => {
    const totalTime = Math.round((Date.now() - startTime) / 1000);
    const correctCount = Object.values(answers).filter(a => a.is_correct).length;
    const score = Math.round((correctCount / totalQuestions) * 100);

    const results = {
      score,
      correctCount,
      totalQuestions,
      totalTime,
      answers: Object.entries(answers).map(([id, data]) => ({
        question_id: id,
        ...data
      }))
    };

    await submitQuizMutation.mutateAsync(results);
    setShowResults(true);
  };

  const getScore = () => {
    const correctCount = Object.values(answers).filter(a => a.is_correct).length;
    return Math.round((correctCount / totalQuestions) * 100);
  };

  if (showResults) {
    const score = getScore();
    const correctCount = Object.values(answers).filter(a => a.is_correct).length;
    const passed = score >= (quiz.passing_score || 60);

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center p-6">
        <motion.div
          className="w-full max-w-lg"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className={`rounded-3xl p-8 text-center ${
            passed 
              ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white' 
              : 'bg-gradient-to-br from-amber-500 to-orange-600 text-white'
          }`}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="w-24 h-24 mx-auto mb-6 bg-white/20 rounded-full flex items-center justify-center"
            >
              {passed ? (
                <Trophy className="w-12 h-12 text-white" />
              ) : (
                <Zap className="w-12 h-12 text-white" />
              )}
            </motion.div>

            <h1 className="text-3xl font-bold mb-2">
              {passed ? 'Great Job!' : 'Keep Practicing!'}
            </h1>
            <p className="text-white/80 mb-8">
              {passed ? "You've mastered this quiz!" : "You're getting there, keep going!"}
            </p>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-white/20 rounded-xl p-4">
                <p className="text-4xl font-bold">{score}%</p>
                <p className="text-sm text-white/70">Accuracy</p>
              </div>
              <div className="bg-white/20 rounded-xl p-4">
                <p className="text-4xl font-bold">{correctCount}/{totalQuestions}</p>
                <p className="text-sm text-white/70">Correct</p>
              </div>
            </div>

            <div className="bg-white/20 rounded-xl p-4 mb-8">
              <p className="text-2xl font-bold">{submitQuizMutation.data?.accuracy || 0}%</p>
              <p className="text-sm text-white/70">Your Overall Accuracy</p>
            </div>

            <div className="space-y-3">
              {quiz.topic_id && (
                <Button 
                  className="w-full bg-white text-slate-800 hover:bg-white/90 h-12"
                  onClick={() => navigate(createPageUrl(`Topic?id=${quiz.topic_id}`))}
                >
                  Back to Topic
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
              <Button 
                variant="ghost" 
                className="w-full text-white hover:bg-white/20 h-12"
                onClick={() => navigate(createPageUrl('StudentDashboard'))}
              >
                Go to Dashboard
              </Button>
            </div>
          </div>

          {/* Review Answers */}
          <div className="mt-6 bg-white rounded-2xl border border-slate-100 p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Review Answers</h3>
            <div className="space-y-3">
              {questions.map((q, idx) => {
                const answer = answers[q.id];
                return (
                  <div key={q.id} className={`p-4 rounded-xl ${
                    answer?.is_correct ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
                  }`}>
                    <div className="flex items-start gap-3">
                      {answer?.is_correct ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="font-medium text-slate-800 text-sm">{q.question}</p>
                        {!answer?.is_correct && (
                          <p className="text-sm text-emerald-600 mt-1">
                            Correct: {q.correct_answer}
                          </p>
                        )}
                        {q.explanation && (
                          <p className="text-xs text-slate-500 mt-2">{q.explanation}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-700"
            >
              <ChevronLeft className="w-5 h-5" />
              Exit Quiz
            </button>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-600">
                {currentQuestionIndex + 1} / {totalQuestions}
              </span>
            </div>
          </div>
          <Progress value={((currentQuestionIndex + 1) / totalQuestions) * 100} className="h-2" />
        </div>
      </div>

      {/* Question */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-4 ${
                currentQuestion?.type === 'multiple_choice' 
                  ? 'bg-indigo-100 text-indigo-700' 
                  : 'bg-purple-100 text-purple-700'
              }`}>
                {currentQuestion?.type === 'multiple_choice' ? 'Multiple Choice' : 'Short Answer'}
              </span>

              <h2 className="text-2xl font-bold text-slate-900 mb-8">
                {currentQuestion?.question}
              </h2>

              {currentQuestion?.type === 'multiple_choice' ? (
                <div className="space-y-3">
                  {currentQuestion.options?.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAnswer(option)}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                        answers[currentQuestion.id]?.answer === option
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${
                          answers[currentQuestion.id]?.answer === option
                            ? 'bg-indigo-500 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <span className="text-slate-700">{option}</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <Input
                  placeholder="Type your answer..."
                  value={answers[currentQuestion.id]?.answer || ''}
                  onChange={(e) => handleAnswer(e.target.value)}
                  className="h-14 text-lg"
                />
              )}

              <div className="mt-8 flex justify-end">
                <Button
                  onClick={handleNext}
                  disabled={!answers[currentQuestion?.id]}
                  className="bg-indigo-500 hover:bg-indigo-600 h-12 px-8"
                >
                  {currentQuestionIndex === totalQuestions - 1 ? (
                    <>
                      Finish Quiz
                      <Sparkles className="w-4 h-4 ml-2" />
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}