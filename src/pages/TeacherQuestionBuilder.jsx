import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import GlassCard from '@/components/ui/GlassCard';
import { AnswerChecker } from '@/components/practice/AnswerChecker';
import {
  Plus,
  Check,
  X,
  Save,
  BookOpen,
  Target
} from 'lucide-react';

export default function TeacherQuestionBuilder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);

  const [formData, setFormData] = useState({
    subject_id: '',
    topic_id: '',
    lesson_id: '',
    type: 'fraction',
    prompt: '',
    correct_answer: '',
    allowed_forms: ['fraction'],
    difficulty: 'medium',
    hint: '',
    explanation: '',
    tags: []
  });

  const [testAnswer, setTestAnswer] = useState('');
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    fetchUser();
  }, []);

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => base44.entities.Subject.filter({ is_active: true }, 'order')
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['topics', formData.subject_id],
    queryFn: async () => {
      if (!formData.subject_id) return [];
      return base44.entities.Topic.filter({ subject_id: formData.subject_id }, 'order');
    },
    enabled: !!formData.subject_id
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ['lessons', formData.topic_id],
    queryFn: async () => {
      if (!formData.topic_id) return [];
      return base44.entities.Lesson.filter({ topic_id: formData.topic_id }, 'order');
    },
    enabled: !!formData.topic_id
  });

  const createQuestionMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.QuestionBankItem.create({
        ...data,
        teacher_email: user.email,
        is_active: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['questions']);
      // Reset form
      setFormData({
        subject_id: formData.subject_id,
        topic_id: formData.topic_id,
        lesson_id: '',
        type: 'fraction',
        prompt: '',
        correct_answer: '',
        allowed_forms: ['fraction'],
        difficulty: 'medium',
        hint: '',
        explanation: '',
        tags: []
      });
      setTestAnswer('');
      setTestResult(null);
    }
  });

  const handleTestAnswer = () => {
    if (!testAnswer || !formData.correct_answer) {
      setTestResult(null);
      return;
    }

    const isCorrect = AnswerChecker.checkAnswer(
      testAnswer,
      formData.correct_answer,
      formData.allowed_forms
    );

    setTestResult(isCorrect);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.topic_id || !formData.prompt || !formData.correct_answer) return;

    await createQuestionMutation.mutateAsync(formData);
  };

  const toggleAllowedForm = (form) => {
    const newForms = formData.allowed_forms.includes(form)
      ? formData.allowed_forms.filter(f => f !== form)
      : [...formData.allowed_forms, form];
    setFormData({ ...formData, allowed_forms: newForms });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">Create Practice Question</h1>
          <p className="text-slate-400">Build typed-answer questions for your students</p>
        </motion.div>

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left Column - Form */}
            <div className="space-y-6">
              <GlassCard className="p-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-purple-400" />
                  Question Setup
                </h2>

                <div className="space-y-4">
                  <div>
                    <Label className="text-slate-300">Subject</Label>
                    <Select value={formData.subject_id} onValueChange={(value) => setFormData({ ...formData, subject_id: value, topic_id: '', lesson_id: '' })}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-slate-300">Topic *</Label>
                    <Select value={formData.topic_id} onValueChange={(value) => setFormData({ ...formData, topic_id: value, lesson_id: '' })} disabled={!formData.subject_id}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue placeholder="Select topic" />
                      </SelectTrigger>
                      <SelectContent>
                        {topics.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-slate-300">Lesson (optional)</Label>
                    <Select value={formData.lesson_id} onValueChange={(value) => setFormData({ ...formData, lesson_id: value })} disabled={!formData.topic_id}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue placeholder="Select lesson" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>None</SelectItem>
                        {lessons.map(l => (
                          <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-slate-300">Question Type</Label>
                    <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fraction">Fractions</SelectItem>
                        <SelectItem value="percentage">Percentages</SelectItem>
                        <SelectItem value="ratio">Ratio</SelectItem>
                        <SelectItem value="algebra">Algebra</SelectItem>
                        <SelectItem value="indices">Indices</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-slate-300">Difficulty</Label>
                    <Select value={formData.difficulty} onValueChange={(value) => setFormData({ ...formData, difficulty: value })}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-400" />
                  Answer Configuration
                </h2>

                <div className="space-y-4">
                  <div>
                    <Label className="text-slate-300">Correct Answer *</Label>
                    <Input
                      value={formData.correct_answer}
                      onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                      placeholder="e.g., 3/4 or 0.75"
                      className="bg-white/5 border-white/10 text-white"
                    />
                    <p className="text-xs text-slate-500 mt-1">Enter in simplest or clearest form</p>
                  </div>

                  <div>
                    <Label className="text-slate-300">Allowed Answer Forms</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {['fraction', 'decimal', 'mixed', 'simplified'].map(form => (
                        <button
                          key={form}
                          type="button"
                          onClick={() => toggleAllowedForm(form)}
                          className={`px-3 py-1 rounded-lg text-sm transition-all ${
                            formData.allowed_forms.includes(form)
                              ? 'bg-purple-500 text-white'
                              : 'bg-white/5 text-slate-400 hover:bg-white/10'
                          }`}
                        >
                          {form}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Right Column - Question Content */}
            <div className="space-y-6">
              <GlassCard className="p-6">
                <h2 className="text-lg font-bold text-white mb-4">Question Content</h2>

                <div className="space-y-4">
                  <div>
                    <Label className="text-slate-300">Question Prompt *</Label>
                    <Textarea
                      value={formData.prompt}
                      onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                      placeholder="Enter the question text..."
                      className="bg-white/5 border-white/10 text-white h-24"
                    />
                  </div>

                  <div>
                    <Label className="text-slate-300">Hint (optional)</Label>
                    <Textarea
                      value={formData.hint}
                      onChange={(e) => setFormData({ ...formData, hint: e.target.value })}
                      placeholder="Provide a helpful hint..."
                      className="bg-white/5 border-white/10 text-white h-20"
                    />
                  </div>

                  <div>
                    <Label className="text-slate-300">Explanation (optional)</Label>
                    <Textarea
                      value={formData.explanation}
                      onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                      placeholder="Explain the solution..."
                      className="bg-white/5 border-white/10 text-white h-24"
                    />
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-6">
                <h2 className="text-lg font-bold text-white mb-4">Test Answer Checker</h2>
                <div className="space-y-3">
                  <Input
                    value={testAnswer}
                    onChange={(e) => {
                      setTestAnswer(e.target.value);
                      setTestResult(null);
                    }}
                    placeholder="Type a test answer..."
                    className="bg-white/5 border-white/10 text-white"
                  />
                  <Button
                    type="button"
                    onClick={handleTestAnswer}
                    disabled={!testAnswer || !formData.correct_answer}
                    variant="outline"
                    className="w-full border-white/20 text-white"
                  >
                    Test Answer
                  </Button>

                  {testResult !== null && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3 rounded-lg flex items-center gap-2 ${
                        testResult ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-red-500/20 border border-red-500/30'
                      }`}
                    >
                      {testResult ? (
                        <>
                          <Check className="w-5 h-5 text-emerald-400" />
                          <span className="text-emerald-400 font-medium">Correct!</span>
                        </>
                      ) : (
                        <>
                          <X className="w-5 h-5 text-red-400" />
                          <span className="text-red-400 font-medium">Incorrect</span>
                        </>
                      )}
                    </motion.div>
                  )}
                </div>
              </GlassCard>

              <Button
                type="submit"
                disabled={!formData.topic_id || !formData.prompt || !formData.correct_answer || createQuestionMutation.isPending}
                className="w-full bg-gradient-to-r from-purple-500 to-blue-500 h-12 text-lg"
              >
                <Save className="w-5 h-5 mr-2" />
                {createQuestionMutation.isPending ? 'Saving...' : 'Save Question'}
              </Button>

              {createQuestionMutation.isSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-center"
                >
                  <Check className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                  <p className="text-emerald-400 font-medium">Question saved successfully!</p>
                </motion.div>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}