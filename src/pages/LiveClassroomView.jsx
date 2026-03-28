import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, Activity, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';

export default function LiveClassroomView() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [classId, setClassId] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      const userData = await base44.auth.me();
      if (userData.user_type !== 'teacher' && userData.role !== 'admin') {
        navigate(createPageUrl('StudentDashboard'));
        return;
      }
      setUser(userData);
    };
    checkAuth();
  }, [navigate]);

  // Fetch teacher's classes
  const { data: classes = [] } = useQuery({
    queryKey: ['teacherClasses', user?.email],
    queryFn: () => user?.email ? base44.entities.Class.filter({ teacher_email: user.email }) : [],
    enabled: !!user?.email
  });

  // Auto-select first class
  useEffect(() => {
    if (classes.length > 0 && !classId) {
      setClassId(classes[0].id);
      setSelectedClass(classes[0]);
    }
  }, [classes, classId]);

  // Fetch active live quiz sessions for the class
  const { data: activeSessions = [] } = useQuery({
    queryKey: ['activeLiveQuizSessions', classId],
    queryFn: async () => {
      if (!classId) return [];
      const sessions = await base44.entities.LiveQuizSession.filter({ 
        class_id: classId,
        status: 'live'
      });
      return sessions;
    },
    enabled: !!classId,
    refetchInterval: 2000 // Refresh every 2 seconds
  });

  // Fetch live quiz players for active sessions
  const { data: activePlayers = [] } = useQuery({
    queryKey: ['activeLiveQuizPlayers', activeSessions.map(s => s.id).join(',')],
    queryFn: async () => {
      if (activeSessions.length === 0) return [];
      const allPlayers = [];
      for (const session of activeSessions) {
        const players = await base44.entities.LiveQuizPlayer.filter({ 
          session_id: session.id,
          status: 'active'
        });
        allPlayers.push(...players);
      }
      return allPlayers;
    },
    enabled: activeSessions.length > 0,
    refetchInterval: 2000
  });

  // Fetch student progress for all students in class
  const { data: studentProgress = [] } = useQuery({
    queryKey: ['classStudentProgress', classId],
    queryFn: async () => {
      if (!classId || !selectedClass?.student_emails?.length) return [];
      const progress = await Promise.all(
        selectedClass.student_emails.map(email =>
          base44.entities.StudentProgress.filter({ student_email: email })
            .then(results => results[0] || { student_email: email, accuracy_percent: 0, topic_mastery: {} })
        )
      );
      return progress;
    },
    enabled: !!classId && !!selectedClass?.student_emails?.length,
    refetchInterval: 5000
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Get unique topics from student progress
  const allTopics = new Set();
  studentProgress.forEach(p => {
    Object.keys(p.topic_mastery || {}).forEach(topicId => allTopics.add(topicId));
  });
  const topicsList = Array.from(allTopics);

  // Get topic names
  const getTopicColor = (mastery) => {
    if (mastery >= 80) return 'bg-emerald-500/80 hover:bg-emerald-500';
    if (mastery >= 60) return 'bg-amber-500/70 hover:bg-amber-500';
    if (mastery >= 40) return 'bg-orange-500/70 hover:bg-orange-500';
    return 'bg-red-500/70 hover:bg-red-500';
  };

  const activeStudentEmails = new Set(activePlayers.map(p => p.student_email));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('TeacherDashboard'))}
            className="text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">Live Classroom View</h1>
            <p className="text-slate-400">Real-time student activity and progress monitoring</p>
          </div>
        </div>

        {/* Class Selector */}
        {classes.length > 1 && (
          <div className="flex gap-2 mb-6 overflow-x-auto">
            {classes.map(cls => (
              <Button
                key={cls.id}
                onClick={() => {
                  setClassId(cls.id);
                  setSelectedClass(cls);
                }}
                className={cn(
                  'whitespace-nowrap',
                  classId === cls.id
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500'
                    : 'bg-white/10 hover:bg-white/20'
                )}
              >
                {cls.name}
              </Button>
            ))}
          </div>
        )}

        <div className="grid lg:grid-cols-4 gap-6 mb-8">
          {/* Active Students */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
          >
            <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-all">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Activity className="w-5 h-5 text-blue-400" />
                  Active in Quiz
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-white mb-2">{activePlayers.length}</p>
                <p className="text-sm text-slate-400">
                  of {selectedClass?.student_emails?.length || 0} students
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Active Sessions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-all">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="w-5 h-5 text-purple-400" />
                  Live Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-white mb-2">{activeSessions.length}</p>
                <p className="text-sm text-slate-400">quiz sessions in progress</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Class Average */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-all">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  Class Average
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-white mb-2">
                  {studentProgress.length > 0
                    ? Math.round(
                        studentProgress.reduce((sum, p) => sum + (p.accuracy_percent || 0), 0) /
                          studentProgress.length
                      )
                    : 0}%
                </p>
                <p className="text-sm text-slate-400">overall accuracy</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Engaged Students */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-all">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="w-5 h-5 text-pink-400" />
                  Engagement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-white mb-2">
                  {selectedClass?.student_emails?.length
                    ? Math.round(
                        (activePlayers.length / selectedClass.student_emails.length) * 100
                      )
                    : 0}%
                </p>
                <p className="text-sm text-slate-400">students active</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Active Students List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-1"
          >
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-400" />
                  Currently Taking Quiz
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activePlayers.length === 0 ? (
                  <p className="text-slate-400 text-sm">No students taking a quiz right now</p>
                ) : (
                  <div className="space-y-2">
                    {activePlayers.map((player, idx) => (
                      <motion.div
                        key={player.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                      >
                        <span className="text-white text-sm font-medium truncate">
                          {player.student_email?.split('@')[0]}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-xs text-slate-400">Active</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Progress Heatmap */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2"
          >
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                  Topic Mastery Heatmap
                </CardTitle>
              </CardHeader>
              <CardContent>
                {studentProgress.length === 0 ? (
                  <p className="text-slate-400 text-sm">No progress data available yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="min-w-max">
                      {/* Legend */}
                      <div className="mb-6 p-3 rounded-lg bg-white/5 border border-white/10">
                        <p className="text-xs text-slate-400 font-semibold mb-2">Mastery Level</p>
                        <div className="flex gap-3">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-emerald-500/80" />
                            <span className="text-xs text-slate-300">80%+</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-amber-500/70" />
                            <span className="text-xs text-slate-300">60-79%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-orange-500/70" />
                            <span className="text-xs text-slate-300">40-59%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-red-500/70" />
                            <span className="text-xs text-slate-300">&lt;40%</span>
                          </div>
                        </div>
                      </div>

                      {/* Heatmap Grid */}
                      <div className="space-y-1">
                        {studentProgress.slice(0, 15).map((progress, idx) => (
                          <motion.div
                            key={progress.student_email}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: idx * 0.02 }}
                            className="flex items-center gap-3"
                          >
                            <div className="w-32 truncate">
                              <p className="text-xs font-medium text-slate-300 truncate flex items-center gap-1">
                                {progress.student_email?.split('@')[0]}
                                {activeStudentEmails.has(progress.student_email) && (
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                )}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              {topicsList.slice(0, 8).map(topicId => {
                                const mastery = progress.topic_mastery?.[topicId] || 0;
                                return (
                                  <motion.div
                                    key={topicId}
                                    whileHover={{ scale: 1.2 }}
                                    className={cn(
                                      'w-6 h-6 rounded transition-all cursor-pointer',
                                      getTopicColor(mastery)
                                    )}
                                    title={`${mastery}%`}
                                  />
                                );
                              })}
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {studentProgress.length > 15 && (
                        <p className="text-xs text-slate-500 mt-3">
                          +{studentProgress.length - 15} more students
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}