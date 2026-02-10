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
  Zap
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-white/5 rounded-xl animate-pulse" />
        <div className="h-48 bg-white/5 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!learningPath) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-400">Complete some quizzes to get personalized recommendations!</p>
        </CardContent>
      </Card>
    );
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-200 border-red-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-200 border-yellow-500/30';
      case 'low': return 'bg-green-500/20 text-green-200 border-green-500/30';
      default: return 'bg-slate-500/20 text-slate-200 border-slate-500/30';
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500/20 text-green-200';
      case 'medium': return 'bg-yellow-500/20 text-yellow-200';
      case 'hard': return 'bg-red-500/20 text-red-200';
      default: return 'bg-slate-500/20 text-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-purple-500/30">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg">
                  <Brain className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Your Learning Path</h2>
                  <p className="text-purple-200">{learningPath.message}</p>
                </div>
              </div>
              {learningPath.overallAccuracy && (
                <div className="text-right">
                  <div className="text-3xl font-bold text-white">{learningPath.overallAccuracy}%</div>
                  <p className="text-sm text-purple-200">Overall Accuracy</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recommendations */}
      <div className="space-y-4">
        {learningPath.recommendations.length === 0 ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-8 text-center">
              <Award className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Excellent Work!</h3>
              <p className="text-slate-300 mb-4">You're performing great across all topics. Keep up the amazing work!</p>
              <Button className="bg-gradient-to-r from-purple-500 to-blue-500">
                Explore Advanced Challenges
              </Button>
            </CardContent>
          </Card>
        ) : (
          learningPath.recommendations.map((rec, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getPriorityColor(rec.priority)}>
                          {rec.priority} priority
                        </Badge>
                        {rec.difficulty && (
                          <Badge className={getDifficultyColor(rec.difficulty)}>
                            {rec.difficulty}
                          </Badge>
                        )}
                        {rec.type === 'topic_practice' && <Target className="w-4 h-4 text-blue-400" />}
                        {rec.type === 'subtopic_focus' && <Zap className="w-4 h-4 text-yellow-400" />}
                        {rec.type === 'challenge' && <Sparkles className="w-4 h-4 text-purple-400" />}
                      </div>
                      
                      <CardTitle className="text-white text-lg">
                        {rec.type === 'topic_practice' && `Practice ${rec.topic}`}
                        {rec.type === 'subtopic_focus' && `Focus: ${rec.subtopic}`}
                        {rec.type === 'challenge' && rec.title}
                      </CardTitle>
                      
                      <p className="text-slate-300 text-sm mt-2">{rec.reason}</p>

                      {rec.accuracy !== undefined && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                            <span>Current Accuracy</span>
                            <span>{rec.accuracy}%</span>
                          </div>
                          <Progress value={rec.accuracy} className="h-2" />
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  {rec.quizzes && rec.quizzes.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-400 mb-2">Recommended Quizzes:</p>
                      {rec.quizzes.map((quiz) => (
                        <div key={quiz.id} className="flex items-center justify-between bg-white/5 rounded-lg p-3 border border-white/10">
                          <div className="flex items-center gap-3">
                            <BookOpen className="w-4 h-4 text-blue-400" />
                            <div>
                              <p className="text-white text-sm font-medium">{quiz.title}</p>
                              <p className="text-xs text-slate-400">{quiz.description}</p>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            className="bg-gradient-to-r from-purple-500 to-blue-500"
                            onClick={() => navigate(createPageUrl('Quiz') + `?id=${quiz.id}`)}
                          >
                            Start <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {rec.type === 'subtopic_focus' && (
                    <Button 
                      className="w-full mt-3 bg-gradient-to-r from-yellow-500 to-orange-500"
                      onClick={() => {
                        // Navigate to practice for this subtopic
                        navigate(createPageUrl('Topic') + `?id=${rec.topicId}`);
                      }}
                    >
                      Practice {rec.subtopic} <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Progress Tracking */}
      {topicProgress && topicProgress.trend !== 'insufficient_data' && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              {topicProgress.trend === 'improving' ? (
                <TrendingUp className="w-5 h-5 text-green-400" />
              ) : topicProgress.trend === 'declining' ? (
                <TrendingDown className="w-5 h-5 text-red-400" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-blue-400" />
              )}
              Progress Tracking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{Math.round(topicProgress.previousLevel)}%</p>
                <p className="text-xs text-slate-400">Previous Average</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{Math.round(topicProgress.currentLevel)}%</p>
                <p className="text-xs text-slate-400">Current Average</p>
              </div>
              <div className="text-center">
                <p className={`text-2xl font-bold ${topicProgress.improvement > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {topicProgress.improvement > 0 ? '+' : ''}{topicProgress.improvement}%
                </p>
                <p className="text-xs text-slate-400">Change</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}