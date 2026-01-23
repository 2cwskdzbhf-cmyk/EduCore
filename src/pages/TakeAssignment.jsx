import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import GlassCard from '@/components/ui/GlassCard';
import { markWrittenAnswer, markWrittenWorking, calculateWrittenQuestionScore } from '@/components/utils/writtenAnswerMarking';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Send,
  Clock
} from 'lucide-react';

export default function TakeAssignment() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const assignmentId = urlParams.get('id');
  
  const [user, setUser] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [workings, setWorkings] = useState({});
  const [startTime] = useState(Date.now());

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

  const { data: quizSet } = useQuery({
    queryKey: ['quizSet', assignment?.quiz_id],
    queryFn: async () => {
      if (!assignment?.quiz_id) return null;
      // Find quiz set by matching assignment title (as we created them together)
      const sets = await base44.entities.QuizSet.filter({ title: assignment.title });
      return sets[0] || null;
    },
    enabled: !!assignment?.quiz_id
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['quizQuestions', quizSet?.id],
    queryFn: async () => {
      if (!quizSet?.id) return [];
      return base44.entities.QuizQuestion.filter({ quiz_set_id: quizSet.id }, 'order');
    },
    enabled: !!quizSet?.id
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user?.email || !assignment) return;

      let totalScore = 0;
      const results = [];

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const questionType = q.question_type || 'multiple_choice';

        let isCorrect = false;
        let score = 0;

        if (questionType === 'multiple_choice') {
          const selectedIndex = answers[i];
          isCorrect = selectedIndex === q.correct_index;
          score = isCorrect ? 1 : 0;
        } else if (questionType === 'written') {
          const studentAnswer = answers[i] || '';
          const studentWorking = workings[i] || '';

          const answerResult = markWrittenAnswer(studentAnswer, q.answer_keywords || []);
          
          let workingResult = { isValid: true, matchedKeywords: [] };
          if (q.require_working) {
            workingResult = markWrittenWorking(studentWorking, q.working_keywords || [], true);
          }

          score = calculateWrittenQuestionScore(answerResult, workingResult, q.require_working);
          isCorrect = score > 0;

          results.push({
            questionId: q.id,
            studentAnswer,
            studentWorking,
            isAnswerCorrect: answerResult.isCorrect,
            matchedAnswerKeywords: answerResult.matchedKeywords,
            isWorkingValid: workingResult.isValid,
            matchedWorkingKeywords: workingResult.matchedKeywords
          });
        }

        totalScore += score;
      }

      const percentage = (totalScore / questions.length) * 100;

      await base44.entities.AssignmentSubmission.create({
        assignment_id: assignment.id,
        student_email: user.email,
        class_id: assignment.class_id,
        status: 'graded',
        score: totalScore,
        max_score: questions.length,
        percentage: Math.round(percentage),
        submitted_at: new Date().toISOString(),
        graded_at: new Date().toISOString()
      });

      return { totalScore, maxScore: questions.length, percentage };
    },
    onSuccess: () => {
      navigate(createPageUrl(`StudentClassDetail?classId=${assignment.class_id}`));
    }
  });

  if (!assignment || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const questionType = currentQuestion?.question_type || 'multiple_choice';

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const setAnswer = (value) => {
    setAnswers({ ...answers, [currentQuestionIndex]: value });
  };

  const setWorking = (value) => {
    setWorkings({ ...workings, [currentQuestionIndex]: value });
  };

  const isAllAnswered = questions.every((q, idx) => {
    const qType = q.question_type || 'multiple_choice';
    if (qType === 'multiple_choice') {
      return answers[idx] !== undefined;
    } else if (qType === 'written') {
      const hasAnswer = answers[idx]?.trim() !== undefined && answers[idx]?.trim() !== '';
      if (q.require_working) {
        const hasWorking = workings[idx]?.trim() !== undefined && workings[idx]?.trim() !== '';
        return hasAnswer && hasWorking;
      }
      return hasAnswer;
    }
    return false;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(createPageUrl(`StudentClassDetail?classId=${assignment.class_id}`))}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ChevronLeft className="w-5 h-5" />
            Back to Class
          </button>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">{assignment.title}</h1>
                <p className="text-slate-400 text-sm">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </p>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Clock className="w-5 h-5" />
                <span className="text-sm">
                  {Math.floor((Date.now() - startTime) / 60000)} min
                </span>
              </div>
            </div>
            <Progress value={progress} className="h-2" />
          </GlassCard>
        </div>

        {/* Question */}
        <GlassCard className="p-8 mb-6">
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-6">
              <h2 className="text-lg font-bold text-white mb-4">{currentQuestion.prompt}</h2>
            </div>

            {/* Multiple Choice */}
            {questionType === 'multiple_choice' && (
              <div className="space-y-3">
                {currentQuestion.options?.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => setAnswer(idx)}
                    className={`
                      w-full p-4 rounded-xl text-left transition-all
                      ${answers[currentQuestionIndex] === idx
                        ? 'bg-purple-500 text-white border border-purple-400 shadow-lg shadow-purple-500/30'
                        : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold">{String.fromCharCode(65 + idx)}</span>
                      <span>{option}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Written Answer */}
            {questionType === 'written' && (
              <div className="space-y-4">
                <div>
                  <label className="text-white text-sm font-medium mb-2 block">Your Answer</label>
                  <Input
                    placeholder="Type your answer..."
                    value={answers[currentQuestionIndex] || ''}
                    onChange={(e) => setAnswer(e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>

                {currentQuestion.require_working && (
                  <div>
                    <label className="text-white text-sm font-medium mb-2 block">
                      Explanation / Working *
                    </label>
                    <Textarea
                      placeholder="Show your working or explain your answer..."
                      value={workings[currentQuestionIndex] || ''}
                      onChange={(e) => setWorking(e.target.value)}
                      className="bg-white/5 border-white/10 text-white min-h-[120px]"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      Explain how you arrived at your answer
                    </p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </GlassCard>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          {currentQuestionIndex === questions.length - 1 ? (
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={!isAllAnswered || submitMutation.isPending}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/30"
            >
              {submitMutation.isPending ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Assignment
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 shadow-lg shadow-purple-500/30"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>

        {/* Question Navigation Dots */}
        <div className="flex justify-center gap-2 mt-6">
          {questions.map((_, idx) => {
            const qType = questions[idx].question_type || 'multiple_choice';
            const isAnswered = qType === 'multiple_choice' 
              ? answers[idx] !== undefined
              : (answers[idx]?.trim() && (!questions[idx].require_working || workings[idx]?.trim()));
            
            return (
              <button
                key={idx}
                onClick={() => setCurrentQuestionIndex(idx)}
                className={`
                  w-8 h-8 rounded-full transition-all
                  ${idx === currentQuestionIndex
                    ? 'bg-purple-500 scale-110'
                    : isAnswered
                      ? 'bg-emerald-500'
                      : 'bg-white/10'
                  }
                `}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}