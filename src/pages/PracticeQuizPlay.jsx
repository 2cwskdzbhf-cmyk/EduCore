import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import GlassCard from '@/components/ui/GlassCard';
import { AnswerChecker } from '@/components/practice/AnswerChecker';
import {
  CheckCircle2,
  XCircle,
  Flame,
  ChevronRight,
  Timer
} from 'lucide-react';

export default function PracticeQuizPlay() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const lessonId = urlParams.get('lessonId');
  const topicId = urlParams.get('topicId');
  const count = parseInt(urlParams.get('count') || '10');
  
  const [user, setUser] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [streak, setStreak] = useState(0);
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const [results, setResults] = useState([]);
  const [startTime, setStartTime] = useState(Date.now());
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [showAnswer, setShowAnswer] = useState(false);
  
  const inputRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
      
      // Fetch questions
      // Check if lesson is read (gating)
      if (lessonId) {
        const readProgress = await base44.entities.LessonReadProgress.filter({
          student_email: userData.email,
          lesson_id: lessonId
        });
        
        if (readProgress.length === 0 || !readProgress[0].read_confirmed_at) {
          // Redirect to lesson page with lock message
          navigate(createPageUrl(`Lesson?id=${lessonId}`));
          return;
        }
      }

      const filter = lessonId 
        ? { lesson_id: lessonId, is_active: true }
        : { topic_id: topicId, is_active: true };
      
      let allQuestions = await base44.entities.QuestionBankItem.filter(filter);
      
      // Shuffle and limit
      allQuestions = allQuestions.sort(() => Math.random() - 0.5).slice(0, count);
      
      setQuestions(allQuestions);
      setLoading(false);
      setQuestionStartTime(Date.now());
    };
    
    init();
  }, [lessonId, topicId, count]);

  useEffect(() => {
    if (feedback === null && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentIndex, feedback]);

  const handleSubmit = async () => {
    if (!userAnswer.trim() || !questions[currentIndex]) return;
    
    const question = questions[currentIndex];
    const isCorrect = AnswerChecker.checkAnswer(
      userAnswer,
      question.correct_answer,
      question.allowed_forms
    );
    
    const timeTaken = Date.now() - questionStartTime;
    
    setAttempts(attempts + 1);
    
    if (isCorrect) {
      setFeedback('correct');
      setStreak(streak + 1);
      
      // Save attempt
      await base44.entities.PracticeAttempt.create({
        student_email: user.email,
        lesson_id: lessonId,
        topic_id: topicId || question.topic_id,
        question_id: question.id,
        submitted_answer: userAnswer,
        is_correct: true,
        attempts_count: attempts + 1,
        time_to_answer_ms: timeTaken,
        session_id: sessionId
      });
      
      setResults([...results, {
        question,
        isCorrect: true,
        attempts: attempts + 1,
        timeTaken
      }]);
      
      // Auto advance after animation
      setTimeout(() => {
        if (currentIndex < questions.length - 1) {
          setCurrentIndex(currentIndex + 1);
          setUserAnswer('');
          setFeedback(null);
          setAttempts(0);
          setShowAnswer(false);
          setQuestionStartTime(Date.now());
        } else {
          finishQuiz();
        }
      }, 1500);
    } else {
      setFeedback('incorrect');
      setStreak(0);
    }
  };

  const handleShowAnswer = () => {
    setShowAnswer(true);
    const question = questions[currentIndex];
    
    setResults([...results, {
      question,
      isCorrect: false,
      attempts: attempts + 1,
      timeTaken: Date.now() - questionStartTime
    }]);
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setUserAnswer('');
      setFeedback(null);
      setAttempts(0);
      setShowAnswer(false);
      setQuestionStartTime(Date.now());
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    const totalTime = Date.now() - startTime;
    const correct = results.filter(r => r.isCorrect).length;
    const accuracy = (correct / questions.length) * 100;
    
    // Update student progress
    const progressList = await base44.entities.StudentProgress.filter({
      student_email: user.email
    });
    
    if (progressList.length > 0) {
      const progress = progressList[0];
      const totalAnswered = (progress.total_questions_answered || 0) + questions.length;
      const totalCorrect = (progress.total_correct_answers || 0) + correct;
      const newAccuracy = (totalCorrect / totalAnswered) * 100;
      
      await base44.entities.StudentProgress.update(progress.id, {
        total_questions_answered: totalAnswered,
        total_correct_answers: totalCorrect,
        accuracy_percent: newAccuracy,
        quizzes_completed: (progress.quizzes_completed || 0) + 1,
        last_activity_date: new Date().toISOString().split('T')[0]
      });
    }
    
    navigate(createPageUrl(`PracticeQuizResults?session=${sessionId}&accuracy=${Math.round(accuracy)}&time=${totalTime}&lesson=${lessonId || ''}&topic=${topicId || ''}`));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-purple-500/50" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6 flex items-center justify-center">
        <GlassCard className="p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold text-white mb-4">No Questions Available</h2>
          <p className="text-slate-400 mb-6">There are no practice questions for this lesson yet.</p>
          <Button onClick={() => navigate(-1)} className="bg-gradient-to-r from-purple-500 to-blue-500">
            Go Back
          </Button>
        </GlassCard>
      </div>
    );
  }

  const question = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Progress Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-white">
                Question {currentIndex + 1} / {questions.length}
              </span>
              {streak > 0 && (
                <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-orange-500/20">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="text-sm font-bold text-orange-400">{streak}</span>
                </div>
              )}
            </div>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </motion.div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <GlassCard className="p-8">
              <h2 className="text-2xl font-bold text-white mb-8">{question.prompt}</h2>

              {/* Answer Input */}
              <div className="mb-6">
                <Input
                  ref={inputRef}
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !feedback) {
                      handleSubmit();
                    }
                  }}
                  placeholder="Type your answer..."
                  disabled={feedback === 'correct' || showAnswer}
                  className={`text-2xl h-16 text-center bg-white/5 border-white/20 text-white placeholder:text-slate-500 ${
                    feedback === 'incorrect' ? 'animate-shake border-red-500' : ''
                  } ${feedback === 'correct' ? 'border-emerald-500' : ''}`}
                />
              </div>

              {/* Feedback */}
              <AnimatePresence>
                {feedback === 'correct' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="mb-6 p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center gap-3"
                  >
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    <div>
                      <p className="font-bold text-emerald-400">Correct!</p>
                      {question.explanation && (
                        <p className="text-sm text-slate-300 mt-1">{question.explanation}</p>
                      )}
                    </div>
                  </motion.div>
                )}

                {feedback === 'incorrect' && !showAnswer && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-6 p-4 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center gap-3"
                  >
                    <XCircle className="w-6 h-6 text-red-400" />
                    <p className="font-bold text-red-400">Try again</p>
                  </motion.div>
                )}

                {showAnswer && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 rounded-xl bg-blue-500/20 border border-blue-500/30"
                  >
                    <p className="font-bold text-blue-400 mb-2">Answer:</p>
                    <p className="text-2xl text-white mb-3">{question.correct_answer}</p>
                    {question.explanation && (
                      <p className="text-sm text-slate-300">{question.explanation}</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Actions */}
              <div className="flex gap-3">
                {!feedback && !showAnswer && (
                  <>
                    <Button
                      onClick={handleSubmit}
                      disabled={!userAnswer.trim()}
                      className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 text-lg h-12"
                    >
                      Check Answer
                    </Button>
                    {attempts >= 2 && (
                      <Button
                        onClick={handleShowAnswer}
                        variant="outline"
                        className="border-white/20 text-slate-300 hover:bg-white/5"
                      >
                        Show Answer
                      </Button>
                    )}
                  </>
                )}

                {(feedback === 'incorrect' && !showAnswer) && (
                  <Button
                    onClick={() => {
                      setFeedback(null);
                      setUserAnswer('');
                    }}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 text-lg h-12"
                  >
                    Try Again
                  </Button>
                )}

                {showAnswer && (
                  <Button
                    onClick={handleNext}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 text-lg h-12"
                  >
                    Next Question
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                )}
              </div>

              {question.hint && !showAnswer && (
                <div className="mt-4 p-3 rounded-lg bg-white/5">
                  <p className="text-sm text-slate-400">
                    <span className="font-semibold">Hint:</span> {question.hint}
                  </p>
                </div>
              )}
            </GlassCard>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}