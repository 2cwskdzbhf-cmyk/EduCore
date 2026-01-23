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
import { 
  ChevronLeft,
  Plus,
  ChevronRight,
  Save,
  CheckCircle2,
  AlertCircle,
  Trash2
} from 'lucide-react';

export default function AssignmentBuilder() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const classId = urlParams.get('classId');
  
  const [user, setUser] = useState(null);
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState([
    {
      id: 1,
      prompt: '',
      options: ['', '', '', ''],
      correctIndex: null,
      explanation: ''
    }
  ]);

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
        prompt: '',
        options: ['', '', '', ''],
        correctIndex: null,
        explanation: ''
      }
    ]);
    setCurrentQuestionIndex(questions.length);
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
    return q.prompt.trim() !== '' && 
           q.options.filter(opt => opt.trim() !== '').length >= 2 &&
           q.correctIndex !== null;
  };

  const isQuestionComplete = (q) => {
    return isQuestionValid(q) && q.options.every(opt => opt.trim() !== '');
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
      if (!user?.email || !classId) return;
      
      const assignment = await base44.entities.Assignment.create({
        title: assignmentTitle,
        class_id: classId,
        teacher_email: user.email,
        topic_id: selectedTopic,
        assignment_type: 'quiz',
        status: 'published',
        max_points: questions.length * 10
      });

      const quizSet = await base44.entities.QuizSet.create({
        owner_email: user.email,
        title: assignmentTitle,
        topic_id: selectedTopic,
        status: 'published',
        question_count: questions.length
      });

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        await base44.entities.QuizQuestion.create({
          quiz_set_id: quizSet.id,
          order: i,
          prompt: q.prompt,
          options: q.options,
          correct_index: q.correctIndex,
          explanation: q.explanation
        });
      }

      return { assignment, quizSet };
    },
    onSuccess: () => {
      navigate(createPageUrl(`TeacherClassDetail?id=${classId}`));
    }
  });

  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      if (!user?.email || !classId) return;
      
      const assignment = await base44.entities.Assignment.create({
        title: assignmentTitle || 'Untitled Assignment',
        class_id: classId,
        teacher_email: user.email,
        topic_id: selectedTopic,
        assignment_type: 'quiz',
        status: 'draft',
        max_points: questions.length * 10
      });

      return assignment;
    },
    onSuccess: () => {
      navigate(createPageUrl(`TeacherClassDetail?id=${classId}`));
    }
  });

  const canPublish = assignmentTitle.trim() !== '' && 
                     selectedTopic !== '' && 
                     questions.every(isQuestionValid);

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
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
            <Button
              onClick={() => publishMutation.mutate()}
              disabled={!canPublish || publishMutation.isPending}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/30"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Publish Assignment
            </Button>
          </div>
        </div>

        {/* Title and Topic */}
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

                {/* Answer Options */}
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