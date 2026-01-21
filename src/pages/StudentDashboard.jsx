import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BookOpen, 
  Trophy, 
  Target,
  MessageSquare,
  Award,
  ChevronRight,
  Calendar,
  Users,
  Play,
  GraduationCap,
  TrendingUp
} from 'lucide-react';
import { Input } from '@/components/ui/input';

import StatsCard from '@/components/dashboard/StatsCard';
import SubjectCard from '@/components/dashboard/SubjectCard';
import WeakStrongAreas from '@/components/dashboard/WeakStrongAreas';
import StreakBadge from '@/components/ui/StreakBadge';

export default function StudentDashboard() {
  const [user, setUser] = useState(null);
  const [liveQuizCode, setLiveQuizCode] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    fetchUser();
  }, []);

  const { data: subjects = [], isLoading: loadingSubjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => base44.entities.Subject.list()
  });

  const { data: topics = [], isLoading: loadingTopics } = useQuery({
    queryKey: ['topics'],
    queryFn: () => base44.entities.Topic.list()
  });

  const { data: progress, isLoading: loadingProgress } = useQuery({
    queryKey: ['studentProgress', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const progressList = await base44.entities.StudentProgress.filter({ student_email: user.email });
      return progressList[0] || null;
    },
    enabled: !!user?.email
  });

  // Fetch classes where student is enrolled
  const { data: classes = [], isLoading: loadingClasses } = useQuery({
    queryKey: ['studentClasses', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const allClasses = await base44.entities.Class.list();
      return allClasses.filter(c => c.student_emails?.includes(user.email));
    },
    enabled: !!user?.email
  });

  // Fetch assignments for student's classes
  const { data: assignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ['studentAssignments', classes],
    queryFn: async () => {
      if (classes.length === 0) return [];
      const classIds = classes.map(c => c.id);
      const allAssignments = await base44.entities.Assignment.list('-due_date', 20);
      // Filter assignments for student's classes and not past due
      return allAssignments.filter(a => 
        classIds.includes(a.class_id) && 
        a.status === 'published' &&
        new Date(a.due_date) >= new Date()
      );
    },
    enabled: classes.length > 0
  });



  const getSubjectProgress = (subjectId) => {
    const subjectTopics = topics.filter(t => t.subject_id === subjectId);
    if (subjectTopics.length === 0) return 0;
    
    const totalMastery = subjectTopics.reduce((sum, topic) => {
      return sum + (progress?.topic_mastery?.[topic.id] || 0);
    }, 0);
    
    return totalMastery / subjectTopics.length;
  };

  const isLoading = loadingSubjects || loadingProgress;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}! 👋
            </h1>
            <p className="text-slate-500 mt-1">Ready to continue your learning journey?</p>
          </div>
          <div className="flex items-center gap-3">
            {progress && <StreakBadge streak={progress.current_streak || 0} />}
            <Link to={createPageUrl('AITutor')}>
              <Button className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 shadow-lg shadow-purple-500/25">
                <MessageSquare className="w-4 h-4 mr-2" />
                AI Tutor
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Overall Accuracy */}
        {isLoading ? (
          <Skeleton className="h-32 rounded-2xl mb-8" />
        ) : (
          <motion.div
            className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-8 shadow-lg border border-indigo-400 mb-8 text-white"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-100 text-sm mb-1">Overall Accuracy</p>
                <p className="text-5xl font-bold">{progress?.accuracy_percent || 0}%</p>
                <p className="text-indigo-200 text-sm mt-2">
                  {progress?.total_correct_answers || 0} / {progress?.total_questions_answered || 0} correct
                </p>
              </div>
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
                <TrendingUp className="w-10 h-10 text-white" />
              </div>
            </div>
          </motion.div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            icon={Trophy}
            label="Quizzes Done"
            value={progress?.quizzes_completed || 0}
            color="indigo"
            delay={0.1}
          />
          <StatsCard
            icon={BookOpen}
            label="Lessons Done"
            value={progress?.completed_lessons?.length || 0}
            color="emerald"
            delay={0.15}
          />
          <StatsCard
            icon={Target}
            label="Questions"
            value={progress?.total_questions_answered || 0}
            color="amber"
            delay={0.2}
          />
          <StatsCard
            icon={Award}
            label="Best Streak"
            value={`${progress?.longest_streak || 0} days`}
            color="rose"
            delay={0.25}
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* My Classes Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900">My Classes</h2>
              </div>
              {loadingClasses ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {[1, 2].map(i => (
                    <Skeleton key={i} className="h-24 rounded-2xl" />
                  ))}
                </div>
              ) : classes.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {classes.map(cls => {
                    const classSubject = subjects.find(s => s.id === cls.subject_id);
                    return (
                      <Link 
                        key={cls.id} 
                        to={createPageUrl('ClassDetails') + `?id=${cls.id}`}
                        className="bg-white rounded-2xl p-4 border border-slate-100 hover:border-indigo-200 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                            <GraduationCap className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-slate-800">{cls.name}</p>
                            <p className="text-xs text-slate-500">{classSubject?.name || 'No subject'}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-6 text-center border border-slate-100">
                  <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <h3 className="font-semibold text-slate-700 mb-1">No classes yet</h3>
                  <p className="text-slate-500 text-sm mb-3">Join a class using a code from your teacher.</p>
                  <Link to={createPageUrl('JoinClass')}>
                    <Button variant="outline" size="sm">Join Class</Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Self Learning Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900">Self Learning</h2>
                <Link to={createPageUrl('Subject')} className="text-indigo-600 text-sm font-medium hover:underline">
                  View all
                </Link>
              </div>

              {loadingSubjects ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {[1, 2].map(i => (
                    <Skeleton key={i} className="h-48 rounded-2xl" />
                  ))}
                </div>
              ) : subjects.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {subjects.slice(0, 4).map((subject, idx) => {
                    const subjectTopics = topics.filter(t => t.subject_id === subject.id);
                    const completedTopics = subjectTopics.filter(t => 
                      progress?.topic_mastery?.[t.id] >= 80
                    ).length;
                    
                    return (
                      <SubjectCard
                        key={subject.id}
                        subject={subject}
                        progress={getSubjectProgress(subject.id)}
                        topicsCount={subjectTopics.length}
                        completedTopics={completedTopics}
                        delay={idx * 0.1}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-8 text-center border border-slate-100">
                  <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="font-semibold text-slate-700 mb-2">No subjects yet</h3>
                  <p className="text-slate-500 text-sm">Subjects will appear here once added.</p>
                </div>
              )}
            </div>

            {/* Weak/Strong Areas */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-4">Your Performance</h2>
              <WeakStrongAreas
                weakAreas={progress?.weak_areas || []}
                strongAreas={progress?.strong_areas || []}
                topics={topics}
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Upcoming Assignments */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800">Upcoming Assignments</h3>
                <Calendar className="w-5 h-5 text-slate-400" />
              </div>
              {loadingAssignments ? (
                <div className="space-y-3">
                  {[1, 2].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
                </div>
              ) : assignments.length > 0 ? (
                <div className="space-y-3">
                  {assignments.slice(0, 5).map(assignment => {
                    const assignmentClass = classes.find(c => c.id === assignment.class_id);
                    const dueDate = new Date(assignment.due_date);
                    const isUrgent = dueDate - new Date() < 2 * 24 * 60 * 60 * 1000; // 2 days
                    return (
                      <div 
                        key={assignment.id} 
                        className={`flex items-center gap-3 p-3 rounded-xl ${isUrgent ? 'bg-red-50' : 'bg-slate-50'}`}
                      >
                        <div className={`w-2 h-2 rounded-full ${isUrgent ? 'bg-red-500' : 'bg-indigo-500'}`} />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-700">{assignment.title}</p>
                          <p className="text-xs text-slate-500">
                            {assignmentClass?.name} • Due: {dueDate.toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          assignment.assignment_type === 'quiz' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {assignment.assignment_type || 'Task'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">No upcoming assignments</p>
              )}
            </div>

            {/* Join Live Quiz */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <Play className="w-5 h-5 text-green-500" />
                <h3 className="font-semibold text-slate-800">Join Live Quiz</h3>
              </div>
              <p className="text-slate-500 text-sm mb-4">
                Enter a code from your teacher to join a live quiz session.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter quiz code"
                  value={liveQuizCode}
                  onChange={(e) => setLiveQuizCode(e.target.value.toUpperCase())}
                  className="flex-1"
                  maxLength={6}
                />
                <Link to={liveQuizCode ? createPageUrl('LiveQuiz') + `?code=${liveQuizCode}` : '#'}>
                  <Button disabled={!liveQuizCode.trim()} className="bg-green-500 hover:bg-green-600">
                    Join
                  </Button>
                </Link>
              </div>
            </div>

            {/* Join Class */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <Users className="w-5 h-5 text-indigo-500" />
                <h3 className="font-semibold text-slate-800">Join a Class</h3>
              </div>
              <p className="text-slate-500 text-sm mb-4">
                Enter a code from your teacher to join their class.
              </p>
              <Link to={createPageUrl('JoinClass')}>
                <Button variant="outline" className="w-full">
                  Enter Code
                </Button>
              </Link>
            </div>

            {/* Quick Actions */}
            <motion.div
              className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h3 className="font-semibold mb-2">Need help?</h3>
              <p className="text-indigo-100 text-sm mb-4">
                Chat with your AI tutor for personalised explanations and practice questions.
              </p>
              <Link to={createPageUrl('AITutor')}>
                <Button className="w-full bg-white text-indigo-600 hover:bg-indigo-50">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Open AI Tutor
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}