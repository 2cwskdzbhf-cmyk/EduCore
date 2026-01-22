import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
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

import StatCard from '@/components/dashboard/StatsCard';


function GlassCard({ className = '', children, ...props }) {
  return (
    <div
      className={
        `rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-lg shadow-black/20 transition-all duration-300 ${className}`
      }
      {...props}
    >
      {children}
    </div>
  );
}

export default function StudentDashboard() {
  const navigate = useNavigate();
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-slate-400">Your learning dashboard</p>
        </motion.div>

        {/* Minimal Stats Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-40 rounded-2xl bg-white/5" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <StatCard
              icon={TrendingUp}
              label="Accuracy"
              value={`${progress?.accuracy_percent || 0}%`}
              delay={0}
            />
            <StatCard
              icon={Trophy}
              label="Quizzes"
              value={progress?.quizzes_completed || 0}
              delay={0.1}
              onClick={() => navigate(createPageUrl('Subject'))}
            />
            <StatCard
              icon={Target}
              label="Strongest"
              value={(() => {
                const strongest = progress?.strong_areas?.[0];
                const topic = topics.find(t => t.id === strongest);
                return topic ? topic.name.split(' ')[0] : 'None';
              })()}
              delay={0.2}
            />
            <StatCard
              icon={BookOpen}
              label="Weakest"
              value={(() => {
                const weakest = progress?.weak_areas?.[0];
                const topic = topics.find(t => t.id === weakest);
                return topic ? topic.name.split(' ')[0] : 'None';
              })()}
              delay={0.3}
            />
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            
            {/* My Classes Section */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">My Classes</h2>
              {loadingClasses ? (
                <div className="space-y-3">
                  {[1, 2].map(i => (
                    <Skeleton key={i} className="h-20 rounded-2xl bg-white/5" />
                  ))}
                </div>
              ) : classes.length > 0 ? (
                <div className="space-y-3">
                  {classes.map((cls, idx) => {
                    const classSubject = subjects.find(s => s.id === cls.subject_id);
                    return (
                      <motion.div
                        key={cls.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1, duration: 0.3 }}
                      >
                        <Link to={createPageUrl('ClassDetails') + `?id=${cls.id}`}>
                          <GlassCard className="p-4 hover:scale-[1.02]">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                                <GraduationCap className="w-5 h-5 text-white" />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-white">{cls.name}</p>
                                <p className="text-xs text-slate-400">{classSubject?.name || 'No subject'}</p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            </div>
                          </GlassCard>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <GlassCard className="p-8 text-center">
                  <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="font-semibold text-white mb-2">No classes yet</h3>
                  <p className="text-slate-400 text-sm mb-4">Join a class using a code from your teacher.</p>
                  <Link to={createPageUrl('JoinClass')}>
                    <Button className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 shadow-lg shadow-purple-500/30">Join Class</Button>
                  </Link>
                </GlassCard>
              )}
            </div>

            {/* Self Learning Section */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Self Learning</h2>
                <Link to={createPageUrl('Subject')} className="text-purple-400 text-sm font-medium hover:text-purple-300 transition-colors">
                  View all →
                </Link>
              </div>

              {loadingSubjects ? (
                <div className="space-y-3">
                  {[1, 2].map(i => (
                    <Skeleton key={i} className="h-24 rounded-2xl bg-white/5" />
                  ))}
                </div>
              ) : subjects.length > 0 ? (
                <div className="space-y-3">
                  {subjects.slice(0, 4).map((subject, idx) => {
                    const subjectTopics = topics.filter(t => t.subject_id === subject.id);
                    const completedTopics = subjectTopics.filter(t => 
                      progress?.topic_mastery?.[t.id] >= 80
                    ).length;
                    
                    return (
                      <motion.div
                        key={subject.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1, duration: 0.3 }}
                      >
                        <Link to={createPageUrl(`Subject?id=${subject.id}`)}>
                          <GlassCard className="p-5 hover:scale-[1.02]">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="text-lg font-bold text-white mb-1">{subject.name}</h3>
                                <p className="text-sm text-slate-400">{subjectTopics.length} topics</p>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-purple-400">{Math.round(getSubjectProgress(subject.id))}%</p>
                                <p className="text-xs text-slate-500">Progress</p>
                              </div>
                            </div>
                          </GlassCard>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <GlassCard className="p-8 text-center">
                  <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="font-semibold text-white mb-2">No subjects yet</h3>
                  <p className="text-slate-400 text-sm">Subjects will appear here once added.</p>
                </GlassCard>
              )}
            </div>


          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Upcoming Assignments */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-white text-lg">Assignments</h3>
                <Calendar className="w-5 h-5 text-slate-400" />
              </div>
              {loadingAssignments ? (
                <div className="space-y-3">
                  {[1, 2].map(i => <Skeleton key={i} className="h-16 rounded-xl bg-white/5" />)}
                </div>
              ) : assignments.length > 0 ? (
                <div className="space-y-3">
                  {assignments.slice(0, 3).map(assignment => {
                    const assignmentClass = classes.find(c => c.id === assignment.class_id);
                    const dueDate = new Date(assignment.due_date);
                    const isUrgent = dueDate - new Date() < 2 * 24 * 60 * 60 * 1000;
                    return (
                      <div 
                        key={assignment.id} 
                        className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-sm font-medium text-white">{assignment.title}</p>
                          {isUrgent && <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-400">Urgent</span>}
                        </div>
                        <p className="text-xs text-slate-400">{dueDate.toLocaleDateString()}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-6">No assignments</p>
              )}
            </GlassCard>

            {/* AI Tutor */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <GlassCard className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-white text-lg">AI Tutor</h3>
                </div>
                <p className="text-slate-400 text-sm mb-4">
                  Get instant help with any topic
                </p>
                <Link to={createPageUrl('AITutor')}>
                  <Button className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 shadow-lg shadow-purple-500/30 transition-all duration-300">
                    Start Chat
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
