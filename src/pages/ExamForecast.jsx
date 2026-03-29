import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import GlassCard from '@/components/ui/GlassCard';
import { TrendingUp, TrendingDown, Minus, Target, Brain } from 'lucide-react';

const SUBJECTS = [
  { label: 'Maths', value: 'Maths', color: 'from-blue-500 to-blue-600' },
  { label: 'English', value: 'English', color: 'from-red-500 to-red-600' },
  { label: 'Science', value: 'Science', color: 'from-green-500 to-green-600' },
  { label: 'Geography', value: 'Geography', color: 'from-amber-500 to-amber-600' },
  { label: 'History', value: 'History', color: 'from-purple-500 to-purple-600' },
  { label: 'Spanish', value: 'Spanish', color: 'from-pink-500 to-pink-600' },
  { label: 'Computer Science', value: 'Computer Science', color: 'from-cyan-500 to-cyan-600' },
  { label: 'Other', value: 'Other', color: 'from-slate-500 to-slate-600' },
];

const percentageToGrade = (percentage) => {
  if (percentage >= 90) return 'A*';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  if (percentage >= 40) return 'E';
  return 'F';
};

const getGradeColor = (grade) => {
  switch (grade) {
    case 'A*':
    case 'A':
      return 'text-emerald-400';
    case 'B':
      return 'text-blue-400';
    case 'C':
      return 'text-amber-400';
    default:
      return 'text-red-400';
  }
};

export default function ExamForecast() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    fetchUser();
  }, []);

  const { data: testScores = [], isLoading } = useQuery({
    queryKey: ['testScores', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const tests = await base44.entities.TestScore.filter(
        { student_email: user.email },
        '-date'
      );
      return tests;
    },
    enabled: !!user?.email,
  });

  const analysis = useMemo(() => {
    if (testScores.length === 0) return null;

    const bySubject = {};

    // Organize tests by subject
    testScores.forEach((test) => {
      if (!bySubject[test.subject]) {
        bySubject[test.subject] = [];
      }
      bySubject[test.subject].push(test);
    });

    // Analyze each subject
    const subjectAnalysis = Object.keys(bySubject)
      .map((subject) => {
        const tests = bySubject[subject].sort(
          (a, b) => new Date(a.date) - new Date(b.date)
        );

        const percentages = tests.map((t) => t.percentage);
        const avg = percentages.reduce((a, b) => a + b, 0) / percentages.length;
        
        // Calculate trend (last 3 tests vs first 3 tests)
        const firstTests = percentages.slice(0, Math.min(3, percentages.length));
        const lastTests = percentages.slice(Math.max(0, percentages.length - 3));
        const firstAvg = firstTests.reduce((a, b) => a + b, 0) / firstTests.length;
        const lastAvg = lastTests.reduce((a, b) => a + b, 0) / lastTests.length;
        const trend = lastAvg - firstAvg;

        // Predict final exam grade
        // Use current average as base, adjust slightly based on trend
        const trendFactor = trend > 5 ? 1.02 : trend < -5 ? 0.98 : 1;
        const predictedPercentage = Math.min(100, Math.max(0, avg * trendFactor));
        const predictedGrade = percentageToGrade(predictedPercentage);

        return {
          subject,
          testCount: tests.length,
          currentAverage: Math.round(avg * 10) / 10,
          trend,
          predictedPercentage: Math.round(predictedPercentage * 10) / 10,
          predictedGrade,
          highestScore: Math.max(...percentages),
          lowestScore: Math.min(...percentages),
          recentPercentage: percentages[percentages.length - 1],
          improvement: Math.round((lastAvg - firstAvg) * 10) / 10,
        };
      })
      .sort((a, b) => b.currentAverage - a.currentAverage);

    // Calculate overall statistics
    const allPercentages = testScores.map((t) => t.percentage);
    const overallAverage = Math.round(
      (allPercentages.reduce((a, b) => a + b, 0) / allPercentages.length) * 10
    ) / 10;

    return {
      subjectAnalysis,
      overallAverage,
      totalTests: testScores.length,
      overallGrade: percentageToGrade(overallAverage),
    };
  }, [testScores]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Brain className="w-10 h-10 text-purple-400" />
            Exam Forecast
          </h1>
          <p className="text-slate-300">AI-powered final exam grade predictions based on your test history</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !analysis || analysis.subjectAnalysis.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <Target className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 mb-2">No test data available yet</p>
            <p className="text-slate-500 text-sm">Add at least one test score to see exam forecasts</p>
          </GlassCard>
        ) : (
          <>
            {/* Overall Summary */}
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0 }}
              >
                <GlassCard className="p-6">
                  <p className="text-sm text-slate-400 mb-2">Overall Average</p>
                  <p className="text-4xl font-bold text-white mb-1">{analysis.overallAverage}%</p>
                  <p className={`text-xl font-bold ${getGradeColor(analysis.overallGrade)}`}>
                    Grade: {analysis.overallGrade}
                  </p>
                </GlassCard>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
              >
                <GlassCard className="p-6">
                  <p className="text-sm text-slate-400 mb-2">Total Tests</p>
                  <p className="text-4xl font-bold text-white">{analysis.totalTests}</p>
                  <p className="text-xs text-slate-400 mt-2">Tests tracked across {analysis.subjectAnalysis.length} subjects</p>
                </GlassCard>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <GlassCard className="p-6">
                  <p className="text-sm text-slate-400 mb-2">Best Subject</p>
                  <p className="text-2xl font-bold text-white mb-1">
                    {analysis.subjectAnalysis[0]?.subject}
                  </p>
                  <p className="text-lg text-emerald-400 font-bold">
                    {analysis.subjectAnalysis[0]?.currentAverage}%
                  </p>
                </GlassCard>
              </motion.div>
            </div>

            {/* Subject Predictions */}
            <h2 className="text-2xl font-bold text-white mb-4">Subject Predictions</h2>
            <div className="space-y-4">
              {analysis.subjectAnalysis.map((subject, index) => {
                const subjectColor = SUBJECTS.find((s) => s.value === subject.subject)?.color;
                const trendIcon =
                  subject.trend > 2 ? (
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                  ) : subject.trend < -2 ? (
                    <TrendingDown className="w-5 h-5 text-red-400" />
                  ) : (
                    <Minus className="w-5 h-5 text-slate-400" />
                  );

                return (
                  <motion.div
                    key={subject.subject}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <GlassCard className="p-6">
                      <div className="flex items-start justify-between gap-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-4">
                            <div
                              className={`w-12 h-12 rounded-lg bg-gradient-to-br ${subjectColor} flex items-center justify-center flex-shrink-0 shadow-lg`}
                            >
                              <span className="text-white font-bold text-sm text-center px-1">
                                {subject.subject.split(' ').map((w) => w[0]).join('')}
                              </span>
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-white">{subject.subject}</h3>
                              <p className="text-sm text-slate-300">{subject.testCount} tests</p>
                            </div>
                          </div>

                          {/* Performance Metrics */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div>
                              <p className="text-xs text-slate-400 mb-1">Current Avg</p>
                              <p className="text-2xl font-bold text-white">{subject.currentAverage}%</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-400 mb-1">Recent Score</p>
                              <p className="text-2xl font-bold text-blue-400">{subject.recentPercentage}%</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-400 mb-1">Range</p>
                              <p className="text-sm text-slate-300">
                                {subject.lowestScore}% - {subject.highestScore}%
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-400 mb-1">Trend</p>
                              <div className="flex items-center gap-2">
                                {trendIcon}
                                <p
                                  className={`text-sm font-semibold ${
                                    subject.trend > 2
                                      ? 'text-emerald-400'
                                      : subject.trend < -2
                                      ? 'text-red-400'
                                      : 'text-slate-400'
                                  }`}
                                >
                                  {subject.improvement > 0 ? '+' : ''}
                                  {subject.improvement}%
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Trend Description */}
                          <div className="text-sm text-slate-400">
                            {subject.trend > 2 ? (
                              <p>📈 <span className="text-emerald-400">Improving trend</span> - Keep up the momentum!</p>
                            ) : subject.trend < -2 ? (
                              <p>📉 <span className="text-red-400">Declining trend</span> - Focus on weak areas</p>
                            ) : (
                              <p>➡️ <span className="text-slate-400">Stable performance</span> - Consistent results</p>
                            )}
                          </div>
                        </div>

                        {/* Prediction Box */}
                        <div className="flex-shrink-0 bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-xl p-6 text-center min-w-[180px]">
                          <p className="text-xs text-slate-400 mb-2 uppercase tracking-wide">Final Exam Forecast</p>
                          <p className="text-4xl font-bold text-white mb-2">{subject.predictedPercentage}%</p>
                          <p className={`text-2xl font-bold ${getGradeColor(subject.predictedGrade)}`}>
                            {subject.predictedGrade}
                          </p>
                          <p className="text-xs text-slate-400 mt-3">Estimated grade based on current performance</p>
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </div>

            {/* Insights Section */}
            <div className="mt-8 p-6 rounded-2xl border border-purple-500/30 bg-purple-500/10 backdrop-blur-xl">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-400" />
                Insights & Recommendations
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-300 mb-2">
                    <span className="font-semibold">📊 Performance Summary:</span> Your overall average of{' '}
                    <span className="text-white font-bold">{analysis.overallAverage}%</span> suggests a grade of{' '}
                    <span className={`font-bold ${getGradeColor(analysis.overallGrade)}`}>
                      {analysis.overallGrade}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-slate-300 mb-2">
                    <span className="font-semibold">🎯 Focus Areas:</span> Prioritize subjects with declining trends to
                    maximize your final exam performance.
                  </p>
                </div>
                <div>
                  <p className="text-slate-300 mb-2">
                    <span className="font-semibold">✨ Strength:</span> {analysis.subjectAnalysis[0]?.subject} is your
                    strongest subject with {analysis.subjectAnalysis[0]?.currentAverage}% average.
                  </p>
                </div>
                <div>
                  <p className="text-slate-300 mb-2">
                    <span className="font-semibold">📈 Improvement:</span> These predictions are based on your historical
                    data and trend analysis.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}