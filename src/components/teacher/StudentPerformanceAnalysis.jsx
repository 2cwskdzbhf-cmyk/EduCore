import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Brain, TrendingUp, Target, Lightbulb, RefreshCw, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function StudentPerformanceAnalysis({ classId }) {
  const [selectedStudent, setSelectedStudent] = useState('');
  const [analysis, setAnalysis] = useState(null);

  const { data: classData } = useQuery({
    queryKey: ['class', classId],
    queryFn: () => base44.entities.Class.filter({ id: classId }).then(r => r[0]),
    enabled: !!classId
  });

  const analyzeMutation = useMutation({
    mutationFn: async (studentEmail) => {
      const response = await base44.functions.invoke('analyzeStudentPerformance', { studentEmail });
      return response.data;
    },
    onSuccess: (data) => {
      setAnalysis(data);
      toast.success('Analysis complete');
    },
    onError: (error) => {
      toast.error('Failed to analyze performance');
      console.error(error);
    }
  });

  return (
    <div className="space-y-6">
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-400" />
            AI Performance Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-white">Select Student</Label>
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Choose a student..." />
              </SelectTrigger>
              <SelectContent>
                {classData?.student_emails?.map((email) => (
                  <SelectItem key={email} value={email}>
                    {email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={() => analyzeMutation.mutate(selectedStudent)}
            disabled={!selectedStudent || analyzeMutation.isPending}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500"
          >
            {analyzeMutation.isPending ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 mr-2" />
                Analyze Performance
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {analysis && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Overall Assessment */}
          <Card className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-blue-500/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Target className="w-5 h-5" />
                Overall Assessment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white">{analysis.analysis.overall}</p>
              <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-white">{analysis.performanceData.totalQuizzes}</div>
                  <div className="text-xs text-slate-300">Quizzes</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{Math.round(analysis.performanceData.avgAccuracy)}%</div>
                  <div className="text-xs text-slate-300">Accuracy</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{analysis.performanceData.currentStreak}</div>
                  <div className="text-xs text-slate-300">Day Streak</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Strengths */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                Strengths
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analysis.analysis.strengths.map((strength, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                    <p className="text-slate-300">{strength}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Areas for Improvement */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-orange-400" />
                Areas for Improvement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysis.analysis.improvements.map((improvement, index) => (
                  <div key={index} className="p-3 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-white font-medium mb-1">{improvement.area}</p>
                    <p className="text-sm text-slate-300">{improvement.advice}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-400" />
                Recommended Next Steps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analysis.analysis.nextSteps.map((step, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Badge className="bg-yellow-500/20 text-yellow-200 mt-1">{index + 1}</Badge>
                    <p className="text-slate-300">{step}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Motivation */}
          <Card className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/30">
            <CardContent className="p-6">
              <p className="text-white text-center italic">"{analysis.analysis.motivation}"</p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}