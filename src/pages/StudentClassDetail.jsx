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
import ModernPollsTab from '@/components/class/ModernPollsTab';
import YesNoButton from '@/components/class/YesNoButton';
import AnnouncementsFeed from '@/components/class/AnnouncementsFeed';
import AssignmentsList from '@/components/class/AssignmentsList';
import ModernClassNav from '@/components/class/ModernClassNav';
import ModernLeaderboard from '@/components/class/ModernLeaderboard';
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
                  <AssignmentsList classId={classId} user={user} isTeacher={false} />
                )}

                {/* LEADERBOARD */}
                {activeTab==='leaderboard' && (
                  <ModernLeaderboard classId={classId} classData={classData} user={user} isTeacher={false} />
                )}

                {/* MESSAGING */}
                {activeTab==='messaging' && user && (
                  <ClassMessaging classId={classId} user={user} classData={classData}/>
                )}

                {/* POLLS */}
                {activeTab==='polls' && user && (
                  <ModernPollsTab classId={classId} user={user} isTeacher={false}/>
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