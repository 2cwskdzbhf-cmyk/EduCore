import React from 'react';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function ClassAnalytics({ responses, classes, selectedClass }) {
  // Filter responses by selected class
  const filteredResponses = selectedClass === 'all' 
    ? responses 
    : responses; // TODO: Filter by class when session has class_id

  // Calculate class-level metrics
  const classMetrics = classes.map(cls => {
    const classResponses = responses; // TODO: filter by class
    const total = classResponses.length;
    const correct = classResponses.filter(r => r.is_correct).length;
    const accuracy = total > 0 ? (correct / total) * 100 : 0;

    return {
      name: cls.name,
      accuracy: accuracy.toFixed(1),
      total,
      correct
    };
  });

  // Difficulty breakdown
  const difficultyStats = ['easy', 'medium', 'hard'].map(diff => {
    const diffResponses = responses.filter(r => r.difficulty === diff);
    const total = diffResponses.length;
    const correct = diffResponses.filter(r => r.is_correct).length;
    return {
      difficulty: diff.charAt(0).toUpperCase() + diff.slice(1),
      accuracy: total > 0 ? ((correct / total) * 100).toFixed(1) : 0,
      total
    };
  });

  return (
    <div className="space-y-6">
      <Card className="bg-white/5 border-white/10 backdrop-blur-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Class Performance Overview</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={classMetrics}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
            <XAxis dataKey="name" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
              labelStyle={{ color: '#e2e8f0' }}
            />
            <Bar dataKey="accuracy" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="bg-white/5 border-white/10 backdrop-blur-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Performance by Difficulty</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={difficultyStats}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
            <XAxis dataKey="difficulty" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
              labelStyle={{ color: '#e2e8f0' }}
            />
            <Bar dataKey="accuracy" fill="#3b82f6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {classMetrics.map((cls, idx) => (
          <Card key={idx} className="bg-white/5 border-white/10 backdrop-blur-xl p-5">
            <h4 className="font-semibold text-white mb-2">{cls.name}</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Accuracy</span>
                <span className="text-white font-semibold">{cls.accuracy}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Correct</span>
                <span className="text-green-400">{cls.correct}/{cls.total}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}