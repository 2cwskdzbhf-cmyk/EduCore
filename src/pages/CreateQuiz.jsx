import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import GlassCard from '@/components/ui/GlassCard';
import { toast } from 'sonner';
import {
  ChevronLeft, Plus, Trash2, Save, Play,
  BookOpen, Sparkles, Check, Upload, Database
} from 'lucide-react';

import BulkImportDialog from '@/components/quiz/BulkImportDialog';
import GlobalQuestionBankDialog from '@/components/quiz/GlobalQuestionBankDialog';

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
  const [showBulkImportDialog, setShowBulkImportDialog] = useState(false);
  const [showGlobalQuestionBankDialog, setShowGlobalQuestionBankDialog] = useState(false);

  const [quizSetId, setQuizSetId] = useState(null);

  // --------- AUTH ----------
  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    fetchUser();
  }, []);

  // --------- DRAFT QUIZ CREATION ----------
  // Create a draft quiz set on-demand when needed (NOT automatically on page load)
  const ensureDraftQuizSet = useCallback(async () => {
    if (!user?.email) return null;
    if (quizSetId) return quizSetId;

    const basePayload = {
      title: quizSet.title?.trim() || 'Untitled Quiz',
      description: quizSet.description || '',
      subject_id: quizSet.subject_id || '',
      topic_id: quizSet.topic_id || '',
      time_limit_per_question: quizSet.time_limit_per_question ?? 15000,
      status: 'draft',
      owner_email: user.email,
      question_count: 0
    };

    // Try QuizSet first
    try {
      const created = await base44.entities.QuizSet.create(basePayload);
      console.log('[DEBUG] Draft QuizSet created:', created.id);
      setQuizSetId(created.id);
      return created.id;
    } catch (e) {
      console.warn('[WARN] QuizSet.create failed, trying LiveQuizSet...', e);
    }

    // Fallback to LiveQuizSet if your schema uses that
    try {
      const created = await base44.entities.LiveQuizSet.create(basePayload);
      console.log('[DEBUG] Draft LiveQuizSet created:', created.id);
      setQuizSetId(created.id);
      return created.id;
    } catch (e) {
      console.error('[ERROR] Failed to create any draft quiz set:', e);
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email, quizSetId]);

  // --------- LOAD PERSISTED QUIZ QUESTIONS ----------
  const { data: persistedQuizQuestions = [] } = useQuery({
    queryKey: ['quizQuestions', quizSetId],
    queryFn: async () => {
      const rows = await base44.entities.QuizQuestion.filter({ quiz_set_id: quizSetId });
      return [...rows].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    },
    enabled: !!quizSetId
  });

  // Delete any stored questions where prompt is empty and all options are empty
  const cleanupEmptyQuestionsFromDB = useCallback(async () => {
    if (!quizSetId) return;
    
    try {
      const allQuestions = await base44.entities.QuizQuestion.filter({ quiz_set_id: quizSetId });
      const emptyQuestions = allQuestions.filter(q => {
        const hasPrompt = q.prompt && q.prompt.trim();
        const hasOptions = Array.isArray(q.options) && q.options.some(o => String(o).trim());
        return !hasPrompt && !hasOptions;
      });

      if (emptyQuestions.length > 0) {
        console.log('[CLEANUP] Deleting', emptyQuestions.length, 'empty questions');
        await Promise.all(emptyQuestions.map(q => base44.entities.QuizQuestion.delete(q.id)));
      }
    } catch (error) {
      console.error('[CLEANUP_ERROR]', error);
    }
  }, [quizSetId]);

  // Keep editor UI in sync with database quiz questions, auto-sanitizing invalid ones
  useEffect(() => {
    if (!quizSetId) return;

    // Run cleanup of empty questions first
    cleanupEmptyQuestionsFromDB();

    const mapped = persistedQuizQuestions.map((qq) => ({
      prompt: qq.prompt || '',
      question_type: qq.question_type || 'multiple_choice',
      options: Array.isArray(qq.options) ? qq.options : ['', '', '', ''],
      correct_index: typeof qq.correct_index === 'number' ? qq.correct_index : 0,
      correct_answer: qq.correct_answer || '',
      difficulty: qq.difficulty || 'medium',
      explanation: qq.explanation || '',
      tags: qq.tags || [],
      source_global_id: qq.source_global_id || null,
      _quiz_question_id: qq.id,
      _order: qq.order ?? 0
    }));

    const sanitized = sanitizeQuestions(mapped);
    setQuestions(sanitized);

    // Auto-delete invalid questions from database
    const invalidCount = mapped.length - sanitized.length;
    if (invalidCount > 0) {
      console.log('[AUTO_CLEANUP] Deleting', invalidCount, 'invalid questions');
      const invalidIds = mapped
        .filter(q => validateQuestion(q) !== null)
        .map(q => q._quiz_question_id)
        .filter(Boolean);

      invalidIds.forEach(async (id) => {
        try {
          await base44.entities.QuizQuestion.delete(id);
        } catch (error) {
          console.error('[AUTO_CLEANUP_ERROR]', error);
        }
      });
    }
  }, [quizSetId, persistedQuizQuestions, cleanupEmptyQuestionsFromDB]);

  // --------- SIDEBAR DATA ----------
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => base44.entities.Subject.list()
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['topics', quizSet.subject_id],
    queryFn: () => base44.entities.Topic.filter({ subject_id: quizSet.subject_id }),
    enabled: !!quizSet.subject_id
  });

  // --------- SAVE QUIZ (UPSERT) ----------
  const saveQuizMutation = useMutation({
    mutationFn: async ({ status }) => {
      if (!user?.email) throw new Error('Not signed in');

      // Validate before saving
      if (!validateAllQuestions()) {
        throw new Error('Quiz validation failed');
      }

      const id = await ensureDraftQuizSet();
      if (!id) throw new Error('Failed to create draft quiz');

      // Sanitize questions before saving
      const validQuestions = sanitizeQuestions(questions);
      
      if (validQuestions.length === 0) {
        throw new Error('No valid questions to save');
      }

      // Update whichever entity exists
      try {
        await base44.entities.QuizSet.update(id, {
          ...quizSet,
          title: quizSet.title?.trim() || 'Untitled Quiz',
          owner_email: user.email,
          question_count: validQuestions.length,
          status
        });
      } catch {
        await base44.entities.LiveQuizSet.update(id, {
          ...quizSet,
          title: quizSet.title?.trim() || 'Untitled Quiz',
          owner_email: user.email,
          question_count: validQuestions.length,
          status
        });
      }

      // Replace QuizQuestion rows (simple & reliable)
      const existing = await base44.entities.QuizQuestion.filter({ quiz_set_id: id });
      await Promise.all(existing.map((row) => base44.entities.QuizQuestion.delete(row.id)));

      await Promise.all(
        validQuestions.map((q, index) =>
          base44.entities.QuizQuestion.create({
            quiz_set_id: id,
            order: index,
            prompt: q.prompt.trim(),
            question_type: q.question_type || 'multiple_choice',
            options: q.options.map(o => String(o).trim()),
            correct_index: q.correct_index,
            correct_answer:
              q.correct_answer || q.options[q.correct_index] || '',
            difficulty: q.difficulty || 'medium',
            explanation: q.explanation || '',
            tags: q.tags || [],
            source_global_id: q.source_global_id || null
          })
        )
      );

      return { id };
    },
    onSuccess: () => {
      toast.success('Quiz saved successfully');
      queryClient.invalidateQueries(['quizSets']);
      navigate(createPageUrl('QuizLibrary'));
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save quiz');
      console.error('[SAVE_ERROR]', error);
    }
  });

  // --------- START LIVE QUIZ ----------
  const startLiveQuizMutation = useMutation({
    mutationFn: async () => {
      // Validate before starting
      if (!validateAllQuestions()) {
        throw new Error('Quiz validation failed');
      }

      const urlParams = new URLSearchParams(window.location.search);
      const classId = urlParams.get('classId');

      // Create session
      const generateCode = () => Math.random().toString(36).substr(2, 6).toUpperCase();
      let joinCode = generateCode();
      for (let attempts = 0; attempts < 10; attempts++) {
        const existing = await base44.entities.LiveQuizSession.filter({ join_code: joinCode });
        if (existing.length === 0) break;
        joinCode = generateCode();
      }

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

      // Create live questions for session
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

      return session;
    },
    onSuccess: (session) => {
      toast.success('Quiz started! Redirecting to lobby...');
      navigate(createPageUrl(`TeacherLiveQuizLobby?sessionId=${session.id}`));
    },
    onError: (error) => {
      console.error('[START_QUIZ_ERROR]', error);
      toast.error(error.message || 'Failed to start live quiz');
    }
  });

  // --------- VALIDATION HELPERS ----------
  const validateQuestion = (q) => {
    if (!q.prompt || !q.prompt.trim()) return 'Question is missing prompt';
    if (!Array.isArray(q.options) || q.options.length !== 4) return 'Question must have 4 options';
    if (q.options.some(o => !String(o).trim())) return 'All options must be filled';
    if (typeof q.correct_index !== 'number' || q.correct_index < 0 || q.correct_index > 3) return 'Invalid correct answer';
    return null;
  };

  const sanitizeQuestions = (questionsArray) => {
    return questionsArray.filter(q => validateQuestion(q) === null);
  };

  const validateAllQuestions = () => {
    if (!quizSet.title?.trim()) {
      toast.error('Quiz must have a title');
      return false;
    }
    
    // Sanitize questions before validating
    const validQuestions = sanitizeQuestions(questions);
    
    if (validQuestions.length === 0) {
      toast.error('Quiz must have at least 1 valid question');
      return false;
    }
    
    const errors = [];
    validQuestions.forEach((q, idx) => {
      const error = validateQuestion(q);
      if (error) errors.push(`Question ${idx + 1}: ${error}`);
    });

    if (errors.length > 0) {
      toast.error(errors[0]); // Show first error
      console.error('[VALIDATION_FAILED]', errors);
      return false;
    }

    return true;
  };

  // --------- UI HELPERS ----------
  const handleGlobalQuestionBankAdd = (count) => {
    if (quizSetId) {
      queryClient.invalidateQueries(['quizQuestions', quizSetId]);
      // Questions will be sanitized on next render via useEffect
    }
  };

  const addManualQuestion = () => {
    const baseQuestion = {
      prompt: '',
      question_type: 'multiple_choice',
      options: ['', '', '', ''],
      correct_index: 0,
      difficulty: 'medium',
      explanation: '',
      tags: []
    };
    setQuestions([...questions, baseQuestion]);
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

  const deleteQuestion = async (index) => {
    const updatedQuestions = questions.filter((_, i) => i !== index);
    setQuestions(updatedQuestions);
    
    // If deleting persisted question, update database immediately
    if (quizSetId && questions[index]._quiz_question_id) {
      try {
        await base44.entities.QuizQuestion.delete(questions[index]._quiz_question_id);
        queryClient.invalidateQueries(['quizQuestions', quizSetId]);
      } catch (error) {
        console.error('[DELETE_ERROR]', error);
      }
    }
  };

  const canSave = quizSet.title?.trim() && questions.length > 0 &&
    questions.every(q => q.prompt?.trim() && q.options?.every(o => String(o).trim()));

  // IMPORTANT: Don’t open Global Bank until quizSetId exists (but also ensure it on click)
  const openGlobalBank = async () => {
    const id = await ensureDraftQuizSet();
    if (!id) {
      alert('Quiz not ready yet. Please try again.');
      return;
    }
    setShowGlobalQuestionBankDialog(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div className="mb-8" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <Button variant="ghost" onClick={() => navigate(-1)} className="text-slate-400 hover:text-white mb-4">
            <ChevronLeft className="w-5 h-5 mr-2" /> Back
          </Button>
          <h1 className="text-3xl font-bold text-white mb-2">Create Live Quiz</h1>
          <p className="text-slate-400">Build your quiz set for live gameplay</p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
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
                      onClick={() => {
                        if (!validateAllQuestions()) return;
                        saveQuizMutation.mutate({ status: 'draft' });
                      }}
                      disabled={!canSave || saveQuizMutation.isPending}
                      className="w-full bg-white/10 hover:bg-white/20"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Draft
                    </Button>

                    <Button
                      onClick={() => {
                        if (!validateAllQuestions()) return;
                        saveQuizMutation.mutate({ status: 'published' });
                      }}
                      disabled={!canSave || saveQuizMutation.isPending}
                      className="w-full bg-blue-500 hover:bg-blue-600"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Save to Library
                    </Button>

                    <Button
                      onClick={() => {
                        if (!validateAllQuestions()) return;
                        startLiveQuizMutation.mutate();
                      }}
                      disabled={!canSave || startLiveQuizMutation.isPending}
                      className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/30"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Start Quiz
                    </Button>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Questions</h3>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => setShowImportDialog(true)}
                  disabled={!quizSet.topic_id}
                  className="bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI Generate
                </Button>

                <Button
                  onClick={() => setShowBulkImportDialog(true)}
                  className="bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Import
                </Button>

                <Button
                  onClick={openGlobalBank}
                  disabled={!user?.email}
                  className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50"
                >
                  <Database className="w-4 h-4 mr-2" />
                  Global Bank
                </Button>

                <Button onClick={addManualQuestion} className="bg-gradient-to-r from-purple-500 to-blue-500">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Question
                </Button>
              </div>
            </div>

            {questions.length === 0 ? (
              <GlassCard className="p-12 text-center">
                <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-white font-semibold mb-2">No questions yet</h3>
                <p className="text-slate-400 text-sm mb-4">Add questions manually or import from a lesson</p>
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
                        {/* Minimal display; keep your existing editing UI if you want */}
                        <div className="text-white font-medium mb-2">{q.prompt || '(empty question)'}</div>
                        <div className="grid grid-cols-2 gap-2">
                          {q.options?.map((opt, i) => (
                            <div key={i} className="text-sm text-slate-300 bg-white/5 border border-white/10 rounded px-3 py-2">
                              {opt || '(empty)'}
                            </div>
                          ))}
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          <Badge className="bg-white/10 text-slate-200">{q.difficulty || 'medium'}</Badge>
                          {q.source_global_id && (
                            <Badge className="bg-blue-500/20 text-blue-200 border border-blue-500/30">
                              From Global Bank
                            </Badge>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteQuestion(index)}
                        className="text-slate-400 hover:text-red-300"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}

            {/* Bulk Import Dialog */}
            <BulkImportDialog
              open={showBulkImportDialog}
              onOpenChange={setShowBulkImportDialog}
              onImport={() => {}}
            />

            {/* Global Question Bank Dialog */}
            <GlobalQuestionBankDialog
              open={showGlobalQuestionBankDialog}
              onClose={() => setShowGlobalQuestionBankDialog(false)}
              onAddQuestions={handleGlobalQuestionBankAdd}
              quizSetId={quizSetId}
            />

            {/* AI dialog placeholder */}
            <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
              <DialogContent className="bg-slate-900 border-white/10 text-white">
                <div className="text-slate-300">AI dialog not included in this snippet.</div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}