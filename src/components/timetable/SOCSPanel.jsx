import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, RefreshCw, CheckCircle2, AlertCircle, Clock,
  ExternalLink, X, FileText, Loader2, Info, Calendar
} from 'lucide-react';
import { base44 } from '@/api/base44Client';

const G = {
  card: { background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.25)' },
  input: 'w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-[#3D52A0] placeholder:text-[#8697C4] focus:outline-none focus:border-[#7091E6]/60 text-sm',
  label: 'block text-[#3D52A0] text-xs font-bold uppercase tracking-wide mb-1.5',
};

const DAY_MAP = {
  MO: 'Monday', TU: 'Tuesday', WE: 'Wednesday', TH: 'Thursday', FR: 'Friday',
  SA: 'Saturday', SU: 'Sunday',
};

function parseIcal(text) {
  const lessons = [];
  const events = text.split('BEGIN:VEVENT').slice(1);

  for (const ev of events) {
    const get = (key) => {
      const regex = new RegExp(`${key}[^:]*:([^\\r\\n]+)`);
      const m = ev.match(regex);
      return m ? m[1].trim() : '';
    };

    const summary = get('SUMMARY');
    const location = get('LOCATION');
    const description = get('DESCRIPTION');
    const dtstart = get('DTSTART');
    const dtend = get('DTEND');
    const rrule = get('RRULE');

    if (!summary || !dtstart) continue;

    // Parse start datetime
    const parsedt = (dt) => {
      // Format: 20240901T090000Z or 20240901T090000 or 20240901
      const clean = dt.replace('Z', '').replace('T', '');
      const year = clean.slice(0, 4);
      const month = clean.slice(4, 6);
      const day = clean.slice(6, 8);
      const hour = clean.slice(8, 10) || '00';
      const min = clean.slice(10, 12) || '00';
      return { year, month, day, hour, min };
    };

    const start = parsedt(dtstart);
    const end = dtend ? parsedt(dtend) : null;

    // Determine day of week from the DTSTART date
    const startDate = new Date(`${start.year}-${start.month}-${start.day}T${start.hour}:${start.min}:00`);
    const jsDay = startDate.getDay(); // 0=Sun
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = dayNames[jsDay];

    if (!['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(dayOfWeek)) continue;

    const startTime = `${start.hour}:${start.min}`;
    let durationMinutes = 60;
    if (end) {
      const startMs = new Date(`${start.year}-${start.month}-${start.day}T${start.hour}:${start.min}:00`).getTime();
      const endMs = new Date(`${end.year}-${end.month}-${end.day}T${end.hour}:${end.min}:00`).getTime();
      durationMinutes = Math.round((endMs - startMs) / 60000) || 60;
    }

    // Extract teacher from description (SOCS often puts "Teacher: X" in description)
    let teacher = '';
    if (description) {
      const teacherMatch = description.match(/teacher[:\s]+([^\n\\]+)/i) ||
                           description.match(/staff[:\s]+([^\n\\]+)/i);
      if (teacherMatch) teacher = teacherMatch[1].trim().replace(/\\n.*/, '');
    }

    // Detect Week A/B from summary or description
    let weekNumber = 1;
    if (/week\s*[Bb2]/i.test(summary) || /week\s*[Bb2]/i.test(description)) weekNumber = 2;

    // Map subject from summary
    const subjectKeywords = {
      'Math': 'Maths', 'Maths': 'Maths',
      'English': 'English', 'Lit': 'English', 'Lang': 'English',
      'Science': 'Science', 'Biology': 'Science', 'Chemistry': 'Science', 'Physics': 'Science',
      'Geography': 'Geography', 'History': 'History',
      'Spanish': 'Spanish', 'French': 'Spanish', 'German': 'Spanish', 'MFL': 'Spanish',
      'Computer': 'Computer Science', 'Computing': 'Computer Science', 'CS': 'Computer Science',
      'PE': 'Other', 'Art': 'Other', 'Music': 'Other', 'Drama': 'Other',
      'RE': 'Other', 'PSHE': 'Other',
    };
    let subject = 'Other';
    for (const [kw, subj] of Object.entries(subjectKeywords)) {
      if (summary.toUpperCase().includes(kw.toUpperCase())) { subject = subj; break; }
    }

    lessons.push({
      lesson_name: summary.replace(/\\n/g, ' ').trim(),
      subject,
      day_of_week: dayOfWeek,
      start_time: startTime,
      duration_minutes: durationMinutes,
      teacher_name: teacher,
      room: location ? location.replace(/\\n/g, ' ').trim() : '',
      week_number: weekNumber,
      notes: `Imported from SOCS iCal`,
      socs_imported: true,
    });
  }

  // Deduplicate by lesson_name + day_of_week + start_time + week_number
  const seen = new Set();
  return lessons.filter(l => {
    const key = `${l.lesson_name}|${l.day_of_week}|${l.start_time}|${l.week_number}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function SOCSPanel({ user, onSyncComplete, lastSync, lessonCount }) {
  const [importing, setImporting] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [parsed, setParsed] = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const fileRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    setError('');
    setImporting(true);
    setStatus('Reading iCal file…');

    const text = await file.text();
    if (!text.includes('BEGIN:VCALENDAR')) {
      setError('This doesn\'t look like a valid iCal (.ics) file. Please export your timetable from SOCS as iCal.');
      setImporting(false);
      return;
    }

    setStatus('Parsing timetable data…');
    const lessons = parseIcal(text);
    if (lessons.length === 0) {
      setError('No weekday lessons found in this iCal file. Make sure you exported your timetable (not just events) from SOCS.');
      setImporting(false);
      return;
    }

    setParsed(lessons);
    setStatus(`Found ${lessons.length} lessons. Ready to import.`);
    setImporting(false);
  };

  const confirmImport = async () => {
    if (!parsed || !user?.email) return;
    setImporting(true);
    setStatus('Clearing old imported lessons…');

    // Delete all previously SOCS-imported lessons
    const existing = await base44.entities.TimetableLesson.filter({ student_email: user.email });
    const socsOld = existing.filter(l => l.socs_imported);
    await Promise.all(socsOld.map(l => base44.entities.TimetableLesson.delete(l.id)));

    setStatus(`Importing ${parsed.length} lessons…`);

    // Bulk create in chunks of 20
    for (let i = 0; i < parsed.length; i += 20) {
      await base44.entities.TimetableLesson.bulkCreate(
        parsed.slice(i, i + 20).map(l => ({ ...l, student_email: user.email }))
      );
    }

    // Save sync timestamp on user
    await base44.auth.updateMe({
      socs_last_sync: new Date().toISOString(),
      socs_lesson_count: parsed.length,
    });

    setStatus('');
    setParsed(null);
    setImporting(false);
    onSyncComplete?.();
  };

  const cancelImport = () => { setParsed(null); setStatus(''); setError(''); };

  return (
    <div className="rounded-2xl p-5 space-y-4" style={G.card}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg,#7091E6,#3D52A0)' }}>
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-[#3D52A0] text-base">SOCS Timetable Sync</h3>
            <p className="text-[#8697C4] text-xs">Import your school timetable from SOCS</p>
          </div>
        </div>
        <button onClick={() => setShowInstructions(v => !v)}
          className="p-2 rounded-xl hover:bg-white/20 transition-all" style={{ color: '#8697C4' }}>
          <Info className="w-4 h-4" />
        </button>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-3 rounded-xl px-4 py-3"
        style={{ background: lastSync ? 'rgba(16,185,129,0.1)' : 'rgba(112,145,230,0.1)', border: `1px solid ${lastSync ? 'rgba(16,185,129,0.25)' : 'rgba(112,145,230,0.25)'}` }}>
        {lastSync ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-[#3D52A0] text-sm font-semibold">Synced — {lessonCount || 0} lessons imported</p>
              <p className="text-[#8697C4] text-xs">Last sync: {new Date(lastSync).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</p>
            </div>
          </>
        ) : (
          <>
            <Clock className="w-4 h-4 text-[#7091E6] flex-shrink-0" />
            <p className="text-[#3D52A0] text-sm">Not yet synced — upload your SOCS iCal file to get started</p>
          </>
        )}
      </div>

      {/* Instructions */}
      <AnimatePresence>
        {showInstructions && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="rounded-xl p-4 text-sm space-y-2 overflow-hidden"
            style={{ background: 'rgba(112,145,230,0.1)', border: '1px solid rgba(112,145,230,0.25)' }}>
            <p className="font-bold text-[#3D52A0]">How to export your SOCS timetable:</p>
            <ol className="space-y-1.5 text-[#3D52A0] list-decimal list-inside">
              <li>Log in to your school's SOCS portal</li>
              <li>Go to <strong>My Timetable</strong> or <strong>My Schedule</strong></li>
              <li>Look for <strong>Export</strong>, <strong>Subscribe</strong>, or <strong>Download iCal</strong></li>
              <li>Download the <strong>.ics</strong> file</li>
              <li>Upload it below — your timetable will be imported automatically</li>
            </ol>
            <div className="flex items-center gap-2 mt-2 pt-2" style={{ borderTop: '1px solid rgba(112,145,230,0.2)' }}>
              <AlertCircle className="w-3.5 h-3.5 text-[#7091E6] flex-shrink-0" />
              <p className="text-xs text-[#8697C4]">SOCS does not provide a live API. Re-upload your iCal whenever your timetable changes to keep it up to date.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File upload area */}
      {!parsed && (
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
          className="rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all hover:bg-white/10"
          style={{ borderColor: 'rgba(112,145,230,0.4)' }}>
          <input ref={fileRef} type="file" accept=".ics,text/calendar" className="hidden"
            onChange={e => handleFile(e.target.files[0])} />
          {importing ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-[#7091E6] animate-spin" />
              <p className="text-[#3D52A0] font-semibold text-sm">{status}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(112,145,230,0.15)', border: '1px solid rgba(112,145,230,0.3)' }}>
                <Upload className="w-6 h-6 text-[#7091E6]" />
              </div>
              <div>
                <p className="text-[#3D52A0] font-semibold text-sm">Drop your SOCS iCal file here</p>
                <p className="text-[#8697C4] text-xs mt-1">or click to browse · accepts .ics files</p>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-[#8697C4]" />
                <span className="text-[#8697C4] text-xs">Export from SOCS → My Timetable → Download iCal</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl px-4 py-3"
          style={{ background: 'rgba(220,55,55,0.1)', border: '1px solid rgba(220,55,55,0.25)' }}>
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-red-600 text-sm">{error}</p>
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Preview & confirm */}
      <AnimatePresence>
        {parsed && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-xl p-4 space-y-3"
            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)' }}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <p className="text-[#3D52A0] font-bold text-sm">{parsed.length} lessons parsed successfully</p>
            </div>

            {/* Preview table */}
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.3)' }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: 'rgba(112,145,230,0.15)' }}>
                    <th className="text-left px-3 py-2 text-[#3D52A0] font-bold">Lesson</th>
                    <th className="text-left px-3 py-2 text-[#3D52A0] font-bold">Day</th>
                    <th className="text-left px-3 py-2 text-[#3D52A0] font-bold">Time</th>
                    <th className="text-left px-3 py-2 text-[#3D52A0] font-bold hidden sm:table-cell">Teacher</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.slice(0, 8).map((l, i) => (
                    <tr key={i} className={i % 2 === 0 ? '' : ''} style={{ borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                      <td className="px-3 py-2 text-[#3D52A0] font-medium">{l.lesson_name.slice(0, 20)}{l.lesson_name.length > 20 ? '…' : ''}</td>
                      <td className="px-3 py-2 text-[#8697C4]">{l.day_of_week.slice(0, 3)}</td>
                      <td className="px-3 py-2 text-[#8697C4]">{l.start_time}</td>
                      <td className="px-3 py-2 text-[#8697C4] hidden sm:table-cell">{l.teacher_name || '—'}</td>
                    </tr>
                  ))}
                  {parsed.length > 8 && (
                    <tr style={{ borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                      <td colSpan={4} className="px-3 py-2 text-[#8697C4] text-center">…and {parsed.length - 8} more lessons</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <p className="text-[#8697C4] text-xs">⚠️ This will replace all previously imported SOCS lessons.</p>

            <div className="flex gap-3">
              <button onClick={cancelImport}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[#8697C4] transition-all hover:bg-white/20"
                style={{ border: '1px solid rgba(255,255,255,0.25)' }}>
                Cancel
              </button>
              <button onClick={confirmImport} disabled={importing}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#7091E6,#3D52A0)' }}>
                {importing ? <><Loader2 className="w-4 h-4 animate-spin" />{status}</> : <><RefreshCw className="w-4 h-4" />Import {parsed.length} Lessons</>}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Re-sync button (when already synced) */}
      {lastSync && !parsed && (
        <button onClick={() => fileRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
          style={{ background: 'rgba(112,145,230,0.15)', border: '1px solid rgba(112,145,230,0.3)', color: '#3D52A0' }}>
          <RefreshCw className="w-4 h-4 text-[#7091E6]" />
          Refresh from SOCS (upload new iCal)
        </button>
      )}
    </div>
  );
}