import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Award, AlertCircle, CheckCircle2, XCircle, Target, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function QuizPerformanceAnalytics({ classId }) {
  const [selectedQuizId, setSelectedQuizId] = useState(null);

  // Fetch all quiz sets for the class
  const { data: quizSets = [] } = useQuery({
    queryKey: ['quizSets', classId],
    queryFn: async () => {
      const sets = await base44.entities.QuizSet.list();
      return sets.filter(s => s.class_id === classId);
    }
  });

  // Fetch all quiz attempts
  const { data: allAttempts = [] } = useQuery({
    queryKey: ['quizAttempts', classId],
    queryFn: () => base44.entities.QuizAttempt.filter({ class_id: classId })
  });

  // Fetch quiz questions for selected quiz
  const { data: quizQuestions = [] } = useQuery({
    queryKey: ['quizQuestions', selectedQuizId],
    queryFn: () => base44.entities.QuizQuestion.filter({ quiz_set_id: selectedQuizId }),
    enabled: !!selectedQuizId
  });

  // Filter attempts for selected quiz
  const attempts = selectedQuizId 
    ? allAttempts.filter(a => a.quiz_id === selectedQuizId)
    : allAttempts;

  // Calculate quiz-level statistics
  const quizStats = quizSets.map(quiz => {
    const quizAttempts = allAttempts.filter(a => a.quiz_id === quiz.id);
    const uniqueStudents = new Set(quizAttempts.map(a => a.student_email)).size;
    const totalAttempts = quizAttempts.length;
    const avgAccuracy = quizAttempts.length > 0
      ? quizAttempts.reduce((sum, a) => sum + (a.accuracy_percent || 0), 0) / quizAttempts.length
      : 0;
    const completionRate = quiz.student_count > 0 ? (uniqueStudents / quiz.student_count) * 100 : 0;

    return {
      id: quiz.id,
      title: quiz.title,
      uniqueStudents,
      totalAttempts,
      avgAccuracy: Math.round(avgAccuracy),
      completionRate: Math.round(completionRate),
      highestScore: quizAttempts.length > 0 ? Math.max(...quizAttempts.map(a => a.accuracy_percent || 0)) : 0,
      lowestScore: quizAttempts.length > 0 ? Math.min(...quizAttempts.map(a => a.accuracy_percent || 0)) : 0
    };
  });

  // Calculate question-level analytics for selected quiz
  const questionAnalytics = quizQuestions.map(question => {
    const questionAttempts = attempts.flatMap(attempt => 
      (attempt.answers || []).filter(ans => ans.question_id === question.id)
    );
    
    const totalAnswers = questionAttempts.length;
    const correctAnswers = questionAttempts.filter(ans => ans.is_correct).length;
    const accuracy = totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0;
    
    // Find most common wrong answer
    const wrongAnswers = questionAttempts.filter(ans => !ans.is_correct);
    const wrongAnswerCounts = {};
    wrongAnswers.forEach(ans => {
      const answer = ans.answer || 'No answer';
      wrongAnswerCounts[answer] = (wrongAnswerCounts[answer] || 0) + 1;
    });
    const commonMistake = Object.keys(wrongAnswerCounts).length > 0
      ? Object.entries(wrongAnswerCounts).sort((a, b) => b[1] - a[1])[0]
      : null;

    return {
      id: question.id,
      prompt: question.prompt,
      accuracy: Math.round(accuracy),
      totalAnswers,
      correctAnswers,
      difficulty: accuracy > 75 ? 'Easy' : accuracy > 50 ? 'Medium' : 'Hard',
      commonMistake: commonMistake ? `"${commonMistake[0]}" (${commonMistake[1]} times)` : 'N/A'
    };
  }).sort((a, b) => a.accuracy - b.accuracy);

  // Score distribution for selected quiz
  const scoreDistribution = [
    { range: '0-20%', count: attempts.filter(a => a.accuracy_percent <= 20).length },
    { range: '21-40%', count: attempts.filter(a => a.accuracy_percent > 20 && a.accuracy_percent <= 40).length },
    { range: '41-60%', count: attempts.filter(a => a.accuracy_percent > 40 && a.accuracy_percent <= 60).length },
    { range: '61-80%', count: attempts.filter(a => a.accuracy_percent > 60 && a.accuracy_percent <= 80).length },
    { range: '81-100%', count: attempts.filter(a => a.accuracy_percent > 80).length }
  ];

  // Overall metrics
  const totalStudents = new Set(attempts.map(a => a.student_email)).size;
  const avgScore = attempts.length > 0
    ? Math.round(attempts.reduce((sum, a) => sum + (a.accuracy_percent || 0), 0) / attempts.length)
    : 0;
  const highestScore = attempts.length > 0 ? Math.max(...attempts.map(a => a.accuracy_percent || 0)) : 0;
  const lowestScore = attempts.length > 0 ? Math.min(...attempts.map(a => a.accuracy_percent || 0)) : 0;

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];

  return (
    <div className="space-y-6">
      {/* Quiz Selector */}
      <Card className="bg-slate-900/50 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Target className="w-5 h-5" />
            Quiz Performance Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedQuizId || 'all'} onValueChange={(v) => setSelectedQuizId(v === 'all' ? null : v)}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Quizzes</SelectItem>
              {quizSets.map(quiz => (
                <SelectItem key={quiz.id} value={quiz.id}>{quiz.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Overall Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-blue-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-200 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{totalStudents}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/20 to-green-600/20 border-green-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-200 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Average Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{avgScore}%</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border-yellow-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-yellow-200 flex items-center gap-2">
              <Award className="w-4 h-4" />
              Highest Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{Math.round(highestScore)}%</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/20 to-red-600/20 border-red-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-200 flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Lowest Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{Math.round(lowestScore)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Quiz Comparison Table */}
      {!selectedQuizId && (
        <Card className="bg-slate-900/50 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Quiz Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-slate-400 pb-2">Quiz</th>
                    <th className="text-right text-slate-400 pb-2">Students</th>
                    <th className="text-right text-slate-400 pb-2">Attempts</th>
                    <th className="text-right text-slate-400 pb-2">Avg Score</th>
                    <th className="text-right text-slate-400 pb-2">Completion</th>
                  </tr>
                </thead>
                <tbody>
                  {quizStats.map(quiz => (
                    <tr key={quiz.id} className="border-b border-white/5">
                      <td className="text-white py-3">{quiz.title}</td>
                      <td className="text-right text-slate-300">{quiz.uniqueStudents}</td>
                      <td className="text-right text-slate-300">{quiz.totalAttempts}</td>
                      <td className="text-right">
                        <Badge className={quiz.avgAccuracy >= 70 ? 'bg-green-500/20 text-green-200' : 'bg-yellow-500/20 text-yellow-200'}>
                          {quiz.avgAccuracy}%
                        </Badge>
                      </td>
                      <td className="text-right text-slate-300">{quiz.completionRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Score Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900/50 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Score Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                <XAxis dataKey="range" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Bar dataKey="count" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Score Distribution %</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={scoreDistribution}
                  dataKey="count"
                  nameKey="range"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {scoreDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Question-Level Analytics */}
      {selectedQuizId && questionAnalytics.length > 0 && (
        <Card className="bg-slate-900/50 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Question Difficulty Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {questionAnalytics.map((q, idx) => (
                <div key={q.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-slate-400 text-sm">Q{idx + 1}</span>
                        <Badge className={
                          q.difficulty === 'Easy' ? 'bg-green-500/20 text-green-200' :
                          q.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-200' :
                          'bg-red-500/20 text-red-200'
                        }>
                          {q.difficulty}
                        </Badge>
                        <Badge className="bg-blue-500/20 text-blue-200">
                          {q.accuracy}% correct
                        </Badge>
                      </div>
                      <p className="text-white text-sm">{q.prompt}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                    <div className="flex items-center gap-2 text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      {q.correctAnswers} correct
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <XCircle className="w-4 h-4 text-red-400" />
                      {q.totalAnswers - q.correctAnswers} incorrect
                    </div>
                  </div>

                  {q.commonMistake !== 'N/A' && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-xs text-slate-400">Most common mistake:</p>
                      <p className="text-sm text-orange-300 mt-1">{q.commonMistake}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Trends */}
      {selectedQuizId && attempts.length > 0 && (
        <Card className="bg-slate-900/50 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Performance Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={attempts.slice(-20).map((a, i) => ({
                attempt: i + 1,
                score: a.accuracy_percent
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                <XAxis dataKey="attempt" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Legend />
                <Line type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={2} name="Score %" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}