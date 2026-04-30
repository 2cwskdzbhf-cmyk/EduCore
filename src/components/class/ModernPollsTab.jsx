import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Clock, Eye, EyeOff, BarChart3, History } from 'lucide-react';
import PollCard from './PollCard';

function CreatePollForm({ classId, user, onClose }) {
  const queryClient = useQueryClient();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [anonymous, setAnonymous] = useState(false);
  const [multiSelect, setMultiSelect] = useState(false);
  const [quizMode, setQuizMode] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState(null);
  const [timedMinutes, setTimedMinutes] = useState('');

  const createPollMutation = useMutation({
    mutationFn: async () => {
      const validOptions = options.filter(o => o.trim());
      if (!question.trim() || validOptions.length < 2) throw new Error('Need a question + at least 2 options');
      const pollData = {
        question: question.trim(),
        options: validOptions,
        votes: {},
        show_who_voted: false,
        anonymous,
        multi_select: multiSelect,
        quiz_mode: quizMode,
        correct_answer: quizMode ? correctAnswer : null,
        ends_at: timedMinutes ? new Date(Date.now() + parseFloat(timedMinutes) * 60000).toISOString() : null,
        closed: false,
      };
      await base44.entities.ClassMessage.create({
        class_id: classId,
        sender_email: user.email,
        sender_name: user.full_name || user.email,
        sender_type: 'teacher',
        message_type: 'poll',
        content: JSON.stringify(pollData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classPolls', classId] });
      onClose();
    }
  });

  const toggle = (setter) => setter(v => !v);

  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Create Poll</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
      </div>

      {/* Question */}
      <Input
        placeholder="Poll question..."
        value={question}
        onChange={e => setQuestion(e.target.value)}
        className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
      />

      {/* Options */}
      <div className="space-y-2">
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Options</p>
        {options.map((opt, i) => (
          <div key={i} className="flex gap-2 items-center">
            {quizMode && (
              <button
                onClick={() => setCorrectAnswer(i)}
                className={`w-6 h-6 rounded-full border-2 flex-shrink-0 transition-colors ${
                  correctAnswer === i ? 'bg-emerald-500 border-emerald-500' : 'border-white/30 hover:border-emerald-400'
                }`}
                title="Mark as correct answer"
              />
            )}
            <Input
              placeholder={`Option ${i + 1}${quizMode && correctAnswer === i ? ' ✓ Correct' : ''}`}
              value={opt}
              onChange={e => { const o = [...options]; o[i] = e.target.value; setOptions(o); }}
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 flex-1"
            />
            {options.length > 2 && (
              <button onClick={() => setOptions(options.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-400 p-1">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        {options.length < 8 && (
          <Button size="sm" variant="outline" onClick={() => setOptions([...options, ''])} className="border-white/20 text-slate-300 hover:bg-white/10 w-full">
            <Plus className="w-4 h-4 mr-1" /> Add Option
          </Button>
        )}
      </div>

      {/* Poll Options */}
      <div className="grid grid-cols-2 gap-3">
        {/* Anonymous */}
        <button
          onClick={() => toggle(setAnonymous)}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
            anonymous ? 'border-purple-500/60 bg-purple-500/15 text-purple-300' : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
          }`}
        >
          {anonymous ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {anonymous ? 'Anonymous ON' : 'Anonymous OFF'}
        </button>

        {/* Multi-select */}
        <button
          onClick={() => toggle(setMultiSelect)}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
            multiSelect ? 'border-blue-500/60 bg-blue-500/15 text-blue-300' : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          {multiSelect ? 'Multi-select ON' : 'Multi-select'}
        </button>

        {/* Quiz mode */}
        <button
          onClick={() => { toggle(setQuizMode); setCorrectAnswer(null); }}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
            quizMode ? 'border-amber-500/60 bg-amber-500/15 text-amber-300' : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
          }`}
        >
          🧠 {quizMode ? 'Quiz Mode ON' : 'Quiz Mode'}
        </button>

        {/* Timed */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
          timedMinutes ? 'border-orange-500/60 bg-orange-500/15' : 'border-white/10 bg-white/5'
        }`}>
          <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            type="number"
            placeholder="Timer (mins)"
            value={timedMinutes}
            min="1"
            onChange={e => setTimedMinutes(e.target.value)}
            className="bg-transparent text-white text-sm w-full outline-none placeholder:text-slate-500"
          />
        </div>
      </div>

      {quizMode && correctAnswer === null && (
        <p className="text-xs text-amber-400">👆 Click a circle next to an option to mark the correct answer</p>
      )}

      <Button
        onClick={() => createPollMutation.mutate()}
        disabled={createPollMutation.isPending}
        className="w-full bg-gradient-to-r from-purple-500 to-blue-500 font-semibold"
      >
        {createPollMutation.isPending ? 'Creating...' : '🚀 Launch Poll'}
      </Button>
    </motion.div>
  );
}

export default function ModernPollsTab({ classId, user, isTeacher }) {
  const [creating, setCreating] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const { data: messages = [] } = useQuery({
    queryKey: ['classPolls', classId],
    queryFn: () => base44.entities.ClassMessage.filter({ class_id: classId, message_type: 'poll' }, '-created_date'),
    enabled: !!classId,
    refetchInterval: 3000,
  });

  const polls = messages.filter(m => { try { JSON.parse(m.content); return true; } catch { return false; } });

  const activePolls = polls.filter(p => {
    try {
      const d = JSON.parse(p.content);
      return !d.closed && (!d.ends_at || Date.now() < new Date(d.ends_at).getTime());
    } catch { return false; }
  });

  const closedPolls = polls.filter(p => {
    try {
      const d = JSON.parse(p.content);
      return d.closed || (d.ends_at && Date.now() > new Date(d.ends_at).getTime());
    } catch { return false; }
  });

  const displayedPolls = showHistory ? closedPolls : activePolls;

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/10 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-10 p-6">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-3xl font-bold text-white">📊 Polls</h1>
            <p className="text-slate-400 text-sm mt-1">
              {activePolls.length} active · {closedPolls.length} past
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(h => !h)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                showHistory ? 'border-slate-500/60 bg-slate-500/15 text-slate-300' : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <History className="w-4 h-4" />
              {showHistory ? 'Active' : 'History'}
            </button>
            {isTeacher && !creating && !showHistory && (
              <Button onClick={() => setCreating(true)} className="bg-gradient-to-r from-purple-500 to-blue-500">
                <Plus className="w-4 h-4 mr-2" /> Create Poll
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          <AnimatePresence>
            {creating && !showHistory && (
              <CreatePollForm key="form" classId={classId} user={user} onClose={() => setCreating(false)} />
            )}

            {displayedPolls.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-24">
                <p className="text-4xl mb-4">{showHistory ? '📜' : '📊'}</p>
                <p className="text-xl font-semibold text-white mb-2">{showHistory ? 'No past polls' : 'No active polls'}</p>
                <p className="text-slate-400">
                  {showHistory ? 'Closed polls will appear here.' : isTeacher ? 'Create a poll to engage your class' : 'Your teacher will post polls here'}
                </p>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {showHistory && <p className="text-slate-500 text-sm font-medium">📜 Poll History ({closedPolls.length})</p>}
                {displayedPolls.map(poll => (
                  <PollCard key={poll.id} poll={poll} user={user} isTeacher={isTeacher} />
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}