import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  X,
  BarChart3,
  Eye,
  EyeOff,
  Trash2,
  VoteIcon
} from 'lucide-react';

function PollCard({ poll, user, isTeacher }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const voteMutation = useMutation({
    mutationFn: async (optionIdx) => {
      const updated = JSON.parse(poll.content);
      const v = { ...(updated.votes || {}) };
      Object.keys(v).forEach((k) => {
        v[k] = (v[k] || []).filter((e) => e !== user.email);
      });
      v[optionIdx] = [...(v[optionIdx] || []), user.email];
      updated.votes = v;
      await base44.entities.ClassMessage.update(poll.id, {
        content: JSON.stringify(updated)
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classPolls'] })
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.ClassMessage.delete(poll.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classPolls'] })
  });

  let data;
  try {
    data = JSON.parse(poll.content);
  } catch {
    return null;
  }

  const votes = data.votes || {};
  const totalVotes = Object.values(votes).reduce((s, v) => s + (v?.length || 0), 0);
  const myVote = Object.keys(votes).find((k) =>
    (votes[k] || []).includes(user?.email)
  );
  const showWhoVoted = data.show_who_voted ?? false;

  const toggleShowVoters = async () => {
    const updated = JSON.parse(poll.content);
    updated.show_who_voted = !showWhoVoted;
    await base44.entities.ClassMessage.update(poll.id, {
      content: JSON.stringify(updated)
    });
    queryClient.invalidateQueries({ queryKey: ['classPolls'] });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="backdrop-blur-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-purple-500/20 transition-all duration-300">
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <VoteIcon className="w-5 h-5 text-purple-400" />
              {data.question}
            </h3>
            <p className="text-slate-400 text-sm mt-2">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isTeacher && (
              <>
                <button
                  onClick={toggleShowVoters}
                  className={`p-2 rounded-lg transition-colors ${
                    showWhoVoted
                      ? 'text-blue-400 bg-blue-500/10'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                  title={showWhoVoted ? 'Hiding names' : 'Showing names'}>
                  {showWhoVoted ? (
                    <Eye className="w-5 h-5" />
                  ) : (
                    <EyeOff className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={() => deleteMutation.mutate()}
                  className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Poll Options */}
        <div className="space-y-2">
          {data.options.map((opt, idx) => {
            const count = (votes[idx] || []).length;
            const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
            const isMyVote = String(myVote) === String(idx);
            const voters = votes[idx] || [];

            return (
              <div key={idx} className="space-y-1">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => !isTeacher && !myVote && voteMutation.mutate(idx)}
                  disabled={isTeacher || (!!myVote && !isMyVote)}
                  className={`w-full text-left rounded-xl border transition-all relative overflow-hidden group ${
                    isMyVote
                      ? 'border-purple-500/60 bg-purple-500/15'
                      : 'border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-60'
                  }`}>
                  {/* Animated bar fill */}
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`absolute inset-y-0 left-0 rounded-xl ${
                      isMyVote ? 'bg-purple-500/20' : 'bg-white/5'
                    }`}
                  />

                  <div className="relative flex items-center justify-between px-4 py-3">
                    <span className="text-white font-medium">{opt}</span>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-white font-bold">{pct}%</span>
                        <span className="text-slate-400 text-sm ml-2">({count})</span>
                      </div>
                    </div>
                  </div>
                </motion.button>

                {/* Voters list */}
                {(isTeacher || showWhoVoted) && voters.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex flex-wrap gap-2 pl-2">
                    {voters.map((email) => (
                      <span
                        key={email}
                        className="text-xs bg-white/10 text-slate-300 px-2 py-1 rounded-full">
                        {email.split('@')[0]}
                      </span>
                    ))}
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

export default function ModernPollsTab({ classId, user, isTeacher }) {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  const { data: messages = [] } = useQuery({
    queryKey: ['classPolls', classId],
    queryFn: () =>
      base44.entities.ClassMessage.filter(
        { class_id: classId, message_type: 'poll' },
        '-created_date'
      ),
    enabled: !!classId,
    refetchInterval: 3000
  });

  const polls = messages.filter((m) => {
    try {
      JSON.parse(m.content);
      return true;
    } catch {
      return false;
    }
  });

  const createPollMutation = useMutation({
    mutationFn: async () => {
      const validOptions = options.filter((o) => o.trim());
      if (!question.trim() || validOptions.length < 2)
        throw new Error('Need a question + at least 2 options');
      await base44.entities.ClassMessage.create({
        class_id: classId,
        sender_email: user.email,
        sender_name: user.full_name || user.email,
        sender_type: 'teacher',
        message_type: 'poll',
        content: JSON.stringify({
          question: question.trim(),
          options: validOptions,
          votes: {},
          show_who_voted: false
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classPolls', classId] });
      setCreating(false);
      setQuestion('');
      setOptions(['', '']);
    }
  });

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/10 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-10 p-6">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-3xl font-bold text-white">📊 Polls</h1>
            <p className="text-slate-400 text-sm mt-1">{polls.length} poll{polls.length !== 1 ? 's' : ''}</p>
          </div>
          {isTeacher && !creating && (
            <Button
              onClick={() => setCreating(true)}
              className="bg-gradient-to-r from-purple-500 to-blue-500">
              <Plus className="w-4 h-4 mr-2" />
              Create Poll
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          <AnimatePresence>
            {/* Create Form */}
            {creating && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white">Create Poll</h2>
                  <button
                    onClick={() => setCreating(false)}
                    className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <Input
                  placeholder="Poll question..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                />
                <div className="space-y-2">
                  {options.map((opt, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        placeholder={`Option ${i + 1}`}
                        value={opt}
                        onChange={(e) => {
                          const o = [...options];
                          o[i] = e.target.value;
                          setOptions(o);
                        }}
                        className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 flex-1"
                      />
                      {options.length > 2 && (
                        <button
                          onClick={() =>
                            setOptions(options.filter((_, j) => j !== i))
                          }
                          className="text-slate-400 hover:text-red-400 p-2">
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {options.length < 6 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setOptions([...options, ''])}
                    className="border-white/20 text-slate-300 hover:bg-white/10 w-full">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Option
                  </Button>
                )}
                <Button
                  onClick={() => createPollMutation.mutate()}
                  disabled={createPollMutation.isPending}
                  className="w-full bg-gradient-to-r from-purple-500 to-blue-500">
                  {createPollMutation.isPending ? 'Creating...' : 'Launch Poll'}
                </Button>
              </motion.div>
            )}

            {/* Polls List */}
            {polls.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-24">
                <p className="text-4xl mb-4">📊</p>
                <p className="text-xl font-semibold text-white mb-2">No polls yet</p>
                <p className="text-slate-400">
                  {isTeacher
                    ? 'Create a poll to engage your class'
                    : 'Your teacher will post polls here'}
                </p>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {polls.map((poll) => (
                  <PollCard
                    key={poll.id}
                    poll={poll}
                    user={user}
                    isTeacher={isTeacher}
                  />
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}