import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, Plus, Trash2, Check, Loader2, ChevronLeft, Swords, ClipboardPaste } from 'lucide-react';

export default function BattleQuestionSelector({ classData, onConfirm, onCancel, opponent, hideSendButton, confirmLabel }) {
  const [mode, setMode] = useState('bank'); // 'bank' | 'manual' | 'paste'
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [search, setSearch] = useState('');
  const [manualQ, setManualQ] = useState({ question_text: '', options: ['', '', '', ''], correct_index: 0 });
  const [pasteText, setPasteText] = useState('');
  const [pasteError, setPasteError] = useState('');

  const subjectId = classData?.subject_id;

  const { data: topics = [] } = useQuery({
    queryKey: ['topics', subjectId],
    queryFn: () => base44.entities.Topic.filter({ subject_id: subjectId }),
    enabled: !!subjectId,
  });

  const topicIds = topics.map(t => t.id);

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ['battleQuestionBank', subjectId, topicIds.join(',')],
    queryFn: async () => {
      let qs;
      if (topicIds.length > 0) {
        qs = await base44.entities.Question.filter({
          topic_id: { $in: topicIds },
          question_type: 'multiple_choice',
          is_active: true,
        }, null, 200);
      } else {
        // Fallback: load all multiple choice questions
        qs = await base44.entities.Question.filter({
          question_type: 'multiple_choice',
          is_active: true,
        }, null, 200);
      }
      console.log('Questions loaded:', qs);
      return qs;
    },
    enabled: true, // always run, fallback handles no topics
  });

  // Parse bulk paste text
  const parsePastedQuestions = () => {
    setPasteError('');
    const blocks = pasteText.trim().split(/\n{2,}/);
    const parsed = [];
    for (const block of blocks) {
      const lines = block.trim().split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 6) continue;
      const questionLine = lines.find(l => l.toLowerCase().startsWith('question:'));
      const aLine = lines.find(l => /^a:/i.test(l));
      const bLine = lines.find(l => /^b:/i.test(l));
      const cLine = lines.find(l => /^c:/i.test(l));
      const dLine = lines.find(l => /^d:/i.test(l));
      const answerLine = lines.find(l => l.toLowerCase().startsWith('answer:'));
      if (!questionLine || !aLine || !bLine || !cLine || !dLine || !answerLine) continue;
      const questionText = questionLine.replace(/^question:\s*/i, '').trim();
      const options = [
        aLine.replace(/^a:\s*/i, '').trim(),
        bLine.replace(/^b:\s*/i, '').trim(),
        cLine.replace(/^c:\s*/i, '').trim(),
        dLine.replace(/^d:\s*/i, '').trim(),
      ];
      const answerLetter = answerLine.replace(/^answer:\s*/i, '').trim().toUpperCase();
      const correctIndex = ['A', 'B', 'C', 'D'].indexOf(answerLetter);
      if (correctIndex === -1 || options.some(o => !o)) continue;
      parsed.push({ id: `paste_${Date.now()}_${parsed.length}`, question_text: questionText, options, correct_index: correctIndex });
    }
    if (parsed.length === 0) {
      setPasteError('No valid questions found. Check the format:\nQuestion: ...\nA: ...\nB: ...\nC: ...\nD: ...\nAnswer: B');
      return;
    }
    const toAdd = parsed.slice(0, 10 - selectedQuestions.length);
    setSelectedQuestions(prev => [...prev, ...toAdd]);
    setPasteText('');
    setMode('bank');
  };

  const filtered = questions.filter(q =>
    !search || q.question_text?.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (q) => {
    setSelectedQuestions(prev =>
      prev.find(x => x.id === q.id)
        ? prev.filter(x => x.id !== q.id)
        : prev.length >= 10 ? prev : [...prev, q]
    );
  };

  const addManual = () => {
    if (!manualQ.question_text.trim() || manualQ.options.some(o => !o.trim())) return;
    setSelectedQuestions(prev => [...prev, { ...manualQ, id: `manual_${Date.now()}` }]);
    setManualQ({ question_text: '', options: ['', '', '', ''], correct_index: 0 });
    setMode('bank');
  };

  const handleSend = () => {
    if (selectedQuestions.length < 1) return;
    // Normalise question format
    const normalised = selectedQuestions.map(q => ({
      question_text: q.question_text,
      options: q.options || [],
      correct_index: q.correct_index ?? 0,
    }));
    onConfirm(normalised);
  };

  return (
    <div className="fixed inset-0 z-[990] bg-slate-950/95 backdrop-blur-xl flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-5 pb-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="text-slate-400 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-white font-black text-lg">Challenge {opponent?.full_name || opponent?.email?.split('@')[0]}</h2>
            <p className="text-slate-400 text-xs">Select questions for the battle ({selectedQuestions.length}/10)</p>
          </div>
        </div>
        <motion.button
          onClick={handleSend}
          disabled={selectedQuestions.length === 0}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm transition-all ${
            selectedQuestions.length > 0
              ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/30 hover:brightness-110'
              : 'bg-white/5 text-slate-600 cursor-not-allowed'
          }`}
          whileTap={selectedQuestions.length > 0 ? { scale: 0.95 } : {}}>
          {hideSendButton ? null : <Swords className="w-4 h-4" />}
          {confirmLabel || 'Send Challenge'}
        </motion.button>
      </div>

      {/* Mode tabs */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 flex gap-2 flex-wrap">
        <button onClick={() => setMode('bank')}
          className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${mode === 'bank' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}>
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

      {/* Selected preview bar */}
      {selectedQuestions.length > 0 && (
        <div className="flex-shrink-0 px-4 pb-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {selectedQuestions.map((q, i) => (
              <div key={q.id} className="flex-shrink-0 flex items-center gap-2 bg-purple-500/20 border border-purple-500/40 rounded-xl px-3 py-1.5">
                <span className="text-purple-300 text-xs font-bold">Q{i + 1}</span>
                <span className="text-white text-xs max-w-[120px] truncate">{q.question_text}</span>
                <button onClick={() => toggle(q)} className="text-slate-500 hover:text-red-400 transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        <AnimatePresence mode="wait">
          {mode === 'bank' && (
            <motion.div key="bank" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
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
                  <p className="text-slate-500">No questions found for this subject.</p>
                  <button onClick={() => setMode('manual')} className="mt-3 text-blue-400 text-sm hover:underline">
                    Create one manually →
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map(q => {
                    const isSelected = !!selectedQuestions.find(x => x.id === q.id);
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
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                q.difficulty === 'easy' ? 'bg-emerald-500/20 text-emerald-400' :
                                q.difficulty === 'hard' ? 'bg-red-500/20 text-red-400' :
                                'bg-amber-500/20 text-amber-400'
                              }`}>{q.difficulty}</span>
                              <span className="text-slate-500 text-xs">{q.options?.length} options</span>
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

          {mode === 'paste' && (
            <motion.div key="paste" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="space-y-4">
              <div>
                <label className="text-slate-300 text-sm font-bold mb-2 block">Paste Multiple Questions</label>
                <p className="text-slate-500 text-xs mb-3">Each question block separated by a blank line. Format:</p>
                <pre className="text-xs text-slate-400 bg-white/5 rounded-xl px-4 py-3 mb-3 font-mono">
{`Question: What is 2+2?
A: 3
B: 4
C: 5
D: 6
Answer: B`}
                </pre>
                <textarea
                  value={pasteText}
                  onChange={e => { setPasteText(e.target.value); setPasteError(''); }}
                  placeholder="Paste your questions here..."
                  rows={12}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 resize-none font-mono"
                />
                {pasteError && (
                  <p className="text-red-400 text-xs mt-2 whitespace-pre-line">{pasteError}</p>
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