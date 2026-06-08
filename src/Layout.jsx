import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GraduationCap, 
  LayoutDashboard, 
  BookOpen, 
  MessageSquare, 
  Menu,
  X,
  LogOut,
  Users,
  ClipboardList,
  Shield,
  BarChart3,
  User as UserIcon,
  TrendingUp,
  Brain,
  Calendar,
  Wrench
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ProfileModal from '@/components/profile/ProfileModal';

/* ── Brand palette ── */
const B = {
  primary:   '#3D52A0',
  secondary: '#7091E6',
  surface:   '#8697C4',
  base:      '#ADB8DA',
  light:     '#EDE8F5',
  dark:      '#0c1024',
  darkMid:   '#111830',
};

export default function Layout({ children, currentPageName }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const publicPages = ['Landing'];
  const authOnlyPages = ['Onboarding'];
  const studentPages = ['StudentDashboard', 'StudentPortfolio', 'Subject', 'Topic', 'Lesson', 'Quiz', 'AITutor', 'JoinClass', 'StudentClassDetail', 'StudentGrades', 'CollaborationHub', 'MyTimetable', 'TestScores', 'ExamForecast'];
  const teacherPages = ['TeacherDashboard', 'ClassDetails', 'CreateAssignment', 'QuizLibrary', 'CreateQuiz', 'StartLiveQuiz', 'StudentStats', 'CurriculumManager', 'GradingCenter', 'Analytics'];
  const adminPages = ['AdminPanel'];

  useEffect(() => {
    const checkAuth = async () => {
      if (publicPages.includes(currentPageName)) {
        setLoading(false);
        return;
      }

      try {
        const isAuthenticated = await base44.auth.isAuthenticated();
        
        if (!isAuthenticated) {
          navigate(createPageUrl('Landing'));
          return;
        }

        const userData = await base44.auth.me();
        setUser(userData);

        if (!userData.user_type && currentPageName !== 'Onboarding') {
          navigate(createPageUrl('Onboarding'));
          return;
        }

        if (currentPageName === 'Onboarding') {
          setLoading(false);
          return;
        }

        const userRole = userData.user_type || userData.role;
        const isAdmin = userRole === 'admin' || userData.role === 'admin';
        const isTeacher = userRole === 'teacher';
        const isStudent = userRole === 'student';

        let hasAccess = false;
        let redirectPage = null;

        if (studentPages.includes(currentPageName)) {
          hasAccess = isStudent;
          if (!hasAccess) redirectPage = isTeacher ? 'TeacherDashboard' : 'AdminPanel';
        } else if (teacherPages.includes(currentPageName)) {
          hasAccess = isTeacher || isAdmin;
          if (!hasAccess) redirectPage = 'StudentDashboard';
        } else if (adminPages.includes(currentPageName)) {
          hasAccess = isAdmin;
          if (!hasAccess) redirectPage = isTeacher ? 'TeacherDashboard' : 'StudentDashboard';
        } else {
          hasAccess = true;
        }

        if (!hasAccess && redirectPage) {
          navigate(createPageUrl(redirectPage));
          return;
        }

      } catch (e) {
        console.error('Auth check error:', e);
        navigate(createPageUrl('Landing'));
        return;
      }
      
      setLoading(false);
    };
    
    checkAuth();
  }, [currentPageName, navigate]);

  if (publicPages.includes(currentPageName) || currentPageName === 'Onboarding') {
    return children;
  }

  const studentNav = [
    { name: 'Dashboard', icon: LayoutDashboard, page: 'StudentDashboard' },
    { name: 'Timetable', icon: Calendar, page: 'MyTimetable' },
    { name: 'Grades', icon: TrendingUp, page: 'StudentGrades' },
    { name: 'Collaborate', icon: Users, page: 'CollaborationHub' },
    { name: 'Portfolio', icon: Brain, page: 'StudentPortfolio' },
    { name: 'Test Scores', icon: ClipboardList, page: 'TestScores' },
    { name: 'AI Tutor', icon: MessageSquare, page: 'AITutor' },
    { name: 'Revision Hub', icon: Brain, page: 'RevisionHub' },
    { name: 'AI Lab Tools', icon: Wrench, page: 'AILabTools' },
    { name: 'Useful Tools', icon: Wrench, page: 'UsefulTools' },
  ];

  const teacherNav = [
    { name: 'Dashboard', icon: LayoutDashboard, page: 'TeacherDashboard' },
    { name: 'Classes', icon: Users, page: 'TeacherDashboard' },
    { name: 'Curriculum', icon: BookOpen, page: 'CurriculumManager' },
    { name: 'Grading', icon: ClipboardList, page: 'GradingCenter' },
    { name: 'Analytics', icon: BarChart3, page: 'Analytics' },
    { name: 'Useful Tools', icon: Wrench, page: 'UsefulTools' },
  ];

  const adminNav = [
    { name: 'Admin Panel', icon: Shield, page: 'AdminPanel' },
    { name: 'Teacher View', icon: LayoutDashboard, page: 'TeacherDashboard' },
  ];

  const getNavItems = () => {
    if (!user) return [];
    const userRole = user.user_type || user.role;
    if (userRole === 'admin' || user.role === 'admin') return adminNav;
    if (userRole === 'teacher') return teacherNav;
    return studentNav;
  };

  const handleLogout = () => {
    base44.auth.logout(createPageUrl('Landing'));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: B.dark }}>
        <div className="w-12 h-12 border-4 rounded-full animate-spin" style={{ borderColor: B.base, borderTopColor: B.secondary }} />
      </div>
    );
  }

  if (!user) return null;

  const navItems = getNavItems();

  const activeNavStyle = {
    background: `linear-gradient(135deg, ${B.primary}, ${B.secondary})`,
    color: 'white',
    boxShadow: `0 4px 15px rgba(61,82,160,0.45)`,
  };

  const sidebarStyle = {
    background: `linear-gradient(180deg, #1e2d6e 0%, ${B.dark} 100%)`,
    borderRight: `1px solid rgba(112,145,230,0.18)`,
  };

  return (
    <div className="min-h-screen" style={{ background: `linear-gradient(135deg, ${B.dark} 0%, #151f50 50%, ${B.dark} 100%)` }}>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex fixed left-0 top-0 bottom-0 backdrop-blur-xl flex-col z-50 transition-all duration-300 ease-out",
          sidebarExpanded ? "w-64" : "w-20"
        )}
        style={sidebarStyle}
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
      >
        {/* Logo */}
        <div className="p-6" style={{ borderBottom: '1px solid rgba(112,145,230,0.15)' }}>
          <Link to={createPageUrl('Landing')} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
              style={{ background: `linear-gradient(135deg, ${B.secondary}, ${B.primary})` }}>
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <motion.span
              className="text-xl font-bold whitespace-nowrap"
              style={{ color: B.base }}
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: sidebarExpanded ? 1 : 0, width: sidebarExpanded ? 'auto' : 0 }}
              transition={{ duration: 0.3 }}
            >
              EduCore
            </motion.span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4">
          <div className="space-y-1">
            {navItems.map(item => (
              <Link
                key={item.page + item.name}
                to={createPageUrl(item.page)}
                className="flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300"
                style={currentPageName === item.page ? activeNavStyle : { color: B.base }}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <motion.span
                  className="font-medium whitespace-nowrap"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: sidebarExpanded ? 1 : 0, width: sidebarExpanded ? 'auto' : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {item.name}
                </motion.span>
              </Link>
            ))}
          </div>
        </nav>

        {/* User / Logout */}
        <div className={cn("border-t border-white/10", sidebarExpanded ? "p-4" : "py-4 flex flex-col items-center")}>
          <button
            onClick={() => setProfileModalOpen(true)}
            className={cn("w-full rounded-xl transition-all duration-300 mb-3 hover:bg-white/10 flex items-center",
              sidebarExpanded ? "gap-3 overflow-hidden p-2" : "justify-center p-2")}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 shadow-lg overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${B.primary}, ${B.secondary})` }}>
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                user.full_name?.charAt(0) || user.email?.charAt(0) || '?'
              )}
            </div>
            <motion.div
              className="flex-1 min-w-0"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: sidebarExpanded ? 1 : 0, width: sidebarExpanded ? 'auto' : 0 }}
              transition={{ duration: 0.3 }}
            >
              <p className="font-medium text-white truncate text-sm text-left">{user.full_name || 'User'}</p>
              <p className="text-xs truncate capitalize text-left" style={{ color: B.base }}>{user.user_type || user.role || 'User'}</p>
            </motion.div>
          </button>
          <Button
            variant="ghost"
            className={cn("text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-300",
              sidebarExpanded ? "w-full justify-start px-4" : "w-10 h-10 justify-center p-0")}
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            {sidebarExpanded && <span className="ml-2">Sign Out</span>}
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 backdrop-blur-xl border-b z-50"
        style={{ background: 'rgba(8,12,26,0.9)', borderColor: 'rgba(112,145,230,0.15)' }}>
        <div className="flex items-center justify-between px-4 py-3">
          <Link to={createPageUrl('Landing')} className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: `linear-gradient(135deg, ${B.secondary}, ${B.primary})` }}>
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold" style={{ color: B.base }}>EduCore</span>
          </Link>
          <div className="flex items-center gap-2">
            <button onClick={() => setProfileModalOpen(true)} className="p-2 rounded-lg hover:bg-white/10 transition-colors" style={{ color: B.base }}>
              <UserIcon className="w-5 h-5" />
            </button>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 rounded-lg hover:bg-white/10 text-white">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile slide-in menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="lg:hidden fixed inset-0 z-40 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.div
              className="absolute right-0 top-0 bottom-0 w-72 backdrop-blur-xl"
              style={{ background: 'rgba(8,12,26,0.97)', borderLeft: '1px solid rgba(112,145,230,0.15)' }}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 pt-20">
                <nav className="space-y-1">
                  {navItems.map(item => (
                    <Link
                      key={item.page + item.name}
                      to={createPageUrl(item.page)}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300"
                      style={currentPageName === item.page ? activeNavStyle : { color: B.base }}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  ))}
                </nav>

                <div className="mt-8 pt-6" style={{ borderTop: '1px solid rgba(112,145,230,0.15)' }}>
                  <div className="flex items-center gap-3 mb-4 px-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-lg"
                      style={{ background: `linear-gradient(135deg, ${B.primary}, ${B.secondary})` }}>
                      {user.full_name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="font-medium text-white">{user.full_name}</p>
                      <p className="text-xs capitalize" style={{ color: B.base }}>{user.user_type || 'User'}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className={cn("pt-16 lg:pt-0 transition-all duration-300", sidebarExpanded ? "lg:ml-64" : "lg:ml-20")}>
        {children}
      </main>

      <ProfileModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        user={user}
        onUpdateUser={() => {
          base44.auth.me().then(setUser);
        }}
      />
    </div>
  );
}