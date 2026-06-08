import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ListTodo, BarChart3 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import SmartPlanner from './SmartPlanner';
import DailyTasks from './DailyTasks';
import PlannerDashboard from './PlannerDashboard';

const TABS = [
  { id: 'dashboard', label: 'Progress', icon: BarChart3 },
  { id: 'tasks',     label: 'Daily Tasks', icon: ListTodo },
  { id: 'planner',   label: 'Smart Planner', icon: Brain },
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[#3D52A0] font-black text-2xl">Revision Planner</h2>
          <p className="text-[#8697C4] text-sm mt-0.5">AI-powered scheduling · daily tasks · progress tracking</p>
        </div>
        {todayDue > 0 && (
          <button onClick={() => setActiveTab('tasks')}
            className="flex items-center gap-2 bg-[#7091E6]/15 border border-[#7091E6]/30 rounded-xl px-3 py-2 hover:bg-[#7091E6]/25 transition-all">
            <div className="w-2 h-2 bg-[#7091E6] rounded-full animate-pulse" />
            <span className="text-[#3D52A0] text-sm font-semibold">{todayDue} due today</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white/30 backdrop-blur-md border border-white/25 rounded-2xl p-1 shadow-sm">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-white/60 text-[#3D52A0] shadow-sm border border-white/40'
                : 'text-[#8697C4] hover:text-[#3D52A0] hover:bg-white/20'
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