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
  X
} from 'lucide-react';

export default function AssignmentBuilder() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const classId = urlParams.get('classId');
  const assignmentId = urlParams.get('assignmentId');
  const isEditMode = !!assignmentId;
  
  const [user, setUser] = useState(null);
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [customTopicName, setCustomTopicName] = useState('');
  const [dueDate, setDueDate] = useState('');
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
    if (q.prompt.trim() === '') return false;
    
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

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!user?.email || !classId) {
        throw new Error('Missing user or class information');
      }
      
      if (isEditMode && originalQuizId) {
        // Delete old questions
        const oldQuestions = await base44.entities.QuizQuestion.filter({ quiz_set_id: originalQuizId });
        for (const oldQ of oldQuestions) {
          await base44.entities.QuizQuestion.delete(oldQ.id);
        }

        // Create new questions
        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          const questionData = {
            quiz_set_id: originalQuizId,
            order: i,
            prompt: q.prompt,
            explanation: q.explanation,
            question_type: q.type || 'multiple_choice'
          };

          if (q.type === 'multiple_choice') {
            questionData.options = q.options;
            questionData.correct_index = q.correctIndex;
          } else if (q.type === 'written') {
            questionData.answer_keywords = q.answerKeywords.filter(kw => kw.trim() !== '');
            questionData.require_working = q.requireWorking;
            if (q.requireWorking) {
              questionData.working_keywords = q.workingKeywords.filter(kw => kw.trim() !== '');
            }
          }

          await base44.entities.QuizQuestion.create(questionData);
        }

        // Update assignment
        const assignmentData = {
          title: assignmentTitle,
          status: 'published',
          max_points: questions.length * 10
        };

        if (selectedTopic === 'custom' && customTopicName.trim()) {
          assignmentData.custom_topic_name = customTopicName.trim();
          assignmentData.topic_id = null;
        } else if (selectedTopic && selectedTopic !== 'custom') {
          assignmentData.topic_id = selectedTopic;
          assignmentData.custom_topic_name = null;
        }

        if (dueDate) {
          assignmentData.due_date = new Date(dueDate).toISOString();
        } else {
          assignmentData.due_date = null;
        }

        await base44.entities.Assignment.update(assignmentId, assignmentData);

        return { assignment: existingAssignment };
      } else {
        // Create mode
        const quizSet = await base44.entities.QuizSet.create({
          owner_email: user.email,
          title: assignmentTitle,
          topic_id: selectedTopic || null,
          status: 'published',
          question_count: questions.length
        });

        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          const questionData = {
            quiz_set_id: quizSet.id,
            order: i,
            prompt: q.prompt,
            explanation: q.explanation,
            question_type: q.type || 'multiple_choice'
          };

          if (q.type === 'multiple_choice') {
            questionData.options = q.options;
            questionData.correct_index = q.correctIndex;
          } else if (q.type === 'written') {
            questionData.answer_keywords = q.answerKeywords.filter(kw => kw.trim() !== '');
            questionData.require_working = q.requireWorking;
            if (q.requireWorking) {
              questionData.working_keywords = q.workingKeywords.filter(kw => kw.trim() !== '');
            }
          }

          await base44.entities.QuizQuestion.create(questionData);
        }

        const assignmentData = {
          title: assignmentTitle,
          class_id: classId,
          teacher_email: user.email,
          quiz_id: quizSet.id,
          assignment_type: 'quiz',
          status: 'published',
          max_points: questions.length * 10
        };

        if (selectedTopic === 'custom' && customTopicName.trim()) {
          assignmentData.custom_topic_name = customTopicName.trim();
        } else if (selectedTopic && selectedTopic !== 'custom') {
          assignmentData.topic_id = selectedTopic;
        }

        if (dueDate) {
          assignmentData.due_date = new Date(dueDate).toISOString();
        }

        const assignment = await base44.entities.Assignment.create(assignmentData);

        return { assignment, quizSet };
      }
    },
    onSuccess: () => {
      navigate(createPageUrl(`TeacherClassDetail?id=${classId}`));
    },
    onError: (error) => {
      console.error('Failed to publish assignment:', error);
      alert('Failed to publish assignment. Please try again.');
    }
  });

  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      if (!user?.email || !classId) {
        throw new Error('Missing user or class information');
      }
      
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

        if (dueDate) {
          assignmentData.due_date = new Date(dueDate).toISOString();
        } else {
          assignmentData.due_date = null;
        }

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

        if (dueDate) {
          assignmentData.due_date = new Date(dueDate).toISOString();
        }

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

  const canPublish = assignmentTitle.trim() !== '' && 
                     classId && 
                     questions.length > 0 &&
                     questions.every(isQuestionValid) &&
                     (selectedTopic !== 'custom' || customTopicName.trim() !== '');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate(createPageUrl(`TeacherClassDetail?id=${classId}`))}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Back to {classData?.name || 'Class'}
          </button>

          <div className="flex gap-3">
            <Button
              onClick={() => saveDraftMutation.mutate()}
              disabled={saveDraftMutation.isPending}
              className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white shadow-lg shadow-slate-500/30"
            >
              {saveDraftMutation.isPending ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Draft
            </Button>
            <Button
              onClick={() => publishMutation.mutate()}
              disabled={!canPublish || publishMutation.isPending}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/30"
            >
              {publishMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Publishing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {isEditMode ? 'Update Assignment' : 'Publish Assignment'}
                </>
              )}
            </Button>
          </div>
        </div>

        {isEditMode && (
          <div className="mb-4 px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg">
            <p className="text-blue-400 text-sm">
              Editing mode: Changes will apply to the existing assignment
            </p>
          </div>
        )}

        {/* Title, Topic, and Due Date */}
        <GlassCard className="p-6 mb-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label className="text-white mb-2">Assignment Title *</Label>
              <Input
                placeholder="e.g., Week 5 Fractions Quiz"
                value={assignmentTitle}
                onChange={(e) => setAssignmentTitle(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
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
                className="bg-white/5 border-white/10 text-white"
              />
              <p className="text-xs text-slate-400 mt-1">
                This topic will only apply to this assignment
              </p>
            </div>
          )}

          <div className="mt-4">
            <Label className="text-white mb-2">Due Date (Optional)</Label>
            <Input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
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
                          : 'bg-white/5 text-slate-400 border border-white/10'
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
                    className="bg-white/5 border-white/10 text-white min-h-[100px]"
                  />
                </div>

                {/* Conditional: Multiple Choice Options */}
                {currentQuestion.type === 'multiple_choice' && (
                  <div>
                    <Label className="text-white mb-3">Answer Options</Label>
                    <div className="space-y-3">
                      {currentQuestion.options.map((option, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <button
                            onClick={() => updateCurrentQuestion('correctIndex', idx)}
                            className={`
                              w-10 h-10 rounded-lg flex items-center justify-center font-bold transition-all
                              ${currentQuestion.correctIndex === idx
                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50'
                                : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                              }
                            `}
                          >
                            {String.fromCharCode(65 + idx)}
                          </button>
                          <Input
                            placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                            value={option}
                            onChange={(e) => updateOption(idx, e.target.value)}
                            className="bg-white/5 border-white/10 text-white flex-1"
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Click the letter to mark it as the correct answer
                    </p>
                  </div>
                )}

                {/* Conditional: Written Answer Keywords */}
                {currentQuestion.type === 'written' && (
                  <div className="space-y-6">
                    <div>
                      <Label className="text-white mb-2">Accepted Answer Keywords *</Label>
                      <p className="text-xs text-slate-400 mb-3">
                        Student answers will be marked as correct if they match any of these keywords (case-insensitive, fuzzy match)
                      </p>
                      <div className="space-y-2">
                        {currentQuestion.answerKeywords.map((keyword, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <Input
                              placeholder="Enter keyword or phrase..."
                              value={keyword}
                              onChange={(e) => updateKeyword('answerKeywords', idx, e.target.value)}
                              className="bg-white/5 border-white/10 text-white flex-1"
                            />
                            {currentQuestion.answerKeywords.length > 1 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeKeyword('answerKeywords', idx)}
                                className="text-red-400 hover:text-red-300"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button
                          size="sm"
                          onClick={() => addKeyword('answerKeywords')}
                          variant="outline"
                          className="border-white/20 text-white hover:bg-white/10 w-full"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Keyword
                        </Button>
                      </div>
                    </div>

                    {/* Working/Explanation Requirements */}
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <Label className="text-white">Require Explanation/Working?</Label>
                          <p className="text-xs text-slate-400 mt-1">
                            Students must provide working to show how they got their answer
                          </p>
                        </div>
                        <Switch
                          checked={currentQuestion.requireWorking}
                          onCheckedChange={(checked) => updateCurrentQuestion('requireWorking', checked)}
                        />
                      </div>

                      {currentQuestion.requireWorking && (
                        <div className="mt-4 pt-4 border-t border-white/10">
                          <Label className="text-white mb-2">Required Working Keywords *</Label>
                          <p className="text-xs text-slate-400 mb-3">
                            All keywords must appear in the student's explanation for full credit
                          </p>
                          <div className="space-y-2">
                            {currentQuestion.workingKeywords.map((keyword, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <Input
                                  placeholder="Enter required keyword..."
                                  value={keyword}
                                  onChange={(e) => updateKeyword('workingKeywords', idx, e.target.value)}
                                  className="bg-white/5 border-white/10 text-white flex-1"
                                />
                                {currentQuestion.workingKeywords.length > 1 && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removeKeyword('workingKeywords', idx)}
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            ))}
                            <Button
                              size="sm"
                              onClick={() => addKeyword('workingKeywords')}
                              variant="outline"
                              className="border-white/20 text-white hover:bg-white/10 w-full"
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Add Working Keyword
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Explanation (Optional) */}
                <div>
                  <Label className="text-white mb-2">Explanation (Optional)</Label>
                  <Textarea
                    placeholder="Explain the answer or show working..."
                    value={currentQuestion.explanation}
                    onChange={(e) => updateCurrentQuestion('explanation', e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>

                {/* Navigation */}
                <div className="flex justify-between pt-4 border-t border-white/10">
                  <Button
                    onClick={goToPreviousQuestion}
                    disabled={currentQuestionIndex === 0}
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10"
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
              <h3 className="text-lg font-bold text-white mb-1">Assignment Progress</h3>
              <p className="text-slate-400 text-sm">
                {questions.filter(isQuestionComplete).length} of {questions.length} questions complete
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-white">{questions.length}</p>
              <p className="text-xs text-slate-400">Total Questions</p>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}