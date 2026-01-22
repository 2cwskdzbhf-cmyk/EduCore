import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import GlassCard from '@/components/ui/GlassCard';
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Trophy,
  CheckCircle2,
  Clock,
  FileText
} from 'lucide-react';

export default function TopicPage() {
  const [user, setUser] = useState(null);
  const urlParams = new URLSearchParams(window.location.search);

  const topicIdFromUrl =
    urlParams.get('id') ||
    urlParams.get('topicId') ||
    urlParams.get('topic_id') ||
    urlParams.get('topic');

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    fetchUser();
  }, []);

  const { data: topic, isLoading: loadingTopic } = useQuery({
    queryKey: ['topic', topicIdFromUrl],
    queryFn: async () => {
      if (!topicIdFromUrl) return null;
      const topics = await base44.entities.Topic.filter({ id: topicIdFromUrl });
      return topics[0] || null;
    },
    enabled: !!topicIdFromUrl
  });

  const topicId = topic?.id || topicIdFromUrl;

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
    queryKey: ['quizzes', topicId, lessons.map(l => l.id).join(',')],
    queryFn: async () => {
      if (!topicId) return [];

      let quizzesData = await base44.entities.Quiz.filter({ topic_id: topicId });

      if (!Array.isArray(quizzesData) || quizzesData.length === 0) {
        const lessonIds = lessons.map(l => l.id).filter(Boolean);
        if (lessonIds.length > 0) {
          const fallback = await base44.entities.Quiz.filter({
            lesson_id: { $in: lessonIds }
          });
          quizzesData = Array.isArray(fallback) ? fallback : [];
        } else {
          quizzesData = [];
        }
      }

      const quizzesWithQuestions = await Promise.all(
        (quizzesData || []).map(async (quiz) => {
          let questions = [];

          if (quiz.lesson_id) {
            questions = await base44.entities.Question.filter({ lesson_id: quiz.lesson_id });
          }

          if (!questions || questions.length === 0) {
            const ids = quiz.question_ids || quiz.questions || [];
            if (Array.isArray(ids) && ids.length > 0) {
              const byIds = await base44.entities.Question.filter({ id: { $in: ids } });
              questions = Array.isArray(byIds) ? byIds : [];
            }
          }

          return { ...quiz, questions: questions || [] };
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

  // Deduplicate lessons by stable ID
  const seenIds = new Set();
  const uniqueLessons = lessons.filter(lesson => {
    const id = lesson.id || lesson.lesson_id || lesson._id || lesson.ref;
    if (!id || seenIds.has(id)) return false;
    seenIds.add(id);
    return true;
  });

  const completedLessonsCount = uniqueLessons.filter((l) => isLessonCompleted(l.id)).length;
  const overallProgress = uniqueLessons.length > 0 ? (completedLessonsCount / uniqueLessons.length) * 100 : 0;

  if (!topicIdFromUrl) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Topic not found</h1>
          <Link to={createPageUrl('StudentDashboard')}>
            <Button className="bg-gradient-to-r from-purple-500 to-blue-500">Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link
            to={subject ? createPageUrl(`Subject?id=${subject.id}`) : createPageUrl('StudentDashboard')}
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Back to {subject?.name || 'Subject'}
          </Link>

          {loadingTopic ? (
            <Skeleton className="h-10 w-64 bg-white/5" />
          ) : (
            <>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-white">{topic?.name}</h1>
                <span
                  className={`text-sm px-3 py-1 rounded-full ${
                    topic?.difficulty_level === 'foundation'
                      ? 'bg-green-500/20 text-green-400'
                      : topic?.difficulty_level === 'intermediate'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {topic?.difficulty_level}
                </span>
              </div>
              <p className="text-slate-400">{topic?.description}</p>
            </>
          )}

          <GlassCard className="mt-6 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-400">Topic Progress</span>
              <span className="text-sm font-bold text-white">{Math.round(overallProgress)}%</span>
            </div>
            <Progress value={overallProgress} className="h-3" />
            <p className="text-sm text-slate-500 mt-2">
              {completedLessonsCount} of {uniqueLessons.length} lessons completed
            </p>
          </GlassCard>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-400" />
              Lessons
            </h2>

            {loadingLessons ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 rounded-xl bg-white/5" />
                ))}
              </div>
            ) : uniqueLessons.length > 0 ? (
              <div className="space-y-3">
                {uniqueLessons.map((lesson, index) => {
                  const completed = isLessonCompleted(lesson.id);

                  return (
                    <motion.div
                      key={lesson.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                    >
                      <Link to={createPageUrl(`Lesson?id=${lesson.id}`)}>
                        <GlassCard className={`p-5 hover:scale-[1.02] ${
                          completed ? 'border-emerald-500/30 shadow-emerald-500/20' : ''
                        }`}>
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${
                                completed 
                                  ? 'bg-emerald-500 text-white shadow-emerald-500/50' 
                                  : 'bg-white/10 text-slate-400'
                              }`}
                            >
                              {completed ? (
                                <CheckCircle2 className="w-5 h-5" />
                              ) : (
                                <span className="font-bold">{index + 1}</span>
                              )}
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-white">{lesson.title}</h3>
                              <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  {lesson.duration_minutes || 5} min
                                </span>
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-500" />
                          </div>
                        </GlassCard>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <GlassCard className="p-12 text-center">
                <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="font-semibold text-white mb-2">No lessons yet</h3>
                <p className="text-slate-400 text-sm">Lessons will appear here once created.</p>
              </GlassCard>
            )}
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              Quizzes
            </h2>

            {quizzes.length > 0 ? (
              <div className="space-y-3">
                {quizzes.map((quiz, index) => (
                  <motion.div
                    key={quiz.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.3 }}
                  >
                    <Link to={quiz.lesson_id ? createPageUrl(`Lesson?id=${quiz.lesson_id}`) : createPageUrl(`PracticeQuizPlay?topicId=${topicId}&count=10`)}>
                      <GlassCard className="p-5 hover:scale-[1.02]">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                            <Trophy className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white text-sm">{quiz.title}</h3>
                            <p className="text-xs text-slate-400">{quiz.questions?.length || 0} questions</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              quiz.difficulty === 'easy'
                                ? 'bg-green-500/20 text-green-400'
                                : quiz.difficulty === 'medium'
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {quiz.difficulty}
                          </span>
                          <span className="text-xs text-slate-500">Practice</span>
                        </div>
                      </GlassCard>
                    </Link>
                  </motion.div>
                ))}
              </div>
            ) : (
              <GlassCard className="p-8 text-center">
                <Trophy className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <p className="text-sm text-slate-400">No quizzes available yet</p>
              </GlassCard>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <GlassCard className="mt-6 p-6">
                <h3 className="font-semibold mb-2 text-white">Need Help?</h3>
                <p className="text-slate-400 text-sm mb-4">Ask the AI tutor for help with this topic.</p>
                <Link to={createPageUrl(`AITutor?topic=${topicId}`)}>
                  <Button className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 shadow-lg shadow-purple-500/30">
                    Get Help
                  </Button>
                </Link>
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}