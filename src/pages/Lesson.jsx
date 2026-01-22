import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import ReactMarkdown from 'react-markdown';
import {
  ChevronLeft,
  Clock,
  Zap,
  CheckCircle2,
  ArrowRight,
  MessageSquare,
  Trophy
} from 'lucide-react';

function ProgressBar({ value = 0, className = '' }) {
  const safe = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  return (
    <div className={`w-full rounded-full bg-slate-200/70 overflow-hidden ${className}`}>
      <div
        className="h-full rounded-full bg-indigo-500 transition-all duration-300 ease-out"
        style={{ width: `${safe}%` }}
      />
    </div>
  );
}

export default function LessonPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);

  const lessonId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        console.warn('Failed to fetch user:', e);
      }
    };
    fetchUser();
  }, []);

  const { data: lesson, isLoading: loadingLesson } = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: async () => {
      if (!lessonId) return null;
      const lessons = await base44.entities.Lesson.filter({ id: lessonId });
      return lessons?.[0] || null;
    },
    enabled: !!lessonId
  });

  const { data: topic } = useQuery({
    queryKey: ['topic', lesson?.topic_id],
    queryFn: async () => {
      if (!lesson?.topic_id) return null;
      const topics = await base44.entities.Topic.filter({ id: lesson.topic_id });
      return topics?.[0] || null;
    },
    enabled: !!lesson?.topic_id
  });

  const { data: allLessons = [] } = useQuery({
    queryKey: ['topicLessons', lesson?.topic_id],
    queryFn: async () => {
      if (!lesson?.topic_id) return [];
      return base44.entities.Lesson.filter({ topic_id: lesson.topic_id }, 'order');
    },
    enabled: !!lesson?.topic_id
  });

  const { data: quizzes = [] } = useQuery({
    queryKey: ['lessonQuizzes', lessonId],
    queryFn: async () => {
      if (!lessonId) return [];
      return base44.entities.Quiz.filter({ lesson_id: lessonId });
    },
    enabled: !!lessonId
  });

  const { data: progress } = useQuery({
    queryKey: ['studentProgress', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const progressList = await base44.entities.StudentProgress.filter({ student_email: user.email });
      return progressList?.[0] || null;
    },
    enabled: !!user?.email
  });

  const completeLessonMutation = useMutation({
    mutationFn: async () => {
      if (!progress || !lesson) return;

      const completedLessons = progress.completed_lessons || [];
      if (completedLessons.includes(lessonId)) return;

      const xpEarned = lesson.xp_reward || 10;
      const newTotalXp = (progress.total_xp || 0) + xpEarned;
      const newTodayXp = (progress.today_xp || 0) + xpEarned;

      let newLevel = progress.level || 1;
      while (newTotalXp >= newLevel * 100) {
        newLevel++;
      }

      const topicMastery = { ...(progress.topic_mastery || {}) };
      const topicLessons = allLessons.length || 1;
      const completedTopicLessons =
        completedLessons.filter(l => allLessons.some(al => al.id === l)).length + 1;
      topicMastery[lesson.topic_id] = Math.round((completedTopicLessons / topicLessons) * 100);

      await base44.entities.StudentProgress.update(progress.id, {
        completed_lessons: [...completedLessons, lessonId],
        total_xp: newTotalXp,
        today_xp: newTodayXp,
        level: newLevel,
        topic_mastery: topicMastery,
        last_activity_date: new Date().toISOString().split('T')[0]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['studentProgress']);
    }
  });

  const currentLessonIndex = allLessons.findIndex(l => l.id === lessonId);
  const nextLesson = currentLessonIndex >= 0 ? allLessons[currentLessonIndex + 1] : null;
  const isCompleted = progress?.completed_lessons?.includes(lessonId);

  const handleComplete = async () => {
    await completeLessonMutation.mutateAsync();

    if (quizzes.length > 0) {
      navigate(createPageUrl(`Quiz?id=${quizzes[0].id}`));
    } else if (nextLesson) {
      navigate(createPageUrl(`Lesson?id=${nextLesson.id}`));
    } else if (lesson?.topic_id) {
      navigate(createPageUrl(`Topic?id=${lesson.topic_id}`));
    } else {
      navigate(createPageUrl('StudentDashboard'));
    }
  };

  if (!lessonId || loadingLesson) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-3xl mx-auto">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-100 p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Lesson not found</h1>
          <p className="text-slate-600 mb-6">
            This lesson link doesn't have a valid id, or the lesson was deleted.
          </p>
          <Button onClick={() => navigate(createPageUrl('StudentDashboard'))}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const progressValue =
    allLessons.length > 0
      ? ((currentLessonIndex + (isCompleted ? 1 : 0)) / allLessons.length) * 100
      : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link
              to={topic ? createPageUrl(`Topic?id=${topic.id}`) : createPageUrl('StudentDashboard')}
              className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back to {topic?.name || 'Topic'}</span>
            </Link>

            <div className="flex items-center gap-4">
              {allLessons.length > 1 && (
                <span className="text-sm text-slate-500">
                  Lesson {Math.max(0, currentLessonIndex) + 1} of {allLessons.length}
                </span>
              )}
              {isCompleted && (
                <span className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Completed
                </span>
              )}
            </div>
          </div>

          <ProgressBar value={progressValue} className="h-1 mt-4" />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-4">{lesson.title}</h1>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {lesson.duration_minutes || 5} min read
              </span>
              <span className="flex items-center gap-1">
                <Zap className="w-4 h-4 text-amber-500" />
                +{lesson.xp_reward || 10} XP
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
            <div className="prose prose-slate max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-2xl font-bold text-slate-900 mt-8 mb-4">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-xl font-bold text-slate-800 mt-6 mb-3">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-lg font-semibold text-slate-800 mt-5 mb-2">{children}</h3>
                  ),
                  p: ({ children }) => (
                    <p className="text-slate-600 leading-relaxed mb-4">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc pl-6 mb-4 space-y-2 text-slate-600">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal pl-6 mb-4 space-y-2 text-slate-600">{children}</ol>
                  ),
                  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                  code: ({ children }) => (
                    <code className="bg-slate-100 px-2 py-1 rounded text-indigo-600 text-sm">
                      {children}
                    </code>
                  ),
                  pre: ({ children }) => (
                    <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto mb-4">
                      {children}
                    </pre>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-indigo-500 pl-4 italic text-slate-600 my-4">
                      {children}
                    </blockquote>
                  )
                }}
              >
                {lesson.content || 'No content available for this lesson.'}
              </ReactMarkdown>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link to={createPageUrl(`AITutor?topic=${lesson.topic_id}`)}>
              <Button variant="outline" className="w-full sm:w-auto">
                <MessageSquare className="w-4 h-4 mr-2" />
                Ask AI Tutor
              </Button>
            </Link>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {quizzes.length > 0 ? (
                <Button
                  className="flex-1 sm:flex-none bg-amber-500 hover:bg-amber-600"
                  onClick={handleComplete}
                  disabled={completeLessonMutation.isPending}
                >
                  {completeLessonMutation.isPending ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Trophy className="w-4 h-4 mr-2" />
                      Take Quiz
                    </>
                  )}
                </Button>
              ) : nextLesson ? (
                <Button
                  className="flex-1 sm:flex-none bg-indigo-500 hover:bg-indigo-600"
                  onClick={handleComplete}
                  disabled={completeLessonMutation.isPending}
                >
                  {completeLessonMutation.isPending ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Next Lesson
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  className="flex-1 sm:flex-none bg-emerald-500 hover:bg-emerald-600"
                  onClick={handleComplete}
                  disabled={completeLessonMutation.isPending}
                >
                  {completeLessonMutation.isPending ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Complete Topic
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}