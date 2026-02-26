import React, { useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Sparkles, BookOpen, Video, FileText, Lightbulb, Clock, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AILearningResources({ studentEmail }) {
  const [resources, setResources] = React.useState([]);

  const suggestMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('suggestLearningResources', { studentEmail });
      return response.data;
    },
    onSuccess: (data) => {
      setResources(data.resources);
      toast.success('Resources updated');
    },
    onError: (error) => {
      toast.error('Failed to load resources');
      console.error(error);
    }
  });

  useEffect(() => {
    if (studentEmail) {
      suggestMutation.mutate();
    }
  }, [studentEmail]);

  const typeIcons = {
    practice: BookOpen,
    video: Video,
    article: FileText,
    project: Lightbulb,
    interactive: Sparkles
  };

  const difficultyColors = {
    easy: 'bg-green-500/20 text-green-200',
    medium: 'bg-yellow-500/20 text-yellow-200',
    hard: 'bg-red-500/20 text-red-200'
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            Recommended for You
          </CardTitle>
          <Button
            onClick={() => suggestMutation.mutate()}
            disabled={suggestMutation.isPending}
            variant="ghost"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 ${suggestMutation.isPending ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {resources.map((resource, index) => {
            const Icon = typeIcons[resource.type] || BookOpen;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 bg-white/5 rounded-lg border border-white/10 hover:border-purple-500/50 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-medium mb-1">{resource.title}</h4>
                    <p className="text-sm text-slate-300 mb-2">{resource.description}</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs capitalize">
                        {resource.type}
                      </Badge>
                      <Badge className={`text-xs ${difficultyColors[resource.difficulty]}`}>
                        {resource.difficulty}
                      </Badge>
                      {resource.targetArea && (
                        <Badge className="bg-blue-500/20 text-blue-200 text-xs">
                          {resource.targetArea}
                        </Badge>
                      )}
                      {resource.estimatedTime && (
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {resource.estimatedTime}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
          {resources.length === 0 && !suggestMutation.isPending && (
            <div className="text-center py-8 text-slate-400">
              <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>AI will suggest personalized resources based on your progress</p>
            </div>
          )}
          {suggestMutation.isPending && (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-purple-400" />
              <p className="text-slate-400">Loading recommendations...</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}