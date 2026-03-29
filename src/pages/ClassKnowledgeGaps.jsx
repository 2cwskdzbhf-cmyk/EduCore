import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, AlertTriangle, Users, Zap, RotateCcw, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { createPageUrl } from '@/utils';
import StudentGapRow from '@/components/teacher/StudentGapRow';

export default function ClassKnowledgeGaps() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState(searchParams.get('class_id') || '');
  const [expandedStudent, setExpandedStudent] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      const userData = await base44.auth.me();
      const role = userData?.user_type || userData?.role;
      if (role !== 'teacher' && role !== 'admin') {
        navigate(createPageUrl('TeacherDashboard'));
        return;
      }
      setUser(userData);
    };
    checkAuth();
  }, [navigate]);

  const { data: classes = [] } = useQuery({
    queryKey: ['teacherClasses', user?.email],
    queryFn: () => base44.entities.Class.filter({ teacher_email: user.email }),
    enabled: !!user?.email,
  });

  // Auto-select first class
  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  const selectedClass = classes.find(c => c.id === selectedClassId);

  const { data: allAttempts = [], isLoading: loadingAttempts } = useQuery({
    queryKey: ['classAttempts', selectedClassId],
    queryFn: async () => {
      if (!selectedClassId || !selectedClass) return [];
      const emails = selectedClass.student_emails || [];
      if (emails.length === 0) return [];
      // Fetch recent attempts for all students in this class
      const all = await base44.entities.QuizAttempt.filter({ class_id: selectedClassId }, '-created_date', 200);
      return all;
    },
    enabled: !!selectedClassId && !!selectedClass,
  });

  const { data: allProgress = [] } = useQuery({
    queryKey: ['classProgress', selectedClassId],
    queryFn: async () => {
      if (!selectedClass) return [];
      const emails = selectedClass.student_emails || [];
      if (emails.length === 0) return [];
      const all = await base44.entities.StudentProgress.list();
      return all.filter(p => emails.includes(p.student_email));
    },
    enabled: !!selectedClass,
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['topics'],
    queryFn: () => base44.entities.Topic.list(),
  });

  // Aggregate gaps per student
  const studentGapData = React.useMemo(() => {
    if (!selectedClass) return [];
    const students = selectedClass.student_emails || [];

    return students.map(email => {
      const studentAttempts = allAttempts.filter(a => a.student_email === email);
      const progress = allProgress.find(p => p.student_email === email);

      // Collect all AI-identified gaps across attempts
      const allGaps = studentAttempts.flatMap(a => a.ai_analysis?.gaps || []);
      const allFocusAreas = studentAttempts.flatMap(a => a.ai_analysis?.focus_areas || []);

      // Count gap frequency
      const gapFrequency = {};
      [...allGaps, ...allFocusAreas].forEach(g => {
        gapFrequency[g] = (gapFrequency[g] || 0) + 1;
      });
      const topGaps = Object.entries(gapFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([gap]) => gap);

      // Calculate average score
      const avgScore = studentAttempts.length > 0
        ? Math.round(studentAttempts.reduce((s, a) => s + (a.accuracy_percent || 0), 0) / studentAttempts.length)
        : null;

      const latestAttempt = studentAttempts[0];
      const hasAnalysis = !!latestAttempt?.ai_analysis;
      const weakSkills = progress?.weak_skills || [];

      return {
        email,
        avgScore,
        topGaps: topGaps.length > 0 ? topGaps : weakSkills.slice(0, 5),
        weakSkills,
        attemptsCount: studentAttempts.length,
        latestAttempt,
        hasAnalysis,
        isStruggling: avgScore !== null && avgScore < 60,
      };
    }).sort((a, b) => {
      // Sort struggling students first
      if (a.isStruggling && !b.isStruggling) return -1;
      if (!a.isStruggling && b.isStruggling) return 1;
      return (a.avgScore ?? 999) - (b.avgScore ?? 999);
    });
  }, [selectedClass, allAttempts, allProgress]);

  // Aggregate class-wide gap heatmap
  const classGaps = React.useMemo(() => {
    const freq = {};
    studentGapData.forEach(s => s.topGaps.forEach(g => {
      freq[g] = (freq[g] || 0) + 1;
    }));
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [studentGapData]);

  const strugglingCount = studentGapData.filter(s => s.isStruggling).length;

  // Trigger AI analysis for all students in class
  const triggerClassAnalysisMutation = useMutation({
    mutationFn: async () => {
      const results = [];
      for (const s of studentGapData) {
        if (s.latestAttempt && !s.hasAnalysis) {
          const res = await base44.functions.invoke('analyzeQuizGapsAndGenerateReport', {
            quiz_attempt_id: s.latestAttempt.id,
          });
          results.push(res);
        }
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['classAttempts', selectedClassId]);
    },
  });

  // Override / manually assign practice for a student
  const overrideMutation = useMutation({
    mutationFn: ({ student_email, topic_id, weak_areas }) =>
      base44.functions.invoke('assignPracticeModules', { student_email, topic_id, weak_areas }),
    onSuccess: () => {
      queryClient.invalidateQueries(['classAttempts', selectedClassId]);
      queryClient.invalidateQueries(['classProgress', selectedClassId]);
    },
  });

  if (!user) return null;

  const pendingAnalysis = studentGapData.filter(s => s.latestAttempt && !s.hasAnalysis).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate(createPageUrl('TeacherDashboard'))} className="text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white">Class Knowledge Gaps</h1>
            <p className="text-slate-400">AI-aggregated gap analysis & practice module management</p>
          </div>
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="w-64 bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Select a class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!selectedClassId ? (
          <div className="text-center py-20 text-slate-500">Select a class to view gap analysis</div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Total Students', value: selectedClass?.student_emails?.length || 0, color: 'text-blue-400' },
                { label: 'Struggling (<60%)', value: strugglingCount, color: 'text-red-400' },
                { label: 'Attempts Logged', value: allAttempts.length, color: 'text-purple-400' },
                { label: 'Pending Analysis', value: pendingAnalysis, color: 'text-yellow-400' },
              ].map(stat => (
                <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                  <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-slate-400 mt-1">{stat.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Class-Wide Gap Heatmap */}
            {classGaps.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  <h2 className="text-lg font-bold text-white">Class-Wide Gap Heatmap</h2>
                  <span className="text-xs text-slate-500 ml-2">Most common knowledge gaps across all students</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {classGaps.map(([gap, count]) => {
                    const intensity = count / (studentGapData.length || 1);
                    const bgClass = intensity > 0.5 ? 'bg-red-500/30 text-red-300 border-red-500/40'
                      : intensity > 0.25 ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                      : 'bg-slate-700/40 text-slate-300 border-slate-600/40';
                    return (
                      <span key={gap} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium ${bgClass}`}>
                        {gap}
                        <span className="text-xs opacity-70">×{count}</span>
                      </span>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Bulk Actions */}
            {pendingAnalysis > 0 && (
              <div className="flex items-center gap-3 mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <Zap className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <p className="text-sm text-blue-200 flex-1">
                  {pendingAnalysis} student{pendingAnalysis > 1 ? 's' : ''} have quiz attempts without AI analysis yet.
                </p>
                <Button
                  size="sm"
                  onClick={() => triggerClassAnalysisMutation.mutate()}
                  disabled={triggerClassAnalysisMutation.isPending}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 flex-shrink-0"
                >
                  {triggerClassAnalysisMutation.isPending ? 'Analysing...' : `Run Analysis (${pendingAnalysis})`}
                </Button>
              </div>
            )}

            {/* Student Rows */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                Student Breakdown
              </h2>
              {loadingAttempts ? (
                <div className="text-center py-12 text-slate-500">Loading student data...</div>
              ) : studentGapData.length === 0 ? (
                <div className="text-center py-12 text-slate-500">No students in this class yet</div>
              ) : (
                studentGapData.map(student => (
                  <StudentGapRow
                    key={student.email}
                    student={student}
                    topics={topics}
                    expanded={expandedStudent === student.email}
                    onToggle={() => setExpandedStudent(
                      expandedStudent === student.email ? null : student.email
                    )}
                    onTriggerAnalysis={(attemptId) =>
                      base44.functions.invoke('analyzeQuizGapsAndGenerateReport', { quiz_attempt_id: attemptId })
                        .then(() => queryClient.invalidateQueries(['classAttempts', selectedClassId]))
                    }
                    onOverride={(topicId, weakAreas) =>
                      overrideMutation.mutate({ student_email: student.email, topic_id: topicId, weak_areas: weakAreas })
                    }
                    overrideLoading={overrideMutation.isPending}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}