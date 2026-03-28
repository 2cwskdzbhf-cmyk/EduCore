import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X, Check, Sparkles, ChevronRight, ArrowLeft, BookOpen, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ── Screen: browse by Subject → Topic → Subtopic → Questions ──────────────
export default function GlobalQuestionBankDialog({ open, onClose, onAddQuestions }) {
  const [screen, setScreen] = useState('subjects'); // subjects | topics | subtopics | questions
  const [subject, setSubject] = useState(null);
  const [topic, setTopic] = useState(null);   // parent GlobalTopic (e.g. Algebra)
  const [subtopic, setSubtopic] = useState(null); // child GlobalTopic
  const [yearGroup, setYearGroup] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [questionType, setQuestionType] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);

  // Reset on open
  useEffect(() => {
    if (open) { setScreen('subjects'); setSubject(null); setTopic(null); setSubtopic(null); setSelected([]); setSearch(''); setQuestionType('all'); }
  }, [open]);

  // Subjects (static — just Maths for now, but extensible)
  const { data: subjects = [], isLoading: loadingSubjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => base44.entities.Subject.list(),
    enabled: open
  });

  // Top-level GlobalTopics for selected subject (no parent_topic_id)
  const { data: topics = [], isLoading: loadingTopics } = useQuery({
    queryKey: ['globalTopicsTop', subject?.id],
    queryFn: async () => {
      const all = await base44.entities.GlobalTopic.filter({ subject_id: subject.id });
      return all.filter(t => !t.parent_topic_id).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    },
    enabled: open && !!subject?.id
  });

  // Sub-topics of the selected parent topic
  const { data: subtopics = [], isLoading: loadingSubtopics } = useQuery({
    queryKey: ['globalSubtopics', topic?.id],
    queryFn: async () => {
      const all = await base44.entities.GlobalTopic.filter({ parent_topic_id: topic.id });
      return all.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    },
    enabled: open && !!topic?.id
  });

  // Questions for the selected subtopic (or topic if no subtopics)
  const { data: questions = [], isLoading: loadingQuestions } = useQuery({
    queryKey: ['globalQuestionsForSubtopic', subtopic?.id, topic?.id, yearGroup, difficulty],
    queryFn: async () => {
      const topicId = subtopic?.id || topic?.id;
      if (!topicId) return [];
      const filters = { global_topic_id: topicId };
      if (yearGroup !== 'all') filters.year_group = Number(yearGroup);
      if (difficulty !== 'all') filters.difficulty = difficulty;
      return base44.entities.GlobalQuestion.filter(filters, 'year_group', 500);
    },
    enabled: open && screen === 'questions' && (!!subtopic?.id || !!topic?.id)
  });

  const filtered = useMemo(() => {
    let result = questions;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(x => (x.question_text || '').toLowerCase().includes(q));
    }
    if (questionType !== 'all') {
      result = result.filter(x => {
        const qt = x.question_type || 'mcq';
        if (questionType === 'mcq') return qt === 'mcq' || qt === 'multiple_choice';
        if (questionType === 'true_false') return qt === 'true_false';
        if (questionType === 'written') return qt === 'short' || qt === 'short_answer' || qt === 'written' || qt === 'written_answer' || qt === 'numeric';
        return true;
      });
    }
    return result;
  }, [questions, search, questionType]);

  const toggle = (q) => setSelected(prev =>
    prev.find(x => x.id === q.id) ? prev.filter(x => x.id !== q.id) : [...prev, q]
  );
  const isSelected = (q) => !!selected.find(x => x.id === q.id);

  const handleApply = () => {
    if (!selected.length) { toast.error('Select at least one question'); return; }

    const mapped = selected.map(q => {
      // Support both old GlobalQuestion schema (choices) and new seeds (options)
      const rawChoices = Array.isArray(q.choices) && q.choices.length > 0 ? q.choices
        : Array.isArray(q.options) && q.options.length > 0 ? q.options : [];
      const isMCQ = (q.question_type === 'mcq' || q.question_type === 'multiple_choice') && rawChoices.length > 0;

      if (isMCQ) {
        const opts = rawChoices.length >= 4 ? rawChoices.slice(0, 4) : [...rawChoices, ...Array(4 - rawChoices.length).fill('—')];
        let correctIndex = typeof q.correct_index === 'number' ? q.correct_index : -1;
        if (correctIndex < 0 && q.correct_answer) {
          correctIndex = opts.findIndex(c => String(c).toLowerCase().trim() === String(q.correct_answer).toLowerCase().trim());
        }
        return {
          prompt: q.question_text || '',
          question_type: 'multiple_choice',
          options: opts,
          correct_index: Math.max(0, correctIndex),
          correct_answer: opts[Math.max(0, correctIndex)] || q.correct_answer || '',
          difficulty: q.difficulty || 'medium',
          explanation: q.explanation || '',
          tags: [],
          image_url: '',
          option_images: ['', '', '', ''],
          source_global_id: q.id,
          _isDraft: false
        };
      } else {
        return {
          prompt: q.question_text || '',
          question_type: 'short_answer',
          options: [q.correct_answer || '', '', '', ''],
          correct_index: 0,
          correct_answer: q.correct_answer || '',
          difficulty: q.difficulty || 'medium',
          explanation: q.explanation || '',
          tags: [],
          image_url: '',
          option_images: ['', '', '', ''],
          source_global_id: q.id,
          _isDraft: false
        };
      }
    });

    onAddQuestions?.(mapped);
    toast.success(`Added ${mapped.length} question${mapped.length !== 1 ? 's' : ''}`);
    onClose?.();
  };

  const diffBadge = { easy: 'bg-emerald-500/20 text-emerald-300', medium: 'bg-amber-500/20 text-amber-300', hard: 'bg-red-500/20 text-red-300' };

  const goBack = () => {
    if (screen === 'questions') { setScreen(subtopics.length > 0 ? 'subtopics' : 'topics'); setSubtopic(null); setSelected([]); }
    else if (screen === 'subtopics') { setScreen('topics'); setTopic(null); }
    else if (screen === 'topics') { setScreen('subjects'); setSubject(null); }
  };

  const breadcrumb = [
    subject?.name,
    topic?.name,
    subtopic?.name
  ].filter(Boolean).join(' › ');

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="max-w-3xl max-h-[92vh] p-0 gap-0 bg-slate-950/98 backdrop-blur-2xl border border-white/10 flex flex-col overflow-hidden rounded-2xl shadow-2xl shadow-purple-900/30">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            {screen !== 'subjects' && (
              <button onClick={goBack} className="text-slate-400 hover:text-white p-1 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">Global Question Bank</h2>
              {breadcrumb ? (
                <p className="text-xs text-purple-300">{breadcrumb}</p>
              ) : (
                <p className="text-xs text-slate-500">Select a subject to browse questions</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* SUBJECTS */}
          {screen === 'subjects' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-4">Choose a subject</p>
              {loadingSubjects ? <Spinner /> : subjects.map(s => (
                <NavCard key={s.id} icon={<BookOpen className="w-5 h-5 text-blue-400" />} title={s.name} subtitle="Browse topics" onClick={() => { setSubject(s); setScreen('topics'); }} />
              ))}
            </div>
          )}

          {/* TOPICS */}
          {screen === 'topics' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-4">Choose a topic</p>
              {loadingTopics ? <Spinner /> : topics.length === 0 ? (
                <p className="text-slate-500 text-sm">No topics found. Run the seed function from the Admin Panel first.</p>
              ) : topics.map(t => (
                <NavCard key={t.id} icon={<FolderOpen className="w-5 h-5 text-purple-400" />} title={t.name} subtitle={t.description || 'Browse subtopics'} onClick={() => { setTopic(t); setScreen('subtopics'); }} />
              ))}
            </div>
          )}

          {/* SUBTOPICS */}
          {screen === 'subtopics' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-4">Choose a subtopic</p>
              {loadingSubtopics ? <Spinner /> : subtopics.length === 0 ? (
                // No subtopics — go straight to questions under the topic
                <div className="text-center py-8">
                  <p className="text-slate-400 text-sm mb-4">No subtopics — click below to view all questions</p>
                  <Button onClick={() => setScreen('questions')} className="bg-gradient-to-r from-purple-500 to-blue-500">Browse All Questions</Button>
                </div>
              ) : subtopics.map(st => (
                <NavCard key={st.id} icon={<BookOpen className="w-5 h-5 text-emerald-400" />} title={st.name} subtitle={st.description || ''} onClick={() => { setSubtopic(st); setScreen('questions'); }} />
              ))}
            </div>
          )}

          {/* QUESTIONS */}
          {screen === 'questions' && (
            <div>
              {/* Filters */}
              <div className="flex gap-2 flex-wrap mb-4">
                <div className="relative flex-1 min-w-[160px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
                    className="pl-9 h-8 bg-white/5 border-white/10 text-white placeholder:text-slate-500 text-sm" />
                </div>
                <Select value={yearGroup} onValueChange={setYearGroup}>
                  <SelectTrigger className="w-28 h-8 bg-white/5 border-white/10 text-white text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {[7,8,9,10,11].map(y => <SelectItem key={y} value={String(y)}>Year {y}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger className="w-28 h-8 bg-white/5 border-white/10 text-white text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={questionType} onValueChange={setQuestionType}>
                  <SelectTrigger className="w-32 h-8 bg-white/5 border-white/10 text-white text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="mcq">Multiple Choice</SelectItem>
                    <SelectItem value="true_false">True / False</SelectItem>
                    <SelectItem value="written">Written Answer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Select all bar */}
              {filtered.length > 0 && (
                <div className="flex items-center justify-between mb-3 text-xs text-slate-500">
                  <span>{filtered.length} question{filtered.length !== 1 ? 's' : ''}</span>
                  <div className="flex gap-3">
                    <button onClick={() => setSelected(filtered)} className="hover:text-white transition-colors">Select all</button>
                    {selected.length > 0 && <button onClick={() => setSelected([])} className="hover:text-white transition-colors">Clear ({selected.length})</button>}
                  </div>
                </div>
              )}

              {/* Question list */}
              {loadingQuestions ? <Spinner /> : filtered.length === 0 ? (
                <div className="text-center py-12 text-slate-500">No questions found</div>
              ) : (
                <div className="space-y-2">
                  {filtered.map(q => {
                    // Support both choices (old schema) and options (new seeds)
                    const displayChoices = Array.isArray(q.choices) && q.choices.length > 0 ? q.choices
                      : Array.isArray(q.options) && q.options.length > 0 ? q.options : [];
                    const sel = isSelected(q);
                    const typeLabel = q.question_type === 'mcq' ? 'MCQ'
                      : q.question_type === 'multiple_choice' ? 'MCQ'
                      : q.question_type === 'numeric' ? 'Numeric'
                      : q.question_type === 'short' ? 'Short'
                      : q.question_type?.replace('_', ' ') || 'MCQ';
                    return (
                      <button key={q.id} onClick={() => toggle(q)}
                        className={cn(
                          "w-full text-left rounded-xl border p-4 transition-all duration-150 group",
                          sel ? "bg-purple-500/15 border-purple-500/50 ring-1 ring-purple-500/30" : "bg-white/[0.03] border-white/[0.07] hover:bg-white/[0.07] hover:border-white/20"
                        )}>
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          <div className={cn(
                            "w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all",
                            sel ? "bg-purple-500 border-purple-500" : "border-white/20 group-hover:border-white/40"
                          )}>
                            {sel && <Check className="w-3 h-3 text-white" />}
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Badges */}
                            <div className="flex flex-wrap gap-1.5 mb-1.5">
                              {q.year_group && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">Y{q.year_group}</span>}
                              {q.difficulty && <span className={cn("text-xs px-2 py-0.5 rounded-full", diffBadge[q.difficulty] || diffBadge.medium)}>{q.difficulty}</span>}
                              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-400">{typeLabel}</span>
                            </div>

                            {/* Question */}
                            <p className="text-white text-sm font-medium leading-snug mb-2">{q.question_text}</p>

                            {/* Answer choices */}
                            {displayChoices.length > 0 ? (
                              <div className="grid grid-cols-2 gap-1.5">
                                {displayChoices.map((c, ci) => {
                                  const isCorrect = ci === q.correct_index || String(c).toLowerCase().trim() === String(q.correct_answer).toLowerCase().trim();
                                  return (
                                    <div key={ci} className={cn("text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5",
                                      isCorrect ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-white/5 text-slate-400 border border-white/5"
                                    )}>
                                      <span className="font-bold text-slate-500 flex-shrink-0">{String.fromCharCode(65+ci)}.</span>
                                      <span className="truncate">{c}</span>
                                      {isCorrect && <Check className="w-3 h-3 ml-auto flex-shrink-0" />}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              // Short/numeric/written answer
                              <div className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 inline-flex items-center gap-1.5">
                                <Check className="w-3 h-3" /> Answer: {q.correct_answer}
                              </div>
                            )}

                            {/* Explanation */}
                            {q.explanation && (
                              <p className="text-xs text-slate-500 mt-2 italic">💡 {q.explanation}</p>
                            )}
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