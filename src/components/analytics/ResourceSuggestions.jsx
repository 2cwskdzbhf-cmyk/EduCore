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
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            AI Learning Resource Suggestions
          </CardTitle>
          <Button
            onClick={handleGenerateSuggestions}
            disabled={loading}
            className="bg-gradient-to-r from-purple-500 to-blue-500"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Get Suggestions
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!resources ? (
          <div className="text-center py-8">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-slate-400" />
            <p className="text-slate-400">Click "Get Suggestions" to generate personalized learning resources</p>
            {weakSkills.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-slate-300 mb-2">Targeting skills:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {weakSkills.map((skill, i) => (
                    <Badge key={i} className="bg-orange-500/20 text-orange-200">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Performance Context */}
            <div className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-300">Current Performance:</span>
                <Badge className={resources.current_performance >= 70 ? 'bg-green-500/20 text-green-200' : 'bg-orange-500/20 text-orange-200'}>
                  {resources.current_performance}%
                </Badge>
              </div>
              {resources.motivation && (
                <p className="text-sm text-slate-300 mt-2 italic">"{resources.motivation}"</p>
              )}
            </div>

            {/* Learning Path Suggestion */}
            {resources.learning_path && (
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4 text-purple-400" />
                  Recommended Learning Path
                </h4>
                <p className="text-slate-300 text-sm">{resources.learning_path}</p>
              </div>
            )}

            {/* Resources Grid */}
            <div className="space-y-3">
              <h4 className="text-white font-semibold">Personalized Resources</h4>
              {resources.resources.map((resource, idx) => {
                const ResourceIcon = resourceIcons[resource.type] || BookOpen;
                return (
                  <div key={idx} className="p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-purple-500/20 rounded-lg">
                        <ResourceIcon className="w-5 h-5 text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h5 className="text-white font-medium">{resource.title}</h5>
                            <p className="text-xs text-slate-400 mt-1">{resource.description}</p>
                          </div>
                          {resource.url && (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={resource.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          <Badge variant="outline" className="text-xs">
                            {resource.type}
                          </Badge>
                          <Badge className={difficultyColors[resource.difficulty] || 'bg-slate-500/20 text-slate-200'}>
                            {resource.difficulty}
                          </Badge>
                          {resource.estimated_minutes && (
                            <div className="flex items-center gap-1 text-xs text-slate-400">
                              <Clock className="w-3 h-3" />
                              {resource.estimated_minutes} min
                            </div>
                          )}
                        </div>
                        {resource.focus_areas && resource.focus_areas.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-white/10">
                            <p className="text-xs text-slate-400 mb-2">Addresses:</p>
                            <div className="flex flex-wrap gap-2">
                              {resource.focus_areas.map((area, i) => (
                                <Badge key={i} className="bg-blue-500/20 text-blue-200 text-xs">
                                  {area}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}