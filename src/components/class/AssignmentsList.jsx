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
  AlertCircle,
  ChevronRight,
  Trash2
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
                          <div className="backdrop-blur-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl p-5 hover:shadow-lg hover:shadow-amber-500/20 transition-all duration-300 cursor-pointer">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold text-white group-hover:text-amber-300 transition-colors">
                                  {assignment.title}
                                </h3>
                                {assignment.description && (
                                  <p className="text-slate-400 text-sm mt-1 line-clamp-2">
                                    {assignment.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-4 mt-3 text-sm">
                                  <span className={`flex items-center gap-1 font-medium ${status.color}`}>
                                    <StatusIcon className="w-4 h-4" />
                                    {status.label}
                                  </span>
                                  {assignment.max_points && (
                                    <span className="text-slate-400">
                                      {assignment.max_points} points
                                    </span>
                                  )}
                                </div>
                              </div>
                              {!isTeacher && (
                                <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                                  <Button
                                    size="sm"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      markDoneMutation.mutate(assignment.id);
                                    }}
                                    variant="outline"
                                    className="border-slate-400/30 text-slate-300 hover:bg-white/10">
                                    Mark Done
                                  </Button>
                                  <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
                                </div>
                              )}
                              {isTeacher && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    deleteMutation.mutate(assignment.id);
                                  }}
                                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors ml-4">
                                  <Trash2 className="w-5 h-5" />
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
                    className="group opacity-60 hover:opacity-100 transition-opacity">
                    <Link to={createPageUrl(`TakeAssignment?id=${assignment.id}`)}>
                      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-5">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-white">
                              {assignment.title}
                            </h3>
                            {assignment.due_date && (
                              <p className="text-slate-500 text-sm mt-1">
                                Completed on{' '}
                                {new Date(assignment.due_date).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-600 flex-shrink-0" />
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