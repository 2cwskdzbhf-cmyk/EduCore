import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Search, 
  Filter,
  Check,
  X,
  ArrowLeft,
  Database,
  FolderOpen,
  ChevronRight,
  Plus
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function GlobalQuestionBankDialog({ open, onClose, onAddQuestions, quizSetId }) {
  const queryClient = useQueryClient();
  const [screen, setScreen] = useState('subject'); // 'subject' | 'topics' | 'subtopics' | 'filter' | 'questions'
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [selectedSubtopic, setSelectedSubtopic] = useState(null);
  const [selectedYearGroup, setSelectedYearGroup] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuestions, setSelectedQuestions] = useState([]);

  // Debug logging
  useEffect(() => {
    if (open) {
      console.log('[GlobalQuestionBankDialog] quiz_set_id:', quizSetId);
      console.log('[GlobalQuestionBankDialog] selectedSubjectId:', selectedSubject?.id);
      console.log('[GlobalQuestionBankDialog] selectedTopicId:', selectedTopic?.id);
      console.log('[GlobalQuestionBankDialog] selectedSubtopicId:', selectedSubtopic?.id);
    }
  }, [open, quizSetId, selectedSubject, selectedTopic, selectedSubtopic]);

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
      console.log('[Questions Query] subtopic_id:', selectedSubtopic.id);
      console.log('[Questions Query] filters:', { year_group: selectedYearGroup, difficulty: selectedDifficulty });
      
      const filters = { subtopic_id: selectedSubtopic.id };
      if (selectedYearGroup !== 'all') filters.year_group = Number(selectedYearGroup);
      if (selectedDifficulty !== 'all') filters.difficulty = selectedDifficulty;
      
      const result = await base44.entities.Question.filter(filters);
      console.log('[Questions Query] results count:', result.length);
      return result;
    },
    enabled: open && screen === 'questions' && !!selectedSubtopic && selectedYearGroup !== 'all' && selectedDifficulty !== 'all'
  });

  const addQuestionsMutation = useMutation({
    mutationFn: async (questions) => {
      console.log('[AddToQuiz] Starting with quiz_set_id:', quizSetId);
      console.log('[AddToQuiz] Selected question IDs:', questions.map(q => q.id));

      if (!quizSetId) {
        throw new Error('No quiz selected');
      }

      // Get existing questions to check for duplicates and determine order
      const existingQuestions = await base44.entities.LiveQuizQuestion.filter({ quiz_id: quizSetId });
      const existingQuestionIds = new Set(
        existingQuestions.map(q => q.question_id)
      );

      let maxOrder = existingQuestions.length > 0 
        ? Math.max(...existingQuestions.map(q => q.order || 0))
        : -1;

      const createdQuestions = [];
      let skippedDuplicates = 0;
      
      for (const q of questions) {
        // Skip if already added
        if (existingQuestionIds.has(q.id)) {
          skippedDuplicates++;
          console.log('[AddToQuiz] Skipping duplicate:', q.id);
          continue;
        }

        maxOrder++;
        try {
          const questionData = {
            quiz_id: quizSetId,
            question_id: q.id,
            order: maxOrder,
            prompt: q.question_text,
            options: q.options || [],
            correct_answer: q.correct_answer,
            correct_index: q.correct_index,
            difficulty: q.difficulty,
            year_group: q.year_group
          };

          console.log('[AddToQuiz] Creating LiveQuizQuestion:', questionData);
          const created = await base44.entities.LiveQuizQuestion.create(questionData);
          createdQuestions.push(created);
        } catch (err) {
          console.error('[AddToQuiz] Failed to create LiveQuizQuestion:', err);
          throw new Error(`Failed to add question: ${err.message || err}`);
        }
      }

      console.log('[AddToQuiz] Created:', createdQuestions.length, 'Skipped:', skippedDuplicates);
      return { count: createdQuestions.length, skipped: skippedDuplicates };
    },
    onSuccess: (data) => {
      const message = data.skipped > 0 
        ? `Added ${data.count} questions to quiz (skipped ${data.skipped} duplicates)`
        : `Added ${data.count} questions to quiz`;
      toast.success(message);
      queryClient.invalidateQueries(['liveQuizQuestions']);
      queryClient.invalidateQueries(['quizQuestions']);
      onAddQuestions?.(data.count);
      setSelectedQuestions([]);
      handleClose();
    },
    onError: (error) => {
      console.error('[AddToQuiz] Error:', error);
      toast.error(error.message || 'Failed to add questions');
    }
  });

  // Normalize year group for comparison
  const normalizeYearGroup = (value) => {
    if (!value) return null;
    const str = String(value).replace(/\D/g, '');
    return str ? Number(str) : null;
  };

  // Filter questions with search
  const filteredQuestions = useMemo(() => {
    if (!questions || questions.length === 0) return [];
    
    if (searchQuery) {
      return questions.filter(q => 
        q.question_text.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return questions;
  }, [questions, searchQuery]);

  const handleClose = () => {
    setScreen('subject');
    setSelectedSubject(null);
    setSelectedTopic(null);
    setSelectedSubtopic(null);
    setSelectedYearGroup('all');
    setSelectedDifficulty('all');
    setSearchQuery('');
    setSelectedQuestions([]);
    onClose();
  };

  const handleSelectSubject = (subject) => {
    console.log('[SelectSubject]', subject);
    setSelectedSubject(subject);
    setScreen('topics');
  };

  const handleSelectTopic = (topic) => {
    console.log('[SelectTopic]', topic);
    setSelectedTopic(topic);
    setScreen('subtopics');
  };

  const handleSelectSubtopic = (subtopic) => {
    console.log('[SelectSubtopic]', subtopic);
    setSelectedSubtopic(subtopic);
    setScreen('filter');
  };

  const handleApplyFilters = () => {
    if (selectedYearGroup === 'all' || selectedDifficulty === 'all') {
      toast.error('Please select both Year Group and Difficulty');
      return;
    }
    console.log('[ApplyFilters]', { year_group: selectedYearGroup, difficulty: selectedDifficulty });
    setScreen('questions');
  };

  const handleBackToSubject = () => {
    setScreen('subject');
    setSelectedSubject(null);
    setSelectedTopic(null);
    setSelectedSubtopic(null);
    setSelectedQuestions([]);
  };

  const handleBackToTopics = () => {
    setScreen('topics');
    setSelectedTopic(null);
    setSelectedSubtopic(null);
    setSelectedQuestions([]);
  };

  const handleBackToSubtopics = () => {
    setScreen('subtopics');
    setSelectedSubtopic(null);
    setSelectedQuestions([]);
  };

  const handleBackToFilters = () => {
    setScreen('filter');
    setSelectedQuestions([]);
  };

  const toggleQuestion = (question) => {
    setSelectedQuestions(prev => 
      prev.find(q => q.id === question.id)
        ? prev.filter(q => q.id !== question.id)
        : [...prev, question]
    );
  };

  const handleSelectAll = () => {
    setSelectedQuestions(filteredQuestions);
  };

  const handleClearSelection = () => {
    setSelectedQuestions([]);
  };

  const handleAddToQuiz = () => {
    console.log('[handleAddToQuiz] selectedQuestions.length:', selectedQuestions.length);
    console.log('[handleAddToQuiz] quizSetId:', quizSetId);
    console.log('[handleAddToQuiz] selectedQuestionIds:', selectedQuestions.map(q => q.id));
    
    if (!quizSetId) {
      toast.error('No quiz selected');
      return;
    }
    if (selectedQuestions.length === 0) {
      toast.error('Please select at least one question');
      return;
    }
    addQuestionsMutation.mutate(selectedQuestions);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] h-[95vh] p-0 gap-0 bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 border-white/10">
        {/* Header */}
        <DialogHeader className="border-b border-white/10 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              {screen !== 'subject' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={
                    screen === 'topics' ? handleBackToSubject :
                    screen === 'subtopics' ? handleBackToTopics :
                    screen === 'filter' ? handleBackToSubtopics :
                    handleBackToFilters
                  }
                  className="text-slate-400 hover:text-white"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              )}
              <div className="flex items-center gap-2 flex-1">
                <Database className="w-6 h-6 text-purple-400" />
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <span className={screen === 'subject' ? 'text-white font-semibold' : 'cursor-pointer hover:text-white'} onClick={handleBackToSubject}>Subject</span>
                  {selectedSubject && (
                    <>
                      <ChevronRight className="w-4 h-4" />
                      <span className={screen === 'topics' ? 'text-white font-semibold' : 'cursor-pointer hover:text-white'} onClick={handleBackToTopics}>{selectedSubject.name}</span>
                    </>
                  )}
                  {selectedTopic && (
                    <>
                      <ChevronRight className="w-4 h-4" />
                      <span className={screen === 'subtopics' ? 'text-white font-semibold' : 'cursor-pointer hover:text-white'} onClick={handleBackToSubtopics}>{selectedTopic.name}</span>
                    </>
                  )}
                  {selectedSubtopic && (
                    <>
                      <ChevronRight className="w-4 h-4" />
                      <span className={screen === 'filter' || screen === 'questions' ? 'text-white font-semibold' : ''}>{selectedSubtopic.name}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            {screen === 'questions' && (
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-sm text-purple-300 border-purple-400">
                  {selectedQuestions.length} selected
                </Badge>
                <Button
                  onClick={handleAddToQuiz}
                  disabled={selectedQuestions.length === 0 || addQuestionsMutation.isPending}
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                >
                  {addQuestionsMutation.isPending ? 'Adding...' : `Apply (${selectedQuestions.length})`}
                </Button>
              </div>
            )}
            <Button variant="ghost" size="icon" onClick={handleClose} className="text-slate-400 hover:text-white ml-2">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Subject Screen */}
          {screen === 'subject' && (
            <div>
              <div className="mb-6">
                <p className="text-slate-400">Select a subject to browse topics</p>
              </div>

              {loadingSubjects ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : subjects.length === 0 ? (
                <div className="text-center py-12">
                  <Database className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">No subjects found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {subjects.map(subject => (
                    <Card
                      key={subject.id}
                      className="p-6 bg-white/5 border-white/10 hover:bg-white/10 transition-all cursor-pointer"
                      onClick={() => handleSelectSubject(subject)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-blue-500/20 flex items-center justify-center">
                          <BookOpen className="w-7 h-7 text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg text-white">{subject.name}</h3>
                          <p className="text-sm text-slate-400">{subject.description || 'Click to browse'}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Topics Screen */}
          {screen === 'topics' && (
            <div>
              <div className="mb-6">
                <p className="text-slate-400">Select a topic within {selectedSubject?.name}</p>
              </div>

              {loadingTopics ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : topics.length === 0 ? (
                <div className="text-center py-12">
                  <FolderOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">No topics found for {selectedSubject?.name}</p>
                  <p className="text-sm text-slate-500 mt-2">Debug: subject_id = {selectedSubject?.id}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {topics.map(topic => (
                    <Card
                      key={topic.id}
                      className="p-6 bg-white/5 border-white/10 hover:bg-white/10 transition-all cursor-pointer"
                      onClick={() => handleSelectTopic(topic)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-purple-500/20 flex items-center justify-center">
                          <FolderOpen className="w-7 h-7 text-purple-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg text-white">{topic.name}</h3>
                          <p className="text-sm text-slate-400">{topic.description || 'Click to view subtopics'}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Subtopics Screen */}
          {screen === 'subtopics' && (
            <div>
              <div className="mb-6">
                <p className="text-slate-400">Select a subtopic within {selectedTopic?.name}</p>
              </div>

              {loadingSubtopics ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : subtopics.length === 0 ? (
                <div className="text-center py-12">
                  <FolderOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">No subtopics found for {selectedTopic?.name}</p>
                  <p className="text-sm text-slate-500 mt-2">Debug: topic_id = {selectedTopic?.id}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {subtopics.map(subtopic => (
                    <Card
                      key={subtopic.id}
                      className="p-6 bg-white/5 border-white/10 hover:bg-white/10 transition-all cursor-pointer"
                      onClick={() => handleSelectSubtopic(subtopic)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                          <BookOpen className="w-7 h-7 text-emerald-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg text-white">{subtopic.name}</h3>
                          <p className="text-sm text-slate-400">{subtopic.description || 'Click to filter questions'}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Filter Screen */}
          {screen === 'filter' && (
            <div className="max-w-2xl mx-auto">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-2">Filter Questions</h3>
                <p className="text-sm text-slate-400">Select year group and difficulty to view questions in {selectedSubtopic?.name}</p>
              </div>

              <div className="space-y-6 bg-white/5 border border-white/10 rounded-xl p-6">
                <div>
                  <Label className="text-slate-300 mb-2 block">Year Group *</Label>
                  <Select value={selectedYearGroup} onValueChange={setSelectedYearGroup}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Select year group" />
                    </SelectTrigger>
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
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
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
            </div>
          )}

          {/* Questions Screen */}
          {screen === 'questions' && (
            <div>
              {/* Search and Actions */}
              <div className="mb-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Badge className="bg-blue-500/20 text-blue-300">Year {selectedYearGroup}</Badge>
                    <Badge className="bg-purple-500/20 text-purple-300">{selectedDifficulty}</Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBackToFilters}
                    className="bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                  >
                    Change Filters
                  </Button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    placeholder="Search questions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                      className="bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                    >
                      Select All ({filteredQuestions.length})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearSelection}
                      disabled={selectedQuestions.length === 0}
                      className="bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                    >
                      Clear
                    </Button>
                  </div>
                  <Badge className="bg-purple-500/20 text-purple-300">
                    {filteredQuestions.length} questions
                  </Badge>
                </div>
              </div>

              {/* Questions List */}
              {loadingQuestions ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredQuestions.map((question, idx) => {
                  const isSelected = selectedQuestions.find(q => q.id === question.id);
                  return (
                    <Card
                      key={question.id}
                      className={`p-4 transition-all ${
                        isSelected ? 'ring-2 ring-purple-500 bg-purple-500/20 border-purple-400' : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div 
                          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer ${
                            isSelected ? 'bg-gradient-to-r from-purple-500 to-blue-500' : 'bg-white/10'
                          }`}
                          onClick={() => toggleQuestion(question)}
                        >
                          {isSelected ? (
                            <Check className="w-5 h-5 text-white" />
                          ) : (
                            <span className="text-sm font-medium text-slate-300">{idx + 1}</span>
                          )}
                        </div>
                        <div className="flex-1 cursor-pointer" onClick={() => toggleQuestion(question)}>
                          <p className="text-white font-medium mb-2">{question.question_text}</p>
                          {question.options && question.options.length > 0 && (
                            <div className="space-y-1 mb-3" onClick={(e) => e.stopPropagation()}>
                              {question.options.map((option, i) => (
                                <div key={i} className={`text-sm px-3 py-1.5 rounded ${
                                  i === question.correct_index || option === question.correct_answer
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                                    : 'bg-white/5 text-slate-300 border border-white/10'
                                }`}>
                                  {String.fromCharCode(65 + i)}. {option}
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <Badge className={`text-xs ${
                              question.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                              question.difficulty === 'medium' ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {question.difficulty}
                            </Badge>
                            <Badge variant="outline" className="text-xs text-slate-300">
                              {question.question_type === 'multiple_choice' ? 'Multiple Choice' :
                               question.question_type === 'true_false' ? 'True/False' :
                               question.question_type === 'short_answer' ? 'Short Answer' : 'Written'}
                            </Badge>
                            <Badge variant="outline" className="text-xs text-slate-300">Year {question.year_group}</Badge>
                          </div>
                        </div>
                      </div>
                    </Card>
                    );
                  })}

                  {filteredQuestions.length === 0 && (
                    <div className="text-center py-12">
                      <Database className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-400">
                        {searchQuery ? 'No questions match your search' : 'No questions in this subtopic'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}