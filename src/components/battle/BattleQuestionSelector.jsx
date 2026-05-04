import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Loader2, X, Check } from 'lucide-react';

// Step 1: Pick top-level topic
// Step 2: Pick subtopic
// Step 3: Pick difficulty
// Step 4: Pick questions

const DIFFICULTIES = ['easy', 'medium', 'hard'];

export default function BattleQuestionSelector({
  classData,
  opponent,
  onCancel,
  onConfirm,
  hideSendButton = false,
  confirmLabel = opponent ? `Challenge ${opponent.full_name || opponent.email?.split('@')[0]}` : 'Confirm Questions',
}) {
  const subjectId = classData?.subject_id;

  const [step, setStep] = useState(1);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [selectedSubtopic, setSelectedSubtopic] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);
  const [selectedQuestions, setSelectedQuestions] = useState([]);

  // Step 1: top-level topics
  const { data: topics = [], isLoading: loadingTopics } = useQuery({
    queryKey: ['globalTopics', subjectId],
    queryFn: async () => {
      const all = await base44.entities.GlobalTopic.filter({ subject_id: subjectId });
      return all.filter(t => !t.parent_topic_id);
    },
    enabled: !!subjectId,
  });

  // Step 2: subtopics of selected topic
  const { data: subtopics = [], isLoading: loadingSubtopics } = useQuery({
    queryKey: ['globalSubtopics', selectedTopic?.id],
    queryFn: () => base44.entities.GlobalTopic.filter({ parent_topic_id: selectedTopic.id }),
    enabled: !!selectedTopic?.id,
  });

  // Step 4: questions
  const { data: allQuestions = [], isLoading: loadingQuestions } = useQuery({
    queryKey: ['battleQuestions', selectedSubtopic?.id, selectedTopic?.id, selectedDifficulty],
    queryFn: async () => {
      const topicIdToUse = selectedSubtopic?.id || selectedTopic?.id;
      const filters = { global_topic_id: topicIdToUse, question_type: 'mcq' };
      if (selectedDifficulty) filters.difficulty = selectedDifficulty;
      const qs = await base44.entities.GlobalQuestion.filter(filters);
      // Normalise choices -> options
      return qs.map(q => ({
        ...q,
        options: q.choices || q.options || [],
      }));
    },
    enabled: !!selectedTopic && step === 4,
  });

  const toggleQuestion = (q) => {
    setSelectedQuestions(prev =>
      prev.find(x => x.id === q.id) ? prev.filter(x => x.id !== q.id) : [...prev, q]
    );
  };

  const selectAll = () => setSelectedQuestions([...allQuestions]);
  const clearAll = () => setSelectedQuestions([]);

  const handleConfirm = () => {
    if (selectedQuestions.length === 0) return;
    onConfirm(selectedQuestions);
  };

  // Step navigation helpers
  const goToStep2 = (topic) => { setSelectedTopic(topic); setSelectedSubtopic(null); setStep(2); };
  const goToStep3 = (subtopic) => {
    setSelectedSubtopic(subtopic);
    setStep(3);
  };
  const skipSubtopicStep = () => setStep(3); // if no subtopics
  const goToStep4 = (diff) => { setSelectedDifficulty(diff); setSelectedQuestions([]); setStep(4); };

  return (
    <div className="min-h-[400px] flex flex-col gap-4 p-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm flex-wrap">
        <button onClick={() => setStep(1)} className={`font-bold ${step >= 1 ? 'text-purple-400' : 'text-slate-500'}`}>Topic</button>
        <ChevronRight className="w-3 h-3 text-slate-600" />
        <button onClick={() => selectedTopic && setStep(2)} className={`font-bold ${step >= 2 ? 'text-purple-400' : 'text-slate-500'}`}>Subtopic</button>
        <ChevronRight className="w-3 h-3 text-slate-600" />
        <button onClick={() => selectedSubtopic && setStep(3)} className={`font-bold ${step >= 3 ? 'text-purple-400' : 'text-slate-500'}`}>Difficulty</button>
        <ChevronRight className="w-3 h-3 text-slate-600" />
        <span className={`font-bold ${step === 4 ? 'text-purple-400' : 'text-slate-500'}`}>Questions</span>
      </div>

      <AnimatePresence mode="wait">

        {/* STEP 1: Topics */}
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-2">
            <p className="text-white font-bold">Select a Topic</p>
            {loadingTopics ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-purple-400" /></div>
            ) : topics.length === 0 ? (
              <p className="text-slate-400 text-sm py-4">No topics found for this subject. Showing all questions instead.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {topics.map(t => (
                  <button key={t.id} onClick={() => goToStep2(t)}
                    className="p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-purple-500/20 hover:border-purple-500/50 text-white font-semibold text-sm transition-all text-left">
                    {t.name}
                  </button>
                ))}
              </div>
            )}
            {topics.length === 0 && (
              <button onClick={() => { setSelectedTopic(null); setStep(3); }}
                className="mt-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold text-sm">
                Continue →
              </button>
            )}
          </motion.div>
        )}

        {/* STEP 2: Subtopics */}
        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-2">
            <p className="text-white font-bold">Select a Subtopic <span className="text-slate-400 font-normal text-sm">in {selectedTopic?.name}</span></p>
            {loadingSubtopics ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-purple-400" /></div>
            ) : subtopics.length === 0 ? (
              <div className="space-y-2">
                <p className="text-slate-400 text-sm">No subtopics found. Using all questions from {selectedTopic?.name}.</p>
                <button onClick={skipSubtopicStep}
                  className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold text-sm">
                  Continue →
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <button onClick={skipSubtopicStep}
                  className="p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-blue-500/20 hover:border-blue-500/50 text-blue-300 font-semibold text-sm transition-all text-left italic">
                  All subtopics
                </button>
                {subtopics.map(s => (
                  <button key={s.id} onClick={() => goToStep3(s)}
                    className="p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-purple-500/20 hover:border-purple-500/50 text-white font-semibold text-sm transition-all text-left">
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* STEP 3: Difficulty */}
        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-2">
            <p className="text-white font-bold">Select Difficulty</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button onClick={() => goToStep4(null)}
                className="p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-blue-500/20 hover:border-blue-500/50 text-blue-300 font-bold text-sm transition-all">
                🎲 Mixed
              </button>
              {DIFFICULTIES.map(d => (
                <button key={d} onClick={() => goToStep4(d)}
                  className={`p-4 rounded-2xl border font-bold text-sm transition-all capitalize ${
                    d === 'easy' ? 'border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300' :
                    d === 'medium' ? 'border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300' :
                    'border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-300'
                  }`}>
                  {d === 'easy' ? '🟢' : d === 'medium' ? '🟡' : '🔴'} {d}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* STEP 4: Questions */}
        {step === 4 && (
          <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-white font-bold">Select Questions <span className="text-slate-400 font-normal text-sm">({selectedQuestions.length} selected)</span></p>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-xs text-purple-400 hover:text-purple-300 font-bold">Select all</button>
                <button onClick={clearAll} className="text-xs text-slate-500 hover:text-slate-400 font-bold">Clear</button>
              </div>
            </div>
            {loadingQuestions ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-purple-400" /></div>
            ) : allQuestions.length === 0 ? (
              <p className="text-slate-400 text-sm py-4">No MCQ questions found for this selection. Try a different difficulty or subtopic.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {allQuestions.map(q => {
                  const isSelected = !!selectedQuestions.find(x => x.id === q.id);
                  return (
                    <button key={q.id} onClick={() => toggleQuestion(q)}
                      className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                        isSelected
                          ? 'border-purple-500/70 bg-purple-500/20 text-white'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
                      }`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${isSelected ? 'border-purple-400 bg-purple-500' : 'border-slate-600'}`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-snug">{q.question_text}</p>
                          <div className="flex gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              q.difficulty === 'easy' ? 'bg-emerald-500/20 text-emerald-400' :
                              q.difficulty === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>{q.difficulty}</span>
                            {q.options?.length > 0 && <span className="text-xs text-slate-500">{q.options.length} options</span>}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {!hideSendButton && (
              <button
                onClick={handleConfirm}
                disabled={selectedQuestions.length === 0}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-black text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-all shadow-lg shadow-red-500/30">
                ⚔️ {confirmLabel} ({selectedQuestions.length} questions)
              </button>
            )}
            {hideSendButton && selectedQuestions.length > 0 && (
              <button
                onClick={handleConfirm}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-black text-sm hover:brightness-110 transition-all shadow-lg shadow-purple-500/30">
                {confirmLabel} ({selectedQuestions.length} questions)
              </button>
            )}
          </motion.div>
        )}

      </AnimatePresence>

      {/* Cancel */}
      <button onClick={onCancel} className="flex items-center gap-1 text-slate-500 hover:text-slate-300 text-sm mt-auto">
        <X className="w-4 h-4" /> Cancel
      </button>
    </div>
  );
}