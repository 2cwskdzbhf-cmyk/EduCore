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

/*
================================================================================
AUTHENTICATION & ROLE-BASED ACCESS CONTROL
================================================================================

This Layout handles three key responsibilities:

1. AUTHENTICATION CHECK
   - Checks if user is logged in via base44.auth.isAuthenticated()
   - Unauthenticated users are redirected to Landing page
   - Public pages (Landing) don't require authentication

2. ONBOARDING CHECK  
   - After login, checks if user has completed onboarding (has user_type set)
   - Users without user_type are forced to Onboarding page
   - This ensures every user has a role before accessing the app

3. ROLE-BASED ROUTING
   - Students can only access: StudentDashboard, Subject, Topic, Lesson, Quiz, AITutor, JoinClass
   - Teachers can only access: TeacherDashboard, ClassDetails, CreateAssignment
   - Admins can access: AdminPanel + all teacher pages
   - Unauthorized access redirects to the user's appropriate dashboard

Page access matrix:
- Landing, Onboarding: PUBLIC (no auth required)
- StudentDashboard, Subject, Topic, Lesson, Quiz, AITutor, JoinClass: STUDENT ONLY
- TeacherDashboard, ClassDetails, CreateAssignment: TEACHER + ADMIN
- AdminPanel: ADMIN ONLY

================================================================================
*/

export default function Layout({ children, currentPageName }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  // ============================================================================
  // STEP 1: Define page access rules
  // ============================================================================
  
  // Pages that don't require authentication at all
  const publicPages = ['Landing'];
  
  // Pages that require auth but no specific role (like onboarding)
  const authOnlyPages = ['Onboarding'];
  
  // Pages accessible only by students
  const studentPages = ['StudentDashboard', 'Subject', 'Topic', 'Lesson', 'Quiz', 'AITutor', 'JoinClass'];
  
  // Pages accessible by teachers (and admins)
  const teacherPages = ['TeacherDashboard', 'ClassDetails', 'CreateAssignment'];
  
  // Pages accessible only by admins
  const adminPages = ['AdminPanel'];

  // ============================================================================
  // STEP 2: Check authentication and user data on mount
  // ============================================================================
  
  useEffect(() => {
    const checkAuth = async () => {
      // Skip auth check for public pages - they can be viewed by anyone
      if (publicPages.includes(currentPageName)) {
        setLoading(false);
        return;
      }

      try {
        // Check if user is authenticated
        const isAuthenticated = await base44.auth.isAuthenticated();
        
        if (!isAuthenticated) {
          // REDIRECT: Unauthenticated users go to Landing page
          // They need to log in before accessing any protected content
          navigate(createPageUrl('Landing'));
          return;
        }

        // User is authenticated - fetch their data
        const userData = await base44.auth.me();
        setUser(userData);

        // ============================================================================
        // STEP 3: Check if onboarding is complete
        // ============================================================================
        
        // If user has no user_type, they haven't completed onboarding
        // Force them to onboarding (unless they're already there)
        if (!userData.user_type && currentPageName !== 'Onboarding') {
          navigate(createPageUrl('Onboarding'));
          return;
        }

        // ============================================================================
        // STEP 4: Enforce role-based access control
        // ============================================================================
        
        // Skip role check for onboarding page (user_type might not be set yet)
        if (currentPageName === 'Onboarding') {
          setLoading(false);
          return;
        }

        const userRole = userData.user_type || userData.role; // user_type is our custom field, role is built-in
        const isAdmin = userRole === 'admin' || userData.role === 'admin';
        const isTeacher = userRole === 'teacher';
        const isStudent = userRole === 'student';

        // Check if user is trying to access a page they're not allowed to
        let hasAccess = false;
        let redirectPage = null;

        if (studentPages.includes(currentPageName)) {
          // Student pages - only students can access
          hasAccess = isStudent;
          if (!hasAccess) {
            // Redirect teachers/admins to their dashboard
            redirectPage = isTeacher ? 'TeacherDashboard' : 'AdminPanel';
          }
        } else if (teacherPages.includes(currentPageName)) {
          // Teacher pages - teachers and admins can access
          hasAccess = isTeacher || isAdmin;
          if (!hasAccess) {
            // Redirect students to their dashboard
            redirectPage = 'StudentDashboard';
          }
        } else if (adminPages.includes(currentPageName)) {
          // Admin pages - only admins can access
          hasAccess = isAdmin;
          if (!hasAccess) {
            // Redirect to appropriate dashboard based on role
            redirectPage = isTeacher ? 'TeacherDashboard' : 'StudentDashboard';
          }
        } else {
          // Unknown page - allow access (might be a new page)
          hasAccess = true;
        }

        // REDIRECT: If user doesn't have access, send them to their dashboard
        if (!hasAccess && redirectPage) {
          navigate(createPageUrl(redirectPage));
          return;
        }

      } catch (e) {
        console.error('Auth check error:', e);
        // On error, redirect to Landing for safety
        navigate(createPageUrl('Landing'));
        return;
      }
      
      setLoading(false);
    };
    
    checkAuth();
  }, [currentPageName, navigate]);

  // ============================================================================
  // STEP 5: Render public pages without layout
  // ============================================================================
  
  // Public pages and onboarding don't need the sidebar layout
  if (publicPages.includes(currentPageName) || currentPageName === 'Onboarding') {
    return children;
  }

  // ============================================================================
  // STEP 6: Define navigation items based on user role
  // ============================================================================
  
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

  // ============================================================================
  // STEP 7: Show loading state while checking auth
  // ============================================================================
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-purple-500/50" />
      </div>
    );
  }

  // If no user at this point, don't render anything (redirect should happen)
  if (!user) {
    return null;
  }

  const navItems = getNavItems();

  // ============================================================================
  // STEP 8: Render the layout with sidebar navigation
  // ============================================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      {/* Desktop Sidebar */}
      <aside 
        className={cn(
          "hidden lg:flex fixed left-0 top-0 bottom-0 bg-slate-950/50 backdrop-blur-xl border-r border-white/10 flex-col z-50 transition-all duration-300 ease-out",
          sidebarExpanded ? "w-64" : "w-20"
        )}
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
      >
        {/* Logo */}
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

        {/* Navigation */}
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

        {/* User info and logout */}
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

      {/* Mobile Header */}
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

      {/* Mobile Menu */}
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

      {/* Main Content */}
      <main className={cn(
        "pt-16 lg:pt-0 transition-all duration-300",
        sidebarExpanded ? "lg:ml-64" : "lg:ml-20"
      )}>
        {children}
      </main>
    </div>
  );
}