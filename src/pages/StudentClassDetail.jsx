import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import GlassCard from '@/components/ui/GlassCard';
import {
  ChevronLeft,
  ClipboardList,
  Trophy,
  Medal,
  Target,
  CheckCircle2,
  Clock
} from 'lucide-react';

export default function StudentClassDetail() {
  const [user, setUser] = useState(null);
  const urlParams = new URLSearchParams(window.location.search);
  const classId = urlParams.get('classId');

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    fetchUser();
  }, []);

  const { data: classData } = useQuery({
    queryKey: ['class', classId],
    queryFn: async () => {
      if (!classId) return null;
      const classes = await base44.entities.Class.filter({ id: classId });
      return classes[0] || null;
    },
    enabled: !!classId
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['classAssignments', classId],
    queryFn: async () => {
      if (!classId) return [];
      return base44.entities.Assignment.filter({ class_id: classId }, '-due_date');
    },
    enabled: !!classId
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['mySubmissions', classId, user?.email],
    queryFn: async () => {
      if (!classId || !user?.email) return [];
      return base44.entities.AssignmentSubmission.filter({
        class_id: classId,
        student_email: user.email
      });
    },
    enabled: !!classId && !!user?.email
  });

  const { data: allProgress = [] } = useQuery({
    queryKey: ['classProgress', classId],
    queryFn: async () => {
      if (!classId || !classData?.student_emails) return [];
      
      const progressData = await Promise.all(
        classData.student_emails.map(async (email) => {
          const attempts = await base44.entities.QuizAttempt.filter({
            student_email: email,
            class_id: classId
          });
          
          const totalAttempts = attempts.length;
          const totalCorrect = attempts.reduce((sum, a) => sum + (a.correct_answers || 0), 0);
          const totalQuestions = attempts.reduce((sum, a) => sum + (a.questions_answered || 0), 0);
          const accuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
          
          return {
            email,
            accuracy: Math.round(accuracy),
            quizzesCompleted: totalAttempts
          };
        })
      );
      
      return progressData.sort((a, b) => b.accuracy - a.accuracy);
    },
    enabled: !!classId && !!classData?.student_emails
  });

  const getSubmissionStatus = (assignmentId) => {
    const submission = submissions.find(s => s.assignment_id === assignmentId);
    if (!submission) return 'not_started';
    return submission.status || 'not_started';
  };

  if (!classId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Class not found</h1>
          <Link to={createPageUrl('StudentDashboard')}>
            <Button className="bg-gradient-to-r from-purple-500 to-blue-500">Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link
            to={createPageUrl('StudentDashboard')}
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Back to Dashboard
          </Link>

          <h1 className="text-3xl font-bold text-white mb-2">{classData?.name || 'Class'}</h1>
          <p className="text-slate-400">Teacher: {classData?.teacher_email}</p>
        </motion.div>

        <Tabs defaultValue="assignments" className="w-full">
          <TabsList className="bg-white/5 border border-white/10 mb-6">
            <TabsTrigger value="assignments" className="data-[state=active]:bg-white/10">
              <ClipboardList className="w-4 h-4 mr-2" />
              Assignments
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="data-[state=active]:bg-white/10">
              <Trophy className="w-4 h-4 mr-2" />
              Leaderboard
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assignments">
            {assignments.length > 0 ? (
              <div className="space-y-4">
                {assignments.map((assignment, index) => {
                  const status = getSubmissionStatus(assignment.id);
                  const statusConfig = {
                    not_started: { label: 'Not Started', color: 'bg-slate-500/20 text-slate-400' },
                    in_progress: { label: 'In Progress', color: 'bg-amber-500/20 text-amber-400' },
                    submitted: { label: 'Submitted', color: 'bg-blue-500/20 text-blue-400' },
                    graded: { label: 'Graded', color: 'bg-green-500/20 text-green-400' }
                  };

                  return (
                    <motion.div
                      key={assignment.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Link to={createPageUrl(`TakeAssignment?id=${assignment.id}`)}>
                        <GlassCard className="p-6 hover:scale-[1.01]">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold text-white">{assignment.title}</h3>
                                <span className={`text-xs px-3 py-1 rounded-full ${statusConfig[status]?.color || statusConfig.not_started.color}`}>
                                  {statusConfig[status]?.label || 'Not Started'}
                                </span>
                              </div>
                              {assignment.description && (
                                <p className="text-sm text-slate-400 mb-3">{assignment.description}</p>
                              )}
                              <div className="flex items-center gap-4 text-sm text-slate-500">
                                {assignment.due_date && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    Due: {new Date(assignment.due_date).toLocaleDateString()}
                                  </span>
                                )}
                                {assignment.max_points && (
                                  <span>{assignment.max_points} points</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </GlassCard>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <GlassCard className="p-12 text-center">
                <ClipboardList className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="font-semibold text-white mb-2">No assignments yet</h3>
                <p className="text-slate-400 text-sm">Assignments will appear here when your teacher creates them.</p>
              </GlassCard>
            )}
          </TabsContent>

          <TabsContent value="leaderboard">
            {allProgress.length > 0 ? (
              <div className="space-y-3">
                {allProgress.map((student, index) => {
                  const isCurrentUser = student.email === user?.email;
                  const rankIcon = index === 0 ? Medal : index === 1 ? Trophy : Target;
                  const rankColor = index === 0 ? 'text-amber-400' : index === 1 ? 'text-slate-300' : index === 2 ? 'text-orange-400' : 'text-slate-500';

                  return (
                    <motion.div
                      key={student.email}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <GlassCard className={`p-5 ${isCurrentUser ? 'border-purple-500/50 shadow-purple-500/20' : ''}`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-8 text-center ${rankColor}`}>
                            {React.createElement(rankIcon, { className: 'w-6 h-6 inline' })}
                          </div>
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold shadow-lg shadow-purple-500/30 flex-shrink-0">
                            {(student.email || 'A').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <p className={`font-semibold ${isCurrentUser ? 'text-purple-400' : 'text-white'}`}>
                              {student.email.split('@')[0]}
                              {isCurrentUser && ' (You)'}
                            </p>
                            <p className="text-sm text-slate-400">{student.quizzesCompleted} quizzes completed</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-white">{student.accuracy}%</p>
                            <p className="text-xs text-slate-400">Accuracy</p>
                          </div>
                        </div>
                      </GlassCard>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <GlassCard className="p-12 text-center">
                <Trophy className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="font-semibold text-white mb-2">No data yet</h3>
                <p className="text-slate-400 text-sm">Complete quizzes to see the leaderboard.</p>
              </GlassCard>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}