import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, Plus, Trash2, Check, Loader2, ChevronLeft, Swords, ClipboardPaste, CheckCircle2, Edit2, AlertTriangle, Filter } from 'lucide-react';

export default function BattleQuestionSelector({ classData, onConfirm, onCancel, opponent, hideSendButton, confirmLabel }) {
  const [mode, setMode] = useState('bank'); // 'bank' | 'manual' | 'paste' | 'confirm'
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [search, setSearch] = useState('');
  const [filterTopic, setFilterTopic] = useState('');
  const [filterSubtopic, setFilterSubtopic] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [manualQ, setManualQ] = useState({ question_text: '', options: ['', '', '', ''], correct_index: 0 });
  const [pasteText, setPasteText] = useState('');
  const [pasteError, setPasteError] = useState('');
  const [lastPasteResult, setLastPasteResult] = useState(null); // { added, unverified }
  const [editingIndex, setEditingIndex] = useState(null);

  const subjectId = classData?.subject_id;

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => base44.entities.Subject.filter({ is_active: true }),
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['topics', subjectId],
    queryFn: () => base44.entities.Topic.filter({ subject_id: subjectId }),
    enabled: !!subjectId,
  });

  const { data: allTopics = [] } = useQuery({
    queryKey: ['allTopics'],
    queryFn: () => base44.entities.Topic.list(),
    enabled: !subjectId,
  });

  const { data: subtopics = [] } = useQuery({
    queryKey: ['subtopics', filterTopic],
    queryFn: () => base44.entities.Subtopic.filter({ topic_id: filterTopic }),
    enabled: !!filterTopic,
  });

  const effectiveTopics = subjectId ? topics : allTopics;
  const topicIds = effectiveTopics.map(t => t.id);

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ['battleQuestionBank', subjectId, topicIds.join(',')],
    queryFn: async () => {
      let qs;
      if (topicIds.length > 0) {
        qs = await base44.entities.Question.filter({
          topic_id: { $in: topicIds },
          question_type: 'multiple_choice',
          is_active: true,
        }, null, 300);
      } else {
        qs = await base44.entities.Question.filter({
          question_type: 'multiple_choice',
          is_active: true,
        }, null, 300);
      }
      console.log('1v1 Battle — questions loaded from bank:', qs.length);
      return qs;
    },
    enabled: true,
  });

  // Apply filters
  const filtered = questions.filter(q => {
    if (search && !q.question_text?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterTopic && q.topic_id !== filterTopic) return false;
    if (filterSubtopic && q.subtopic_id !== filterSubtopic) return false;
    if (filterDifficulty && q.difficulty !== filterDifficulty) return false;
    return true;
  });

  // Helper: get topic name
  const getTopicName = (topicId) => effectiveTopics.find(t => t.id === topicId)?.name || 'General';
  const getSubjectName = (subjectId) => subjects.find(s => s.id === subjectId)?.name || '';

  // ── SAFE PASTE PARSER ──────────────────────────────────────────────
  // RULE: NEVER guess a correct answer. Only mark correct if explicitly stated.
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
        // Full structured format — only trust answer if explicitly provided
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
          if (idx !== -1) {
            correctIndex = idx;
            unverified = false;
          }
        }

        if (rawQ && options.every(o => o)) {
          parsed.push({
            id: `paste_${Date.now()}_${parsed.length}`,
            question_text: rawQ,
            options,
            correct_index: correctIndex ?? 0,
            unverified,
          });
          continue;
        }
      }

      // Simple lines — no options, no guessing answer
      for (const line of lines) {
        const cleanQ = line.replace(/^(\d+[\.\):\s]+|q\d+[\.\):\s]+|question\s*\d*\s*:\s*)/i, '').trim();
        if (!cleanQ || cleanQ.length < 5) continue;
        parsed.push({
          id: `paste_${Date.now()}_${parsed.length}_${Math.random()}`,
          question_text: cleanQ,
          options: ['', '', '', ''],
          correct_index: null,
          unverified: true,
        });
      }
    }

    if (parsed.length === 0) {
      setPasteError('Could not parse any questions. Please check your format and try again.');
      return;
    }

    const unverifiedCount = parsed.filter(q => q.unverified).length;
    const toAdd = parsed.slice(0, 10 - selectedQuestions.length);

    console.log('1v1 pasted questions:', toAdd);
    console.log('1v1 unverified questions:', toAdd.filter(q => q.unverified));

    setSelectedQuestions(prev => [...prev, ...toAdd]);
    setPasteText('');
    setLastPasteResult({ added: toAdd.length, unverified: unverifiedCount });
    setMode('confirm');
  };

  const toggle = (q) => {
    setSelectedQuestions(prev =>
      prev.find(x => x.id === q.id)
        ? prev.filter(x => x.id !== q.id)
        : prev.length >= 10 ? prev : [...prev, q]
    );
  };

  const addManual = () => {
    if (!manualQ.question_text.trim() || manualQ.options.some(o => !o.trim())) return;
    setSelectedQuestions(prev => [...prev, { ...manualQ, id: `manual_${Date.now()}`, unverified: false }]);
    setManualQ({ question_text: '', options: ['', '', '', ''], correct_index: 0 });
    setMode('bank');
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

  // Count unverified in current selection
  const unverifiedInSelection = selectedQuestions.filter(q => q.unverified).length;

  // Summary breakdown by topic
  const topicBreakdown = selectedQuestions.reduce((acc, q) => {
    const name = q.topic_id ? getTopicName(q.topic_id) : 'Pasted';
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-[990] bg-slate-950/95 backdrop-blur-xl flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-5 pb-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={mode === 'confirm' ? () => setMode('bank') : onCancel} className="text-slate-400 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-white font-black text-lg">
              {mode === 'confirm' ? '✅ Questions Added' : `Challenge ${opponent?.full_name || opponent?.email?.split('@')[0]}`}
            </h2>
            <p className="text-slate-400 text-xs">
              {mode === 'confirm'
                ? `${selectedQuestions.length} question${selectedQuestions.length !== 1 ? 's' : ''} selected for 1v1 Battle`
                : `Select questions for the battle (${selectedQuestions.length}/10)`}
            </p>
          </div>
        </div>
        {mode !== 'confirm' && (
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

      {/* Mode tabs (hidden on confirm screen) */}
      {mode !== 'confirm' && (
        <div className="flex-shrink-0 px-4 pt-4 pb-3 flex gap-2 flex-wrap">
          {['bank', 'manual', 'paste'].map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                mode === m
                  ? m === 'bank' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                  : m === 'manual' ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}>
              {m === 'bank' ? '📚 Question Bank' : m === 'manual' ? '✏️ Create Question' : '📋 Paste Questions'}
            </button>
          ))}
        </div>
      )}

      {/* Selected preview bar */}
      {selectedQuestions.length > 0 && mode !== 'confirm' && (
        <div className="flex-shrink-0 px-4 pb-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {selectedQuestions.map((q, i) => (
              <div key={q.id} className={`flex-shrink-0 flex items-center gap-2 border rounded-xl px-3 py-1.5 ${
                q.unverified ? 'bg-amber-500/15 border-amber-500/40' : 'bg-purple-500/20 border-purple-500/40'
              }`}>
                <span className={`text-xs font-bold ${q.unverified ? 'text-amber-300' : 'text-purple-300'}`}>
                  {q.unverified ? '⚠' : '✔'} Q{i + 1}
                </span>
                <span className="text-white text-xs max-w-[120px] truncate">{q.question_text}</span>
                <button onClick={() => toggle(q)} className="text-slate-500 hover:text-red-400 transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          {/* Summary line */}
          <p className="text-xs text-slate-500 mt-1">
            {selectedQuestions.length} selected for 1v1 Battle ✔
            {unverifiedInSelection > 0 && <span className="text-amber-400 ml-2">· {unverifiedInSelection} need review</span>}
            {Object.entries(topicBreakdown).map(([t, c]) => (
              <span key={t} className="text-slate-600 ml-2">· {t}: {c}</span>
            ))}
          </p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        <AnimatePresence mode="wait">

          {/* ── CONFIRM SCREEN ── */}
          {mode === 'confirm' && lastPasteResult && (
            <motion.div key="confirm" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-10 space-y-6 max-w-md mx-auto">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-black text-white mb-1">Questions Added!</h3>
                <p className="text-emerald-400 font-bold">✅ Questions successfully added to 1v1 Battle</p>
              </div>

              {/* Stats */}
              <div className="w-full grid grid-cols-2 gap-3">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                  <p className="text-3xl font-black text-white">{lastPasteResult.added}</p>
                  <p className="text-slate-400 text-xs mt-1">Questions added</p>
                </div>
                <div className={`border rounded-2xl p-4 text-center ${lastPasteResult.unverified > 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                  <p className={`text-3xl font-black ${lastPasteResult.unverified > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {lastPasteResult.unverified > 0 ? lastPasteResult.unverified : '0'}
                  </p>
                  <p className="text-slate-400 text-xs mt-1">Need review</p>
                </div>
              </div>

              {lastPasteResult.unverified > 0 && (
                <div className="w-full bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex gap-3 items-start">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-amber-300 font-bold text-sm">Review required</p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {lastPasteResult.unverified} question{lastPasteResult.unverified !== 1 ? 's' : ''} have no confirmed correct answer.
                      Use "Edit Questions" to set the right answer before battling.
                    </p>
                  </div>
                </div>
              )}

              <div className="w-full bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3 text-center">
                <p className="text-emerald-400 text-sm font-bold">✔ Ready for 1v1 Battle</p>
              </div>

              {/* Action buttons */}
              <div className="w-full space-y-2">
                <button
                  onClick={handleSend}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-black text-sm hover:brightness-110 transition-all shadow-lg shadow-red-500/30">
                  <Swords className="w-4 h-4" /> Start Battle Now
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setMode('bank')}
                    className="py-2.5 rounded-2xl bg-white/10 border border-white/20 text-white font-bold text-sm hover:bg-white/20 transition-all">
                    View Questions
                  </button>
                  <button
                    onClick={() => { setEditingIndex(0); setMode('review'); }}
                    className="py-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-sm hover:bg-amber-500/30 transition-all flex items-center justify-center gap-1">
                    <Edit2 className="w-3.5 h-3.5" /> Edit Questions
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── REVIEW / EDIT PASTED QUESTIONS ── */}
          {mode === 'review' && (
            <motion.div key="review" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="space-y-3">
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
                    {(q.options || []).map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const updated = [...selectedQuestions];
                            updated[idx] = { ...updated[idx], correct_index: oi, unverified: false };
                            setSelectedQuestions(updated);
                          }}
                          className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                            q.correct_index === oi ? 'border-emerald-400 bg-emerald-500' : 'border-slate-600 hover:border-slate-400'
                          }`}>
                          {q.correct_index === oi && <Check className="w-3 h-3 text-white" />}
                        </button>
                        <input
                          value={opt}
                          onChange={e => {
                            const updated = [...selectedQuestions];
                            const newOptions = [...(updated[idx].options || [])];
                            newOptions[oi] = e.target.value;
                            updated[idx] = { ...updated[idx], options: newOptions };
                            setSelectedQuestions(updated);
                          }}
                          placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-slate-600 text-xs">Click the circle to mark the correct answer</p>
                </div>
              ))}
              <button
                onClick={() => setMode('confirm')}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-sm hover:brightness-110 transition-all">
                Save & Continue
              </button>
            </motion.div>
          )}

          {/* ── QUESTION BANK ── */}
          {mode === 'bank' && (
            <motion.div key="bank" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {/* Filters */}
              <div className="flex gap-2 flex-wrap mb-3">
                <div className="flex items-center gap-1 text-slate-500 text-xs"><Filter className="w-3.5 h-3.5" /></div>
                <select value={filterTopic} onChange={e => { setFilterTopic(e.target.value); setFilterSubtopic(''); }}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500/50">
                  <option value="">All Topics</option>
                  {effectiveTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                {subtopics.length > 0 && (
                  <select value={filterSubtopic} onChange={e => setFilterSubtopic(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500/50">
                    <option value="">All Subtopics</option>
                    {subtopics.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                )}
                <select value={filterDifficulty} onChange={e => setFilterDifficulty(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500/50">
                  <option value="">All Difficulties</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search questions..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50"
                />
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin" /> Loading questions...
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-500">No questions found.</p>
                  <button onClick={() => setMode('manual')} className="mt-3 text-blue-400 text-sm hover:underline">
                    Create one manually →
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map(q => {
                    const isSelected = !!selectedQuestions.find(x => x.id === q.id);
                    const topicName = getTopicName(q.topic_id);
                    return (
                      <motion.button key={q.id} onClick={() => toggle(q)}
                        className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                          isSelected
                            ? 'border-purple-500/60 bg-purple-500/15'
                            : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/20'
                        }`}
                        whileTap={{ scale: 0.99 }}>
                        <div className="flex items-start gap-3">
                          <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-0.5 transition-all ${
                            isSelected ? 'border-purple-400 bg-purple-500' : 'border-slate-600'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium leading-snug">{q.question_text}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {topicName && topicName !== 'General' && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">{topicName}</span>
                              )}
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                q.difficulty === 'easy' ? 'bg-emerald-500/20 text-emerald-400' :
                                q.difficulty === 'hard' ? 'bg-red-500/20 text-red-400' :
                                'bg-amber-500/20 text-amber-400'
                              }`}>{q.difficulty || 'medium'}</span>
                              <span className="text-slate-500 text-xs">{q.options?.length || 4} options</span>
                              {isSelected && <span className="text-xs text-purple-300 font-bold">Selected for 1v1 Battle ✔</span>}
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ── PASTE ── */}
          {mode === 'paste' && (
            <motion.div key="paste" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="space-y-4">
              <div>
                <label className="text-slate-300 text-sm font-bold mb-2 block">Paste Multiple Questions</label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-slate-400 text-xs font-bold mb-1">📝 Questions only</p>
                    <pre className="text-xs text-slate-500 font-mono whitespace-pre-wrap">{"What is 2+2?\nCapital of France?\nWW2 ended in?"}</pre>
                    <p className="text-amber-400 text-xs mt-1">⚠ Will need review</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-emerald-400 text-xs font-bold mb-1">✅ Full format (recommended)</p>
                    <pre className="text-xs text-slate-500 font-mono whitespace-pre-wrap">{"Q: What is 2+2?\nA: 3\nB: 4\nC: 5\nD: 6\nAnswer: B"}</pre>
                  </div>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-3 flex gap-2 items-start">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-amber-300 text-xs">
                    <strong>Safe mode:</strong> We never guess answers. Questions without an explicit "Answer: X" line are marked as <em>Unverified</em> and you can review them before the battle.
                  </p>
                </div>
                <textarea
                  value={pasteText}
                  onChange={e => { setPasteText(e.target.value); setPasteError(''); }}
                  placeholder="Paste 1–10 questions here..."
                  rows={12}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 resize-none font-mono"
                />
                {pasteError && (
                  <p className="text-red-400 text-xs mt-2">{pasteError}</p>
                )}
              </div>
              <button
                onClick={parsePastedQuestions}
                disabled={!pasteText.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-all">
                <ClipboardPaste className="w-4 h-4" /> Parse & Add Questions
              </button>
            </motion.div>
          )}

          {/* ── MANUAL ── */}
          {mode === 'manual' && (
            <motion.div key="manual" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="space-y-4">
              <div>
                <label className="text-slate-300 text-sm font-bold mb-2 block">Question *</label>
                <textarea
                  value={manualQ.question_text}
                  onChange={e => setManualQ({ ...manualQ, question_text: e.target.value })}
                  placeholder="Enter your question..."
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 resize-none"
                />
              </div>
              <div>
                <label className="text-slate-300 text-sm font-bold mb-2 block">Answer Options</label>
                <div className="space-y-2">
                  {manualQ.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <button
                        onClick={() => setManualQ({ ...manualQ, correct_index: idx })}
                        className={`w-7 h-7 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                          manualQ.correct_index === idx ? 'border-emerald-400 bg-emerald-500' : 'border-slate-600 hover:border-slate-400'
                        }`}>
                        {manualQ.correct_index === idx && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                      <span className="text-slate-400 text-sm w-6 flex-shrink-0">{String.fromCharCode(65 + idx)}</span>
                      <input
                        value={opt}
                        onChange={e => {
                          const o = [...manualQ.options]; o[idx] = e.target.value;
                          setManualQ({ ...manualQ, options: o });
                        }}
                        placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-slate-500 text-xs mt-2">Click the circle to mark the correct answer</p>
              </div>
              <button
                onClick={addManual}
                disabled={!manualQ.question_text.trim() || manualQ.options.some(o => !o.trim())}
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