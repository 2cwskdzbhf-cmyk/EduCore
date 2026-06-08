import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Sparkles, Loader2, ChevronRight, ChevronLeft,
  Calendar, Clock, Target, Zap, RotateCcw, AlertCircle,
  CheckCircle, BookOpen, TrendingUp, Shield, Flame
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { addDays, format, differenceInDays, parseISO } from 'date-fns';

/* ── Glass design tokens ── */
const G = {
  card: 'bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl',
  input: 'w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-[#3D52A0] placeholder:text-[#8697C4] focus:outline-none focus:border-[#7091E6]/60 text-sm',
  label: 'block text-[#3D52A0] text-xs font-semibold uppercase tracking-wide mb-1.5',
  primaryBtn: 'flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-[#7091E6] to-[#3D52A0] text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-40 shadow-lg',
  ghostBtn: 'flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 border border-white/20 text-[#3D52A0] rounded-xl text-sm font-medium hover:bg-white/20 transition-all',
  pill: (active) => `px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${active ? 'bg-[#7091E6] text-white border-[#7091E6]' : 'bg-white/10 text-[#3D52A0] border-white/20 hover:bg-white/20'}`,
};

const CONFIDENCE_LEVELS = [
  { value: 'very_low', label: 'Very Low', desc: 'I barely know this subject', color: 'text-red-500', sessions: 6, examPractice: 1 },
  { value: 'low', label: 'Low', desc: 'I need a lot of work', color: 'text-orange-500', sessions: 5, examPractice: 1 },
  { value: 'medium', label: 'Medium', desc: 'I know the basics', color: 'text-amber-500', sessions: 4, examPractice: 2 },
  { value: 'high', label: 'High', desc: 'Pretty confident', color: 'text-emerald-500', sessions: 3, examPractice: 3 },
  { value: 'very_high', label: 'Very High', desc: 'Just need exam practice', color: 'text-blue-500', sessions: 2, examPractice: 4 },
];

const INTENSITY_OPTIONS = [
  { value: 'light', label: '🌱 Light', desc: 'Gentle pacing, low stress' },
  { value: 'balanced', label: '⚖️ Balanced', desc: 'Recommended for most students' },
  { value: 'intensive', label: '🔥 Intensive', desc: 'Maximum revision coverage' },
];

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function StepIndicator({ step, total }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <React.Fragment key={i}>
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
            i < step ? 'bg-[#7091E6] text-white' : i === step ? 'bg-white/20 border-2 border-[#7091E6] text-[#3D52A0]' : 'bg-white/10 text-[#8697C4]'
          }`}>{i + 1}</div>
          {i < total - 1 && <div className={`flex-1 h-0.5 rounded-full transition-all ${i < step ? 'bg-[#7091E6]' : 'bg-white/20'}`} />}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function SmartPlanner({ user, plan, onPlanSaved }) {
  const [step, setStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');

  // Form state
  const [subject, setSubject] = useState('');
  const [examDate, setExamDate] = useState('');
  const [confidence, setConfidence] = useState('medium');
  const [hoursPerDay, setHoursPerDay] = useState(1.5);
  const [daysPerWeek, setDaysPerWeek] = useState([1, 2, 3, 4, 0]); // Mon-Fri + Sun indices (0=Sun,1=Mon...)
  const [intensity, setIntensity] = useState('balanced');
  const [topics, setTopics] = useState('');
  const [topicFocus, setTopicFocus] = useState('');

  const today = new Date().toISOString().split('T')[0];
  const daysUntilExam = examDate ? differenceInDays(parseISO(examDate), new Date()) : 0;

  const toggleDay = (dayIdx) => {
    setDaysPerWeek(prev =>
      prev.includes(dayIdx) ? prev.filter(d => d !== dayIdx) : [...prev, dayIdx]
    );
  };

  // Map display day index (Mon=0) to JS day (Mon=1)
  const displayToJSDay = (displayIdx) => displayIdx === 6 ? 0 : displayIdx + 1;

  const buildSchedule = (tasks, startDate, endDate, revisionDays) => {
    const schedule = [];
    let current = new Date(startDate);
    const end = new Date(endDate);
    const topicList = topics.split(',').map(t => t.trim()).filter(Boolean);
    const confLevel = CONFIDENCE_LEVELS.find(c => c.value === confidence) || CONFIDENCE_LEVELS[2];
    
    const totalDays = differenceInDays(end, current);
    const finalWeekStart = addDays(end, -7);
    
    let topicIdx = 0;
    let sessionCount = 0;

    while (current <= end) {
      const jsDay = current.getDay(); // 0=Sun, 1=Mon...
      const dateStr = current.toISOString().split('T')[0];
      const daysLeft = differenceInDays(end, current);
      const isRevisionDay = revisionDays.includes(jsDay);
      const isEndOfWeek = jsDay === 0 || jsDay === 6; // Sat or Sun = potential recap
      const isFinalWeek = current >= finalWeekStart;
      const isWeekEnd = jsDay === 0; // Sunday = recap day
      
      // Difficulty curve: increases as exam approaches
      const progressRatio = totalDays > 0 ? 1 - (daysLeft / totalDays) : 1;
      const difficultyMultiplier = 1 + progressRatio * 0.5; // 1.0 → 1.5x harder

      if (isRevisionDay) {
        const dayTasks = [];
        const minutesAvail = hoursPerDay * 60;
        let minutesUsed = 0;
        const currentTopic = topicList.length > 0 ? topicList[topicIdx % topicList.length] : subject;
        const nextTopic = topicList.length > 1 ? topicList[(topicIdx + 1) % topicList.length] : subject;

        // Final week: exam practice sessions
        if (isFinalWeek) {
          dayTasks.push({
            date: dateStr,
            title: `⚡ Exam-Style Practice: ${currentTopic || subject}`,
            subject, topic: currentTopic || subject,
            task_type: 'practice',
            duration_minutes: Math.min(45, minutesAvail * 0.5),
            xp_reward: Math.round(80 * difficultyMultiplier),
            session_phase: 'exam_practice',
          });
          minutesUsed += Math.min(45, minutesAvail * 0.5);

          if (minutesAvail - minutesUsed >= 20) {
            dayTasks.push({
              date: dateStr,
              title: `📝 Timed Past Paper Questions: ${nextTopic || subject}`,
              subject, topic: nextTopic || subject,
              task_type: 'quiz',
              duration_minutes: Math.min(30, minutesAvail - minutesUsed),
              xp_reward: Math.round(70 * difficultyMultiplier),
              session_phase: 'exam_practice',
            });
          }
        } else {
          // Warm-up (5-10 min)
          if (sessionCount > 0 && minutesAvail >= 30) {
            dayTasks.push({
              date: dateStr,
              title: `🌅 Warm-Up: Quick recall on ${currentTopic || subject}`,
              subject, topic: currentTopic || subject,
              task_type: 'flashcards',
              duration_minutes: 10,
              xp_reward: 20,
              session_phase: 'warmup',
            });
            minutesUsed += 10;
          }

          // Main study session
          const mainMins = Math.min(40, minutesAvail * 0.5);
          const taskTypes = confidence === 'very_low' || confidence === 'low'
            ? ['read', 'summarise', 'flashcards', 'practice']
            : confidence === 'high' || confidence === 'very_high'
            ? ['practice', 'quiz', 'flashcards', 'practice']
            : ['read', 'flashcards', 'practice', 'quiz'];
          const mainType = taskTypes[sessionCount % taskTypes.length];

          const mainTitles = {
            read: `📖 Deep Study: ${topicFocus || currentTopic || subject}`,
            summarise: `✍️ Summarise Key Points: ${topicFocus || currentTopic || subject}`,
            flashcards: `🃏 Flashcard Drill: ${topicFocus || currentTopic || subject}`,
            practice: `🎯 Practice Questions: ${topicFocus || currentTopic || subject}`,
            quiz: `🧠 Mini Quiz: ${topicFocus || currentTopic || subject}`,
          };

          dayTasks.push({
            date: dateStr,
            title: mainTitles[mainType] || `Study: ${currentTopic || subject}`,
            subject, topic: currentTopic || subject,
            task_type: mainType,
            duration_minutes: Math.round(mainMins),
            xp_reward: Math.round(50 * difficultyMultiplier),
            session_phase: 'main',
          });
          minutesUsed += mainMins;

          // Second main session if time allows
          if (minutesAvail - minutesUsed >= 20) {
            topicIdx++;
            const nextT = topicList.length > 0 ? topicList[topicIdx % topicList.length] : subject;
            dayTasks.push({
              date: dateStr,
              title: `📚 Topic Rotation: ${nextT}`,
              subject, topic: nextT,
              task_type: 'practice',
              duration_minutes: Math.round(Math.min(30, minutesAvail - minutesUsed - 5)),
              xp_reward: Math.round(45 * difficultyMultiplier),
              session_phase: 'main',
            });
            minutesUsed += 30;
          }
        }

        dayTasks.forEach(t => schedule.push(t));
        topicIdx++;
        sessionCount++;
      }

      // End-of-week recap (Sunday)
      if (jsDay === 0 && sessionCount > 0 && sessionCount % 5 === 0) {
        schedule.push({
          date: dateStr,
          title: `🔁 Weekly Recap: Review all topics covered`,
          subject, topic: 'All Topics',
          task_type: 'review',
          duration_minutes: 30,
          xp_reward: 60,
          session_phase: 'recap',
        });
      }

      current = addDays(current, 1);
    }

    return schedule;
  };

  const handleGenerate = async () => {
    if (!subject || !examDate) return;
    setGenerating(true);
    setGenerationStatus('Analysing your revision needs…');

    try {
      const confLevel = CONFIDENCE_LEVELS.find(c => c.value === confidence) || CONFIDENCE_LEVELS[2];
      const revisionDays = daysPerWeek.map(displayIdx => displayToJSDay(displayIdx));
      const topicList = topics.split(',').map(t => t.trim()).filter(Boolean);

      setGenerationStatus('Building your personalised schedule…');

      const prompt = `You are an expert revision planner AI. Create a highly personalised, intelligent revision timetable.

Student profile:
- Subject: ${subject}
- Exam date: ${examDate}
- Confidence level: ${confidence} (${confLevel.desc})
- Hours per day: ${hoursPerDay}
- Days per week: ${daysPerWeek.length} days
- Intensity preference: ${intensity}
- Topics to cover: ${topicList.length > 0 ? topicList.join(', ') : 'General ' + subject + ' content'}
- Topic focus: ${topicFocus || 'None specified'}
- Days until exam: ${daysUntilExam}

Rules for the plan:
1. LOW/VERY_LOW confidence → more spaced repetition, more sessions per week, heavy use of flashcards and summaries
2. HIGH/VERY_HIGH confidence → shorter focused sessions, more exam practice and past papers
3. Include WARM-UP sessions (10 min flashcards at start of each session)
4. Include MAIN STUDY sessions (reading, summarising, practice questions)
5. Include END-OF-WEEK RECAP sessions every Sunday/week end
6. Final 7 days = ONLY exam-style practice and timed questions
7. TOPIC ROTATION: cycle through topics so the same topic isn't covered two days in a row
8. Difficulty INCREASES as exam date approaches (harder questions, more timed practice)
9. For intensity "${intensity}": light=1-2 tasks/day, balanced=2-3 tasks/day, intensive=3-4 tasks/day

Generate tasks from ${today} to ${examDate}. Each task must have:
- date (YYYY-MM-DD format, only on revision days)
- title (specific and motivating, include emoji)
- subject: "${subject}"
- topic (specific topic name from the list or a relevant sub-topic)
- task_type: one of [flashcards, quiz, summarise, read, practice, review]
- duration_minutes (10-45)
- xp_reward (20-100)
- session_phase: one of [warmup, main, recap, exam_practice, catchup]

Return ONLY a valid JSON array. No markdown or explanation.`;

      setGenerationStatus('Generating AI schedule (this may take a moment)…');
      
      let tasks;
      try {
        const res = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                date: { type: 'string' },
                title: { type: 'string' },
                subject: { type: 'string' },
                topic: { type: 'string' },
                task_type: { type: 'string' },
                duration_minutes: { type: 'number' },
                xp_reward: { type: 'number' },
                session_phase: { type: 'string' },
              }
            }
          }
        });
        tasks = Array.isArray(res) ? res : JSON.parse(res);
      } catch (e) {
        // Fallback: build schedule locally
        setGenerationStatus('Building schedule locally…');
        tasks = buildSchedule([], today, examDate, daysPerWeek.map(d => displayToJSDay(d)));
      }

      setGenerationStatus('Saving your plan…');

      // Save/update plan
      let savedPlan;
      const planData = {
        subjects: [{ name: subject, exam_date: examDate, weak_topics: topicList, priority: 'high' }],
        available_hours_per_day: hoursPerDay,
        plan_start_date: today,
        generated_schedule: JSON.stringify(tasks),
      };

      if (plan?.id) {
        savedPlan = await base44.entities.RevisionPlan.update(plan.id, planData);
      } else {
        savedPlan = await base44.entities.RevisionPlan.create({
          student_email: user.email,
          ...planData,
          total_xp: 0, current_streak: 0, longest_streak: 0,
        });
      }

      // Delete old tasks and create new ones
      const oldTasks = await base44.entities.RevisionTask.filter({ student_email: user.email });
      await Promise.all(oldTasks.map(t => base44.entities.RevisionTask.delete(t.id)));

      const taskRecords = tasks.map(t => ({
        ...t,
        plan_id: savedPlan.id,
        student_email: user.email,
        status: t.date < today ? 'missed' : t.date === today ? 'due' : 'upcoming',
      }));

      // Batch create in chunks of 20
      for (let i = 0; i < taskRecords.length; i += 20) {
        await base44.entities.RevisionTask.bulkCreate(taskRecords.slice(i, i + 20));
      }

      onPlanSaved?.();
    } finally {
      setGenerating(false);
      setGenerationStatus('');
    }
  };

  const canGenerate = subject.trim() && examDate && daysPerWeek.length > 0;

  // ── Step content ─────────────────────────────────────────────────────────────
  const steps = [
    {
      title: 'What are you revising?',
      subtitle: 'Tell us about your exam',
      content: (
        <div className="space-y-4">
          <div>
            <label className={G.label}>Subject / Course</label>
            <input className={G.input} placeholder="e.g. GCSE Chemistry, A-Level Maths…"
              value={subject} onChange={e => setSubject(e.target.value)} />
          </div>
          <div>
            <label className={G.label}>Exam Date</label>
            <input type="date" className={G.input} min={today}
              value={examDate} onChange={e => setExamDate(e.target.value)} />
            {examDate && daysUntilExam > 0 && (
              <p className="mt-1.5 text-[#7091E6] text-xs font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> {daysUntilExam} days until your exam
              </p>
            )}
          </div>
          <div>
            <label className={G.label}>Topics to Cover <span className="text-[#8697C4] normal-case font-normal">(optional — comma separated)</span></label>
            <input className={G.input} placeholder="e.g. Covalent Bonding, Organic Chemistry, Moles…"
              value={topics} onChange={e => setTopics(e.target.value)} />
          </div>
          <div>
            <label className={G.label}>Priority Topic Focus <span className="text-[#8697C4] normal-case font-normal">(optional)</span></label>
            <input className={G.input} placeholder="e.g. Electrolysis — the topic I struggle with most"
              value={topicFocus} onChange={e => setTopicFocus(e.target.value)} />
          </div>
        </div>
      )
    },
    {
      title: 'How confident are you?',
      subtitle: 'This shapes your entire revision plan',
      content: (
        <div className="space-y-3">
          {CONFIDENCE_LEVELS.map(lvl => (
            <button key={lvl.value} onClick={() => setConfidence(lvl.value)}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                confidence === lvl.value
                  ? 'bg-[#7091E6]/15 border-[#7091E6]/50'
                  : 'bg-white/5 border-white/15 hover:bg-white/10'
              }`}>
              <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all ${
                confidence === lvl.value ? 'border-[#7091E6] bg-[#7091E6]' : 'border-white/30'
              }`} />
              <div className="flex-1">
                <p className={`font-semibold text-sm ${lvl.color}`}>{lvl.label}</p>
                <p className="text-[#8697C4] text-xs mt-0.5">{lvl.desc}</p>
              </div>
              <div className="text-right text-xs text-[#8697C4]">
                <p>{lvl.sessions} sessions/wk</p>
                <p>{lvl.examPractice} practice/wk</p>
              </div>
            </button>
          ))}
        </div>
      )
    },
    {
      title: 'Your revision schedule',
      subtitle: 'Customise when and how much you revise',
      content: (
        <div className="space-y-5">
          <div>
            <label className={G.label}>Hours per revision day</label>
            <div className="flex items-center gap-4 mt-1">
              <input type="range" min="0.5" max="6" step="0.5" value={hoursPerDay}
                onChange={e => setHoursPerDay(Number(e.target.value))}
                className="flex-1 accent-[#7091E6]" />
              <span className="text-[#3D52A0] font-bold text-lg w-14 text-right">{hoursPerDay}h</span>
            </div>
            <div className="flex justify-between text-[#8697C4] text-xs mt-1">
              <span>30 min</span><span>6 hrs</span>
            </div>
          </div>
          <div>
            <label className={G.label}>Revision days per week</label>
            <div className="flex gap-2 mt-1.5 flex-wrap">
              {DAYS_OF_WEEK.map((day, idx) => (
                <button key={day} onClick={() => toggleDay(idx)}
                  className={G.pill(daysPerWeek.includes(idx))}>
                  {day}
                </button>
              ))}
            </div>
            <p className="text-[#8697C4] text-xs mt-1.5">{daysPerWeek.length} day{daysPerWeek.length !== 1 ? 's' : ''} selected</p>
          </div>
          <div>
            <label className={G.label}>Revision Intensity</label>
            <div className="space-y-2 mt-1.5">
              {INTENSITY_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setIntensity(opt.value)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                    intensity === opt.value
                      ? 'bg-[#7091E6]/15 border-[#7091E6]/50'
                      : 'bg-white/5 border-white/15 hover:bg-white/10'
                  }`}>
                  <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${
                    intensity === opt.value ? 'border-[#7091E6] bg-[#7091E6]' : 'border-white/30'
                  }`} />
                  <div>
                    <p className="text-[#3D52A0] font-semibold text-sm">{opt.label}</p>
                    <p className="text-[#8697C4] text-xs">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Your plan summary',
      subtitle: 'Review before generating',
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-[#7091E6]/20 to-[#3D52A0]/10 border border-[#7091E6]/30 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7091E6] to-[#3D52A0] flex items-center justify-center shadow-lg">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="text-[#3D52A0] font-bold text-lg">{subject}</h4>
                <p className="text-[#7091E6] text-sm">{examDate ? `Exam: ${format(parseISO(examDate), 'd MMM yyyy')}` : 'No exam date set'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Shield, label: 'Confidence', value: CONFIDENCE_LEVELS.find(c => c.value === confidence)?.label },
                { icon: Clock, label: 'Daily Hours', value: `${hoursPerDay}h per day` },
                { icon: Calendar, label: 'Revision Days', value: `${daysPerWeek.length} days/week` },
                { icon: Flame, label: 'Intensity', value: INTENSITY_OPTIONS.find(i => i.value === intensity)?.label },
                { icon: Target, label: 'Days Until Exam', value: daysUntilExam > 0 ? `${daysUntilExam} days` : 'Set exam date' },
                { icon: BookOpen, label: 'Topics', value: topics ? `${topics.split(',').filter(Boolean).length} topics` : 'General content' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-white/10 rounded-xl p-3 flex items-center gap-2">
                  <Icon className="w-4 h-4 text-[#7091E6] flex-shrink-0" />
                  <div>
                    <p className="text-[#8697C4] text-xs">{label}</p>
                    <p className="text-[#3D52A0] font-semibold text-sm">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2 text-sm text-[#3D52A0]">
            {[
              '🌅 Warm-up sessions at the start of each day',
              '📚 Topic rotation so you cover everything',
              '🔁 End-of-week recap sessions every Sunday',
              '⚡ Exam-style practice in the final 7 days',
              '📈 Difficulty curve increases towards exam day',
              '🔄 Catch-up days if sessions are missed',
            ].map(item => (
              <div key={item} className="flex items-center gap-2 bg-white/8 rounded-lg px-3 py-2">
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )
    }
  ];

  return (
    <div className={`${G.card} p-6`}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7091E6] to-[#3D52A0] flex items-center justify-center shadow-lg">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-[#3D52A0] font-bold text-lg">AI Smart Planner</h3>
          <p className="text-[#8697C4] text-sm">Personalised revision scheduling</p>
        </div>
        {plan?.id && (
          <button onClick={() => { setStep(0); }}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-white/10 border border-white/20 text-[#7091E6] rounded-lg text-xs font-medium hover:bg-white/20 transition-all">
            <RotateCcw className="w-3.5 h-3.5" /> Regenerate
          </button>
        )}
      </div>

      <StepIndicator step={step} total={steps.length} />

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
          <div className="mb-2">
            <h4 className="text-[#3D52A0] font-bold text-base">{steps[step].title}</h4>
            <p className="text-[#8697C4] text-sm">{steps[step].subtitle}</p>
          </div>
          <div className="mt-4">{steps[step].content}</div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex gap-3 mt-6">
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)} className={G.ghostBtn}>
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
        )}
        {step < steps.length - 1 ? (
          <button onClick={() => setStep(s => s + 1)}
            disabled={(step === 0 && (!subject || !examDate))}
            className={`${G.primaryBtn} flex-1`}>
            Continue <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={handleGenerate} disabled={generating || !canGenerate} className={`${G.primaryBtn} flex-1`}>
            {generating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> {generationStatus || 'Generating…'}</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Generate My Revision Plan</>
            )}
          </button>
        )}
      </div>

      {step === 0 && !subject && (
        <div className="mt-4 flex items-start gap-2 bg-[#7091E6]/10 border border-[#7091E6]/20 rounded-xl p-3">
          <AlertCircle className="w-4 h-4 text-[#7091E6] flex-shrink-0 mt-0.5" />
          <p className="text-[#3D52A0] text-xs">Enter your subject and exam date to get started.</p>
        </div>
      )}
    </div>
  );
}