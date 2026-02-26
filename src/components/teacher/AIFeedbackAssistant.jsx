import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Sparkles, ThumbsUp, AlertCircle, Loader2, Copy } from 'lucide-react';

export default function AIFeedbackAssistant({ submission, assignment, onFeedbackGenerated }) {
  const [generating, setGenerating] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const response = await base44.functions.invoke('generateAssignmentFeedback', {
        submissionId: submission.id,
        assignmentId: assignment.id,
        rubric: assignment.rubric || []
      });

      setFeedback(response.data.feedback);
      toast.success('AI feedback generated!');
    } catch (error) {
      toast.error('Failed to generate feedback: ' + error.message);
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const handleApplyFeedback = () => {
    if (!feedback) return;
    
    const combinedFeedback = `
**Strengths:**
${feedback.strengths.map((s, i) => `${i + 1}. ${s}`).join('\n')}

**Areas for Improvement:**
${feedback.improvements.map((imp, i) => `${i + 1}. ${imp}`).join('\n')}

**Overall:**
${feedback.overall_feedback}
    `.trim();

    onFeedbackGenerated({
      feedback: combinedFeedback,
      rubricScores: feedback.rubric_scores,
      suggestedScore: feedback.suggested_score,
      suggestedPercentage: feedback.suggested_percentage
    });

    toast.success('Feedback applied!');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="space-y-4">
      <Button
        onClick={handleGenerate}
        disabled={generating}
        className="w-full bg-gradient-to-r from-purple-500 to-blue-500"
      >
        {generating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating AI Feedback...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate AI Feedback
          </>
        )}
      </Button>

      {feedback && (
        <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                AI-Generated Feedback
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={handleApplyFeedback}>
                Apply to Assignment
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Suggested Score */}
            {feedback.suggested_percentage > 0 && (
              <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg">
                <span className="text-slate-300">Suggested Score:</span>
                <Badge className="bg-green-500/20 text-green-200 text-lg">
                  {feedback.suggested_percentage}%
                </Badge>
              </div>
            )}

            {/* Strengths */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-green-400 font-semibold flex items-center gap-2">
                  <ThumbsUp className="w-4 h-4" />
                  Strengths
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(feedback.strengths.join('\n'))}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              <ul className="space-y-2">
                {feedback.strengths.map((strength, idx) => (
                  <li key={idx} className="text-slate-300 text-sm flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">✓</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Areas for Improvement */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-orange-400 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Areas for Improvement
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(feedback.improvements.join('\n'))}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              <ul className="space-y-2">
                {feedback.improvements.map((improvement, idx) => (
                  <li key={idx} className="text-slate-300 text-sm flex items-start gap-2">
                    <span className="text-orange-400 mt-0.5">→</span>
                    <span>{improvement}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Rubric Scores */}
            {feedback.rubric_scores && feedback.rubric_scores.length > 0 && (
              <div>
                <h4 className="text-blue-400 font-semibold mb-2">Rubric Assessment</h4>
                <div className="space-y-2">
                  {feedback.rubric_scores.map((rs, idx) => (
                    <div key={idx} className="p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white font-medium">{rs.criteria}</span>
                        <Badge className="bg-blue-500/20 text-blue-200">
                          {rs.score}/{assignment.rubric?.[idx]?.max_points || 0}
                        </Badge>
                      </div>
                      {rs.feedback && (
                        <p className="text-xs text-slate-400">{rs.feedback}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Overall Feedback */}
            <div className="pt-4 border-t border-white/10">
              <h4 className="text-white font-semibold mb-2">Overall Assessment</h4>
              <p className="text-slate-300 text-sm">{feedback.overall_feedback}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}