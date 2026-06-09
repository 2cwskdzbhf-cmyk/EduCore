import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import {
  Upload, Camera, Loader2, CheckCircle2, AlertCircle,
  Edit3, Trash2, RefreshCw, ChevronRight, X, Plus,
  Image, Sparkles, AlertTriangle
} from 'lucide-react';

const G = {
  card: { background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.25)' },
  input: 'bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-[#3D52A0] placeholder:text-[#8697C4] focus:outline-none focus:border-[#7091E6]/60 text-sm w-full',
  label: 'text-[#3D52A0] text-xs font-bold uppercase tracking-wide mb-1.5 block',
  pill: (a) => `px-4 py-2 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${a ? 'bg-[#7091E6] text-white border-[#7091E6]' : 'bg-white/10 text-[#3D52A0] border-white/20 hover:bg-white/20'}`,
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const LESSON_SCHEMA = {
  type: 'object',
  properties: {
    lessons: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          lesson_name: { type: 'string' },
          subject: { type: 'string' },
          teacher_name: { type: 'string' },
          room: { type: 'string' },
          day_of_week: { type: 'string', enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] },
          start_time: { type: 'string', description: 'HH:MM format' },
          end_time: { type: 'string', description: 'HH:MM format' },
          duration_minutes: { type: 'number' },
          week: { type: 'string', description: 'A, B, 1, 2, or "all" if no rotation' },
        },
        required: ['lesson_name', 'day_of_week'],
      }
    },
    missing_info: {
      type: 'array',
      items: { type: 'string' },
      description: 'List of missing or unclear fields that need user clarification',
    },
    week_rotation: { type: 'string', description: 'none, A/B, 1/2, or other' },
    notes: { type: 'string' },
  },
  required: ['lessons', 'missing_info'],
};

function SubjectColour(subject) {
  const map = {
    maths: '#7091E6', math: '#7091E6',
    english: '#ef4444', literature: '#ef4444',
    science: '#10b981', biology: '#10b981', chemistry: '#f59e0b', physics: '#06b6d4',
    history: '#8b5cf6', geography: '#f97316',
    spanish: '#ec4899', french: '#ec4899', german: '#ec4899', languages: '#ec4899',
    'computer science': '#14b8a6', computing: '#14b8a6', ict: '#14b8a6',
    art: '#a855f7', music: '#6366f1', drama: '#f43f5e', pe: '#84cc16',
  };
  const key = (subject || '').toLowerCase();
  for (const [k, v] of Object.entries(map)) {
    if (key.includes(k)) return v;
  }
  return '#8697C4';
}

function LessonCard({ lesson, onEdit, onDelete, index }) {
  const [editing, setEditing] = useState(false);
  const [data, setData] = useState({ ...lesson });

  const save = () => { onEdit(index, data); setEditing(false); };

  if (editing) {
    return (
      <div className="rounded-2xl p-4 space-y-2" style={G.card}>
        <div className="grid grid-cols-2 gap-2">
          {[
            ['lesson_name', 'Lesson Name'],
            ['subject', 'Subject'],
            ['teacher_name', 'Teacher'],
            ['room', 'Room'],
            ['start_time', 'Start (HH:MM)'],
            ['end_time', 'End (HH:MM)'],
          ].map(([key, label]) => (
            <div key={key}>
              <label className={G.label}>{label}</label>
              <input className={G.input} value={data[key] || ''} onChange={e => setData(d => ({ ...d, [key]: e.target.value }))} />
            </div>
          ))}
          <div>
            <label className={G.label}>Day</label>
            <select className={G.input} value={data.day_of_week || 'Monday'} onChange={e => setData(d => ({ ...d, day_of_week: e.target.value }))}>
              {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className={G.label}>Week</label>
            <input className={G.input} placeholder="A, B, 1, 2, or all" value={data.week || ''} onChange={e => setData(d => ({ ...d, week: e.target.value }))} />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={save} className="flex-1 py-2 rounded-xl text-white text-sm font-bold" style={{ background: 'linear-gradient(135deg,#7091E6,#3D52A0)' }}>Save</button>
          <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-[#8697C4] bg-white/10 border border-white/20">Cancel</button>
        </div>
      </div>
    );
  }

  const color = SubjectColour(lesson.subject || lesson.lesson_name);
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}
      className="flex items-start gap-3 rounded-2xl p-3" style={G.card}>
      <div className="w-3 h-3 rounded-full flex-shrink-0 mt-1" style={{ background: color }} />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-[#3D52A0] truncate">{lesson.lesson_name}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-[#8697C4]">
          <span>{lesson.day_of_week}</span>
          {lesson.start_time && <span>{lesson.start_time}{lesson.end_time ? `–${lesson.end_time}` : ''}</span>}
          {lesson.teacher_name && <span>{lesson.teacher_name}</span>}
          {lesson.room && <span>Rm {lesson.room}</span>}
          {lesson.week && lesson.week !== 'all' && <span className="font-semibold text-[#7091E6]">Wk {lesson.week}</span>}
        </div>
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg hover:bg-white/20 transition-all text-[#7091E6]"><Edit3 className="w-3.5 h-3.5" /></button>
        <button onClick={() => onDelete(index)} className="p-1.5 rounded-lg hover:bg-white/20 transition-all text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    </motion.div>
  );
}

export default function ScreenshotImporter({ user, onImportComplete, onClose }) {
  const [phase, setPhase] = useState('upload'); // upload | scanning | clarify | review | importing
  const [uploadedImages, setUploadedImages] = useState([]); // { file, url, previewUrl }
  const [scanning, setScanning] = useState(false);
  const [parsedLessons, setParsedLessons] = useState([]);
  const [missingInfo, setMissingInfo] = useState([]);
  const [weekRotation, setWeekRotation] = useState('none');
  const [clarifications, setClarifications] = useState({});
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newImages = [];
    for (const file of files) {
      const previewUrl = URL.createObjectURL(file);
      newImages.push({ file, previewUrl, url: null });
    }
    setUploadedImages(prev => [...prev, ...newImages]);
    e.target.value = '';
  };

  const removeImage = (idx) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== idx));
  };

  const scanScreenshots = async () => {
    if (!uploadedImages.length) return;
    setScanning(true);
    setError('');
    setPhase('scanning');

    try {
      // Upload all images and extract data from each
      const allLessons = [];
      let combinedMissing = [];
      let rotation = 'none';

      for (const img of uploadedImages) {
        // Upload file
        const { file_url } = await base44.integrations.Core.UploadFile({ file: img.file });

        // Extract timetable data using AI vision
        const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: LESSON_SCHEMA,
        });

        if (result?.status === 'success' && result?.output) {
          const out = result.output;
          const lessons = Array.isArray(out.lessons) ? out.lessons : (Array.isArray(out) ? out : []);
          allLessons.push(...lessons);
          if (out.missing_info?.length) combinedMissing.push(...out.missing_info);
          if (out.week_rotation && out.week_rotation !== 'none') rotation = out.week_rotation;
        }
      }

      // Deduplicate missing info
      combinedMissing = [...new Set(combinedMissing)];

      setParsedLessons(allLessons);
      setMissingInfo(combinedMissing);
      setWeekRotation(rotation);

      if (combinedMissing.length > 0) {
        // Pre-populate clarification fields
        const init = {};
        combinedMissing.forEach(q => { init[q] = ''; });
        setClarifications(init);
        setPhase('clarify');
      } else {
        setPhase('review');
      }
    } catch (e) {
      setError('Failed to scan screenshot. Please try a clearer image.');
      setPhase('upload');
    } finally {
      setScanning(false);
    }
  };

  const applyClarifications = async () => {
    if (!parsedLessons.length) return;
    setScanning(true);
    setPhase('scanning');

    try {
      // Re-run AI with clarifications to fill in missing times/details
      const clarificationText = Object.entries(clarifications)
        .map(([q, a]) => `${q}: ${a}`)
        .join('\n');

      const prompt = `You are a timetable parser. The user has provided clarifications for missing timetable data.

EXISTING PARSED LESSONS (JSON):
${JSON.stringify(parsedLessons, null, 2)}

USER CLARIFICATIONS:
${clarificationText}

Week rotation type: ${weekRotation}

Using the clarifications, fill in any missing start_time, end_time, duration_minutes, day_of_week, week fields in the lessons. If the user specified a school day start time and lesson duration, calculate all lesson start/end times. Return the COMPLETE updated lessons array as JSON. Only return the JSON array, no explanation.`;

      const updated = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            lessons: { type: 'array', items: { type: 'object' } }
          },
          required: ['lessons']
        }
      });

      const updatedLessons = updated?.lessons || parsedLessons;
      setParsedLessons(updatedLessons);
      setMissingInfo([]);
      setPhase('review');
    } catch (e) {
      // Just proceed to review with existing data
      setMissingInfo([]);
      setPhase('review');
    } finally {
      setScanning(false);
    }
  };

  const editLesson = (idx, updated) => {
    setParsedLessons(prev => prev.map((l, i) => i === idx ? { ...l, ...updated } : l));
  };

  const deleteLesson = (idx) => {
    setParsedLessons(prev => prev.filter((_, i) => i !== idx));
  };

  const addBlankLesson = () => {
    setParsedLessons(prev => [...prev, { lesson_name: 'New Lesson', day_of_week: 'Monday', subject: '', teacher_name: '', room: '', start_time: '', end_time: '', week: 'all' }]);
  };

  const finaliseImport = async () => {
    setImporting(true);
    setPhase('importing');
    try {
      // Delete old lessons for this user
      const existing = await base44.entities.TimetableLesson.filter({ student_email: user.email });
      await Promise.all(existing.map(l => base44.entities.TimetableLesson.delete(l.id)));

      // Create new lessons
      const toCreate = parsedLessons.map((lesson, i) => ({
        student_email: user.email,
        lesson_name: lesson.lesson_name || 'Lesson',
        subject: lesson.subject || lesson.lesson_name || 'Other',
        teacher_name: lesson.teacher_name || '',
        room: lesson.room || '',
        day_of_week: lesson.day_of_week || 'Monday',
        start_time: lesson.start_time || '',
        end_time: lesson.end_time || '',
        duration_minutes: lesson.duration_minutes || (lesson.start_time && lesson.end_time
          ? Math.round((new Date(`1970-01-01T${lesson.end_time}`) - new Date(`1970-01-01T${lesson.start_time}`)) / 60000)
          : 60),
        week_number: lesson.week === 'B' || lesson.week === '2' ? 2 : 1,
        notes: lesson.room ? `Room: ${lesson.room}` : '',
        order_index: i,
        source: 'screenshot_import',
      }));

      await base44.entities.TimetableLesson.bulkCreate(toCreate);
      onImportComplete?.({ count: toCreate.length, weekRotation });
    } catch (e) {
      setError('Failed to save lessons. Please try again.');
      setPhase('review');
    } finally {
      setImporting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full" style={{ background: 'linear-gradient(135deg, #EDE8F5 0%, #c8d4f5 100%)', borderRadius: 24 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style={{ background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.3)', borderRadius: '24px 24px 0 0' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7091E6,#3D52A0)' }}>
            <Camera className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-black text-[#3D52A0] text-base">Screenshot Timetable Builder</h3>
            <p className="text-[#8697C4] text-xs">Upload any timetable screenshot — AI does the rest</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/30 transition-all text-[#8697C4]"><X className="w-5 h-5" /></button>
      </div>

      {/* Step indicator */}
      <div className="px-6 py-3 flex items-center gap-2 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
        {[
          { key: 'upload', label: '1. Upload' },
          { key: 'scanning', label: '2. Scanning' },
          { key: 'clarify', label: '3. Clarify' },
          { key: 'review', label: '4. Review' },
          { key: 'importing', label: '5. Done' },
        ].map((s, i, arr) => (
          <React.Fragment key={s.key}>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-all ${
              phase === s.key ? 'bg-[#7091E6] text-white' :
              ['upload','scanning','clarify','review','importing'].indexOf(phase) > i ? 'text-[#7091E6] bg-[#7091E6]/10' :
              'text-[#ADB8DA]'
            }`}>{s.label}</span>
            {i < arr.length - 1 && <ChevronRight className="w-3 h-3 text-[#ADB8DA] flex-shrink-0" />}
          </React.Fragment>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <AnimatePresence mode="wait">

          {/* ── UPLOAD PHASE ── */}
          {phase === 'upload' && (
            <motion.div key="upload" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
              <input ref={fileInputRef} type="file" accept="image/*,.heic" multiple className="hidden" onChange={handleFileSelect} />

              {/* Drop zone */}
              <button onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-2xl p-10 text-center transition-all hover:bg-white/25 border-2 border-dashed"
                style={{ border: '2px dashed rgba(112,145,230,0.4)', background: 'rgba(255,255,255,0.12)' }}>
                <Upload className="w-12 h-12 mx-auto mb-3 text-[#7091E6] opacity-60" />
                <p className="font-bold text-[#3D52A0] text-lg">Upload Timetable Screenshot</p>
                <p className="text-[#8697C4] text-sm mt-1">PNG, JPG, HEIC — any school timetable format</p>
                <p className="text-[#7091E6] text-xs mt-3 font-semibold">Click to browse or drag & drop</p>
              </button>

              {/* Uploaded images preview */}
              {uploadedImages.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[#3D52A0] font-bold text-sm">{uploadedImages.length} image{uploadedImages.length > 1 ? 's' : ''} ready</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {uploadedImages.map((img, i) => (
                      <div key={i} className="relative rounded-xl overflow-hidden aspect-video"
                        style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}>
                        <img src={img.previewUrl} alt={`Upload ${i + 1}`} className="w-full h-full object-cover" />
                        <button onClick={() => removeImage(i)}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center bg-red-500 text-white">
                          <X className="w-3 h-3" />
                        </button>
                        <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold text-white"
                          style={{ background: 'rgba(0,0,0,0.5)' }}>
                          {img.file.name.split('.').pop().toUpperCase()}
                        </div>
                      </div>
                    ))}
                    <button onClick={() => fileInputRef.current?.click()}
                      className="rounded-xl aspect-video flex flex-col items-center justify-center gap-1 transition-all hover:bg-white/20"
                      style={{ border: '2px dashed rgba(112,145,230,0.3)', background: 'rgba(255,255,255,0.1)' }}>
                      <Plus className="w-5 h-5 text-[#7091E6]" />
                      <span className="text-xs text-[#7091E6] font-semibold">Add more</span>
                    </button>
                  </div>
                  <p className="text-[#8697C4] text-xs">💡 Tip: Upload Week A + Week B as separate screenshots for 2-week rotation</p>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <button onClick={scanScreenshots} disabled={!uploadedImages.length}
                className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#7091E6,#3D52A0)' }}>
                <Sparkles className="w-4 h-4" /> Scan & Build Timetable
              </button>
            </motion.div>
          )}

          {/* ── SCANNING PHASE ── */}
          {phase === 'scanning' && (
            <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 gap-5">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-2xl animate-pulse" style={{ background: 'linear-gradient(135deg,#7091E6,#3D52A0)' }} />
                <Image className="absolute inset-0 m-auto w-10 h-10 text-white" />
              </div>
              <div className="text-center">
                <p className="font-black text-[#3D52A0] text-xl">AI is reading your timetable…</p>
                <p className="text-[#8697C4] text-sm mt-1">Detecting lessons, times, teachers, rooms and rotation patterns</p>
              </div>
              <div className="flex gap-1.5">
                {[0,1,2,3].map(i => (
                  <motion.div key={i} className="w-2 h-2 rounded-full bg-[#7091E6]"
                    animate={{ scale: [1,1.4,1], opacity: [0.5,1,0.5] }}
                    transition={{ duration: 1, delay: i * 0.2, repeat: Infinity }} />
                ))}
              </div>
            </motion.div>
          )}

          {/* ── CLARIFY PHASE ── */}
          {phase === 'clarify' && (
            <motion.div key="clarify" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
              <div className="flex items-start gap-3 p-4 rounded-2xl"
                style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.35)' }}>
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-[#3D52A0] text-sm">AI needs a few more details</p>
                  <p className="text-[#8697C4] text-xs mt-0.5">The screenshot was scanned successfully — just a few things were unclear. Please fill in the details below and the AI will complete your timetable.</p>
                </div>
              </div>

              <div className="space-y-4">
                {missingInfo.map((question, i) => (
                  <div key={i}>
                    <label className={G.label}>{question}</label>
                    <input className={G.input} placeholder="Your answer…"
                      value={clarifications[question] || ''}
                      onChange={e => setClarifications(p => ({ ...p, [question]: e.target.value }))}
                      style={{ color: '#3D52A0' }} />
                  </div>
                ))}
              </div>

              {/* Preview of what was found */}
              <div className="rounded-2xl p-4" style={{ background: 'rgba(112,145,230,0.1)', border: '1px solid rgba(112,145,230,0.2)' }}>
                <p className="text-[#3D52A0] font-bold text-xs mb-1">✅ Successfully detected {parsedLessons.length} lessons</p>
                <p className="text-[#8697C4] text-xs">Week rotation: {weekRotation || 'not detected'}</p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setPhase('review')}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#8697C4] bg-white/10 border border-white/20 hover:bg-white/20 transition-all">
                  Skip, use as-is
                </button>
                <button onClick={applyClarifications}
                  className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#7091E6,#3D52A0)' }}>
                  <Sparkles className="w-4 h-4" /> Apply & Complete Timetable
                </button>
              </div>
            </motion.div>
          )}

          {/* ── REVIEW PHASE ── */}
          {phase === 'review' && (
            <motion.div key="review" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-black text-[#3D52A0] text-lg">Review your timetable</p>
                  <p className="text-[#8697C4] text-sm">{parsedLessons.length} lessons detected · Edit, delete, or add before saving</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setPhase('upload'); setUploadedImages([]); setParsedLessons([]); }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#8697C4] bg-white/10 border border-white/20 hover:bg-white/20 transition-all">
                    <RefreshCw className="w-3.5 h-3.5" /> Re-scan
                  </button>
                  <button onClick={addBlankLesson}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white"
                    style={{ background: 'linear-gradient(135deg,#7091E6,#3D52A0)' }}>
                    <Plus className="w-3.5 h-3.5" /> Add Lesson
                  </button>
                </div>
              </div>

              {/* Group by day */}
              {DAYS.map(day => {
                const dayLessons = parsedLessons.filter(l => l.day_of_week === day);
                if (!dayLessons.length) return null;
                return (
                  <div key={day}>
                    <p className="font-bold text-[#3D52A0] text-xs uppercase tracking-wide mb-2">{day}</p>
                    <div className="space-y-2">
                      {dayLessons.map((lesson, i) => {
                        const globalIdx = parsedLessons.indexOf(lesson);
                        return (
                          <LessonCard key={globalIdx} lesson={lesson} index={globalIdx} onEdit={editLesson} onDelete={deleteLesson} />
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Lessons with unknown day */}
              {parsedLessons.filter(l => !DAYS.includes(l.day_of_week)).length > 0 && (
                <div>
                  <p className="font-bold text-amber-600 text-xs uppercase tracking-wide mb-2">⚠️ Unknown Day — Edit before saving</p>
                  <div className="space-y-2">
                    {parsedLessons.filter(l => !DAYS.includes(l.day_of_week)).map((lesson) => {
                      const globalIdx = parsedLessons.indexOf(lesson);
                      return <LessonCard key={globalIdx} lesson={lesson} index={globalIdx} onEdit={editLesson} onDelete={deleteLesson} />;
                    })}
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <button onClick={finaliseImport} disabled={!parsedLessons.length}
                className="w-full py-3.5 rounded-xl text-white font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2 mt-4"
                style={{ background: 'linear-gradient(135deg,#7091E6,#3D52A0)' }}>
                <CheckCircle2 className="w-4 h-4" /> Save {parsedLessons.length} Lessons to Timetable
              </button>
            </motion.div>
          )}

          {/* ── IMPORTING PHASE ── */}
          {phase === 'importing' && (
            <motion.div key="importing" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-12 h-12 text-[#7091E6] animate-spin" />
              <p className="font-bold text-[#3D52A0] text-xl">Saving your timetable…</p>
              <p className="text-[#8697C4] text-sm">Placing {parsedLessons.length} lessons in the correct slots</p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}