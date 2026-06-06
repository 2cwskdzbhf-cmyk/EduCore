import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CalendarDays, CheckSquare, BarChart2, RefreshCw, Plus } from 'lucide-react';
import SmartPlannerSetup from './SmartPlannerSetup';
import DailyTasks from './DailyTasks';
import PlannerDashboard from './PlannerDashboard';

const TABS = [
  { id: 'tasks', label: 'Daily Tasks', icon: CheckSquare },
  { id: 'dashboard', label: 'Progress', icon: BarChart2 },
  { id: 'planner', label: 'Edit Plan', icon: CalendarDays },
];

export default function RevisionPlanner({ user, notebooks }) {
  const [activeTab, setActiveTab] = useState('tasks');
  const qc = useQueryClient();

  const { data: plans = [], refetch: refetchPlan } = useQuery({
    queryKey: ['revisionPlan', user?.email],
    queryFn: () => base44.entities.RevisionPlan.filter({ student_email: user.email }, '-created_date', 1),
    enabled: !!user?.email,
  });
  const plan = plans[0] || null;

  const { data: tasks = [], refetch: refetchTasks } = useQuery({
    queryKey: ['revisionTasks', plan?.id],
    queryFn: () => base44.entities.RevisionTask.filter({ plan_id: plan.id }, 'date'),
    enabled: !!plan?.id,
  });

  const handleRefresh = () => {
    refetchPlan();
    refetchTasks();
    qc.invalidateQueries(['revisionPlan', user?.email]);
    qc.invalidateQueries(['revisionTasks', plan?.id]);
  };

  const handlePlanGenerated = (newPlan) => {
    refetchPlan();
    setTimeout(() => {
      refetchTasks();
      setActiveTab('tasks');
    }, 500);
  };

  // No plan yet — show setup
  if (!plan) {
    return (
      <div className="py-8 px-4">
        <SmartPlannerSetup user={user} notebooks={notebooks} existingPlan={null} onPlanGenerated={handlePlanGenerated} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white">Revision Planner</h2>
          <p className="text-slate-400 text-xs mt-0.5">
            {plan.subjects?.length || 0} subject{plan.subjects?.length !== 1 ? 's' : ''} · {tasks.length} tasks scheduled
          </p>
        </div>
        <button onClick={handleRefresh} className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 bg-white/5 rounded-2xl p-1 border border-white/10">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-violet-500/30 text-violet-300 border border-violet-500/40'
                : 'text-slate-400 hover:text-white'
            }`}>
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'tasks' && (
          <motion.div key="tasks" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <DailyTasks tasks={tasks} plan={plan} onRefresh={handleRefresh} />
          </motion.div>
        )}
        {activeTab === 'dashboard' && (
          <motion.div key="dashboard" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <PlannerDashboard tasks={tasks} plan={plan} />
          </motion.div>
        )}
        {activeTab === 'planner' && (
          <motion.div key="planner" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <SmartPlannerSetup user={user} notebooks={notebooks} existingPlan={plan} onPlanGenerated={handlePlanGenerated} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}