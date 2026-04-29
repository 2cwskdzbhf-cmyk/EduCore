import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, BarChart3, Eye, EyeOff, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

function PollCard({ poll, user, isTeacher }) {
  const queryClient = useQueryClient();
  const [showVoters, setShowVoters] = useState(false);

  const voteMutation = useMutation({
    mutationFn: async (optionIdx) => {
      const updated = JSON.parse(poll.content);
      const v = { ...(updated.votes || {}) };
      Object.keys(v).forEach(k => { v[k] = (v[k] || []).filter(e => e !== user.email); });
      v[optionIdx] = [...(v[optionIdx] || []), user.email];
      updated.votes = v;
      await base44.entities.ClassMessage.update(poll.id, { content: JSON.stringify(updated) });
    },
    onSuccess: () => queryClient.invalidateQueries(['classPolls', poll.class_id]),
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.ClassMessage.delete(poll.id),
    onSuccess: () => queryClient.invalidateQueries(['classPolls', poll.class_id]),
  });

  let data;
  try { data = JSON.parse(poll.content); } catch { return null; }

  const votes = data.votes || {};
  const totalVotes = Object.values(votes).reduce((s, v) => s + (v?.length || 0), 0);
  const myVote = Object.keys(votes).find(k => (votes[k] || []).includes(user?.email));
  const showWhoVoted = data.show_who_voted ?? false;

  const toggleShowVoters = async () => {
    const updated = JSON.parse(poll.content);
    updated.show_who_voted = !showWhoVoted;
    await base44.entities.ClassMessage.update(poll.id, { content: JSON.stringify(updated) });
    queryClient.invalidateQueries(['classPolls', poll.class_id]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <BarChart3 className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
          <p className="text-white font-semibold">{data.question}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {isTeacher && (
            <>
              <button onClick={toggleShowVoters}
                className={`p-1.5 rounded-lg transition-colors text-xs flex items-center gap-1 ${showWhoVoted ? 'text-blue-400 bg-blue-500/10' : 'text-slate-500 hover:text-slate-300'}`}
                title={showWhoVoted ? 'Showing who voted' : 'Hiding who voted'}>
                {showWhoVoted ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span className="text-xs">{showWhoVoted ? 'Names on' : 'Names off'}</span>
              </button>
              <button onClick={() => deleteMutation.mutate()}
                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {data.options.map((opt, idx) => {
          const count = (votes[idx] || []).length;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isMyVote = String(myVote) === String(idx);
          const voters = votes[idx] || [];

          return (
            <div key={idx} className="space-y-1">
              <button
                onClick={() => !isTeacher && !myVote && voteMutation.mutate(idx)}
                disabled={isTeacher || (!!myVote && !isMyVote)}
                className={`w-full text-left rounded-xl border transition-all relative overflow-hidden group ${
                  isMyVote
                    ? 'border-purple-500/60 bg-purple-500/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-60'
                }`}
              >
                {/* Bar fill */}
                <div
                  className={`absolute inset-y-0 left-0 rounded-xl transition-all duration-500 ${isMyVote ? 'bg-purple-500/20' : 'bg-white/5'}`}
                  style={{ width: `${pct}%` }}
                />
                <div className="relative flex items-center justify-between px-4 py-3">
                  <span className="text-white text-sm font-medium">{opt}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-bold">{pct}%</span>
                    <span className="text-slate-400 text-xs">({count})</span>
                  </div>
                </div>
              </button>

              {(isTeacher && showWhoVoted || showWhoVoted) && voters.length > 0 && (
                <div className="flex flex-wrap gap-1 pl-2">
                  {voters.map(email => (
                    <span key={email} className="text-xs bg-white/5 text-slate-400 px-2 py-0.5 rounded-full">
                      {email.split('@')[0]}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-slate-500 text-xs">{totalVotes} vote{totalVotes !== 1 ? 's' : ''} total</p>
    </motion.div>
  );
}

export default function ClassPollsTab({ classId, user, isTeacher }) {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  const { data: messages = [] } = useQuery({
    queryKey: ['classPolls', classId],
    queryFn: () => base44.entities.ClassMessage.filter({ class_id: classId, message_type: 'poll' }, '-created_date'),
    enabled: !!classId,
    refetchInterval: 3000,
  });

  const polls = messages.filter(m => { try { JSON.parse(m.content); return true; } catch { return false; } });

  const createPollMutation = useMutation({
    mutationFn: async () => {
      const validOptions = options.filter(o => o.trim());
      if (!question.trim() || validOptions.length < 2) throw new Error('Need a question + at least 2 options');
      await base44.entities.ClassMessage.create({
        class_id: classId,
        sender_email: user.email,
        sender_name: user.full_name || user.email,
        sender_type: 'teacher',
        message_type: 'poll',
        content: JSON.stringify({ question: question.trim(), options: validOptions, votes: {}, show_who_voted: false }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['classPolls', classId]);
      setCreating(false);
      setQuestion('');
      setOptions(['', '']);
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-400" />
          <h2 className="text-white font-bold text-xl">Polls</h2>
          <span className="text-slate-500 text-sm">({polls.length})</span>
        </div>
        {isTeacher && !creating && (
          <Button onClick={() => setCreating(true)}
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 font-semibold text-sm">
            <Plus className="w-4 h-4 mr-1.5" /> Create Poll
          </Button>
        )}
      </div>

      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-white font-bold">New Poll</p>
              <button onClick={() => setCreating(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <Input placeholder="Poll question..." value={question} onChange={e => setQuestion(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500" />
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <Input placeholder={`Option ${i + 1}`} value={opt}
                  onChange={e => { const o = [...options]; o[i] = e.target.value; setOptions(o); }}
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 flex-1" />
                {options.length > 2 && (
                  <button onClick={() => setOptions(options.filter((_, j) => j !== i))}
                    className="text-slate-400 hover:text-red-400"><X className="w-4 h-4" /></button>
                )}
              </div>
            ))}
            {options.length < 6 && (
              <Button size="sm" variant="outline" onClick={() => setOptions([...options, ''])}
                className="border-white/10 text-slate-300 hover:bg-white/10 w-full">
                <Plus className="w-4 h-4 mr-1" /> Add Option
              </Button>
            )}
            <Button onClick={() => createPollMutation.mutate()} disabled={createPollMutation.isPending}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500">
              {createPollMutation.isPending ? 'Posting…' : 'Launch Poll'}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {polls.length === 0 ? (
        <div className="text-center py-16">
          <BarChart3 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 font-medium">No polls yet</p>
          <p className="text-slate-500 text-sm mt-1">{isTeacher ? 'Create a poll above to engage your class.' : 'Your teacher hasn\'t posted any polls yet.'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {polls.map(poll => (
            <PollCard key={poll.id} poll={poll} user={user} isTeacher={isTeacher} />
          ))}
        </div>
      )}
    </div>
  );
}