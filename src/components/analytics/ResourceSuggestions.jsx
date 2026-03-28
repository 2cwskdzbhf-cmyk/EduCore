import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Sparkles, BookOpen, Video, FileText, Gamepad2, Clock, ExternalLink, Loader2, Target } from 'lucide-react';

const resourceIcons = {
  video: Video,
  article: FileText,
  practice: Target,
  interactive: Gamepad2,
  worksheet: FileText,
  game: Gamepad2
};

export default function ResourceSuggestions({ studentEmail, topicId, topicName, weakSkills = [], currentPerformance = 0 }) {
  const [loading, setLoading] = useState(false);
  const [resources, setResources] = useState(null);

  const handleGenerateSuggestions = async () => {
    if (!studentEmail || !topicId) {
      toast.error('Missing required information');
      return;
    }

    setLoading(true);
    try {
      const response = await base44.functions.invoke('suggestLearningResources', {
        studentEmail,
        topicId,
        weakSkills,
        performanceData: { currentPerformance }
      });

      setResources(response.data);
      toast.success('Resources generated!');
    } catch (error) {
      toast.error('Failed to generate suggestions: ' + error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const difficultyColors = {
    beginner: 'bg-green-500/20 text-green-200',
    intermediate: 'bg-yellow-500/20 text-yellow-200',
    advanced: 'bg-red-500/20 text-red-200'
  };

  return (
    <Card className="bg-white/5 border-white/10">
      























      
      






































































































      
    </Card>);

}