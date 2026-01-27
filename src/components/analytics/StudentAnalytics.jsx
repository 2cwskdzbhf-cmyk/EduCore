import React from 'react';
import { Card } from '@/components/ui/card';
import { Trophy, TrendingUp, Clock } from 'lucide-react';

export default function StudentAnalytics({ responses, classes, selectedClass }) {
  // Group responses by student
  const studentStats = {};
  
  responses.forEach(r => {
    if (!studentStats[r.student_email]) {
      studentStats[r.student_email] = {
        email: r.student_email,
        total: 0,
        correct: 0,
        totalTime: 0,
        points: 0
      };
    }
    studentStats[r.student_email].total += 1;
    if (r.is_correct) studentStats[r.student_email].correct += 1;
    studentStats[r.student_email].totalTime += r.time_taken_seconds || 0;
    studentStats[r.student_email].points += r.points_earned || 0;
  });

  // Convert to array and calculate metrics
  const studentArray = Object.values(studentStats).map(s => ({
    ...s,
    accuracy: ((s.correct / s.total) * 100).toFixed(1),
    avgTime: (s.totalTime / s.total).toFixed(1)
  })).sort((a, b) => b.points - a.points);

  // Top performers
  const topPerformers = studentArray.slice(0, 10);

  return (
    <div className="space-y-6">
      <Card className="bg-white/5 border-white/10 backdrop-blur-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Trophy className="w-6 h-6 text-yellow-400" />
          <h3 className="text-lg font-semibold text-white">Top Performers</h3>
        </div>
        <div className="space-y-3">
          {topPerformers.map((student, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                  {idx + 1}
                </div>
                <div>
                  <p className="font-medium text-white">{student.email}</p>
                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    <span>{student.correct}/{student.total} correct</span>
                    <span>•</span>
                    <span>{student.accuracy}% accuracy</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-yellow-400">{student.points}</p>
                <p className="text-xs text-slate-400">points</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white/5 border-white/10 backdrop-blur-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <h4 className="font-semibold text-white">Highest Accuracy</h4>
          </div>
          <div className="space-y-2">
            {studentArray.slice(0, 5).sort((a, b) => b.accuracy - a.accuracy).map((s, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-slate-400 truncate">{s.email.split('@')[0]}</span>
                <span className="text-green-400 font-semibold">{s.accuracy}%</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="bg-white/5 border-white/10 backdrop-blur-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <Clock className="w-5 h-5 text-blue-400" />
            <h4 className="font-semibold text-white">Fastest Responders</h4>
          </div>
          <div className="space-y-2">
            {studentArray.slice(0, 5).sort((a, b) => parseFloat(a.avgTime) - parseFloat(b.avgTime)).map((s, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-slate-400 truncate">{s.email.split('@')[0]}</span>
                <span className="text-blue-400 font-semibold">{s.avgTime}s</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="bg-white/5 border-white/10 backdrop-blur-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <h4 className="font-semibold text-white">Most Active</h4>
          </div>
          <div className="space-y-2">
            {studentArray.slice(0, 5).sort((a, b) => b.total - a.total).map((s, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-slate-400 truncate">{s.email.split('@')[0]}</span>
                <span className="text-yellow-400 font-semibold">{s.total} responses</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}