import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import GlassCard from '@/components/ui/GlassCard';
import { Plus, Trash2, Edit2, X, TrendingUp } from 'lucide-react';

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

export default function TestScores() {
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    subject: '',
    test_name: '',
    score: '',
    total_marks: '',
    grade: '',
    date: '',
    topic: '',
    notes: '',
  });
  const queryClient = useQueryClient();

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

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const score = parseFloat(data.score);
      const total = parseFloat(data.total_marks);
      const percentage = (score / total) * 100;

      return base44.entities.TestScore.create({
        student_email: user.email,
        ...data,
        score,
        total_marks: total,
        percentage: Math.round(percentage * 10) / 10,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['testScores']);
      resetForm();
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const score = parseFloat(data.score);
      const total = parseFloat(data.total_marks);
      const percentage = (score / total) * 100;

      return base44.entities.TestScore.update(editingId, {
        ...data,
        score,
        total_marks: total,
        percentage: Math.round(percentage * 10) / 10,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['testScores']);
      resetForm();
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return base44.entities.TestScore.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['testScores']);
    },
  });

  const resetForm = () => {
    setFormData({
      subject: '',
      test_name: '',
      score: '',
      total_marks: '',
      grade: '',
      date: '',
      topic: '',
      notes: '',
    });
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!formData.subject || !formData.test_name || !formData.score || !formData.total_marks || !formData.date || !formData.topic) {
      alert('Please fill in all required fields');
      return;
    }

    if (editingId) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (test) => {
    setFormData({
      subject: test.subject,
      test_name: test.test_name,
      score: test.score.toString(),
      total_marks: test.total_marks.toString(),
      grade: test.grade || '',
      date: test.date,
      topic: test.topic,
      notes: test.notes || '',
    });
    setEditingId(test.id);
    setShowForm(true);
  };

  const getSubjectColor = (subject) => {
    return SUBJECTS.find(s => s.value === subject)?.color || SUBJECTS[7].color;
  };

  const calculatePercentage = () => {
    if (formData.score && formData.total_marks) {
      const score = parseFloat(formData.score);
      const total = parseFloat(formData.total_marks);
      if (total > 0) {
        return Math.round((score / total) * 100 * 10) / 10;
      }
    }
    return null;
  };

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
          <h1 className="text-4xl font-bold text-white mb-2">Test Scores</h1>
          <p className="text-slate-300">Track your progress across all subjects</p>
        </div>

        <div className="mb-6">
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 shadow-lg shadow-purple-500/30"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Test Score
          </Button>
        </div>

        {/* Form Modal */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
            >
              <motion.div
                className="bg-slate-950 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">
                    {editingId ? 'Edit Test Score' : 'Add New Test Score'}
                  </h2>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setShowForm(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-white mb-2 block">Subject *</Label>
                      <Select
                        value={formData.subject}
                        onValueChange={(value) =>
                          setFormData({ ...formData, subject: value })
                        }
                      >
                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {SUBJECTS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-white mb-2 block">Test Name *</Label>
                      <Input
                        placeholder="e.g., Algebra test"
                        value={formData.test_name}
                        onChange={(e) =>
                          setFormData({ ...formData, test_name: e.target.value })
                        }
                        className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                      />
                    </div>

                    <div>
                      <Label className="text-white mb-2 block">Score *</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 24"
                        value={formData.score}
                        onChange={(e) =>
                          setFormData({ ...formData, score: e.target.value })
                        }
                        className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                      />
                    </div>

                    <div>
                      <Label className="text-white mb-2 block">Total Marks *</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 30"
                        value={formData.total_marks}
                        onChange={(e) =>
                          setFormData({ ...formData, total_marks: e.target.value })
                        }
                        className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                      />
                    </div>

                    {calculatePercentage() !== null && (
                      <div className="md:col-span-2 p-3 rounded-lg bg-purple-500/20 border border-purple-500/30">
                        <p className="text-sm text-purple-200 mb-1">Percentage</p>
                        <p className="text-2xl font-bold text-white">{calculatePercentage()}%</p>
                      </div>
                    )}

                    <div>
                      <Label className="text-white mb-2 block">Grade (Optional)</Label>
                      <Input
                        placeholder="e.g., A, B+, 8/9"
                        value={formData.grade}
                        onChange={(e) =>
                          setFormData({ ...formData, grade: e.target.value })
                        }
                        className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                      />
                    </div>

                    <div>
                      <Label className="text-white mb-2 block">Date *</Label>
                      <Input
                        type="date"
                        value={formData.date}
                        onChange={(e) =>
                          setFormData({ ...formData, date: e.target.value })
                        }
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label className="text-white mb-2 block">Topic *</Label>
                      <Input
                        placeholder="e.g., Fractions, Rivers, Energy"
                        value={formData.topic}
                        onChange={(e) =>
                          setFormData({ ...formData, topic: e.target.value })
                        }
                        className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label className="text-white mb-2 block">Notes (Optional)</Label>
                      <Textarea
                        placeholder="e.g., revise equations"
                        value={formData.notes}
                        onChange={(e) =>
                          setFormData({ ...formData, notes: e.target.value })
                        }
                        className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-24"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end pt-4 border-t border-white/10">
                    <Button
                      variant="outline"
                      onClick={() => setShowForm(false)}
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={createMutation.isPending || updateMutation.isPending}
                      className="bg-gradient-to-r from-purple-500 to-blue-500"
                    >
                      {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Test Score'}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Test Scores by Topic - Column Layout */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : testScores.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <TrendingUp className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 mb-2">No test scores yet</p>
            <p className="text-slate-500 text-sm">Add your first test score to start tracking your progress</p>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-max">
            {Object.entries(
              testScores.reduce((acc, test) => {
                const topic = test.topic;
                if (!acc[topic]) acc[topic] = [];
                acc[topic].push(test);
                return acc;
              }, {})
            )
              .sort((a, b) => b[1][0].date.localeCompare(a[1][0].date))
              .map(([topic, tests], colIndex) => (
                <motion.div
                  key={topic}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: colIndex * 0.05 }}
                  className="flex flex-col gap-3"
                >
                  {/* Topic Header */}
                  <div className="sticky top-0 z-10">
                    <h3 className="text-lg font-bold text-white mb-3 px-3 py-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30">
                      {topic}
                    </h3>
                  </div>

                  {/* Tests in Column */}
                  {tests.map((test, testIndex) => (
                    <motion.div
                      key={test.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (colIndex * 0.05) + (testIndex * 0.02) }}
                    >
                      <GlassCard className="p-4 h-full">
                        {/* Subject Badge + Test Name */}
                        <div className="flex items-start gap-2 mb-3">
                          <div
                            className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getSubjectColor(
                              test.subject
                            )} flex items-center justify-center flex-shrink-0 shadow-lg`}
                          >
                            <span className="text-white font-bold text-xs text-center px-0.5">
                              {test.subject.split(' ').map(w => w[0]).join('')}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-white truncate">{test.test_name}</h4>
                            <p className="text-xs text-slate-400">{test.subject}</p>
                          </div>
                        </div>

                        {/* Score Display */}
                        <div className="mb-3 p-3 rounded-lg bg-white/5">
                          <p className="text-xs text-slate-400 mb-1">Score</p>
                          <p className="text-xl font-bold text-white mb-1">
                            {test.score}/{test.total_marks}
                          </p>
                          <p
                            className={`text-lg font-bold ${
                              test.percentage >= 70
                                ? 'text-emerald-400'
                                : test.percentage >= 50
                                ? 'text-amber-400'
                                : 'text-red-400'
                            }`}
                          >
                            {test.percentage}%
                          </p>
                        </div>

                        {/* Grade */}
                        {test.grade && (
                          <div className="mb-3 p-2 rounded-lg bg-white/5 text-center">
                            <p className="text-xs text-slate-400">Grade</p>
                            <p className="text-sm font-bold text-white">{test.grade}</p>
                          </div>
                        )}

                        {/* Date */}
                        <div className="mb-3 text-center text-xs text-slate-400">
                          {new Date(test.date).toLocaleDateString()}
                        </div>

                        {/* Notes */}
                        {test.notes && (
                          <div className="mb-3 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                            <p className="text-xs text-blue-300 leading-tight">{test.notes}</p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 justify-center pt-2 border-t border-white/10">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(test)}
                            className="flex-1 text-xs h-8 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20"
                          >
                            <Edit2 className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteMutation.mutate(test.id)}
                            className="flex-1 text-xs h-8 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </GlassCard>
                    </motion.div>
                  ))}
                </motion.div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}