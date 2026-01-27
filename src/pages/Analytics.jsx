import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, TrendingUp, Users, AlertTriangle, Target, Brain } from 'lucide-react';
import ClassAnalytics from '@/components/analytics/ClassAnalytics';
import TopicAnalytics from '@/components/analytics/TopicAnalytics';
import StudentAnalytics from '@/components/analytics/StudentAnalytics';
import QuestionEffectiveness from '@/components/analytics/QuestionEffectiveness';

export default function Analytics() {
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedTopic, setSelectedTopic] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['teacher-classes'],
    queryFn: () => base44.entities.Class.filter({ teacher_email: user?.email }),
    enabled: !!user?.email
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['topics'],
    queryFn: () => base44.entities.Topic.list()
  });

  const { data: responses = [] } = useQuery({
    queryKey: ['quiz-responses', selectedClass, selectedTopic],
    queryFn: async () => {
      const sessions = await base44.entities.LiveQuizSession.list('-created_date', 1000);
      const sessionIds = sessions.map(s => s.id);
      
      const allResponses = await base44.entities.LiveQuizResponse.list('-created_date', 5000);
      return allResponses.filter(r => sessionIds.includes(r.session_id));
    }
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['questions'],
    queryFn: () => base44.entities.QuizQuestion.list('-created_date', 5000)
  });

  // Calculate overall metrics
  const totalResponses = responses.length;
  const correctResponses = responses.filter(r => r.is_correct).length;
  const overallAccuracy = totalResponses > 0 ? ((correctResponses / totalResponses) * 100).toFixed(1) : 0;
  const avgTimePerQuestion = totalResponses > 0 
    ? (responses.reduce((sum, r) => sum + (r.time_taken_seconds || 0), 0) / totalResponses).toFixed(1)
    : 0;

  // Unique students
  const uniqueStudents = new Set(responses.map(r => r.student_email)).size;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/50">
              <BarChart3 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Performance Analytics</h1>
              <p className="text-slate-400">Detailed insights into student performance and question effectiveness</p>
            </div>
          </div>
        </motion.div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{uniqueStudents}</p>
                <p className="text-xs text-slate-400">Active Students</p>
              </div>
            </div>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{overallAccuracy}%</p>
                <p className="text-xs text-slate-400">Overall Accuracy</p>
              </div>
            </div>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Brain className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalResponses}</p>
                <p className="text-xs text-slate-400">Total Responses</p>
              </div>
            </div>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{avgTimePerQuestion}s</p>
                <p className="text-xs text-slate-400">Avg Time/Question</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-white/5 border-white/10 backdrop-blur-xl p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Filter by Class</label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Filter by Topic</label>
              <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Topics</SelectItem>
                  {topics.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Analytics Tabs */}
        <Tabs defaultValue="class" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="class" className="data-[state=active]:bg-purple-500">Class Performance</TabsTrigger>
            <TabsTrigger value="topic" className="data-[state=active]:bg-purple-500">Topic Analysis</TabsTrigger>
            <TabsTrigger value="student" className="data-[state=active]:bg-purple-500">Student Performance</TabsTrigger>
            <TabsTrigger value="questions" className="data-[state=active]:bg-purple-500">Question Effectiveness</TabsTrigger>
          </TabsList>

          <TabsContent value="class">
            <ClassAnalytics 
              responses={responses} 
              classes={classes}
              selectedClass={selectedClass}
            />
          </TabsContent>

          <TabsContent value="topic">
            <TopicAnalytics 
              responses={responses}
              questions={questions}
              topics={topics}
              selectedTopic={selectedTopic}
            />
          </TabsContent>

          <TabsContent value="student">
            <StudentAnalytics 
              responses={responses}
              classes={classes}
              selectedClass={selectedClass}
            />
          </TabsContent>

          <TabsContent value="questions">
            <QuestionEffectiveness 
              responses={responses}
              questions={questions}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}