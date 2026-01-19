import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GraduationCap, 
  LayoutDashboard, 
  BookOpen, 
  MessageSquare, 
  Trophy,
  Settings,
  Menu,
  X,
  LogOut,
  Users,
  ClipboardList,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuthenticated = await base44.auth.isAuthenticated();
        if (isAuthenticated) {
          const userData = await base44.auth.me();
          setUser(userData);
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  // Pages that don't need layout
  const noLayoutPages = ['Landing', 'Onboarding'];
  if (noLayoutPages.includes(currentPageName)) {
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
    { name: 'Dashboard', icon: LayoutDashboard, page: 'StudentDashboard' },
  ];

  const getNavItems = () => {
    if (user?.user_type === 'admin' || user?.role === 'admin') return adminNav;
    if (user?.user_type === 'teacher') return teacherNav;
    return studentNav;
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const navItems = getNavItems();

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
                key={item.page}
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

        {/* User */}
        {user && (
          <div className="p-4 border-t border-slate-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold">
                {user.full_name?.charAt(0) || user.email?.charAt(0) || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 truncate">{user.full_name || 'User'}</p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
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
        )}
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
                      key={item.page}
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

                {user && (
                  <div className="mt-8 pt-6 border-t border-slate-100">
                    <div className="flex items-center gap-3 mb-4 px-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold">
                        {user.full_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{user.full_name}</p>
                        <p className="text-xs text-slate-500">{user.user_type || 'Student'}</p>
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
                )}
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