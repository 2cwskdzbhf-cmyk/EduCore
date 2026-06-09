import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw, Upload, CheckCircle2, AlertCircle, Clock,
  X, ExternalLink, Info, Loader2, Calendar, Zap
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

// Parse iCal (.ics) file text into lesson objects
function parseICS(text) {
  const lessons = [];
  const events = text.split('BEGIN:VEVENT').slice(1);
  const DAY_MAP = { MO: 'Monday', TU: 'Tuesday', WE: 'Wednesday', TH: 'Thursday', FR: 'Friday' };

  for (const raw of events) {
    const get = (key) => {
      const match = raw.match(new RegExp(`${key}[^:]*:([^\\r\\n]+)`));
      return match ? match[1].trim() : '';
    };

    const summary = get('SUMMARY');
    const dtstart = get('DTSTART');
    const dtend = get('DTEND');
    const location = get('LOCATION');
    const description = get('DESCRIPTION');
    const rrule = get('RRULE');

    if (!summary || !dtstart) continue;

    // Parse start time (handles TZID format and basic UTC)
    let startDate = null;
    let startTime = '';
    try {
      // Format: 20240901T090000 or 20240901T090000Z
      const clean = dtstart.replace(/[TZ]/g, '').replace(/[-:]/g, '');
      if (clean.length >= 12) {
        const y = clean.slice(0, 4), mo = clean.slice(4, 6), d = clean.slice(6, 8);
        const h = clean.slice(8, 10), mi = clean.slice(10, 12);
        startDate = new Date(`${y}-${mo}-${d}T${h}:${mi}:00`);
        startTime = `${h}:${mi}`;
      } else if (clean.length === 8) {
        const y = clean.slice(0, 4), mo = clean.slice(4, 6), d = clean.slice(6, 8);
        startDate = new Date(`${y}-${mo}-${d}`);
      }
    } catch (e) {}

    // Duration
    let durationMinutes = 60;
    if (dtend) {
      try {
        const cleanEnd = dtend.replace(/[TZ]/g, '').replace(/[-:]/g, '');
        if (cleanEnd.length >= 12) {
          const y = cleanEnd.slice(0, 4), mo = cleanEnd.slice(4, 6), d = cleanEnd.slice(6, 8);
          const h = cleanEnd.slice(8, 10), mi = cleanEnd.slice(10, 12);
          const endDate = new Date(`${y}-${mo}-${d}T${h}:${mi}:00`);
          if (startDate) durationMinutes = Math.round((endDate - startDate) / 60000);
        }
      } catch (e) {}
    }

    // Day of week
    let dayOfWeek = '';
    if (startDate && !isNaN(startDate)) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      dayOfWeek = days[startDate.getDay()];
    }

    // Try to extract teacher from description
    let teacher = '';
    if (description) {
      const teacherMatch = description.match(/teacher[:\s]+([^\n,;]+)/i)
        || description.match(/staff[:\s]+([^\n,;]+)/i)
        || description.match(/Mr\.?\s+\w+|Mrs\.?\s+\w+|Ms\.?\s+\w+|Dr\.?\s+\w+/i);
      if (teacherMatch) teacher = teacherMatch[1] || teacherMatch[0];
    }

    // Detect week A/B from RRULE or summary
    let weekNumber = 1;
    if (/week[:\s-]*[Bb2]/i.test(summary + description + rrule)) weekNumber = 2;

    // Skip weekends
    if (!dayOfWeek || dayOfWeek === 'Saturday' || dayOfWeek === 'Sunday') continue;

    lessons.push({
      lesson_name: summary,
      subject: inferSubject(summary),
      teacher_name: teacher.trim(),
      room: location,
      day_of_week: dayOfWeek,
      start_time: startTime,
      duration_minutes: Math.max(10, Math.min(durationMinutes, 480)),
      week_number: weekNumber,
      source: 'socs',
    });
  }

  return lessons;
}

function inferSubject(name) {
  const n = name.toLowerCase();
  if (/math|maths|calculus|statistics|algebra|geometry/i.test(n)) return 'Maths';
  if (/english|literature|writing|reading|language arts/i.test(n)) return 'English';
  if (/science|physics|chemistry|biology|lab/i.test(n)) return 'Science';
  if (/history|humanities/i.test(n)) return 'History';
  if (/geography|geo\b/i.test(n)) return 'Geography';
  if (/spanish|french|german|mandarin|latin|language/i.test(n)) return 'Spanish';
  if (/computer|computing|cs\b|coding|programming|ict/i.test(n)) return 'Computer Science';
  return 'Other';
}

export default function SOCSSync({ user, onSyncComplete, lastSynced }) {
  const [open, setOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState([]);
  const [icalUrl, setIcalUrl] = useState(user?.socs_ical_url || '');
  const [importMode, setImportMode] = useState('url'); // 'url' | 'file'
  const fileRef = useRef(null);

  const processLessons = async (lessons) => {
    if (!lessons.length) { setError('No weekday lessons found in the file.'); return; }

    setSyncing(true);
    setStatus(`Importing ${lessons.length} lessons…`);

    // Delete existing SOCS-imported lessons
    const existing = await base44.entities.TimetableLesson.filter({ student_email: user.email, source: 'socs' });
    await Promise.all(existing.map(l => base44.entities.TimetableLesson.delete(l.id)));

    // Bulk create new ones
    const records = lessons.map(l => ({ ...l, student_email: user.email }));
    for (let i = 0; i < records.length; i += 20) {
      await base44.entities.TimetableLesson.bulkCreate(records.slice(i, i + 20));
    }

    // Save SOCS ical URL to user profile if provided
    if (icalUrl.trim()) {
      await base44.auth.updateMe({ socs_ical_url: icalUrl.trim(), socs_last_synced: new Date().toISOString() });
    } else {
      await base44.auth.updateMe({ socs_last_synced: new Date().toISOString() });
    }

    setSyncing(false);
    setStatus('');
    setPreview([]);
    onSyncComplete?.();
    setOpen(false);
  };

  const fetchFromUrl = async () => {
    if (!icalUrl.trim()) { setError('Please enter your SOCS iCal URL.'); return; }
    setError('');
    setSyncing(true);
    setStatus('Fetching iCal from SOCS…');
    try {
      // Use LLM to proxy-fetch the ical (CORS workaround) — or user downloads and uploads
      // We'll attempt direct fetch first
      const res = await fetch(icalUrl);
      if (!res.ok) throw new Error('Could not fetch the URL. Try downloading the file and uploading it instead.');
      const text = await res.text();
      const lessons = parseICS(text);
      setPreview(lessons);
      setSyncing(false);
      setStatus('');
      if (!lessons.length) setError('No lessons found. Check the URL or try file upload instead.');
    } catch (e) {
      setSyncing(false);
      setStatus('');
      setError(e.message || 'Failed to fetch. Try the file upload method instead.');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const lessons = parseICS(text);
      setPreview(lessons);
      if (!lessons.length) setError('No lessons found in this file. Make sure it is a valid iCal (.ics) file from SOCS.');
    };
    reader.readAsText(file);
  };

  const lastSyncedLabel = lastSynced
    ? `Last synced ${format(new Date(lastSynced), "d MMM 'at' HH:mm")}`
    : 'Never synced';

  return (
    <>
      {/* Trigger button */}
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
        style={{ background: 'linear-gradient(135deg,#7091E6,#3D52A0)', color: '#fff' }}>
        <Zap className="w-4 h-4" />
        Sync from SOCS
        {lastSynced && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
            {format(new Date(lastSynced), 'd MMM')}
          </span>
        )}
      </button>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => !syncing && setOpen(false)}>
            <motion.div
              initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl"
              style={{ background: 'rgba(237,232,245,0.97)', backdropFilter: 'blur(24px)', border: '1px solid rgba(112,145,230,0.3)', boxShadow: '0 24px 60px rgba(61,82,160,0.25)' }}>

              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'rgba(112,145,230,0.2)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg,#7091E6,#3D52A0)' }}>
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-black text-[#3D52A0] text-lg">SOCS Timetable Sync</h2>
                    <p className="text-[#8697C4] text-xs">{lastSyncedLabel}</p>
                  </div>
                </div>
                <button onClick={() => !syncing && setOpen(false)}
                  className="p-2 rounded-xl hover:bg-white/40 transition-all text-[#8697C4]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-5">
                {/* Info banner */}
                <div className="rounded-xl p-3.5 flex gap-3"
                  style={{ background: 'rgba(112,145,230,0.12)', border: '1px solid rgba(112,145,230,0.25)' }}>
                  <Info className="w-4 h-4 text-[#7091E6] flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-[#3D52A0] space-y-1">
                    <p className="font-semibold">How to get your SOCS iCal</p>
                    <p>1. Log into your SOCS account at your school's SOCS URL</p>
                    <p>2. Go to <strong>My Timetable</strong> → <strong>Export</strong> or look for a calendar icon</p>
                    <p>3. Copy the iCal subscription URL, or download the <strong>.ics file</strong></p>
                    <a href="https://www.socs.net" target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[#7091E6] font-semibold hover:underline">
                      <ExternalLink className="w-3 h-3" />SOCS website
                    </a>
                  </div>
                </div>

                {/* Import mode tabs */}
                <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.3)' }}>
                  {['url', 'file'].map(m => (
                    <button key={m} onClick={() => { setImportMode(m); setError(''); setPreview([]); }}
                      className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                      style={importMode === m ? { background: 'linear-gradient(135deg,#7091E6,#3D52A0)', color: '#fff' } : { color: '#8697C4' }}>
                      {m === 'url' ? '🔗 iCal URL' : '📁 Upload File'}
                    </button>
                  ))}
                </div>

                {importMode === 'url' ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[#3D52A0] text-xs font-bold uppercase tracking-wide block mb-1.5">
                        SOCS iCal Subscription URL
                      </label>
                      <input
                        value={icalUrl}
                        onChange={e => setIcalUrl(e.target.value)}
                        placeholder="webcal://... or https://..."
                        className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                        style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(112,145,230,0.3)', color: '#3D52A0' }}
                      />
                    </div>
                    <button onClick={fetchFromUrl} disabled={syncing || !icalUrl.trim()}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-40 transition-all"
                      style={{ background: 'linear-gradient(135deg,#7091E6,#3D52A0)' }}>
                      {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      {syncing ? status : 'Fetch from URL'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[#3D52A0] text-xs font-bold uppercase tracking-wide block mb-1.5">
                        Upload .ics File
                      </label>
                      <div
                        onClick={() => fileRef.current?.click()}
                        className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-xl cursor-pointer transition-all"
                        style={{ background: 'rgba(112,145,230,0.08)', border: '2px dashed rgba(112,145,230,0.4)' }}>
                        <Upload className="w-7 h-7 text-[#7091E6]" />
                        <p className="text-[#3D52A0] font-semibold text-sm">Click to upload your SOCS .ics file</p>
                        <p className="text-[#8697C4] text-xs">Supports iCalendar (.ics) format</p>
                        <input ref={fileRef} type="file" accept=".ics,.ical" className="hidden" onChange={handleFileUpload} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: 'rgba(220,55,55,0.1)', border: '1px solid rgba(220,55,55,0.3)' }}>
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-red-600 text-xs font-medium">{error}</p>
                  </div>
                )}

                {/* Preview */}
                {preview.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[#3D52A0] font-bold text-sm">
                        Preview — {preview.length} lessons found
                      </p>
                      <span className="text-[#8697C4] text-xs">Scroll to review</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-xl p-2"
                      style={{ background: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.3)' }}>
                      {preview.map((l, i) => (
                        <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
                          style={{ background: 'rgba(255,255,255,0.5)' }}>
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#7091E6' }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[#3D52A0] text-xs font-semibold truncate">{l.lesson_name}</p>
                            <p className="text-[#8697C4] text-[10px]">{l.day_of_week} {l.start_time} · {l.duration_minutes}min{l.teacher_name ? ` · ${l.teacher_name}` : ''}{l.room ? ` · ${l.room}` : ''}</p>
                          </div>
                          {l.week_number === 2 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'rgba(112,145,230,0.2)', color: '#3D52A0' }}>Wk B</span>
                          )}
                        </div>
                      ))}
                    </div>

                    <button onClick={() => processLessons(preview)} disabled={syncing}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg,#7091E6,#3D52A0)' }}>
                      {syncing ? <><Loader2 className="w-4 h-4 animate-spin" />{status}</> : <><CheckCircle2 className="w-4 h-4" />Import {preview.length} Lessons</>}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}