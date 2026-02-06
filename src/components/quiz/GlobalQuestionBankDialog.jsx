import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen, Search, Filter, X, ArrowLeft,
  Database, FolderOpen, ChevronRight
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function GlobalQuestionBankDialog({ open, onClose, onAddQuestions, quizSetId }) {
  const queryClient = useQueryClient();

  const [screen, setScreen] = useState('subject'); // subject | topics | subtopics | filter | questions
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [selectedSubtopic, setSelectedSubtopic] = useState(null);

  const [selectedYearGroup, setSelectedYearGroup] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [lastApplyResult, setLastApplyResult] = useState(null);

  // Debug
  useEffect(() => {
    if (open) console.log('[GlobalBank] quizSetId:', quizSetId);
  }, [open, quizSetId]);

  const resetState = () => {
    setScreen('subject');
    setSelectedSubject(null);
    setSelectedTopic(null);
    setSelectedSubtopic(null);
    setSelectedYearGroup('all');
    setSelectedDifficulty('all');
    setSearchQuery('');
    setSelectedQuestions([]);
  };

  const close = () => {
    resetState();
    onClose?.();
  };

  // ✅ Fix: only close when user closes
  const onOpenChange = (nextOpen) => {
    if (!nextOpen) close();
  };

  const { data: subjects = [], isLoading: loadingSubjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => base44.entities.Subject.list('order', 100),
    enabled: open
  });

  const { data: topics = [], isLoading: loadingTopics } = useQuery({
    queryKey: ['topics', selectedSubject?.id],
    queryFn: () => base44.entities.Topic.filter({ subject_id: selectedSubject.id }),
    enabled: open && !!selectedSubject
  });

  const { data: subtopics = [], isLoading: loadingSubtopics } = useQuery({
    queryKey: ['subtopics', selectedTopic?.id],
    queryFn: () => base44.entities.Subtopic.filter({ topic_id: selectedTopic.id }),
    enabled: open && !!selectedTopic
  });

  const { data: questions = [], isLoading: loadingQuestions } = useQuery({
    queryKey: ['questions', selectedSubtopic?.id, selectedYearGroup, selectedDifficulty],
    queryFn: async () => {
      const filters = { subtopic_id: selectedSubtopic.id };
      if (selectedYearGroup !== 'all') filters.year_group = Number(selectedYearGroup);
      if (selectedDifficulty !== 'all') filters.difficulty = selectedDifficulty;
      return base44.entities.Question.filter(filters);
    },
    enabled: open && screen === 'questions' && !!selectedSubtopic && selectedYearGroup !== 'all' && selectedDifficulty !== 'all'
  });

  const filteredQuestions = useMemo(() => {
    if (!questions?.length) return [];
    if (!searchQuery) return questions;
    const q = searchQuery.toLowerCase();
    return questions.filter(x => (x.question_text || '').toLowerCase().includes(q));
  }, [questions, searchQuery]);

  const addQuestionsMutation = useMutation({
    mutationFn: async (picked) => {
      if (!quizSetId) throw new Error('ERROR: quiz_id is missing');

      const existingRows = await base44.entities.QuizQuestion.filter({ quiz_set_id: quizSetId });
      const existingGlobalIds = new Set(existingRows.map(r => r.source_global_id).filter(Boolean));
      let maxOrder = existingRows.length ? Math.max(...existingRows.map(r => r.order ?? 0)) : -1;

      let created = 0;
      let skipped = 0;
      let invalid = 0;

      for (const q of picked) {
        // Skip duplicates
        if (existingGlobalIds.has(q.id)) {
          skipped++;
          continue;
        }

        // Validate question
        const prompt = (q.question_text || q.prompt || '').trim();
        if (!prompt) {
          invalid++;
          console.warn('[SKIP_INVALID] No prompt:', q.id);
          continue;
        }

        const opts = Array.isArray(q.options) && q.options.length === 4
          ? q.options.map(o => String(o).trim())
          : ['', '', '', ''];

        if (opts.some(o => !o)) {
          invalid++;
          console.warn('[SKIP_INVALID] Empty options:', q.id);
          continue;
        }

        let correctIndex = typeof q.correct_index === 'number' ? q.correct_index : -1;
        if (correctIndex < 0 && q.correct_answer) {
          correctIndex = opts.findIndex(o => 
            o.toLowerCase() === String(q.correct_answer).trim().toLowerCase()
          );
        }

        if (correctIndex < 0 || correctIndex > 3) {
          invalid++;
          console.warn('[SKIP_INVALID] Invalid correct_index:', q.id);
          continue;
        }

        maxOrder++;

        await base44.entities.QuizQuestion.create({
          quiz_set_id: quizSetId,
          order: maxOrder,
          prompt: prompt,
          question_type: 'multiple_choice',
          options: opts,
          correct_index: correctIndex,
          correct_answer: q.correct_answer || opts[correctIndex],
          difficulty: q.difficulty || 'medium',
          explanation: q.explanation || '',
          tags: [],
          source_global_id: q.id
        });

        created++;
      }

      return { created, skipped, invalid };
    },
    onSuccess: (data) => {
      toast.dismiss();
      
      let message = `Added ${data.created} questions`;
      if (data.skipped > 0) message += ` (${data.skipped} duplicates skipped)`;
      if (data.invalid > 0) message += ` (${data.invalid} invalid skipped)`;
      
      toast.success(message);
      
      console.log('[APPLY_SUCCESS]', {
        createdCount: data.created,
        skippedDuplicateCount: data.skipped,
        invalidCount: data.invalid,
        total: data.created + data.skipped + data.invalid
      });
      
      setLastApplyResult({
        created: data.created,
        skipped: data.skipped,
        invalid: data.invalid || 0,
        timestamp: new Date().toISOString()
      });

      queryClient.invalidateQueries(['quizQuestions', quizSetId]);
      queryClient.refetchQueries(['quizQuestions', quizSetId]);
      onAddQuestions?.(data.created);

      setSelectedQuestions([]);
      close();
    },
    onError: (err) => {
      toast.dismiss();
      console.error('[APPLY_ERROR] Failed to add questions:', err);
      console.error('[APPLY_ERROR] Error details:', {
        message: err.message,
        stack: err.stack,
        quizSetId,
        selectedCount: selectedQuestions.length
      });
      toast.error(err.message || 'Failed to apply questions');
    }
  });

  const handleApplyFilters = () => {
    if (selectedYearGroup === 'all' || selectedDifficulty === 'all') {
      toast.error('Pick Year Group and Difficulty');
      return;
    }
    setScreen('questions');
  };

  const toggleQuestion = (question) => {
    setSelectedQuestions(prev =>
      prev.find(q => q.id === question.id)
        ? prev.filter(q => q.id !== question.id)
        : [...prev, question]
    );
  };

  const selectAll = () => setSelectedQuestions(filteredQuestions);
  const clear = () => setSelectedQuestions([]);

  const apply = () => {
    console.log('=== APPLY_CLICKED ===');
    console.log('selectedQuestionIds:', selectedQuestions.map(q => q.id));
    console.log('selected count:', selectedQuestions.length);
    console.log('currentQuizId:', quizSetId);
    console.log('==================');
    
    if (!selectedQuestions.length) {
      toast.error('No questions selected');
      console.error('[APPLY_ERROR] No questions selected');
      return;
    }
    
    if (!quizSetId) {
      toast.error('ERROR: quiz_id is missing');
      console.error('[APPLY_ERROR] Missing quiz_id', {
        quizSetId,
        selectedQuestions: selectedQuestions.length
      });
      return;
    }
    
    toast.loading(`Applying ${selectedQuestions.length} questions...`);
    addQuestionsMutation.mutate(selectedQuestions);
  };

  const back = () => {
    if (screen === 'topics') {
      setScreen('subject'); setSelectedSubject(null);
    } else if (screen === 'subtopics') {
      setScreen('topics'); setSelectedTopic(null);
    } else if (screen === 'filter') {
      setScreen('subtopics'); setSelectedSubtopic(null);
    } else if (screen === 'questions') {
      setScreen('filter'); setSelectedQuestions([]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] h-[95vh] p-0 gap-0 bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 border-white/10">
        <DialogHeader className="border-b border-white/10 px-6 py-4">
          <div className="absolute top-2 right-2 bg-slate-800/90 border border-white/20 rounded-lg px-3 py-2 text-xs z-50 space-y-1">
            <div className="text-slate-300"><b>Quiz ID:</b> {quizSetId || <span className="text-red-400 font-bold">MISSING</span>}</div>
            <div className="text-slate-300"><b>Selected:</b> {selectedQuestions.length}</div>
            {lastApplyResult && (
              <div className="text-slate-300 border-t border-white/10 pt-1 mt-1">
                <b>Last Apply:</b> {lastApplyResult.created} added
                {lastApplyResult.skipped > 0 && ` / ${lastApplyResult.skipped} dup`}
                {lastApplyResult.invalid > 0 && ` / ${lastApplyResult.invalid} invalid`}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              {screen !== 'subject' && (
                <Button variant="ghost" size="icon" onClick={back} className="text-slate-400 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              )}
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Database className="w-5 h-5 text-purple-400" />
                <span className={screen === 'subject' ? 'text-white font-semibold' : ''}>Subject</span>
                {selectedSubject && (<><ChevronRight className="w-4 h-4" /><span>{selectedSubject.name}</span></>)}
                {selectedTopic && (<><ChevronRight className="w-4 h-4" /><span>{selectedTopic.name}</span></>)}
                {selectedSubtopic && (<><ChevronRight className="w-4 h-4" /><span className="text-white">{selectedSubtopic.name}</span></>)}
              </div>
            </div>

            {screen === 'questions' && (
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-sm text-purple-300 border-purple-400">
                  {selectedQuestions.length} selected
                </Badge>
                <Button
                  onClick={apply}
                  disabled={!selectedQuestions.length || addQuestionsMutation.isPending || !quizSetId}
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                >
                  {addQuestionsMutation.isPending ? 'Adding...' : `Apply (${selectedQuestions.length})`}
                </Button>
              </div>
            )}

            <Button variant="ghost" size="icon" onClick={close} className="text-slate-400 hover:text-white ml-2">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {screen === 'subject' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjects.map(subject => (
                <Card key={subject.id} className="p-6 bg-white/5 border-white/10 hover:bg-white/10 cursor-pointer"
                  onClick={() => { setSelectedSubject(subject); setScreen('topics'); }}>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-blue-500/20 flex items-center justify-center">
                      <BookOpen className="w-7 h-7 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-white">{subject.name}</h3>
                      <p className="text-sm text-slate-400">Click to browse</p>
                    </div>
                  </div>
                </Card>
              ))}
              {!loadingSubjects && subjects.length === 0 && (
                <div className="text-slate-400">No subjects found</div>
              )}
            </div>
          )}

          {screen === 'topics' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topics.map(topic => (
                <Card key={topic.id} className="p-6 bg-white/5 border-white/10 hover:bg-white/10 cursor-pointer"
                  onClick={() => { setSelectedTopic(topic); setScreen('subtopics'); }}>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-purple-500/20 flex items-center justify-center">
                      <FolderOpen className="w-7 h-7 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-white">{topic.name}</h3>
                      <p className="text-sm text-slate-400">Click to view subtopics</p>
                    </div>
                  </div>
                </Card>
              ))}
              {!loadingTopics && topics.length === 0 && (
                <div className="text-slate-400">No topics found</div>
              )}
            </div>
          )}

          {screen === 'subtopics' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subtopics.map(subtopic => (
                <Card key={subtopic.id} className="p-6 bg-white/5 border-white/10 hover:bg-white/10 cursor-pointer"
                  onClick={() => { setSelectedSubtopic(subtopic); setScreen('filter'); }}>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                      <BookOpen className="w-7 h-7 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-white">{subtopic.name}</h3>
                      <p className="text-sm text-slate-400">Click to filter questions</p>
                    </div>
                  </div>
                </Card>
              ))}
              {!loadingSubtopics && subtopics.length === 0 && (
                <div className="text-slate-400">No subtopics found</div>
              )}
            </div>
          )}

          {screen === 'filter' && (
            <div className="max-w-2xl mx-auto space-y-6 bg-white/5 border border-white/10 rounded-xl p-6">
              <div>
                <Label className="text-slate-300 mb-2 block">Year Group *</Label>
                <Select value={selectedYearGroup} onValueChange={setSelectedYearGroup}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Year 7</SelectItem>
                    <SelectItem value="8">Year 8</SelectItem>
                    <SelectItem value="9">Year 9</SelectItem>
                    <SelectItem value="10">Year 10</SelectItem>
                    <SelectItem value="11">Year 11</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-slate-300 mb-2 block">Difficulty *</Label>
                <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleApplyFilters}
                disabled={selectedYearGroup === 'all' || selectedDifficulty === 'all'}
                className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                size="lg"
              >
                <Filter className="w-5 h-5 mr-2" />
                Show Questions
              </Button>
            </div>
          )}

          {screen === 'questions' && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex gap-2">
                  <Badge className="bg-blue-500/20 text-blue-300">Year {selectedYearGroup}</Badge>
                  <Badge className="bg-purple-500/20 text-purple-300">{selectedDifficulty}</Badge>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAll} className="bg-white/5 border-white/10 text-slate-300 hover:bg-white/10">
                    Select All ({filteredQuestions.length})
                  </Button>
                  <Button variant="outline" size="sm" onClick={clear} className="bg-white/5 border-white/10 text-slate-300 hover:bg-white/10">
                    Clear
                  </Button>
                </div>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Search questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white"
                />
              </div>

              {loadingQuestions ? (
                <div className="text-slate-400">Loading questions…</div>
              ) : filteredQuestions.length === 0 ? (
                <div className="text-slate-400">No questions found.</div>
              ) : (
                <div className="space-y-4">
                  {filteredQuestions.map((q, idx) => {
                    const isSel = !!selectedQuestions.find(x => x.id === q.id);
                    return (
                      <Card
                        key={q.id}
                        className={`p-5 bg-white/5 border-white/10 cursor-pointer transition-all ${isSel ? 'ring-2 ring-purple-500' : 'hover:bg-white/10'}`}
                        onClick={() => toggleQuestion(q)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-white font-medium">
                            {idx + 1}. {q.question_text}
                          </div>
                          <Badge className={`pointer-events-none ${isSel ? 'bg-purple-500/30 text-purple-100' : 'bg-white/10 text-slate-200'}`}>
                            {isSel ? 'Selected' : 'Tap to select'}
                          </Badge>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}