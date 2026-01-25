import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import GlassCard from '@/components/ui/GlassCard';
import { BarChart3, TrendingDown, AlertCircle, Trophy, TrendingUp, User } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function QuizAnalytics({ classId }) {
  const [selectedStudent, setSelectedStudent] = useState('all');
  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['quizAnalytics', classId],
    queryFn: async () => {
      if (!classId) return [];
      return base44.entities.AssignmentSubmission.filter({ class_id: classId });
    },
    enabled: !!classId
  });

  const { data: quizAttempts = [] } = useQuery({
    queryKey: ['quizAttempts', classId],
    queryFn: async () => {
      if (!classId) return [];
      return base44.entities.QuizAttempt.filter({ class_id: classId });
    },
    enabled: !!classId
  });

  const { data: liveQuizAnswers = [] } = useQuery({
    queryKey: ['liveQuizAnswers', classId],
    queryFn: async () => {
      if (!classId) return [];
      const sessions = await base44.entities.LiveQuizSession.filter({ class_id: classId });
      if (!sessions.length) return [];
      const allAnswers = await Promise.all(
        sessions.map(s => base44.entities.LiveQuizAnswer.filter({ session_id: s.id }))
      );
      return allAnswers.flat();
    },
    enabled: !!classId
  });

  const { data: students = [] } = useQuery({
    queryKey: ['classStudents', classId],
    queryFn: async () => {
      if (!classId) return [];
      const cls = await base44.entities.Class.filter({ id: classId });
      if (!cls[0]?.student_emails) return [];
      return cls[0].student_emails.map(email => ({ email, name: email.split('@')[0] }));
    },
    enabled: !!classId
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['allQuestions', classId],
    queryFn: async () => {
      if (!classId) return [];
      return base44.entities.QuizQuestion.list();
    },
    enabled: !!classId
  });

  if (isLoading) {
    return (
      <GlassCard className="p-6">
        <Skeleton className="h-8 w-48 mb-4 bg-white/10" />
        <div className="space-y-3">
          <Skeleton className="h-20 bg-white/10" />
          <Skeleton className="h-20 bg-white/10" />
        </div>
      </GlassCard>
    );
  }

  // Calculate overall stats
  const totalAttempts = quizAttempts.length + liveQuizAnswers.length;
  const averageScore = totalAttempts > 0
    ? Math.round(
        quizAttempts.reduce((sum, a) => sum + (a.accuracy_percent || 0), 0) / quizAttempts.length
      )
    : 0;

  // Find most common incorrect answers (from live quiz answers)
  const incorrectAnswers = liveQuizAnswers.filter(a => !a.is_correct);
  const questionErrorCounts = {};
  incorrectAnswers.forEach(a => {
    const qId = a.question_id || 'unknown';
    questionErrorCounts[qId] = (questionErrorCounts[qId] || 0) + 1;
  });

  const topIncorrectQuestions = Object.entries(questionErrorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // Calculate completion rate
  const completedSubmissions = submissions.filter(s => s.status === 'submitted' || s.status === 'graded').length;
  const completionRate = submissions.length > 0
    ? Math.round((completedSubmissions / submissions.length) * 100)
    : 0;

  // Student performance over time
  const getStudentTrend = (studentEmail) => {
    const studentAttempts = quizAttempts
      .filter(a => a.student_email === studentEmail)
      .sort((a, b) => new Date(a.completed_at) - new Date(b.completed_at))
      .slice(-10);
    
    return studentAttempts.map((a, i) => ({
      attempt: i + 1,
      score: a.accuracy_percent || 0,
      date: new Date(a.completed_at).toLocaleDateString()
    }));
  };

  // Question type analysis
  const questionTypeAnalysis = {};
  quizAttempts.forEach(attempt => {
    attempt.answers?.forEach(ans => {
      const q = questions.find(qq => qq.id === ans.question_id);
      const type = q?.question_type || 'multiple_choice';
      if (!questionTypeAnalysis[type]) {
        questionTypeAnalysis[type] = { correct: 0, total: 0 };
      }
      questionTypeAnalysis[type].total++;
      if (ans.is_correct) questionTypeAnalysis[type].correct++;
    });
  });

  const questionTypeData = Object.entries(questionTypeAnalysis).map(([type, data]) => ({
    type: type.replace('_', ' '),
    accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
    total: data.total
  }));

  // Score distribution for selected quiz or all quizzes
  const scoreDistribution = {};
  const attemptsToAnalyze = selectedStudent === 'all' 
    ? quizAttempts 
    : quizAttempts.filter(a => a.student_email === selectedStudent);

  attemptsToAnalyze.forEach(a => {
    const bucket = Math.floor((a.accuracy_percent || 0) / 10) * 10;
    scoreDistribution[bucket] = (scoreDistribution[bucket] || 0) + 1;
  });

  const scoreDistData = Object.entries(scoreDistribution).map(([range, count]) => ({
    range: `${range}-${parseInt(range) + 9}%`,
    count
  })).sort((a, b) => parseInt(a.range) - parseInt(b.range));

  // Student vs Class Average
  const studentVsClassData = students.map(student => {
    const studentAttempts = quizAttempts.filter(a => a.student_email === student.email);
    const studentAvg = studentAttempts.length > 0
      ? studentAttempts.reduce((sum, a) => sum + (a.accuracy_percent || 0), 0) / studentAttempts.length
      : 0;
    
    return {
      name: student.name,
      email: student.email,
      score: Math.round(studentAvg),
      attempts: studentAttempts.length
    };
  }).sort((a, b) => b.score - a.score);

  const classAverage = studentVsClassData.length > 0
    ? Math.round(studentVsClassData.reduce((sum, s) => sum + s.score, 0) / studentVsClassData.length)
    : 0;

  const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-bold text-white">Quiz Analytics</h3>
        </div>
        {students.length > 0 && (
          <Select value={selectedStudent} onValueChange={setSelectedStudent}>
            <SelectTrigger className="w-48 bg-white/5 border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students</SelectItem>
              {students.map(s => (
                <SelectItem key={s.email} value={s.email}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/5 p-4 rounded-xl">
          <Trophy className="w-5 h-5 text-amber-400 mb-2" />
          <p className="text-2xl font-bold text-white">{averageScore}%</p>
          <p className="text-xs text-slate-400">Avg Score</p>
        </div>
        <div className="bg-white/5 p-4 rounded-xl">
          <BarChart3 className="w-5 h-5 text-blue-400 mb-2" />
          <p className="text-2xl font-bold text-white">{totalAttempts}</p>
          <p className="text-xs text-slate-400">Total Attempts</p>
        </div>
        <div className="bg-white/5 p-4 rounded-xl">
          <TrendingUp className="w-5 h-5 text-emerald-400 mb-2" />
          <p className="text-2xl font-bold text-white">{completionRate}%</p>
          <p className="text-xs text-slate-400">Completion Rate</p>
        </div>
        <div className="bg-white/5 p-4 rounded-xl">
          <User className="w-5 h-5 text-purple-400 mb-2" />
          <p className="text-2xl font-bold text-white">{classAverage}%</p>
          <p className="text-xs text-slate-400">Class Average</p>
        </div>
      </div>

      {totalAttempts === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No quiz data yet</p>
        </div>
      ) : (
        <Tabs defaultValue="trends" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-white/5">
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="types">Question Types</TabsTrigger>
            <TabsTrigger value="distribution">Distribution</TabsTrigger>
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
          </TabsList>

          <TabsContent value="trends" className="mt-6">
            {selectedStudent !== 'all' ? (
              <div>
                <h4 className="text-sm font-semibold text-white mb-4">Performance Trend</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={getStudentTrend(selectedStudent)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="attempt" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                    <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                      labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Line type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Select a student to view performance trends</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="types" className="mt-6">
            {questionTypeData.length > 0 ? (
              <div>
                <h4 className="text-sm font-semibold text-white mb-4">Accuracy by Question Type</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={questionTypeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="type" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                    <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                      labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Bar dataKey="accuracy" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {questionTypeData.map((type, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-slate-300 capitalize">{type.type}</span>
                      <span className="text-white font-semibold">{type.accuracy}% ({type.total} questions)</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No question type data available</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="distribution" className="mt-6">
            {scoreDistData.length > 0 ? (
              <div>
                <h4 className="text-sm font-semibold text-white mb-4">Score Distribution</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={scoreDistData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="range" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                    <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                      labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Bar dataKey="count" fill="#10b981" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No score data available</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="comparison" className="mt-6">
            {studentVsClassData.length > 0 ? (
              <div>
                <h4 className="text-sm font-semibold text-white mb-4">Student vs Class Average ({classAverage}%)</h4>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {studentVsClassData.map((student, i) => (
                    <div key={student.email} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                      <span className="text-lg font-bold text-slate-400 w-8">#{i + 1}</span>
                      <div className="flex-1">
                        <p className="text-white font-medium">{student.name}</p>
                        <p className="text-xs text-slate-400">{student.attempts} attempts</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                            style={{ width: `${Math.min(100, student.score)}%` }}
                          />
                        </div>
                        <span className={`text-lg font-bold ${
                          student.score >= classAverage ? 'text-emerald-400' : 'text-orange-400'
                        }`}>
                          {student.score}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No student comparison data available</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </GlassCard>
  );
}