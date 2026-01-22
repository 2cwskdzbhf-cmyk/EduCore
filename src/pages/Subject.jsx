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
  BookOpen, 
  Trophy,
  Lock,
  CheckCircle2,
  Play
} from 'lucide-react';

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
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto text-center py-20">
          <h1 className="text-2xl font-bold text-slate-800 mb-4">Select a Subject</h1>
          <Link to={createPageUrl('StudentDashboard')}>
            <Button>Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className={`bg-gradient-to-r ${bgColor} text-white`}>
        <div className="max-w-5xl mx-auto px-6 py-8">
          <Link to={createPageUrl('StudentDashboard')} className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors">
            <ChevronLeft className="w-5 h-5" />
            Back to Dashboard
          </Link>
          
          {loadingSubject ? (
            <Skeleton className="h-10 w-48 bg-white/20" />
          ) : (
            <>
              <h1 className="text-4xl font-bold mb-2">{subject?.name}</h1>
              <p className="text-white/80">{subject?.description}</p>
            </>
          )}

          <div className="mt-6 flex items-center gap-6">
            <div className="bg-white/20 rounded-xl px-4 py-2">
              <span className="text-sm opacity-80">Topics</span>
              <p className="text-xl font-bold">{topics.length}</p>
            </div>
            <div className="bg-white/20 rounded-xl px-4 py-2">
              <span className="text-sm opacity-80">Progress</span>
              <p className="text-xl font-bold">
                {topics.length > 0 
                  ? Math.round(topics.reduce((sum, t) => sum + getTopicProgress(t.id), 0) / topics.length)
                  : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Learning Path</h2>

        {loadingTopics ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        ) : topics.length > 0 ? (
          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-slate-200" />

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
                    <div className={`absolute left-6 top-6 w-5 h-5 rounded-full border-4 z-10 ${
                      isCompleted ? 'bg-emerald-500 border-emerald-200' :
                      isUnlocked ? 'bg-indigo-500 border-indigo-200' :
                      'bg-slate-300 border-slate-200'
                    }`} />

                    <div className={`ml-16 bg-white rounded-2xl border shadow-sm overflow-hidden ${
                      !isUnlocked ? 'opacity-60' : ''
                    } ${isCompleted ? 'border-emerald-200' : 'border-slate-100'}`}>
                      <div className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              {isCompleted ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                              ) : !isUnlocked ? (
                                <Lock className="w-5 h-5 text-slate-400" />
                              ) : null}
                              <h3 className="text-lg font-semibold text-slate-800">{topic.name}</h3>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                topic.difficulty_level === 'beginner' ? 'bg-green-100 text-green-700' :
                                topic.difficulty_level === 'intermediate' ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {topic.difficulty_level}
                              </span>
                            </div>
                            <p className="text-slate-500 text-sm mb-4">{topic.description}</p>
                            
                            <div className="flex items-center gap-4 text-sm text-slate-500">
                              <span className="flex items-center gap-1">
                                <BookOpen className="w-4 h-4" />
                                {topicLessons.length} lessons
                              </span>
                              <span className="flex items-center gap-1">
                                <Trophy className="w-4 h-4" />
                                {topicQuizzes.length} quizzes
                              </span>
                              <span className="flex items-center gap-1">
                                +{topic.xp_reward || 50} XP
                              </span>
                            </div>
                          </div>

                          {isUnlocked && (
                            <Link to={createPageUrl(`Topic?id=${topic.id}`)}>
                              <Button className={`${
                                isCompleted 
                                  ? 'bg-emerald-500 hover:bg-emerald-600' 
                                  : 'bg-indigo-500 hover:bg-indigo-600'
                              }`}>
                                {isCompleted ? 'Review' : 'Start'}
                                <Play className="w-4 h-4 ml-2" />
                              </Button>
                            </Link>
                          )}
                        </div>

                        {isUnlocked && (
                          <div className="mt-4 pt-4 border-t border-slate-100">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-slate-500">Progress</span>
                              <span className="text-sm font-medium text-slate-700">{Math.round(topicProgress)}%</span>
                            </div>
                            <Progress value={topicProgress} className="h-2" />
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-semibold text-slate-700 mb-2">No topics yet</h3>
            <p className="text-slate-500 text-sm">Topics will appear here once added to this subject.</p>
          </div>
        )}
      </div>
    </div>
  );
}