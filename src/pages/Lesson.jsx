import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import ReactMarkdown from 'react-markdown';
import { 
  ChevronLeft, 
  ChevronRight, 
  BookOpen, 
  Clock,
  Zap,
  CheckCircle2,
  ArrowRight,
  MessageSquare,
  Trophy
} from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';

export default function LessonPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [startTime] = useState(Date.now());
  const urlParams = new URLSearchParams(window.location.search);
  const lessonId = urlParams.get('id');

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    fetchUser();
  }, []);

  const { data: lesson, isLoading: loadingLesson } = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: async () => {
      if (!lessonId) return null;
      const lessons = await base44.entities.Lesson.filter({ id: lessonId });
      return lessons[0] || null;
    },
    enabled: !!lessonId
  });

  const { data: topic } = useQuery({
    queryKey: ['topic', lesson?.topic_id],
    queryFn: async () => {
      if (!lesson?.topic_id) return null;
      const topics = await base44.entities.Topic.filter({ id: lesson.topic_id });
      return topics[0] || null;
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
      return progressList[0] || null;
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
      
      // Calculate new level
      let newLevel = progress.level || 1;
      while (newTotalXp >= newLevel * 100) {
        newLevel++;
      }

      // Update topic mastery
      const topicMastery = { ...progress.topic_mastery };
      const topicLessons = allLessons.length;
      const completedTopicLessons = completedLessons.filter(l => 
        allLessons.some(al => al.id === l)
      ).length + 1;
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
  const nextLesson = allLessons[currentLessonIndex + 1];
  const isCompleted = progress?.completed_lessons?.includes(lessonId);

  const handleComplete = async () => {
    await completeLessonMutation.mutateAsync();
    
    // Navigate to quiz if exists, otherwise next lesson or topic page
    if (quizzes.length > 0) {
      navigate(createPageUrl(`Quiz?id=${quizzes[0].id}`));
    } else if (nextLesson) {
      navigate(createPageUrl(`Lesson?id=${nextLesson.id}`));
    } else {
      navigate(createPageUrl(`Topic?id=${lesson.topic_id}`));
    }
  };

  if (!lessonId || loadingLesson) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-purple-500/50" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-4">
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
                  {currentLessonIndex + 1} / {allLessons.length}
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
          
          {/* Progress */}
          <Progress 
            value={((currentLessonIndex + (isCompleted ? 1 : 0)) / allLessons.length) * 100} 
            className="h-2" 
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Lesson Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white mb-3">{lesson?.title}</h1>
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {lesson?.duration_minutes || 5} min
              </span>
            </div>
          </div>

          {/* Lesson Content */}
          <GlassCard className="p-8 mb-6">
            <div className="prose prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => <h1 className="text-2xl font-bold text-white mt-8 mb-4">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-xl font-bold text-slate-200 mt-6 mb-3">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-lg font-semibold text-slate-200 mt-5 mb-2">{children}</h3>,
                  p: ({ children }) => <p className="text-slate-300 leading-relaxed mb-4">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-2 text-slate-300">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-2 text-slate-300">{children}</ol>,
                  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                  code: ({ children }) => <code className="bg-purple-500/20 px-2 py-1 rounded text-purple-300 text-sm">{children}</code>,
                  pre: ({ children }) => <pre className="bg-slate-950/50 text-slate-100 p-4 rounded-xl overflow-x-auto mb-4 border border-white/10">{children}</pre>,
                  blockquote: ({ children }) => <blockquote className="border-l-4 border-purple-500 pl-4 italic text-slate-300 my-4">{children}</blockquote>,
                }}
              >
                {lesson?.content || 'No content available for this lesson.'}
              </ReactMarkdown>
            </div>
          </GlassCard>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link to={createPageUrl(`AITutor?topic=${lesson?.topic_id}`)}>
              <Button variant="outline" className="w-full sm:w-auto border-white/10 text-slate-300 hover:bg-white/5 hover:text-white">
                <MessageSquare className="w-4 h-4 mr-2" />
                Ask AI Tutor
              </Button>
            </Link>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {quizzes.length > 0 ? (
                <Button 
                  className="flex-1 sm:flex-none bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/30"
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
                  className="flex-1 sm:flex-none bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 shadow-lg shadow-purple-500/30"
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
                  className="flex-1 sm:flex-none bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/30"
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