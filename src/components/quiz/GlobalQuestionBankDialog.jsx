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
  const [screen, setScreen] = useState('topics'); // 'topics' | 'subtopics' | 'questions'
  const [selectedTopic, setSelectedTopic] = useState(null); // top-level topic
  const [selectedSubtopic, setSelectedSubtopic] = useState(null); // subtopic
  const [selectedYearGroup, setSelectedYearGroup] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuestions, setSelectedQuestions] = useState([]);

  // Debug logging
  useEffect(() => {
    if (open) {
      console.log('[GlobalQuestionBankDialog] quiz_set_id:', quizSetId);
    }
  }, [open, quizSetId]);

  const { data: globalTopics = [], isLoading: loadingTopics } = useQuery({
    queryKey: ['globalTopics'],
    queryFn: () => base44.entities.GlobalTopic.list('order_index', 1000),
    enabled: open
  });

  const { data: globalQuestions = [], isLoading: loadingQuestions } = useQuery({
    queryKey: ['globalQuestions'],
    queryFn: () => base44.entities.GlobalQuestion.list('-created_date', 5000),
    enabled: open && screen === 'questions' && !!selectedSubtopic
  });

  const addQuestionsMutation = useMutation({
    mutationFn: async (questions) => {
      console.log('[AddToQuiz] Starting with quiz_set_id:', quizSetId);
      console.log('[AddToQuiz] Selected question IDs:', questions.map(q => q.id));

      if (!quizSetId) {
        throw new Error('No quiz selected');
      }

      // Get existing questions to check for duplicates and determine order
      const existingQuestions = await base44.entities.QuizQuestion.filter({ quiz_set_id: quizSetId });
      const existingSourceIds = new Set(
        existingQuestions
          .filter(q => q.source_global_id)
          .map(q => q.source_global_id)
      );

      let maxOrder = existingQuestions.length > 0 
        ? Math.max(...existingQuestions.map(q => q.order || 0))
        : -1;

      const createdQuestions = [];
      let skippedDuplicates = 0;
      
      for (const gq of questions) {
        // Skip if already added
        if (existingSourceIds.has(gq.id)) {
          skippedDuplicates++;
          console.log('[AddToQuiz] Skipping duplicate:', gq.id);
          continue;
        }

        maxOrder++;
        try {
          const questionData = {
            quiz_set_id: quizSetId,
            order: maxOrder,
            prompt: gq.question_text,
            question_type: gq.question_type === 'mcq' ? 'multiple_choice' : 
                          gq.question_type === 'numeric' ? 'short_answer' : 'short_answer',
            options: gq.choices || [],
            correct_index: gq.correct_index !== undefined ? gq.correct_index :
                          (gq.choices ? gq.choices.indexOf(gq.correct_answer) : undefined),
            correct_answer: gq.correct_answer,
            explanation: gq.explanation || '',
            difficulty: gq.difficulty,
            year_group: gq.year_group,
            subject_id: gq.subject_id,
            topic_id: gq.global_topic_id,
            source_global_id: gq.id,
            is_reusable: false,
            visibility: 'private'
          };

          console.log('[AddToQuiz] Creating QuizQuestion:', questionData);
          const created = await base44.entities.QuizQuestion.create(questionData);
          createdQuestions.push(created);
        } catch (err) {
          console.error('[AddToQuiz] Failed to create QuizQuestion:', err);
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
      queryClient.invalidateQueries(['quizQuestions']);
      onAddQuestions?.(data.count);
      setSelectedQuestions([]);
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

  // Top-level topics (parent_topic_id == null)
  const topLevelTopics = useMemo(() => {
    return globalTopics
      .filter(t => !t.parent_topic_id)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  }, [globalTopics]);

  // Subtopics for selected topic
  const subtopics = useMemo(() => {
    if (!selectedTopic) return [];
    return globalTopics
      .filter(t => t.parent_topic_id === selectedTopic.id)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  }, [globalTopics, selectedTopic]);

  // Get question count for each topic/subtopic
  const getQuestionCount = (topicId) => {
    return globalQuestions.filter(q => q.global_topic_id === topicId).length;
  };

  // Filter questions for selected subtopic
  const filteredQuestions = useMemo(() => {
    if (!selectedSubtopic) return [];
    
    let questions = globalQuestions.filter(q => q.global_topic_id === selectedSubtopic.id);
    
    // Apply filters
    if (selectedYearGroup !== 'all') {
      const selectedYear = normalizeYearGroup(selectedYearGroup);
      questions = questions.filter(q => normalizeYearGroup(q.year_group) === selectedYear);
    }
    if (selectedDifficulty !== 'all') {
      questions = questions.filter(q => q.difficulty === selectedDifficulty);
    }
    if (selectedType !== 'all') {
      questions = questions.filter(q => q.question_type === selectedType);
    }
    if (searchQuery) {
      questions = questions.filter(q => 
        q.question_text.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return questions;
  }, [globalQuestions, selectedSubtopic, selectedYearGroup, selectedDifficulty, selectedType, searchQuery]);

  const handleClose = () => {
    setScreen('topics');
    setSelectedTopic(null);
    setSelectedSubtopic(null);
    setSelectedYearGroup('all');
    setSelectedDifficulty('all');
    setSelectedType('all');
    setSearchQuery('');
    setSelectedQuestions([]);
    onClose();
  };

  const handleSelectTopic = (topic) => {
    setSelectedTopic(topic);
    setScreen('subtopics');
    setSelectedQuestions([]);
  };

  const handleSelectSubtopic = (subtopic) => {
    setSelectedSubtopic(subtopic);
    setScreen('questions');
    setSearchQuery('');
    setSelectedQuestions([]);
  };

  const handleBackToTopics = () => {
    setScreen('topics');
    setSelectedTopic(null);
    setSelectedSubtopic(null);
    setSearchQuery('');
    setSelectedQuestions([]);
  };

  const handleBackToSubtopics = () => {
    setScreen('subtopics');
    setSelectedSubtopic(null);
    setSearchQuery('');
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
              {screen !== 'topics' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={screen === 'questions' ? handleBackToSubtopics : handleBackToTopics}
                  className="text-slate-400 hover:text-white"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              )}
              <div className="flex items-center gap-2 flex-1">
                <Database className="w-6 h-6 text-purple-400" />
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <span className={screen === 'topics' ? 'text-white font-semibold' : 'cursor-pointer hover:text-white'} onClick={handleBackToTopics}>Topics</span>
                  {selectedTopic && (
                    <>
                      <ChevronRight className="w-4 h-4" />
                      <span className={screen === 'subtopics' ? 'text-white font-semibold' : 'cursor-pointer hover:text-white'} onClick={handleBackToSubtopics}>{selectedTopic.name}</span>
                    </>
                  )}
                  {selectedSubtopic && (
                    <>
                      <ChevronRight className="w-4 h-4" />
                      <span className="text-white font-semibold">{selectedSubtopic.name}</span>
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
                  {addQuestionsMutation.isPending ? 'Adding...' : `Add ${selectedQuestions.length} to Quiz`}
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
          {/* Topics Screen */}
          {screen === 'topics' && (
            <div className="max-w-2xl mx-auto">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-2">Filter Questions</h3>
                <p className="text-sm text-slate-400">Filters apply before grouping questions by topic. Total questions: <strong className="text-white">{globalQuestions.length}</strong></p>
              </div>

              <div className="space-y-6 bg-white/5 border border-white/10 rounded-xl p-6">
                <div>
                  <Label className="mb-2 text-slate-300">Year Group</Label>
                  <Select value={selectedYearGroup} onValueChange={setSelectedYearGroup}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      <SelectItem value="7">Year 7</SelectItem>
                      <SelectItem value="8">Year 8</SelectItem>
                      <SelectItem value="9">Year 9</SelectItem>
                      <SelectItem value="10">Year 10</SelectItem>
                      <SelectItem value="11">Year 11</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="mb-2 text-slate-300">Difficulty</Label>
                  <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Difficulties</SelectItem>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="mb-2 text-slate-300">Question Type</Label>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="mcq">Multiple Choice</SelectItem>
                      <SelectItem value="numeric">Numeric</SelectItem>
                      <SelectItem value="short">Short Answer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleApplyFilters}
                  className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                  size="lg"
                >
                  <Filter className="w-5 h-5 mr-2" />
                  Apply Filters
                </Button>
              </div>
            </div>
          )}

          {/* Topics Screen */}
          {screen === 'topics' && (
            <div>
              <div className="mb-6 flex items-center justify-between">
                <p className="text-slate-400">Select a subtopic to view questions</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Subtopic
                </Button>
              </div>

              {subtopics.length === 0 ? (
                <div className="text-center py-12">
                  <FolderOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">No subtopics found</p>
                  <p className="text-sm text-slate-500 mt-2">Create subtopics to organize questions</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {subtopics.map(subtopic => {
                    const count = getQuestionCount(subtopic.id);
                    return (
                      <Card
                        key={subtopic.id}
                        className="p-6 bg-white/5 border-white/10 hover:bg-white/10 transition-all cursor-pointer"
                        onClick={() => handleSelectSubtopic(subtopic)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-xl bg-blue-500/20 flex items-center justify-center">
                            <BookOpen className="w-7 h-7 text-blue-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg text-white">{subtopic.name}</h3>
                            <p className="text-sm text-slate-400">{count} question{count !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Questions Screen */}
          {screen === 'questions' && (
            <div>
              {/* Filters and Search */}
              <div className="mb-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      New Question
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Select value={selectedYearGroup} onValueChange={setSelectedYearGroup}>
                      <SelectTrigger className="w-32 bg-white/5 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        <SelectItem value="7">Year 7</SelectItem>
                        <SelectItem value="8">Year 8</SelectItem>
                        <SelectItem value="9">Year 9</SelectItem>
                        <SelectItem value="10">Year 10</SelectItem>
                        <SelectItem value="11">Year 11</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                      <SelectTrigger className="w-32 bg-white/5 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Difficulty</SelectItem>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={selectedType} onValueChange={setSelectedType}>
                      <SelectTrigger className="w-32 bg-white/5 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="mcq">MCQ</SelectItem>
                        <SelectItem value="numeric">Numeric</SelectItem>
                        <SelectItem value="short">Short</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
                      className={`p-4 cursor-pointer transition-all ${
                        isSelected ? 'ring-2 ring-purple-500 bg-purple-500/20 border-purple-400' : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                      onClick={() => toggleQuestion(question)}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'bg-gradient-to-r from-purple-500 to-blue-500' : 'bg-white/10'
                        }`}>
                          {isSelected ? (
                            <Check className="w-5 h-5 text-white" />
                          ) : (
                            <span className="text-sm font-medium text-slate-300">{idx + 1}</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-medium mb-2">{question.question_text}</p>
                          {question.choices && question.choices.length > 0 && (
                            <div className="space-y-1 mb-3">
                              {question.choices.map((choice, i) => (
                                <div key={i} className={`text-sm px-3 py-1.5 rounded ${
                                  choice === question.correct_answer
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                                    : 'bg-white/5 text-slate-300 border border-white/10'
                                }`}>
                                  {String.fromCharCode(65 + i)}. {choice}
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-2">
                            <Badge className={`text-xs ${
                              question.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                              question.difficulty === 'medium' ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {question.difficulty}
                            </Badge>
                            <Badge variant="outline" className="text-xs text-slate-300">
                              {question.question_type === 'mcq' ? 'Multiple Choice' :
                               question.question_type === 'numeric' ? 'Numeric' : 'Short Answer'}
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