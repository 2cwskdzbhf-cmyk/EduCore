import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { LearningPathEngine } from './LearningPathEngine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Target,
  BookOpen,
  Brain,
  Award,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Zap } from
'lucide-react';
import { Progress } from '@/components/ui/progress';
import ResourceSuggestions from '@/components/analytics/ResourceSuggestions';

export default function PersonalizedLearningPath({ studentEmail, classId }) {
  const navigate = useNavigate();
  const [selectedTopic, setSelectedTopic] = useState(null);

  // Fetch recommendations
  const { data: learningPath, isLoading } = useQuery({
    queryKey: ['learningPath', studentEmail, classId],
    queryFn: () => LearningPathEngine.generateRecommendations(studentEmail, classId),
    enabled: !!studentEmail
  });

  // Fetch progress tracking for selected topic
  const { data: topicProgress } = useQuery({
    queryKey: ['topicProgress', studentEmail, selectedTopic],
    queryFn: () => LearningPathEngine.trackProgress(studentEmail, selectedTopic),
    enabled: !!selectedTopic
  });

  // Fetch student progress for weak areas
  const { data: studentProgress } = useQuery({
    queryKey: ['studentProgress', studentEmail],
    queryFn: async () => {
      const progressList = await base44.entities.StudentProgress.filter({ student_email: studentEmail });
      return progressList[0] || null;
    },
    enabled: !!studentEmail
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-white/5 rounded-xl animate-pulse" />
        <div className="h-48 bg-white/5 rounded-xl animate-pulse" />
      </div>);

  }

  if (!learningPath) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-400">Complete some quizzes to get personalized recommendations!</p>
        </CardContent>
      </Card>);

  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':return 'bg-red-500/20 text-red-200 border-red-500/30';
      case 'medium':return 'bg-yellow-500/20 text-yellow-200 border-yellow-500/30';
      case 'low':return 'bg-green-500/20 text-green-200 border-green-500/30';
      default:return 'bg-slate-500/20 text-slate-200 border-slate-500/30';
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy':return 'bg-green-500/20 text-green-200';
      case 'medium':return 'bg-yellow-500/20 text-yellow-200';
      case 'hard':return 'bg-red-500/20 text-red-200';
      default:return 'bg-slate-500/20 text-slate-200';
    }
  };

  return null;



















































































































































































}