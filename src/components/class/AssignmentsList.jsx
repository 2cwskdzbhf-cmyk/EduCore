import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  Trash2,
  Loader2
} from 'lucide-react';

export default function AssignmentsList({ classId, user, isTeacher, onCreateClick }) {
  const queryClient = useQueryClient();

  const { data: assignments = [] } = useQuery({
    queryKey: ['classAssignments', classId],
    queryFn: () =>
      base44.entities.Assignment.filter(
        { class_id: classId, status: 'published' },
        '-due_date'
      ),
    enabled: !!classId
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['classSubmissions', classId],
    queryFn: () =>
      base44.entities.AssignmentSubmission.filter({
        class_id: classId
      }),
    enabled: !!classId
  });

  const { data: assignmentStatuses = [] } = useQuery({
    queryKey: ['studentAssignmentStatuses', user?.email],
    queryFn: () =>
      base44.entities.StudentAssignmentStatus.filter({
        student_email: user.email
      }),
    enabled: !isTeacher && !!user?.email
  });

  const deleteMutation = useMutation({
    mutationFn: async (assignmentId) => {
      const subs = submissions.filter((s) => s.assignment_id === assignmentId);
      for (const s of subs) {
        await base44.entities.AssignmentSubmission.delete(s.id);
      }
      await base44.entities.Assignment.delete(assignmentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classAssignments', classId] });
      queryClient.invalidateQueries({ queryKey: ['classSubmissions', classId] });
    }
  });

  const markDoneMutation = useMutation({
    mutationFn: async (assignmentId) => {
      const existing = await base44.entities.StudentAssignmentStatus.filter({
        assignment_id: assignmentId,
        student_email: user.email
      });
      if (existing.length > 0) {
        await base44.entities.StudentAssignmentStatus.update(existing[0].id, {
          marked_done_by_student: true
        });
      } else {
        await base44.entities.StudentAssignmentStatus.create({
          assignment_id: assignmentId,
          student_email: user.email,
          class_id: classId,
          marked_done_by_student: true
        });
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['studentAssignmentStatuses', user?.email]
      })
  });

  const getDueStatus = (dueDate) => {
    if (!dueDate) return { label: 'No due date', color: 'text-slate-400', icon: Clock };
    const days = Math.ceil(
      (new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24)
    );
    if (days < 0) return { label: 'Overdue', color: 'text-red-400', icon: AlertCircle };
    if (days === 0) return { label: 'Due today', color: 'text-red-500', icon: AlertCircle };
    if (days === 1) return { label: 'Due tomorrow', color: 'text-amber-400', icon: AlertCircle };
    if (days <= 3) return { label: `Due in ${days}d`, color: 'text-amber-400', icon: Clock };
    return { label: `Due in ${days}d`, color: 'text-slate-400', icon: Calendar };
  };

  const getSubmissionStatus = (assignmentId) => {
    const isMarkedDone = assignmentStatuses.some(s => s.assignment_id === assignmentId && s.marked_done_by_student);
    if (isMarkedDone) return { label: 'Completed', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', icon: CheckCircle2 };
    const sub = submissions.find(s => s.assignment_id === assignmentId && s.student_email === user?.email);
    if (!sub || sub.status === 'not_started') return { label: 'Not Started', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', icon: XCircle };
    if (['submitted', 'graded'].includes(sub.status)) return { label: 'Submitted', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', icon: CheckCircle2 };
    return { label: 'In Progress', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', icon: AlertCircle };
  };

  const now = new Date();
  const dueAssignments = assignments.filter((a) => {
    if (!a.due_date) return false;
    const dueDate = new Date(a.due_date);
    const isDone = assignmentStatuses.some(
      (s) => s.assignment_id === a.id && s.marked_done_by_student
    );
    const sub = submissions.find((s) => s.assignment_id === a.id);
    return (
      !isDone &&
      dueDate > now &&
      (!sub || ['not_started', 'in_progress'].includes(sub.status))
    );
  });

  const completedAssignments = assignments.filter(
    (a) =>
      submissions.some(
        (s) =>
          s.assignment_id === a.id &&
          ['submitted', 'graded'].includes(s.status)
      ) || assignmentStatuses.some((s) => s.assignment_id === a.id)
  );

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/10 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-10 p-6">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-3xl font-bold text-white">📋 Assignments</h1>
            <p className="text-slate-400 text-sm mt-1">
              {dueAssignments.length} due, {completedAssignments.length} completed
            </p>
          </div>
          {isTeacher && (
            <Button
              onClick={onCreateClick}
              className="bg-gradient-to-r from-purple-500 to-blue-500">
              + Create Assignment
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6 space-y-6">
          {/* Due Assignments */}
          {dueAssignments.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                Pending ({dueAssignments.length})
              </h2>
              <AnimatePresence>
                <div className="space-y-3">
                  {dueAssignments.map((assignment, index) => {
                    const status = getDueStatus(assignment.due_date);
                    const StatusIcon = status.icon;
                    return (
                      <motion.div
                        key={assignment.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="group">
                        <Link to={createPageUrl(`TakeAssignment?id=${assignment.id}`)}>
                          <div className="backdrop-blur-xl bg-white/[0.04] border border-white/10 rounded-2xl p-5 hover:bg-white/[0.08] hover:border-white/20 hover:shadow-lg transition-all duration-300 cursor-pointer">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <h3 className="text-base font-semibold text-white group-hover:text-purple-300 transition-colors truncate">
                                    {assignment.title}
                                  </h3>
                                  {!isTeacher && (() => {
                                    const st = getSubmissionStatus(assignment.id);
                                    const StIcon = st.icon;
                                    return (
                                      <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${st.color} ${st.bg} flex-shrink-0`}>
                                        <StIcon className="w-3 h-3" />
                                        {st.label}
                                      </span>
                                    );
                                  })()}
                                </div>
                                {assignment.description && (
                                  <p className="text-slate-400 text-sm mt-1 line-clamp-1">
                                    {assignment.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-4 mt-2.5 text-xs">
                                  <span className={`flex items-center gap-1 font-medium ${status.color}`}>
                                    <StatusIcon className="w-3.5 h-3.5" />
                                    {status.label}
                                  </span>
                                  {assignment.max_points && (
                                    <span className="text-slate-500">
                                      {assignment.max_points} pts
                                    </span>
                                  )}
                                </div>
                              </div>
                              {!isTeacher && (
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <Button
                                    size="sm"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      markDoneMutation.mutate(assignment.id);
                                    }}
                                    disabled={markDoneMutation.isPending}
                                    variant="outline"
                                    className="border-slate-600/50 text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/40 text-xs h-7 px-2.5">
                                    {markDoneMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                                    Done
                                  </Button>
                                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                                </div>
                              )}
                              {isTeacher && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    deleteMutation.mutate(assignment.id);
                                  }}
                                  className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              </AnimatePresence>
            </div>
          )}

          {/* Completed Assignments */}
          {completedAssignments.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2 opacity-75">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Completed ({completedAssignments.length})
              </h2>
              <div className="space-y-3">
                {completedAssignments.map((assignment, index) => (
                  <motion.div
                    key={assignment.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group">
                    <Link to={createPageUrl(`TakeAssignment?id=${assignment.id}`)}>
                      <div className="backdrop-blur-xl bg-emerald-500/[0.04] border border-emerald-500/20 rounded-2xl p-4 hover:bg-emerald-500/[0.08] transition-all">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            <h3 className="text-sm font-medium text-slate-300 truncate">
                              {assignment.title}
                            </h3>
                          </div>
                          <span className="text-xs text-emerald-400 font-semibold flex-shrink-0">Completed</span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {assignments.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-24">
              <p className="text-4xl mb-4">📋</p>
              <p className="text-xl font-semibold text-white mb-2">
                No assignments yet
              </p>
              <p className="text-slate-400">
                {isTeacher
                  ? 'Create your first assignment to get started'
                  : 'Your teacher will add assignments here'}
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}