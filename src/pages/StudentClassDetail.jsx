import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/ui/GlassCard';
import ClassMessaging from '@/components/class/ClassMessaging';
import InteractiveWhiteboard from '@/components/whiteboard/InteractiveWhiteboard';
import WhiteboardChat from '@/components/whiteboard/WhiteboardChat';
import ClassLessons from '@/components/lessons/ClassLessons';
import ClassPollsTab from '@/components/class/ClassPollsTab';
import YesNoButton from '@/components/class/YesNoButton';
import {
  ChevronLeft, ClipboardList, Trophy, Clock, MessageCircle,
  BarChart3, Menu, Loader2, CheckCircle2, AlertCircle, BookOpen, Wrench
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'lessons', icon: '📖', label: 'Lessons' },
  { id: 'assignments', icon: '📋', label: 'Assignments' },
  { id: 'leaderboard', icon: '🏆', label: 'Leaderboard' },
  { id: 'messaging', icon: '💬', label: 'Messaging' },
  { id: 'polls', icon: '📊', label: 'Polls' },
  { id: 'whiteboard', icon: '✏️', label: 'Whiteboard' },
  { id: 'tools', icon: '🛠', label: 'Tools' },
];

export default function StudentClassDetail() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('lessons');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const classId = urlParams.get('classId');

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: classData } = useQuery({
    queryKey: ['class', classId],
    queryFn: async () => {
      if (!classId) return null;
      const r = await base44.entities.Class.filter({ id: classId });
      return r[0] || null;
    },
    enabled: !!classId
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['classAssignments', classId],
    queryFn: () => base44.entities.Assignment.filter({ class_id: classId, status: 'published' }, '-due_date'),
    enabled: !!classId
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['mySubmissions', classId, user?.email],
    queryFn: () => base44.entities.AssignmentSubmission.filter({ class_id: classId, student_email: user.email }),
    enabled: !!classId && !!user?.email
  });

  // Accurate leaderboard using AssignmentSubmissions
  const { data: allSubmissions = [] } = useQuery({
    queryKey: ['allClassSubmissions', classId],
    queryFn: () => base44.entities.AssignmentSubmission.filter({ class_id: classId }),
    enabled: !!classId && !!classData?.student_emails,
    refetchInterval: 15000,
  });

  const { data: whiteboard } = useQuery({
    queryKey: ['classWhiteboard', classId],
    queryFn: async () => {
      if (!classId) return null;
      const boards = await base44.entities.LiveSessionWhiteboard.filter({ session_id: classId });
      return boards[0] || null;
    },
    enabled: !!classId,
    refetchInterval: 2000
  });

  const getSubmissionStatus = (assignmentId) => {
    const sub = submissions.find(s => s.assignment_id === assignmentId);
    return sub?.status || 'not_started';
  };

  // Build accurate leaderboard
  const leaderboard = (classData?.student_emails || []).map(email => {
    const studentSubs = allSubmissions.filter(s => s.student_email === email);
    const totalQ = studentSubs.reduce((s,sub) => s+(sub.questions_answered||0), 0);
    const totalC = studentSubs.reduce((s,sub) => s+(sub.correct_answers||0), 0);
    const incorrect = totalQ - totalC;
    const accuracy = totalQ > 0 ? (totalC/totalQ)*100 : 0;
    const completed = studentSubs.filter(s => ['submitted','graded'].includes(s.status)).length;
    return { email, accuracy, totalQ, totalC, incorrect, completed, displayName: email.split('@')[0] };
  }).sort((a,b) => {
    if (a.totalQ===0&&b.totalQ>0) return 1;
    if (a.totalQ>0&&b.totalQ===0) return -1;
    return b.accuracy - a.accuracy;
  });

  if (!classId) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Class not found</h1>
        <Link to={createPageUrl('StudentDashboard')}><Button className="bg-gradient-to-r from-purple-500 to-blue-500">Go to Dashboard</Button></Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      <div className="flex h-screen">
        {/* Sidebar */}
        <aside className={`
          fixed lg:relative inset-y-0 left-0 z-40 w-60 flex-shrink-0
          bg-slate-950/70 backdrop-blur-xl border-r border-white/10
          flex flex-col transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="p-4 border-b border-white/10">
            <Link to={createPageUrl('StudentDashboard')}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-3 text-sm">
              <ChevronLeft className="w-4 h-4"/> Dashboard
            </Link>
            <h2 className="text-white font-bold text-base leading-tight">{classData?.name || 'Class'}</h2>
            <p className="text-slate-400 text-xs mt-0.5">Teacher: {classData?.teacher_email?.split('@')[0]}</p>
          </div>
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {NAV_ITEMS.map(item => (
              <button key={item.id} onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                  activeTab===item.id
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}>
                <span>{item.icon}</span><span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)}/>}

        <main className="flex-1 overflow-y-auto">
          {/* Mobile header */}
          <div className="lg:hidden flex items-center gap-3 p-4 border-b border-white/10 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-20">
            <button onClick={() => setSidebarOpen(true)} className="text-slate-400 hover:text-white">
              <Menu className="w-5 h-5"/>
            </button>
            <span className="text-white font-semibold truncate">{classData?.name||'Class'}</span>
          </div>

          <div className="p-6 max-w-4xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity:0,y:12 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-12 }} transition={{ duration:0.2 }}>

                {/* LESSONS */}
                {activeTab==='lessons' && user && (
                  <ClassLessons classId={classId} user={user} isTeacher={false}/>
                )}

                {/* ASSIGNMENTS */}
                {activeTab==='assignments' && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-white">Assignments</h2>
                    {assignments.length > 0 ? assignments.map((assignment, index) => {
                      const status = getSubmissionStatus(assignment.id);
                      const statusConfig = {
                        not_started: { label:'Not Started', color:'bg-slate-500/20 text-slate-400', icon:AlertCircle },
                        in_progress: { label:'In Progress', color:'bg-amber-500/20 text-amber-400', icon:Clock },
                        submitted: { label:'Submitted', color:'bg-blue-500/20 text-blue-400', icon:CheckCircle2 },
                        graded: { label:'Graded', color:'bg-green-500/20 text-green-400', icon:CheckCircle2 }
                      };
                      const cfg = statusConfig[status] || statusConfig.not_started;
                      return (
                        <motion.div key={assignment.id} initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} transition={{ delay:index*0.05 }}>
                          <Link to={createPageUrl(`TakeAssignment?id=${assignment.id}`)}>
                            <GlassCard className="p-5 hover:scale-[1.01] transition-all">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-lg font-semibold text-white">{assignment.title}</h3>
                                    <span className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-1 ${cfg.color}`}>
                                      {cfg.label}
                                    </span>
                                  </div>
                                  {assignment.description && <p className="text-sm text-slate-400 mb-2">{assignment.description}</p>}
                                  <div className="flex items-center gap-4 text-sm text-slate-500">
                                    {assignment.due_date && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5"/> Due: {new Date(assignment.due_date).toLocaleDateString()}</span>}
                                    {assignment.max_points && <span>{assignment.max_points} points</span>}
                                  </div>
                                </div>
                              </div>
                            </GlassCard>
                          </Link>
                        </motion.div>
                      );
                    }) : (
                      <GlassCard className="p-12 text-center">
                        <ClipboardList className="w-12 h-12 text-slate-400 mx-auto mb-4"/>
                        <h3 className="font-semibold text-white mb-2">No assignments yet</h3>
                        <p className="text-slate-400 text-sm">Assignments will appear here when your teacher creates them.</p>
                      </GlassCard>
                    )}
                  </div>
                )}

                {/* LEADERBOARD */}
                {activeTab==='leaderboard' && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Trophy className="w-6 h-6 text-amber-400"/> Class Leaderboard</h2>

                    {/* My stats */}
                    {user && (() => {
                      const me = leaderboard.find(s=>s.email===user.email);
                      const myRank = me ? leaderboard.indexOf(me)+1 : null;
                      if (!me||me.totalQ===0) return null;
                      return (
                        <GlassCard className="p-4 border-purple-500/40">
                          <p className="text-purple-300 text-xs font-semibold mb-2">Your Position</p>
                          <div className="flex items-center gap-4">
                            <div className="text-3xl font-bold text-white">#{myRank}</div>
                            <div className="grid grid-cols-3 gap-4 flex-1">
                              <div className="text-center"><p className="text-xl font-bold text-emerald-400">{me.accuracy.toFixed(1)}%</p><p className="text-xs text-slate-400">Accuracy</p></div>
                              <div className="text-center"><p className="text-xl font-bold text-white">{me.totalC}</p><p className="text-xs text-slate-400">Correct</p></div>
                              <div className="text-center"><p className="text-xl font-bold text-white">{me.totalQ}</p><p className="text-xs text-slate-400">Total Qs</p></div>
                            </div>
                          </div>
                        </GlassCard>
                      );
                    })()}

                    {leaderboard.length > 0 ? (
                      <div className="space-y-2">
                        {leaderboard.map((student, index) => {
                          const isMe = student.email === user?.email;
                          const medalEmojis = ['🥇','🥈','🥉'];
                          return (
                            <motion.div key={student.email}
                              initial={{ opacity:0, x:-16 }} animate={{ opacity:1, x:0 }} transition={{ delay:index*0.04 }}>
                              <GlassCard className={`p-4 ${isMe?'border-purple-500/50 shadow-purple-500/20':''}`}>
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                                    index===0?'bg-gradient-to-br from-amber-400 to-yellow-500 text-white':
                                    index===1?'bg-gradient-to-br from-slate-300 to-slate-400 text-slate-800':
                                    index===2?'bg-gradient-to-br from-amber-600 to-orange-700 text-white':
                                    'bg-white/10 text-slate-400'}`}>
                                    {index<3?medalEmojis[index]:index+1}
                                  </div>
                                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                    {student.displayName.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={`font-semibold truncate ${isMe?'text-purple-300':'text-white'}`}>
                                      {student.displayName}{isMe&&' (You)'}
                                    </p>
                                    <p className="text-xs text-slate-500">{student.completed} assignment{student.completed!==1?'s':''} completed</p>
                                  </div>
                                  {student.totalQ > 0 ? (
                                    <div className="flex items-center gap-4 text-center">
                                      <div>
                                        <p className={`text-lg font-bold ${student.accuracy>=80?'text-emerald-400':student.accuracy>=60?'text-amber-400':'text-red-400'}`}>{student.accuracy.toFixed(1)}%</p>
                                        <p className="text-xs text-slate-400">Accuracy</p>
                                      </div>
                                      <div className="hidden sm:block">
                                        <p className="text-base font-bold text-emerald-400">{student.totalC}</p>
                                        <p className="text-xs text-slate-400">Correct</p>
                                      </div>
                                      <div className="hidden sm:block">
                                        <p className="text-base font-bold text-red-400">{student.incorrect}</p>
                                        <p className="text-xs text-slate-400">Wrong</p>
                                      </div>
                                      <div className="hidden md:block w-16">
                                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                          <div className={`h-full rounded-full ${student.accuracy>=80?'bg-emerald-400':student.accuracy>=60?'bg-amber-400':'bg-red-400'}`} style={{ width:`${Math.min(100,student.accuracy)}%` }}/>
                                        </div>
                                      </div>
                                    </div>
                                  ) : <p className="text-xs text-slate-500 italic">No activity</p>}
                                </div>
                              </GlassCard>
                            </motion.div>
                          );
                        })}
                      </div>
                    ) : (
                      <GlassCard className="p-12 text-center">
                        <Trophy className="w-12 h-12 text-slate-400 mx-auto mb-4"/>
                        <p className="text-slate-400">No data yet. Complete assignments to appear on the leaderboard.</p>
                      </GlassCard>
                    )}
                  </div>
                )}

                {/* MESSAGING */}
                {activeTab==='messaging' && user && (
                  <ClassMessaging classId={classId} user={user} classData={classData}/>
                )}

                {/* POLLS */}
                {activeTab==='polls' && user && (
                  <ClassPollsTab classId={classId} user={user} isTeacher={false}/>
                )}

                {/* WHITEBOARD */}
                {activeTab==='whiteboard' && (
                  <>
                    {whiteboard && user && (() => {
                      const globalVisible = whiteboard.show_to_students ?? true;
                      const studentVisible = whiteboard.student_visibility?.[user.email] ?? true;
                      const canSee = globalVisible && studentVisible;
                      const canEdit = canSee && (whiteboard.student_edit_permissions?.[user.email] ?? false);
                      if (!canSee) return (
                        <GlassCard className="p-12 text-center">
                          <p className="text-2xl mb-2">🚫</p>
                          <p className="text-slate-300 font-medium">Whiteboard hidden</p>
                          <p className="text-slate-500 text-sm mt-1">Your teacher has hidden the whiteboard.</p>
                        </GlassCard>
                      );
                      return (
                        <div className="grid lg:grid-cols-3 gap-4">
                          <div className="lg:col-span-2">
                            <InteractiveWhiteboard whiteboard={whiteboard} canEdit={canEdit} isTeacher={false} whiteboardId={whiteboard.id}/>
                          </div>
                          <div><WhiteboardChat classId={classId} user={user}/></div>
                        </div>
                      );
                    })()}
                    {!whiteboard && <GlassCard className="p-12 text-center"><p className="text-slate-400">Whiteboard not available yet.</p></GlassCard>}
                  </>
                )}

                {/* TOOLS */}
                {activeTab==='tools' && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Wrench className="w-6 h-6 text-purple-400"/> Class Tools</h2>
                    <GlassCard className="p-6">
                      <h3 className="text-lg font-bold text-white mb-4">Yes / No Decision</h3>
                      <YesNoButton/>
                    </GlassCard>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}