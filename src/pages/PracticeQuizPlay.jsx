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
      
      // Fetch questions - NO GATING
      let allQuestions = [];
      
      if (lessonId) {
        allQuestions = await base44.entities.QuestionBankItem.filter({ 
          lesson_id: lessonId, 
          is_active: true 
        });
        
        // If fewer than requested, optionally fill from topic
        if (allQuestions.length < count && topicId) {
          const topicQuestions = await base44.entities.QuestionBankItem.filter({
            topic_id: topicId,
            is_active: true
          });
          const additionalNeeded = count - allQuestions.length;
          const additional = topicQuestions
            .filter(q => !allQuestions.some(aq => aq.id === q.id))
            .slice(0, additionalNeeded);
          allQuestions = [...allQuestions, ...additional];
        }
      } else if (topicId) {
        allQuestions = await base44.entities.QuestionBankItem.filter({ 
          topic_id: topicId, 
          is_active: true 
        });
      }
      
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
    const cleanAnswer = userAnswer.trim();
    
    // Validate input first
    if (cleanAnswer.includes('/')) {
      const parts = cleanAnswer.split('/');
      if (parts.length === 2) {
        const den = parseFloat(parts[1]);
        if (den === 0 || isNaN(den)) {
          setFeedback('invalid');
          return;
        }
      }
    }
    
    const isCorrect = AnswerChecker.checkAnswer(
      cleanAnswer,
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
        submitted_answer: cleanAnswer,
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
        <GlassCard className="p-12 text-center max-w-lg">
          <XCircle className="w-20 h-20 text-amber-400 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-white mb-3">No Questions Yet</h2>
          <p className="text-slate-300 mb-8 leading-relaxed">
            This lesson doesn't have practice questions yet. Your teacher will add them soon, or you can go back and try another lesson.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={() => lessonId ? navigate(createPageUrl(`Lesson?id=${lessonId}`)) : navigate(-1)} 
              variant="outline"
              className="flex-1 border-white/20 text-white hover:bg-white/10"
            >
              Back to Lesson
            </Button>
            <Button 
              onClick={() => navigate(createPageUrl('StudentDashboard'))} 
              className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500"
            >
              Go to Dashboard
            </Button>
          </div>
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
            <div className="flex items-center gap-4">
              <span className="text-xl font-bold text-white">
                {currentIndex + 1} / {questions.length}
              </span>
              {streak > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30"
                >
                  <Flame className="w-5 h-5 text-orange-400" />
                  <span className="text-lg font-bold text-orange-400">{streak} streak</span>
                </motion.div>
              )}
            </div>
          </div>
          <div className="h-2.5 bg-white/10 rounded-full overflow-hidden shadow-inner">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 shadow-lg shadow-purple-500/50"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </motion.div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <GlassCard className={`p-8 md:p-12 transition-all ${
              feedback === 'correct' ? 'shadow-2xl shadow-emerald-500/30' : ''
            }`}>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-10 text-center">{question.prompt}</h2>

              {/* Answer Input */}
              <div className="mb-8">
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
                  className={`text-3xl h-20 text-center bg-white/5 border-2 text-white placeholder:text-slate-500 transition-all ${
                    feedback === 'incorrect' ? 'animate-shake border-red-500 shadow-lg shadow-red-500/50' : 'border-white/20'
                  } ${feedback === 'correct' ? 'border-emerald-500 shadow-2xl shadow-emerald-500/50' : ''} ${
                    feedback === 'invalid' ? 'border-amber-500 shadow-lg shadow-amber-500/50' : ''
                  }`}
                />
              </div>

              {/* Feedback */}
              <AnimatePresence>
                {feedback === 'correct' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="mb-8 p-6 rounded-xl bg-gradient-to-r from-emerald-500/30 to-teal-500/30 border-2 border-emerald-500/50 flex items-start gap-4"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1, rotate: [0, 360] }}
                      transition={{ delay: 0.1, duration: 0.5 }}
                    >
                      <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                    </motion.div>
                    <div>
                      <p className="text-2xl font-bold text-emerald-400 mb-2">Correct!</p>
                      {question.explanation && (
                        <p className="text-sm text-slate-200">{question.explanation}</p>
                      )}
                    </div>
                  </motion.div>
                )}

                {feedback === 'incorrect' && !showAnswer && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="mb-8 p-5 rounded-xl bg-red-500/20 border-2 border-red-500/50 flex items-center gap-3"
                  >
                    <XCircle className="w-8 h-8 text-red-400" />
                    <p className="text-xl font-bold text-red-400">Not quite - try again</p>
                  </motion.div>
                )}

                {feedback === 'invalid' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-8 p-5 rounded-xl bg-amber-500/20 border-2 border-amber-500/50"
                  >
                    <p className="text-amber-400 font-semibold">Try using a fraction like <span className="font-mono">3/4</span> or a decimal like <span className="font-mono">0.75</span></p>
                  </motion.div>
                )}

                {showAnswer && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 p-6 rounded-xl bg-blue-500/20 border-2 border-blue-500/50"
                  >
                    <p className="font-bold text-blue-400 mb-3 text-lg">Answer:</p>
                    <p className="text-3xl font-bold text-white mb-4">{question.correct_answer}</p>
                    {question.explanation && (
                      <p className="text-sm text-slate-200 leading-relaxed">{question.explanation}</p>
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
                      className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-lg h-14 font-semibold shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/50 transition-all"
                    >
                      Check Answer
                    </Button>
                    {attempts >= 2 && (
                      <Button
                        onClick={handleShowAnswer}
                        variant="outline"
                        className="border-white/20 text-slate-300 hover:bg-white/10 h-14"
                      >
                        Show Answer
                      </Button>
                    )}
                  </>
                )}

                {((feedback === 'incorrect' || feedback === 'invalid') && !showAnswer) && (
                  <Button
                    onClick={() => {
                      setFeedback(null);
                      setUserAnswer('');
                    }}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-lg h-14 font-semibold shadow-lg shadow-purple-500/30"
                  >
                    Try Again
                  </Button>
                )}

                {showAnswer && (
                  <Button
                    onClick={handleNext}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-lg h-14 font-semibold shadow-lg shadow-purple-500/30"
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