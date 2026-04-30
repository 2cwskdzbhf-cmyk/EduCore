import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Trash2, Clock, CheckCircle2, Download, Trophy } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient, useMutation } from '@tanstack/react-query';

export default function PollCard({ poll, user, isTeacher }) {
  const queryClient = useQueryClient();
  const [timeLeft, setTimeLeft] = useState(null);

  // Parse data first (but hooks must come before any conditional return)
  let data = null;
  let parseError = false;
  try { data = JSON.parse(poll.content); } catch { parseError = true; }

  const votes = data?.votes || {};
  const isAnonymous = data?.anonymous ?? false;
  const isMultiSelect = data?.multi_select ?? false;
  const isQuiz = data?.quiz_mode ?? false;
  const correctAnswer = data?.correct_answer ?? null;
  const showWhoVoted = data?.show_who_voted ?? false;
  const endsAt = data?.ends_at ?? null;
  const isClosed = data?.closed ?? (endsAt && Date.now() > new Date(endsAt).getTime());

  const myVotes = Object.keys(votes).filter(k => (votes[k] || []).includes(user?.email));
  const hasVoted = myVotes.length > 0;
  const totalVotes = Object.values(votes).reduce((s, v) => s + (v?.length || 0), 0);

  // Countdown timer — always called, but only runs when endsAt is set
  useEffect(() => {
    if (!endsAt) return;
    const tick = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Closed'); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(m > 0 ? `${m}m ${s}s` : `${s}s`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [endsAt]);

  const voteMutation = useMutation({
    mutationFn: async (optionIdx) => {
      const updated = JSON.parse(poll.content);
      const v = { ...(updated.votes || {}) };
      if (isMultiSelect) {
        // Toggle this option
        const existing = v[optionIdx] || [];
        if (existing.includes(user.email)) {
          v[optionIdx] = existing.filter(e => e !== user.email);
        } else {
          v[optionIdx] = [...existing, user.email];
        }
      } else {
        // Single select: remove from all first
        Object.keys(v).forEach(k => { v[k] = (v[k] || []).filter(e => e !== user.email); });
        v[optionIdx] = [...(v[optionIdx] || []), user.email];
      }
      updated.votes = v;
      await base44.entities.ClassMessage.update(poll.id, { content: JSON.stringify(updated) });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classPolls'] })
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.ClassMessage.delete(poll.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classPolls'] })
  });

  const toggleShowVoters = async () => {
    const updated = JSON.parse(poll.content);
    updated.show_who_voted = !showWhoVoted;
    await base44.entities.ClassMessage.update(poll.id, { content: JSON.stringify(updated) });
    queryClient.invalidateQueries({ queryKey: ['classPolls'] });
  };

  const closePoll = async () => {
    const updated = JSON.parse(poll.content);
    updated.closed = true;
    await base44.entities.ClassMessage.update(poll.id, { content: JSON.stringify(updated) });
    queryClient.invalidateQueries({ queryKey: ['classPolls'] });
  };

  const exportCSV = () => {
    const rows = [['Option', 'Votes', 'Percentage', ...(isAnonymous ? [] : ['Voters'])]];
    data.options.forEach((opt, idx) => {
      const count = (votes[idx] || []).length;
      const pct = totalVotes > 0 ? ((count / totalVotes) * 100).toFixed(1) : '0';
      const voters = isAnonymous ? [] : (votes[idx] || []).map(e => e.split('@')[0]);
      rows.push([opt, count, `${pct}%`, ...(isAnonymous ? [] : [voters.join('; ')])]);
    });
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([`Question: "${data.question}"\nTotal Votes: ${totalVotes}\n\n${csv}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'poll-results.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  if (parseError || !data) return null;

  const canVote = !isTeacher && !isClosed && (!hasVoted || isMultiSelect);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="backdrop-blur-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-purple-500/20 transition-all duration-300"
    >
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              {isQuiz && <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold">🧠 Quiz</span>}
              {isMultiSelect && <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-semibold">Multi-select</span>}
              {isAnonymous && <span className="text-xs bg-slate-500/20 text-slate-400 border border-slate-500/30 px-2 py-0.5 rounded-full font-semibold">Anonymous</span>}
              {isClosed && <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-semibold">Closed</span>}
            </div>
            <h3 className="text-xl font-bold text-white">{data.question}</h3>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <p className="text-slate-400 text-sm">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</p>
              {timeLeft && !isClosed && (
                <p className="text-sm text-amber-400 flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{timeLeft}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isTeacher && (
              <>
                <button onClick={exportCSV} title="Export CSV" className="p-2 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"><Download className="w-4 h-4" /></button>
                <button onClick={toggleShowVoters} title={showWhoVoted ? 'Hide voters' : 'Show voters'} className={`p-2 rounded-lg transition-colors ${showWhoVoted ? 'text-blue-400 bg-blue-500/10' : 'text-slate-500 hover:text-slate-300'}`}>
                  {showWhoVoted ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                {!isClosed && <button onClick={closePoll} title="Close poll" className="p-2 text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors text-xs font-bold">Close</button>}
                <button onClick={() => deleteMutation.mutate()} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
              </>
            )}
          </div>
        </div>

        {/* Options */}
        <div className="space-y-2">
          {data.options.map((opt, idx) => {
            const count = (votes[idx] || []).length;
            const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
            const isSelected = myVotes.includes(String(idx));
            const isCorrect = isQuiz && String(correctAnswer) === String(idx);
            const voters = votes[idx] || [];

            return (
              <div key={idx} className="space-y-1">
                <motion.button
                  whileHover={canVote ? { scale: 1.01 } : {}}
                  whileTap={canVote ? { scale: 0.99 } : {}}
                  onClick={() => canVote && voteMutation.mutate(idx)}
                  disabled={!canVote}
                  className={`w-full text-left rounded-xl border transition-all relative overflow-hidden ${
                    isSelected
                      ? 'border-purple-500/60 bg-purple-500/15'
                      : isCorrect && (isClosed || isTeacher)
                      ? 'border-emerald-500/60 bg-emerald-500/10'
                      : 'border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-70'
                  }`}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`absolute inset-y-0 left-0 rounded-xl ${
                      isSelected ? 'bg-purple-500/20' : isCorrect && (isClosed || isTeacher) ? 'bg-emerald-500/15' : 'bg-white/5'
                    }`}
                  />
                  <div className="relative flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                      {isMultiSelect && (
                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-purple-500 border-purple-500' : 'border-white/30'}`}>
                          {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                      )}
                      <span className="text-white font-medium">{opt}</span>
                      {isCorrect && (isClosed || isTeacher) && <Trophy className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold">{pct}%</span>
                      <span className="text-slate-400 text-sm">({count})</span>
                    </div>
                  </div>
                </motion.button>

                {/* Voters */}
                {!isAnonymous && (isTeacher || showWhoVoted) && voters.length > 0 && (
                  <div className="flex flex-wrap gap-1 pl-2">
                    {voters.map(email => (
                      <span key={email} className="text-xs bg-white/10 text-slate-300 px-2 py-0.5 rounded-full">{email.split('@')[0]}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Multi-select hint */}
        {isMultiSelect && !isTeacher && !isClosed && (
          <p className="text-xs text-slate-500 text-center">Select all that apply — click again to deselect</p>
        )}

        {/* Quiz result */}
        {isQuiz && hasVoted && correctAnswer !== null && (
          <div className={`text-center py-2 rounded-xl text-sm font-semibold ${
            myVotes.includes(String(correctAnswer)) ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
          }`}>
            {myVotes.includes(String(correctAnswer)) ? '✅ Correct!' : `❌ The answer was: ${data.options[correctAnswer]}`}
          </div>
        )}
      </div>
    </motion.div>
  );
}