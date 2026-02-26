import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Sparkles, Brain, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import AIQuestionGenerator from '@/components/teacher/AIQuestionGenerator';
import StudentPerformanceAnalysis from '@/components/teacher/StudentPerformanceAnalysis';

export default function TeacherAIAssistant() {
  const navigate = useNavigate();
  const [selectedClass, setSelectedClass] = useState('');

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['teacherClasses', user?.email],
    queryFn: async () => {
      const allClasses = await base44.entities.Class.list();
      return allClasses.filter(c => c.teacher_email === user.email || c.co_teacher_emails?.includes(user.email));
    },
    enabled: !!user?.email
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('TeacherDashboard'))}
            className="text-slate-400 hover:text-white mb-4"
          >
            <ChevronLeft className="w-5 h-5 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">AI Teaching Assistant</h1>
              <p className="text-slate-400">Generate questions, analyze performance, and get insights</p>
            </div>
          </div>
        </motion.div>

        <Tabs defaultValue="questions" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="questions" className="data-[state=active]:bg-purple-500">
              <Target className="w-4 h-4 mr-2" />
              Question Generator
            </TabsTrigger>
            <TabsTrigger value="analysis" className="data-[state=active]:bg-purple-500">
              <Brain className="w-4 h-4 mr-2" />
              Performance Analysis
            </TabsTrigger>
          </TabsList>

          <TabsContent value="questions">
            <AIQuestionGenerator />
          </TabsContent>

          <TabsContent value="analysis">
            <div className="space-y-6">
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Select a Class</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {classes.map((cls) => (
                      <Card
                        key={cls.id}
                        className={`cursor-pointer transition-all ${
                          selectedClass === cls.id
                            ? 'bg-purple-500/20 border-purple-500'
                            : 'bg-white/5 border-white/10 hover:border-purple-500/50'
                        }`}
                        onClick={() => setSelectedClass(cls.id)}
                      >
                        <CardContent className="p-4">
                          <p className="text-white font-medium">{cls.name}</p>
                          <p className="text-sm text-slate-400 mt-1">
                            {cls.student_emails?.length || 0} students
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {selectedClass && (
                <StudentPerformanceAnalysis classId={selectedClass} />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}