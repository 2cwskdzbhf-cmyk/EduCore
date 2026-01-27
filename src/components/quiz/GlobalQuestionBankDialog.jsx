import React, { useState, useMemo } from 'react';
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
  FolderOpen
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function GlobalQuestionBankDialog({ open, onClose, onAddQuestions, quizSetId }) {
  const queryClient = useQueryClient();
  const [screen, setScreen] = useState('filters'); // 'filters' | 'topics' | 'topic-questions'
  const [activeTopic, setActiveTopic] = useState(null);
  const [selectedYearGroup, setSelectedYearGroup] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [testResult, setTestResult] = useState(null);
  const [creating, setCreating] = useState(false);

  const { data: globalQuestions = [], isLoading } = useQuery({
    queryKey: ['globalQuestions'],
    queryFn: () => base44.entities.GlobalQuestion.list('-created_date', 5000),
    enabled: open
  });

  const addQuestionsMutation = useMutation({
    mutationFn: async (questions) => {
      if (!quizSetId) {
        throw new Error('Quiz set ID is required');
      }

      // Get current max order
      const existingQuestions = await base44.entities.QuizQuestion.filter({ quiz_set_id: quizSetId });
      let maxOrder = existingQuestions.length > 0 
        ? Math.max(...existingQuestions.map(q => q.order || 0))
        : -1;

      // Copy each global question to QuizQuestion entity
      // This creates a COPY that can be edited independently
      // The source_global_id tracks the origin but changes won't affect GlobalQuestion
      const createdQuestions = [];
      
      for (const gq of questions) {
        maxOrder++;
        try {
          const created = await base44.entities.QuizQuestion.create({
            quiz_set_id: quizSetId,
            order: maxOrder,
            prompt: gq.question_text,
            question_type: gq.question_type === 'mcq' ? 'multiple_choice' : 'short_answer',
            options: gq.choices || [],
            correct_index: gq.choices ? gq.choices.indexOf(gq.correct_answer) : undefined,
            correct_answer: gq.correct_answer,
            explanation: gq.explanation || '',
            difficulty: gq.difficulty,
            year_group: gq.year_group,
            subject_id: gq.subject_id,
            topic_id: gq.topic_id,
            source_global_id: gq.id,
            is_reusable: false,
            visibility: 'private'
          });
          createdQuestions.push(created);
        } catch (err) {
          console.error('Failed to create QuizQuestion:', err);
          throw new Error(`Failed to add question: ${err.message || err}`);
        }
      }

      return { count: createdQuestions.length };
    },
    onSuccess: (data) => {
      toast.success(`${data.count} questions added to quiz`);
      queryClient.invalidateQueries(['quizQuestions']);
      onAddQuestions?.(data.count);
      handleClose();
    },
    onError: (error) => {
      console.error('Add questions error:', error);
      toast.error(`Failed to add questions: ${error.message || error}`);
    }
  });

  // Normalize year group for comparison
  const normalizeYearGroup = (value) => {
    if (!value) return null;
    const str = String(value).replace(/\D/g, '');
    return str ? Number(str) : null;
  };

  // Apply filters BEFORE grouping by topics
  const filteredByFilters = useMemo(() => {
    return globalQuestions.filter(q => {
      // Year filter
      if (selectedYearGroup !== 'all') {
        const recordYear = normalizeYearGroup(q.year_group);
        const selectedYear = normalizeYearGroup(selectedYearGroup);
        if (recordYear !== selectedYear) return false;
      }
      // Difficulty filter
      if (selectedDifficulty !== 'all' && q.difficulty !== selectedDifficulty) return false;
      // Type filter
      if (selectedType !== 'all' && q.question_type !== selectedType) return false;
      return true;
    });
  }, [globalQuestions, selectedYearGroup, selectedDifficulty, selectedType]);

  // Group questions by topic
  const questionsByTopic = useMemo(() => {
    const groups = {};
    
    filteredByFilters.forEach(q => {
      const topicName = q.topic_name || 'Uncategorised';
      if (!groups[topicName]) {
        groups[topicName] = [];
      }
      groups[topicName].push(q);
    });

    return groups;
  }, [filteredByFilters]);

  // Get topics sorted by count
  const topics = useMemo(() => {
    return Object.entries(questionsByTopic)
      .map(([name, questions]) => ({ name, count: questions.length }))
      .sort((a, b) => b.count - a.count);
  }, [questionsByTopic]);

  // Filter questions within active topic by search query
  const topicQuestions = useMemo(() => {
    if (!activeTopic) return [];
    const questions = questionsByTopic[activeTopic] || [];
    if (!searchQuery) return questions;
    return questions.filter(q => 
      q.question_text.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [activeTopic, questionsByTopic, searchQuery]);

  const handleClose = () => {
    setScreen('filters');
    setActiveTopic(null);
    setSelectedYearGroup('all');
    setSelectedDifficulty('all');
    setSelectedType('all');
    setSearchQuery('');
    setSelectedQuestions([]);
    onClose();
  };

  const handleApplyFilters = () => {
    setScreen('topics');
  };

  const handleSelectTopic = (topicName) => {
    setActiveTopic(topicName);
    setScreen('topic-questions');
    setSearchQuery('');
    setSelectedQuestions([]);
  };

  const handleBackToTopics = () => {
    setScreen('topics');
    setActiveTopic(null);
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
    setSelectedQuestions(topicQuestions);
  };

  const handleClearSelection = () => {
    setSelectedQuestions([]);
  };

  const handleAddToQuiz = () => {
    if (selectedQuestions.length === 0) {
      toast.error('Please select at least one question');
      return;
    }
    addQuestionsMutation.mutate(selectedQuestions);
  };

  const handleCreateTestQuestions = async () => {
    setCreating(true);
    setTestResult(null);
    const created = [];
    const errors = [];

    try {
      for (let i = 0; i < 3; i++) {
        try {
          const record = await base44.entities.GlobalQuestion.create({
            subject_name: "Maths",
            topic_name: "Fractions",
            year_group: 7,
            difficulty: "easy",
            question_type: "mcq",
            question_text: `TEST ${i + 1}: 1/2 + 1/4 = ?`,
            choices: ["1/4", "1/2", "3/4", "1"],
            correct_answer: "3/4"
          });
          created.push({ id: record.id, question_text: record.question_text });
        } catch (err) {
          errors.push(`Record ${i + 1}: ${err.message || err.toString()}`);
        }
      }

      // Immediate read-back
      const verify = await base44.entities.GlobalQuestion.list('-created_date', 50);

      setTestResult({
        success: true,
        createdIds: created.map(c => c.id),
        createdTexts: created.map(c => c.question_text),
        errors: errors,
        verifyTotal: verify.length,
        verifyFirst3: verify.slice(0, 3).map(q => q.question_text)
      });

      // Refresh the list
      queryClient.invalidateQueries(['globalQuestions']);
    } catch (err) {
      setTestResult({
        success: false,
        error: err.message || err.toString()
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] h-[95vh] p-0 gap-0 bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 border-white/10">
        {/* Header */}
        <DialogHeader className="border-b border-white/10 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {screen !== 'filters' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={screen === 'topic-questions' ? handleBackToTopics : () => setScreen('filters')}
                  className="text-slate-400 hover:text-white"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              )}
              <div className="flex items-center gap-2">
                <Database className="w-6 h-6 text-purple-400" />
                <DialogTitle className="text-xl text-white">
                  {screen === 'filters' && 'Global Question Bank - Filters'}
                  {screen === 'topics' && 'Select a Topic'}
                  {screen === 'topic-questions' && activeTopic}
                </DialogTitle>
              </div>
            </div>
            {screen === 'topic-questions' && (
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
            <Button variant="ghost" size="icon" onClick={handleClose} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Filters Screen */}
          {screen === 'filters' && (
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
              <div className="mb-6">
                <p className="text-slate-400">
                  {filteredByFilters.length} questions found after filters. Click a topic to browse questions.
                </p>
              </div>

              {topics.length === 0 ? (
                <div className="text-center py-12">
                  <FolderOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">No topics found with the selected filters</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {topics.map(topic => (
                    <Card
                      key={topic.name}
                      className="p-6 bg-white/5 border-white/10 hover:bg-white/10 transition-all cursor-pointer"
                      onClick={() => handleSelectTopic(topic.name)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-purple-500/20 flex items-center justify-center">
                          <FolderOpen className="w-7 h-7 text-purple-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg text-white">{topic.name}</h3>
                          <p className="text-sm text-slate-400">{topic.count} question{topic.count !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Topic Questions Screen */}
          {screen === 'topic-questions' && (
            <div>
              {/* Search and Actions */}
              <div className="mb-6">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    placeholder="Search questions in this topic..."
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
                      Select All ({topicQuestions.length})
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
                    {topicQuestions.length} questions
                  </Badge>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-3">
                {topicQuestions.map((question, idx) => {
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

                {topicQuestions.length === 0 && (
                  <div className="text-center py-12">
                    <Database className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">
                      {searchQuery ? 'No questions match your search' : 'No questions in this topic'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}