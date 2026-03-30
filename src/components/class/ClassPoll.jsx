import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import GlassCard from '@/components/ui/GlassCard';
import { Plus, X, BarChart3 } from 'lucide-react';

export default function ClassPoll({ classId, user, isTeacher }) {
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

  const createPollMutation = useMutation({
    mutationFn: async () => {
      const validOptions = options.filter(o => o.trim());
      if (!question.trim() || validOptions.length < 2) throw new Error('Need a question + 2 options');
      await base44.entities.ClassMessage.create({
        class_id: classId,
        sender_email: user.email,
        sender_name: user.full_name || user.email,
        sender_type: 'teacher',
        message_type: 'poll',
        content: JSON.stringify({ question: question.trim(), options: validOptions, votes: {} }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['classPolls', classId]);
      setCreating(false);
      setQuestion('');
      setOptions(['', '']);
    },
  });

  const voteMutation = useMutation({
    mutationFn: async ({ pollId, optionIdx, currentContent }) => {
      const data = JSON.parse(currentContent);
      const votes = { ...(data.votes || {}) };
      // Remove previous vote from this user
      Object.keys(votes).forEach(k => {
        votes[k] = (votes[k] || []).filter(e => e !== user.email);
      });
      votes[optionIdx] = [...(votes[optionIdx] || []), user.email];
      data.votes = votes;
      await base44.entities.ClassMessage.update(pollId, { content: JSON.stringify(data) });
    },
    onSuccess: () => queryClient.invalidateQueries(['classPolls', classId]),
  });

  const polls = messages.filter(m => {
    try { JSON.parse(m.content); return true; } catch { return false; }
  });

  return (
    <div className="space-y-4">
      {isTeacher && (
        <div>
          {!creating ? (
            <Button onClick={() => setCreating(true)} size="sm"
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600">
              <Plus className="w-4 h-4 mr-2" /> Create Poll
            </Button>
          ) : (
            <GlassCard className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-white font-semibold text-sm">New Poll</p>
                <button onClick={() => setCreating(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <Input placeholder="Question..." value={question} onChange={e => setQuestion(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500" />
              {options.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <Input placeholder={`Option ${i + 1}`} value={opt} onChange={e => {
                    const o = [...options]; o[i] = e.target.value; setOptions(o);
                  }} className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 flex-1" />
                  {options.length > 2 && (
                    <button onClick={() => setOptions(options.filter((_, j) => j !== i))}
                      className="text-slate-400 hover:text-red-400"><X className="w-4 h-4" /></button>
                  )}
                </div>
              ))}
              {options.length < 4 && (
                <Button size="sm" variant="outline" onClick={() => setOptions([...options, ''])}
                  className="border-white/10 text-slate-300 hover:bg-white/10 w-full">
                  <Plus className="w-4 h-4 mr-1" /> Add Option
                </Button>
              )}
              <Button onClick={() => createPollMutation.mutate()} disabled={createPollMutation.isPending}
                className="w-full bg-emerald-500 hover:bg-emerald-600">
                {createPollMutation.isPending ? 'Posting…' : 'Post Poll'}
              </Button>
            </GlassCard>
          )}
        </div>
      )}

      {polls.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-4">No polls yet{isTeacher ? '. Create one above!' : '.'}</p>
      ) : (
        polls.map(poll => {
          const data = JSON.parse(poll.content);
          const votes = data.votes || {};
          const totalVotes = Object.values(votes).reduce((s, v) => s + (v?.length || 0), 0);
          const myVote = Object.keys(votes).find(k => (votes[k] || []).includes(user?.email));

          return (
            <GlassCard key={poll.id} className="p-4 space-y-3">
              <div className="flex items-start gap-2">
                <BarChart3 className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                <p className="text-white font-semibold">{data.question}</p>
              </div>
              <div className="space-y-2">
                {data.options.map((opt, idx) => {
                  const count = (votes[idx] || []).length;
                  const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                  const isMyVote = String(myVote) === String(idx);
                  return (
                    <button key={idx} onClick={() => !isTeacher && voteMutation.mutate({
                      pollId: poll.id, optionIdx: idx, currentContent: poll.content
                    })} disabled={isTeacher}
                      className={`w-full text-left p-3 rounded-xl border transition-all relative overflow-hidden ${
                        isMyVote ? 'border-purple-500/60 bg-purple-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}>
                      <div className="absolute inset-0 bg-purple-500/10 rounded-xl transition-all"
                        style={{ width: `${pct}%` }} />
                      <div className="relative flex items-center justify-between">
                        <span className="text-white text-sm">{opt}</span>
                        <span className="text-slate-400 text-xs">{count} vote{count !== 1 ? 's' : ''} ({pct}%)</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-slate-500 text-xs text-right">{totalVotes} total vote{totalVotes !== 1 ? 's' : ''}</p>
            </GlassCard>
          );
        })
      )}
    </div>
  );
}