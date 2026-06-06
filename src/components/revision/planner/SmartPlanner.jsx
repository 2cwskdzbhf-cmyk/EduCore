import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Calendar, Clock, Brain, Sparkles, Loader2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const PRIORITY_COLORS = { low: 'text-emerald-400 bg-emerald-500/10', medium: 'text-amber-400 bg-amber-500/10', high: 'text-red-400 bg-red-500/10' };

export default function SmartPlanner({ user, plan, onPlanSaved }) {
  const [subjects, setSubjects] = useState(plan?.subjects || []);
  const [hoursPerDay, setHoursPerDay] = useState(plan?.available_hours_per_day || 2);
  const [startDate, setStartDate] = useState(plan?.plan_start_date || new Date().toISOString().split('T')[0]);
  const [generating, setGenerating] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState(null);

  const addSubject = () => setSubjects(prev => [...prev, { name: '', exam_date: '', weak_topics: [], priority: 'medium', _weakInput: '' }]);
  const removeSubject = (i) => setSubjects(prev => prev.filter((_, idx) => idx !== i));
  const updateSubject = (i, field, val) => setSubjects(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  const addWeakTopic = (i) => {
    const s = subjects[i];
    if (!s._weakInput?.trim()) return;
    updateSubject(i, 'weak_topics', [...(s.weak_topics || []), s._weakInput.trim()]);
    updateSubject(i, '_weakInput', '');
  };
  const removeWeakTopic = (i, t) => updateSubject(i, 'weak_topics', subjects[i].weak_topics.filter(x => x !== t));

  const handleGenerate = async () => {
    if (!subjects.length) return;
    setGenerating(true);
    try {
      const subjectsClean = subjects.map(({ _weakInput, ...s }) => s);
      const prompt = `You are a revision planner AI. Build a structured daily revision timetable.

Student details:
- Available hours per day: ${hoursPerDay}
- Start date: ${startDate}
- Subjects: ${JSON.stringify(subjectsClean, null, 2)}

Generate a 2-week day-by-day revision schedule. Each day should have 2-4 specific tasks.
Each task must have:
- date (YYYY-MM-DD)
- title (e.g. "Do 20 flashcards on Covalent Bonding")
- subject
- topic
- task_type: one of [flashcards, quiz, summarise, read, practice, review]
- duration_minutes (15-45)
- xp_reward (25-100 based on difficulty)

Prioritise high-priority subjects and weak topics. Space subjects evenly.
Return ONLY a valid JSON array of tasks, no markdown, no explanation.`;

      const res = await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: { type: 'array', items: { type: 'object' } } });
      const tasks = Array.isArray(res) ? res : JSON.parse(res);

      // Save or update plan
      let savedPlan;
      if (plan?.id) {
        savedPlan = await base44.entities.RevisionPlan.update(plan.id, {
          subjects: subjectsClean,
          available_hours_per_day: hoursPerDay,
          plan_start_date: startDate,
          generated_schedule: JSON.stringify(tasks),
        });
      } else {
        savedPlan = await base44.entities.RevisionPlan.create({
          student_email: user.email,
          subjects: subjectsClean,
          available_hours_per_day: hoursPerDay,
          plan_start_date: startDate,
          generated_schedule: JSON.stringify(tasks),
          total_xp: 0, current_streak: 0, longest_streak: 0,
        });
      }

      // Delete old tasks and create new ones
      const oldTasks = await base44.entities.RevisionTask.filter({ student_email: user.email });
      await Promise.all(oldTasks.map(t => base44.entities.RevisionTask.delete(t.id)));
      await base44.entities.RevisionTask.bulkCreate(tasks.map(t => ({
        ...t,
        plan_id: savedPlan.id,
        student_email: user.email,
        status: new Date(t.date) < new Date(new Date().toDateString()) ? 'missed' : t.date === new Date().toISOString().split('T')[0] ? 'due' : 'upcoming',
      })));

      onPlanSaved?.();
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2"><Brain className="w-5 h-5 text-violet-400" /> AI Smart Planner</h3>
        
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-1 block">Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500/50" />
          </div>
          <div>
            <label className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-1 block">Hours Available Per Day</label>
            <div className="flex items-center gap-3">
              <input type="range" min="0.5" max="8" step="0.5" value={hoursPerDay} onChange={e => setHoursPerDay(Number(e.target.value))}
                className="flex-1 accent-violet-500" />
              <span className="text-violet-300 font-bold text-sm w-12">{hoursPerDay}h</span>
            </div>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          {subjects.map((s, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 p-3">
                <input value={s.name} onChange={e => updateSubject(i, 'name', e.target.value)}
                  placeholder="Subject name (e.g. Chemistry)"
                  className="flex-1 bg-transparent text-white text-sm placeholder:text-slate-500 focus:outline-none" />
                <input type="date" value={s.exam_date} onChange={e => updateSubject(i, 'exam_date', e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-slate-300 text-xs focus:outline-none" />
                <select value={s.priority} onChange={e => updateSubject(i, 'priority', e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <button onClick={() => setExpandedIdx(expandedIdx === i ? null : i)} className="text-slate-400 hover:text-white p-1">
                  {expandedIdx === i ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                <button onClick={() => removeSubject(i)} className="text-slate-600 hover:text-red-400 p-1"><Trash2 className="w-4 h-4" /></button>
              </div>
              <AnimatePresence>
                {expandedIdx === i && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="px-3 pb-3 border-t border-white/5">
                      <p className="text-slate-500 text-xs mt-2 mb-1">Weak topics (AI will prioritise these)</p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {(s.weak_topics || []).map(t => (
                          <span key={t} className="flex items-center gap-1 bg-red-500/10 border border-red-500/20 text-red-300 text-xs px-2 py-0.5 rounded-full">
                            {t} <button onClick={() => removeWeakTopic(i, t)} className="hover:text-red-100">×</button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input value={s._weakInput || ''} onChange={e => updateSubject(i, '_weakInput', e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && addWeakTopic(i)}
                          placeholder="Add weak topic..."
                          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs placeholder:text-slate-600 focus:outline-none" />
                        <button onClick={() => addWeakTopic(i)} className="bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded-lg px-3 py-1.5 text-xs hover:bg-violet-500/30">Add</button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={addSubject} className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-slate-300 rounded-xl text-sm hover:bg-white/10 transition-all">
            <Plus className="w-4 h-4" /> Add Subject
          </button>
          <button onClick={handleGenerate} disabled={generating || !subjects.length || subjects.some(s => !s.name)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50">
            {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Building your plan...</> : <><Sparkles className="w-4 h-4" /> Generate AI Revision Plan</>}
          </button>
        </div>

        {!subjects.length && (
          <div className="mt-4 flex items-start gap-2 bg-violet-500/10 border border-violet-500/20 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
            <p className="text-violet-300 text-xs">Add at least one subject with an exam date to generate your personalised revision timetable.</p>
          </div>
        )}
      </div>
    </div>
  );
}