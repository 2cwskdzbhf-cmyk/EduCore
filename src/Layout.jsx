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
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function Layout({ children, currentPageName }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  const publicPages = ['Landing'];
  const authOnlyPages = ['Onboarding'];
  const studentPages = ['StudentDashboard', 'Subject', 'Topic', 'Lesson', 'Quiz', 'AITutor', 'JoinClass'];
  const teacherPages = ['TeacherDashboard', 'ClassDetails', 'CreateAssignment', 'QuizLibrary', 'CreateQuiz', 'StartLiveQuiz', 'StudentStats'];
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
          if (!hasAccess) {
            redirectPage = isTeacher ? 'TeacherDashboard' : 'AdminPanel';
          }
        } else if (teacherPages.includes(currentPageName)) {
          hasAccess = isTeacher || isAdmin;
          if (!hasAccess) {
            redirectPage = 'StudentDashboard';
          }
        } else if (adminPages.includes(currentPageName)) {
          hasAccess = isAdmin;
          if (!hasAccess) {
            redirectPage = isTeacher ? 'TeacherDashboard' : 'StudentDashboard';
          }
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
    { name: 'Subjects', icon: BookOpen, page: 'Subject' },
    { name: 'AI Tutor', icon: MessageSquare, page: 'AITutor' },
  ];

  const teacherNav = [
    { name: 'Dashboard', icon: LayoutDashboard, page: 'TeacherDashboard' },
    { name: 'Classes', icon: Users, page: 'TeacherDashboard' },
    { name: 'Assignments', icon: ClipboardList, page: 'CreateAssignment' },
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-purple-500/50" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      <aside 
        className={cn(
          "hidden lg:flex fixed left-0 top-0 bottom-0 bg-slate-950/50 backdrop-blur-xl border-r border-white/10 flex-col z-50 transition-all duration-300 ease-out",
          sidebarExpanded ? "w-64" : "w-20"
        )}
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
      >
        <div className="p-6 border-b border-white/10">
          <Link to={createPageUrl('Landing')} className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/50">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <motion.span 
              className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent whitespace-nowrap"
              initial={{ opacity: 0, width: 0 }}
              animate={{ 
                opacity: sidebarExpanded ? 1 : 0,
                width: sidebarExpanded ? 'auto' : 0
              }}
              transition={{ duration: 0.3 }}
            >
              EduCore
            </motion.span>
          </Link>
        </div>

        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {navItems.map(item => (
              <Link
                key={item.page + item.name}
                to={createPageUrl(item.page)}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300",
                  currentPageName === item.page
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/50'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <motion.span 
                  className="font-medium whitespace-nowrap"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ 
                    opacity: sidebarExpanded ? 1 : 0,
                    width: sidebarExpanded ? 'auto' : 0
                  }}
                  transition={{ duration: 0.3 }}
                >
                  {item.name}
                </motion.span>
              </Link>
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3 overflow-hidden">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0 shadow-lg shadow-purple-500/50">
              {user.full_name?.charAt(0) || user.email?.charAt(0) || '?'}
            </div>
            <motion.div 
              className="flex-1 min-w-0"
              initial={{ opacity: 0, width: 0 }}
              animate={{ 
                opacity: sidebarExpanded ? 1 : 0,
                width: sidebarExpanded ? 'auto' : 0
              }}
              transition={{ duration: 0.3 }}
            >
              <p className="font-medium text-white truncate text-sm">{user.full_name || 'User'}</p>
              <p className="text-xs text-slate-400 truncate capitalize">{user.user_type || user.role || 'User'}</p>
            </motion.div>
          </div>
          <Button 
            variant="ghost" 
            className={cn(
              "w-full text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300",
              sidebarExpanded ? "justify-start" : "justify-center"
            )}
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            {sidebarExpanded && <span className="ml-2">Sign Out</span>}
          </Button>
        </div>
      </aside>

      <header className="lg:hidden fixed top-0 left-0 right-0 bg-slate-950/80 backdrop-blur-xl border-b border-white/10 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to={createPageUrl('Landing')} className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/50">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">EduCore</span>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-white/10 text-white"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="lg:hidden fixed inset-0 z-40 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.div
              className="absolute right-0 top-0 bottom-0 w-72 bg-slate-950/95 backdrop-blur-xl border-l border-white/10"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 pt-20">
                <nav className="space-y-2">
                  {navItems.map(item => (
                    <Link
                      key={item.page + item.name}
                      to={createPageUrl(item.page)}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300",
                        currentPageName === item.page
                          ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/50'
                          : 'text-slate-400 hover:bg-white/5 hover:text-white'
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  ))}
                </nav>

                <div className="mt-8 pt-6 border-t border-white/10">
                  <div className="flex items-center gap-3 mb-4 px-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold shadow-lg shadow-purple-500/50">
                      {user.full_name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="font-medium text-white">{user.full_name}</p>
                      <p className="text-xs text-slate-400 capitalize">{user.user_type || 'User'}</p>
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

      <main className={cn(
        "pt-16 lg:pt-0 transition-all duration-300",
        sidebarExpanded ? "lg:ml-64" : "lg:ml-20"
      )}>
        {children}
      </main>
    </div>
  );
}