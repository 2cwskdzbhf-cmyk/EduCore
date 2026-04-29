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

import GlassCard from '@/components/ui/GlassCard';
import { toast } from 'sonner';
import {
  ChevronLeft, Plus, Trash2, Save, Play,
  BookOpen, Check, Database, FileText, Image, Zap
} from 'lucide-react';

import GlobalQuestionBankDialog from '@/components/quiz/GlobalQuestionBankDialog';
import SaveTemplateDialog from '@/components/quiz/SaveTemplateDialog';

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

  const [showGlobalQuestionBankDialog, setShowGlobalQuestionBankDialog] = useState(false);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);

  const [quizSetId, setQuizSetId] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // --------- AUTH ----------
  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    fetchUser();
  }, []);

  // --------- DRAFT QUIZ CREATION ----------
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

    try {
      const created = await base44.entities.QuizSet.create(basePayload);
      setQuizSetId(created.id);
      return created.id;
    } catch (e) {
      console.warn('[WARN] QuizSet.create failed, trying LiveQuizSet...', e);
    }

    try {
      const created = await base44.entities.LiveQuizSet.create(basePayload);
      setQuizSetId(created.id);
      return created.id;
    } catch (e) {
      console.error('[ERROR] Failed to create any draft quiz set:', e);
      return null;
    }
  }, [user?.email, quizSetId, quizSet]);

  // --------- VALIDATION (STRICT, ONLY FOR SAVE/START) ----------
  const validateQuestionStrict = (q) => {
  if (!q?.prompt || !q.prompt.trim()) return 'Question is missing prompt';
  const type = q.question_type || 'multiple_choice';
  if (type === 'short_answer') {
  if (!q.correct_answer && !q.options?.[0]) return 'Question is missing correct answer';
  return null;
  }
  if (type === 'written') {
  if (!q.answer_keywords || q.answer_keywords.length === 0) return 'Written question needs at least one keyword';
  return null;
  }
  // MCQ / true_false validation
  const opts = q.options || [];
  const realOptions = opts.filter(o => String(o || '').trim() && String(o || '').trim() !== '—');
  if (realOptions.length < 2) return 'Question must have at least 2 options';
  if (typeof q.correct_index !== 'number' || q.correct_index < 0) return 'Invalid correct answer';
  return null;
  };

  // Only remove truly empty placeholders (prompt empty AND all options empty AND not a draft)
  const isTrulyEmptyQuestion = (q) => {
    const hasPrompt = !!(q?.prompt && String(q.prompt).trim());
    const hasAnyOption = Array.isArray(q?.options) && q.options.some(o => String(o || '').trim());
    const isDraft = q?._isDraft === true;
    return !hasPrompt && !hasAnyOption && !isDraft;
  };

  // --------- LOAD PERSISTED QUIZ QUESTIONS ----------
  const { data: persistedQuizQuestions = [] } = useQuery({
    queryKey: ['quizQuestions', quizSetId],
    queryFn: async () => {
      const rows = await base44.entities.QuizQuestion.filter({ quiz_set_id: quizSetId });
      return [...rows].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    },
    enabled: !!quizSetId
  });

  // Cleanup ONLY truly empty DB questions (no prompt + no options)
  const cleanupTrulyEmptyQuestionsFromDB = useCallback(async () => {
    if (!quizSetId) return;

    try {
      const all = await base44.entities.QuizQuestion.filter({ quiz_set_id: quizSetId });

      const empties = all.filter(qRow => {
        const prompt = (qRow.prompt || '').trim();
        const opts = Array.isArray(qRow.options) ? qRow.options : [];
        const anyOpt = opts.some(o => String(o || '').trim());
        const isDraft = qRow._isDraft === true;
        return !prompt && !anyOpt && !isDraft;
      });

      if (empties.length) {
        await Promise.all(empties.map(qRow => base44.entities.QuizQuestion.delete(qRow.id)));
      }
    } catch (e) {
      console.error('[CLEANUP_ERROR]', e);
    }
  }, [quizSetId]);

  // Keep editor UI in sync with DB ONLY on initial load, not on every change
  const [hasLoadedInitialQuestions, setHasLoadedInitialQuestions] = useState(false);
  
  useEffect(() => {
    if (!quizSetId || hasLoadedInitialQuestions) return;

    cleanupTrulyEmptyQuestionsFromDB();

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
      image_url: qq.image_url || '',
      option_images: Array.isArray(qq.option_images) ? qq.option_images : ['', '', '', ''],
      _quiz_question_id: qq.id,
      _order: qq.order ?? 0,
      _isDraft: qq._isDraft || false
    }));

    setQuestions(mapped);
    setHasLoadedInitialQuestions(true);
    
    console.log('[INITIAL_LOAD] Loaded', mapped.length, 'questions from DB');
  }, [quizSetId, persistedQuizQuestions, cleanupTrulyEmptyQuestionsFromDB, hasLoadedInitialQuestions]);

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

  // --------- VALIDATE ALL (STRICT) ----------
  const validateAllQuestions = () => {
    if (!quizSet.title?.trim()) {
      toast.error('Quiz must have a title');
      return false;
    }

    const nonEmpty = questions.filter(q => !isTrulyEmptyQuestion(q));
    if (nonEmpty.length === 0) {
      toast.error('Quiz must have at least 1 question');
      return false;
    }

    const errors = [];
    nonEmpty.forEach((q, idx) => {
      const err = validateQuestionStrict(q);
      if (err) errors.push(`Question ${idx + 1}: ${err}`);
    });

    if (errors.length > 0) {
      toast.error(errors[0]);
      console.error('[VALIDATION_FAILED]', errors);
      return false;
    }

    return true;
  };

  // --------- SAVE QUIZ (UPSERT) ----------
  const saveQuizMutation = useMutation({
    mutationFn: async ({ status }) => {
      if (!user?.email) throw new Error('Not signed in');
      if (!validateAllQuestions()) throw new Error('Quiz validation failed');

      const id = await ensureDraftQuizSet();
      if (!id) throw new Error('Failed to create draft quiz');

      const validQuestions = questions
        .filter(q => !isTrulyEmptyQuestion(q))
        .map(q => ({
          ...q,
          prompt: String(q.prompt || '').trim(),
          options: (q.options || []).map(o => String(o || '').trim())
        }));

      // Update quiz set
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

      // Replace QuizQuestion rows
      const existing = await base44.entities.QuizQuestion.filter({ quiz_set_id: id });
      await Promise.all(existing.map((row) => base44.entities.QuizQuestion.delete(row.id)));

      await Promise.all(
        validQuestions.map((q, index) => {
          const type = q.question_type || 'multiple_choice';
          const isTextType = type === 'short_answer' || type === 'written';
          const cleanOptions = isTextType
            ? []
            : (q.options || []).filter(o => String(o || '').trim() && String(o || '').trim() !== '—');
          return base44.entities.QuizQuestion.create({
            quiz_set_id: id,
            order: index,
            prompt: q.prompt,
            question_type: type,
            options: cleanOptions,
            correct_index: isTextType ? 0 : (q.correct_index ?? 0),
            correct_answer: isTextType ? (q.correct_answer || '') : (cleanOptions[q.correct_index] || q.correct_answer || ''),
            answer_keywords: type === 'written' ? (q.answer_keywords || []) : [],
            difficulty: q.difficulty || 'medium',
            explanation: q.explanation || '',
            tags: q.tags || [],
            source_global_id: q.source_global_id || null,
            image_url: q.image_url || '',
            option_images: Array.isArray(q.option_images) ? q.option_images : ['', '', '', '']
          });
        })
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
      if (!user?.email) throw new Error('Not signed in');
      if (!validateAllQuestions()) throw new Error('Quiz validation failed');

      const urlParams = new URLSearchParams(window.location.search);
      const classId = urlParams.get('classId') || '';

      // Build valid questions to embed in the session
      const usable = questions.filter(q => !isTrulyEmptyQuestion(q)).map((q, i) => {
        const type = q.question_type || 'multiple_choice';
        const isTextType = type === 'short_answer' || type === 'written';
        const cleanOptions = isTextType
          ? []
          : (q.options || []).filter(o => String(o || '').trim() && String(o || '').trim() !== '—');
        return {
          order: i,
          prompt: q.prompt,
          question_type: type,
          options: cleanOptions,
          correct_index: isTextType ? 0 : (q.correct_index ?? 0),
          correct_answer: isTextType ? (q.correct_answer || '') : (cleanOptions[q.correct_index] || q.correct_answer || ''),
          answer_keywords: type === 'written' ? (q.answer_keywords || []) : [],
          difficulty: q.difficulty || 'medium',
          explanation: q.explanation || '',
          image_url: q.image_url || '',
        };
      });

      if (usable.length === 0) throw new Error('No valid questions to start the quiz');

      // Generate a 5-char join code
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const joinCode = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');

      // Create a QuizLobbySession — the same entity students join via popup/code
      const session = await base44.entities.QuizLobbySession.create({
        class_id: classId,
        class_name: quizSet.title || 'Live Quiz',
        teacher_email: user.email,
        teacher_name: user.full_name || user.email.split('@')[0],
        quiz_title: quizSet.title || '',
        join_code: joinCode,
        status: 'lobby',
        participant_emails: [],
        participant_names: [],
        // Embed questions so TeacherLobbyPanel can pass them when starting
        questions_json: JSON.stringify(usable),
      });

      return session;
    },
    onSuccess: (session) => {
      toast.success('Quiz lobby created! Share the join code with your students.');
      // Route to TeacherLobbyPanel — same lobby system students use
      navigate(`/TeacherLobbyPanel?sessionId=${session.id}`);
    },
    onError: (error) => {
      console.error('[START_QUIZ_ERROR]', error);
      toast.error(error.message || 'Failed to start live quiz');
    }
  });

  // --------- UI HELPERS ----------
  const handleGlobalQuestionBankAdd = (mappedQuestions) => {
    if (!Array.isArray(mappedQuestions) || mappedQuestions.length === 0) return;
    setQuestions(prev => [...prev, ...mappedQuestions]);
  };

  const addManualQuestion = () => {
    const baseQuestion = {
      prompt: '',
      question_type: 'multiple_choice',
      options: ['', '', '', ''],
      correct_index: 0,
      difficulty: 'medium',
      explanation: '',
      tags: [],
      image_url: '',
      option_images: ['', '', '', ''],
      _isDraft: true
    };
    setQuestions(prev => [...prev, baseQuestion]);
    setEditingIndex(questions.length);
  };

  const handleImageUpload = async (file, qIndex, optionIndex = null) => {
    if (!file) return;

    setUploadingImage(true);
    try {
      const { data } = await base44.integrations.Core.UploadFile({ file });
      const updated = [...questions];

      if (optionIndex !== null) {
        if (!updated[qIndex].option_images) updated[qIndex].option_images = ['', '', '', ''];
        updated[qIndex].option_images[optionIndex] = data.file_url;
      } else {
        updated[qIndex].image_url = data.file_url;
      }

      setQuestions(updated);
      toast.success('Image uploaded');
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleTemplateSelect = (template) => {
    setQuizSet({
      title: template.name || '',
      description: template.description || '',
      subject_id: template.subject_id || '',
      topic_id: template.topic_id || '',
      time_limit_per_question: template.time_limit_per_question || 15000,
      status: 'draft'
    });

    if (template.questions && Array.isArray(template.questions)) {
      setQuestions(template.questions.map(q => ({
        ...q,
        image_url: q.image_url || '',
        option_images: q.option_images || ['', '', '', '']
      })));
    }

    base44.entities.QuizTemplate.update(template.id, {
      usage_count: (template.usage_count || 0) + 1
    }).catch(console.error);

    toast.success('Template loaded');
  };

  const deleteQuestion = async (index) => {
    const updatedQuestions = questions.filter((_, i) => i !== index);
    setQuestions(updatedQuestions);

    if (quizSetId && questions[index]?._quiz_question_id) {
      try {
        await base44.entities.QuizQuestion.delete(questions[index]._quiz_question_id);
        queryClient.invalidateQueries(['quizQuestions', quizSetId]);
      } catch (error) {
        console.error('[DELETE_ERROR]', error);
      }
    }
  };

  const canSave =
    quizSet.title?.trim() &&
    questions.filter(q => !isTrulyEmptyQuestion(q)).length > 0 &&
    questions.filter(q => !isTrulyEmptyQuestion(q)).every(q => !validateQuestionStrict(q));

  const openGlobalBank = () => {
    setShowGlobalQuestionBankDialog(true);
  };

  const updateQuestion = (index, field, value) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const updateOption = (qIndex, optIndex, value) => {
    const updated = [...questions];
    const newOptions = [...(updated[qIndex].options || ['', '', '', ''])];
    newOptions[optIndex] = value;
    updated[qIndex] = { ...updated[qIndex], options: newOptions };
    setQuestions(updated);
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
                    {questions.filter(q => !isTrulyEmptyQuestion(q)).length} question{questions.length !== 1 ? 's' : ''}
                  </div>

                  <div className="space-y-2">
                    <Button
                      onClick={() => setShowSaveTemplateDialog(true)}
                      disabled={!quizSet.title?.trim() || questions.filter(q => !isTrulyEmptyQuestion(q)).length === 0}
                      className="w-full bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Save as Template
                    </Button>

                    <Button
                      onClick={() => {
                        if (!validateAllQuestions()) return;
                        saveQuizMutation.mutate({ status: 'draft' });
                      }}
                      disabled={!canSave || saveQuizMutation.isPending}
                      className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-slate-300"
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
                      className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-lg shadow-blue-500/30"
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
                      <Zap className="w-4 h-4 mr-2" />
                      Start Live Quiz
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
                  onClick={openGlobalBank}
                  disabled={!user?.email}
                  className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300"
                >
                  <Database className="w-4 h-4 mr-2" />
                  Global Bank
                </Button>

                <Button onClick={addManualQuestion} className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 shadow-lg shadow-purple-500/30">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Question
                </Button>
              </div>
            </div>

            {questions.length === 0 ? (
              <GlassCard className="p-12 text-center">
                <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-white font-semibold mb-2">No questions yet</h3>
                <p className="text-slate-400 text-sm mb-4">Add questions manually or import from the global bank</p>
              </GlassCard>
            ) : (
              <div className="space-y-4">
                {questions.map((q, index) => {
                  const isEditing = editingIndex === index;
                  return (
                    <GlassCard key={index} className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0 mt-1">
                          {index + 1}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Collapsed view */}
                          {!isEditing ? (
                            <button
                              className="w-full text-left group"
                              onClick={() => setEditingIndex(index)}
                            >
                              <p className="text-white font-medium truncate group-hover:text-purple-300 transition-colors">
                                {q.prompt || <span className="text-slate-500 italic">Click to edit question...</span>}
                              </p>
                              {q.options?.filter(o => o?.trim() && o.trim() !== '—').length > 0 && (
                                <div className="flex gap-2 mt-1 flex-wrap">
                                  {q.options.filter(o => o?.trim() && o.trim() !== '—').map((opt, i) => (
                                    <span key={i} className={`text-xs px-2 py-0.5 rounded ${q.options.indexOf(opt) === q.correct_index ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-white/5 text-slate-400'}`}>
                                      {opt}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <p className="text-xs text-purple-400 mt-1">Click to edit</p>
                            </button>
                          ) : (
                            /* Expanded editing view */
                            <>
                              {/* Question type selector */}
                              <div className="mb-3">
                                <Select
                                  value={q.question_type || 'multiple_choice'}
                                  onValueChange={(v) => updateQuestion(index, 'question_type', v)}
                                >
                                  <SelectTrigger className="w-48 bg-white/5 border-white/10 text-white text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                                    <SelectItem value="true_false">True / False</SelectItem>
                                    <SelectItem value="short_answer">Short Answer</SelectItem>
                                    <SelectItem value="written">Written Answer</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <Textarea
                                value={q.prompt || ''}
                                onChange={(e) => updateQuestion(index, 'prompt', e.target.value)}
                                placeholder="Enter question text..."
                                className="mb-3 bg-white/5 border-white/10 text-white"
                                rows={2}
                                autoFocus
                              />

                              {/* MCQ / True-False options */}
                              {(!q.question_type || q.question_type === 'multiple_choice' || q.question_type === 'true_false') && (
                                <>
                                  <div className="grid grid-cols-2 gap-2 mb-3">
                                    {(q.question_type === 'true_false'
                                      ? ['True', 'False']
                                      : (q.options || ['', '', '', ''])
                                    ).map((opt, i) => (
                                      <Input
                                        key={i}
                                        value={String(opt || '')}
                                        onChange={(e) => updateOption(index, i, e.target.value)}
                                        placeholder={q.question_type === 'true_false' ? opt : `Option ${i + 1}`}
                                        readOnly={q.question_type === 'true_false'}
                                        className={`bg-white/5 border-white/10 text-white ${q.correct_index === i ? 'ring-2 ring-green-500' : ''}`}
                                      />
                                    ))}
                                  </div>
                                  <Select
                                    value={String(q.correct_index ?? 0)}
                                    onValueChange={(v) => updateQuestion(index, 'correct_index', Number(v))}
                                  >
                                    <SelectTrigger className="w-44 bg-white/5 border-white/10 text-white mb-3">
                                      <SelectValue placeholder="Correct answer" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {(q.question_type === 'true_false'
                                        ? ['True', 'False']
                                        : (q.options || ['', '', '', ''])
                                      ).map((opt, i) => (
                                        <SelectItem key={i} value={String(i)}>
                                          {opt || `Option ${i + 1}`}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </>
                              )}

                              {/* Short answer */}
                              {q.question_type === 'short_answer' && (
                                <div className="mb-3">
                                  <Label className="text-slate-400 text-xs mb-1 block">Correct Answer</Label>
                                  <Input
                                    value={q.correct_answer || ''}
                                    onChange={(e) => updateQuestion(index, 'correct_answer', e.target.value)}
                                    placeholder="The exact correct answer…"
                                    className="bg-white/5 border-white/10 text-white"
                                  />
                                </div>
                              )}

                              {/* Written answer — keywords */}
                              {q.question_type === 'written' && (
                                <div className="mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                                  <Label className="text-amber-300 text-xs mb-1 block font-semibold">
                                    Required Keywords (hidden from students)
                                  </Label>
                                  <p className="text-xs text-slate-400 mb-2">
                                    Students must include ALL of these words in their answer to get it correct. Separate with commas.
                                  </p>
                                  <Input
                                    value={(q.answer_keywords || []).join(', ')}
                                    onChange={(e) => {
                                      const keywords = e.target.value.split(',').map(k => k.trim()).filter(Boolean);
                                      updateQuestion(index, 'answer_keywords', keywords);
                                    }}
                                    placeholder="e.g. photosynthesis, chlorophyll, sunlight"
                                    className="bg-white/5 border-amber-500/30 text-white placeholder:text-slate-500"
                                  />
                                  {(q.answer_keywords || []).length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {q.answer_keywords.map((kw, ki) => (
                                        <span key={ki} className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                          {kw}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <Select value={q.difficulty || 'medium'} onValueChange={(v) => updateQuestion(index, 'difficulty', v)}>
                                  <SelectTrigger className="w-32 bg-white/5 border-white/10 text-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="easy">Easy</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="hard">Hard</SelectItem>
                                  </SelectContent>
                                </Select>

                                <label className="cursor-pointer">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleImageUpload(e.target.files[0], index)}
                                    disabled={uploadingImage}
                                  />
                                  <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 cursor-pointer transition-colors">
                                    <Image className="w-3 h-3" />
                                    {uploadingImage ? 'Uploading...' : q.image_url ? 'Change Image' : 'Add Image'}
                                  </div>
                                </label>
                              </div>

                              {q.source_global_id && (
                                <Badge className="bg-blue-500/20 text-blue-200 border border-blue-500/30 mb-2">
                                  From Global Bank
                                </Badge>
                              )}

                              <div className="flex justify-end mt-3 pt-3 border-t border-white/10">
                                <Button
                                  size="sm"
                                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                                  onClick={() => setEditingIndex(null)}
                                >
                                  <Check className="w-4 h-4 mr-1" />
                                  Done
                                </Button>
                              </div>
                            </>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteQuestion(index)}
                          className="text-slate-400 hover:text-red-300 flex-shrink-0"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            )}

            <GlobalQuestionBankDialog
              open={showGlobalQuestionBankDialog}
              onClose={() => setShowGlobalQuestionBankDialog(false)}
              onAddQuestions={handleGlobalQuestionBankAdd}
              quizSetId={quizSetId}
            />

            <SaveTemplateDialog
              open={showSaveTemplateDialog}
              onClose={() => setShowSaveTemplateDialog(false)}
              quizData={{ ...quizSet, questions }}
              userEmail={user?.email}
            />


          </div>
        </div>
      </div>
    </div>
  );
}