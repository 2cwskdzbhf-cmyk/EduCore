import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ClipboardCheck, LayoutDashboard, Users, BookOpen, BarChart3 } from 'lucide-react';

const navItems = [
  { path: '/att-register', label: 'Take Register', icon: ClipboardCheck },
  { path: '/att-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/att-students', label: 'Students', icon: Users },
  { path: '/att-classes', label: 'Classes', icon: BookOpen },
  { path: '/att-analytics', label: 'Analytics', icon: BarChart3 },
];

export default function AttendanceNav() {
  const location = useLocation();

  return (
    <div className="bg-slate-950/80 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center gap-1 h-14">
          <span className="text-white font-bold text-sm mr-4 hidden sm:block whitespace-nowrap">
            📋 Smart Attendance
          </span>
          <nav className="flex gap-1 overflow-x-auto scrollbar-hide flex-1">
            {navItems.map(item => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    active
                      ? 'bg-white/10 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}