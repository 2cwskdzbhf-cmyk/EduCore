import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import GlassCard from '@/components/ui/GlassCard';
import ReactMarkdown from 'react-markdown';
import {
  ChevronLeft,
  Clock,
  CheckCircle2,
  ArrowRight,
  MessageSquare,
  Trophy,
  Lock,
  Timer
} from 'lucide-react';

export default function LessonPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [scrollPercent, setScrollPercent] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [canMarkAsRead, setCanMarkAsRead] = useState(false);
  const contentRef = useRef(null);
  const startTimeRef = useRef(Date.now());

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

  // Track scroll and time
  useEffect(() => {
    if (!lessonId || !user) return;

    const handleScroll = () => {
      if (!contentRef.current) return;
      const element = contentRef.current;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = element.scrollHeight - window.innerHeight;
      const percent = Math.min(100, Math.max(0, (scrollTop / scrollHeight) * 100));
      setScrollPercent(percent);
    };

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      setTimeSpent(elapsed);
    }, 1000);

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearInterval(timer);
    };
  }, [lessonId, user]);

  // Check if can mark as read
  useEffect(() => {
    const canMark = scrollPercent >= 80 && timeSpent >= 60000;
    setCanMarkAsRead(canMark);
  }, [scrollPercent, timeSpent]);

  // Initialize or update read progress
  useEffect(() => {
    const updateProgress = async () => {
      if (!lessonId || !user?.email) return;

      const progressList = await base44.entities.LessonReadProgress.filter({
        student_email: user.email,
        lesson_id: lessonId
      });

      if (progressList.length === 0) {
        await base44.entities.LessonReadProgress.create({
          student_email: user.email,
          lesson_id: lessonId,
          first_opened_at: new Date().toISOString(),
          percent_scrolled: scrollPercent,
          time_spent_ms: timeSpent,
          last_seen_at: new Date().toISOString()
        });
      } else {
        const progress = progressList[0];
        if (scrollPercent > (progress.percent_scrolled || 0) || timeSpent > (progress.time_spent_ms || 0)) {
          await base44.entities.LessonReadProgress.update(progress.id, {
            percent_scrolled: Math.max(scrollPercent, progress.percent_scrolled || 0),
            time_spent_ms: Math.max(timeSpent, progress.time_spent_ms || 0),
            last_seen_at: new Date().toISOString()
          });
        }
      }
    };

    const interval = setInterval(updateProgress, 10000); // Update every 10s
    return () => clearInterval(interval);
  }, [lessonId, user, scrollPercent, timeSpent]);

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

  const { data: progress } = useQuery({
    queryKey: ['studentProgress', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const progressList = await base44.entities.StudentProgress.filter({ student_email: user.email });
      return progressList?.[0] || null;
    },
    enabled: !!user?.email
  });

  const { data: readProgress } = useQuery({
    queryKey: ['lessonReadProgress', lessonId, user?.email],
    queryFn: async () => {
      if (!lessonId || !user?.email) return null;
      const progressList = await base44.entities.LessonReadProgress.filter({
        student_email: user.email,
        lesson_id: lessonId
      });
      return progressList[0] || null;
    },
    enabled: !!lessonId && !!user?.email
  });

  const { data: practiceQuestions = [] } = useQuery({
    queryKey: ['practiceQuestions', lessonId],
    queryFn: async () => {
      if (!lessonId) return [];
      return base44.entities.QuestionBankItem.filter({ lesson_id: lessonId, is_active: true });
    },
    enabled: !!lessonId
  });

  const markAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!lessonId || !user?.email) return;

      const progressList = await base44.entities.LessonReadProgress.filter({
        student_email: user.email,
        lesson_id: lessonId
      });

      if (progressList.length > 0) {
        await base44.entities.LessonReadProgress.update(progressList[0].id, {
          read_confirmed_at: new Date().toISOString(),
          percent_scrolled: 100,
          time_spent_ms: timeSpent
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['lessonReadProgress']);
    }
  });

  const completeLessonMutation = useMutation({
    mutationFn: async () => {
      if (!progress || !lesson) return;

      const completedLessons = progress.completed_lessons || [];
      if (completedLessons.includes(lessonId)) return;

      const topicMastery = { ...(progress.topic_mastery || {}) };
      const topicLessons = allLessons.length || 1;
      const completedTopicLessons =
        completedLessons.filter(l => allLessons.some(al => al.id === l)).length + 1;
      topicMastery[lesson.topic_id] = Math.round((completedTopicLessons / topicLessons) * 100);

      await base44.entities.StudentProgress.update(progress.id, {
        completed_lessons: [...completedLessons, lessonId],
        topic_mastery: topicMastery,
        lessons_completed: (progress.lessons_completed || 0) + 1,
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
  const isLessonRead = !!readProgress?.read_confirmed_at;
  const isPracticeUnlocked = isLessonRead;

  const handleComplete = async () => {
    await completeLessonMutation.mutateAsync();

    if (nextLesson) {
      navigate(createPageUrl(`Lesson?id=${nextLesson.id}`));
    } else if (lesson?.topic_id) {
      navigate(createPageUrl(`Topic?id=${lesson.topic_id}`));
    } else {
      navigate(createPageUrl('StudentDashboard'));
    }
  };

  if (!lessonId || loadingLesson) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
        <div className="max-w-3xl mx-auto">
          <Skeleton className="h-8 w-48 mb-4 bg-white/5" />
          <Skeleton className="h-64 w-full rounded-xl bg-white/5" />
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
        <GlassCard className="max-w-3xl mx-auto p-8">
          <h1 className="text-2xl font-bold text-white mb-2">Lesson not found</h1>
          <p className="text-slate-400 mb-6">
            This lesson link doesn't have a valid id, or the lesson was deleted.
          </p>
          <Button onClick={() => navigate(createPageUrl('StudentDashboard'))} className="bg-gradient-to-r from-purple-500 to-blue-500">
            Back to Dashboard
          </Button>
        </GlassCard>
      </div>
    );
  }

  const progressValue =
    allLessons.length > 0
      ? ((currentLessonIndex + (isCompleted ? 1 : 0)) / allLessons.length) * 100
      : 0;

  return (
    <div ref={contentRef} className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      {/* Read Progress Indicator */}
      {!isLessonRead && (
        <motion.div
          className="fixed top-20 right-6 z-50"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <GlassCard className="p-4 w-64">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Reading Progress</span>
                <span className="text-white font-bold">{Math.round(scrollPercent)}%</span>
              </div>
              <Progress value={scrollPercent} className="h-2" />
              <div className="flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-1">
                  <Timer className="w-3 h-3" />
                  <span>{Math.floor(timeSpent / 1000)}s</span>
                </div>
                {canMarkAsRead && (
                  <Button
                    size="sm"
                    onClick={() => markAsReadMutation.mutate()}
                    className="bg-gradient-to-r from-purple-500 to-blue-500 h-7 text-xs"
                  >
                    Mark as Read
                  </Button>
                )}
              </div>
              {!canMarkAsRead && (
                <p className="text-xs text-slate-500">
                  {scrollPercent < 80 ? 'Scroll to 80%' : 'Read for 60s'} to unlock practice
                </p>
              )}
            </div>
          </GlassCard>
        </motion.div>
      )}

      <div className="bg-slate-950/50 backdrop-blur-xl border-b border-white/10 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link
              to={topic ? createPageUrl(`Topic?id=${topic.id}`) : createPageUrl('StudentDashboard')}
              className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back to {topic?.name || 'Topic'}</span>
            </Link>

            <div className="flex items-center gap-4">
              {allLessons.length > 1 && (
                <span className="text-sm text-slate-400">
                  Lesson {Math.max(0, currentLessonIndex) + 1} of {allLessons.length}
                </span>
              )}
              {isCompleted && (
                <span className="flex items-center gap-1 text-emerald-400 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Completed
                </span>
              )}
            </div>
          </div>

          <Progress value={progressValue} className="h-1 mt-4" />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-4">{lesson.title}</h1>
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {lesson.duration_minutes || 5} min read
              </span>
            </div>
          </div>

          <GlassCard className="p-8 mb-8">
            <div className="prose prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-2xl font-bold text-white mt-8 mb-4">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-xl font-bold text-slate-200 mt-6 mb-3">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-lg font-semibold text-slate-200 mt-5 mb-2">{children}</h3>
                  ),
                  p: ({ children }) => (
                    <p className="text-slate-300 leading-relaxed mb-4">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc pl-6 mb-4 space-y-2 text-slate-300">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal pl-6 mb-4 space-y-2 text-slate-300">{children}</ol>
                  ),
                  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                  code: ({ children }) => (
                    <code className="bg-purple-500/20 px-2 py-1 rounded text-purple-300 text-sm">
                      {children}
                    </code>
                  ),
                  pre: ({ children }) => (
                    <pre className="bg-slate-950 text-slate-100 p-4 rounded-xl overflow-x-auto mb-4 border border-white/10">
                      {children}
                    </pre>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-purple-500 pl-4 italic text-slate-300 my-4">
                      {children}
                    </blockquote>
                  )
                }}
              >
                {lesson.content || 'No content available for this lesson.'}
              </ReactMarkdown>
            </div>
          </GlassCard>

          <div className="space-y-4">
            {/* Practice Quiz Button */}
            {practiceQuestions.length > 0 && (
              <div className="relative">
                <Button
                  onClick={() => {
                    if (isPracticeUnlocked) {
                      navigate(createPageUrl(`PracticeQuizPlay?lessonId=${lessonId}&count=15`));
                    }
                  }}
                  disabled={!isPracticeUnlocked}
                  className={`w-full h-12 ${
                    isPracticeUnlocked
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600'
                      : 'bg-white/5 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {!isPracticeUnlocked && <Lock className="w-5 h-5 mr-2" />}
                  <Trophy className="w-5 h-5 mr-2" />
                  {isPracticeUnlocked ? 'Start Practice Quiz' : 'Practice Quiz (Locked)'}
                </Button>
                {!isPracticeUnlocked && (
                  <p className="text-xs text-slate-500 mt-2 text-center">
                    Read the lesson to unlock practice
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <Link to={createPageUrl(`AITutor?topic=${lesson.topic_id}`)}>
                <Button variant="outline" className="w-full sm:w-auto border-white/20 text-white hover:bg-white/10">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Ask AI Tutor
                </Button>
              </Link>

              {nextLesson ? (
                <Button
                  className="flex-1 sm:flex-none bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
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
                  className="flex-1 sm:flex-none bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
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