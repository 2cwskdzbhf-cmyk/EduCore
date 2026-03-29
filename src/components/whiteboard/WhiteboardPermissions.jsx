import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { motion } from 'framer-motion';
import GlassCard from '@/components/ui/GlassCard';
import { Users, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function WhiteboardPermissions({
  students,
  permissions,
  onPermissionChange,
  allowAllEdits,
  onToggleAllEdits
}) {
  return (
    <GlassCard className="p-4">
      <div className="space-y-4">
        {/* Select All Button */}
        <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
          <div>
            <p className="font-semibold text-white text-sm flex items-center gap-2">
              <Users className="w-4 h-4" />
              Allow All Students to Edit
            </p>
            <p className="text-xs text-slate-400 mt-1">Enable editing for everyone at once</p>
          </div>
          <Switch
            checked={allowAllEdits}
            onCheckedChange={onToggleAllEdits}
          />
        </div>

        {/* Individual Student Permissions */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Student Permissions</p>
          {students.map((student, idx) => {
            const hasAccess = allowAllEdits || permissions[student.email];
            return (
              <motion.div
                key={student.email}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center justify-between p-3 bg-white/[0.03] hover:bg-white/[0.08] rounded-lg border border-white/10 transition-all"
              >
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{student.full_name || student.email}</p>
                  <p className="text-xs text-slate-400">{student.email}</p>
                </div>

                <div className="flex items-center gap-2">
                  {hasAccess ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-400 px-2 py-1 bg-emerald-500/20 rounded-full">
                      <Check className="w-3 h-3" />
                      Can Edit
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-slate-400 px-2 py-1 bg-white/5 rounded-full">
                      <X className="w-3 h-3" />
                      View Only
                    </span>
                  )}

                  {!allowAllEdits && (
                    <Button
                      size="sm"
                      onClick={() => onPermissionChange(student.email, !permissions[student.email])}
                      variant="outline"
                      className={cn(
                        'border-0 h-8 px-3 text-xs font-medium transition-all',
                        permissions[student.email]
                          ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                          : 'bg-white/10 text-slate-300 hover:bg-white/20'
                      )}
                    >
                      {permissions[student.email] ? 'Revoke' : 'Allow'}
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {students.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-4">No students in this session</p>
        )}
      </div>
    </GlassCard>
  );
}