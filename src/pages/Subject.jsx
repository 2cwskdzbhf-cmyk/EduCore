import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  Lock,
  CheckCircle2,
  Play
} from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';

export default function SubjectPage() {
  const [user, setUser] = useState(null);
  const urlParams = new URLSearchParams(window.location.search);
  const subjectId = urlParams.get('id');

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    fetchUser();
  }, []);

  const { data: subject, isLoading: loadingSubject } = useQuery({
    queryKey: ['subject', subjectId],
    queryFn: async () => {
      if (!subjectId) return null;
      const subjects = await base44.entities.Subject.filter({ id: subjectId });
      return subjects[0] || null;
    },
    enabled: !!subjectId
  });

  const { data: topics = [], isLoading: loadingTopics } = useQuery({
    queryKey: ['topics', subjectId],
    queryFn: async () => {
      if (!subjectId) return [];
      return base44.entities.Topic.filter({ subject_id: subjectId }, 'order');
    },
    enabled: !!subjectId
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

  const { data: lessons = [] } = useQuery({
    queryKey: ['lessons'],
    queryFn: () => base44.entities.Lesson.list()
  });

  const { data: quizzes = [] } = useQuery({
    queryKey: ['quizzes'],
    queryFn: () => base44.entities.Quiz.list()
  });

  const getTopicProgress = (topicId) => {
    return progress?.topic_mastery?.[topicId] || 0;
  };

  const isTopicUnlocked = (topic, index) => {
    if (index === 0) return true;
    const prevTopic = topics[index - 1];
    return getTopicProgress(prevTopic.id) >= 60;
  };

  const colorMap = {
    blue: "from-blue-500 to-blue-600",
    green: "from-emerald-500 to-emerald-600",
    purple: "from-purple-500 to-purple-600",
    orange: "from-orange-500 to-orange-600",
    pink: "from-pink-500 to-pink-600",
    indigo: "from-indigo-500 to-indigo-600",
  };

  const bgColor = colorMap[subject?.color] || colorMap.indigo;

  if (!subjectId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Select a Subject</h1>
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
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link to={createPageUrl('StudentDashboard')} className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
            <ChevronLeft className="w-5 h-5" />
            Back to Dashboard
          </Link>
          
          {loadingSubject ? (
            <Skeleton className="h-10 w-48 bg-white/5" />
          ) : (
            <>
              <h1 className="text-4xl font-bold mb-2 text-white">{subject?.name}</h1>
              <p className="text-slate-400">{subject?.description}</p>
            </>
          )}

          <div className="mt-6 grid grid-cols-2 gap-4 max-w-md">
            <GlassCard className="px-4 py-3">
              <span className="text-sm text-slate-400">Topics</span>
              <p className="text-2xl font-bold text-white">{topics.length}</p>
            </GlassCard>
            <GlassCard className="px-4 py-3">
              <span className="text-sm text-slate-400">Progress</span>
              <p className="text-2xl font-bold text-white">
                {topics.length > 0 
                  ? Math.round(topics.reduce((sum, t) => sum + getTopicProgress(t.id), 0) / topics.length)
                  : 0}%
              </p>
            </GlassCard>
          </div>
        </motion.div>

        <h2 className="text-2xl font-bold text-white mb-6">Learning Path</h2>

        {loadingTopics ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : topics.length > 0 ? (
          <div className="relative">
            {/* Connection Line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-white/10" />

            <div className="space-y-4">
              {topics.map((topic, index) => {
                const topicProgress = getTopicProgress(topic.id);
                const isUnlocked = isTopicUnlocked(topic, index);
                const isCompleted = topicProgress >= 80;
                const topicLessons = lessons.filter(l => l.topic_id === topic.id);
                const topicQuizzes = quizzes.filter(q => q.topic_id === topic.id);

                return (
                  <motion.div
                    key={topic.id}
                    className="relative"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    {/* Node */}
                    <div className={`absolute left-6 top-6 w-5 h-5 rounded-full border-4 z-10 shadow-lg ${
                      isCompleted ? 'bg-emerald-500 border-emerald-500/50 shadow-emerald-500/50' :
                      isUnlocked ? 'bg-purple-500 border-purple-500/50 shadow-purple-500/50' :
                      'bg-slate-600 border-slate-600/50'
                    }`} />

                    <div className={`ml-16 ${!isUnlocked ? 'opacity-40' : ''}`}>
                      <GlassCard className="overflow-hidden"
                      >
                        <div className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                {isCompleted ? (
                                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                ) : !isUnlocked ? (
                                  <Lock className="w-5 h-5 text-slate-500" />
                                ) : null}
                                <h3 className="text-lg font-semibold text-white">{topic.name}</h3>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  topic.difficulty_level === 'foundation' ? 'bg-green-500/20 text-green-400' :
                                  topic.difficulty_level === 'intermediate' ? 'bg-amber-500/20 text-amber-400' :
                                  'bg-red-500/20 text-red-400'
                                }`}>
                                  {topic.difficulty_level}
                                </span>
                              </div>
                              <p className="text-slate-400 text-sm mb-4">{topic.description}</p>
                              
                              <div className="flex items-center gap-4 text-sm text-slate-400">
                                <span className="flex items-center gap-1">
                                  <BookOpen className="w-4 h-4" />
                                  {topicLessons.length} lessons
                                </span>
                                <span className="flex items-center gap-1">
                                  <Trophy className="w-4 h-4" />
                                  {topicQuizzes.length} quizzes
                                </span>
                              </div>
                            </div>

                            {isUnlocked && (
                              <Link to={createPageUrl(`Topic?id=${topic.id}`)}>
                                <Button className={`shadow-lg transition-all duration-300 ${
                                  isCompleted 
                                    ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30' 
                                    : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 shadow-purple-500/30'
                                }`}>
                                  {isCompleted ? 'Review' : 'Start'}
                                  <Play className="w-4 h-4 ml-2" />
                                </Button>
                              </Link>
                            )}
                          </div>

                          {isUnlocked && (
                            <div className="mt-4 pt-4 border-t border-white/10">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-slate-400">Progress</span>
                                <span className="text-sm font-medium text-white">{Math.round(topicProgress)}%</span>
                              </div>
                              <Progress value={topicProgress} className="h-2" />
                            </div>
                          )}
                        </div>
                      </GlassCard>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ) : (
          <GlassCard className="p-16 text-center">
            <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="font-semibold text-white mb-2">No topics yet</h3>
            <p className="text-slate-400 text-sm">Topics will appear here once added to this subject.</p>
          </GlassCard>
        )}
      </div>
    </div>
  );
}