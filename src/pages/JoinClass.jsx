import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import GlassCard from '@/components/ui/GlassCard';
import { Loader2, CheckCircle2, Clock, XCircle } from 'lucide-react';

export default function JoinClass() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const inviteToken = urlParams.get('invite');
  const joinCodeParam = urlParams.get('code');

  const [user, setUser] = useState(null);
  const [joinCode, setJoinCode] = useState(joinCodeParam || '');
  const [status, setStatus] = useState('idle'); // idle | loading | success | pending | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  // Auto-process invite token from URL
  useEffect(() => {
    if (inviteToken && user) {
      handleInviteToken(inviteToken);
    }
  }, [inviteToken, user]);

  const handleInviteToken = async (token) => {
    setStatus('loading');
    try {
      const invites = await base44.entities.ClassInvite.filter({ token, is_active: true });
      if (!invites.length) {
        setStatus('error');
        setMessage('This invite link is invalid or has been deactivated.');
        return;
      }

      const invite = invites[0];

      // Check expiry
      if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        setStatus('error');
        setMessage('This invite link has expired.');
        return;
      }

      // Check max uses
      if (invite.max_uses && invite.use_count >= invite.max_uses) {
        setStatus('error');
        setMessage('This invite link has reached its maximum number of uses.');
        return;
      }

      const classes = await base44.entities.Class.filter({ id: invite.class_id });
      const classData = classes[0];
      if (!classData) {
        setStatus('error');
        setMessage('Class not found.');
        return;
      }

      // Already enrolled?
      if ((classData.student_emails || []).includes(user.email)) {
        navigate(createPageUrl(`StudentClassDetail?classId=${classData.id}`));
        return;
      }

      if (classData.require_join_approval) {
        // Check for existing request
        const existing = await base44.entities.ClassJoinRequest.filter({
          class_id: classData.id,
          student_email: user.email,
        });
        if (existing.length) {
          const req = existing[0];
          if (req.status === 'pending') {
            setStatus('pending');
            setMessage(`Your request to join "${classData.name}" is awaiting teacher approval.`);
            return;
          } else if (req.status === 'approved') {
            navigate(createPageUrl(`StudentClassDetail?classId=${classData.id}`));
            return;
          }
        }

        // Create join request
        await base44.entities.ClassJoinRequest.create({
          class_id: classData.id,
          class_name: classData.name,
          student_email: user.email,
          student_name: user.full_name || user.email.split('@')[0],
          status: 'pending',
          invite_token: token,
        });
        // Increment use count
        await base44.entities.ClassInvite.update(invite.id, { use_count: (invite.use_count || 0) + 1 });
        setStatus('pending');
        setMessage(`Your request to join "${classData.name}" has been sent. The teacher will approve it shortly.`);
      } else {
        // Direct join
        const updatedEmails = [...(classData.student_emails || []), user.email];
        await base44.entities.Class.update(classData.id, { student_emails: updatedEmails });
        await base44.entities.ClassInvite.update(invite.id, { use_count: (invite.use_count || 0) + 1 });
        setStatus('success');
        setTimeout(() => navigate(createPageUrl(`StudentClassDetail?classId=${classData.id}`)), 1500);
      }
    } catch (e) {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }
  };

  const handleJoinByCode = async () => {
    if (!joinCode.trim()) return;
    setStatus('loading');
    try {
      const classes = await base44.entities.Class.filter({ join_code: joinCode.trim().toUpperCase() });
      if (!classes.length) {
        setStatus('error');
        setMessage('No class found with that code. Please check and try again.');
        return;
      }

      const classData = classes[0];

      if ((classData.student_emails || []).includes(user.email)) {
        navigate(createPageUrl(`StudentClassDetail?classId=${classData.id}`));
        return;
      }

      if (classData.require_join_approval) {
        const existing = await base44.entities.ClassJoinRequest.filter({
          class_id: classData.id,
          student_email: user.email,
        });
        if (existing.length && existing[0].status === 'pending') {
          setStatus('pending');
          setMessage(`Your request to join "${classData.name}" is already pending approval.`);
          return;
        }

        await base44.entities.ClassJoinRequest.create({
          class_id: classData.id,
          class_name: classData.name,
          student_email: user.email,
          student_name: user.full_name || user.email.split('@')[0],
          status: 'pending',
        });
        setStatus('pending');
        setMessage(`Your request to join "${classData.name}" has been sent!`);
      } else {
        const updatedEmails = [...(classData.student_emails || []), user.email];
        await base44.entities.Class.update(classData.id, { student_emails: updatedEmails });
        setStatus('success');
        setTimeout(() => navigate(createPageUrl(`StudentClassDetail?classId=${classData.id}`)), 1500);
      }
    } catch (e) {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center p-6">
      <GlassCard className="w-full max-w-md p-8">
        {status === 'loading' && (
          <div className="text-center py-8">
            <Loader2 className="w-10 h-10 animate-spin text-purple-400 mx-auto mb-4" />
            <p className="text-white font-medium">Joining class...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <p className="text-white font-bold text-xl mb-2">Joined successfully!</p>
            <p className="text-slate-400">Redirecting you to the class...</p>
          </div>
        )}

        {status === 'pending' && (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-amber-400 mx-auto mb-4" />
            <p className="text-white font-bold text-xl mb-2">Request Sent!</p>
            <p className="text-slate-400 mb-6">{message}</p>
            <Button onClick={() => navigate(createPageUrl('StudentDashboard'))} className="bg-gradient-to-r from-purple-500 to-blue-500">
              Back to Dashboard
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center py-8">
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-white font-bold text-xl mb-2">Oops!</p>
            <p className="text-slate-400 mb-6">{message}</p>
            <Button onClick={() => { setStatus('idle'); setMessage(''); }} variant="outline" className="border-white/20 text-white">
              Try Again
            </Button>
          </div>
        )}

        {status === 'idle' && (
          <>
            <h1 className="text-2xl font-bold text-white mb-2">Join a Class</h1>
            <p className="text-slate-400 mb-6">Enter the join code provided by your teacher.</p>
            <div className="flex gap-3">
              <Input
                placeholder="e.g. ABC123"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleJoinByCode()}
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 font-mono tracking-widest text-lg"
              />
              <Button onClick={handleJoinByCode} disabled={!joinCode.trim()} className="bg-gradient-to-r from-purple-500 to-blue-500 flex-shrink-0">
                Join
              </Button>
            </div>
          </>
        )}
      </GlassCard>
    </div>
  );
}