import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  Users, BookOpen, ClipboardCheck, AlertTriangle,
  TrendingDown, BarChart3
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import AttendanceNav from '@/components/attendance/AttendanceNav';

export default function AttendanceDashboard() {
  const { data: students = [] } = useQuery({
    queryKey: ['att-students'],
    queryFn: () => base44.entities.AttendanceStudent.list()
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['att-classes'],
    queryFn: () => base44.entities.AttendanceClass.list()
  });

  const { data: records = [] } = useQuery({
    queryKey: ['att-records-all'],
    queryFn: () => base44.entities.AttendanceRecord.list('-marked_at', 500)
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['att-sessions-all'],
    queryFn: () => base44.entities.AttendanceSession.list('-date', 200)
  });

  // Per-student stats
  const studentStats = students.map(s => {
    const studentRecords = records.filter(r => r.student_id === s.id);
    const total = studentRecords.length;
    const present = studentRecords.filter(r => r.status === 'present').length;
    const late = studentRecords.filter(r => r.status === 'late').length;
    const absent = studentRecords.filter(r => r.status === 'absent').length;
    const pct = total > 0 ? Math.round(((present + late) / total) * 100) : null;

    // Absences in last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentAbsences = studentRecords.filter(r =>
      r.status === 'absent' && r.date && new Date(r.date) >= weekAgo
    ).length;

    const lateCount = studentRecords.filter(r => r.status === 'late').length;

    return { ...s, total, present, late, absent, pct, recentAbsences, lateCount };
  });

  const alerts = studentStats.filter(s => s.recentAbsences >= 3 || s.lateCount >= 5);
  const lowAttendance = studentStats.filter(s => s.pct !== null && s.pct < 80).sort((a, b) => a.pct - b.pct);

  // Class chart data
  const classChartData = classes.map(c => {
    const classRecords = records.filter(r => r.class_id === c.id);
    const total = classRecords.length;
    const present = classRecords.filter(r => r.status === 'present' || r.status === 'late').length;
    const pct = total > 0 ? Math.round((present / total) * 100) : 0;
    return { name: c.name.length > 14 ? c.name.slice(0, 14) + '…' : c.name, pct };
  });

  const overallPct = records.length > 0
    ? Math.round((records.filter(r => r.status === 'present' || r.status === 'late').length / records.length) * 100)
    : 0;

  const todaySessions = sessions.filter(s => s.date === new Date().toISOString().split('T')[0]);

  const statCards = [
    { label: 'Students', value: students.length, icon: Users, color: 'from-blue-500 to-cyan-500', shadow: 'shadow-blue-500/30' },
    { label: 'Classes', value: classes.length, icon: BookOpen, color: 'from-purple-500 to-violet-500', shadow: 'shadow-purple-500/30' },
    { label: 'Overall Attendance', value: records.length > 0 ? `${overallPct}%` : '—', icon: ClipboardCheck, color: 'from-emerald-500 to-teal-500', shadow: 'shadow-emerald-500/30' },
    { label: 'Active Alerts', value: alerts.length, icon: AlertTriangle, color: 'from-red-500 to-rose-500', shadow: 'shadow-red-500/30' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <AttendanceNav />
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">Dashboard</h1>
          <p className="text-slate-400 text-sm">{new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </motion.div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((card, i) => (
            <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <div className={`bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm shadow-lg ${card.shadow}`}>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-3 shadow-lg`}>
                  <card.icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-2xl font-bold text-white">{card.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{card.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link to="/att-register">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white cursor-pointer hover:scale-[1.02] transition-transform shadow-lg shadow-emerald-500/30">
                <ClipboardCheck className="w-6 h-6 mb-2" />
                <p className="font-bold text-sm">Take Register</p>
                <p className="text-xs text-emerald-100 mt-0.5">Mark attendance</p>
              </div>
            </Link>
            <Link to="/att-students">
              <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl p-5 text-white cursor-pointer hover:scale-[1.02] transition-transform shadow-lg shadow-blue-500/30">
                <Users className="w-6 h-6 mb-2" />
                <p className="font-bold text-sm">Students</p>
                <p className="text-xs text-blue-100 mt-0.5">Manage students</p>
              </div>
            </Link>
            <Link to="/att-classes">
              <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl p-5 text-white cursor-pointer hover:scale-[1.02] transition-transform shadow-lg shadow-purple-500/30">
                <BookOpen className="w-6 h-6 mb-2" />
                <p className="font-bold text-sm">Classes</p>
                <p className="text-xs text-purple-100 mt-0.5">Manage classes</p>
              </div>
            </Link>
            <Link to="/att-analytics">
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white cursor-pointer hover:scale-[1.02] transition-transform shadow-lg shadow-amber-500/30">
                <BarChart3 className="w-6 h-6 mb-2" />
                <p className="font-bold text-sm">Analytics</p>
                <p className="text-xs text-amber-100 mt-0.5">View reports</p>
              </div>
            </Link>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Alerts */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <h2 className="text-white font-bold">Attendance Alerts</h2>
                {alerts.length > 0 && <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{alerts.length}</span>}
              </div>
              {alerts.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-6">No active alerts 🎉</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {alerts.map(s => (
                    <div key={s.id} className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-white text-sm font-medium">{s.name}</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {s.recentAbsences >= 3 && (
                            <span className="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full">{s.recentAbsences} absences this week</span>
                          )}
                          {s.lateCount >= 5 && (
                            <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">{s.lateCount} lates overall</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Low Attendance */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown className="w-5 h-5 text-amber-400" />
                <h2 className="text-white font-bold">Low Attendance (&lt;80%)</h2>
              </div>
              {lowAttendance.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-6">All students above 80% 👍</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {lowAttendance.slice(0, 8).map(s => (
                    <div key={s.id} className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${s.pct < 60 ? 'bg-red-500' : 'bg-amber-500'}`}>
                        {s.pct}%
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{s.name}</p>
                        <p className="text-slate-400 text-xs">{s.absent} absences • {s.total} sessions</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Class Attendance Bar Chart */}
        {classChartData.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
              <h2 className="text-white font-bold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-400" /> Class Attendance Overview
              </h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={classChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }}
                    formatter={(v) => [`${v}%`, 'Attendance']}
                  />
                  <Bar dataKey="pct" radius={[6, 6, 0, 0]}>
                    {classChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.pct >= 80 ? '#10b981' : entry.pct >= 60 ? '#f59e0b' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}