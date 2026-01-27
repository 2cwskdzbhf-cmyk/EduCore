import React from 'react';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, TrendingDown } from 'lucide-react';

export default function TopicAnalytics({ responses, questions, topics, selectedTopic }) {
  // Map responses to questions to get topic info
  const responsesWithTopics = responses.map(r => {
    const question = questions.find(q => q.id === r.question_id);
    return {
      ...r,
      topic_id: question?.topic_id
    };
  });

  // Calculate topic metrics
  const topicMetrics = topics.map(topic => {
    const topicResponses = responsesWithTopics.filter(r => r.topic_id === topic.id);
    const total = topicResponses.length;
    const correct = topicResponses.filter(r => r.is_correct).length;
    const accuracy = total > 0 ? (correct / total) * 100 : 0;

    return {
      name: topic.name,
      accuracy: accuracy.toFixed(1),
      total,
      correct,
      id: topic.id
    };
  }).filter(t => t.total > 0).sort((a, b) => a.accuracy - b.accuracy);

  // Identify weak areas (accuracy < 60%)
  const weakAreas = topicMetrics.filter(t => parseFloat(t.accuracy) < 60);

  return (
    <div className="space-y-6">
      <Card className="bg-white/5 border-white/10 backdrop-blur-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Topic Performance</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={topicMetrics}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
            <XAxis dataKey="name" stroke="#94a3b8" angle={-45} textAnchor="end" height={100} />
            <YAxis stroke="#94a3b8" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
              labelStyle={{ color: '#e2e8f0' }}
            />
            <Bar dataKey="accuracy" fill="#10b981" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {weakAreas.length > 0 && (
        <Card className="bg-red-500/10 border-red-500/30 backdrop-blur-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <h3 className="text-lg font-semibold text-white">Areas of Difficulty</h3>
          </div>
          <div className="space-y-3">
            {weakAreas.map((topic, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <p className="font-medium text-white">{topic.name}</p>
                  <p className="text-sm text-slate-400">{topic.correct}/{topic.total} correct</p>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-400" />
                  <span className="text-lg font-bold text-red-400">{topic.accuracy}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {topicMetrics.map((topic, idx) => (
          <Card key={idx} className="bg-white/5 border-white/10 backdrop-blur-xl p-5">
            <h4 className="font-semibold text-white mb-2">{topic.name}</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Accuracy</span>
                <span className={`font-semibold ${parseFloat(topic.accuracy) >= 70 ? 'text-green-400' : 'text-red-400'}`}>
                  {topic.accuracy}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Responses</span>
                <span className="text-white">{topic.total}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}