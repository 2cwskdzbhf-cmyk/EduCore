import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ListTodo, BarChart3 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import SmartPlanner from './SmartPlanner';
import DailyTasks from './DailyTasks';
import PlannerDashboard from './PlannerDashboard';

const TABS = [
  { id: 'dashboard', label: 'Progress Dashboard', icon: BarChart3 },
  { id: 'tasks', label: 'Daily Tasks', icon: ListTodo },
  { id: 'planner', label: 'Smart Planner', icon: Brain },
];

export default function RevisionPlannerHub({ user }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const qc = useQueryClient();

  const { data: plans = [] } = useQuery({
    queryKey: ['revisionPlan', user?.email],
    queryFn: () => base44.entities.RevisionPlan.filter({ student_email: user.email }),
    enabled: !!user?.email,
  });

  const { data: tasks = [], refetch: refetchTasks } = useQuery({
    queryKey: ['revisionTasks', user?.email],
    queryFn: () => base44.entities.RevisionTask.filter({ student_email: user.email }, 'date'),
    enabled: !!user?.email,
  });

  const plan = plans[0] || null;

  const handlePlanSaved = () => {
    qc.invalidateQueries({ queryKey: ['revisionPlan', user?.email] });
    qc.invalidateQueries({ queryKey: ['revisionTasks', user?.email] });
    setActiveTab('tasks');
  };

  const todayDue = tasks.filter(t => {
    const today = new Date().toISOString().split('T')[0];
    return t.date === today && t.status !== 'completed';
  }).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-black text-2xl">Revision Planner</h2>
          <p className="text-slate-400 text-sm mt-0.5">AI-powered timetable · daily tasks · progress tracking</p>
        </div>
        {todayDue > 0 && (
          <div className="flex items-center gap-2 bg-violet-500/20 border border-violet-500/30 rounded-xl px-3 py-2">
            <div className="w-2 h-2 bg-violet-400 rounded-full animate-pulse" />
            <span className="text-violet-300 text-sm font-semibold">{todayDue} tasks due today</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white/5 border border-white/10 rounded-2xl p-1">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                : 'text-slate-400 hover:text-white'
            }`}>
            <tab.icon className="w-4 h-4" />
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
            <DailyTasks user={user} tasks={tasks} plan={plan} onRefresh={() => {
              qc.invalidateQueries({ queryKey: ['revisionTasks', user?.email] });
              qc.invalidateQueries({ queryKey: ['revisionPlan', user?.email] });
            }} />
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