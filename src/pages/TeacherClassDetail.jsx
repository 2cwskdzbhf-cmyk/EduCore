import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import GlassCard from '@/components/ui/GlassCard';
import {
  ChevronLeft, Users, Sparkles, Loader2, Trophy, ClipboardList,
  BarChart3, Plus, Trash2, RefreshCw, Save, CheckCircle2, Edit2, Zap,
  Calendar, Clock, Eye, X, AlertTriangle, BookOpen, MessageCircle,
  Wrench, BarChart2, Menu, Copy
} from 'lucide-react';
import ClassMessaging from '@/components/class/ClassMessaging';
import InteractiveWhiteboard from '@/components/whiteboard/InteractiveWhiteboard';
import WhiteboardPermissions from '@/components/whiteboard/WhiteboardPermissions';
import WhiteboardChat from '@/components/whiteboard/WhiteboardChat';
import ClassLessons from '@/components/lessons/ClassLessons';
import ClassPollsTab from '@/components/class/ClassPollsTab';
import StudentStatsModal from '@/components/teacher/StudentStatsModal';
import ClassToolsPanel from '@/components/class/ClassToolsPanel';

const NAV_ITEMS = [
  { id: 'lessons', icon: '📖', label: 'Lessons' },
  { id: 'assignments', icon: '📋', label: 'Active Assignments' },
  { id: 'create', icon: '✏️', label: 'Create Assignment' },
  { id: 'live', icon: '⚡', label: 'Live Quizzes' },
  { id: 'students', icon: '👥', label: 'Students' },
  { id: 'analytics', icon: '📊', label: 'Analytics' },
  { id: 'messaging', icon: '💬', label: 'Messaging' },
  { id: 'polls', icon: '📊', label: 'Polls' },
  { id: 'whiteboard', icon: '✏️', label: 'Whiteboard' },
  { id: 'tools', icon: '🛠', label: 'Useful Tools' },
];

export default function TeacherClassDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const classId = urlParams.get('id');

  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('lessons');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Create assignment state
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedLesson, setSelectedLesson] = useState('');
  const [count, setCount] = useState(15);
  const [difficulty, setDifficulty] = useState('medium');
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [createMode, setCreateMode] = useState('');
  const [liveQuizTitle, setLiveQuizTitle] = useState('');
  const [generatedLiveQuestions, setGeneratedLiveQuestions] = useState([]);
  const [lastGenerateTime, setLastGenerateTime] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Modal state
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [deleteConfirmAssignment, setDeleteConfirmAssignment] = useState(null);
  const [deleteConfirmStudent, setDeleteConfirmStudent] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (cooldownRemaining > 0) {
      const t = setTimeout(() => setCooldownRemaining(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [cooldownRemaining]);

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: classData } = useQuery({
    queryKey: ['class', classId],
    queryFn: async () => { const r = await base44.entities.Class.filter({ id: classId }); return r[0] || null; },
    enabled: !!classId
  });

  const { data: subject } = useQuery({
    queryKey: ['subject', classData?.subject_id],
    queryFn: async () => { const r = await base44.entities.Subject.filter({ id: classData.subject_id }); return r[0] || null; },
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
      if (!classData?.student_emails?.length) return [];
      return base44.entities.User.filter({ email: { $in: classData.student_emails } });
    },
    enabled: !!classData?.student_emails?.length
  });

  const { data: liveQuizSets = [] } = useQuery({
    queryKey: ['liveQuizSets', classId],
    queryFn: () => base44.entities.LiveQuizSet.filter({ class_id: classId }, '-created_date'),
    enabled: !!classId
  });

  const { data: whiteboard } = useQuery({
    queryKey: ['classWhiteboard', classId],
    queryFn: async () => {
      const boards = await base44.entities.LiveSessionWhiteboard.filter({ session_id: classId });
      if (boards.length > 0) return boards[0];
      return base44.entities.LiveSessionWhiteboard.create({
        session_id: classId, teacher_email: user?.email,
        student_edit_permissions: {}, allow_all_edits: false, is_enabled: true
      });
    },
    enabled: !!classId && !!user?.email
  });

  const updateWhiteboardMutation = useMutation({
    mutationFn: async (data) => {
      if (!whiteboard?.id) throw new Error('No whiteboard');
      return base44.entities.LiveSessionWhiteboard.update(whiteboard.id, data);
    },
    onSuccess: () => queryClient.invalidateQueries(['classWhiteboard', classId])
  });

  const generatePracticeMutation = useMutation({
    mutationFn: async ({ regenerateIndex, regenerateFeedback }) => {
      const now = Date.now();
      if (now - lastGenerateTime < 30000) throw new Error(`Wait ${Math.ceil((30000-(now-lastGenerateTime))/1000)}s`);
      setLastGenerateTime(now); setCooldownRemaining(30);
      const r = await base44.functions.invoke('generateQuestionsAI', { lessonId: selectedLesson||null, topicId: selectedTopic, count: regenerateIndex!==null?1:count, difficulty, regenerateIndex, regenerateFeedback });
      return r.data;
    },
    onSuccess: (data, vars) => {
      if (vars.regenerateIndex !== null) {
        const q = [...generatedQuestions]; q[vars.regenerateIndex] = data.questions[0]; setGeneratedQuestions(q);
      } else { setGeneratedQuestions(data.questions || []); }
    },
    onError: () => setCooldownRemaining(0)
  });

  const publishPracticeMutation = useMutation({
    mutationFn: async () => {
      for (const q of generatedQuestions) {
        await base44.entities.QuestionBankItem.create({
          lesson_id: selectedLesson||null, topic_id: selectedTopic, type: q.type||'fraction',
          prompt: q.prompt, correct_answer: q.correct_answer,
          allowed_forms: q.allowed_forms||['fraction','decimal','simplified'],
          difficulty: q.difficulty||difficulty, explanation: q.explanation||'',
          teacher_email: user.email, is_active: true
        });
      }
    },
    onSuccess: () => { queryClient.invalidateQueries(['questionBank']); setGeneratedQuestions([]); }
  });

  const generateLiveMutation = useMutation({
    mutationFn: async () => {
      const now = Date.now();
      if (now - lastGenerateTime < 30000) throw new Error(`Wait ${Math.ceil((30000-(now-lastGenerateTime))/1000)}s`);
      setLastGenerateTime(now); setCooldownRemaining(30);
      const r = await base44.functions.invoke('generateLiveQuizQuestionsAI', { lessonId: selectedLesson||null, topicId: selectedTopic, count, difficulty });
      return r.data;
    },
    onSuccess: (data) => setGeneratedLiveQuestions(data.questions || []),
    onError: () => setCooldownRemaining(0)
  });

  const startLiveQuizMutation = useMutation({
    mutationFn: async () => {
      if (!generatedLiveQuestions.length) throw new Error('No questions');
      const genCode = () => Math.random().toString(36).substr(2,6).toUpperCase();
      let joinCode = genCode();
      for (let i=0; i<10; i++) {
        const ex = await base44.entities.LiveQuizSession.filter({ join_code: joinCode });
        if (!ex.length) break; joinCode = genCode();
      }
      const session = await base44.entities.LiveQuizSession.create({
        class_id: classId, host_email: user.email, status:'lobby',
        current_question_index:-1, player_count:0, join_code:joinCode,
        settings:{ time_per_question:15000, base_points:500, round_multiplier_increment:0.25 }
      });
      await base44.entities.LiveQuizSession.update(session.id, { quiz_set_id:session.id, live_quiz_set_id:session.id });
      const created = [];
      for (let i=0; i<generatedLiveQuestions.length; i++) {
        const q = generatedLiveQuestions[i];
        const c = await base44.entities.LiveQuizQuestion.create({
          session_id:session.id, live_quiz_set_id:session.id, order:i,
          prompt:q.prompt, correct_answer:q.correct_answer,
          allowed_forms:q.allowed_forms||['fraction','decimal'],
          difficulty:q.difficulty||difficulty, explanation:q.explanation||'',
          type:q.type||'fraction', hint:q.hint||''
        });
        created.push(c);
      }
      await base44.entities.LiveQuizSession.update(session.id, { questions:created, current_question_id:created[0]?.id||null });
      return session;
    },
    onSuccess: (s) => navigate(createPageUrl(`TeacherLiveQuizLobby?sessionId=${s.id}`)),
    onError: (e) => alert('Failed: ' + e.message)
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: async (id) => {
      const subs = await base44.entities.AssignmentSubmission.filter({ assignment_id: id });
      for (const s of subs) await base44.entities.AssignmentSubmission.delete(s.id);
      await base44.entities.Assignment.delete(id);
    },
    onSuccess: () => { queryClient.invalidateQueries(['assignments']); queryClient.invalidateQueries(['submissions']); setDeleteConfirmAssignment(null); }
  });

  const removeStudentMutation = useMutation({
    mutationFn: async (email) => {
      const updated = (classData.student_emails||[]).filter(e=>e!==email);
      await base44.entities.Class.update(classId, { student_emails: updated });
    },
    onSuccess: () => { queryClient.invalidateQueries(['class',classId]); queryClient.invalidateQueries(['classStudents']); setDeleteConfirmStudent(null); }
  });

  const copyJoinCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (!classData) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      <div className="flex h-screen">
        {/* Sidebar */}
        <aside className={`
          fixed lg:relative inset-y-0 left-0 z-40 w-64 flex-shrink-0
          bg-slate-950/70 backdrop-blur-xl border-r border-white/10
          flex flex-col transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          {/* Header */}
          <div className="p-4 border-b border-white/10">
            <Link to={createPageUrl('TeacherDashboard')}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4 text-sm">
              <ChevronLeft className="w-4 h-4" /> Dashboard
            </Link>
            <h2 className="text-white font-bold text-base leading-tight truncate">{classData.name}</h2>
            <p className="text-slate-400 text-xs mt-0.5">{subject?.name} · {classData.student_emails?.length || 0} students</p>
            {/* Join code */}
            <button onClick={() => copyJoinCode(classData.join_code)}
              className="mt-2 w-full flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-3 py-2 hover:bg-white/10 transition-colors group">
              <div>
                <p className="text-xs text-slate-500">Join Code</p>
                <p className="text-white font-bold font-mono tracking-wider">{classData.join_code}</p>
              </div>
              {copiedCode ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-500 group-hover:text-white" />}
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setSidebarOpen(false); setCreateMode(''); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                  activeTab === item.id
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {/* Mobile header */}
          <div className="lg:hidden flex items-center gap-3 p-4 border-b border-white/10 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-20">
            <button onClick={() => setSidebarOpen(true)} className="text-slate-400 hover:text-white">
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-white font-semibold truncate">{classData.name}</span>
          </div>

          <div className="p-6 max-w-5xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>

                {/* LESSONS */}
                {activeTab === 'lessons' && user && (
                  <ClassLessons classId={classId} user={user} isTeacher={true} />
                )}

                {/* ACTIVE ASSIGNMENTS */}
                {activeTab === 'assignments' && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-white">Active Assignments</h2>
                    {assignments.length > 0 ? assignments.map(assignment => {
                      const subs = submissions.filter(s => s.assignment_id === assignment.id);
                      const started = subs.filter(s => s.status !== 'not_started').length;
                      const completed = subs.filter(s => ['submitted','graded'].includes(s.status)).length;
                      const totalQ = subs.reduce((s,sub) => s+(sub.questions_answered||0), 0);
                      const totalC = subs.reduce((s,sub) => s+(sub.correct_answers||0), 0);
                      const avgAcc = totalQ > 0 ? ((totalC/totalQ)*100).toFixed(1) : 0;
                      return (
                        <GlassCard key={assignment.id} className="p-5 hover:bg-white/10 transition-all cursor-pointer" onClick={() => setSelectedAssignment(assignment)}>
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-lg font-bold text-white">{assignment.title}</h3>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${assignment.status==='published'?'bg-emerald-500/20 text-emerald-400':'bg-amber-500/20 text-amber-400'}`}>{assignment.status}</span>
                              </div>
                              {assignment.due_date && (
                                <p className="text-slate-400 text-sm flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Due: {new Date(assignment.due_date).toLocaleDateString()}</p>
                              )}
                            </div>
                            <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); setDeleteConfirmAssignment(assignment); }} className="border-red-500/30 text-red-400 hover:bg-red-500/10 ml-2">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/10 text-center">
                            <div><p className="text-xs text-slate-400 mb-1">Started</p><p className="text-xl font-bold text-white">{started}</p><p className="text-xs text-slate-500">of {classData.student_emails?.length||0}</p></div>
                            <div><p className="text-xs text-slate-400 mb-1">Completed</p><p className="text-xl font-bold text-white">{completed}</p></div>
                            <div><p className="text-xs text-slate-400 mb-1">Avg Accuracy</p><p className={`text-xl font-bold ${parseFloat(avgAcc)>=80?'text-emerald-400':parseFloat(avgAcc)>=60?'text-amber-400':'text-red-400'}`}>{avgAcc}%</p></div>
                          </div>
                        </GlassCard>
                      );
                    }) : (
                      <GlassCard className="p-12 text-center">
                        <ClipboardList className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                        <p className="text-slate-400">No assignments yet. Use Create Assignment to add one.</p>
                      </GlassCard>
                    )}
                  </div>
                )}

                {/* CREATE ASSIGNMENT */}
                {activeTab === 'create' && (
                  <div className="space-y-4">
                    {!createMode && (
                      <>
                        <h2 className="text-2xl font-bold text-white">Create Assignment</h2>
                        <div className="grid md:grid-cols-2 gap-4">
                          <motion.div whileHover={{ scale: 1.02 }} onClick={() => setCreateMode('manual')}
                            className="relative overflow-hidden rounded-2xl border-2 border-blue-500/40 bg-gradient-to-br from-blue-900/40 to-cyan-900/30 p-7 cursor-pointer hover:border-blue-400/70 transition-all group">
                            <div className="w-12 h-12 mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center"><Edit2 className="w-6 h-6 text-white" /></div>
                            <h4 className="text-xl font-bold text-white mb-1">Manual Create</h4>
                            <p className="text-sm text-blue-200/70">Build from scratch or use your question library.</p>
                          </motion.div>
                          <motion.div whileHover={{ scale: 1.02 }} onClick={() => setCreateMode('ai')}
                            className="relative overflow-hidden rounded-2xl border-2 border-purple-500/50 bg-gradient-to-br from-purple-900/50 to-pink-900/30 p-7 cursor-pointer hover:border-purple-400/80 transition-all group">
                            <div className="w-12 h-12 mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"><Sparkles className="w-6 h-6 text-white" /></div>
                            <div className="flex items-center gap-2 mb-1"><h4 className="text-xl font-bold text-white">AI Generate</h4><span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/30">Recommended</span></div>
                            <p className="text-sm text-purple-200/70">AI creates questions in seconds based on topic & difficulty.</p>
                          </motion.div>
                        </div>
                      </>
                    )}

                    {createMode === 'manual' && (
                      <div className="space-y-4">
                        <button onClick={() => setCreateMode('')} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm"><ChevronLeft className="w-4 h-4" /> Back</button>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div onClick={() => navigate(createPageUrl(`AssignmentBuilder?classId=${classId}`))} className="cursor-pointer rounded-2xl border border-emerald-500/30 bg-emerald-900/20 hover:bg-emerald-900/40 p-6 transition-all">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-3"><Plus className="w-5 h-5 text-white" /></div>
                            <h4 className="text-white font-semibold mb-1">Create from Scratch</h4>
                            <p className="text-sm text-emerald-200/60">Write questions, add rubrics, attach resources.</p>
                          </div>
                          <div onClick={() => navigate(createPageUrl('QuizLibrary'))} className="cursor-pointer rounded-2xl border border-blue-500/30 bg-blue-900/20 hover:bg-blue-900/40 p-6 transition-all">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-3"><BookOpen className="w-5 h-5 text-white" /></div>
                            <h4 className="text-white font-semibold mb-1">From Quiz Library</h4>
                            <p className="text-sm text-blue-200/60">Browse and reuse existing quizzes.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {createMode === 'ai' && (
                      <GlassCard className="p-6 space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                          <button onClick={() => setCreateMode('')} className="text-slate-400 hover:text-white"><ChevronLeft className="w-5 h-5" /></button>
                          <h3 className="text-lg font-semibold text-white flex items-center gap-2"><Sparkles className="w-5 h-5 text-purple-400" /> AI Generate Assignment</h3>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-white mb-1">Topic *</Label>
                            <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                              <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue placeholder="Select topic" /></SelectTrigger>
                              <SelectContent>{topics.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-white mb-1">Questions</Label>
                            <Input type="number" value={count} onChange={e => setCount(parseInt(e.target.value)||15)} min={1} max={30} className="bg-white/5 border-white/10 text-white" />
                          </div>
                          <div>
                            <Label className="text-white mb-1">Difficulty</Label>
                            <Select value={difficulty} onValueChange={setDifficulty}>
                              <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                              <SelectContent><SelectItem value="easy">Easy</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="hard">Hard</SelectItem></SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Button onClick={() => generatePracticeMutation.mutate({ regenerateIndex:null, regenerateFeedback:'' })}
                          disabled={!selectedTopic||generatePracticeMutation.isPending||cooldownRemaining>0}
                          className="w-full bg-gradient-to-r from-purple-500 to-blue-500">
                          {generatePracticeMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/>Generating...</> : cooldownRemaining>0 ? `Wait ${cooldownRemaining}s...` : <><Sparkles className="w-4 h-4 mr-2"/>Generate Questions</>}
                        </Button>
                        {generatedQuestions.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-white font-semibold">Preview ({generatedQuestions.length})</p>
                              <Button onClick={() => publishPracticeMutation.mutate()} disabled={publishPracticeMutation.isPending} size="sm" className="bg-emerald-500">
                                {publishPracticeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : <><Save className="w-4 h-4 mr-1"/>Publish</>}
                              </Button>
                            </div>
                            {generatedQuestions.map((q,idx) => (
                              <GlassCard key={idx} className="p-4">
                                {editingIndex===idx ? (
                                  <div className="space-y-2">
                                    <Textarea value={editingQuestion.prompt} onChange={e => setEditingQuestion({...editingQuestion,prompt:e.target.value})} className="bg-white/5 border-white/10 text-white"/>
                                    <Input value={editingQuestion.correct_answer} onChange={e => setEditingQuestion({...editingQuestion,correct_answer:e.target.value})} className="bg-white/5 border-white/10 text-white"/>
                                    <div className="flex gap-2">
                                      <Button onClick={() => { const n=[...generatedQuestions];n[idx]=editingQuestion;setGeneratedQuestions(n);setEditingIndex(null); }} size="sm" className="bg-emerald-500">Save</Button>
                                      <Button onClick={() => setEditingIndex(null)} size="sm" variant="outline" className="border-white/20 text-white">Cancel</Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex justify-between items-start gap-3">
                                    <div><p className="text-white font-medium">{q.prompt}</p><p className="text-emerald-400 text-sm">Answer: {q.correct_answer}</p></div>
                                    <div className="flex gap-1 flex-shrink-0">
                                      <Button size="sm" variant="ghost" onClick={() => {setEditingIndex(idx);setEditingQuestion({...q});}} className="text-blue-400"><Edit2 className="w-4 h-4"/></Button>
                                      <Button size="sm" variant="ghost" onClick={() => generatePracticeMutation.mutate({regenerateIndex:idx,regenerateFeedback:''})} className="text-purple-400"><RefreshCw className="w-4 h-4"/></Button>
                                      <Button size="sm" variant="ghost" onClick={() => setGeneratedQuestions(generatedQuestions.filter((_,i)=>i!==idx))} className="text-red-400"><Trash2 className="w-4 h-4"/></Button>
                                    </div>
                                  </div>
                                )}
                              </GlassCard>
                            ))}
                          </div>
                        )}
                      </GlassCard>
                    )}
                  </div>
                )}

                {/* LIVE QUIZZES */}
                {activeTab === 'live' && (
                  <div className="space-y-4">
                    {!createMode && (
                      <>
                        <h2 className="text-2xl font-bold text-white">Live Quizzes</h2>
                        <div className="grid md:grid-cols-2 gap-4">
                          <motion.div whileHover={{ scale: 1.02 }} onClick={() => setCreateMode('manual')}
                            className="rounded-2xl border-2 border-teal-500/40 bg-gradient-to-br from-teal-900/40 to-emerald-900/30 p-7 cursor-pointer hover:border-teal-400/70 transition-all">
                            <div className="w-12 h-12 mb-4 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center"><Edit2 className="w-6 h-6 text-white" /></div>
                            <h4 className="text-xl font-bold text-white mb-1">Manual Quiz</h4>
                            <p className="text-sm text-teal-200/70">Create or launch from your quiz library.</p>
                          </motion.div>
                          <motion.div whileHover={{ scale: 1.02 }} onClick={() => setCreateMode('ai')}
                            className="rounded-2xl border-2 border-amber-500/50 bg-gradient-to-br from-amber-900/40 to-orange-900/30 p-7 cursor-pointer hover:border-amber-400/80 transition-all">
                            <div className="w-12 h-12 mb-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center"><Sparkles className="w-6 h-6 text-white" /></div>
                            <div className="flex items-center gap-2 mb-1"><h4 className="text-xl font-bold text-white">AI Live Quiz</h4><span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200 border border-amber-400/30">Fastest</span></div>
                            <p className="text-sm text-amber-200/70">AI generates a quiz in seconds, then launch instantly.</p>
                          </motion.div>
                        </div>
                        <GlassCard className="p-5">
                          <h3 className="text-lg font-bold text-white mb-3">Saved Quiz Sets ({liveQuizSets.length})</h3>
                          {liveQuizSets.length > 0 ? (
                            <div className="space-y-2">
                              {liveQuizSets.map(set => (
                                <div key={set.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                                  <div><p className="text-white font-medium">{set.title}</p><p className="text-slate-400 text-sm">{set.question_count} questions · {set.difficulty}</p></div>
                                  <Button size="sm" className="bg-amber-500" onClick={() => navigate(createPageUrl(`StartLiveQuiz?setId=${set.id}&classId=${classId}`))}>Start</Button>
                                </div>
                              ))}
                            </div>
                          ) : <p className="text-slate-400 text-sm">No saved quiz sets yet.</p>}
                        </GlassCard>
                      </>
                    )}

                    {createMode === 'manual' && (
                      <div className="space-y-4">
                        <button onClick={() => setCreateMode('')} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm"><ChevronLeft className="w-4 h-4"/> Back</button>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div onClick={() => navigate(createPageUrl(`AssignmentBuilder?classId=${classId}&mode=live`))} className="cursor-pointer rounded-2xl border border-teal-500/30 bg-teal-900/20 hover:bg-teal-900/40 p-6 transition-all">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center mb-3"><Plus className="w-5 h-5 text-white"/></div>
                            <h4 className="text-white font-semibold mb-1">Create Quiz from Scratch</h4>
                            <p className="text-sm text-teal-200/60">Build questions and launch live immediately.</p>
                          </div>
                          <div onClick={() => navigate(createPageUrl('QuizLibrary'))} className="cursor-pointer rounded-2xl border border-emerald-500/30 bg-emerald-900/20 hover:bg-emerald-900/40 p-6 transition-all">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center mb-3"><BookOpen className="w-5 h-5 text-white"/></div>
                            <h4 className="text-white font-semibold mb-1">From Quiz Library</h4>
                            <p className="text-sm text-emerald-200/60">Launch an existing quiz as a live session.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {createMode === 'ai' && (
                      <GlassCard className="p-6 space-y-4">
                        <div className="flex items-center gap-3">
                          <button onClick={() => setCreateMode('')} className="text-slate-400 hover:text-white"><ChevronLeft className="w-5 h-5"/></button>
                          <h3 className="text-lg font-semibold text-white flex items-center gap-2"><Zap className="w-5 h-5 text-amber-400"/>AI Generate Live Quiz</h3>
                        </div>
                        <div>
                          <Label className="text-white mb-1">Quiz Title *</Label>
                          <Input placeholder="e.g. Fractions Practice" value={liveQuizTitle} onChange={e => setLiveQuizTitle(e.target.value)} className="bg-white/5 border-white/10 text-white"/>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-white mb-1">Topic *</Label>
                            <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                              <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue placeholder="Select topic"/></SelectTrigger>
                              <SelectContent>{topics.map(t=><SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-white mb-1">Questions</Label>
                            <Input type="number" value={count} onChange={e=>setCount(parseInt(e.target.value)||10)} min={5} max={20} className="bg-white/5 border-white/10 text-white"/>
                          </div>
                          <div>
                            <Label className="text-white mb-1">Difficulty</Label>
                            <Select value={difficulty} onValueChange={setDifficulty}>
                              <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue/></SelectTrigger>
                              <SelectContent><SelectItem value="easy">Easy</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="hard">Hard</SelectItem></SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Button onClick={() => generateLiveMutation.mutate()} disabled={!selectedTopic||!liveQuizTitle||generateLiveMutation.isPending||cooldownRemaining>0} className="w-full bg-gradient-to-r from-amber-500 to-orange-500">
                          {generateLiveMutation.isPending?<><Loader2 className="w-4 h-4 mr-2 animate-spin"/>Generating...</>:cooldownRemaining>0?`Wait ${cooldownRemaining}s...`:<><Sparkles className="w-4 h-4 mr-2"/>Generate Questions</>}
                        </Button>
                        {generatedLiveQuestions.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-white font-semibold">Preview ({generatedLiveQuestions.length} questions)</p>
                              <Button onClick={() => startLiveQuizMutation.mutate()} disabled={startLiveQuizMutation.isPending} className="bg-gradient-to-r from-amber-500 to-orange-500">
                                {startLiveQuizMutation.isPending?<><Loader2 className="w-4 h-4 mr-2 animate-spin"/>Starting...</>:<><Zap className="w-4 h-4 mr-2"/>Launch Quiz</>}
                              </Button>
                            </div>
                            {generatedLiveQuestions.map((q,idx)=>(
                              <GlassCard key={idx} className="p-3">
                                <p className="text-white text-sm">Q{idx+1}: {q.prompt}</p>
                                <p className="text-emerald-400 text-xs">Answer: {q.correct_answer}</p>
                              </GlassCard>
                            ))}
                          </div>
                        )}
                      </GlassCard>
                    )}
                  </div>
                )}

                {/* STUDENTS */}
                {activeTab === 'students' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold text-white">Students</h2>
                      <span className="text-slate-400 text-sm">{classData.student_emails?.length||0} enrolled</span>
                    </div>
                    {classStudents.length > 0 ? (
                      <div className="space-y-2">
                        {classStudents.map(student => (
                          <motion.div key={student.id} initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }}
                            className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                                {(student.full_name||student.email).charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-white font-medium">{student.full_name || student.email.split('@')[0]}</p>
                                <p className="text-xs text-slate-400">{student.email}</p>
                                {student.year_group && <p className="text-xs text-slate-500">Year {student.year_group}</p>}
                              </div>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => setDeleteConfirmStudent(student)} className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                              <Trash2 className="w-3.5 h-3.5 mr-1.5"/> Remove
                            </Button>
                          </motion.div>
                        ))}
                      </div>
                    ) : classData.student_emails?.length > 0 ? (
                      <GlassCard className="p-8 text-center">
                        <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-3"/>
                        <p className="text-slate-400">Loading student profiles...</p>
                        <p className="text-slate-500 text-sm mt-1">{classData.student_emails.length} students enrolled (emails: {classData.student_emails.slice(0,2).join(', ')}{classData.student_emails.length>2?'...':''})</p>
                      </GlassCard>
                    ) : (
                      <GlassCard className="p-12 text-center">
                        <Users className="w-12 h-12 text-slate-600 mx-auto mb-4"/>
                        <p className="text-slate-400 mb-2">No students yet</p>
                        <p className="text-slate-500 text-sm">Share the join code <span className="text-white font-bold font-mono">{classData.join_code}</span> for students to enroll.</p>
                      </GlassCard>
                    )}
                  </div>
                )}

                {/* ANALYTICS / LEADERBOARD */}
                {activeTab === 'analytics' && (
                  <ClassLeaderboard classData={classData} submissions={submissions} onSelectStudent={setSelectedStudent} />
                )}

                {/* MESSAGING */}
                {activeTab === 'messaging' && user && (
                  <ClassMessaging classId={classId} user={user} classData={classData} />
                )}

                {/* POLLS */}
                {activeTab === 'polls' && user && (
                  <ClassPollsTab classId={classId} user={user} isTeacher={true} />
                )}

                {/* WHITEBOARD */}
                {activeTab === 'whiteboard' && (
                  <div className="grid lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                      {whiteboard && user && (
                        <InteractiveWhiteboard whiteboard={whiteboard} canEdit={true} isTeacher={true} whiteboardId={whiteboard.id} />
                      )}
                    </div>
                    <div className="flex flex-col gap-4">
                      {user && <WhiteboardChat classId={classId} user={user} />}
                      {whiteboard && (
                        <WhiteboardPermissions
                          students={classStudents}
                          showToAll={whiteboard.show_to_students ?? true}
                          onToggleShowToAll={val => updateWhiteboardMutation.mutate({ show_to_students: val })}
                          studentVisibility={whiteboard.student_visibility || {}}
                          onStudentVisibilityChange={(email, visible) => updateWhiteboardMutation.mutate({ student_visibility: { ...(whiteboard.student_visibility||{}), [email]: visible } })}
                          studentEdit={whiteboard.student_edit_permissions || {}}
                          onStudentEditChange={(email, allowed) => updateWhiteboardMutation.mutate({ student_edit_permissions: { ...(whiteboard.student_edit_permissions||{}), [email]: allowed } })}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* TOOLS */}
                {activeTab === 'tools' && (
                  <ClassToolsPanel students={classStudents} onClose={() => setActiveTab('lessons')} inline />
                )}

              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {selectedStudent && <StudentStatsModal student={selectedStudent} assignments={assignments} submissions={submissions} onClose={() => setSelectedStudent(null)} />}
      </AnimatePresence>

      <AnimatePresence>
        {selectedAssignment && (
          <AssignmentProgressModal
            assignment={selectedAssignment}
            classStudents={classStudents}
            submissions={submissions}
            topics={topics}
            onClose={() => setSelectedAssignment(null)}
            onViewStudent={s => { setSelectedAssignment(null); setSelectedStudent(s); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirmStudent && (
          <ConfirmModal
            title="Remove Student?"
            description={`Remove ${deleteConfirmStudent.full_name||deleteConfirmStudent.email} from this class?`}
            danger="They will lose access to class materials."
            loading={removeStudentMutation.isPending}
            onConfirm={() => removeStudentMutation.mutate(deleteConfirmStudent.email)}
            onCancel={() => setDeleteConfirmStudent(null)}
            confirmLabel="Remove Student"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirmAssignment && (
          <ConfirmModal
            title="Delete Assignment?"
            description={`Delete "${deleteConfirmAssignment.title}"?`}
            danger="This removes all student submission data permanently."
            loading={deleteAssignmentMutation.isPending}
            onConfirm={() => deleteAssignmentMutation.mutate(deleteConfirmAssignment.id)}
            onCancel={() => setDeleteConfirmAssignment(null)}
            confirmLabel="Delete Assignment"
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ConfirmModal({ title, description, danger, loading, onConfirm, onCancel, confirmLabel }) {
  return (
    <motion.div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !loading && onCancel()}>
      <motion.div className="max-w-md w-full" initial={{ scale:0.9,y:20 }} animate={{ scale:1,y:0 }} exit={{ scale:0.9,y:20 }} onClick={e=>e.stopPropagation()}>
        <GlassCard className="p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0"><AlertTriangle className="w-6 h-6 text-red-400"/></div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">{title}</h3>
              <p className="text-slate-400 text-sm">{description}</p>
              {danger && <p className="text-red-400 text-sm mt-1">{danger}</p>}
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onCancel} disabled={loading} className="border-white/20 text-white hover:bg-white/10">Cancel</Button>
            <Button onClick={onConfirm} disabled={loading} className="bg-gradient-to-r from-red-500 to-red-600 text-white">
              {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"/>Processing...</> : confirmLabel}
            </Button>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}

function ClassLeaderboard({ classData, submissions, onSelectStudent }) {
  const studentEmails = classData?.student_emails || [];

  const { data: progressList = [], isLoading } = useQuery({
    queryKey: ['classStudentProgress', classData?.id],
    queryFn: async () => {
      if (!studentEmails.length) return [];
      const all = await base44.entities.StudentProgress.list();
      return all.filter(p => studentEmails.includes(p.student_email));
    },
    enabled: studentEmails.length > 0,
    refetchInterval: 15000,
  });

  if (!studentEmails.length) return (
    <GlassCard className="p-12 text-center">
      <Users className="w-12 h-12 text-slate-600 mx-auto mb-4"/><p className="text-slate-400">No students enrolled yet</p>
    </GlassCard>
  );

  const leaderboard = studentEmails.map(email => {
    const subs = submissions.filter(s => s.student_email === email);
    const progress = progressList.find(p => p.student_email === email);
    const totalQ = subs.reduce((s,sub) => s+(sub.questions_answered||0), 0);
    const totalC = subs.reduce((s,sub) => s+(sub.correct_answers||0), 0);
    const incorrect = totalQ - totalC;
    const accuracy = totalQ > 0 ? (totalC/totalQ)*100 : 0;
    const completed = subs.filter(s => ['submitted','graded'].includes(s.status)).length;
    const streak = progress?.current_streak || 0;
    const displayName = progress?.student_email?.split('@')[0] || email.split('@')[0];
    return { email, displayName, accuracy, totalQ, totalC, incorrect, completed, streak, progress };
  }).sort((a,b) => {
    if (a.totalQ===0 && b.totalQ>0) return 1;
    if (a.totalQ>0 && b.totalQ===0) return -1;
    return b.accuracy - a.accuracy;
  });

  const medalEmojis = ['🥇','🥈','🥉'];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Trophy className="w-6 h-6 text-amber-400"/> Class Analytics & Leaderboard</h2>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <GlassCard className="p-4 text-center">
          <p className="text-2xl font-bold text-white">{studentEmails.length}</p>
          <p className="text-slate-400 text-xs">Students</p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">
            {leaderboard.filter(s=>s.totalQ>0).length > 0
              ? (leaderboard.filter(s=>s.totalQ>0).reduce((s,l)=>s+l.accuracy,0)/leaderboard.filter(s=>s.totalQ>0).length).toFixed(1)
              : 0}%
          </p>
          <p className="text-slate-400 text-xs">Class Avg</p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">{leaderboard.reduce((s,l)=>s+l.totalQ,0)}</p>
          <p className="text-slate-400 text-xs">Questions Answered</p>
        </GlassCard>
      </div>

      <GlassCard className="p-5">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-400"/>Leaderboard</h3>
        <div className="space-y-2">
          {leaderboard.map((student, index) => (
            <motion.div key={student.email}
              initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} transition={{ delay: index*0.03 }}
              className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] transition-all cursor-pointer group"
              onClick={() => onSelectStudent({ email:student.email, full_name:student.displayName, ...student.progress })}>
              {/* Rank */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                index===0?'bg-gradient-to-br from-amber-400 to-yellow-500 text-white':
                index===1?'bg-gradient-to-br from-slate-300 to-slate-400 text-slate-800':
                index===2?'bg-gradient-to-br from-amber-600 to-orange-700 text-white':
                'bg-white/10 text-slate-400'}`}>
                {index<3?medalEmojis[index]:index+1}
              </div>
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {student.displayName.charAt(0).toUpperCase()}
              </div>
              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate text-sm">{student.displayName}</p>
                <p className="text-xs text-slate-500 truncate">{student.email}</p>
              </div>
              {/* Stats */}
              {student.totalQ > 0 ? (
                <div className="flex items-center gap-4 text-center">
                  <div>
                    <p className="text-xs text-slate-400">Accuracy</p>
                    <p className={`text-sm font-bold ${student.accuracy>=80?'text-emerald-400':student.accuracy>=60?'text-amber-400':'text-red-400'}`}>{student.accuracy.toFixed(1)}%</p>
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-xs text-slate-400">Correct</p>
                    <p className="text-sm font-bold text-emerald-400">{student.totalC}</p>
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-xs text-slate-400">Wrong</p>
                    <p className="text-sm font-bold text-red-400">{student.incorrect}</p>
                  </div>
                  <div className="hidden md:block">
                    <p className="text-xs text-slate-400">Total Qs</p>
                    <p className="text-sm font-bold text-white">{student.totalQ}</p>
                  </div>
                  <div className="w-16 hidden lg:block">
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${student.accuracy>=80?'bg-emerald-400':student.accuracy>=60?'bg-amber-400':'bg-red-400'}`} style={{ width:`${Math.min(100,student.accuracy)}%` }}/>
                    </div>
                  </div>
                </div>
              ) : <p className="text-xs text-slate-500 italic">No activity</p>}
              <Eye className="w-4 h-4 text-slate-600 group-hover:text-slate-400 flex-shrink-0"/>
            </motion.div>
          ))}
        </div>
        {isLoading && <p className="text-slate-500 text-sm text-center mt-4">Loading progress data…</p>}
      </GlassCard>
    </div>
  );
}

function formatTime(seconds) {
  if (!seconds) return '0s';
  const m = Math.floor(seconds/60), s = seconds%60;
  return m>0 ? (s>0?`${m}m ${s}s`:`${m}m`) : `${s}s`;
}

function AssignmentProgressModal({ assignment, classStudents, submissions, topics, onClose, onViewStudent }) {
  const topicName = assignment.custom_topic_name || (assignment.topic_id ? topics.find(t=>t.id===assignment.topic_id)?.name : 'No topic');
  const studentProgress = classStudents.map(student => {
    const sub = submissions.find(s => s.assignment_id===assignment.id && s.student_email===student.email);
    if (!sub) return { ...student, status:'Not started', questionsAnswered:0, correctAnswers:0, accuracy:null, timeSpent:0, lastActivity:null };
    const acc = sub.questions_answered>0 ? ((sub.correct_answers/sub.questions_answered)*100).toFixed(1) : 0;
    return { ...student, status:sub.status||'In progress', questionsAnswered:sub.questions_answered||0, correctAnswers:sub.correct_answers||0, accuracy:acc, timeSpent:sub.time_spent_seconds||0, lastActivity:sub.updated_date };
  }).sort((a,b) => {
    if (a.status==='Not started'&&b.status!=='Not started') return 1;
    if (a.status!=='Not started'&&b.status==='Not started') return -1;
    return (parseFloat(b.accuracy)||0)-(parseFloat(a.accuracy)||0);
  });

  return (
    <motion.div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6"
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={onClose}>
      <motion.div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto" initial={{ scale:0.9,y:20 }} animate={{ scale:1,y:0 }} exit={{ scale:0.9,y:20 }} onClick={e=>e.stopPropagation()}>
        <GlassCard className="p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">{assignment.title}</h2>
              <p className="text-slate-400 text-sm">{topicName}{assignment.due_date&&` · Due: ${new Date(assignment.due_date).toLocaleDateString()}`}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></Button>
          </div>
          <div className="space-y-2">
            {studentProgress.map(student => (
              <div key={student.id||student.email} className="bg-white/5 hover:bg-white/10 rounded-xl p-4 border border-white/10 cursor-pointer transition-all" onClick={() => onViewStudent(student)}>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-white font-medium">{student.full_name}</p>
                    <p className="text-xs text-slate-400">{student.email}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${student.status==='Not started'?'bg-slate-500/20 text-slate-400':['submitted','graded'].includes(student.status)?'bg-emerald-500/20 text-emerald-400':'bg-blue-500/20 text-blue-400'}`}>{student.status}</span>
                  <div className="flex gap-6 text-center">
                    <div><p className="text-xs text-slate-400">Qs</p><p className="text-lg font-bold text-white">{student.questionsAnswered}</p></div>
                    <div><p className="text-xs text-slate-400">Correct</p><p className="text-lg font-bold text-emerald-400">{student.correctAnswers}</p></div>
                    <div><p className="text-xs text-slate-400">Accuracy</p><p className="text-lg font-bold text-white">{student.accuracy!==null?`${student.accuracy}%`:'—'}</p></div>
                  </div>
                  <Eye className="w-4 h-4 text-slate-400"/>
                </div>
              </div>
            ))}
            {studentProgress.length===0 && <p className="text-slate-400 text-center py-8">No students enrolled</p>}
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}