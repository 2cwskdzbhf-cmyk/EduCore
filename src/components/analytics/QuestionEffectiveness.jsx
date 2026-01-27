import React from 'react';
import { Card } from '@/components/ui/card';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle, XCircle, TrendingDown, TrendingUp, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function QuestionEffectiveness({ responses, questions }) {
  const queryClient = useQueryClient();

  // Calculate effectiveness for each question
  const questionStats = questions.map(q => {
    const qResponses = responses.filter(r => r.question_id === q.id);
    const total = qResponses.length;
    const correct = qResponses.filter(r => r.is_correct).length;
    const accuracy = total > 0 ? (correct / total) * 100 : 0;
    const avgTime = total > 0 
      ? qResponses.reduce((sum, r) => sum + (r.time_taken_seconds || 0), 0) / total 
      : 0;

    // Calculate effectiveness score (0-100)
    // Higher score = good discrimination (not too easy, not too hard)
    // Target: 60-75% accuracy, reasonable time
    let effectiveness = 0;
    if (total >= 5) { // Need enough responses
      const accuracyScore = Math.max(0, 100 - Math.abs(accuracy - 67.5) * 2); // Optimal at 67.5%
      const timeScore = avgTime > 0 && avgTime < 30 ? 80 : 50; // Bonus for reasonable time
      effectiveness = (accuracyScore * 0.7 + timeScore * 0.3);
    }

    return {
      ...q,
      responses: total,
      correct,
      accuracy: accuracy.toFixed(1),
      avgTime: avgTime.toFixed(1),
      effectiveness: effectiveness.toFixed(1)
    };
  }).filter(q => q.responses > 0);

  // Sort by effectiveness
  const sortedByEffectiveness = [...questionStats].sort((a, b) => 
    parseFloat(b.effectiveness) - parseFloat(a.effectiveness)
  );

  // Identify problematic questions
  const tooEasy = questionStats.filter(q => parseFloat(q.accuracy) > 90);
  const tooHard = questionStats.filter(q => parseFloat(q.accuracy) < 40 && q.responses >= 5);
  const lowEffectiveness = questionStats.filter(q => parseFloat(q.effectiveness) < 50 && q.responses >= 5);

  // Update effectiveness scores mutation
  const updateEffectivenessMutation = useMutation({
    mutationFn: async () => {
      const updates = [];
      for (const q of questionStats) {
        if (q.responses >= 5) {
          updates.push(
            base44.entities.QuizQuestion.update(q.id, {
              effectiveness_score: parseFloat(q.effectiveness),
              usage_count: q.responses
            })
          );
        }
      }
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['questions']);
    }
  });

  return (
    <div className="space-y-6">
      <Card className="bg-white/5 border-white/10 backdrop-blur-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Question Effectiveness Scores</h3>
          <Button
            onClick={() => updateEffectivenessMutation.mutate()}
            disabled={updateEffectivenessMutation.isPending}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${updateEffectivenessMutation.isPending ? 'animate-spin' : ''}`} />
            Update Scores
          </Button>
        </div>
        <p className="text-sm text-slate-400 mb-4">
          Effectiveness score measures how well a question discriminates between students. 
          Best questions have 60-75% accuracy and reasonable completion time.
        </p>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {sortedByEffectiveness.slice(0, 20).map((q, idx) => (
            <div key={idx} className="p-4 bg-white/5 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <p className="text-white font-medium flex-1">{q.prompt}</p>
                <div className="flex items-center gap-2 ml-4">
                  <span className={`text-lg font-bold ${
                    parseFloat(q.effectiveness) >= 70 ? 'text-green-400' :
                    parseFloat(q.effectiveness) >= 50 ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {q.effectiveness}
                  </span>
                  {parseFloat(q.effectiveness) >= 70 ? (
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-400" />
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-400">
                <span>{q.correct}/{q.responses} correct</span>
                <span>•</span>
                <span>{q.accuracy}% accuracy</span>
                <span>•</span>
                <span>{q.avgTime}s avg time</span>
                <span>•</span>
                <span className="capitalize">{q.difficulty}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {(tooEasy.length > 0 || tooHard.length > 0 || lowEffectiveness.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tooEasy.length > 0 && (
            <Card className="bg-blue-500/10 border-blue-500/30 backdrop-blur-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-blue-400" />
                <h4 className="font-semibold text-white">Too Easy ({tooEasy.length})</h4>
              </div>
              <p className="text-sm text-slate-400 mb-2">Questions with &gt;90% accuracy</p>
              <div className="space-y-2 text-sm">
                {tooEasy.slice(0, 3).map((q, idx) => (
                  <p key={idx} className="text-slate-300 truncate">{q.prompt}</p>
                ))}
              </div>
            </Card>
          )}

          {tooHard.length > 0 && (
            <Card className="bg-red-500/10 border-red-500/30 backdrop-blur-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <XCircle className="w-5 h-5 text-red-400" />
                <h4 className="font-semibold text-white">Too Hard ({tooHard.length})</h4>
              </div>
              <p className="text-sm text-slate-400 mb-2">Questions with &lt;40% accuracy</p>
              <div className="space-y-2 text-sm">
                {tooHard.slice(0, 3).map((q, idx) => (
                  <p key={idx} className="text-slate-300 truncate">{q.prompt}</p>
                ))}
              </div>
            </Card>
          )}

          {lowEffectiveness.length > 0 && (
            <Card className="bg-amber-500/10 border-amber-500/30 backdrop-blur-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="w-5 h-5 text-amber-400" />
                <h4 className="font-semibold text-white">Low Effectiveness ({lowEffectiveness.length})</h4>
              </div>
              <p className="text-sm text-slate-400 mb-2">Questions needing review</p>
              <div className="space-y-2 text-sm">
                {lowEffectiveness.slice(0, 3).map((q, idx) => (
                  <p key={idx} className="text-slate-300 truncate">{q.prompt}</p>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}