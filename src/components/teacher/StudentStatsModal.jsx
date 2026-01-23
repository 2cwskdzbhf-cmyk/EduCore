import React from 'react';
import { motion } from 'framer-motion';
import { X, Clock, Target, Award, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/ui/GlassCard';
import { format } from 'date-fns';

export default function StudentStatsModal({ student, assignments, submissions, onClose }) {
  if (!student) return null;

  const studentSubmissions = submissions.filter(s => s.student_email === student.email);
  
  const totalQuestions = studentSubmissions.reduce((sum, s) => sum + (s.questions_answered || 0), 0);
  const totalCorrect = studentSubmissions.reduce((sum, s) => sum + (s.correct_answers || 0), 0);
  const totalTimeSeconds = studentSubmissions.reduce((sum, s) => sum + (s.time_spent_seconds || 0), 0);
  const accuracy = totalQuestions > 0 ? ((totalCorrect / totalQuestions) * 100).toFixed(1) : 0;
  
  const assignmentDetails = assignments.map(assignment => {
    const submission = studentSubmissions.find(s => s.assignment_id === assignment.id);
    if (!submission) {
      return {
        ...assignment,
        status: 'Not started',
        accuracy: null,
        questionsAnswered: 0,
        timeSpent: 0,
        lastActivity: null
      };
    }
    
    const submissionAccuracy = submission.questions_answered > 0 
      ? ((submission.correct_answers / submission.questions_answered) * 100).toFixed(1)
      : 0;
    
    return {
      ...assignment,
      status: submission.status || 'In progress',
      accuracy: submissionAccuracy,
      questionsAnswered: submission.questions_answered || 0,
      correctAnswers: submission.correct_answers || 0,
      timeSpent: submission.time_spent_seconds || 0,
      lastActivity: submission.updated_date
    };
  });

  const formatTime = (seconds) => {
    if (seconds === 0) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };
  
  const avgTimePerQuestion = totalQuestions > 0 
    ? formatTime(Math.floor(totalTimeSeconds / totalQuestions))
    : '—';

  return (
    <motion.div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <GlassCard className="p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{student.full_name}</h2>
              <p className="text-slate-400">{student.email}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>

          {/* Overall Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-purple-400" />
                <p className="text-xs text-slate-400">Accuracy</p>
              </div>
              <p className="text-2xl font-bold text-white">{accuracy}%</p>
            </div>
            
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-4 h-4 text-emerald-400" />
                <p className="text-xs text-slate-400">Questions</p>
              </div>
              <p className="text-2xl font-bold text-white">{totalQuestions}</p>
            </div>
            
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <p className="text-xs text-slate-400">Correct</p>
              </div>
              <p className="text-2xl font-bold text-white">{totalCorrect}</p>
            </div>
            
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <p className="text-xs text-slate-400">Total Time</p>
              </div>
              <p className="text-2xl font-bold text-white">{formatTime(totalTimeSeconds)}</p>
            </div>
            
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <p className="text-xs text-slate-400">Avg/Question</p>
              </div>
              <p className="text-2xl font-bold text-white">{avgTimePerQuestion}</p>
            </div>
          </div>

          {/* Assignment Breakdown */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4">Assignment Breakdown</h3>
            <div className="space-y-3">
              {assignmentDetails.map((assignment) => (
                <div
                  key={assignment.id}
                  className="bg-white/5 rounded-xl p-4 border border-white/10"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-white font-medium">{assignment.title}</h4>
                      {assignment.due_date && (
                        <p className="text-xs text-slate-400">
                          Due: {format(new Date(assignment.due_date), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      assignment.status === 'Not started' 
                        ? 'bg-slate-500/20 text-slate-400'
                        : assignment.status === 'submitted' || assignment.status === 'graded'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {assignment.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500 text-xs mb-1">Accuracy</p>
                      <p className="text-white font-medium">
                        {assignment.accuracy !== null ? `${assignment.accuracy}%` : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs mb-1">Questions</p>
                      <p className="text-white font-medium">{assignment.questionsAnswered}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs mb-1">Correct</p>
                      <p className="text-white font-medium">{assignment.correctAnswers || 0}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs mb-1">Time</p>
                      <p className="text-white font-medium">{formatTime(assignment.timeSpent)}</p>
                    </div>
                  </div>

                  {assignment.lastActivity && (
                    <p className="text-xs text-slate-500 mt-3">
                      Last activity: {format(new Date(assignment.lastActivity), 'MMM d, h:mm a')}
                    </p>
                  )}
                </div>
              ))}
              
              {assignmentDetails.length === 0 && (
                <p className="text-slate-400 text-center py-8">No assignments yet</p>
              )}
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}