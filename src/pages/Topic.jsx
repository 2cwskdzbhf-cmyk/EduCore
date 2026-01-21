import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ChevronLeft, 
  ChevronRight, 
  BookOpen, 
  Trophy,
  CheckCircle2,
  Play,
  Clock,
  Zap,
  FileText
} from 'lucide-react';

export default function TopicPage() {
  const [user, setUser] = useState(null);
  const urlParams = new URLSearchParams(window.location.search);
  const topicId = urlParams.get('id');

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    fetchUser();
  }, []);

  const { data: topic, isLoading: loadingTopic } = useQuery({
    queryKey: ['topic', topicId],
    queryFn: async () => {
      if (!topicId) return null;
      const topics = await base44.entities.Topic.filter({ id: topicId });
      return topics[0] || null;
    },
    enabled: !!topicId
  });

  const { data: subject } = useQuery({
    queryKey: ['subject', topic?.subject_id],
    queryFn: async () => {
      if (!topic?.subject_id) return null;
      const subjects = await base44.entities.Subject.filter({ id: topic.subject_id });
      return subjects[0] || null;
    },
    enabled: !!topic?.subject_id
  });

  const { data: lessons = [], isLoading: loadingLessons } = useQuery({
    queryKey: ['lessons', topicId],
    queryFn: async () => {
      if (!topicId) return [];
      return base44.entities.Lesson.filter({ topic_id: topicId }, 'order');
    },
    enabled: !!topicId
  });

  const { data: quizzes = [] } = useQuery({
    queryKey: ['quizzes', topicId],
    queryFn: async () => {
      if (!topicId) return [];
      const quizzesData = await base44.entities.Quiz.filter({ topic_id: topicId });
      
      // Fetch questions for each quiz to get accurate count
      const quizzesWithQuestions = await Promise.all(
        quizzesData.map(async (quiz) => {
          if (quiz.question_ids && quiz.question_ids.length > 0) {
            const questions = await base44.entities.Question.filter({ 
              id: { $in: quiz.question_ids } 
            });
            return { ...quiz, questions };
          }
          return { ...quiz, questions: [] };
        })
      );
      
      return quizzesWithQuestions;
    },
    enabled: !!topicId
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

  const isLessonCompleted = (lessonId) => {
    return progress?.completed_lessons?.includes(lessonId);
  };

  const completedLessonsCount = lessons.filter(l => isLessonCompleted(l.id)).length;
  const overallProgress = lessons.length > 0 ? (completedLessonsCount / lessons.length) * 100 : 0;

  if (!topicId) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-4">Topic not found</h1>
          <Link to={createPageUrl('StudentDashboard')}>
            <Button>Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <Link 
            to={subject ? createPageUrl(`Subject?id=${subject.id}`) : createPageUrl('StudentDashboard')} 
            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-4 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Back to {subject?.name || 'Subject'}
          </Link>
          
          {loadingTopic ? (
            <Skeleton className="h-10 w-64" />
          ) : (
            <>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-slate-900">{topic?.name}</h1>
                <span className={`text-sm px-3 py-1 rounded-full ${
                  topic?.difficulty_level === 'beginner' ? 'bg-green-100 text-green-700' :
                  topic?.difficulty_level === 'intermediate' ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {topic?.difficulty_level}
                </span>
              </div>
              <p className="text-slate-500">{topic?.description}</p>
            </>
          )}

          {/* Progress Bar */}
          <div className="mt-6 bg-slate-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Topic Progress</span>
              <span className="text-sm font-bold text-slate-800">{Math.round(overallProgress)}%</span>
            </div>
            <Progress value={overallProgress} className="h-3" />
            <p className="text-sm text-slate-500 mt-2">
              {completedLessonsCount} of {lessons.length} lessons completed
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Lessons List */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-500" />
              Lessons
            </h2>

            {loadingLessons ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </div>
            ) : lessons.length > 0 ? (
              <div className="space-y-3">
                {lessons.map((lesson, index) => {
                  const completed = isLessonCompleted(lesson.id);
                  
                  return (
                    <motion.div
                      key={lesson.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link to={createPageUrl(`Lesson?id=${lesson.id}`)}>
                        <div className={`bg-white rounded-xl border p-5 hover:shadow-md transition-all cursor-pointer ${
                          completed ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-100'
                        }`}>
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              completed 
                                ? 'bg-emerald-500 text-white' 
                                : 'bg-slate-100 text-slate-500'
                            }`}>
                              {completed ? (
                                <CheckCircle2 className="w-5 h-5" />
                              ) : (
                                <span className="font-bold">{index + 1}</span>
                              )}
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-slate-800">{lesson.title}</h3>
                              <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  {lesson.duration_minutes || 5} min
                                </span>
                                <span className="flex items-center gap-1">
                                  <Zap className="w-3.5 h-3.5" />
                                  +{lesson.xp_reward || 10} XP
                                </span>
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-400" />
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-xl border border-slate-100">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="font-semibold text-slate-700 mb-2">No lessons yet</h3>
                <p className="text-slate-500 text-sm">Lessons will appear here once created.</p>
              </div>
            )}
          </div>

          {/* Sidebar - Quizzes */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Quizzes
            </h2>

            {quizzes.length > 0 ? (
              <div className="space-y-3">
                {quizzes.map((quiz, index) => (
                  <motion.div
                    key={quiz.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link to={createPageUrl(`Quiz?id=${quiz.id}`)}>
                      <div className="bg-white rounded-xl border border-slate-100 p-5 hover:shadow-md transition-all cursor-pointer">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            quiz.difficulty === 'easy' ? 'bg-green-100 text-green-600' :
                            quiz.difficulty === 'medium' ? 'bg-amber-100 text-amber-600' :
                            'bg-red-100 text-red-600'
                          }`}>
                            <Trophy className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-800 text-sm">{quiz.title}</h3>
                            <p className="text-xs text-slate-500">{quiz.questions?.length || 0} questions</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            quiz.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                            quiz.difficulty === 'medium' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {quiz.difficulty}
                          </span>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            +{quiz.xp_reward || 20} XP
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-white rounded-xl border border-slate-100">
                <Trophy className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">No quizzes available yet</p>
              </div>
            )}

            {/* AI Tutor Card */}
            <motion.div
              className="mt-6 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-5 text-white"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="font-semibold mb-2">Stuck on something?</h3>
              <p className="text-purple-100 text-sm mb-4">
                Ask the AI tutor for help with this topic.
              </p>
              <Link to={createPageUrl(`AITutor?topic=${topicId}`)}>
                <Button className="w-full bg-white text-indigo-600 hover:bg-indigo-50">
                  Get Help
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}