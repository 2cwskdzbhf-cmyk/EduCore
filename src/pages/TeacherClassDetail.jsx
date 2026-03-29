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
  Calendar, Clock, Target, TrendingUp, Eye, X, AlertTriangle, BookOpen, MessageCircle
} from 'lucide-react';
import ClassMessaging from '@/components/class/ClassMessaging';
import InteractiveWhiteboard from '@/components/whiteboard/InteractiveWhiteboard';
import WhiteboardPermissions from '@/components/whiteboard/WhiteboardPermissions';
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
  const [deleteConfirmAssignment, setDeleteConfirmAssignment] = useState(null);
  const [deleteConfirmStudent, setDeleteConfirmStudent] = useState(null);
  const [createMode, setCreateMode] = useState(''); // 'manual' or 'ai'
  const [whiteboardPerms, setWhiteboardPerms] = useState({});

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
      if (!classData?.student_emails || classData.student_emails.length === 0) {
        console.log('[DEBUG] No student emails in classData');
        return [];
      }
      
      console.log('[DEBUG] Fetching students for class:', classId);
      console.log('[DEBUG] Student emails:', classData.student_emails);
      
      const students = await base44.entities.User.filter({ 
        email: { $in: classData.student_emails } 
      });
      
      console.log('[DEBUG] Students fetched:', students.length);
      console.log('[DEBUG] Student roles:', students.map(s => ({ email: s.email, role: s.role, user_type: s.user_type })));
      
      return students;
    },
    enabled: !!classData?.student_emails && classData.student_emails.length > 0
  });

  const { data: whiteboard } = useQuery({
    queryKey: ['classWhiteboard', classId],
    queryFn: async () => {
      if (!classId) return null;
      const boards = await base44.entities.LiveSessionWhiteboard.filter({ session_id: classId });
      if (boards.length > 0) return boards[0];
      
      // Create new whiteboard if it doesn't exist
      return base44.entities.LiveSessionWhiteboard.create({
        session_id: classId,
        teacher_email: user?.email,
        student_edit_permissions: {},
        allow_all_edits: false,
        is_enabled: true
      });
    },
    enabled: !!classId && !!user?.email
  });

  const updateWhiteboardMutation = useMutation({
    mutationFn: async (data) => {
      if (!whiteboard?.id) throw new Error('Whiteboard not found');
      return base44.entities.LiveSessionWhiteboard.update(whiteboard.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['classWhiteboard', classId]);
    }
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

  const startLiveQuizMutation = useMutation({
    mutationFn: async () => {
      console.log('[DEBUG] Starting live quiz with', generatedLiveQuestions.length, 'questions');
      
      // Validate questions
      if (generatedLiveQuestions.length === 0) {
        throw new Error('No questions to start quiz with');
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
        live_quiz_set_id: 'temp-' + Date.now(), // temporary placeholder
        status: 'lobby',
        current_question_index: -1,
        player_count: 0,
        join_code: joinCode,
        settings: {
          time_per_question: 15000,
          base_points: 500,
          round_multiplier_increment: 0.25
        }
      });

      console.log('[DEBUG] Session created:', session.id);

      // Create questions linked to session
      for (let i = 0; i < generatedLiveQuestions.length; i++) {
        const q = generatedLiveQuestions[i];
        await base44.entities.LiveQuizQuestion.create({
          live_quiz_set_id: session.id, // Link to session instead of quiz set
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

      console.log('[DEBUG] Created', generatedLiveQuestions.length, 'questions for session');

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

  const deleteAssignmentMutation = useMutation({
    mutationFn: async (assignmentId) => {
      // Delete all submissions for this assignment
      const assignmentSubmissions = await base44.entities.AssignmentSubmission.filter({ 
        assignment_id: assignmentId 
      });
      
      for (const submission of assignmentSubmissions) {
        await base44.entities.AssignmentSubmission.delete(submission.id);
      }

      // Delete the assignment itself
      await base44.entities.Assignment.delete(assignmentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['assignments']);
      queryClient.invalidateQueries(['submissions']);
      setDeleteConfirmAssignment(null);
    },
    onError: (error) => {
      console.error('Failed to delete assignment:', error);
      alert('Failed to delete assignment. Please try again.');
    }
  });

  const removeStudentMutation = useMutation({
    mutationFn: async (studentEmail) => {
      const updated = (classData.student_emails || []).filter(e => e !== studentEmail);
      await base44.entities.Class.update(classId, { student_emails: updated });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['class', classId]);
      queryClient.invalidateQueries(['classStudents']);
      setDeleteConfirmStudent(null);
    },
    onError: (error) => {
      console.error('Failed to remove student:', error);
      alert('Failed to remove student. Please try again.');
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
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300 mb-3">
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {classData.student_emails?.length || 0} students
              </span>
              <span>{subject?.name}</span>
            </div>
            
            <div className="inline-flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 backdrop-blur-sm">
              <div>
                <p className="text-xs text-slate-500 mb-1 uppercase tracking-widest">Class Join Code</p>
                <p className="text-3xl font-bold text-white font-mono tracking-[0.2em]">{classData.join_code}</p>
              </div>
              <Button
                size="sm"
                onClick={() => copyJoinCode(classData.join_code)}
                className={`transition-all duration-300 ${copiedCode
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                  : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-lg shadow-purple-500/30'
                }`}
              >
                {copiedCode ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    Copied!
                  </>
                ) : (
                  'Copy Code'
                )}
              </Button>
            </div>
          </div>

          <Tabs defaultValue="setAssignments" className="space-y-6">
            <TabsList className="bg-white/5 border border-white/10 h-auto p-1 flex flex-wrap gap-1 justify-start w-full">
              <TabsTrigger value="setAssignments" className="text-slate-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-500 data-[state=active]:text-white">
                📋 Active Assignments
              </TabsTrigger>
              <TabsTrigger value="practice" className="text-slate-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-500 data-[state=active]:text-white">
                ✏️ Create Assignment
              </TabsTrigger>
              <TabsTrigger value="live" className="text-slate-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-500 data-[state=active]:text-white">
                ⚡ Live Quizzes
              </TabsTrigger>
              <TabsTrigger value="students" className="text-slate-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-500 data-[state=active]:text-white">
                👥 Students
              </TabsTrigger>
              <TabsTrigger value="analytics" className="text-slate-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-500 data-[state=active]:text-white">
                📊 Analytics
              </TabsTrigger>
              <TabsTrigger value="messaging" className="text-slate-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-500 data-[state=active]:text-white">
                💬 Messaging
              </TabsTrigger>
              <TabsTrigger value="whiteboard" className="text-slate-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-500 data-[state=active]:text-white">
                ✏️ Whiteboard
              </TabsTrigger>
            </TabsList>

            {/* Create Tab */}
            <TabsContent value="practice" className="space-y-6">
              {!createMode && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <ClipboardList className="w-5 h-5 text-blue-400" />
                    <h3 className="text-lg font-semibold text-white">Create Assignment</h3>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Manual - clean blue card */}
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="cursor-pointer"
                      onClick={() => setCreateMode('manual')}
                    >
                      <div className="relative overflow-hidden rounded-2xl border-2 border-blue-500/40 bg-gradient-to-br from-blue-900/40 to-cyan-900/30 p-7 hover:border-blue-400/70 hover:from-blue-900/60 transition-all duration-200 group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="w-14 h-14 mb-5 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/40">
                          <Edit2 className="w-7 h-7 text-white" />
                        </div>
                        <h4 className="text-xl font-bold text-white mb-1">Manual Create</h4>
                        <p className="text-sm text-blue-200/70 mb-5 leading-relaxed">Build an assignment from scratch or pull from your question library.</p>
                        <div className="flex flex-col gap-2 text-xs text-blue-200/60">
                          <span className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> Full control over every question</span>
                          <span className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> Pick from your question library</span>
                          <span className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> Add resources, rubrics & instructions</span>
                        </div>
                        <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-300 group-hover:text-blue-200 transition-colors">
                          Get started <ChevronLeft className="w-4 h-4 rotate-180" />
                        </div>
                      </div>
                    </motion.div>

                    {/* AI Generate - purple glowing card */}
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="cursor-pointer"
                      onClick={() => setCreateMode('ai')}
                    >
                      <div className="relative overflow-hidden rounded-2xl border-2 border-purple-500/50 bg-gradient-to-br from-purple-900/50 to-pink-900/30 p-7 hover:border-purple-400/80 hover:from-purple-900/70 transition-all duration-200 group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="absolute bottom-2 right-2 text-5xl opacity-10 select-none">✨</div>
                        <div className="w-14 h-14 mb-5 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/50">
                          <Sparkles className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-xl font-bold text-white">AI Generate</h4>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/30 font-medium">Recommended</span>
                        </div>
                        <p className="text-sm text-purple-200/70 mb-5 leading-relaxed">Let AI create tailored practice questions in seconds based on topic & difficulty.</p>
                        <div className="flex flex-col gap-2 text-xs text-purple-200/60">
                          <span className="flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-purple-400" /> Instant question generation</span>
                          <span className="flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-purple-400" /> Tuned to topic & difficulty level</span>
                          <span className="flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-purple-400" /> Edit, delete or regenerate questions</span>
                        </div>
                        <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-purple-300 group-hover:text-purple-200 transition-colors">
                          Generate now <ChevronLeft className="w-4 h-4 rotate-180" />
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              )}

              {createMode === 'manual' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setCreateMode('')} className="text-slate-400 hover:text-white transition-colors">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Edit2 className="w-5 h-5 text-blue-400" />
                      Manual Assignment Creator
                    </h3>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div
                      onClick={() => navigate(createPageUrl(`AssignmentBuilder?classId=${classId}`))}
                      className="cursor-pointer rounded-2xl border border-emerald-500/30 bg-emerald-900/20 hover:bg-emerald-900/40 hover:border-emerald-400/50 p-6 transition-all group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-4">
                        <Plus className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="text-white font-semibold mb-1">Create from Scratch</h4>
                      <p className="text-sm text-emerald-200/60">Write your own questions, add a rubric, attach resources and set a due date.</p>
                    </div>
                    <div
                      onClick={() => navigate(createPageUrl('QuizLibrary'))}
                      className="cursor-pointer rounded-2xl border border-blue-500/30 bg-blue-900/20 hover:bg-blue-900/40 hover:border-blue-400/50 p-6 transition-all group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4">
                        <BookOpen className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="text-white font-semibold mb-1">From Quiz Library</h4>
                      <p className="text-sm text-blue-200/60">Browse your saved quizzes and drafts to reuse or launch existing content.</p>
                    </div>
                  </div>
                </div>
              )}

              {createMode === 'ai' && (
                <>
                  <GlassCard className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <button onClick={() => setCreateMode('')} className="text-slate-400 hover:text-white transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                        AI Generate Assignment Questions
                      </h3>
                    </div>

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
                </>
              )}
            </TabsContent>

            {/* Live Quizzes Tab */}
            <TabsContent value="live" className="space-y-6">
              {!createMode && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Zap className="w-5 h-5 text-amber-400" />
                    <h3 className="text-lg font-semibold text-white">Launch a Live Quiz</h3>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Manual Live Quiz */}
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="cursor-pointer"
                      onClick={() => setCreateMode('manual')}
                    >
                      <div className="relative overflow-hidden rounded-2xl border-2 border-teal-500/40 bg-gradient-to-br from-teal-900/40 to-emerald-900/30 p-7 hover:border-teal-400/70 hover:from-teal-900/60 transition-all duration-200 group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="w-14 h-14 mb-5 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/40">
                          <Edit2 className="w-7 h-7 text-white" />
                        </div>
                        <h4 className="text-xl font-bold text-white mb-1">Manual Quiz</h4>
                        <p className="text-sm text-teal-200/70 mb-5 leading-relaxed">Design a live quiz from scratch or launch a saved quiz set from your library.</p>
                        <div className="flex flex-col gap-2 text-xs text-teal-200/60">
                          <span className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-400" /> Write custom questions</span>
                          <span className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-400" /> Launch from saved quiz library</span>
                          <span className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-400" /> Full control over pacing</span>
                        </div>
                        <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-teal-300 group-hover:text-teal-200 transition-colors">
                          Get started <ChevronLeft className="w-4 h-4 rotate-180" />
                        </div>
                      </div>
                    </motion.div>

                    {/* AI Live Quiz - amber/orange for energy */}
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="cursor-pointer"
                      onClick={() => setCreateMode('ai')}
                    >
                      <div className="relative overflow-hidden rounded-2xl border-2 border-amber-500/50 bg-gradient-to-br from-amber-900/40 to-orange-900/30 p-7 hover:border-amber-400/80 hover:from-amber-900/60 transition-all duration-200 group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="absolute bottom-2 right-2 text-5xl opacity-10 select-none">⚡</div>
                        <div className="w-14 h-14 mb-5 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/50">
                          <Sparkles className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-xl font-bold text-white">AI Live Quiz</h4>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200 border border-amber-400/30 font-medium">Fastest</span>
                        </div>
                        <p className="text-sm text-amber-200/70 mb-5 leading-relaxed">AI generates a ready-to-launch live quiz in seconds. Preview, tweak, then go!</p>
                        <div className="flex flex-col gap-2 text-xs text-amber-200/60">
                          <span className="flex items-center gap-2"><Zap className="w-3.5 h-3.5 text-amber-400" /> Quiz ready in under 30 seconds</span>
                          <span className="flex items-center gap-2"><Zap className="w-3.5 h-3.5 text-amber-400" /> Matched to topic & difficulty</span>
                          <span className="flex items-center gap-2"><Zap className="w-3.5 h-3.5 text-amber-400" /> Start live session immediately</span>
                        </div>
                        <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-amber-300 group-hover:text-amber-200 transition-colors">
                          Generate & launch <ChevronLeft className="w-4 h-4 rotate-180" />
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              )}

              {createMode === 'manual' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setCreateMode('')} className="text-slate-400 hover:text-white transition-colors">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Edit2 className="w-5 h-5 text-teal-400" />
                      Manual Live Quiz
                    </h3>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div
                      onClick={() => navigate(createPageUrl(`AssignmentBuilder?classId=${classId}&mode=live`))}
                      className="cursor-pointer rounded-2xl border border-teal-500/30 bg-teal-900/20 hover:bg-teal-900/40 hover:border-teal-400/50 p-6 transition-all"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center mb-4">
                        <Plus className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="text-white font-semibold mb-1">Create Quiz from Scratch</h4>
                      <p className="text-sm text-teal-200/60">Build your own questions and launch instantly as a live session.</p>
                    </div>
                    <div
                      onClick={() => navigate(createPageUrl('QuizLibrary'))}
                      className="cursor-pointer rounded-2xl border border-emerald-500/30 bg-emerald-900/20 hover:bg-emerald-900/40 hover:border-emerald-400/50 p-6 transition-all"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center mb-4">
                        <BookOpen className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="text-white font-semibold mb-1">From Quiz Library</h4>
                      <p className="text-sm text-emerald-200/60">Browse your saved quizzes and launch an existing set as a live session.</p>
                    </div>
                  </div>
                </div>
              )}

              {createMode === 'ai' && (
                <>
                  <GlassCard className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <button onClick={() => setCreateMode('')} className="text-slate-400 hover:text-white transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Zap className="w-5 h-5 text-amber-400" />
                        AI Generate Live Quiz
                      </h3>
                    </div>

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
                      <div className="flex gap-2">
                        <Button
                          onClick={() => publishLiveQuizMutation.mutate()}
                          disabled={publishLiveQuizMutation.isPending}
                          className="bg-blue-500"
                        >
                          {publishLiveQuizMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1" /> Save to Library</>}
                        </Button>
                        <Button
                          onClick={() => startLiveQuizMutation.mutate()}
                          disabled={startLiveQuizMutation.isPending}
                          className="bg-gradient-to-r from-amber-500 to-orange-500 shadow-lg shadow-amber-500/30"
                        >
                          {startLiveQuizMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Starting...
                            </>
                          ) : (
                            <>
                              <Zap className="w-4 h-4 mr-2" />
                              Start Quiz
                            </>
                          )}
                        </Button>
                      </div>
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
                </>
              )}

              <GlassCard className="p-6">
                <h3 className="text-lg font-bold text-white mb-4">Live Quiz Sets ({liveQuizSets.length})</h3>
                {liveQuizSets.length > 0 ? (
                  <div className="space-y-3">
                    {liveQuizSets.map(set => (
                      <div key={set.id} className="p-4 bg-white/5 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium">{set.title}</p>
                            <p className="text-slate-200 text-sm">{set.question_count} questions • {set.difficulty}</p>
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
              <h2 className="text-2xl font-bold text-white mb-6">Manage Assignments</h2>

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
                        className="p-6 hover:bg-white/10 transition-all"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1 cursor-pointer" onClick={() => setSelectedAssignment(assignment)}>
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
                            
                            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-200">
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
                               <span className="text-slate-300">No due date</span>
                              )}
                              <span className="text-slate-300">
                               Created {new Date(assignment.created_date).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeleteConfirmAssignment(assignment)}
                            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10" onClick={() => setSelectedAssignment(assignment)}>
                          <div>
                            <p className="text-xs text-slate-300 mb-1">Started</p>
                            <p className="text-2xl font-bold text-white">{started}</p>
                            <p className="text-xs text-slate-300">of {classData.student_emails?.length || 0} students</p>
                            </div>
                            <div>
                            <p className="text-xs text-slate-300 mb-1">Completed</p>
                            <p className="text-2xl font-bold text-white">{completed}</p>
                            <p className="text-xs text-slate-300">submissions</p>
                            </div>
                            <div>
                            <p className="text-xs text-slate-300 mb-1">Avg Accuracy</p>
                            <p className="text-2xl font-bold text-white">{avgAccuracy}%</p>
                            <p className="text-xs text-slate-300">{totalQuestions} questions</p>
                          </div>
                        </div>
                      </GlassCard>
                    );
                  })}
                </div>
              ) : (
                <GlassCard className="p-12 text-center">
                  <ClipboardList className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 mb-2">No assignments created yet</p>
                  <p className="text-slate-500 text-sm">Use the Create tab to build and publish assignments</p>
                </GlassCard>
              )}
            </TabsContent>

            {/* Students Tab */}
            <TabsContent value="students" className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-6">Manage Students</h2>
              {classStudents.length > 0 ? (
                <div className="space-y-3">
                  {classStudents.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all"
                    >
                      <div>
                        <p className="text-white font-medium">{student.full_name || student.email}</p>
                        <p className="text-xs text-slate-400">{student.email}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteConfirmStudent(student)}
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <GlassCard className="p-12 text-center">
                  <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 mb-2">No students in this class yet</p>
                  <p className="text-slate-500 text-sm">Share the join code for students to enroll</p>
                </GlassCard>
              )}
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <ClassLeaderboard
                classData={classData}
                submissions={submissions}
                assignments={assignments}
                onSelectStudent={setSelectedStudent}
              />
            </TabsContent>

            {/* Messaging Tab */}
            <TabsContent value="messaging">
              {user && (
                <ClassMessaging
                  classId={classId}
                  user={user}
                  classData={classData}
                />
              )}
            </TabsContent>

            {/* Whiteboard Tab */}
            <TabsContent value="whiteboard" className="space-y-6">
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  {whiteboard && user && (
                    <InteractiveWhiteboard
                      whiteboard={whiteboard}
                      canEdit={true}
                      isTeacher={true}
                      whiteboardId={whiteboard.id}
                    />
                  )}
                </div>
                <div>
                  {whiteboard && classStudents.length > 0 && (
                    <WhiteboardPermissions
                      students={classStudents}
                      permissions={whiteboardPerms}
                      onPermissionChange={(email, allowed) => {
                        const newPerms = { ...whiteboardPerms, [email]: allowed };
                        setWhiteboardPerms(newPerms);
                        updateWhiteboardMutation.mutate({
                          student_edit_permissions: newPerms
                        });
                      }}
                      allowAllEdits={whiteboard.allow_all_edits}
                      onToggleAllEdits={(allowed) => {
                        updateWhiteboardMutation.mutate({
                          allow_all_edits: allowed,
                          student_edit_permissions: allowed ? {} : whiteboardPerms
                        });
                      }}
                    />
                  )}
                </div>
              </div>
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

        <AnimatePresence>
          {deleteConfirmStudent && (
            <motion.div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !removeStudentMutation.isPending && setDeleteConfirmStudent(null)}
            >
              <motion.div
                className="max-w-md w-full"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                <GlassCard className="p-8">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-6 h-6 text-red-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">Remove Student?</h3>
                      <p className="text-slate-400 text-sm mb-1">
                        Remove <span className="text-white font-semibold">{deleteConfirmStudent.full_name || deleteConfirmStudent.email}</span> from this class?
                      </p>
                      <p className="text-red-400 text-sm">
                        They will lose access to class materials and assignments.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setDeleteConfirmStudent(null)}
                      disabled={removeStudentMutation.isPending}
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => removeStudentMutation.mutate(deleteConfirmStudent.email)}
                      disabled={removeStudentMutation.isPending}
                      className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-500/30"
                    >
                      {removeStudentMutation.isPending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                          Removing...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove Student
                        </>
                      )}
                    </Button>
                  </div>
                </GlassCard>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {deleteConfirmAssignment && (
            <motion.div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !deleteAssignmentMutation.isPending && setDeleteConfirmAssignment(null)}
            >
              <motion.div
                className="max-w-md w-full"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                <GlassCard className="p-8">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-6 h-6 text-red-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">Delete Assignment?</h3>
                      <p className="text-slate-400 text-sm mb-1">
                        Are you sure you want to delete <span className="text-white font-semibold">"{deleteConfirmAssignment.title}"</span>?
                      </p>
                      <p className="text-red-400 text-sm">
                        This will permanently remove the assignment and all student submission data.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setDeleteConfirmAssignment(null)}
                      disabled={deleteAssignmentMutation.isPending}
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => deleteAssignmentMutation.mutate(deleteConfirmAssignment.id)}
                      disabled={deleteAssignmentMutation.isPending}
                      className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-500/30"
                    >
                      {deleteAssignmentMutation.isPending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Assignment
                        </>
                      )}
                    </Button>
                  </div>
                </GlassCard>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function formatTime(seconds) {
  if (!seconds || seconds === 0) return '0s';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

function ClassLeaderboard({ classData, submissions, assignments, onSelectStudent }) {
  const studentEmails = classData?.student_emails || [];

  const { data: progressList = [], isLoading } = useQuery({
    queryKey: ['classStudentProgress', classData?.id],
    queryFn: async () => {
      if (studentEmails.length === 0) return [];
      const all = await base44.entities.StudentProgress.list();
      return all.filter(p => studentEmails.includes(p.student_email));
    },
    enabled: studentEmails.length > 0,
  });

  if (studentEmails.length === 0) {
    return (
      <GlassCard className="p-12 text-center">
        <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-400">No students in this class yet</p>
      </GlassCard>
    );
  }

  // Build leaderboard from submissions (works immediately, no User entity needed)
  const leaderboard = studentEmails.map(email => {
    const studentSubs = submissions.filter(s => s.student_email === email);
    const progress = progressList.find(p => p.student_email === email);
    const totalQ = studentSubs.reduce((s, sub) => s + (sub.questions_answered || 0), 0);
    const totalCorrect = studentSubs.reduce((s, sub) => s + (sub.correct_answers || 0), 0);
    const completed = studentSubs.filter(s => s.status === 'submitted' || s.status === 'graded').length;
    const accuracy = totalQ > 0 ? (totalCorrect / totalQ) * 100 : 0;
    const streak = progress?.current_streak || 0;
    const displayName = progress?.student_email?.split('@')[0] || email.split('@')[0];

    return { email, displayName, accuracy, totalQ, totalCorrect, completed, streak, progress };
  }).sort((a, b) => {
    if (a.totalQ === 0 && b.totalQ > 0) return 1;
    if (a.totalQ > 0 && b.totalQ === 0) return -1;
    return b.accuracy - a.accuracy;
  });

  const medalColors = ['from-amber-400 to-yellow-500', 'from-slate-300 to-slate-400', 'from-amber-600 to-orange-700'];
  const medalEmojis = ['🥇', '🥈', '🥉'];

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
          <Trophy className="w-6 h-6 text-amber-400" />
          Class Leaderboard
        </h3>
        <span className="text-sm text-slate-300">{studentEmails.length} students enrolled</span>
      </div>

      {/* Top 3 podium */}
      {leaderboard.filter(s => s.totalQ > 0).length >= 3 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[leaderboard[1], leaderboard[0], leaderboard[2]].map((s, podiumIdx) => {
            if (!s) return null;
            const rank = podiumIdx === 1 ? 0 : podiumIdx === 0 ? 1 : 2;
            const heights = ['h-20', 'h-28', 'h-16'];
            const actualRank = leaderboard.indexOf(s);
            return (
              <div key={s.email} className={`flex flex-col items-center justify-end ${heights[podiumIdx]}`}>
                <div className="text-2xl mb-1">{medalEmojis[actualRank]}</div>
                <div className={`w-full rounded-t-xl bg-gradient-to-b ${medalColors[actualRank]} flex flex-col items-center justify-center py-3 px-2`}>
                  <p className="text-white font-bold text-sm truncate max-w-full px-1">{s.displayName}</p>
                  <p className="text-white/80 text-xs">{s.accuracy.toFixed(0)}%</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-2">
        {leaderboard.map((student, index) => {
          const hasActivity = student.totalQ > 0;
          return (
            <motion.div
              key={student.email}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] transition-all cursor-pointer group"
              onClick={() => onSelectStudent({ email: student.email, full_name: student.displayName, ...student.progress })}
            >
              {/* Rank */}
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                index === 0 ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-lg shadow-amber-500/30' :
                index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-slate-800' :
                index === 2 ? 'bg-gradient-to-br from-amber-600 to-orange-700 text-white' :
                'bg-white/10 text-slate-400'
              }`}>
                {index < 3 ? ['🥇','🥈','🥉'][index] : index + 1}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{student.displayName}</p>
                <p className="text-xs text-slate-300 truncate">{student.email}</p>
              </div>

              {/* Stats */}
              {hasActivity ? (
                <div className="flex items-center gap-6 text-center">
                  <div>
                    <p className="text-xs text-slate-300 mb-0.5">Accuracy</p>
                    <p className={`text-base font-bold ${student.accuracy >= 80 ? 'text-emerald-400' : student.accuracy >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                      {student.accuracy.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-300 mb-0.5">Questions</p>
                    <p className="text-base font-bold text-white">{student.totalQ}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-300 mb-0.5">Completed</p>
                    <p className="text-base font-bold text-white">{student.completed}</p>
                  </div>
                  {student.streak > 0 && (
                    <div>
                      <p className="text-xs text-slate-300 mb-0.5">Streak</p>
                      <p className="text-base font-bold text-orange-400">🔥{student.streak}</p>
                    </div>
                  )}
                  {/* Accuracy bar */}
                  <div className="w-24 hidden md:block">
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${student.accuracy >= 80 ? 'bg-emerald-400' : student.accuracy >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
                        style={{ width: `${Math.min(100, student.accuracy)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No activity yet</p>
              )}

              <Eye className="w-4 h-4 text-slate-600 group-hover:text-slate-400 flex-shrink-0 transition-colors" />
            </motion.div>
          );
        })}
      </div>

      {isLoading && (
        <div className="text-center py-4 text-slate-500 text-sm">Loading progress data…</div>
      )}
    </GlassCard>
  );
}

function AssignmentProgressModal({ assignment, classStudents, submissions, topics, onClose, onViewStudent }) {
  const topicName = assignment.custom_topic_name || 
    (assignment.topic_id ? topics.find(t => t.id === assignment.topic_id)?.name : 'No topic');

  console.log('[DEBUG AssignmentProgressModal] Assignment:', assignment.id);
  console.log('[DEBUG AssignmentProgressModal] Class students:', classStudents.length);
  console.log('[DEBUG AssignmentProgressModal] Submissions:', submissions.filter(s => s.assignment_id === assignment.id).length);

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
              <div className="flex items-center gap-4 text-sm text-slate-200">
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

                    <div className="grid grid-cols-5 gap-6 text-center">
                      <div>
                        <p className="text-xs text-slate-300 mb-1">Questions</p>
                        <p className="text-lg font-bold text-white">{student.questionsAnswered}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-300 mb-1">Correct</p>
                        <p className="text-lg font-bold text-white">{student.correctAnswers}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-300 mb-1">Accuracy</p>
                        <p className="text-lg font-bold text-white">
                          {student.accuracy !== null ? `${student.accuracy}%` : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-300 mb-1">Time</p>
                        <p className="text-lg font-bold text-white">{formatTime(student.timeSpent)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-300 mb-1">Avg/Q</p>
                        <p className="text-lg font-bold text-white">
                          {student.questionsAnswered > 0 ? formatTime(Math.floor(student.timeSpent / student.questionsAnswered)) : '—'}
                        </p>
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
            <p className="text-slate-400 text-center py-8">No students enrolled in this class yet</p>
          )}
          
          {studentProgress.length > 0 && studentProgress.every(s => s.status === 'Not started') && (
            <p className="text-slate-500 text-center text-sm mt-4">No student activity yet</p>
          )}
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}