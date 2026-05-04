import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Users, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/ui/GlassCard';

export default function StudentsTab({ classData, classStudents, studentEmails, onRemove }) {
  const [search, setSearch] = useState('');

  // Build the full list: use classStudents (User entities) merged with raw emails
  const allStudents = studentEmails.map(email => {
    const match = classStudents.find(u => u.email === email);
    return match || { email, full_name: null, id: email };
  });

  const filtered = allStudents.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (s.full_name || '').toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Students</h2>
        <span className="text-slate-400 text-sm">{studentEmails.length} enrolled</span>
      </div>

      {/* Search */}
      {studentEmails.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search students..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50"
          />
        </div>
      )}

      {studentEmails.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-2">No students yet</p>
          <p className="text-slate-500 text-sm">
            Share the join code <span className="text-white font-bold font-mono">{classData.join_code}</span> for students to enroll.
          </p>
        </GlassCard>
      ) : filtered.length === 0 ? (
        <p className="text-slate-500 text-center py-8">No students match your search.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((student, idx) => {
            const displayName = student.full_name || student.email.split('@')[0];
            const initial = displayName.charAt(0).toUpperCase();
            return (
              <motion.div key={student.email} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }}
                className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
                    {student.avatar_url
                      ? <img src={student.avatar_url} alt="" className="w-full h-full object-cover" />
                      : initial}
                  </div>
                  <div>
                    <p className="text-white font-medium">{displayName}</p>
                    <p className="text-xs text-slate-400">{student.email}</p>
                    {student.user_type && (
                      <span className="text-xs text-slate-500 capitalize">{student.user_type}</span>
                    )}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => onRemove(student)}
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Remove
                </Button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}