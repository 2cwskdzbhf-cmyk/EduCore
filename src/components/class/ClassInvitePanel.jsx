import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import GlassCard from '@/components/ui/GlassCard';
import { Copy, Check, Plus, Trash2, QrCode, Link2, Clock, Users, X } from 'lucide-react';
import QRCodeDisplay from './QRCodeDisplay';

function generateToken() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let t = '';
  for (let i = 0; i < 16; i++) t += chars[Math.floor(Math.random() * chars.length)];
  return t;
}

const EXPIRY_OPTIONS = [
  { label: 'Never', value: null },
  { label: '1 hour', value: 60 },
  { label: '24 hours', value: 60 * 24 },
  { label: '7 days', value: 60 * 24 * 7 },
  { label: '30 days', value: 60 * 24 * 30 },
];

export default function ClassInvitePanel({ classId, classData }) {
  const queryClient = useQueryClient();
  const [copiedToken, setCopiedToken] = useState(null);
  const [qrToken, setQrToken] = useState(null);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState('');
  const [expiryMinutes, setExpiryMinutes] = useState(null);
  const [maxUses, setMaxUses] = useState('');

  const { data: invites = [] } = useQuery({
    queryKey: ['classInvites', classId],
    queryFn: () => base44.entities.ClassInvite.filter({ class_id: classId }, '-created_date'),
    enabled: !!classId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const token = generateToken();
      const expires_at = expiryMinutes
        ? new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString()
        : null;
      return base44.entities.ClassInvite.create({
        class_id: classId,
        class_name: classData?.name || '',
        token,
        created_by: classData?.teacher_email || '',
        expires_at,
        max_uses: maxUses ? parseInt(maxUses) : null,
        use_count: 0,
        is_active: true,
        label: label.trim() || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['classInvites', classId]);
      setCreating(false);
      setLabel('');
      setExpiryMinutes(null);
      setMaxUses('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ClassInvite.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['classInvites', classId]),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.ClassInvite.update(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries(['classInvites', classId]),
  });

  const copyLink = (token) => {
    const url = `${window.location.origin}/JoinClass?invite=${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const isExpired = (invite) => {
    if (!invite.expires_at) return false;
    return new Date(invite.expires_at) < new Date();
  };

  const isMaxed = (invite) => {
    if (!invite.max_uses) return false;
    return invite.use_count >= invite.max_uses;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Invite Links</h2>
          <p className="text-slate-400 text-sm mt-0.5">Generate shareable links students can use to join</p>
        </div>
        {!creating && (
          <Button onClick={() => setCreating(true)} className="bg-gradient-to-r from-purple-500 to-blue-500">
            <Plus className="w-4 h-4 mr-2" /> New Invite Link
          </Button>
        )}
      </div>

      {/* Class join code reminder */}
      <GlassCard className="p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
          <Link2 className="w-4 h-4 text-slate-300" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-slate-400">Class Join Code (permanent)</p>
          <p className="text-white font-mono font-bold tracking-widest text-lg">{classData?.join_code}</p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(classData?.join_code); }}
          className="text-slate-400 hover:text-white">
          <Copy className="w-4 h-4" />
        </Button>
      </GlassCard>

      {/* Create form */}
      <AnimatePresence>
        {creating && (
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
            <GlassCard className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold">Create Invite Link</h3>
                <button onClick={() => setCreating(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Label (optional)</label>
                <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Morning class invite"
                  className="bg-white/5 border-white/10 text-white" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Expires after</label>
                  <div className="flex flex-wrap gap-1.5">
                    {EXPIRY_OPTIONS.map(opt => (
                      <button key={String(opt.value)} onClick={() => setExpiryMinutes(opt.value)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                          expiryMinutes === opt.value
                            ? 'bg-purple-500 text-white'
                            : 'bg-white/5 text-slate-400 hover:text-white'
                        }`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Max uses (blank = unlimited)</label>
                  <Input type="number" value={maxUses} onChange={e => setMaxUses(e.target.value)} placeholder="e.g. 30"
                    min="1" className="bg-white/5 border-white/10 text-white" />
                </div>
              </div>

              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}
                className="w-full bg-gradient-to-r from-purple-500 to-blue-500">
                {createMutation.isPending ? 'Creating...' : '🔗 Generate Link'}
              </Button>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invites list */}
      <div className="space-y-3">
        {invites.length === 0 && !creating && (
          <GlassCard className="p-10 text-center">
            <Link2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No invite links yet. Create one to share with students.</p>
          </GlassCard>
        )}

        {invites.map(invite => {
          const expired = isExpired(invite);
          const maxed = isMaxed(invite);
          const invalid = !invite.is_active || expired || maxed;

          return (
            <GlassCard key={invite.id} className={`p-4 ${invalid ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  invalid ? 'bg-slate-700' : 'bg-gradient-to-br from-purple-500 to-blue-500'
                }`}>
                  <Link2 className="w-4 h-4 text-white" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-white font-medium text-sm truncate">{invite.label || 'Invite Link'}</p>
                    {expired && <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">Expired</span>}
                    {maxed && <span className="text-xs px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">Maxed out</span>}
                    {!invite.is_active && !expired && !maxed && <span className="text-xs px-1.5 py-0.5 rounded bg-slate-500/30 text-slate-400">Disabled</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {invite.use_count || 0}{invite.max_uses ? `/${invite.max_uses}` : ''} uses</span>
                    {invite.expires_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {expired ? 'Expired' : `Expires ${new Date(invite.expires_at).toLocaleDateString()}`}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => setQrToken(qrToken === invite.token ? null : invite.token)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Show QR code">
                    <QrCode className="w-4 h-4" />
                  </button>
                  <button onClick={() => copyLink(invite.token)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                    {copiedToken === invite.token ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button onClick={() => toggleMutation.mutate({ id: invite.id, is_active: !invite.is_active })}
                    className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                      invite.is_active ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-slate-500 hover:bg-white/10'
                    }`}>
                    {invite.is_active ? '●' : '○'}
                  </button>
                  <button onClick={() => deleteMutation.mutate(invite.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {qrToken === invite.token && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-4 overflow-hidden">
                    <QRCodeDisplay value={`${window.location.origin}/JoinClass?invite=${invite.token}`} />
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}