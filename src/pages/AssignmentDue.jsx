import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/ui/GlassCard';
import {
  ChevronLeft,
  Calendar,
  Clock,
  User,
  BookOpen,
  CheckCircle2,
  PlayCircle,
  AlertCircle,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';

export default function AssignmentDue() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const assignmentId = urlParams.get('id');
  
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    fetchUser();
  }, []);

  const { data: assignment } = useQuery({
    queryKey: ['assignment', assignmentId],
    queryFn: async () => {
      if (!assignmentId) return null;
      const assignments = await base44.entities.Assignment.filter({ id: assignmentId });
      return assignments[0] || null;
    },
    enabled: !!assignmentId
  });

  const { data: classData } = useQuery({
    queryKey: ['class', assignment?.class_id],
    queryFn: async () => {
      if (!assignment?.class_id) return null;
      const classes = await base44.entities.Class.filter({ id: assignment.class_id });
      return classes[0] || null;
    },
    enabled: !!assignment?.class_id
  });

  const { data: topic } = useQuery({
    queryKey: ['topic', assignment?.topic_id],
    queryFn: async () => {
      if (!assignment?.topic_id) return null;
      const topics = await base44.entities.Topic.filter({ id: assignment.topic_id });
      return topics[0] || null;
    },
    enabled: !!assignment?.topic_id
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['quizQuestions', assignment?.quiz_id],
    queryFn: async () => {
      if (!assignment?.quiz_id) return [];
      return base44.entities.QuizQuestion.filter({ quiz_set_id: assignment.quiz_id }, 'order');
    },
    enabled: !!assignment?.quiz_id
  });

  const { data: submission } = useQuery({
    queryKey: ['submission', assignmentId, user?.email],
    queryFn: async () => {
      if (!assignmentId || !user?.email) return null;
      const submissions = await base44.entities.AssignmentSubmission.filter({
        assignment_id: assignmentId,
        student_email: user.email
      });
      return submissions[0] || null;
    },
    enabled: !!assignmentId && !!user?.email
  });

  if (!assignment || !classData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Check if student is authorized
  if (user && !classData.student_emails?.includes(user.email)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6 flex items-center justify-center">
        <GlassCard className="p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-slate-400 mb-4">This assignment is not available to you.</p>
          <Button onClick={() => navigate(createPageUrl('StudentDashboard'))}>
            Back to Dashboard
          </Button>
        </GlassCard>
      </div>
    );
  }

  const isCompleted = submission?.status === 'graded' || submission?.status === 'submitted';
  const isInProgress = submission?.status === 'in_progress';
  const isNotStarted = !submission || submission?.status === 'not_started';

  const topicDisplay = assignment.custom_topic_name || topic?.name || 'General';
  const questionTypeBreakdown = questions.reduce((acc, q) => {
    const type = q.question_type || 'multiple_choice';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const handleStart = () => {
    navigate(createPageUrl(`TakeAssignment?id=${assignmentId}`));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate(createPageUrl('StudentDashboard'))}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to Dashboard
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Status Badge */}
          <div className="flex justify-center mb-6">
            {isCompleted ? (
              <div className="px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Completed
              </div>
            ) : isInProgress ? (
              <div className="px-4 py-2 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                In Progress
              </div>
            ) : (
              <div className="px-4 py-2 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 text-sm font-medium flex items-center gap-2">
                <PlayCircle className="w-4 h-4" />
                Not Started
              </div>
            )}
          </div>

          {/* Main Card */}
          <GlassCard className="p-10 mb-6">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-white mb-3">{assignment.title}</h1>
              <p className="text-xl text-slate-300">{classData.name}</p>
            </div>

            {/* Key Info Grid */}
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Topic</p>
                  <p className="font-semibold text-white">{topicDisplay}</p>
                </div>
              </div>

              {assignment.due_date && (
                <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Due Date</p>
                    <p className="font-semibold text-white">
                      {format(new Date(assignment.due_date), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Teacher</p>
                  <p className="font-semibold text-white">{classData.teacher_email.split('@')[0]}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Questions</p>
                  <p className="font-semibold text-white">{questions.length} questions</p>
                </div>
              </div>
            </div>

            {/* Assignment Overview */}
            <div className="bg-white/5 rounded-xl border border-white/10 p-6 mb-8">
              <h3 className="text-lg font-bold text-white mb-4">Assignment Overview</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Total Questions</span>
                  <span className="text-white font-semibold">{questions.length}</span>
                </div>

                {Object.keys(questionTypeBreakdown).length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Question Types</span>
                    <div className="flex gap-2">
                      {questionTypeBreakdown.multiple_choice && (
                        <span className="text-sm px-2 py-1 rounded bg-blue-500/20 text-blue-400">
                          {questionTypeBreakdown.multiple_choice} MC
                        </span>
                      )}
                      {questionTypeBreakdown.written && (
                        <span className="text-sm px-2 py-1 rounded bg-purple-500/20 text-purple-400">
                          {questionTypeBreakdown.written} Written
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {assignment.max_points && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Max Points</span>
                    <span className="text-white font-semibold">{assignment.max_points}</span>
                  </div>
                )}

                {assignment.estimated_minutes && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Estimated Time</span>
                    <span className="text-white font-semibold">{assignment.estimated_minutes} min</span>
                  </div>
                )}
              </div>
            </div>

            {/* Description/Instructions */}
            {assignment.instructions && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 mb-8">
                <h3 className="text-lg font-bold text-white mb-2">Instructions</h3>
                <p className="text-slate-300 leading-relaxed">{assignment.instructions}</p>
              </div>
            )}

            {/* Completion Summary */}
            {isCompleted && submission && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  <h3 className="text-lg font-bold text-white">Assignment Completed</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-400">Score</p>
                    <p className="text-2xl font-bold text-white">
                      {submission.score}/{submission.max_score}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Percentage</p>
                    <p className="text-2xl font-bold text-white">{submission.percentage}%</p>
                  </div>
                  {submission.submitted_at && (
                    <div className="col-span-2">
                      <p className="text-sm text-slate-400">Submitted</p>
                      <p className="text-white">
                        {format(new Date(submission.submitted_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              {isCompleted ? (
                <>
                  <Button
                    onClick={() => navigate(createPageUrl('StudentDashboard'))}
                    variant="outline"
                    className="flex-1 border-white/20 text-white hover:bg-white/10"
                  >
                    Back to Dashboard
                  </Button>
                  {submission?.percentage !== undefined && (
                    <Button
                      onClick={() => navigate(createPageUrl(`StudentClassDetail?classId=${assignment.class_id}`))}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                    >
                      View Class
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button
                    onClick={() => navigate(createPageUrl('StudentDashboard'))}
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    Back to Dashboard
                  </Button>
                  <Button
                    onClick={handleStart}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/30 text-lg py-6"
                  >
                    <PlayCircle className="w-5 h-5 mr-2" />
                    {isInProgress ? 'Continue Assignment' : 'Start Assignment'}
                  </Button>
                </>
              )}
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}