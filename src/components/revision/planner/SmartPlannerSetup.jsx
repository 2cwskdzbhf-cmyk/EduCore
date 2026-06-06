import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Loader2, Sparkles, Calendar, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const PRIORITY_COLORS = { low: 'text-blue-400', medium: 'text-yellow-400', high: 'text-red-400' };

export default function SmartPlannerSetup({ user, notebooks, existingPlan, onPlanGenerated }) {
  const [subjects, setSubjects] = useState(
    existingPlan?.subjects || [{ name: '', exam_date: '', weak_topics: [], priority: 'medium' }]
  );
  const [hoursPerDay, setHoursPerDay] = useState(existingPlan?.available_hours_per_day || 2);
  const [loading, setLoading] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState(0);

  const addSubject = () => setSubjects([...subjects, { name: '', exam_date: '', weak_topics: [], priority: 'medium' }]);
  const removeSubject = (i) => setSubjects(subjects.filter((_, idx) => idx !== i));

  const updateSubject = (i, field, value) => {
    const updated = [...subjects];
    updated[i] = { ...updated[i], [field]: value };
    setSubjects(updated);
  };

  const addWeakTopic = (i) => {
    const updated = [...subjects];
    updated[i].weak_topics = [...(updated[i].weak_topics || []), ''];
    setSubjects(updated);
  };

  const updateWeakTopic = (si, ti, value) => {
    const updated = [...subjects];
    updated[si].weak_topics[ti] = value;
    setSubjects(updated);
  };

  const removeWeakTopic = (si, ti) => {
    const updated = [...subjects];
    updated[si].weak_topics = updated[si].weak_topics.filter((_, idx) => idx !== ti);
    setSubjects(updated);
  };

  const handleGenerate = async () => {
    const validSubjects = subjects.filter(s => s.name.trim());
    if (!validSubjects.length) return;

    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const prompt = `You are a revision planner AI. Generate a 7-day revision timetable and daily tasks for a student.

Student details:
- Available hours per day: ${hoursPerDay}
- Subjects: ${JSON.stringify(validSubjects)}
- Today's date: ${today}

Generate a JSON response with this exact structure:
{
  "schedule": [
    {
      "date": "YYYY-MM-DD",
      "day_label": "Monday",
      "tasks": [
        {
          "title": "Do 20 flashcards on [topic]",
          "description": "Review key definitions and concepts",
          "task_type": "flashcards",
          "subject": "subject name",
          "topic": "topic name",
          "duration_minutes": 20,
          "xp_reward": 50
        }
      ]
    }
  ]
}

task_type must be one of: flashcards, quiz, summarise, read, practice, review
Create 2-4 tasks per day based on available hours. Prioritise weak topics and subjects with earlier exam dates.
Focus heavily on weak_topics if provided. Return ONLY valid JSON.`;

      const res = await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: { type: 'object', properties: { schedule: { type: 'array' } } } });
      const schedule = res.schedule || [];

      // Save or update plan
      let plan;
      if (existingPlan?.id) {
        plan = await base44.entities.RevisionPlan.update(existingPlan.id, {
          subjects: validSubjects,
          available_hours_per_day: hoursPerDay,
          plan_start_date: today,
          generated_schedule: JSON.stringify(schedule),
        });
      } else {
        plan = await base44.entities.RevisionPlan.create({
          student_email: user.email,
          subjects: validSubjects,
          available_hours_per_day: hoursPerDay,
          plan_start_date: today,
          generated_schedule: JSON.stringify(schedule),
          total_xp: 0,
          current_streak: 0,
          longest_streak: 0,
        });
      }

      // Create tasks in DB
      const taskRecords = [];
      for (const day of schedule) {
        for (const task of (day.tasks || [])) {
          taskRecords.push({
            plan_id: plan.id,
            student_email: user.email,
            date: day.date,
            title: task.title,
            description: task.description || '',
            task_type: task.task_type || 'practice',
            subject: task.subject || '',
            topic: task.topic || '',
            duration_minutes: task.duration_minutes || 20,
            xp_reward: task.xp_reward || 50,
            status: new Date(day.date) < new Date(today) ? 'missed' : (day.date === today ? 'due' : 'upcoming'),
          });
        }
      }
      if (taskRecords.length) {
        await base44.entities.RevisionTask.bulkCreate(taskRecords);
      }

      onPlanGenerated(plan);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-3">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white">Smart Revision Planner</h2>
        <p className="text-slate-400 mt-1 text-sm">AI builds your personalised revision timetable</p>
      </div>

      {/* Hours per day */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <Clock className="w-4 h-4 text-violet-400" />
          <span className="text-white font-semibold text-sm">Available study time per day</span>
        </div>
        <div className="flex items-center gap-3">
          {[1, 1.5, 2, 3, 4, 5].map(h => (
            <button key={h} onClick={() => setHoursPerDay(h)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                hoursPerDay === h ? 'bg-violet-500 text-white' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}>
              {h}h
            </button>
          ))}
        </div>
      </div>

      {/* Subjects */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-white font-semibold text-sm">Subjects & Exam Dates</span>
          <button onClick={addSubject} className="flex items-center gap-1 text-violet-400 hover:text-violet-300 text-xs font-medium">
            <Plus className="w-3 h-3" /> Add Subject
          </button>
        </div>

        {subjects.map((subj, i) => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-3 p-4">
              <input
                value={subj.name}
                onChange={e => updateSubject(i, 'name', e.target.value)}
                placeholder="Subject name (e.g. Chemistry)"
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50"
              />
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-500" />
                <input
                  type="date"
                  value={subj.exam_date}
                  onChange={e => updateSubject(i, 'exam_date', e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500/50"
                />
              </div>
              <select
                value={subj.priority}
                onChange={e => updateSubject(i, 'priority', e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-violet-500/50 text-slate-300"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <button onClick={() => setExpandedIdx(expandedIdx === i ? null : i)} className="text-slate-500 hover:text-white">
                {expandedIdx === i ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {subjects.length > 1 && (
                <button onClick={() => removeSubject(i)} className="text-slate-600 hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            {expandedIdx === i && (
              <div className="px-4 pb-4 border-t border-white/5 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-medium">Weak Topics</span>
                  <button onClick={() => addWeakTopic(i)} className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
                <div className="space-y-2">
                  {(subj.weak_topics || []).map((topic, ti) => (
                    <div key={ti} className="flex items-center gap-2">
                      <input
                        value={topic}
                        onChange={e => updateWeakTopic(i, ti, e.target.value)}
                        placeholder={`Weak topic (e.g. Covalent Bonding)`}
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50"
                      />
                      <button onClick={() => removeWeakTopic(i, ti)} className="text-slate-600 hover:text-red-400">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {!(subj.weak_topics || []).length && (
                    <p className="text-xs text-slate-600 italic">No weak topics added — AI will balance coverage evenly</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading || !subjects.some(s => s.name.trim())}
        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
      >
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating your timetable...</> : <><Sparkles className="w-4 h-4" /> Generate My Revision Plan</>}
      </button>
    </div>
  );
}