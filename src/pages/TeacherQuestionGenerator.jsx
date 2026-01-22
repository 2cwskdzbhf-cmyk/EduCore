import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import GlassCard from '@/components/ui/GlassCard';
import { Loader2, Sparkles, Trash2, RefreshCw, Save, AlertCircle, CheckCircle2, Edit2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function TeacherQuestionGenerator() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [count, setCount] = useState(15);
  const [difficulty, setDifficulty] = useState('medium');
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [regenerateFeedback, setRegenerateFeedback] = useState('');
  const [regeneratingIndex, setRegeneratingIndex] = useState(null);
  const [lastGenerateTime, setLastGenerateTime] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  useEffect(() => {
    if (cooldownRemaining > 0) {
      const timer = setTimeout(() => setCooldownRemaining(cooldownRemaining - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownRemaining]);

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
      if (userData.user_type !== 'teacher' && userData.role !== 'admin') {
        navigate(createPageUrl('TeacherDashboard'));
      }
    };
    fetchUser();
  }, [navigate]);

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => base44.entities.Subject.filter({ name: 'Mathematics' }),
    enabled: !!user
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['topics', subjects[0]?.id],
    queryFn: () => base44.entities.Topic.filter({ subject_id: subjects[0].id }, 'order'),
    enabled: !!subjects[0]?.id
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ['lessons', selectedTopic],
    queryFn: () => base44.entities.Lesson.filter({ topic_id: selectedTopic }, 'order'),
    enabled: !!selectedTopic
  });

  const generateMutation = useMutation({
    mutationFn: async ({ lessonId, topicId, regenerateIndex, regenerateFeedback }) => {
      const now = Date.now();
      if (now - lastGenerateTime < 30000) {
        const remainingSec = Math.ceil((30000 - (now - lastGenerateTime)) / 1000);
        throw new Error(`Please wait ${remainingSec}s before generating again`);
      }
      setLastGenerateTime(now);
      setCooldownRemaining(30);
      
      const response = await base44.functions.invoke('generateQuestionsAI', {
        lessonId,
        topicId,
        count: regenerateIndex !== null ? 1 : count,
        difficulty,
        regenerateIndex,
        regenerateFeedback
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      if (variables.regenerateIndex !== null) {
        // Replace specific question
        const newQuestions = [...generatedQuestions];
        newQuestions[variables.regenerateIndex] = data.questions[0];
        setGeneratedQuestions(newQuestions);
        setRegeneratingIndex(null);
        setRegenerateFeedback('');
      } else {
        setGeneratedQuestions(data.questions || []);
      }
    },
    onError: () => {
      setCooldownRemaining(0);
    }
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const lessonId = selectedLesson;
      const topicId = selectedTopic;

      for (const q of generatedQuestions) {
        await base44.entities.QuestionBankItem.create({
          lesson_id: lessonId || null,
          topic_id: topicId,
          type: q.type || 'fraction',
          prompt: q.prompt,
          correct_answer: q.correct_answer,
          allowed_forms: q.allowed_forms || ['fraction', 'decimal', 'simplified'],
          difficulty: q.difficulty || difficulty,
          explanation: q.explanation || '',
          teacher_email: user.email,
          is_active: true
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['questionBank']);
      setGeneratedQuestions([]);
      setSelectedLesson('');
    }
  });

  const handleGenerate = () => {
    generateMutation.mutate({
      lessonId: selectedLesson || null,
      topicId: selectedTopic,
      regenerateIndex: null,
      regenerateFeedback: ''
    });
  };

  const handleRegenerateOne = (index) => {
    setRegeneratingIndex(index);
    generateMutation.mutate({
      lessonId: selectedLesson || null,
      topicId: selectedTopic,
      regenerateIndex: index,
      regenerateFeedback
    });
  };

  const handleDelete = (index) => {
    setGeneratedQuestions(generatedQuestions.filter((_, i) => i !== index));
  };

  const handleEdit = (index) => {
    setEditingIndex(index);
    setEditingQuestion({ ...generatedQuestions[index] });
  };

  const handleSaveEdit = () => {
    const newQuestions = [...generatedQuestions];
    newQuestions[editingIndex] = editingQuestion;
    setGeneratedQuestions(newQuestions);
    setEditingIndex(null);
    setEditingQuestion(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">AI Question Generator</h1>
            <p className="text-slate-400">Generate practice questions using AI, then review and publish</p>
          </div>

          <GlassCard className="p-6 mb-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-white mb-2">Topic *</Label>
                  <Select value={selectedTopic} onValueChange={setSelectedTopic}>
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
                  <Label className="text-white mb-2">Lesson (optional)</Label>
                  <Select value={selectedLesson} onValueChange={setSelectedLesson} disabled={!selectedTopic}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Select lesson" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>All lessons</SelectItem>
                      {lessons.map(l => (
                        <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-white mb-2">Number of Questions</Label>
                  <Input
                    type="number"
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value) || 15)}
                    min={1}
                    max={30}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>

                <div>
                  <Label className="text-white mb-2">Difficulty</Label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
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

              <Button
                onClick={handleGenerate}
                disabled={!selectedTopic || generateMutation.isPending || cooldownRemaining > 0}
                className="w-full bg-gradient-to-r from-purple-500 to-blue-500"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : cooldownRemaining > 0 ? (
                  <>Wait {cooldownRemaining}s...</>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Practice Questions
                  </>
                )}
              </Button>
            </div>
          </GlassCard>

          {generateMutation.isError && (
            <GlassCard className="p-4 mb-6 border-red-500/50">
              <div className="flex items-start gap-2 text-red-400">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Generation failed</p>
                  <p className="text-sm text-red-300 mt-1">
                    {generateMutation.error?.response?.data?.error || 'Unknown error. Check console for details.'}
                  </p>
                </div>
              </div>
            </GlassCard>
          )}

          {generatedQuestions.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Generated Questions ({generatedQuestions.length})</h2>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setGeneratedQuestions([])}
                    variant="outline"
                    className="border-white/20 text-white"
                  >
                    Clear All
                  </Button>
                  <Button
                    onClick={() => publishMutation.mutate()}
                    disabled={publishMutation.isPending}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500"
                  >
                    {publishMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Publishing...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Publish All
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {generatedQuestions.map((q, index) => (
                <GlassCard key={index} className="p-4">
                  {editingIndex === index ? (
                    <div className="space-y-3">
                      <div>
                        <Label className="text-white mb-1">Question</Label>
                        <Textarea
                          value={editingQuestion.prompt}
                          onChange={(e) => setEditingQuestion({ ...editingQuestion, prompt: e.target.value })}
                          className="bg-white/5 border-white/10 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-white mb-1">Correct Answer</Label>
                        <Input
                          value={editingQuestion.correct_answer}
                          onChange={(e) => setEditingQuestion({ ...editingQuestion, correct_answer: e.target.value })}
                          className="bg-white/5 border-white/10 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-white mb-1">Explanation</Label>
                        <Textarea
                          value={editingQuestion.explanation}
                          onChange={(e) => setEditingQuestion({ ...editingQuestion, explanation: e.target.value })}
                          className="bg-white/5 border-white/10 text-white"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleSaveEdit} className="bg-emerald-500">
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Save
                        </Button>
                        <Button onClick={() => setEditingIndex(null)} variant="outline" className="border-white/20 text-white">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-bold text-purple-400">Q{index + 1}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-300">{q.difficulty || difficulty}</span>
                          </div>
                          <p className="text-white font-medium mb-2">{q.prompt}</p>
                          <p className="text-emerald-400 text-sm">Answer: {q.correct_answer}</p>
                          {q.explanation && <p className="text-slate-400 text-sm mt-1">{q.explanation}</p>}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(index)} className="text-blue-400">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRegenerateOne(index)}
                            disabled={regeneratingIndex === index}
                            className="text-purple-400"
                          >
                            {regeneratingIndex === index ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4" />
                            )}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(index)} className="text-red-400">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {regeneratingIndex === index && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <Label className="text-white text-xs mb-1">Regenerate with feedback (optional)</Label>
                          <Textarea
                            placeholder="e.g., Make it easier, use smaller numbers, avoid decimals..."
                            value={regenerateFeedback}
                            onChange={(e) => setRegenerateFeedback(e.target.value)}
                            className="bg-white/5 border-white/10 text-white text-sm h-20"
                          />
                        </div>
                      )}
                    </>
                  )}
                </GlassCard>
              ))}
            </div>
          )}

          {publishMutation.isSuccess && (
            <GlassCard className="p-4 mt-6 border-emerald-500/50">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                <span>Questions published successfully! Students can now practice.</span>
              </div>
            </GlassCard>
          )}
        </motion.div>
      </div>
    </div>
  );
}