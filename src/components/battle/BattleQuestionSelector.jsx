import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, Plus, Trash2, Check, Loader2, ChevronLeft, Swords, ClipboardPaste, CheckCircle2, Edit2, AlertTriangle, ChevronRight } from 'lucide-react';

// Step-based question selection flow for 1v1 Battle
// Steps: topic → subtopic → difficulty → questions
// Uses GlobalTopic + GlobalQuestion (same as Global Question Bank)

export default function BattleQuestionSelector({ classData, onConfirm, onCancel, opponent, hideSendButton, confirmLabel }) {
  const [mode, setMode] = useState('steps'); // 'steps' | 'manual' | 'paste' | 'confirm' | 'review'
  const [step, setStep] = useState(1); // 1=topic, 2=subtopic, 3=difficulty, 4=questions
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [selectedSubtopic, setSelectedSubtopic] = useState(null);
  const [selectedDifficulties, setSelectedDifficulties] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [search, setSearch] = useState('');
  const [manualQ, setManualQ] = useState({ question_text: '', options: ['', '', '', ''], correct_index: 0 });
  const [pasteText, setPasteText] = useState('');
  const [pasteError, setPasteError] = useState('');
  const [lastPasteResult, setLastPasteResult] = useState(null);

  const subjectId = classData?.subject_id;

  // ── Load top-level GlobalTopics for this subject ──────────────────────────
  const { data: topics = [], isLoading: loadingTopics } = useQuery({
    queryKey: ['battleGlobalTopics', subjectId],
    queryFn: async () => {
      // Top-level topics have parent_topic_id = null/undefined
      let results;
      if (subjectId) {
        results = await base44.entities.GlobalTopic.filter({ subject_id: subjectId });
      } else {
        results = await base44.entities.GlobalTopic.list();
      }
      // Only top-level (no parent)
      const topLevel = results.filter(t => !t.parent_topic_id);
      console.log('Class subject_id:', subjectId);
      console.log('GlobalTopics found:', results.length, '| Top-level:', topLevel.length);
      return topLevel.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    },
    enabled: true,
  });

  // ── Load subtopics (GlobalTopics with parent_topic_id = selectedTopic.id) ──
  const { data: subtopics = [], isLoading: loadingSubtopics } = useQuery({
    queryKey: ['battleGlobalSubtopics', selectedTopic?.id],
    queryFn: async () => {
      const results = await base44.entities.GlobalTopic.filter({ parent_topic_id: selectedTopic.id });
      console.log('Subtopics for', selectedTopic.name, ':', results.length);
      return results.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    },
    enabled: !!selectedTopic,
  });

  // ── Load GlobalQuestions filtered by subject + topic + subtopic + difficulty ──
  const { data: filteredQuestions = [], isLoading: loadingQuestions } = useQuery({
    queryKey: ['battleGlobalQ', subjectId, selectedTopic?.id, selectedSubtopic?.id, selectedDifficulties.join(',')],
    queryFn: async () => {
      // Build filter: only MCQ questions work for battles
      const filter = { question_type: 'mcq' };
      if (subjectId) filter.subject_id = subjectId;

      // Determine which GlobalTopic IDs to filter by
      if (selectedSubtopic) {
        filter.global_topic_id = selectedSubtopic.id;
      } else if (selectedTopic) {
        // Get all subtopics under this topic
        const subs = await base44.entities.GlobalTopic.filter({ parent_topic_id: selectedTopic.id });
        const subIds = subs.map(s => s.id);
        // Also include questions directly tagged to the parent topic
        const allIds = [selectedTopic.id, ...subIds];
        if (allIds.length === 1) {
          filter.global_topic_id = allIds[0];
        } else {
          filter.global_topic_id = { $in: allIds };
        }
      }

      if (selectedDifficulties.length === 1) filter.difficulty = selectedDifficulties[0];

      const qs = await base44.entities.GlobalQuestion.filter(filter, null, 200);
      console.log('GlobalQuestions found:', qs.length, '| filter:', JSON.stringify(filter));

      // Multi-difficulty client-side filter
      if (selectedDifficulties.length > 1) {
        return qs.filter(q => selectedDifficulties.includes(q.difficulty));
      }
      return qs;
    },
    enabled: step === 4,
  });

  // Normalize GlobalQuestion → battle format (GlobalQuestions use `choices` not `options`)
  const normalizeGlobalQ = (q) => ({
    id: q.id,
    question_text: q.question_text,
    options: q.choices || [],
    correct_index: q.correct_index ?? 0,
    difficulty: q.difficulty,
    unverified: false,
  });

  const questionsToShow = filteredQuestions
    .filter(q => !search || q.question_text?.toLowerCase().includes(search.toLowerCase()))
    .map(normalizeGlobalQ);

  const toggle = (q) => {
    setSelectedQuestions(prev =>
      prev.find(x => x.id === q.id)
        ? prev.filter(x => x.id !== q.id)
        : prev.length >= 10 ? prev : [...prev, q]
    );
  };

  const toggleDifficulty = (d) => {
    setSelectedDifficulties(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
    );
  };

  // ── SAFE PASTE PARSER ──────────────────────────────────────────────
  const parsePastedQuestions = () => {
    setPasteError('');
    if (!pasteText.trim()) { setPasteError('Please paste some questions first.'); return; }

    const parsed = [];
    const rawBlocks = pasteText.trim().split(/\n{2,}/);

    for (const rawBlock of rawBlocks) {
      const lines = rawBlock.trim().split('\n').map(l => l.trim()).filter(Boolean);
      if (!lines.length) continue;

      const aLine = lines.find(l => /^a[\.\):\s]/i.test(l));
      const bLine = lines.find(l => /^b[\.\):\s]/i.test(l));
      const cLine = lines.find(l => /^c[\.\):\s]/i.test(l));
      const dLine = lines.find(l => /^d[\.\):\s]/i.test(l));
      const answerLine = lines.find(l => /^(answer|ans|correct)\s*:/i.test(l));

      if (aLine && bLine && cLine && dLine) {
        const rawQ = lines[0].replace(/^(question\s*\d*\s*:|q\d+\s*:|\d+[\.\)]\s*)/i, '').trim();
        const options = [
          aLine.replace(/^a[\.\):\s]+/i, '').trim(),
          bLine.replace(/^b[\.\):\s]+/i, '').trim(),
          cLine.replace(/^c[\.\):\s]+/i, '').trim(),
          dLine.replace(/^d[\.\):\s]+/i, '').trim(),
        ];
        let correctIndex = null;
        let unverified = true;
        if (answerLine) {
          const letter = answerLine.replace(/^(answer|ans|correct)\s*:\s*/i, '').trim().toUpperCase().charAt(0);
          const idx = ['A', 'B', 'C', 'D'].indexOf(letter);
          if (idx !== -1) { correctIndex = idx; unverified = false; }
        }
        if (rawQ && options.every(o => o)) {
          parsed.push({ id: `paste_${Date.now()}_${parsed.length}`, question_text: rawQ, options, correct_index: correctIndex ?? 0, unverified });
          continue;
        }
      }

      for (const line of lines) {
        const cleanQ = line.replace(/^(\d+[\.\):\s]+|q\d+[\.\):\s]+|question\s*\d*\s*:\s*)/i, '').trim();
        if (!cleanQ || cleanQ.length < 5) continue;
        parsed.push({ id: `paste_${Date.now()}_${parsed.length}_${Math.random()}`, question_text: cleanQ, options: ['', '', '', ''], correct_index: null, unverified: true });
      }
    }

    if (parsed.length === 0) { setPasteError('Could not parse any questions. Please check your format.'); return; }

    const unverifiedCount = parsed.filter(q => q.unverified).length;
    const toAdd = parsed.slice(0, 10 - selectedQuestions.length);

    setSelectedQuestions(prev => [...prev, ...toAdd]);
    setPasteText('');
    setLastPasteResult({ added: toAdd.length, unverified: unverifiedCount });
    setMode('confirm');
  };

  const addManual = () => {
    if (!manualQ.question_text.trim() || manualQ.options.some(o => !o.trim())) return;
    setSelectedQuestions(prev => [...prev, { ...manualQ, id: `manual_${Date.now()}`, unverified: false }]);
    setManualQ({ question_text: '', options: ['', '', '', ''], correct_index: 0 });
    setMode('steps');
  };

  const handleSend = () => {
    if (selectedQuestions.length < 1) return;
    const normalised = selectedQuestions.map(q => ({
      question_text: q.question_text,
      options: q.options?.every(o => o) ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'],
      correct_index: q.correct_index ?? 0,
    }));
    onConfirm(normalised);
  };

  const unverifiedCount = selectedQuestions.filter(q => q.unverified).length;

  const DIFFICULTIES = [
    { id: 'easy', label: 'Easy', sub: 'Foundation', color: 'emerald' },
    { id: 'medium', label: 'Medium', sub: 'Intermediate', color: 'amber' },
    { id: 'hard', label: 'Hard', sub: 'Higher', color: 'red' },
  ];

  return (
    <div className="fixed inset-0 z-[990] bg-slate-950/98 backdrop-blur-xl flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-5 pb-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={mode === 'confirm' ? () => setMode('steps') : mode !== 'steps' ? () => setMode('steps') : step > 1 ? () => setStep(s => s - 1) : onCancel}
            className="text-slate-400 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-white font-black text-lg">
              {mode === 'confirm' ? '✅ Questions Added' :
               mode === 'paste' ? '📋 Paste Questions' :
               mode === 'manual' ? '✏️ Create Question' :
               mode === 'review' ? '✏️ Edit Questions' :
               opponent ? `Challenge ${opponent?.full_name || opponent?.email?.split('@')[0]}` : '🏟️ Select Questions'}
            </h2>
            <p className="text-slate-400 text-xs">
              {mode === 'steps' && step < 4 ? `Step ${step} of 4` : `${selectedQuestions.length}/10 selected`}
            </p>
          </div>
        </div>
        {mode !== 'confirm' && mode !== 'review' && (
          <motion.button
            onClick={handleSend}
            disabled={selectedQuestions.length === 0}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm transition-all ${
              selectedQuestions.length > 0
                ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/30 hover:brightness-110'
                : 'bg-white/5 text-slate-600 cursor-not-allowed'
            }`}
            whileTap={selectedQuestions.length > 0 ? { scale: 0.95 } : {}}>
            {!hideSendButton && <Swords className="w-4 h-4" />}
            {confirmLabel || 'Send Challenge'}
          </motion.button>
        )}
      </div>

      {/* Mode tabs */}
      {mode !== 'confirm' && mode !== 'review' && (
        <div className="flex-shrink-0 px-4 pt-3 pb-3 flex gap-2 flex-wrap border-b border-white/5">
          <button onClick={() => setMode('steps')}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${mode === 'steps' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}>
            📚 Question Bank
          </button>
          <button onClick={() => setMode('manual')}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${mode === 'manual' ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}>
            ✏️ Create Question
          </button>
          <button onClick={() => setMode('paste')}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${mode === 'paste' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}>
            📋 Paste Questions
          </button>
        </div>
      )}

      {/* Selected pills bar */}
      {selectedQuestions.length > 0 && mode !== 'confirm' && mode !== 'review' && (
        <div className="flex-shrink-0 px-4 pt-3 pb-2 border-b border-white/5">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {selectedQuestions.map((q, i) => (
              <div key={q.id} className={`flex-shrink-0 flex items-center gap-2 border rounded-xl px-3 py-1.5 ${q.unverified ? 'bg-amber-500/15 border-amber-500/40' : 'bg-purple-500/20 border-purple-500/40'}`}>
                <span className={`text-xs font-bold ${q.unverified ? 'text-amber-300' : 'text-purple-300'}`}>{q.unverified ? '⚠' : '✔'} Q{i + 1}</span>
                <span className="text-white text-xs max-w-[100px] truncate">{q.question_text}</span>
                <button onClick={() => toggle(q)} className="text-slate-500 hover:text-red-400 transition-colors"><Trash2 className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {selectedQuestions.length} selected
            {unverifiedCount > 0 && <span className="text-amber-400 ml-2">· {unverifiedCount} need review</span>}
          </p>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">

          {/* ── CONFIRM SCREEN ── */}
          {mode === 'confirm' && lastPasteResult && (
            <motion.div key="confirm" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-10 px-6 space-y-5 max-w-md mx-auto">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-black text-white mb-1">Questions Added!</h3>
                <p className="text-emerald-400 font-bold">✅ Successfully added</p>
              </div>
              <div className="w-full grid grid-cols-2 gap-3">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                  <p className="text-3xl font-black text-white">{lastPasteResult.added}</p>
                  <p className="text-slate-400 text-xs mt-1">Questions added</p>
                </div>
                <div className={`border rounded-2xl p-4 text-center ${lastPasteResult.unverified > 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                  <p className={`text-3xl font-black ${lastPasteResult.unverified > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>{lastPasteResult.unverified}</p>
                  <p className="text-slate-400 text-xs mt-1">Need review</p>
                </div>
              </div>
              {lastPasteResult.unverified > 0 && (
                <div className="w-full bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-amber-300 text-sm">{lastPasteResult.unverified} question{lastPasteResult.unverified !== 1 ? 's' : ''} need a correct answer set.</p>
                </div>
              )}
              <div className="w-full space-y-2">
                <button onClick={handleSend} className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-black text-sm hover:brightness-110 transition-all">
                  <Swords className="w-4 h-4" /> Start Battle Now
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { setMode('steps'); setStep(4); }} className="py-2.5 rounded-2xl bg-white/10 border border-white/20 text-white font-bold text-sm hover:bg-white/20 transition-all">View Questions</button>
                  <button onClick={() => setMode('review')} className="py-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-sm hover:bg-amber-500/30 transition-all flex items-center justify-center gap-1">
                    <Edit2 className="w-3.5 h-3.5" /> Edit Questions
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── REVIEW / EDIT PASTED QUESTIONS ── */}
          {mode === 'review' && (
            <motion.div key="review" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-4 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white font-black">Edit Questions</h3>
                <button onClick={() => setMode('confirm')} className="text-slate-400 hover:text-white text-sm">← Back</button>
              </div>
              {selectedQuestions.map((q, idx) => (
                <div key={q.id} className={`rounded-2xl border-2 p-4 space-y-3 ${q.unverified ? 'border-amber-500/40 bg-amber-500/5' : 'border-white/10 bg-white/[0.03]'}`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${q.unverified ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-400'}`}>
                      {q.unverified ? '⚠ Unverified' : '✔ Verified'}
                    </span>
                    <span className="text-slate-500 text-xs">Q{idx + 1}</span>
                  </div>
                  <p className="text-white text-sm font-medium">{q.question_text}</p>
                  <div className="space-y-1.5">
                    {(q.options || ['', '', '', '']).map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <button onClick={() => { const u = [...selectedQuestions]; u[idx] = { ...u[idx], correct_index: oi, unverified: false }; setSelectedQuestions(u); }}
                          className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${q.correct_index === oi ? 'border-emerald-400 bg-emerald-500' : 'border-slate-600 hover:border-slate-400'}`}>
                          {q.correct_index === oi && <Check className="w-3 h-3 text-white" />}
                        </button>
                        <input value={opt} onChange={e => { const u = [...selectedQuestions]; const opts = [...(u[idx].options || ['','','',''])]; opts[oi] = e.target.value; u[idx] = { ...u[idx], options: opts }; setSelectedQuestions(u); }}
                          placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <button onClick={() => setMode('confirm')} className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-sm hover:brightness-110 transition-all">
                Save & Continue
              </button>
            </motion.div>
          )}

          {/* ── STEP-BASED QUESTION BANK (uses GlobalTopic + GlobalQuestion) ── */}
          {mode === 'steps' && (
            <motion.div key="steps" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-4">

              {/* Step progress indicator */}
              <div className="flex items-center gap-2 mb-6">
                {[1,2,3,4].map(s => (
                  <React.Fragment key={s}>
                    <div className={`flex items-center gap-1.5 ${step >= s ? 'text-white' : 'text-slate-600'}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${
                        step > s ? 'bg-emerald-500 border-emerald-500' :
                        step === s ? 'bg-blue-500 border-blue-500' :
                        'border-slate-700 bg-transparent'
                      }`}>
                        {step > s ? <Check className="w-3.5 h-3.5" /> : s}
                      </div>
                      <span className="text-xs font-medium hidden sm:block">
                        {s === 1 ? 'Topic' : s === 2 ? 'Subtopic' : s === 3 ? 'Difficulty' : 'Questions'}
                      </span>
                    </div>
                    {s < 4 && <div className={`flex-1 h-0.5 rounded-full ${step > s ? 'bg-emerald-500' : 'bg-slate-700'}`} />}
                  </React.Fragment>
                ))}
              </div>

              {/* STEP 1: Topic (from GlobalTopic, top-level) */}
              {step === 1 && (
                <div>
                  <h3 className="text-white font-black text-xl mb-1">Select a Topic</h3>
                  <p className="text-slate-400 text-sm mb-4">Choose which topic to draw questions from</p>
                  {loadingTopics ? (
                    <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin" /> Loading topics...
                    </div>
                  ) : topics.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-slate-400 text-lg mb-2">No structured topics found.</p>
                      <p className="text-slate-500 text-sm mb-4">Showing all available questions instead.</p>
                      <button onClick={() => { setSelectedTopic(null); setSelectedSubtopic(null); setStep(3); }}
                        className="px-6 py-2.5 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-300 font-bold text-sm hover:bg-blue-500/30 transition-all">
                        Continue with all questions →
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {topics.map(t => (
                        <motion.button key={t.id} onClick={() => { setSelectedTopic(t); setSelectedSubtopic(null); setStep(2); }}
                          className="w-full text-left p-4 rounded-2xl border-2 border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-blue-500/40 transition-all group"
                          whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-white font-bold text-base">{t.name}</p>
                              {t.description && <p className="text-slate-400 text-sm mt-0.5">{t.description}</p>}
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-blue-400 transition-colors" />
                          </div>
                        </motion.button>
                      ))}
                      <button onClick={() => { setSelectedTopic(null); setSelectedSubtopic(null); setStep(3); }}
                        className="w-full text-center py-3 text-slate-500 hover:text-slate-300 text-sm transition-colors">
                        Skip — show all topics →
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: Subtopic (GlobalTopic children) */}
              {step === 2 && selectedTopic && (
                <div>
                  <h3 className="text-white font-black text-xl mb-1">{selectedTopic.name}</h3>
                  <p className="text-slate-400 text-sm mb-4">Select a subtopic (optional)</p>
                  {loadingSubtopics ? (
                    <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin" /> Loading subtopics...
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {subtopics.map(st => (
                        <motion.button key={st.id} onClick={() => { setSelectedSubtopic(st); setStep(3); }}
                          className="w-full text-left p-4 rounded-2xl border-2 border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-cyan-500/40 transition-all group"
                          whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-white font-bold">{st.name}</p>
                              {st.description && <p className="text-slate-400 text-sm mt-0.5">{st.description}</p>}
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                          </div>
                        </motion.button>
                      ))}
                      <button onClick={() => { setSelectedSubtopic(null); setStep(3); }}
                        className="w-full text-center py-3 text-slate-500 hover:text-slate-300 text-sm transition-colors">
                        {subtopics.length === 0 ? 'No subtopics — continue →' : 'Skip — all subtopics →'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: Difficulty */}
              {step === 3 && (
                <div>
                  <h3 className="text-white font-black text-xl mb-1">Select Difficulty</h3>
                  <p className="text-slate-400 text-sm mb-4">Choose one or more difficulty levels</p>
                  <div className="space-y-3 mb-6">
                    {DIFFICULTIES.map(d => {
                      const isSelected = selectedDifficulties.includes(d.id);
                      const colorMap = { emerald: 'border-emerald-500/60 bg-emerald-500/15', amber: 'border-amber-500/60 bg-amber-500/15', red: 'border-red-500/60 bg-red-500/15' };
                      const dotMap = { emerald: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-red-500' };
                      return (
                        <motion.button key={d.id} onClick={() => toggleDifficulty(d.id)}
                          className={`w-full text-left p-5 rounded-2xl border-2 transition-all flex items-center gap-4 ${isSelected ? colorMap[d.color] : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07]'}`}
                          whileTap={{ scale: 0.99 }}>
                          <div className={`w-10 h-10 rounded-full ${dotMap[d.color]} flex items-center justify-center text-white font-black text-lg`}>
                            {d.id === 'easy' ? '⭐' : d.id === 'medium' ? '⭐⭐' : '⭐⭐⭐'}
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-black text-lg">{d.label}</p>
                            <p className="text-slate-400 text-sm">{d.sub}</p>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-white bg-white/30' : 'border-slate-600'}`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setStep(4)}
                    disabled={selectedDifficulties.length === 0}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-black text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-all">
                    Load Questions →
                  </button>
                  <button onClick={() => { setSelectedDifficulties([]); setStep(4); }} className="w-full text-center py-3 text-slate-500 hover:text-slate-300 text-sm transition-colors mt-1">
                    Skip — show all difficulties →
                  </button>
                </div>
              )}

              {/* STEP 4: Questions */}
              {step === 4 && (
                <div>
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    {selectedTopic && <span className="bg-blue-500/20 text-blue-300 text-xs px-2 py-1 rounded-full">{selectedTopic.name}</span>}
                    {selectedSubtopic && <span className="bg-cyan-500/20 text-cyan-300 text-xs px-2 py-1 rounded-full">{selectedSubtopic.name}</span>}
                    {selectedDifficulties.map(d => <span key={d} className="bg-amber-500/20 text-amber-300 text-xs px-2 py-1 rounded-full capitalize">{d}</span>)}
                    <button onClick={() => setStep(1)} className="text-xs text-slate-500 hover:text-slate-300 underline ml-auto">Change filters</button>
                  </div>

                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search questions..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50" />
                  </div>

                  {loadingQuestions ? (
                    <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin" /> Loading questions...
                    </div>
                  ) : questionsToShow.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-slate-500 text-lg mb-2">No questions found</p>
                      <p className="text-slate-600 text-sm mb-4">Try different filters.</p>
                      <button onClick={() => setStep(1)} className="text-blue-400 text-sm hover:underline">← Change filters</button>
                    </div>
                  ) : (
                    <>
                      <p className="text-slate-500 text-xs mb-3">{questionsToShow.length} question{questionsToShow.length !== 1 ? 's' : ''} found</p>
                      <div className="space-y-2">
                        {questionsToShow.map(q => {
                          const isSelected = !!selectedQuestions.find(x => x.id === q.id);
                          return (
                            <motion.button key={q.id} onClick={() => toggle(q)}
                              className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${isSelected ? 'border-purple-500/60 bg-purple-500/15' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/20'}`}
                              whileTap={{ scale: 0.99 }}>
                              <div className="flex items-start gap-3">
                                <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-0.5 transition-all ${isSelected ? 'border-purple-400 bg-purple-500' : 'border-slate-600'}`}>
                                  {isSelected && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-white text-sm font-medium leading-snug">{q.question_text}</p>
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${q.difficulty === 'easy' ? 'bg-emerald-500/20 text-emerald-400' : q.difficulty === 'hard' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>{q.difficulty || 'medium'}</span>
                                    {isSelected && <span className="text-xs text-purple-300 font-bold">Selected ✔</span>}
                                  </div>
                                </div>
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* ── PASTE ── */}
          {mode === 'paste' && (
            <motion.div key="paste" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-slate-400 text-xs font-bold mb-1">📝 Questions only</p>
                  <pre className="text-xs text-slate-500 font-mono whitespace-pre-wrap">{"What is 2+2?\nCapital of France?"}</pre>
                  <p className="text-amber-400 text-xs mt-1">⚠ Will need review</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-emerald-400 text-xs font-bold mb-1">✅ Full format</p>
                  <pre className="text-xs text-slate-500 font-mono whitespace-pre-wrap">{"Q: What is 2+2?\nA: 3\nB: 4\nC: 5\nD: 6\nAnswer: B"}</pre>
                </div>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-amber-300 text-xs"><strong>Safe mode:</strong> We never guess answers. Questions without "Answer: X" are marked Unverified for your review.</p>
              </div>
              <textarea value={pasteText} onChange={e => { setPasteText(e.target.value); setPasteError(''); }}
                placeholder="Paste 1–10 questions here..." rows={10}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 resize-none font-mono" />
              {pasteError && <p className="text-red-400 text-xs">{pasteError}</p>}
              <button onClick={parsePastedQuestions} disabled={!pasteText.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-all">
                <ClipboardPaste className="w-4 h-4" /> Parse & Add Questions
              </button>
            </motion.div>
          )}

          {/* ── MANUAL ── */}
          {mode === 'manual' && (
            <motion.div key="manual" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-4 space-y-4">
              <div>
                <label className="text-slate-300 text-sm font-bold mb-2 block">Question *</label>
                <textarea value={manualQ.question_text} onChange={e => setManualQ({ ...manualQ, question_text: e.target.value })}
                  placeholder="Enter your question..." rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 resize-none" />
              </div>
              <div>
                <label className="text-slate-300 text-sm font-bold mb-2 block">Answer Options</label>
                <div className="space-y-2">
                  {manualQ.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <button onClick={() => setManualQ({ ...manualQ, correct_index: idx })}
                        className={`w-7 h-7 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${manualQ.correct_index === idx ? 'border-emerald-400 bg-emerald-500' : 'border-slate-600 hover:border-slate-400'}`}>
                        {manualQ.correct_index === idx && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                      <span className="text-slate-400 text-sm w-6 flex-shrink-0">{String.fromCharCode(65 + idx)}</span>
                      <input value={opt} onChange={e => { const o = [...manualQ.options]; o[idx] = e.target.value; setManualQ({ ...manualQ, options: o }); }}
                        placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50" />
                    </div>
                  ))}
                </div>
                <p className="text-slate-500 text-xs mt-2">Click the circle to mark the correct answer</p>
              </div>
              <button onClick={addManual} disabled={!manualQ.question_text.trim() || manualQ.options.some(o => !o.trim())}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-black text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-all">
                <Plus className="w-4 h-4" /> Add to Battle
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}