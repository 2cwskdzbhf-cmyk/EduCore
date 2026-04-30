import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import GlassCard from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Check, X, Clock, Users, UserCheck } from 'lucide-react';

export default function ClassJoinRequestsPanel({ classId, classData }) {
  const queryClient = useQueryClient();

  const { data: requests = [] } = useQuery({
    queryKey: ['classJoinRequests', classId],
    queryFn: () => base44.entities.ClassJoinRequest.filter({ class_id: classId }, '-created_date'),
    enabled: !!classId,
    refetchInterval: 10000,
  });

  const approveMutation = useMutation({
    mutationFn: async (req) => {
      // Add student to class
      const currentEmails = classData?.student_emails || [];
      if (!currentEmails.includes(req.student_email)) {
        await base44.entities.Class.update(classId, {
          student_emails: [...currentEmails, req.student_email],
        });
      }
      // Mark approved
      await base44.entities.ClassJoinRequest.update(req.id, {
        status: 'approved',
        reviewed_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['classJoinRequests', classId]);
      queryClient.invalidateQueries(['class', classId]);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.ClassJoinRequest.update(id, {
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
      });
    },
    onSuccess: () => queryClient.invalidateQueries(['classJoinRequests', classId]),
  });

  const pending = requests.filter(r => r.status === 'pending');
  const reviewed = requests.filter(r => r.status !== 'pending');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Join Requests</h2>
        <p className="text-slate-400 text-sm mt-0.5">
          {pending.length > 0
            ? `${pending.length} student${pending.length > 1 ? 's' : ''} waiting for approval`
            : 'No pending requests'}
        </p>
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-amber-400 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Pending Approval
          </p>
          {pending.map(req => (
            <motion.div key={req.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <GlassCard className="p-4 border-amber-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                    {(req.student_name || req.student_email).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium">{req.student_name || req.student_email.split('@')[0]}</p>
                    <p className="text-xs text-slate-500">{req.student_email}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Requested {new Date(req.created_date).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => approveMutation.mutate(req)}
                      disabled={approveMutation.isPending}
                      className="bg-emerald-500 hover:bg-emerald-600 h-8 px-3">
                      <Check className="w-3.5 h-3.5 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => rejectMutation.mutate(req.id)}
                      disabled={rejectMutation.isPending}
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-8 px-3">
                      <X className="w-3.5 h-3.5 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      {/* Reviewed */}
      {reviewed.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-500 flex items-center gap-2">
            <UserCheck className="w-4 h-4" /> Recently Reviewed
          </p>
          {reviewed.slice(0, 10).map(req => (
            <div key={req.id} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${req.status === 'approved' ? 'bg-emerald-400' : 'bg-red-400'}`} />
              <p className="text-white text-sm flex-1">{req.student_name || req.student_email.split('@')[0]}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${req.status === 'approved' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                {req.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {pending.length === 0 && reviewed.length === 0 && (
        <GlassCard className="p-10 text-center">
          <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No join requests yet.</p>
          <p className="text-slate-500 text-sm mt-1">When approval mode is on, students will appear here.</p>
        </GlassCard>
      )}
    </div>
  );
}