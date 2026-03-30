import React from 'react';
import { Switch } from '@/components/ui/switch';
import { motion } from 'framer-motion';
import GlassCard from '@/components/ui/GlassCard';
import { Eye, EyeOff, Pencil } from 'lucide-react';

/**
 * Props:
 *   students                – array of User objects
 *   studentVisibility       – { [email]: boolean }  (default true)
 *   onStudentVisibilityChange – (email, bool) => void
 *   studentEdit             – { [email]: boolean }  (default false)
 *   onStudentEditChange     – (email, bool) => void
 *   showToAll               – boolean (global visibility toggle)
 *   onToggleShowToAll       – (bool) => void
 */
export default function WhiteboardPermissions({
  students,
  studentVisibility = {},
  onStudentVisibilityChange,
  studentEdit = {},
  onStudentEditChange,
  showToAll,
  onToggleShowToAll,
}) {
  return (
    <GlassCard className="p-4">
      <div className="space-y-4">

        {/* Global visibility toggle */}
        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
          <div>
            <p className="font-semibold text-white text-sm flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-400" />
              Show whiteboard to all students
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Master visibility switch</p>
          </div>
          <Switch checked={showToAll ?? true} onCheckedChange={onToggleShowToAll} />
        </div>

        {/* Per-student table */}
        <div>
          {/* Header row */}
          <div className="grid grid-cols-[1fr_56px_56px] gap-2 px-3 pb-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Student</p>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide text-center">View</p>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide text-center">Edit</p>
          </div>

          <div className="space-y-1">
            {students.map((student, idx) => {
              const globalOff = !(showToAll ?? true);
              const canView = !globalOff && (studentVisibility[student.email] ?? true);
              const canEdit = canView && (studentEdit[student.email] ?? false);

              return (
                <motion.div
                  key={student.email}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="grid grid-cols-[1fr_56px_56px] gap-2 items-center px-3 py-2.5 bg-white/[0.03] hover:bg-white/[0.07] rounded-lg border border-white/10 transition-all"
                >
                  {/* Name */}
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {student.full_name || student.email.split('@')[0]}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{student.email}</p>
                  </div>

                  {/* View toggle */}
                  <div className="flex flex-col items-center gap-1">
                    <Switch
                      checked={canView}
                      disabled={globalOff}
                      onCheckedChange={(val) => {
                        onStudentVisibilityChange?.(student.email, val);
                        // If hiding, also remove edit
                        if (!val) onStudentEditChange?.(student.email, false);
                      }}
                    />
                    <span className={`text-[10px] font-medium ${canView ? 'text-blue-400' : 'text-slate-500'}`}>
                      {canView ? 'ON' : 'OFF'}
                    </span>
                  </div>

                  {/* Edit toggle */}
                  <div className="flex flex-col items-center gap-1">
                    <Switch
                      checked={canEdit}
                      disabled={!canView}
                      onCheckedChange={(val) => onStudentEditChange?.(student.email, val)}
                    />
                    <span className={`text-[10px] font-medium ${canEdit ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {canEdit ? 'ON' : 'OFF'}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {students.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-6">No students in this class yet</p>
          )}
        </div>
      </div>
    </GlassCard>
  );
}