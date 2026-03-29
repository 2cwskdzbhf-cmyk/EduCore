import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, X, Check, Sparkles, ChevronRight, ArrowLeft, BookOpen, FolderOpen, Calendar, BarChart2, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Flow: subjects → topics → subtopics → yeargroup (multi) → difficulty (multi) → questiontype (multi) → questions

const YEAR_GROUPS = [7, 8, 9, 10, 11];
const DIFFICULTIES = [
  { value: 'easy', label: 'Easy', color: 'from-emerald-500 to-teal-500', ringColor: 'ring-emerald-500', desc: 'Foundation level' },
  { value: 'medium', label: 'Medium', color: 'from-amber-500 to-orange-500', ringColor: 'ring-amber-500', desc: 'Intermediate level' },
  { value: 'hard', label: 'Hard', color: 'from-red-500 to-pink-500', ringColor: 'ring-red-500', desc: 'Higher level' },
];
const QUESTION_TYPES = [
  { value: 'mcq', label: 'Multiple Choice', icon: '🔘', desc: 'Select the correct answer from options' },
  { value: 'true_false', label: 'True / False', icon: '✅', desc: 'Decide if a statement is true or false' },
  { value: 'written', label: 'Written Answer', icon: '✏️', desc: 'Short answer or numeric response' },
];

function matchesType(q, typeValue) {
  const qt = q.question_type || 'mcq';
  if (typeValue === 'mcq') return qt === 'mcq' || qt === 'multiple_choice';
  if (typeValue === 'true_false') return qt === 'true_false';
  if (typeValue === 'written') return qt === 'short' || qt === 'short_answer' || qt === 'written' || qt === 'written_answer' || qt === 'numeric';
  return false;
}

export default function GlobalQuestionBankDialog({ open, onClose, onAddQuestions, classSubjectId, classYearGroup }) {
  const [screen, setScreen] = useState('subjects');
  const [subject, setSubject] = useState(null);
  const [topic, setTopic] = useState(null);
  const [subtopic, setSubtopic] = useState(null);
  // Multi-select arrays — yearGroups auto-set from class
  const [yearGroups, setYearGroups] = useState([]);
  const [difficulties, setDifficulties] = useState([]);
  const [questionTypes, setQuestionTypes] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    if (open) {
      if (classSubjectId) {
        // Auto-navigate to topics if class has a subject
        setSubject({ id: classSubjectId });
        // Auto-set year groups from class
        if (classYearGroup) {
          setYearGroups([String(classYearGroup)]);
        }
        // Always start with topics
        setScreen('topics');
      } else {
        setScreen('subjects');
        setSubject(null);
      }
      setTopic(null); setSubtopic(null);
      setDifficulties([]); setQuestionTypes([]);
      setSelected([]); setSearch('');
    }
  }, [open, classSubjectId, classYearGroup]);

  const toggleItem = (setter, value) => setter(prev =>
    prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
  );

  const { data: subjects = [], isLoading: loadingSubjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => base44.entities.Subject.list(),
    enabled: open && !classSubjectId,
  });

  const { data: topics = [], isLoading: loadingTopics } = useQuery({
    queryKey: ['globalTopicsTop', subject?.id || classSubjectId],
    queryFn: async () => {
      const subId = subject?.id || classSubjectId;
      const all = await base44.entities.GlobalTopic.filter({ subject_id: subId });
      return all.filter(t => !t.parent_topic_id).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    },
    enabled: open && (!!subject?.id || !!classSubjectId),
  });

  const { data: subtopics = [], isLoading: loadingSubtopics } = useQuery({
    queryKey: ['globalSubtopics', topic?.id],
    queryFn: async () => {
      const all = await base44.entities.GlobalTopic.filter({ parent_topic_id: topic.id });
      return all.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    },
    enabled: open && !!topic?.id,
  });

  // Fetch all questions for the topic/subtopic, then filter client-side for multi-select
  const topicId = subtopic?.id || topic?.id;
  const { data: allQuestions = [], isLoading: loadingQuestions } = useQuery({
    queryKey: ['globalQuestionsForTopic', topicId],
    queryFn: () => base44.entities.GlobalQuestion.filter({ global_topic_id: topicId }, 'year_group', 1000),
    enabled: open && screen === 'questions' && !!topicId,
  });

  const filtered = useMemo(() => {
    let result = allQuestions;

    // Filter by selected year groups
    if (yearGroups.length > 0) {
      result = result.filter(q => yearGroups.includes(String(q.year_group)));
    }

    // Filter by selected difficulties
    if (difficulties.length > 0) {
      result = result.filter(q => difficulties.includes(q.difficulty));
    }

    // Filter by selected question types
    if (questionTypes.length > 0) {
      result = result.filter(q => questionTypes.some(t => matchesType(q, t)));
    }

    // Search
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(q => (q.question_text || '').toLowerCase().includes(s));
    }

    return result;
  }, [allQuestions, yearGroups, difficulties, questionTypes, search]);

  const toggle = (q) => setSelected(prev =>
    prev.find(x => x.id === q.id) ? prev.filter(x => x.id !== q.id) : [...prev, q]
  );
  const isSelected = (q) => !!selected.find(x => x.id === q.id);

  // Generate answer keyword variations (lowercase, uppercase, no spaces, trimmed)
  const generateAnswerVariations = (answer) => {
    if (!answer) return [''];
    const base = String(answer).trim();
    const variations = new Set();
    variations.add(base);
    variations.add(base.toLowerCase());
    variations.add(base.toUpperCase());
    // No spaces variant
    variations.add(base.replace(/\s+/g, ''));
    variations.add(base.toLowerCase().replace(/\s+/g, ''));
    // Normalize spaces (single space)
    variations.add(base.replace(/\s+/g, ' ').trim());
    return [...variations].filter(Boolean);
  };

  const handleApply = () => {
    if (!selected.length) { toast.error('Select at least one question'); return; }
    const mapped = selected.map(q => {
      const origType = q.question_type || 'mcq';
      const rawChoices = Array.isArray(q.choices) && q.choices.length > 0 ? q.choices
        : Array.isArray(q.options) && q.options.length > 0 ? q.options : [];
      const isMCQ = (origType === 'mcq' || origType === 'multiple_choice');
      const isTF = origType === 'true_false' || origType === 'tf';

      if (isTF) {
        return { prompt: q.question_text || '', question_type: 'true_false', options: ['True', 'False'], correct_index: String(q.correct_answer).toLowerCase() === 'true' ? 0 : 1, correct_answer: q.correct_answer || 'True', difficulty: q.difficulty || 'medium', explanation: q.explanation || '', tags: [], image_url: '', option_images: ['', ''], source_global_id: q.id, _isDraft: false };
      }

      if (isMCQ) {
        // Build a clean list of real choices (no placeholders)
        const realChoices = rawChoices.filter(c => c && String(c).trim() && String(c).trim() !== '—');

        // Identify correct answer
        const correctAnswer = String(q.correct_answer || '').trim();

        // Separate correct from wrong answers
        const wrongChoices = realChoices.filter(c =>
          String(c).toLowerCase().trim() !== correctAnswer.toLowerCase()
        );

        // Shuffle wrong answers and pick up to 3
        const shuffledWrong = [...wrongChoices].sort(() => Math.random() - 0.5).slice(0, 3);

        // Build final 4 options: correct + 3 wrong, then shuffle positions
        const finalOptions = [correctAnswer, ...shuffledWrong].sort(() => Math.random() - 0.5);

        // Pad to 4 if somehow we have fewer
        while (finalOptions.length < 4) finalOptions.push('');

        const correctIndex = finalOptions.findIndex(
          c => String(c).toLowerCase().trim() === correctAnswer.toLowerCase()
        );

        return {
          prompt: q.question_text || '',
          question_type: 'multiple_choice',
          options: finalOptions.slice(0, 4),
          correct_index: Math.max(0, correctIndex),
          correct_answer: correctAnswer,
          difficulty: q.difficulty || 'medium',
          explanation: q.explanation || '',
          tags: [],
          image_url: '',
          option_images: ['', '', '', ''],
          source_global_id: q.id,
          _isDraft: false
        };
      }

      // Written / short answer — generate keyword variations
      const correctAnswer = String(q.correct_answer || '').trim();
      const answerKeywords = generateAnswerVariations(correctAnswer);

      return {
        prompt: q.question_text || '',
        question_type: 'short_answer',
        correct_answer: correctAnswer,
        answer_keywords: answerKeywords,
        options: [],
        correct_index: 0,
        difficulty: q.difficulty || 'medium',
        explanation: q.explanation || '',
        tags: [],
        image_url: '',
        option_images: [],
        source_global_id: q.id,
        _isDraft: false
      };
    });
    onAddQuestions?.(mapped);
    toast.success(`Added ${mapped.length} question${mapped.length !== 1 ? 's' : ''}`);
    onClose?.();
  };

  const diffBadge = { easy: 'bg-emerald-500/20 text-emerald-300', medium: 'bg-amber-500/20 text-amber-300', hard: 'bg-red-500/20 text-red-300' };

  const goBack = () => {
    if (screen === 'questions') { setScreen('questiontype'); setSelected([]); }
    else if (screen === 'questiontype') { setScreen('difficulty'); }
    else if (screen === 'difficulty') { setScreen(subtopics.length > 0 ? 'subtopics' : 'topics'); }
    else if (screen === 'subtopics') { setScreen('topics'); setSubtopic(null); }
    else if (screen === 'topics') { 
      if (classSubjectId) {
        onClose?.();
      } else {
        setScreen('subjects'); 
        setSubject(null);
      }
    }
  };

  const breadcrumbParts = [
    subject?.name,
    topic?.name,
    subtopic?.name,
    yearGroups.length > 0 ? yearGroups.map(y => `Y${y}`).join(', ') : null,
    difficulties.length > 0 ? difficulties.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ') : null,
    questionTypes.length > 0 ? questionTypes.map(t => QUESTION_TYPES.find(qt => qt.value === t)?.label).join(', ') : null,
  ].filter(Boolean);

  const SCREENS = ['subjects','topics','subtopics','yeargroup','difficulty','questiontype','questions'];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="max-w-3xl max-h-[92vh] p-0 gap-0 bg-slate-950/98 backdrop-blur-2xl border border-white/10 flex flex-col overflow-hidden rounded-2xl shadow-2xl shadow-purple-900/30">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {screen !== 'subjects' && (
              <button onClick={goBack} className="text-slate-400 hover:text-white p-1 transition-colors flex-shrink-0">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-white leading-tight">Global Question Bank</h2>
              {breadcrumbParts.length > 0 ? (
                <p className="text-xs text-purple-300 truncate">{breadcrumbParts.join(' › ')}</p>
              ) : (
                <p className="text-xs text-slate-500">Select a subject to get started</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 ml-3 flex-shrink-0">
            {SCREENS.map((s, i) => (
              <div key={s} className={cn('w-1.5 h-1.5 rounded-full transition-all',
                screen === s ? 'bg-purple-400 scale-125' : SCREENS.indexOf(screen) > i ? 'bg-purple-600' : 'bg-white/10'
              )} />
            ))}
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 transition-colors ml-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* SUBJECTS */}
          {screen === 'subjects' && !classSubjectId && (
            <div className="space-y-3">
              <StepLabel step={1} label="Choose a subject" hint="Single select" />
              {loadingSubjects ? <Spinner /> : subjects.map(s => (
                <NavCard key={s.id} icon={<BookOpen className="w-5 h-5 text-blue-400" />} title={s.name} subtitle="Browse topics →" onClick={() => { setSubject(s); setScreen('topics'); }} />
              ))}
            </div>
          )}

          {/* TOPICS */}
          {screen === 'topics' && (
            <div className="space-y-3">
              <StepLabel step={2} label="Choose a topic" hint="Single select" />
              {loadingTopics ? <Spinner /> : topics.length === 0 ? (
                <p className="text-slate-500 text-sm">No topics found. Run the seed function from the Admin Panel first.</p>
              ) : topics.map(t => (
                <NavCard key={t.id} icon={<FolderOpen className="w-5 h-5 text-purple-400" />} title={t.name} subtitle={t.description || 'Browse subtopics →'} onClick={() => { setTopic(t); setScreen('subtopics'); }} />
              ))}
            </div>
          )}

          {/* SUBTOPICS */}
          {screen === 'subtopics' && (
            <div className="space-y-3">
              <StepLabel step={3} label="Choose a subtopic" hint="Single select" />
              {loadingSubtopics ? <Spinner /> : subtopics.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-400 text-sm mb-4">No subtopics — continue with all questions in this topic</p>
                  <Button onClick={() => setScreen('yeargroup')} className="bg-gradient-to-r from-purple-500 to-blue-500">Continue</Button>
                </div>
              ) : subtopics.map(st => (
                <NavCard key={st.id} icon={<BookOpen className="w-5 h-5 text-emerald-400" />} title={st.name} subtitle={st.description || ''} onClick={() => { setSubtopic(st); setScreen('yeargroup'); }} />
              ))}
            </div>
          )}



          {/* DIFFICULTY — multi-select */}
          {screen === 'difficulty' && (
            <div>
              <StepLabel step={classYearGroup ? 4 : 5} label="Choose difficulty level(s)" hint="Select one or more" />
              <div className="grid grid-cols-3 gap-3 mt-4">
                {DIFFICULTIES.map(d => {
                  const active = difficulties.includes(d.value);
                  return (
                    <button
                      key={d.value}
                      onClick={() => toggleItem(setDifficulties, d.value)}
                      className={cn(
                        "flex flex-col items-center justify-center p-5 rounded-xl border transition-all group relative",
                        active ? `bg-white/10 border-white/30 ring-2 ${d.ringColor}/50` : "bg-white/[0.03] border-white/10 hover:bg-white/[0.08] hover:border-white/25"
                      )}
                    >
                      {active && <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>}
                      <div className={cn("w-11 h-11 rounded-full bg-gradient-to-br flex items-center justify-center mb-3 transition-transform", d.color, active ? "scale-110" : "group-hover:scale-110")}>
                        <BarChart2 className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-lg font-bold text-white">{d.label}</span>
                      <span className="text-xs text-slate-500 mt-1 text-center">{d.desc}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-6 flex items-center justify-between gap-3 pt-4 border-t border-white/10">
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <button onClick={() => setDifficulties(DIFFICULTIES.map(d => d.value))} className="hover:text-white transition-colors">Select all</button>
                  {difficulties.length > 0 && <button onClick={() => setDifficulties([])} className="hover:text-white transition-colors">Clear</button>}
                  {difficulties.length > 0 && <span className="text-purple-300">{difficulties.length} selected</span>}
                </div>
                <Button
                  onClick={() => setScreen('questiontype')}
                  disabled={difficulties.length === 0}
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 h-9 px-6"
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* QUESTION TYPE — multi-select */}
          {screen === 'questiontype' && (
            <div>
              <StepLabel step={6} label="Choose question type(s)" hint="Select one or more" />
              <div className="grid grid-cols-1 gap-3 mt-4">
                {QUESTION_TYPES.map(t => {
                  const active = questionTypes.includes(t.value);
                  return (
                    <button
                      key={t.value}
                      onClick={() => toggleItem(setQuestionTypes, t.value)}
                      className={cn(
                        "flex items-center gap-4 p-5 rounded-xl border transition-all group text-left relative",
                        active ? "bg-purple-500/15 border-purple-500/50 ring-1 ring-purple-500/30" : "bg-white/[0.03] border-white/10 hover:bg-purple-500/10 hover:border-purple-500/30"
                      )}
                    >
                      {active && <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>}
                      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 transition-colors", active ? "bg-purple-500/20" : "bg-white/5 group-hover:bg-white/10")}>
                        {t.icon}
                      </div>
                      <div>
                        <p className="text-white font-semibold text-base">{t.label}</p>
                        <p className="text-slate-500 text-sm">{t.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <MultiSelectFooter
                count={questionTypes.length}
                label="type"
                onNext={() => setScreen('questions')}
                onSelectAll={() => setQuestionTypes(QUESTION_TYPES.map(t => t.value))}
                onClear={() => setQuestionTypes([])}
              />
            </div>
          )}

          {/* QUESTIONS */}
          {screen === 'questions' && (
            <div>
              {/* Active filter summary */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {yearGroups.map(y => <span key={y} className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">Y{y}</span>)}
                {difficulties.map(d => <span key={d} className={cn("text-xs px-2 py-0.5 rounded-full", diffBadge[d])}>{d}</span>)}
                {questionTypes.map(t => <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">{QUESTION_TYPES.find(qt => qt.value === t)?.label}</span>)}
              </div>

              {/* Search bar */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input placeholder="Search questions…" value={search} onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-9 bg-white/5 border-white/10 text-white placeholder:text-slate-500 text-sm" />
              </div>

              {/* Select all bar */}
              {!loadingQuestions && filtered.length > 0 && (
                <div className="flex items-center justify-between mb-3 text-xs text-slate-500">
                  <span>{filtered.length} question{filtered.length !== 1 ? 's' : ''}</span>
                  <div className="flex gap-3">
                    <button onClick={() => setSelected(filtered)} className="hover:text-white transition-colors">Select all</button>
                    {selected.length > 0 && <button onClick={() => setSelected([])} className="hover:text-white transition-colors">Clear ({selected.length})</button>}
                  </div>
                </div>
              )}

              {loadingQuestions ? <Spinner /> : filtered.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <HelpCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No questions found for this combination</p>
                  <button onClick={goBack} className="mt-3 text-purple-400 text-sm hover:underline">← Go back and adjust filters</button>
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map(q => {
                    const displayChoices = Array.isArray(q.choices) && q.choices.length > 0 ? q.choices
                      : Array.isArray(q.options) && q.options.length > 0 ? q.options : [];
                    const sel = isSelected(q);
                    const typeLabel = (q.question_type === 'mcq' || q.question_type === 'multiple_choice') ? 'MCQ'
                      : q.question_type === 'numeric' ? 'Numeric'
                      : q.question_type === 'true_false' ? 'T/F'
                      : q.question_type === 'short' || q.question_type === 'short_answer' ? 'Short'
                      : q.question_type?.replace('_', ' ') || 'MCQ';
                    return (
                      <button key={q.id} onClick={() => toggle(q)}
                        className={cn("w-full text-left rounded-xl border p-4 transition-all duration-150 group",
                          sel ? "bg-purple-500/15 border-purple-500/50 ring-1 ring-purple-500/30" : "bg-white/[0.03] border-white/[0.07] hover:bg-white/[0.07] hover:border-white/20"
                        )}>
                        <div className="flex items-start gap-3">
                          <div className={cn("w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all",
                            sel ? "bg-purple-500 border-purple-500" : "border-white/20 group-hover:border-white/40")}>
                            {sel && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap gap-1.5 mb-1.5">
                              {q.year_group && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">Y{q.year_group}</span>}
                              {q.difficulty && <span className={cn("text-xs px-2 py-0.5 rounded-full", diffBadge[q.difficulty] || diffBadge.medium)}>{q.difficulty}</span>}
                              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-400">{typeLabel}</span>
                            </div>
                            <p className="text-white text-sm font-medium leading-snug mb-2">{q.question_text}</p>
                            {displayChoices.length > 0 ? (
                              <div className="grid grid-cols-2 gap-1.5">
                                {displayChoices.map((c, ci) => {
                                  const isCorrect = ci === q.correct_index || String(c).toLowerCase().trim() === String(q.correct_answer).toLowerCase().trim();
                                  return (
                                    <div key={ci} className={cn("text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5",
                                      isCorrect ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-white/5 text-slate-400 border border-white/5")}>
                                      <span className="font-bold text-slate-500 flex-shrink-0">{String.fromCharCode(65+ci)}.</span>
                                      <span className="truncate">{c}</span>
                                      {isCorrect && <Check className="w-3 h-3 ml-auto flex-shrink-0" />}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 inline-flex items-center gap-1.5">
                                <Check className="w-3 h-3" /> Answer: {q.correct_answer}
                              </div>
                            )}
                            {q.explanation && <p className="text-xs text-slate-500 mt-2 italic">💡 {q.explanation}</p>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer — only on questions screen */}
        {screen === 'questions' && (
          <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between gap-3 bg-slate-950/60 flex-shrink-0">
            <span className="text-sm text-slate-400">
              {selected.length > 0 ? <span className="text-purple-300 font-medium">{selected.length} selected</span> : 'Click to select questions'}
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white h-9">Cancel</Button>
              <Button onClick={handleApply} disabled={!selected.length}
                className="h-9 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 shadow-lg shadow-purple-500/20">
                Add {selected.length > 0 ? selected.length : ''} Questions
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MultiSelectFooter({ count, label, onNext, onSelectAll, onClear }) {
  return (
    <div className="mt-6 flex items-center justify-between gap-3 pt-4 border-t border-white/10">
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <button onClick={onSelectAll} className="hover:text-white transition-colors">Select all</button>
        {count > 0 && <button onClick={onClear} className="hover:text-white transition-colors">Clear</button>}
        {count > 0 && <span className="text-purple-300">{count} selected</span>}
      </div>
      <Button
        onClick={onNext}
        disabled={count === 0}
        className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 h-9 px-6"
      >
        Next <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
}

function StepLabel({ step, label, hint }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
        {step}
      </div>
      <p className="text-sm font-semibold text-white">{label}</p>
      {hint && <span className="text-xs text-slate-600 italic">{hint}</span>}
      <div className="flex-1 h-px bg-white/10" />
    </div>
  );
}

function NavCard({ icon, title, subtitle, onClick }) {
  return (
    <button onClick={onClick}
      className="w-full text-left flex items-center gap-4 p-4 rounded-xl border border-white/8 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/20 transition-all group">
      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 group-hover:bg-white/10 transition-colors">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium text-sm">{title}</p>
        {subtitle && <p className="text-slate-500 text-xs truncate">{subtitle}</p>}
      </div>
      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0" />
    </button>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12 gap-2 text-slate-500 text-sm">
      <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
      Loading…
    </div>
  );
}