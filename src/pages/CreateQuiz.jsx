import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import GlassCard from '@/components/ui/GlassCard';
import { 
  ChevronLeft, Plus, Trash2, GripVertical, Save, Play, 
  BookOpen, Sparkles, Check, X, Edit2
} from 'lucide-react';

export default function CreateQuiz() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  
  const [quizSet, setQuizSet] = useState({
    title: '',
    description: '',
    subject_id: '',
    topic_id: '',
    time_limit_per_question: 15000,
    status: 'draft'
  });

  const [questions, setQuestions] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [generateCount, setGenerateCount] = useState(5);
  const [generateDifficulty, setGenerateDifficulty] = useState('medium');

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    fetchUser();
  }, []);

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => base44.entities.Subject.list()
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['topics', quizSet.subject_id],
    queryFn: () => base44.entities.Topic.filter({ subject_id: quizSet.subject_id }),
    enabled: !!quizSet.subject_id
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ['lessons', quizSet.topic_id],
    queryFn: () => base44.entities.Lesson.filter({ topic_id: quizSet.topic_id }),
    enabled: !!quizSet.topic_id
  });

  const generateQuestionsMutation = useMutation({
    mutationFn: async ({ lessonId, count, difficulty }) => {
      const response = await base44.functions.invoke('generateQuestionsFromLesson', {
        lessonId,
        count,
        difficulty
      });
      return response.data;
    }
  });

  const saveQuizMutation = useMutation({
    mutationFn: async ({ status }) => {
      // Create quiz set
      const createdSet = await base44.entities.QuizSet.create({
        ...quizSet,
        owner_email: user.email,
        question_count: questions.length,
        status
      });

      // Create questions
      await Promise.all(
        questions.map((q, index) =>
          base44.entities.QuizQuestion.create({
            quiz_set_id: createdSet.id,
            order: index,
            ...q
          })
        )
      );

      return createdSet;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['quizSets']);
      navigate(createPageUrl('QuizLibrary'));
    }
  });

  const startLiveQuizMutation = useMutation({
    mutationFn: async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const classId = urlParams.get('classId');

      console.log('[DEBUG] Starting live quiz with', questions.length, 'questions');
      
      // Validate questions
      if (questions.length === 0) {
        throw new Error('No questions to start quiz with');
      }

      const invalidQuestions = questions.filter(q => 
        !q.prompt || q.options.length !== 4 || q.options.some(o => !o.trim())
      );
      
      if (invalidQuestions.length > 0) {
        throw new Error(`${invalidQuestions.length} question(s) are incomplete. Each must have a prompt and 4 options.`);
      }

      // Generate unique join code
      const generateCode = () => Math.random().toString(36).substr(2, 6).toUpperCase();
      let joinCode = generateCode();
      let attempts = 0;
      while (attempts < 10) {
        const existing = await base44.entities.LiveQuizSession.filter({ join_code: joinCode });
        if (existing.length === 0) break;
        joinCode = generateCode();
        attempts++;
      }

      // Create session
      const session = await base44.entities.LiveQuizSession.create({
        class_id: classId,
        host_email: user.email,
        live_quiz_set_id: 'manual-' + Date.now(),
        status: 'lobby',
        current_question_index: -1,
        player_count: 0,
        join_code: joinCode,
        settings: {
          time_per_question: quizSet.time_limit_per_question,
          base_points: 500,
          round_multiplier_increment: 0.25
        }
      });

      console.log('[DEBUG] Session created:', session.id);

      // Create questions linked to session
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        await base44.entities.LiveQuizQuestion.create({
          live_quiz_set_id: session.id,
          order: i,
          prompt: q.prompt,
          correct_answer: q.options[q.correct_index],
          allowed_forms: ['exact'],
          difficulty: q.difficulty || 'medium',
          explanation: q.explanation || '',
          type: 'multiple_choice',
          hint: ''
        });
      }

      console.log('[DEBUG] Created', questions.length, 'questions for session');

      return session;
    },
    onSuccess: (session) => {
      console.log('[DEBUG] Navigating to lobby for session:', session.id);
      navigate(createPageUrl(`TeacherLiveQuizLobby?sessionId=${session.id}`));
    },
    onError: (error) => {
      console.error('[ERROR] Failed to start live quiz:', error);
      alert('Failed to start live quiz: ' + (error.message || 'Unknown error'));
    }
  });

  const handleGenerateQuestions = async () => {
    if (!selectedLesson) return;

    const result = await generateQuestionsMutation.mutateAsync({
      lessonId: selectedLesson,
      count: generateCount,
      difficulty: generateDifficulty
    });

    if (result.questions) {
      setQuestions([...questions, ...result.questions]);
      setShowImportDialog(false);
    }
  };

  const addManualQuestion = () => {
    setQuestions([
      ...questions,
      {
        prompt: '',
        options: ['', '', '', ''],
        correct_index: 0,
        difficulty: 'medium',
        explanation: ''
      }
    ]);
    setEditingIndex(questions.length);
  };

  const updateQuestion = (index, field, value) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const updateOption = (qIndex, optIndex, value) => {
    const updated = [...questions];
    updated[qIndex].options[optIndex] = value;
    setQuestions(updated);
  };

  const deleteQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const canSave = quizSet.title && questions.length > 0 && 
    questions.every(q => q.prompt && q.options.every(o => o.trim()));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-slate-400 hover:text-white mb-4"
          >
            <ChevronLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-white mb-2">Create Live Quiz</h1>
          <p className="text-slate-400">Build your quiz set for live gameplay</p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Quiz Info Sidebar */}
          <div className="lg:col-span-1">
            <GlassCard className="p-6 sticky top-6">
              <h3 className="font-semibold text-white mb-4">Quiz Details</h3>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-slate-300">Title *</Label>
                  <Input
                    value={quizSet.title}
                    onChange={(e) => setQuizSet({ ...quizSet, title: e.target.value })}
                    placeholder="My Awesome Quiz"
                    className="mt-1 bg-white/5 border-white/10 text-white"
                  />
                </div>

                <div>
                  <Label className="text-slate-300">Description</Label>
                  <Textarea
                    value={quizSet.description}
                    onChange={(e) => setQuizSet({ ...quizSet, description: e.target.value })}
                    placeholder="What's this quiz about?"
                    className="mt-1 bg-white/5 border-white/10 text-white"
                    rows={3}
                  />
                </div>

                <div>
                  <Label className="text-slate-300">Subject</Label>
                  <Select 
                    value={quizSet.subject_id} 
                    onValueChange={(v) => setQuizSet({ ...quizSet, subject_id: v, topic_id: '' })}
                  >
                    <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {quizSet.subject_id && (
                  <div>
                    <Label className="text-slate-300">Topic</Label>
                    <Select 
                      value={quizSet.topic_id} 
                      onValueChange={(v) => setQuizSet({ ...quizSet, topic_id: v })}
                    >
                      <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white">
                        <SelectValue placeholder="Select topic" />
                      </SelectTrigger>
                      <SelectContent>
                        {topics.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label className="text-slate-300">Time per Question (seconds)</Label>
                  <Input
                    type="number"
                    value={quizSet.time_limit_per_question / 1000}
                    onChange={(e) => setQuizSet({ ...quizSet, time_limit_per_question: Number(e.target.value) * 1000 })}
                    className="mt-1 bg-white/5 border-white/10 text-white"
                  />
                </div>

                <div className="pt-4 border-t border-white/10">
                  <div className="text-sm text-slate-400 mb-2">
                    {questions.length} question{questions.length !== 1 ? 's' : ''}
                  </div>
                  <div className="space-y-2">
                    <Button
                      onClick={() => saveQuizMutation.mutate({ status: 'draft' })}
                      disabled={!canSave || saveQuizMutation.isPending}
                      className="w-full bg-white/10 hover:bg-white/20"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Draft
                    </Button>
                    <Button
                      onClick={() => saveQuizMutation.mutate({ status: 'published' })}
                      disabled={!canSave || saveQuizMutation.isPending}
                      className="w-full bg-blue-500 hover:bg-blue-600"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Save to Library
                    </Button>
                    <Button
                      onClick={() => startLiveQuizMutation.mutate()}
                      disabled={!canSave || startLiveQuizMutation.isPending}
                      className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/30"
                    >
                      {startLiveQuizMutation.isPending ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Start Quiz
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Questions List */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Questions</h3>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowImportDialog(true)}
                  disabled={!quizSet.topic_id}
                  className="bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Import from Lesson
                </Button>
                <Button
                  onClick={addManualQuestion}
                  className="bg-gradient-to-r from-purple-500 to-blue-500"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Question
                </Button>
              </div>
            </div>

            {questions.length === 0 ? (
              <GlassCard className="p-12 text-center">
                <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-white font-semibold mb-2">No questions yet</h3>
                <p className="text-slate-400 text-sm mb-4">
                  Add questions manually or import from a lesson
                </p>
              </GlassCard>
            ) : (
              <div className="space-y-4">
                {questions.map((q, index) => (
                  <GlassCard key={index} className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      
                      <div className="flex-1">
                        {editingIndex === index ? (
                          <div className="space-y-4">
                            <Input
                              value={q.prompt}
                              onChange={(e) => updateQuestion(index, 'prompt', e.target.value)}
                              placeholder="Question text"
                              className="bg-white/5 border-white/10 text-white"
                            />
                            
                            <div className="grid grid-cols-2 gap-3">
                              {q.options.map((opt, optIndex) => (
                                <div key={optIndex} className="relative">
                                  <Input
                                    value={opt}
                                    onChange={(e) => updateOption(index, optIndex, e.target.value)}
                                    placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                                    className={`bg-white/5 border-white/10 text-white ${
                                      q.correct_index === optIndex ? 'border-emerald-500' : ''
                                    }`}
                                  />
                                  <button
                                    onClick={() => updateQuestion(index, 'correct_index', optIndex)}
                                    className={`absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 ${
                                      q.correct_index === optIndex 
                                        ? 'bg-emerald-500 border-emerald-500' 
                                        : 'border-slate-400'
                                    }`}
                                  >
                                    {q.correct_index === optIndex && <Check className="w-3 h-3 text-white" />}
                                  </button>
                                </div>
                              ))}
                            </div>

                            <Textarea
                              value={q.explanation || ''}
                              onChange={(e) => updateQuestion(index, 'explanation', e.target.value)}
                              placeholder="Explanation (optional)"
                              className="bg-white/5 border-white/10 text-white"
                              rows={2}
                            />

                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => setEditingIndex(null)}
                                className="bg-gradient-to-r from-purple-500 to-blue-500"
                              >
                                Done
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="text-white font-medium mb-3">{q.prompt || 'Untitled question'}</p>
                            <div className="grid grid-cols-2 gap-2 mb-2">
                              {q.options.map((opt, optIndex) => (
                                <div
                                  key={optIndex}
                                  className={`text-sm px-3 py-2 rounded-lg ${
                                    q.correct_index === optIndex
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                                      : 'bg-white/5 text-slate-300'
                                  }`}
                                >
                                  {String.fromCharCode(65 + optIndex)}. {opt || '(empty)'}
                                </div>
                              ))}
                            </div>
                            {q.explanation && (
                              <p className="text-xs text-slate-400 mt-2">💡 {q.explanation}</p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditingIndex(index)}
                          className="text-slate-400 hover:text-white"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteQuestion(index)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Import Dialog */}
        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <DialogContent className="bg-slate-900 border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">Import from Lesson</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Select Lesson</Label>
                <Select value={selectedLesson} onValueChange={setSelectedLesson}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Choose a lesson" />
                  </SelectTrigger>
                  <SelectContent>
                    {lessons.map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-slate-300">Number of Questions</Label>
                <Select value={String(generateCount)} onValueChange={(v) => setGenerateCount(Number(v))}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 questions</SelectItem>
                    <SelectItem value="10">10 questions</SelectItem>
                    <SelectItem value="15">15 questions</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-slate-300">Difficulty</Label>
                <Select value={generateDifficulty} onValueChange={setGenerateDifficulty}>
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

              <Button
                onClick={handleGenerateQuestions}
                disabled={!selectedLesson || generateQuestionsMutation.isPending}
                className="w-full bg-gradient-to-r from-purple-500 to-blue-500"
              >
                {generateQuestionsMutation.isPending ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Questions
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}