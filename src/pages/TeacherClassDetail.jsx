import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import GlassCard from '@/components/ui/GlassCard';
import { 
  ChevronLeft, Users, Sparkles, Loader2, Trophy, ClipboardList, 
  BarChart3, Plus, Trash2, RefreshCw, Save, CheckCircle2, Edit2, Zap,
  Calendar, Clock, Target, TrendingUp, Eye, X
} from 'lucide-react';
import StudentStatsModal from '@/components/teacher/StudentStatsModal';
import { AnimatePresence } from 'framer-motion';

export default function TeacherClassDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const classId = urlParams.get('id');
  
  const [user, setUser] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedLesson, setSelectedLesson] = useState('');
  const [count, setCount] = useState(15);
  const [difficulty, setDifficulty] = useState('medium');
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [regenerateFeedback, setRegenerateFeedback] = useState('');
  const [regeneratingIndex, setRegeneratingIndex] = useState(null);
  const [liveQuizTitle, setLiveQuizTitle] = useState('');
  const [generatedLiveQuestions, setGeneratedLiveQuestions] = useState([]);
  const [copiedCode, setCopiedCode] = useState(false);
  const [lastGenerateTime, setLastGenerateTime] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  const copyJoinCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

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
    };
    fetchUser();
  }, []);

  const { data: classData } = useQuery({
    queryKey: ['class', classId],
    queryFn: async () => {
      const classes = await base44.entities.Class.filter({ id: classId });
      return classes[0] || null;
    },
    enabled: !!classId
  });

  const { data: subject } = useQuery({
    queryKey: ['subject', classData?.subject_id],
    queryFn: async () => {
      const subjects = await base44.entities.Subject.filter({ id: classData.subject_id });
      return subjects[0] || null;
    },
    enabled: !!classData?.subject_id
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['topics', classData?.subject_id],
    queryFn: () => base44.entities.Topic.filter({ subject_id: classData.subject_id }, 'order'),
    enabled: !!classData?.subject_id
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ['lessons', selectedTopic],
    queryFn: () => base44.entities.Lesson.filter({ topic_id: selectedTopic }, 'order'),
    enabled: !!selectedTopic
  });

  const { data: questionBank = [] } = useQuery({
    queryKey: ['questionBank', classId],
    queryFn: async () => {
      const topicIds = topics.map(t => t.id);
      if (topicIds.length === 0) return [];
      return base44.entities.QuestionBankItem.filter({ topic_id: { $in: topicIds }, is_active: true });
    },
    enabled: topics.length > 0
  });

  const { data: liveQuizSets = [] } = useQuery({
    queryKey: ['liveQuizSets', classId],
    queryFn: () => base44.entities.LiveQuizSet.filter({ class_id: classId }, '-created_date'),
    enabled: !!classId
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments', classId],
    queryFn: () => base44.entities.Assignment.filter({ class_id: classId }, '-created_date'),
    enabled: !!classId
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['submissions', classId],
    queryFn: () => base44.entities.AssignmentSubmission.filter({ class_id: classId }),
    enabled: !!classId
  });

  const { data: classStudents = [] } = useQuery({
    queryKey: ['classStudents', classData?.student_emails],
    queryFn: async () => {
      if (!classData?.student_emails || classData.student_emails.length === 0) return [];
      const students = await base44.entities.User.filter({ 
        email: { $in: classData.student_emails } 
      });
      return students;
    },
    enabled: !!classData?.student_emails && classData.student_emails.length > 0
  });

  const generatePracticeMutation = useMutation({
    mutationFn: async ({ regenerateIndex, regenerateFeedback }) => {
      const now = Date.now();
      if (now - lastGenerateTime < 30000) {
        const remainingSec = Math.ceil((30000 - (now - lastGenerateTime)) / 1000);
        throw new Error(`Please wait ${remainingSec}s before generating again`);
      }
      setLastGenerateTime(now);
      setCooldownRemaining(30);
      
      const response = await base44.functions.invoke('generateQuestionsAI', {
        lessonId: selectedLesson || null,
        topicId: selectedTopic,
        count: regenerateIndex !== null ? 1 : count,
        difficulty,
        regenerateIndex,
        regenerateFeedback
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      if (variables.regenerateIndex !== null) {
        const newQuestions = [...generatedQuestions];
        newQuestions[variables.regenerateIndex] = data.questions[0];
        setGeneratedQuestions(newQuestions);
        setRegeneratingIndex(null);
      } else {
        setGeneratedQuestions(data.questions || []);
      }
    },
    onError: () => {
      setCooldownRemaining(0);
    }
  });

  const publishPracticeMutation = useMutation({
    mutationFn: async () => {
      for (const q of generatedQuestions) {
        await base44.entities.QuestionBankItem.create({
          lesson_id: selectedLesson || null,
          topic_id: selectedTopic,
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
      setSelectedTopic('');
    }
  });

  const generateLiveMutation = useMutation({
    mutationFn: async () => {
      const now = Date.now();
      if (now - lastGenerateTime < 30000) {
        const remainingSec = Math.ceil((30000 - (now - lastGenerateTime)) / 1000);
        throw new Error(`Please wait ${remainingSec}s before generating again`);
      }
      setLastGenerateTime(now);
      setCooldownRemaining(30);
      
      const response = await base44.functions.invoke('generateLiveQuizQuestionsAI', {
        lessonId: selectedLesson || null,
        topicId: selectedTopic,
        count,
        difficulty,
        regenerateFeedback
      });
      return response.data;
    },
    onSuccess: (data) => {
      setGeneratedLiveQuestions(data.questions || []);
    },
    onError: () => {
      setCooldownRemaining(0);
    }
  });

  const publishLiveQuizMutation = useMutation({
    mutationFn: async () => {
      const quizSet = await base44.entities.LiveQuizSet.create({
        class_id: classId,
        title: liveQuizTitle,
        source_lesson_id: selectedLesson || null,
        source_topic_id: selectedTopic,
        created_by: user.email,
        question_count: generatedLiveQuestions.length,
        difficulty
      });

      for (let i = 0; i < generatedLiveQuestions.length; i++) {
        const q = generatedLiveQuestions[i];
        await base44.entities.LiveQuizQuestion.create({
          live_quiz_set_id: quizSet.id,
          order: i,
          prompt: q.prompt,
          correct_answer: q.correct_answer,
          allowed_forms: q.allowed_forms || ['fraction', 'decimal'],
          difficulty: q.difficulty || difficulty,
          explanation: q.explanation || '',
          type: q.type || 'fraction',
          hint: q.hint || ''
        });
      }

      return quizSet;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['liveQuizSets']);
      setGeneratedLiveQuestions([]);
      setLiveQuizTitle('');
      setSelectedTopic('');
      setSelectedLesson('');
    }
  });

  if (!classData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <Link
            to={createPageUrl('TeacherDashboard')}
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Back to Dashboard
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">{classData.name}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400 mb-3">
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {classData.student_emails?.length || 0} students
              </span>
              <span>{subject?.name}</span>
            </div>
            
            <GlassCard className="p-4 inline-block">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Class Join Code</p>
                  <p className="text-2xl font-bold text-white font-mono tracking-wider">{classData.join_code}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyJoinCode(classData.join_code)}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  {copiedCode ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Copied!
                    </>
                  ) : (
                    'Copy Code'
                  )}
                </Button>
              </div>
            </GlassCard>
          </div>

          <Tabs defaultValue="setAssignments" className="space-y-6">
            <TabsList className="bg-white/5 border border-white/10">
              <TabsTrigger value="setAssignments">Set Assignments</TabsTrigger>
              <TabsTrigger value="practice">Create</TabsTrigger>
              <TabsTrigger value="live">Live Quizzes</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            {/* Assignments Tab */}
            <TabsContent value="practice" className="space-y-6">
              <GlassCard className="p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  AI Generate Assignment Questions
                </h3>

                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
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
                          <SelectValue placeholder="All lessons" />
                        </SelectTrigger>
                        <SelectContent>
                          {lessons.map(l => (
                            <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-white mb-2">Questions</Label>
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

                  <div className="space-y-3">
                    <Button
                      onClick={() => generatePracticeMutation.mutate({ regenerateIndex: null, regenerateFeedback: '' })}
                      disabled={!selectedTopic || generatePracticeMutation.isPending || cooldownRemaining > 0}
                      className="w-full bg-gradient-to-r from-purple-500 to-blue-500"
                    >
                      {generatePracticeMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : cooldownRemaining > 0 ? (
                        <>Wait {cooldownRemaining}s...</>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate Questions
                        </>
                      )}
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => navigate(createPageUrl(`AssignmentBuilder?classId=${classId}`))}
                        className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/30 text-white"
                      >
                        Create Assignment
                      </Button>
                      <Button
                        onClick={() => navigate(createPageUrl(`QuizLibrary?classId=${classId}`))}
                        className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-lg shadow-blue-500/30 text-white"
                      >
                        Library
                      </Button>
                    </div>
                  </div>

                  {generatePracticeMutation.isError && (
                    <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
                      <p className="font-semibold mb-1">Generation Failed</p>
                      <p>{generatePracticeMutation.error?.response?.data?.error || generatePracticeMutation.error?.message || 'Failed to generate. Check console for details.'}</p>
                    </div>
                  )}
                </div>

                {generatedQuestions.length > 0 && (
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-white">Preview ({generatedQuestions.length})</h4>
                      <div className="flex gap-2">
                        <Button onClick={() => setGeneratedQuestions([])} variant="outline" size="sm" className="border-white/20 text-white">
                          Clear
                        </Button>
                        <Button
                          onClick={() => publishPracticeMutation.mutate()}
                          disabled={publishPracticeMutation.isPending}
                          size="sm"
                          className="bg-emerald-500"
                        >
                          {publishPracticeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1" /> Publish</>}
                        </Button>
                      </div>
                    </div>

                    {generatedQuestions.map((q, idx) => (
                      <GlassCard key={idx} className="p-4">
                        {editingIndex === idx ? (
                          <div className="space-y-2">
                            <Textarea value={editingQuestion.prompt} onChange={(e) => setEditingQuestion({...editingQuestion, prompt: e.target.value})} className="bg-white/5 border-white/10 text-white" />
                            <Input value={editingQuestion.correct_answer} onChange={(e) => setEditingQuestion({...editingQuestion, correct_answer: e.target.value})} className="bg-white/5 border-white/10 text-white" />
                            <div className="flex gap-2">
                              <Button onClick={() => { const newQ = [...generatedQuestions]; newQ[idx] = editingQuestion; setGeneratedQuestions(newQ); setEditingIndex(null); }} size="sm" className="bg-emerald-500">Save</Button>
                              <Button onClick={() => setEditingIndex(null)} size="sm" variant="outline" className="border-white/20 text-white">Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-white font-medium">{q.prompt}</p>
                              <p className="text-emerald-400 text-sm">Answer: {q.correct_answer}</p>
                              {q.explanation && <p className="text-slate-400 text-xs mt-1">{q.explanation}</p>}
                            </div>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => { setEditingIndex(idx); setEditingQuestion({...q}); }} className="text-blue-400">
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => { setRegeneratingIndex(idx); generatePracticeMutation.mutate({ regenerateIndex: idx, regenerateFeedback }); }} className="text-purple-400">
                                <RefreshCw className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setGeneratedQuestions(generatedQuestions.filter((_, i) => i !== idx))} className="text-red-400">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </GlassCard>
                    ))}
                  </div>
                )}

                {publishPracticeMutation.isSuccess && (
                  <div className="mt-4 p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Assignment questions published! Students can now practice.
                  </div>
                )}
              </GlassCard>

              <GlassCard className="p-6">
                <h3 className="text-lg font-bold text-white mb-4">Assignment Question Bank ({questionBank.length})</h3>
                {questionBank.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {questionBank.slice(0, 20).map((q, i) => (
                      <div key={q.id} className="p-3 bg-white/5 rounded-lg text-sm">
                        <p className="text-white">{q.prompt}</p>
                        <p className="text-emerald-400 text-xs">Answer: {q.correct_answer}</p>
                      </div>
                    ))}
                    {questionBank.length > 20 && <p className="text-slate-500 text-xs">...and {questionBank.length - 20} more</p>}
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">No assignment questions yet. Use AI generator above.</p>
                )}
              </GlassCard>
            </TabsContent>

            {/* Live Quizzes Tab */}
            <TabsContent value="live" className="space-y-6">
              <GlassCard className="p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  Create Live Quiz Set
                </h3>

                <div className="space-y-4">
                  <div>
                    <Label className="text-white mb-2">Quiz Title *</Label>
                    <Input
                      placeholder="e.g., Fractions Practice Quiz"
                      value={liveQuizTitle}
                      onChange={(e) => setLiveQuizTitle(e.target.value)}
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
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
                          <SelectValue placeholder="All lessons" />
                        </SelectTrigger>
                        <SelectContent>
                          {lessons.map(l => (
                            <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-white mb-2">Questions</Label>
                      <Input
                        type="number"
                        value={count}
                        onChange={(e) => setCount(parseInt(e.target.value) || 10)}
                        min={5}
                        max={20}
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

                  <div className="space-y-3">
                    <Button
                      onClick={() => generateLiveMutation.mutate()}
                      disabled={!selectedTopic || !liveQuizTitle || generateLiveMutation.isPending || cooldownRemaining > 0}
                      className="w-full bg-gradient-to-r from-amber-500 to-orange-500"
                    >
                      {generateLiveMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : cooldownRemaining > 0 ? (
                        <>Wait {cooldownRemaining}s...</>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate Live Quiz Questions
                        </>
                      )}
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => navigate(createPageUrl(`CreateQuiz?classId=${classId}`))}
                        className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/30 text-white"
                      >
                        Create Manually
                      </Button>
                      <Button
                        onClick={() => navigate(createPageUrl(`QuizLibrary?classId=${classId}`))}
                        className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-lg shadow-blue-500/30 text-white"
                      >
                        Library
                      </Button>
                    </div>
                  </div>

                  {generateLiveMutation.isError && (
                    <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
                      <p className="font-semibold mb-1">Generation Failed</p>
                      <p>{generateLiveMutation.error?.response?.data?.error || generateLiveMutation.error?.message || 'Generation failed'}</p>
                    </div>
                  )}
                </div>

                {generatedLiveQuestions.length > 0 && (
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-white">Preview ({generatedLiveQuestions.length})</h4>
                      <Button
                        onClick={() => publishLiveQuizMutation.mutate()}
                        disabled={publishLiveQuizMutation.isPending}
                        className="bg-emerald-500"
                      >
                        {publishLiveQuizMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1" /> Publish Set</>}
                      </Button>
                    </div>

                    {generatedLiveQuestions.map((q, idx) => (
                      <GlassCard key={idx} className="p-4">
                        <div className="flex justify-between">
                          <div>
                            <p className="text-white font-medium">Q{idx + 1}: {q.prompt}</p>
                            <p className="text-emerald-400 text-sm">Answer: {q.correct_answer}</p>
                          </div>
                        </div>
                      </GlassCard>
                    ))}
                  </div>
                )}

                {publishLiveQuizMutation.isSuccess && (
                  <div className="mt-4 p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Live quiz set published!
                  </div>
                )}
              </GlassCard>

              <GlassCard className="p-6">
                <h3 className="text-lg font-bold text-white mb-4">Live Quiz Sets ({liveQuizSets.length})</h3>
                {liveQuizSets.length > 0 ? (
                  <div className="space-y-3">
                    {liveQuizSets.map(set => (
                      <div key={set.id} className="p-4 bg-white/5 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium">{set.title}</p>
                            <p className="text-slate-400 text-sm">{set.question_count} questions • {set.difficulty}</p>
                          </div>
                          <Button size="sm" className="bg-amber-500" onClick={() => navigate(createPageUrl(`StartLiveQuiz?setId=${set.id}&classId=${classId}`))}>
                            Start Session
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">No live quiz sets yet. Create one above.</p>
                )}
              </GlassCard>
            </TabsContent>

            {/* Set Assignments Tab */}
            <TabsContent value="setAssignments" className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">Class Assignments</h2>
                <Button
                  onClick={() => navigate(createPageUrl(`AssignmentBuilder?classId=${classId}`))}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/30"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Assignment
                </Button>
              </div>

              {assignments.length > 0 ? (
                <div className="space-y-4">
                  {assignments.map((assignment) => {
                    const assignmentSubmissions = submissions.filter(s => s.assignment_id === assignment.id);
                    const started = assignmentSubmissions.filter(s => s.status !== 'not_started').length;
                    const completed = assignmentSubmissions.filter(s => s.status === 'submitted' || s.status === 'graded').length;
                    
                    const totalQuestions = assignmentSubmissions.reduce((sum, s) => sum + (s.questions_answered || 0), 0);
                    const totalCorrect = assignmentSubmissions.reduce((sum, s) => sum + (s.correct_answers || 0), 0);
                    const avgAccuracy = totalQuestions > 0 ? ((totalCorrect / totalQuestions) * 100).toFixed(1) : 0;

                    const topicName = assignment.custom_topic_name || 
                      (assignment.topic_id ? topics.find(t => t.id === assignment.topic_id)?.name : null);

                    return (
                      <GlassCard 
                        key={assignment.id} 
                        className="p-6 hover:bg-white/10 transition-all cursor-pointer"
                        onClick={() => setSelectedAssignment(assignment)}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-xl font-bold text-white">{assignment.title}</h3>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                assignment.status === 'published' 
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-amber-500/20 text-amber-400'
                              }`}>
                                {assignment.status}
                              </span>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                              {topicName && (
                                <span className="flex items-center gap-1">
                                  <ClipboardList className="w-4 h-4" />
                                  {topicName}
                                </span>
                              )}
                              {assignment.due_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  Due: {new Date(assignment.due_date).toLocaleDateString()}
                                </span>
                              )}
                              {!assignment.due_date && (
                                <span className="text-slate-500">No due date</span>
                              )}
                              <span className="text-slate-500">
                                Created {new Date(assignment.created_date).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Started</p>
                            <p className="text-2xl font-bold text-white">{started}</p>
                            <p className="text-xs text-slate-400">of {classData.student_emails?.length || 0} students</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Completed</p>
                            <p className="text-2xl font-bold text-white">{completed}</p>
                            <p className="text-xs text-slate-400">submissions</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Avg Accuracy</p>
                            <p className="text-2xl font-bold text-white">{avgAccuracy}%</p>
                            <p className="text-xs text-slate-400">{totalQuestions} questions</p>
                          </div>
                        </div>
                      </GlassCard>
                    );
                  })}
                </div>
              ) : (
                <GlassCard className="p-12 text-center">
                  <ClipboardList className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 mb-4">No assignments created yet</p>
                  <Button
                    onClick={() => navigate(createPageUrl(`AssignmentBuilder?classId=${classId}`))}
                    className="bg-gradient-to-r from-purple-500 to-blue-500"
                  >
                    Create Your First Assignment
                  </Button>
                </GlassCard>
              )}
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <GlassCard className="p-6">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-amber-400" />
                  Class Leaderboard
                </h3>

                {classStudents.length > 0 ? (
                  <div className="space-y-2">
                    {classStudents
                      .map(student => {
                        const studentSubmissions = submissions.filter(s => s.student_email === student.email);
                        const totalQuestions = studentSubmissions.reduce((sum, s) => sum + (s.questions_answered || 0), 0);
                        const totalCorrect = studentSubmissions.reduce((sum, s) => sum + (s.correct_answers || 0), 0);
                        const totalTimeSeconds = studentSubmissions.reduce((sum, s) => sum + (s.time_spent_seconds || 0), 0);
                        const accuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
                        const completedCount = studentSubmissions.filter(s => s.status === 'submitted' || s.status === 'graded').length;

                        return {
                          ...student,
                          accuracy,
                          totalQuestions,
                          totalCorrect,
                          totalTimeSeconds,
                          completedCount
                        };
                      })
                      .sort((a, b) => b.accuracy - a.accuracy)
                      .map((student, index) => (
                        <div
                          key={student.id}
                          className="bg-white/5 hover:bg-white/10 rounded-xl p-4 border border-white/10 cursor-pointer transition-all"
                          onClick={() => setSelectedStudent(student)}
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-white font-bold flex-shrink-0">
                              {index + 1}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="text-white font-medium truncate">{student.full_name}</p>
                              <p className="text-xs text-slate-400 truncate">{student.email}</p>
                            </div>

                            <div className="grid grid-cols-4 gap-6 text-center">
                              <div>
                                <p className="text-xs text-slate-500 mb-1">Accuracy</p>
                                <p className="text-lg font-bold text-white">
                                  {student.totalQuestions > 0 ? `${student.accuracy.toFixed(1)}%` : '—'}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 mb-1">Questions</p>
                                <p className="text-lg font-bold text-white">{student.totalQuestions}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 mb-1">Completed</p>
                                <p className="text-lg font-bold text-white">{student.completedCount}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 mb-1">Time</p>
                                <p className="text-lg font-bold text-white">
                                  {Math.floor(student.totalTimeSeconds / 60)}m
                                </p>
                              </div>
                            </div>

                            <Eye className="w-5 h-5 text-slate-400 flex-shrink-0" />
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-center py-8">No students in this class yet</p>
                )}
              </GlassCard>
            </TabsContent>
          </Tabs>
        </motion.div>

        <AnimatePresence>
          {selectedStudent && (
            <StudentStatsModal
              student={selectedStudent}
              assignments={assignments}
              submissions={submissions}
              onClose={() => setSelectedStudent(null)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedAssignment && (
            <AssignmentProgressModal
              assignment={selectedAssignment}
              classStudents={classStudents}
              submissions={submissions}
              topics={topics}
              onClose={() => setSelectedAssignment(null)}
              onViewStudent={(student) => {
                setSelectedAssignment(null);
                setSelectedStudent(student);
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function AssignmentProgressModal({ assignment, classStudents, submissions, topics, onClose, onViewStudent }) {
  const topicName = assignment.custom_topic_name || 
    (assignment.topic_id ? topics.find(t => t.id === assignment.topic_id)?.name : 'No topic');

  const studentProgress = classStudents.map(student => {
    const submission = submissions.find(s => 
      s.assignment_id === assignment.id && s.student_email === student.email
    );

    if (!submission) {
      return {
        ...student,
        status: 'Not started',
        questionsAnswered: 0,
        correctAnswers: 0,
        accuracy: null,
        timeSpent: 0,
        lastActivity: null
      };
    }

    const accuracy = submission.questions_answered > 0 
      ? ((submission.correct_answers / submission.questions_answered) * 100).toFixed(1)
      : 0;

    return {
      ...student,
      status: submission.status || 'In progress',
      questionsAnswered: submission.questions_answered || 0,
      correctAnswers: submission.correct_answers || 0,
      accuracy,
      timeSpent: submission.time_spent_seconds || 0,
      lastActivity: submission.updated_date
    };
  });

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="max-w-5xl w-full max-h-[90vh] overflow-y-auto"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <GlassCard className="p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{assignment.title}</h2>
              <div className="flex items-center gap-4 text-sm text-slate-400">
                <span className="flex items-center gap-1">
                  <ClipboardList className="w-4 h-4" />
                  {topicName}
                </span>
                {assignment.due_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Due: {new Date(assignment.due_date).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>

          <h3 className="text-lg font-bold text-white mb-4">Student Progress</h3>

          <div className="space-y-2">
            {studentProgress
              .sort((a, b) => {
                if (a.status === 'Not started' && b.status !== 'Not started') return 1;
                if (a.status !== 'Not started' && b.status === 'Not started') return -1;
                if (a.accuracy === null && b.accuracy !== null) return 1;
                if (a.accuracy !== null && b.accuracy === null) return -1;
                return (parseFloat(b.accuracy) || 0) - (parseFloat(a.accuracy) || 0);
              })
              .map((student) => (
                <div
                  key={student.id}
                  className="bg-white/5 hover:bg-white/10 rounded-xl p-4 border border-white/10 cursor-pointer transition-all"
                  onClick={() => onViewStudent(student)}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <p className="text-white font-medium">{student.full_name}</p>
                      <p className="text-xs text-slate-400">{student.email}</p>
                    </div>

                    <span className={`text-xs px-2 py-1 rounded-full ${
                      student.status === 'Not started' 
                        ? 'bg-slate-500/20 text-slate-400'
                        : student.status === 'submitted' || student.status === 'graded'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {student.status}
                    </span>

                    <div className="grid grid-cols-4 gap-6 text-center">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Questions</p>
                        <p className="text-lg font-bold text-white">{student.questionsAnswered}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Correct</p>
                        <p className="text-lg font-bold text-white">{student.correctAnswers}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Accuracy</p>
                        <p className="text-lg font-bold text-white">
                          {student.accuracy !== null ? `${student.accuracy}%` : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Time</p>
                        <p className="text-lg font-bold text-white">{formatTime(student.timeSpent)}</p>
                      </div>
                    </div>

                    <Eye className="w-5 h-5 text-slate-400" />
                  </div>

                  {student.lastActivity && (
                    <p className="text-xs text-slate-500 mt-2">
                      Last activity: {new Date(student.lastActivity).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
          </div>

          {studentProgress.length === 0 && (
            <p className="text-slate-400 text-center py-8">No students in this class</p>
          )}
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}