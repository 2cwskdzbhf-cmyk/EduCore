import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DIFFICULTIES = ['easy', 'medium', 'hard'];
const QUESTION_COUNTS = [5, 10, 15];

export default function BattleQuestionSelector({
  classData,
  opponent,
  onCancel,
  onConfirm,
  hideSendButton,
  confirmLabel,
}) {
  const [step, setStep] = useState(1); // 1=topic, 2=subtopic, 3=difficulty, 4=questions
  const [topics, setTopics] = useState([]);
  const [subtopics, setSubtopics] = useState([]);
  const [allQuestions, setAllQuestions] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [selectedSubtopic, setSelectedSubtopic] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState('medium');
  const [selectedCount, setSelectedCount] = useState(5);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [noTopics, setNoTopics] = useState(false);

  const subjectId = classData?.subject_id;

  // Step 1: load top-level GlobalTopics for this subject
  useEffect(() => {
    if (!subjectId) return;
    setLoading(true);
    base44.entities.GlobalTopic.filter({ subject_id: subjectId })
      .then(all => {
        const topLevel = all.filter(t => !t.parent_topic_id);
        if (topLevel.length === 0) {
          setNoTopics(true);
          setStep(3); // skip to difficulty
        } else {
          setTopics(topLevel);
        }
      })
      .finally(() => setLoading(false));
  }, [subjectId]);

  // Step 2: load subtopics when topic selected
  useEffect(() => {
    if (!selectedTopic) return;
    setLoading(true);
    base44.entities.GlobalTopic.filter({ subject_id: subjectId })
      .then(all => {
        const subs = all.filter(t => t.parent_topic_id === selectedTopic.id);
        if (subs.length === 0) {
          // No subtopics — skip to difficulty
          setSelectedSubtopic(null);
          setStep(3);
        } else {
          setSubtopics(subs);
          setStep(2);
        }
      })
      .finally(() => setLoading(false));
  }, [selectedTopic]);

  // Step 4: load questions
  useEffect(() => {
    if (step !== 4) return;
    setLoading(true);

    const filter = { question_type: 'mcq', difficulty: selectedDifficulty };
    if (subjectId) filter.subject_id = subjectId;
    if (selectedSubtopic) filter.global_topic_id = selectedSubtopic.id;
    else if (selectedTopic) filter.global_topic_id = selectedTopic.id;

    base44.entities.GlobalQuestion.filter(filter)
      .then(qs => {
        // If no questions with topic filter, fall back to subject-only
        if (qs.length === 0 && (selectedSubtopic || selectedTopic)) {
          return base44.entities.GlobalQuestion.filter({ question_type: 'mcq', difficulty: selectedDifficulty, subject_id: subjectId });
        }
        return qs;
      })
      .then(qs => {
        // Normalise choices -> options
        const normalised = qs.map(q => ({
          ...q,
          options: q.choices || q.options || [],
          question_text: q.question_text,
          correct_index: q.correct_index,
          correct_answer: q.correct_answer,
        }));
        setAllQuestions(normalised);
        // Auto-select up to selectedCount
        const shuffled = [...normalised].sort(() => Math.random() - 0.5);
        setSelectedQuestions(shuffled.slice(0, selectedCount));
      })
      .finally(() => setLoading(false));
  }, [step]);

  const toggleQuestion = (q) => {
    setSelectedQuestions(prev =>
      prev.find(x => x.id === q.id)
        ? prev.filter(x => x.id !== q.id)
        : [...prev, q]
    );
  };

  const handleConfirm = () => {
    if (selectedQuestions.length === 0) return;
    onConfirm(selectedQuestions);
  };

  return (
    <div className="fixed inset-0 z-[980] bg-slate-950/98 backdrop-blur-xl flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-5 pb-4 border-b border-white/10 flex items-center gap-3">
        <button
          onClick={step === 1 || noTopics ? onCancel : () => setStep(s => s - 1)}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-white font-black text-xl">
            {opponent ? `⚔️ Challenge ${opponent.full_name || opponent.email.split('@')[0]}` : '⚔️ Select Questions'}
          </h2>
          <p className="text-slate-400 text-xs">
            {step === 1 && 'Step 1 — Pick a topic'}
            {step === 2 && 'Step 2 — Pick a subtopic'}
            {step === 3 && 'Step 3 — Pick difficulty & count'}
            {step === 4 && `Step 4 — Review questions (${selectedQuestions.length} selected)`}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        )}

        {/* Step 1: Topics */}
        {!loading && step === 1 && (
          <div className="space-y-2">
            {topics.map(t => (
              <button key={t.id} onClick={() => setSelectedTopic(t)}
                className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-purple-500/40 transition-all text-left">
                <span className="text-white font-bold">{t.name}</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Subtopics */}
        {!loading && step === 2 && (
          <div className="space-y-2">
            <button onClick={() => setStep(3)}
              className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-left mb-4">
              <span className="text-slate-400 italic text-sm">All subtopics</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
            {subtopics.map(t => (
              <button key={t.id} onClick={() => { setSelectedSubtopic(t); setStep(3); }}
                className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-purple-500/40 transition-all text-left">
                <span className="text-white font-bold">{t.name}</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            ))}
          </div>
        )}

        {/* Step 3: Difficulty + Count */}
        {!loading && step === 3 && (
          <div className="space-y-6">
            <div>
              <p className="text-slate-400 text-sm font-semibold mb-3">Difficulty</p>
              <div className="flex gap-3">
                {DIFFICULTIES.map(d => (
                  <button key={d} onClick={() => setSelectedDifficulty(d)}
                    className={`flex-1 py-3 rounded-2xl font-bold text-sm capitalize transition-all border-2 ${
                      selectedDifficulty === d
                        ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                        : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                    }`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-slate-400 text-sm font-semibold mb-3">Number of Questions</p>
              <div className="flex gap-3">
                {QUESTION_COUNTS.map(c => (
                  <button key={c} onClick={() => setSelectedCount(c)}
                    className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-all border-2 ${
                      selectedCount === c
                        ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                        : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                    }`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={() => setStep(4)}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 font-black text-base py-6">
              Load Questions <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </div>
        )}

        {/* Step 4: Question list */}
        {!loading && step === 4 && (
          <div className="space-y-3">
            {allQuestions.length === 0 && (
              <p className="text-slate-400 text-center py-12">No questions found. Try a different difficulty or topic.</p>
            )}
            {allQuestions.map(q => {
              const isSelected = !!selectedQuestions.find(x => x.id === q.id);
              return (
                <button key={q.id} onClick={() => toggleQuestion(q)}
                  className={`w-full text-left px-4 py-4 rounded-2xl border-2 transition-all ${
                    isSelected
                      ? 'border-emerald-500/60 bg-emerald-500/10'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border-2 ${
                      isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-white/20'
                    }`}>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{q.question_text}</p>
                      {q.options?.length > 0 && (
                        <p className="text-slate-500 text-xs mt-1">{q.options.length} options · ✅ {q.options[q.correct_index]}</p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {step === 4 && !loading && (
        <div className="flex-shrink-0 p-4 border-t border-white/10">
          <Button
            onClick={handleConfirm}
            disabled={selectedQuestions.length === 0}
            className="w-full bg-gradient-to-r from-red-500 to-orange-500 font-black text-base py-6 disabled:opacity-40">
            {confirmLabel || `⚔️ Send Challenge (${selectedQuestions.length} questions)`}
          </Button>
        </div>
      )}
    </div>
  );
}