import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import GlassCard from '@/components/ui/GlassCard';
import { Switch } from '@/components/ui/switch';
import { 
  ChevronLeft,
  Plus,
  ChevronRight,
  Save,
  CheckCircle2,
  AlertCircle,
  Trash2,
  X,
  Database,
  Zap
} from 'lucide-react';
import GlobalQuestionBankDialog from '@/components/quiz/GlobalQuestionBankDialog';

export default function AssignmentBuilder() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const classId = urlParams.get('classId');
  const assignmentId = urlParams.get('assignmentId');
  const mode = urlParams.get('mode'); // 'live' for live quiz mode
  const isLiveMode = mode === 'live';
  const isEditMode = !!assignmentId;
  
  const [user, setUser] = useState(null);
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [customTopicName, setCustomTopicName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState([
    {
      id: 1,
      type: 'multiple_choice',
      prompt: '',
      options: ['', '', '', ''],
      correctIndex: null,
      explanation: '',
      answerKeywords: [''],
      requireWorking: false,
      workingKeywords: ['']
    }
  ]);
  const [originalQuizId, setOriginalQuizId] = useState(null);
  const [showGlobalBank, setShowGlobalBank] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    fetchUser();
  }, []);

  const { data: topics = [] } = useQuery({
    queryKey: ['topics'],
    queryFn: () => base44.entities.Topic.list('order')
  });

  const { data: classData } = useQuery({
    queryKey: ['class', classId],
    queryFn: async () => {
      if (!classId) return null;
      const classes = await base44.entities.Class.filter({ id: classId });
      return classes[0] || null;
    },
    enabled: !!classId
  });

  const { data: existingAssignment } = useQuery({
    queryKey: ['assignment', assignmentId],
    queryFn: async () => {
      const assignments = await base44.entities.Assignment.filter({ id: assignmentId });
      return assignments[0] || null;
    },
    enabled: isEditMode
  });

  const { data: existingQuestions = [] } = useQuery({
    queryKey: ['quizQuestions', existingAssignment?.quiz_id],
    queryFn: async () => {
      if (!existingAssignment?.quiz_id) return [];
      return base44.entities.QuizQuestion.filter({ quiz_set_id: existingAssignment.quiz_id }, 'order');
    },
    enabled: !!existingAssignment?.quiz_id
  });

  useEffect(() => {
    if (isEditMode && existingAssignment && existingQuestions.length > 0) {
      setAssignmentTitle(existingAssignment.title);
      
      if (existingAssignment.custom_topic_name) {
        setSelectedTopic('custom');
        setCustomTopicName(existingAssignment.custom_topic_name);
      } else if (existingAssignment.topic_id) {
        setSelectedTopic(existingAssignment.topic_id);
      }

      if (existingAssignment.due_date) {
        const date = new Date(existingAssignment.due_date);
        const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        setDueDate(localDate.toISOString().slice(0, 16));
      }

      setOriginalQuizId(existingAssignment.quiz_id);
      setShowLeaderboard(existingAssignment.show_leaderboard !== false);

      const loadedQuestions = existingQuestions.map((q, idx) => ({
        id: idx + 1,
        type: q.question_type || 'multiple_choice',
        prompt: q.prompt,
        options: q.options || ['', '', '', ''],
        correctIndex: q.correct_index ?? null,
        explanation: q.explanation || '',
        answerKeywords: q.answer_keywords || [''],
        requireWorking: q.require_working || false,
        workingKeywords: q.working_keywords || ['']
      }));

      setQuestions(loadedQuestions);
    }
  }, [isEditMode, existingAssignment, existingQuestions]);

  const currentQuestion = questions[currentQuestionIndex];

  const updateCurrentQuestion = (field, value) => {
    const updated = [...questions];
    updated[currentQuestionIndex] = { ...updated[currentQuestionIndex], [field]: value };
    setQuestions(updated);
  };

  const updateOption = (optionIndex, value) => {
    const updated = [...questions];
    const newOptions = [...updated[currentQuestionIndex].options];
    newOptions[optionIndex] = value;
    updated[currentQuestionIndex] = { ...updated[currentQuestionIndex], options: newOptions };
    setQuestions(updated);
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: questions.length + 1,
        type: 'multiple_choice',
        prompt: '',
        options: ['', '', '', ''],
        correctIndex: null,
        explanation: '',
        answerKeywords: [''],
        requireWorking: false,
        workingKeywords: ['']
      }
    ]);
    setCurrentQuestionIndex(questions.length);
  };

  const addKeyword = (field) => {
    const updated = [...questions];
    updated[currentQuestionIndex][field].push('');
    setQuestions(updated);
  };

  const updateKeyword = (field, index, value) => {
    const updated = [...questions];
    updated[currentQuestionIndex][field][index] = value;
    setQuestions(updated);
  };

  const removeKeyword = (field, index) => {
    const updated = [...questions];
    if (updated[currentQuestionIndex][field].length > 1) {
      updated[currentQuestionIndex][field].splice(index, 1);
      setQuestions(updated);
    }
  };

  const deleteQuestion = (index) => {
    if (questions.length === 1) return;
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);
    if (currentQuestionIndex >= updated.length) {
      setCurrentQuestionIndex(updated.length - 1);
    }
  };

  const isQuestionValid = (q) => {
    if (!q.prompt || q.prompt.trim() === '') return false;
    if (q.type === 'multiple_choice') {
      return q.options.filter(opt => opt.trim() !== '').length >= 2 && q.correctIndex !== null;
    } else if (q.type === 'written') {
      const hasAnswerKeywords = q.answerKeywords.filter(kw => kw.trim() !== '').length > 0;
      if (!hasAnswerKeywords) return false;
      if (q.requireWorking) {
        return q.workingKeywords.filter(kw => kw.trim() !== '').length > 0;
      }
      return true;
    }
    return false;
  };

  const isQuestionComplete = (q) => {
    if (!isQuestionValid(q)) return false;
    if (q.type === 'multiple_choice') {
      return q.options.every(opt => opt.trim() !== '');
    } else if (q.type === 'written') {
      return q.answerKeywords.every(kw => kw.trim() !== '');
    }
    return isQuestionValid(q);
  };

  const goToNextQuestion = () => {
    if (currentQuestionIndex === questions.length - 1) {
      addQuestion();
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  // Build question data for DB
  const buildQuestionData = (q, quizSetId, i) => {
    const qd = {
      quiz_set_id: quizSetId,
      order: i,
      prompt: q.prompt,
      explanation: q.explanation || '',
      question_type: q.type || 'multiple_choice'
    };
    if (q.type === 'multiple_choice') {
      qd.options = q.options;
      qd.correct_index = q.correctIndex;
    } else if (q.type === 'written') {
      let keywords = q.answerKeywords;
      if (typeof keywords === 'string') keywords = keywords.split(',').map(kw => kw.trim()).filter(Boolean);
      else keywords = (keywords || []).filter(kw => kw.trim() !== '');
      qd.answer_keywords = keywords;
      qd.require_working = q.requireWorking || false;
      if (q.requireWorking) {
        let workingKw = q.workingKeywords;
        if (typeof workingKw === 'string') workingKw = workingKw.split(',').map(kw => kw.trim()).filter(Boolean);
        else workingKw = (workingKw || []).filter(kw => kw.trim() !== '');
        qd.working_keywords = workingKw;
      }
    }
    return qd;
  };

  // ASSIGNMENT publish mutation
  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!user?.email || !classId) throw new Error('Missing user or class information');
      const questionsToSave = questions.filter(isQuestionStarted);
      
      if (isEditMode && originalQuizId) {
        const oldQuestions = await base44.entities.QuizQuestion.filter({ quiz_set_id: originalQuizId });
        for (const oldQ of oldQuestions) await base44.entities.QuizQuestion.delete(oldQ.id);
        for (let i = 0; i < questionsToSave.length; i++) {
          await base44.entities.QuizQuestion.create(buildQuestionData(questionsToSave[i], originalQuizId, i));
        }
        const assignmentData = {
          title: assignmentTitle,
          status: 'published',
          max_points: questionsToSave.length * 10,
          show_leaderboard: showLeaderboard
        };
        if (selectedTopic === 'custom' && customTopicName.trim()) {
          assignmentData.custom_topic_name = customTopicName.trim();
          assignmentData.topic_id = null;
        } else if (selectedTopic && selectedTopic !== 'custom') {
          assignmentData.topic_id = selectedTopic;
          assignmentData.custom_topic_name = null;
        }
        if (dueDate) assignmentData.due_date = new Date(dueDate).toISOString();
        else assignmentData.due_date = null;
        await base44.entities.Assignment.update(assignmentId, assignmentData);
        return { assignment: existingAssignment };
      } else {
        const quizSet = await base44.entities.QuizSet.create({
          owner_email: user.email,
          title: assignmentTitle,
          topic_id: selectedTopic !== 'custom' ? (selectedTopic || null) : null,
          status: 'published',
          question_count: questionsToSave.length
        });
        for (let i = 0; i < questionsToSave.length; i++) {
          await base44.entities.QuizQuestion.create(buildQuestionData(questionsToSave[i], quizSet.id, i));
        }
        const assignmentData = {
          title: assignmentTitle,
          class_id: classId,
          teacher_email: user.email,
          quiz_id: quizSet.id,
          assignment_type: 'quiz',
          status: 'published',
          max_points: questionsToSave.length * 10,
          show_leaderboard: showLeaderboard
        };
        if (selectedTopic === 'custom' && customTopicName.trim()) {
          assignmentData.custom_topic_name = customTopicName.trim();
        } else if (selectedTopic && selectedTopic !== 'custom') {
          assignmentData.topic_id = selectedTopic;
        }
        if (dueDate) assignmentData.due_date = new Date(dueDate).toISOString();
        const assignment = await base44.entities.Assignment.create(assignmentData);
        return { assignment, quizSet };
      }
    },
    onSuccess: () => {
      navigate(createPageUrl(`TeacherClassDetail?id=${classId}`));
    },
    onError: (error) => {
      console.error('Failed to publish assignment:', error);
      alert(`Failed to publish assignment:\n\n${error?.message || 'Unknown error'}`);
    }
  });

  // LIVE QUIZ start mutation — uses QuizLobbySession (same system as student popup/join-by-code)
  const startLiveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.email) throw new Error('Not signed in');

      const validQs = questions.filter(q => isQuestionValid(q));
      if (validQs.length === 0) throw new Error('Please add at least one valid question');

      // Build embedded questions for the session
      const embeddedQuestions = validQs.map((q, i) => ({
        order: i,
        prompt: q.prompt,
        question_type: q.type || 'multiple_choice',
        options: q.type === 'multiple_choice' ? q.options : [],
        correct_index: q.type === 'multiple_choice' ? (q.correctIndex ?? 0) : 0,
        correct_answer: q.type === 'multiple_choice'
          ? (q.options[q.correctIndex] || '')
          : (q.answerKeywords?.[0] || ''),
        answer_keywords: q.type === 'written' ? (q.answerKeywords || []) : [],
        explanation: q.explanation || '',
        difficulty: 'medium',
      }));

      // Generate 5-char join code
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const joinCode = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');

      console.log('Starting quiz with code:', joinCode);

      // Create QuizLobbySession — same entity used by student popup and join-by-code
      const session = await base44.entities.QuizLobbySession.create({
        class_id: classId || '',
        class_name: assignmentTitle || 'Live Quiz',
        teacher_email: user.email,
        teacher_name: user.full_name || user.email.split('@')[0],
        quiz_title: assignmentTitle || 'Live Quiz',
        join_code: joinCode,
        status: 'lobby',
        participant_emails: [],
        participant_names: [],
        questions_json: JSON.stringify(embeddedQuestions),
      });

      return session;
    },
    onSuccess: (session) => {
      navigate(`/live-quiz-lobby-new?sessionId=${session.id}`);
    },
    onError: (error) => {
      console.error('Failed to start live quiz:', error);
      alert(`Failed to start live quiz:\n\n${error?.message || 'Unknown error'}`);
    }
  });

  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      if (!user?.email || !classId) throw new Error('Missing user or class information');
      if (isEditMode) {
        const assignmentData = {
          title: assignmentTitle || 'Untitled Assignment',
          status: 'draft',
          max_points: questions.length * 10
        };
        if (selectedTopic === 'custom' && customTopicName.trim()) {
          assignmentData.custom_topic_name = customTopicName.trim();
          assignmentData.topic_id = null;
        } else if (selectedTopic && selectedTopic !== 'custom') {
          assignmentData.topic_id = selectedTopic;
          assignmentData.custom_topic_name = null;
        }
        if (dueDate) assignmentData.due_date = new Date(dueDate).toISOString();
        else assignmentData.due_date = null;
        await base44.entities.Assignment.update(assignmentId, assignmentData);
      } else {
        const assignmentData = {
          title: assignmentTitle || 'Untitled Assignment',
          class_id: classId,
          teacher_email: user.email,
          assignment_type: 'quiz',
          status: 'draft',
          max_points: questions.length * 10
        };
        if (selectedTopic === 'custom' && customTopicName.trim()) {
          assignmentData.custom_topic_name = customTopicName.trim();
        } else if (selectedTopic && selectedTopic !== 'custom') {
          assignmentData.topic_id = selectedTopic;
        }
        if (dueDate) assignmentData.due_date = new Date(dueDate).toISOString();
        await base44.entities.Assignment.create(assignmentData);
      }
    },
    onSuccess: () => {
      navigate(createPageUrl(`TeacherClassDetail?id=${classId}`));
    },
    onError: (error) => {
      console.error('Failed to save draft:', error);
      alert('Failed to save draft. Please try again.');
    }
  });

  const handleGlobalBankAdd = (mappedQuestions) => {
    if (!Array.isArray(mappedQuestions) || mappedQuestions.length === 0) return;

    const converted = mappedQuestions.map((q, i) => {
      const isWritten = q.question_type === 'short_answer' || q.question_type === 'written';
      return {
        id: i + 1,
        type: isWritten ? 'written' : (q.question_type || 'multiple_choice'),
        prompt: q.prompt || '',
        options: isWritten ? ['', '', '', ''] : (Array.isArray(q.options) ? q.options : ['', '', '', '']),
        correctIndex: isWritten ? null : (typeof q.correct_index === 'number' ? q.correct_index : 0),
        explanation: q.explanation || '',
        answerKeywords: isWritten
          ? (Array.isArray(q.answer_keywords) && q.answer_keywords.length > 0
              ? q.answer_keywords
              : [q.correct_answer || ''])
          : [''],
        requireWorking: false,
        workingKeywords: ['']
      };
    });

    // If there's only one blank placeholder, replace it; otherwise append
    const hasOnlyEmptyPlaceholder = questions.length === 1 && !questions[0].prompt?.trim();
    const base = hasOnlyEmptyPlaceholder ? [] : questions;
    const startId = base.length + 1;
    const withIds = converted.map((q, i) => ({ ...q, id: startId + i }));
    const newQuestions = [...base, ...withIds];

    setQuestions(newQuestions);
    setCurrentQuestionIndex(base.length === 0 ? 0 : base.length);
  };

  // A question is "started" if it has any prompt text
  const isQuestionStarted = (q) => q.prompt && q.prompt.trim() !== '';
  
  // Only validate questions that have been started (have a prompt)
  const startedQuestions = questions.filter(isQuestionStarted);
  
  const canSubmit = assignmentTitle.trim() !== '' && 
                    startedQuestions.length > 0 &&
                    startedQuestions.every(isQuestionValid) &&
                    (selectedTopic !== 'custom' || customTopicName.trim() !== '');

  // Tell the teacher what's missing
  const submitBlockReason = !assignmentTitle.trim() ? 'Add a title first'
    : startedQuestions.length === 0 ? 'Add at least one question'
    : !startedQuestions.every(isQuestionValid) ? 'Complete all questions (select correct answer & fill options)'
    : selectedTopic === 'custom' && !customTopicName.trim() ? 'Enter a custom topic name'
    : null;

  const pageTitle = isLiveMode ? 'Create Live Quiz' : (isEditMode ? 'Edit Assignment' : 'Create Assignment');
  const backUrl = createPageUrl(`TeacherClassDetail?id=${classId}`);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <button
            onClick={() => navigate(backUrl)}
            className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Back to {classData?.name || 'Class'}
          </button>

          <div className="flex gap-3 items-center">
            <h1 className="text-xl font-bold text-white hidden md:block">{pageTitle}</h1>
            {!isLiveMode && (
              <Button
                onClick={() => saveDraftMutation.mutate()}
                disabled={saveDraftMutation.isPending}
                className="bg-slate-600/80 hover:bg-slate-500/80 text-slate-200 border border-slate-500/40 shadow-lg"
              >
                {saveDraftMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Draft
              </Button>
            )}

            {isLiveMode ? (
              <div className="flex flex-col items-end gap-1">
                <Button
                  onClick={() => startLiveMutation.mutate()}
                  disabled={!canSubmit || startLiveMutation.isPending}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/30"
                >
                  {startLiveMutation.isPending ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />Starting...</>
                  ) : (
                    <><Zap className="w-4 h-4 mr-2" />Start Live Quiz</>
                  )}
                </Button>
                {submitBlockReason && <p className="text-xs text-amber-400">{submitBlockReason}</p>}
              </div>
            ) : (
              <div className="flex flex-col items-end gap-1">
                <Button
                  onClick={() => publishMutation.mutate()}
                  disabled={!canSubmit || publishMutation.isPending}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/30"
                >
                  {publishMutation.isPending ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />Publishing...</>
                  ) : (
                    <><CheckCircle2 className="w-4 h-4 mr-2" />{isEditMode ? 'Update Assignment' : 'Publish Assignment'}</>
                  )}
                </Button>
                {submitBlockReason && <p className="text-xs text-amber-400">{submitBlockReason}</p>}
              </div>
            )}
          </div>
        </div>

        {isEditMode && (
          <div className="mb-4 px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg">
            <p className="text-blue-300 text-sm">Editing mode: Changes will apply to the existing assignment</p>
          </div>
        )}

        {/* Title, Topic, and Due Date */}
        <GlassCard className="p-6 mb-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label className="text-white mb-2">{isLiveMode ? 'Quiz Title *' : 'Assignment Title *'}</Label>
              <Input
                placeholder={isLiveMode ? 'e.g., Fractions Live Quiz' : 'e.g., Week 5 Fractions Quiz'}
                value={assignmentTitle}
                onChange={(e) => setAssignmentTitle(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
              />
            </div>
            <div>
              <Label className="text-white mb-2">Topic (Optional)</Label>
              <Select value={selectedTopic} onValueChange={(value) => {
                setSelectedTopic(value);
                if (value !== 'custom') setCustomTopicName('');
              }}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Select topic or create custom" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom topic...</SelectItem>
                  {topics.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedTopic === 'custom' && (
            <div className="mt-4">
              <Label className="text-white mb-2">Custom Topic Name *</Label>
              <Input
                placeholder="Enter custom topic name"
                value={customTopicName}
                onChange={(e) => setCustomTopicName(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
              />
              <p className="text-xs text-slate-400 mt-1">This topic will only apply to this assignment</p>
            </div>
          )}

          {!isLiveMode && (
            <>
              <div className="mt-4">
                <Label className="text-white mb-2">Due Date (Optional)</Label>
                <Input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white">Show Class Leaderboard</Label>
                    <p className="text-xs text-slate-400 mt-1">Students will see how they rank compared to classmates</p>
                  </div>
                  <Switch
                    checked={showLeaderboard}
                    onCheckedChange={setShowLeaderboard}
                  />
                </div>
              </div>
            </>
          )}
        </GlassCard>

        {/* Horizontal Question Tabs */}
        <GlassCard className="p-4 mb-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {questions.map((q, idx) => {
              const isValid = isQuestionValid(q);
              const isComplete = isQuestionComplete(q);
              const isCurrent = idx === currentQuestionIndex;

              return (
                <motion.button
                  key={q.id}
                  onClick={() => setCurrentQuestionIndex(idx)}
                  className={`
                    relative px-5 py-3 rounded-xl font-medium transition-all whitespace-nowrap flex-shrink-0
                    ${isCurrent 
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/50' 
                      : isComplete
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : isValid
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-white/5 text-slate-300 border border-white/10'
                    }
                  `}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="flex items-center gap-2">
                    Q{idx + 1}
                    {isComplete && !isCurrent && <CheckCircle2 className="w-4 h-4" />}
                  </span>
                  {questions.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteQuestion(idx);
                      }}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3 text-white" />
                    </button>
                  )}
                </motion.button>
              );
            })}
            
            <Button
              onClick={() => setShowGlobalBank(true)}
              size="sm"
              className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 flex-shrink-0"
            >
              <Database className="w-4 h-4 mr-1" />
              Global Bank
            </Button>
            <Button
              onClick={addQuestion}
              size="sm"
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-lg shadow-blue-500/30 flex-shrink-0"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Question
            </Button>
          </div>
        </GlassCard>

        {/* Question Editor */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <GlassCard className="p-8">
              <div className="space-y-6">
                {/* Question Type */}
                <div>
                  <Label className="text-white mb-2">Question Type</Label>
                  <Select 
                    value={currentQuestion.type || 'multiple_choice'} 
                    onValueChange={(value) => updateCurrentQuestion('type', value)}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                      <SelectItem value="written">Written Answer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Question Prompt */}
                <div>
                  <Label className="text-white mb-2 flex items-center gap-2">
                    Question {currentQuestionIndex + 1}
                    {!isQuestionValid(currentQuestion) && (
                      <span className="text-xs text-amber-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Incomplete
                      </span>
                    )}
                  </Label>
                  <Textarea
                    placeholder="Enter your question here..."
                    value={currentQuestion.prompt}
                    onChange={(e) => updateCurrentQuestion('prompt', e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 min-h-[100px]"
                  />
                </div>

                {/* Multiple Choice Options */}
                {currentQuestion.type === 'multiple_choice' && (
                  <div>
                    <Label className="text-white mb-3">Answer Options</Label>
                    <div className="space-y-3">
                      {currentQuestion.options.map((option, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <button
                            onClick={() => updateCurrentQuestion('correctIndex', idx)}
                            className={`
                              w-10 h-10 rounded-lg flex items-center justify-center font-bold transition-all flex-shrink-0
                              ${currentQuestion.correctIndex === idx
                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50'
                                : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
                              }
                            `}
                          >
                            {String.fromCharCode(65 + idx)}
                          </button>
                          <Input
                            placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                            value={option}
                            onChange={(e) => updateOption(idx, e.target.value)}
                            className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 flex-1"
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Click the letter to mark it as the correct answer</p>
                  </div>
                )}

                {/* Written Answer Keywords */}
                {currentQuestion.type === 'written' && (
                  <div className="space-y-6">
                    <div>
                      <Label className="text-white mb-2">Accepted Answer Keywords *</Label>
                      <p className="text-xs text-slate-400 mb-3">
                        Student answers will be marked as correct if they match any of these keywords (case-insensitive)
                      </p>
                      <div className="space-y-2">
                        {currentQuestion.answerKeywords.map((keyword, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <Input
                              placeholder="Enter keyword or phrase..."
                              value={keyword}
                              onChange={(e) => updateKeyword('answerKeywords', idx, e.target.value)}
                              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 flex-1"
                            />
                            {currentQuestion.answerKeywords.length > 1 && (
                              <Button size="sm" variant="ghost" onClick={() => removeKeyword('answerKeywords', idx)} className="text-red-400 hover:text-red-300">
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button size="sm" onClick={() => addKeyword('answerKeywords')} variant="outline" className="border-purple-500/40 text-purple-300 hover:bg-purple-500/20 w-full">
                          <Plus className="w-4 h-4 mr-1" />
                          Add Keyword
                        </Button>
                      </div>
                    </div>

                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <Label className="text-white">Require Explanation/Working?</Label>
                          <p className="text-xs text-slate-400 mt-1">Students must provide working to show how they got their answer</p>
                        </div>
                        <Switch
                          checked={currentQuestion.requireWorking}
                          onCheckedChange={(checked) => updateCurrentQuestion('requireWorking', checked)}
                        />
                      </div>

                      {currentQuestion.requireWorking && (
                        <div className="mt-4 pt-4 border-t border-white/10">
                          <Label className="text-white mb-2">Required Working Keywords *</Label>
                          <p className="text-xs text-slate-400 mb-3">All keywords must appear in the student's explanation</p>
                          <div className="space-y-2">
                            {currentQuestion.workingKeywords.map((keyword, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <Input
                                  placeholder="Enter required keyword..."
                                  value={keyword}
                                  onChange={(e) => updateKeyword('workingKeywords', idx, e.target.value)}
                                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 flex-1"
                                />
                                {currentQuestion.workingKeywords.length > 1 && (
                                  <Button size="sm" variant="ghost" onClick={() => removeKeyword('workingKeywords', idx)} className="text-red-400 hover:text-red-300">
                                    <X className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            ))}
                            <Button size="sm" onClick={() => addKeyword('workingKeywords')} variant="outline" className="border-purple-500/40 text-purple-300 hover:bg-purple-500/20 w-full">
                              <Plus className="w-4 h-4 mr-1" />
                              Add Working Keyword
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Explanation */}
                <div>
                  <Label className="text-white mb-2">Explanation (Optional)</Label>
                  <Textarea
                    placeholder="Explain the answer or show working..."
                    value={currentQuestion.explanation}
                    onChange={(e) => updateCurrentQuestion('explanation', e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                  />
                </div>

                {/* Navigation */}
                <div className="flex justify-between pt-4 border-t border-white/10">
                  <Button
                    onClick={goToPreviousQuestion}
                    disabled={currentQuestionIndex === 0}
                    variant="outline"
                    className="border-slate-500/50 text-slate-300 hover:bg-slate-500/20 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                  <Button
                    onClick={goToNextQuestion}
                    className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 shadow-lg shadow-purple-500/30"
                  >
                    {currentQuestionIndex === questions.length - 1 ? 'Add New' : 'Next'}
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </AnimatePresence>

        {/* Summary */}
        <GlassCard className="p-6 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white mb-1">
                {isLiveMode ? 'Quiz Progress' : 'Assignment Progress'}
              </h3>
              <p className="text-slate-300 text-sm">
                {questions.filter(isQuestionComplete).length} of {questions.length} questions complete
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-white">{questions.length}</p>
              <p className="text-xs text-slate-400">Total Questions</p>
            </div>
          </div>
        </GlassCard>

        <GlobalQuestionBankDialog
          open={showGlobalBank}
          onClose={() => setShowGlobalBank(false)}
          onAddQuestions={handleGlobalBankAdd}
          classSubjectId={classData?.subject_id}
          classYearGroup={classData?.year_group}
        />
      </div>
    </div>
  );
}