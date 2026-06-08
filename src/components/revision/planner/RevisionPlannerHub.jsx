import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ListTodo, BarChart3, Calendar } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import SmartPlanner from './SmartPlanner';
import DailyTasks from './DailyTasks';
import PlannerDashboard from './PlannerDashboard';
import PlanCalendar from './PlanCalendar';

const TABS = [
  { id: 'dashboard', label: 'Progress', icon: BarChart3 },
  { id: 'tasks',     label: 'Daily Tasks', icon: ListTodo },
  { id: 'calendar',  label: 'Calendar', icon: Calendar },
  { id: 'planner',   label: 'Plan Setup', icon: Brain },
];

export default function RevisionPlannerHub({ user }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const qc = useQueryClient();

  const { data: plans = [] } = useQuery({
    queryKey: ['revisionPlan', user?.email],
    queryFn: () => base44.entities.RevisionPlan.filter({ student_email: user.email }),
    enabled: !!user?.email,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['revisionTasks', user?.email],
    queryFn: () => base44.entities.RevisionTask.filter({ student_email: user.email }, 'date'),
    enabled: !!user?.email,
  });

  const plan = plans[0] || null;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['revisionPlan', user?.email] });
    qc.invalidateQueries({ queryKey: ['revisionTasks', user?.email] });
  };

  const handlePlanSaved = () => {
    refresh();
    setActiveTab('tasks');
  };

  const todayDue = tasks.filter(t => {
    const today = new Date().toISOString().split('T')[0];
    return t.date === today && t.status !== 'completed';
  }).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-black text-2xl text-[#3D52A0]">Revision Planner</h2>
          <p className="text-[#8697C4] text-sm mt-0.5">AI-powered · personalised schedule · progress tracking</p>
        </div>
        {todayDue > 0 && (
          <button onClick={() => setActiveTab('tasks')}
            className="flex items-center gap-2 rounded-xl px-3 py-2 transition-all hover:opacity-80"
            style={{ background: 'rgba(112,145,230,0.2)', border: '1px solid rgba(112,145,230,0.4)' }}>
            <div className="w-2 h-2 bg-[#7091E6] rounded-full animate-pulse" />
            <span className="text-[#3D52A0] text-sm font-bold">{todayDue} due today</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === tab.id
                ? 'text-white shadow-md'
                : 'text-[#8697C4] hover:text-[#3D52A0]'
            }`}
            style={activeTab === tab.id ? { background: 'linear-gradient(135deg,#7091E6,#3D52A0)' } : {}}>
            <tab.icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'dashboard' && (
          <motion.div key="dashboard" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <PlannerDashboard tasks={tasks} plan={plan} />
          </motion.div>
        )}
        {activeTab === 'tasks' && (
          <motion.div key="tasks" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <DailyTasks user={user} tasks={tasks} plan={plan} onRefresh={refresh} />
          </motion.div>
        )}
        {activeTab === 'calendar' && (
          <motion.div key="calendar" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <PlanCalendar tasks={tasks} plan={plan} onSelectDate={() => setActiveTab('tasks')} />
          </motion.div>
        )}
        {activeTab === 'planner' && (
          <motion.div key="planner" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <SmartPlanner user={user} plan={plan} onPlanSaved={handlePlanSaved} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}