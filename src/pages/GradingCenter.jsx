import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import GlassCard from '@/components/ui/GlassCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ChevronLeft, Star, CheckCircle2, AlertCircle, Clock, X,
  MessageSquare, Save, Users, ClipboardList, Award, Mic, Video
} from 'lucide-react';

const STATUS_CONFIG = {
  submitted:  { label: 'Submitted',  color: 'bg-blue-500/20 text-blue-300',    icon: CheckCircle2 },
  late:       { label: 'Late',       color: 'bg-amber-500/20 text-amber-300',   icon: Clock },
  missing:    { label: 'Missing',    color: 'bg-red-500/20 text-red-300',       icon: AlertCircle },
  graded:     { label: 'Graded',     color: 'bg-emerald-500/20 text-emerald-300', icon: Star },
};

export default function GradingCenter() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [gradingStudent, setGradingStudent] = useState(null);
  const [gradeForm, setGradeForm] = useState({ grade_value: '', grade_type: 'percentage', written_feedback: '', submission_status: 'graded' });

  useEffect(() => { base44.auth.me().then(setUser); }, []);

  const { data: classes = [] } = useQuery({
    queryKey: ['teacherClasses', user?.email],
    queryFn: () => base44.entities.Class.filter({ teacher_email: user.email }),
    enabled: !!user?.email,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['classAssignmentsGrading', selectedClassId],
    queryFn: () => base44.entities.Assignment.filter({ class_id: selectedClassId }, '-created_date'),
    enabled: !!selectedClassId,
  });

  const selectedClass = classes.find(c => c.id === selectedClassId);

  const { data: submissions = [] } = useQuery({
    queryKey: ['assignmentSubmissions', selectedAssignmentId],
    queryFn: () => base44.entities.AssignmentSubmission.filter({ assignment_id: selectedAssignmentId }),
    enabled: !!selectedAssignmentId,
  });

  const { data: existingGrades = [] } = useQuery({
    queryKey: ['assignmentGrades', selectedAssignmentId],
    queryFn: () => base44.entities.Grade.filter({ assignment_id: selectedAssignmentId }),
    enabled: !!selectedAssignmentId,
  });

  const saveGradeMutation = useMutation({
    mutationFn: async (data) => {
      const existing = existingGrades.find(g => g.student_email === gradingStudent.student_email);
      if (existing) {
        return base44.entities.Grade.update(existing.id, { ...data, graded_at: new Date().toISOString() });
      }
      return base44.entities.Grade.create({
        ...data,
        assignment_id: selectedAssignmentId,
        class_id: selectedClassId,
        teacher_email: user.email,
        graded_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['assignmentGrades', selectedAssignmentId]);
      setGradingStudent(null);
    }
  });

  // Build roster from class student_emails + submissions
  const roster = (selectedClass?.student_emails || []).map(email => {
    const submission = submissions.find(s => s.student_email === email);
    const grade = existingGrades.find(g => g.student_email === email);
    return { student_email: email, submission, grade };
  });

  const openGradeModal = (student) => {
    setGradingStudent(student);
    const g = student.grade;
    setGradeForm({
      grade_value: g?.grade_value || '',
      grade_type: g?.grade_type || 'percentage',
      written_feedback: g?.written_feedback || '',
      submission_status: g?.submission_status || student.submission?.status || 'submitted',
      student_email: student.student_email,
    });
  };

  const gradedCount = roster.filter(r => r.grade).length;
  const missingCount = roster.filter(r => !r.submission && !r.grade).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <Link to={createPageUrl('TeacherDashboard')} className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
            <ChevronLeft className="w-5 h-5" /> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Grading Centre</h1>
          <p className="text-slate-400 mb-8">Grade assignments and give feedback to students</p>

          {/* Filters */}
          <GlassCard className="p-4 mb-6 grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Class</label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Select a class..." />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Assignment</label>
              <Select value={selectedAssignmentId} onValueChange={setSelectedAssignmentId} disabled={!selectedClassId}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Select an assignment..." />
                </SelectTrigger>
                <SelectContent>
                  {assignments.map(a => <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </GlassCard>

          {/* Stats */}
          {selectedAssignmentId && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Total Students', value: roster.length, color: 'text-white' },
                { label: 'Graded', value: gradedCount, color: 'text-emerald-400' },
                { label: 'Missing', value: missingCount, color: 'text-red-400' },
              ].map(s => (
                <GlassCard key={s.label} className="p-4 text-center">
                  <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-slate-400 text-sm mt-1">{s.label}</p>
                </GlassCard>
              ))}
            </div>
          )}

          {/* Student List */}
          {selectedAssignmentId && (
            <div className="space-y-3">
              {roster.map((student, idx) => {
                const status = student.grade?.submission_status || (student.submission ? 'submitted' : 'missing');
                const sc = STATUS_CONFIG[status] || STATUS_CONFIG.submitted;
                const Icon = sc.icon;
                return (
                  <motion.div key={student.student_email} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }}>
                    <GlassCard className="p-4 hover:bg-white/10 transition-all cursor-pointer" onClick={() => openGradeModal(student)}>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                          {student.student_email.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{student.student_email.split('@')[0]}</p>
                          <p className="text-xs text-slate-400 truncate">{student.student_email}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {student.grade?.grade_value && (
                            <span className="text-lg font-bold text-emerald-400">{student.grade.grade_value}{student.grade.grade_type === 'percentage' ? '%' : ''}</span>
                          )}
                          <span className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full ${sc.color}`}>
                            <Icon className="w-3 h-3" />
                            {sc.label}
                          </span>
                          <Button size="sm" className="bg-gradient-to-r from-purple-500 to-blue-500 text-xs">
                            {student.grade ? 'Edit Grade' : 'Grade'}
                          </Button>
                        </div>
                      </div>
                      {student.grade?.written_feedback && (
                        <p className="text-xs text-slate-400 mt-2 pl-14 truncate">💬 {student.grade.written_feedback}</p>
                      )}
                    </GlassCard>
                  </motion.div>
                );
              })}
              {roster.length === 0 && (
                <GlassCard className="p-12 text-center">
                  <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">No students enrolled in this class</p>
                </GlassCard>
              )}
            </div>
          )}

          {!selectedAssignmentId && (
            <GlassCard className="p-12 text-center">
              <ClipboardList className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Select a class and assignment to start grading</p>
            </GlassCard>
          )}
        </motion.div>
      </div>

      {/* Grade Modal */}
      <AnimatePresence>
        {gradingStudent && (
          <motion.div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setGradingStudent(null)}
          >
            <motion.div
              className="w-full max-w-lg max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
            >
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                      {gradingStudent.student_email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{gradingStudent.student_email.split('@')[0]}</p>
                      <p className="text-xs text-slate-400">{gradingStudent.student_email}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setGradingStudent(null)} className="text-slate-400"><X className="w-5 h-5" /></Button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-slate-400 mb-1 block">Grade</label>
                      <Input
                        value={gradeForm.grade_value}
                        onChange={e => setGradeForm(p => ({ ...p, grade_value: e.target.value }))}
                        placeholder="e.g. 85, A, B+"
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-400 mb-1 block">Grade Type</label>
                      <Select value={gradeForm.grade_type} onValueChange={v => setGradeForm(p => ({ ...p, grade_type: v }))}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                          <SelectItem value="number">Number (e.g. 34/40)</SelectItem>
                          <SelectItem value="letter">Letter (A, B, C...)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Submission Status</label>
                    <Select value={gradeForm.submission_status} onValueChange={v => setGradeForm(p => ({ ...p, submission_status: v }))}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="submitted">Submitted</SelectItem>
                        <SelectItem value="late">Late</SelectItem>
                        <SelectItem value="missing">Missing</SelectItem>
                        <SelectItem value="graded">Graded</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm text-slate-400 mb-1 block flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" /> Written Feedback
                    </label>
                    <Textarea
                      value={gradeForm.written_feedback}
                      onChange={e => setGradeForm(p => ({ ...p, written_feedback: e.target.value }))}
                      placeholder="Write feedback for the student..."
                      className="bg-white/5 border-white/10 text-white min-h-[100px]"
                    />
                  </div>

                  <div className="flex gap-2 text-xs text-slate-500">
                    <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                      <Mic className="w-3 h-3" /> Audio feedback coming soon
                    </div>
                    <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                      <Video className="w-3 h-3" /> Video feedback coming soon
                    </div>
                  </div>

                  <Button
                    onClick={() => saveGradeMutation.mutate(gradeForm)}
                    disabled={saveGradeMutation.isPending}
                    className="w-full bg-gradient-to-r from-purple-500 to-blue-500"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saveGradeMutation.isPending ? 'Saving...' : 'Save Grade & Feedback'}
                  </Button>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}