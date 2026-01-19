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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
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
    <div className="min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-100 flex-col z-50">
        {/* Logo */}
        <div className="p-6 border-b border-slate-100">
          <Link to={createPageUrl('Landing')} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              EduCore
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-1">
            {navItems.map(item => (
              <Link
                key={item.page + item.name}
                to={createPageUrl(item.page)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  currentPageName === item.page
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            ))}
          </div>
        </nav>

        {/* User info and logout */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold">
              {user.full_name?.charAt(0) || user.email?.charAt(0) || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-800 truncate">{user.full_name || 'User'}</p>
              <p className="text-xs text-slate-500 truncate capitalize">{user.user_type || user.role || 'User'}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-slate-500 hover:text-red-600"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-slate-100 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to={createPageUrl('Landing')} className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-800">EduCore</span>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-slate-100"
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
              className="absolute right-0 top-0 bottom-0 w-72 bg-white"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 pt-20">
                <nav className="space-y-1">
                  {navItems.map(item => (
                    <Link
                      key={item.page + item.name}
                      to={createPageUrl(item.page)}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
                        currentPageName === item.page
                          ? 'bg-indigo-50 text-indigo-600'
                          : 'text-slate-600'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  ))}
                </nav>

                <div className="mt-8 pt-6 border-t border-slate-100">
                  <div className="flex items-center gap-3 mb-4 px-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold">
                      {user.full_name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{user.full_name}</p>
                      <p className="text-xs text-slate-500 capitalize">{user.user_type || 'User'}</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-red-500"
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
      <main className="lg:ml-64 pt-16 lg:pt-0">
        {children}
      </main>
    </div>
  );
}