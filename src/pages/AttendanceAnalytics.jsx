import React, { useState } from 'react';
import AttendanceNav from '@/components/attendance/AttendanceNav';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ChevronLeft, Download, BarChart3, TrendingDown, CheckCircle2, Clock, XCircle, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

const STATUS_COLORS = { present: '#10b981', late: '#f59e0b', absent: '#ef4444' };

export default function AttendanceAnalytics() {
  const [selectedClass, setSelectedClass] = useState('');

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
    queryFn: () => base44.entities.AttendanceRecord.list('-date', 1000)
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['att-sessions-all'],
    queryFn: () => base44.entities.AttendanceSession.list()
  });

  const filteredRecords = selectedClass ? records.filter(r => r.class_id === selectedClass) : records;

  // Student stats
  const studentStats = students.map(s => {
    const recs = filteredRecords.filter(r => r.student_id === s.id);
    const total = recs.length;
    const present = recs.filter(r => r.status === 'present').length;
    const late = recs.filter(r => r.status === 'late').length;
    const absent = recs.filter(r => r.status === 'absent').length;
    const pct = total > 0 ? Math.round(((present + late) / total) * 100) : null;
    return { ...s, total, present, late, absent, pct };
  }).filter(s => s.total > 0).sort((a, b) => (a.pct ?? 100) - (b.pct ?? 100));

  // Pie chart data
  const totalPresent = filteredRecords.filter(r => r.status === 'present').length;
  const totalLate = filteredRecords.filter(r => r.status === 'late').length;
  const totalAbsent = filteredRecords.filter(r => r.status === 'absent').length;
  const pieData = [
    { name: 'Present', value: totalPresent, color: '#10b981' },
    { name: 'Late', value: totalLate, color: '#f59e0b' },
    { name: 'Absent', value: totalAbsent, color: '#ef4444' },
  ].filter(d => d.value > 0);

  // Bar chart: attendance by student
  const barData = studentStats.slice(0, 20).map(s => ({
    name: s.name.split(' ')[0],
    pct: s.pct ?? 0,
    absent: s.absent
  }));

  // CSV Export
  const exportCSV = () => {
    const classMap = {};
    classes.forEach(c => { classMap[c.id] = c.name; });
    const studentMap = {};
    students.forEach(s => { studentMap[s.id] = s; });
    const sessionMap = {};
    sessions.forEach(s => { sessionMap[s.id] = s; });

    const rows = [['Student Name', 'Student ID', 'Date', 'Period', 'Status']];
    filteredRecords.forEach(r => {
      const st = studentMap[r.student_id];
      rows.push([
        st?.name || r.student_name || '',
        st?.student_id || '',
        r.date || '',
        r.period || '',
        r.status || ''
      ]);
    });

    const csv = rows.map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${selectedClass ? classes.find(c => c.id === selectedClass)?.name.replace(/\s/g, '_') : 'all'}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const overallPct = filteredRecords.length > 0
    ? Math.round(((totalPresent + totalLate) / filteredRecords.length) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <AttendanceNav />
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">Analytics & Reports</h1>
            <p className="text-slate-400 text-sm">View and export attendance data</p>
          </div>
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-medium rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-500/30">
            <Download className="w-4 h-4" /> Export for SOCS
          </button>
        </div>

        {/* Filter */}
        <div className="mb-6">
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 min-w-[200px]">
            <option value="">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Overall', value: filteredRecords.length > 0 ? `${overallPct}%` : '—', color: 'text-white', sub: 'attendance rate' },
            { label: 'Present', value: totalPresent, color: 'text-emerald-400', sub: 'sessions' },
            { label: 'Late', value: totalLate, color: 'text-amber-400', sub: 'sessions' },
            { label: 'Absent', value: totalAbsent, color: 'text-red-400', sub: 'sessions' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-slate-400 text-xs mt-1">{s.label}</p>
                <p className="text-slate-600 text-xs">{s.sub}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Pie chart */}
          {pieData.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <h2 className="text-white font-bold mb-4">Overall Breakdown</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          {/* Student attendance bar */}
          {barData.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <h2 className="text-white font-bold mb-4">Attendance by Student</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} domain={[0, 100]} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} formatter={(v) => [`${v}%`, 'Attendance']} />
                    <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                      {barData.map((entry, i) => (
                        <Cell key={i} fill={entry.pct >= 90 ? '#10b981' : entry.pct >= 80 ? '#3b82f6' : entry.pct >= 60 ? '#f59e0b' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}
        </div>

        {/* Student table */}
        {studentStats.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-white/10">
                <h2 className="text-white font-bold">Student Breakdown</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left text-xs text-slate-400 font-medium px-5 py-3">Student</th>
                      <th className="text-center text-xs text-slate-400 font-medium px-3 py-3">Sessions</th>
                      <th className="text-center text-xs text-slate-400 font-medium px-3 py-3">Present</th>
                      <th className="text-center text-xs text-slate-400 font-medium px-3 py-3">Late</th>
                      <th className="text-center text-xs text-slate-400 font-medium px-3 py-3">Absent</th>
                      <th className="text-right text-xs text-slate-400 font-medium px-5 py-3">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentStats.map((s, i) => (
                      <tr key={s.id} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${s.pct < 80 ? 'bg-red-500/5' : ''}`}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            {s.pct < 80 && <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
                            <div>
                              <p className="text-white text-sm font-medium">{s.name}</p>
                              <p className="text-slate-500 text-xs">{s.student_id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center text-slate-300 text-sm">{s.total}</td>
                        <td className="px-3 py-3 text-center text-emerald-400 text-sm font-medium">{s.present}</td>
                        <td className="px-3 py-3 text-center text-amber-400 text-sm font-medium">{s.late}</td>
                        <td className="px-3 py-3 text-center text-red-400 text-sm font-medium">{s.absent}</td>
                        <td className="px-5 py-3 text-right">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                            s.pct >= 90 ? 'bg-emerald-500/20 text-emerald-400' :
                            s.pct >= 80 ? 'bg-blue-500/20 text-blue-400' :
                            s.pct >= 60 ? 'bg-amber-500/20 text-amber-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {s.pct}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {filteredRecords.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">No attendance data yet</p>
            <p className="text-sm mt-1">Start taking registers to see analytics here</p>
            <Link to="/att-register" className="mt-4 inline-block px-4 py-2 bg-purple-500 text-white text-sm rounded-xl hover:bg-purple-600 transition-colors">Take Register</Link>
          </div>
        )}
      </div>
    </div>
  );
}