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
  BarChart3, Plus, Trash2, RefreshCw, Save, CheckCircle2, Edit2, Zap
} from 'lucide-react';

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

          <Tabs defaultValue="practice" className="space-y-6">
            <TabsList className="bg-white/5 border border-white/10">
              <TabsTrigger value="practice">Practice Questions</TabsTrigger>
              <TabsTrigger value="live">Live Quizzes</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            {/* Practice Questions Tab */}
            <TabsContent value="practice" className="space-y-6">
              <GlassCard className="p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  AI Generate Practice Questions
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
                    Questions published! Students can now practice.
                  </div>
                )}
              </GlassCard>

              <GlassCard className="p-6">
                <h3 className="text-lg font-bold text-white mb-4">Question Bank ({questionBank.length})</h3>
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
                  <p className="text-slate-400 text-sm">No questions yet. Use AI generator above.</p>
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

            {/* Analytics Tab */}
            <TabsContent value="analytics">
              <GlassCard className="p-6">
                <h3 className="text-lg font-bold text-white mb-4">Class Analytics</h3>
                <p className="text-slate-400 text-sm">Analytics coming soon...</p>
              </GlassCard>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}