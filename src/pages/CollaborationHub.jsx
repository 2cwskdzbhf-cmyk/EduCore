import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import GlassCard from '@/components/ui/GlassCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ChevronLeft, Users, UserPlus, Check, X, MessageSquare,
  BookOpen, Clock, CheckCircle2, Send, Save
} from 'lucide-react';

export default function CollaborationHub() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [requestingFor, setRequestingFor] = useState(null); // { classmate, classId }
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [activeCollab, setActiveCollab] = useState(null);
  const [sharedNotes, setSharedNotes] = useState('');

  useEffect(() => { base44.auth.me().then(setUser); }, []);

  const { data: myClasses = [] } = useQuery({
    queryKey: ['studentClassesCollab', user?.email],
    queryFn: async () => {
      const all = await base44.entities.Class.list();
      return all.filter(c => c.student_emails?.includes(user.email));
    },
    enabled: !!user?.email,
  });

  const classIds = myClasses.map(c => c.id);

  const { data: classmates = [] } = useQuery({
    queryKey: ['classmates', classIds.join(',')],
    queryFn: async () => {
      const emailSet = new Set();
      myClasses.forEach(c => (c.student_emails || []).forEach(e => { if (e !== user.email) emailSet.add(e); }));
      if (emailSet.size === 0) return [];
      return base44.entities.User.filter({ email: { $in: Array.from(emailSet) } });
    },
    enabled: myClasses.length > 0 && !!user?.email,
  });

  const { data: sentRequests = [] } = useQuery({
    queryKey: ['sentCollabRequests', user?.email],
    queryFn: () => base44.entities.CollaborationRequest.filter({ requester_email: user.email }),
    enabled: !!user?.email,
    refetchInterval: 5000,
  });

  const { data: receivedRequests = [] } = useQuery({
    queryKey: ['receivedCollabRequests', user?.email],
    queryFn: () => base44.entities.CollaborationRequest.filter({ recipient_email: user.email }),
    enabled: !!user?.email,
    refetchInterval: 5000,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['assignmentsForCollab', classIds.join(',')],
    queryFn: async () => {
      if (classIds.length === 0) return [];
      const all = await Promise.all(classIds.map(id => base44.entities.Assignment.filter({ class_id: id })));
      return all.flat();
    },
    enabled: classIds.length > 0,
  });

  const sendRequestMutation = useMutation({
    mutationFn: () => {
      const assignment = assignments.find(a => a.id === selectedAssignmentId);
      const cls = myClasses.find(c => c.student_emails?.includes(requestingFor.email));
      return base44.entities.CollaborationRequest.create({
        requester_email: user.email,
        requester_name: user.full_name || user.email.split('@')[0],
        recipient_email: requestingFor.email,
        assignment_id: selectedAssignmentId,
        assignment_title: assignment?.title || '',
        class_id: cls?.id || '',
        message: requestMessage,
        status: 'pending',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['sentCollabRequests']);
      setRequestingFor(null);
      setSelectedAssignmentId('');
      setRequestMessage('');
    },
  });

  const respondMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.CollaborationRequest.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries(['receivedCollabRequests']),
  });

  const saveNotesMutation = useMutation({
    mutationFn: ({ id, notes }) => base44.entities.CollaborationRequest.update(id, { shared_notes: notes }),
    onSuccess: () => queryClient.invalidateQueries(['sentCollabRequests', 'receivedCollabRequests']),
  });

  const pendingReceived = receivedRequests.filter(r => r.status === 'pending');
  const acceptedCollabs = [...sentRequests, ...receivedRequests].filter(r => r.status === 'accepted');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <Link to={createPageUrl('StudentDashboard')} className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
            <ChevronLeft className="w-5 h-5" /> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Collaboration Hub</h1>
          <p className="text-slate-400 mb-8">Work together with your classmates on assignments</p>

          {/* Pending Requests Banner */}
          {pendingReceived.length > 0 && (
            <GlassCard className="p-4 mb-6 border-amber-500/30 bg-amber-900/20">
              <h3 className="text-amber-300 font-semibold mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" /> {pendingReceived.length} Collaboration Request{pendingReceived.length > 1 ? 's' : ''}
              </h3>
              <div className="space-y-3">
                {pendingReceived.map(req => (
                  <div key={req.id} className="flex items-center justify-between bg-white/5 rounded-xl p-3">
                    <div>
                      <p className="text-white font-medium">{req.requester_name || req.requester_email.split('@')[0]}</p>
                      <p className="text-sm text-slate-400">wants to collaborate on <span className="text-amber-300">{req.assignment_title}</span></p>
                      {req.message && <p className="text-xs text-slate-500 mt-1 italic">"{req.message}"</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => respondMutation.mutate({ id: req.id, status: 'accepted' })} className="bg-emerald-500 hover:bg-emerald-600 h-8 px-3">
                        <Check className="w-4 h-4 mr-1" /> Accept
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => respondMutation.mutate({ id: req.id, status: 'declined' })} className="border-red-500/30 text-red-400 h-8 px-3">
                        <X className="w-4 h-4 mr-1" /> Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Active Collaborations */}
          {acceptedCollabs.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Active Collaborations
              </h2>
              <div className="space-y-3">
                {acceptedCollabs.map(collab => {
                  const isRequester = collab.requester_email === user?.email;
                  const partner = isRequester ? collab.recipient_email : collab.requester_email;
                  return (
                    <GlassCard key={collab.id} className="p-4 border-emerald-500/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold">
                            {partner.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-white font-medium">{partner.split('@')[0]}</p>
                            <p className="text-sm text-slate-400">{collab.assignment_title}</p>
                          </div>
                        </div>
                        <Button size="sm" onClick={() => { setActiveCollab(collab); setSharedNotes(collab.shared_notes || ''); }} className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/40">
                          <BookOpen className="w-4 h-4 mr-1" /> Open Workspace
                        </Button>
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            </div>
          )}

          {/* Classmates Grid */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" /> Your Classmates
            </h2>
            {classmates.length > 0 ? (
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                {classmates.map((mate, idx) => {
                  const existingRequest = sentRequests.find(r => r.recipient_email === mate.email);
                  const theyRequested = receivedRequests.find(r => r.requester_email === mate.email && r.status === 'accepted');
                  const isCollabActive = acceptedCollabs.some(c => c.requester_email === mate.email || c.recipient_email === mate.email);

                  return (
                    <motion.div key={mate.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                      <GlassCard className="p-4 text-center">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-xl mx-auto mb-3 shadow-lg shadow-purple-500/30">
                          {(mate.full_name || mate.email).charAt(0).toUpperCase()}
                        </div>
                        <p className="text-white font-medium mb-0.5">{mate.full_name || mate.email.split('@')[0]}</p>
                        <p className="text-xs text-slate-500 mb-3 truncate">{mate.email}</p>
                        {isCollabActive ? (
                          <span className="text-xs text-emerald-400 flex items-center justify-center gap-1"><CheckCircle2 className="w-3 h-3" /> Collaborating</span>
                        ) : existingRequest ? (
                          <span className="text-xs text-amber-400 flex items-center justify-center gap-1"><Clock className="w-3 h-3" />
                            {existingRequest.status === 'pending' ? 'Request Sent' : existingRequest.status === 'declined' ? 'Declined' : 'Accepted'}
                          </span>
                        ) : (
                          <Button size="sm" onClick={() => setRequestingFor(mate)} className="bg-gradient-to-r from-purple-500 to-blue-500 text-xs w-full">
                            <UserPlus className="w-3 h-3 mr-1" /> Request Collaboration
                          </Button>
                        )}
                      </GlassCard>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <GlassCard className="p-12 text-center">
                <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No classmates found</p>
                <p className="text-slate-500 text-sm mt-1">Join a class to see your classmates</p>
              </GlassCard>
            )}
          </div>
        </motion.div>
      </div>

      {/* Request Modal */}
      <AnimatePresence>
        {requestingFor && (
          <motion.div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setRequestingFor(null)}
          >
            <motion.div className="w-full max-w-md" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()}>
              <GlassCard className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                    {(requestingFor.full_name || requestingFor.email).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">Request Collaboration</h3>
                    <p className="text-slate-400 text-sm">with {requestingFor.full_name || requestingFor.email.split('@')[0]}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setRequestingFor(null)} className="text-slate-400 ml-auto"><X className="w-5 h-5" /></Button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Assignment to collaborate on</label>
                    <Select value={selectedAssignmentId} onValueChange={setSelectedAssignmentId}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue placeholder="Choose an assignment..." />
                      </SelectTrigger>
                      <SelectContent>
                        {assignments.map(a => <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Message (optional)</label>
                    <Textarea
                      value={requestMessage}
                      onChange={e => setRequestMessage(e.target.value)}
                      placeholder="Hi! Want to work on this together?"
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                  <Button
                    onClick={() => sendRequestMutation.mutate()}
                    disabled={!selectedAssignmentId || sendRequestMutation.isPending}
                    className="w-full bg-gradient-to-r from-purple-500 to-blue-500"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {sendRequestMutation.isPending ? 'Sending...' : 'Send Collaboration Request'}
                  </Button>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shared Workspace Modal */}
      <AnimatePresence>
        {activeCollab && (
          <motion.div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setActiveCollab(null)}
          >
            <motion.div className="w-full max-w-2xl" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()}>
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-white font-semibold text-lg">Shared Workspace</h3>
                    <p className="text-slate-400 text-sm">{activeCollab.assignment_title}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setActiveCollab(null)} className="text-slate-400"><X className="w-5 h-5" /></Button>
                </div>
                <div className="mb-3 flex items-center gap-2 text-sm text-slate-400">
                  <MessageSquare className="w-4 h-4" /> Shared notes — both you and your partner can edit this
                </div>
                <Textarea
                  value={sharedNotes}
                  onChange={e => setSharedNotes(e.target.value)}
                  placeholder="Write shared notes, ideas, or plans here..."
                  className="bg-white/5 border-white/10 text-white min-h-[200px] mb-4"
                />
                <Button
                  onClick={() => saveNotesMutation.mutate({ id: activeCollab.id, notes: sharedNotes })}
                  disabled={saveNotesMutation.isPending}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500"
                >
                  <Save className="w-4 h-4 mr-2" /> {saveNotesMutation.isPending ? 'Saving...' : 'Save Notes'}
                </Button>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}