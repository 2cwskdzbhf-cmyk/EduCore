import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import {
  Upload, Camera, Loader2, CheckCircle, AlertCircle,
  Edit2, Trash2, Plus, RefreshCw, ChevronRight, X,
  ImageIcon, Sparkles
} from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const G = {
  card: { background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.28)' },
  input: 'w-full bg-white/15 border border-white/25 rounded-xl px-3 py-2.5 text-[#3D52A0] placeholder:text-[#8697C4] focus:outline-none focus:border-[#7091E6]/60 text-sm',
  label: 'text-[#3D52A0] text-xs font-bold uppercase tracking-wide mb-1 block',
  pill: (active) => `px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${active ? 'bg-[#7091E6] text-white border-[#7091E6]' : 'bg-white/15 text-[#3D52A0] border-white/25 hover:bg-white/25'}`,
  btn: 'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
};

// Parse iCal-style date (not used directly but kept for future)
const SUBJECT_COLOURS = [
  'from-blue-400 to-blue-600', 'from-emerald-400 to-emerald-600',
  'from-amber-400 to-amber-600', 'from-rose-400 to-rose-600',
  'from-violet-400 to-violet-600', 'from-cyan-400 to-cyan-600',
  'from-pink-400 to-pink-600', 'from-orange-400 to-orange-600',
];
let colourIdx = 0;
const subjectColourMap = {};
const getColour = (subject) => {
  if (!subject) return SUBJECT_COLOURS[0];
  if (!subjectColourMap[subject]) {
    subjectColourMap[subject] = SUBJECT_COLOURS[colourIdx % SUBJECT_COLOURS.length];
    colourIdx++;
  }
  return subjectColourMap[subject];
};

function DropZone({ onFile, uploading, label = 'Upload Screenshot', sublabel = 'PNG, JPG, HEIC supported' }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl p-8 cursor-pointer transition-all border-2 border-dashed ${
        dragging ? 'border-[#7091E6] bg-[#7091E6]/10' : 'border-white/30 hover:border-[#7091E6]/50 hover:bg-white/10'
      }`}
    >
      <input ref={inputRef} type="file" accept="image/*,.heic" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      {uploading ? (
        <Loader2 className="w-10 h-10 animate-spin text-[#7091E6]" />
      ) : (
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
          style={{ background: 'linear-gradient(135deg,#7091E6,#3D52A0)' }}>
          <Camera className="w-8 h-8 text-white" />
        </div>
      )}
      <div className="text-center">
        <p className="text-[#3D52A0] font-bold">{uploading ? 'Reading screenshot…' : label}</p>
        <p className="text-[#8697C4] text-xs mt-1">{sublabel}</p>
      </div>
    </div>
  );
}

function LessonRow({ lesson, idx, onChange, onDelete }) {
  return (
    <div className="grid gap-2 p-3 rounded-xl mb-2"
      style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div>
          <label className={G.label}>Lesson Name</label>
          <input className={G.input} value={lesson.lesson_name || ''} placeholder="e.g. Maths"
            onChange={e => onChange(idx, 'lesson_name', e.target.value)} />
        </div>
        <div>
          <label className={G.label}>Subject</label>
          <input className={G.input} value={lesson.subject || ''} placeholder="e.g. Mathematics"
            onChange={e => onChange(idx, 'subject', e.target.value)} />
        </div>
        <div>
          <label className={G.label}>Day</label>
          <select className={G.input} value={lesson.day_of_week || 'Monday'}
            onChange={e => onChange(idx, 'day_of_week', e.target.value)}>
            {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className={G.label}>Week</label>
          <select className={G.input} value={lesson.week_number || 1}
            onChange={e => onChange(idx, 'week_number', Number(e.target.value))}>
            <option value={1}>Week A / 1</option>
            <option value={2}>Week B / 2</option>
          </select>
        </div>
        <div>
          <label className={G.label}>Start Time</label>
          <input type="time" className={G.input} value={lesson.start_time || ''}
            onChange={e => onChange(idx, 'start_time', e.target.value)} />
        </div>
        <div>
          <label className={G.label}>Duration (min)</label>
          <input type="number" className={G.input} value={lesson.duration_minutes || 60}
            onChange={e => onChange(idx, 'duration_minutes', Number(e.target.value))} />
        </div>
        <div>
          <label className={G.label}>Teacher</label>
          <input className={G.input} value={lesson.teacher_name || ''} placeholder="Optional"
            onChange={e => onChange(idx, 'teacher_name', e.target.value)} />
        </div>
        <div>
          <label className={G.label}>Room</label>
          <input className={G.input} value={lesson.room || ''} placeholder="Optional"
            onChange={e => onChange(idx, 'room', e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end">
        <button onClick={() => onDelete(idx)}
          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50/50 transition-all">
          <Trash2 className="w-3.5 h-3.5" /> Remove
        </button>
      </div>
    </div>
  );
}

export default function ScreenshotTimetableImporter({ user, onImported, onClose }) {
  const [phase, setPhase] = useState('upload'); // upload | scanning | gaps | preview | saving
  const [uploadedImages, setUploadedImages] = useState([]); // [{url, label}]
  const [scanStatus, setScanStatus] = useState('');
  const [missingFields, setMissingFields] = useState(null); // null or object with questions
  const [gapAnswers, setGapAnswers] = useState({});
  const [lessons, setLessons] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const scanImage = async (imageUrl, label, existingAnswers = {}) => {
    setPhase('scanning');
    setScanStatus('Uploading image…');
    setError('');

    // Build a rich prompt that handles both week A/B uploads
    const contextNote = uploadedImages.length > 0
      ? `Note: The user has already uploaded ${uploadedImages.length} timetable screenshot(s). This is an additional one labelled "${label}".`
      : '';

    const gapContext = Object.keys(existingAnswers).length > 0
      ? `\n\nThe user has provided these clarifications:\n${Object.entries(existingAnswers).map(([k, v]) => `- ${k}: ${v}`).join('\n')}`
      : '';

    setScanStatus('AI is reading your timetable…');

    try {
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: imageUrl,
        json_schema: {
          type: 'object',
          properties: {
            lessons: {
              type: 'array',
              description: 'All lessons detected from the timetable screenshot',
              items: {
                type: 'object',
                properties: {
                  lesson_name: { type: 'string', description: 'Name/title of the lesson or subject' },
                  subject: { type: 'string', description: 'Subject category (Maths, English, Science, etc.)' },
                  day_of_week: { type: 'string', description: 'Day: Monday/Tuesday/Wednesday/Thursday/Friday' },
                  start_time: { type: 'string', description: 'Start time in HH:MM 24h format' },
                  end_time: { type: 'string', description: 'End time in HH:MM 24h format' },
                  duration_minutes: { type: 'number', description: 'Duration in minutes' },
                  teacher_name: { type: 'string', description: 'Teacher name if visible' },
                  room: { type: 'string', description: 'Room number/name if visible' },
                  week_number: { type: 'number', description: '1 for Week A, 2 for Week B. Use 1 if not a rotating timetable.' },
                },
                required: ['lesson_name', 'day_of_week'],
              }
            },
            missing_info: {
              type: 'object',
              description: 'Any information that could not be determined from the screenshot',
              properties: {
                has_missing: { type: 'boolean' },
                school_day_start: { type: 'boolean', description: 'True if school day start time unclear' },
                lesson_duration: { type: 'boolean', description: 'True if lesson duration unclear' },
                week_rotation: { type: 'boolean', description: 'True if week A/B rotation not determinable' },
                break_times: { type: 'boolean', description: 'True if break/lunch times unclear' },
                custom_questions: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Any other specific questions to ask the user'
                }
              }
            },
            confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
            notes: { type: 'string', description: 'Any observations about the timetable format or structure' }
          },
          required: ['lessons', 'missing_info']
        }
      });

      if (result.status === 'error') throw new Error(result.details || 'Scan failed');

      const output = result.output;
      const scannedLessons = output?.lessons || [];

      // Apply gap answers to fill in missing times
      const filled = scannedLessons.map((l, i) => {
        let duration = l.duration_minutes;
        if (!duration && l.start_time && l.end_time) {
          const [sh, sm] = l.start_time.split(':').map(Number);
          const [eh, em] = l.end_time.split(':').map(Number);
          duration = (eh * 60 + em) - (sh * 60 + sm);
        }
        if (!duration && existingAnswers.lesson_duration) {
          duration = Number(existingAnswers.lesson_duration);
        }
        if (!l.start_time && existingAnswers.school_day_start) {
          // Spread lessons across the day if we know start time + duration
          const dur = duration || 60;
          const [sh, sm] = existingAnswers.school_day_start.split(':').map(Number);
          const breakAt = existingAnswers.break_after_lessons ? Number(existingAnswers.break_after_lessons) : 2;
          const breakDur = existingAnswers.break_duration ? Number(existingAnswers.break_duration) : 15;
          const sameDayLessons = scannedLessons.filter(x => x.day_of_week === l.day_of_week);
          const lessonPos = sameDayLessons.indexOf(l);
          const totalMins = sh * 60 + sm + (lessonPos * dur) + (Math.floor(lessonPos / breakAt) * breakDur);
          l.start_time = `${String(Math.floor(totalMins / 60)).padStart(2, '0')}:${String(totalMins % 60).padStart(2, '0')}`;
        }
        return { ...l, duration_minutes: duration || 60, week_number: l.week_number || (label.toLowerCase().includes('b') || label.toLowerCase().includes('2') ? 2 : 1) };
      });

      // Merge with existing lessons from previous uploads
      const merged = [...lessons, ...filled];
      setLessons(merged);

      // Check if we need to ask questions
      const missing = output?.missing_info;
      if (missing?.has_missing && Object.keys(existingAnswers).length === 0) {
        const questions = [];
        if (missing.school_day_start) questions.push({ key: 'school_day_start', label: 'What time does the school day start? (e.g. 08:45)', type: 'time' });
        if (missing.lesson_duration) questions.push({ key: 'lesson_duration', label: 'How long is each lesson in minutes? (e.g. 60)', type: 'number' });
        if (missing.break_times) {
          questions.push({ key: 'break_after_lessons', label: 'After how many lessons is there a break?', type: 'number' });
          questions.push({ key: 'break_duration', label: 'How long are breaks in minutes?', type: 'number' });
        }
        if (missing.week_rotation) questions.push({ key: 'week_rotation', label: 'Is this a Week A (1) or Week B (2) timetable?', type: 'select', options: ['1', '2'] });
        if (missing.custom_questions?.length) {
          missing.custom_questions.forEach((q, i) => questions.push({ key: `custom_${i}`, label: q, type: 'text' }));
        }

        if (questions.length > 0) {
          setMissingFields(questions);
          setGapAnswers({});
          setPhase('gaps');
          return;
        }
      }

      setPhase('preview');
    } catch (e) {
      setError('Could not read the timetable. Please try a clearer screenshot.');
      setPhase('upload');
    } finally {
      setScanStatus('');
    }
  };

  const handleFile = async (file) => {
    setError('');
    setPhase('scanning');
    setScanStatus('Uploading image…');
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const label = uploadedImages.length === 0 ? 'Week A / Timetable' : `Week B / Timetable ${uploadedImages.length + 1}`;
      setUploadedImages(prev => [...prev, { url: file_url, label }]);
      await scanImage(file_url, label);
    } catch (e) {
      setError('Upload failed. Please try again.');
      setPhase('upload');
    }
  };

  const handleGapSubmit = async () => {
    const lastImg = uploadedImages[uploadedImages.length - 1];
    await scanImage(lastImg.url, lastImg.label, gapAnswers);
  };

  const handleLessonChange = (idx, field, value) => {
    setLessons(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const handleLessonDelete = (idx) => {
    setLessons(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddLesson = () => {
    setLessons(prev => [...prev, {
      lesson_name: '', subject: '', day_of_week: 'Monday',
      start_time: '', duration_minutes: 60, teacher_name: '', room: '', week_number: 1
    }]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Delete old timetable lessons for this user first
      const existing = await base44.entities.TimetableLesson.filter({ student_email: user.email });
      await Promise.all(existing.map(l => base44.entities.TimetableLesson.delete(l.id)));

      // Bulk create
      const toCreate = lessons.filter(l => l.lesson_name && l.day_of_week).map(l => ({
        student_email: user.email,
        lesson_name: l.lesson_name,
        subject: l.subject || l.lesson_name,
        teacher_name: l.teacher_name || '',
        room: l.room || '',
        day_of_week: l.day_of_week,
        start_time: l.start_time || '',
        duration_minutes: l.duration_minutes || 60,
        week_number: l.week_number || 1,
        notes: l.notes || '',
        order_index: 0,
      }));

      await base44.entities.TimetableLesson.bulkCreate(toCreate);
      onImported?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(61,82,160,0.3)', backdropFilter: 'blur(12px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl"
        style={{ background: 'linear-gradient(135deg, rgba(237,232,245,0.97) 0%, rgba(200,212,245,0.97) 100%)', border: '1px solid rgba(255,255,255,0.5)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 sticky top-0 z-10"
          style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.3)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md"
              style={{ background: 'linear-gradient(135deg,#7091E6,#3D52A0)' }}>
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-black text-lg text-[#3D52A0]">Screenshot Timetable Builder</h2>
              <p className="text-[#8697C4] text-xs">AI reads your timetable screenshot automatically</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/30 transition-all text-[#8697C4]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Progress steps */}
          <div className="flex items-center gap-2 text-xs font-semibold">
            {['Upload', 'AI Scan', phase === 'gaps' ? 'Fill Gaps' : 'Review & Edit', 'Done'].map((s, i) => {
              const stepIdx = { upload: 0, scanning: 1, gaps: 2, preview: 2, saving: 3 }[phase] || 0;
              return (
                <React.Fragment key={s}>
                  <span className={`px-2.5 py-1 rounded-full ${i <= stepIdx ? 'bg-[#7091E6] text-white' : 'bg-white/30 text-[#8697C4]'}`}>{s}</span>
                  {i < 3 && <div className={`flex-1 h-px ${i < stepIdx ? 'bg-[#7091E6]' : 'bg-white/30'}`} />}
                </React.Fragment>
              );
            })}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl"
              style={{ background: 'rgba(220,55,55,0.1)', border: '1px solid rgba(220,55,55,0.3)' }}>
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* PHASE: UPLOAD */}
          {(phase === 'upload') && (
            <div className="space-y-4">
              <DropZone onFile={handleFile} uploading={false}
                label="Upload Your Timetable Screenshot"
                sublabel="Drag & drop or click · PNG, JPG, HEIC · Any school format" />

              {uploadedImages.length > 0 && (
                <div>
                  <p className="text-[#3D52A0] font-bold text-sm mb-2">Uploaded screenshots</p>
                  <div className="flex flex-wrap gap-2">
                    {uploadedImages.map((img, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
                        style={{ background: 'rgba(112,145,230,0.15)', border: '1px solid rgba(112,145,230,0.3)', color: '#3D52A0' }}>
                        <ImageIcon className="w-3.5 h-3.5" /> {img.label}
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setPhase('preview')}
                    className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                    style={{ background: 'linear-gradient(135deg,#7091E6,#3D52A0)' }}>
                    View scanned lessons <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* PHASE: SCANNING */}
          {phase === 'scanning' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-2xl animate-pulse"
                  style={{ background: 'linear-gradient(135deg,#7091E6,#3D52A0)' }} />
                <Sparkles className="absolute inset-0 m-auto w-10 h-10 text-white" />
              </div>
              <p className="text-[#3D52A0] font-bold text-lg">{scanStatus || 'Scanning…'}</p>
              <p className="text-[#8697C4] text-sm">AI is reading lesson names, times, teachers, and rooms</p>
            </div>
          )}

          {/* PHASE: GAPS */}
          {phase === 'gaps' && missingFields && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-2xl"
                style={{ background: 'rgba(112,145,230,0.12)', border: '1px solid rgba(112,145,230,0.3)' }}>
                <AlertCircle className="w-5 h-5 text-[#7091E6] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[#3D52A0] font-bold text-sm">A few details couldn't be read from the screenshot</p>
                  <p className="text-[#8697C4] text-xs mt-0.5">Answer these to complete your timetable accurately</p>
                </div>
              </div>

              <div className="space-y-3">
                {missingFields.map(q => (
                  <div key={q.key}>
                    <label className={G.label}>{q.label}</label>
                    {q.type === 'select' ? (
                      <select className={G.input} value={gapAnswers[q.key] || ''} onChange={e => setGapAnswers(p => ({ ...p, [q.key]: e.target.value }))}>
                        <option value="">Select…</option>
                        {(q.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input type={q.type || 'text'} className={G.input} placeholder="Your answer…"
                        value={gapAnswers[q.key] || ''}
                        onChange={e => setGapAnswers(p => ({ ...p, [q.key]: e.target.value }))} />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={handleGapSubmit}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white text-sm"
                  style={{ background: 'linear-gradient(135deg,#7091E6,#3D52A0)' }}>
                  <Sparkles className="w-4 h-4" /> Rebuild Timetable with My Answers
                </button>
                <button onClick={() => setPhase('preview')}
                  className="px-4 py-3 rounded-xl text-[#3D52A0] text-sm font-semibold"
                  style={{ background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.4)' }}>
                  Skip
                </button>
              </div>
            </div>
          )}

          {/* PHASE: PREVIEW */}
          {phase === 'preview' && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#3D52A0] font-black text-lg">{lessons.length} lessons detected</p>
                  <p className="text-[#8697C4] text-sm">Review and edit before importing</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setLessons([]); setUploadedImages([]); setPhase('upload'); }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
                    style={{ background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.35)', color: '#3D52A0' }}>
                    <RefreshCw className="w-3.5 h-3.5" /> Re-scan
                  </button>
                  {/* Add another screenshot (Week B) */}
                  <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                    style={{ background: 'rgba(112,145,230,0.15)', border: '1px solid rgba(112,145,230,0.3)', color: '#3D52A0' }}>
                    <Upload className="w-3.5 h-3.5" /> + Add Week B
                    <input type="file" accept="image/*,.heic" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                  </label>
                </div>
              </div>

              {/* Grouped by day for quick visual check */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
                {DAYS.map(day => {
                  const count = lessons.filter(l => l.day_of_week === day).length;
                  return (
                    <div key={day} className="rounded-xl p-2.5 text-center"
                      style={{ background: 'rgba(112,145,230,0.12)', border: '1px solid rgba(112,145,230,0.25)' }}>
                      <p className="text-[#3D52A0] font-bold text-xs">{day.slice(0, 3)}</p>
                      <p className="text-[#7091E6] font-black text-lg">{count}</p>
                    </div>
                  );
                })}
              </div>

              {/* Editable lesson list */}
              <div className="max-h-80 overflow-y-auto space-y-1 pr-1">
                {lessons.length === 0 ? (
                  <p className="text-center text-[#8697C4] py-8 text-sm">No lessons detected. Try uploading a clearer screenshot.</p>
                ) : (
                  lessons.map((lesson, idx) => (
                    <LessonRow key={idx} lesson={lesson} idx={idx}
                      onChange={handleLessonChange} onDelete={handleLessonDelete} />
                  ))
                )}
              </div>

              <button onClick={handleAddLesson}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold w-full justify-center"
                style={{ background: 'rgba(255,255,255,0.35)', border: '1px dashed rgba(112,145,230,0.4)', color: '#3D52A0' }}>
                <Plus className="w-4 h-4" /> Add Lesson Manually
              </button>

              <button onClick={handleSave} disabled={saving || lessons.length === 0}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-white text-sm transition-all disabled:opacity-50 shadow-lg"
                style={{ background: saving ? '#8697C4' : 'linear-gradient(135deg,#7091E6,#3D52A0)' }}>
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Importing to timetable…</>
                ) : (
                  <><CheckCircle className="w-4 h-4" /> Confirm & Import {lessons.length} Lessons</>
                )}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}