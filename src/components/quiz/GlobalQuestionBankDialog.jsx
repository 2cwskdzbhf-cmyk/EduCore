import React, { useState } from 'react';
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
  Database
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export default function GlobalQuestionBankDialog({ open, onClose, onAddQuestions, quizSetId }) {
  const queryClient = useQueryClient();
  const [screen, setScreen] = useState('subjects'); // 'subjects' | 'filters' | 'questions'
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedYearGroup, setSelectedYearGroup] = useState('7');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuestions, setSelectedQuestions] = useState([]);

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => base44.entities.Subject.list(),
    enabled: open
  });

  const { data: globalQuestions = [] } = useQuery({
    queryKey: ['globalQuestions'],
    queryFn: () => base44.entities.GlobalQuestion.list('-created_date', 5000),
    enabled: open && screen === 'questions'
  });

  const addQuestionsMutation = useMutation({
    mutationFn: async (questions) => {
      // Copy each global question to QuizQuestion entity
      const order = await base44.entities.QuizQuestion.filter({ quiz_set_id: quizSetId }).then(qs => qs.length);
      
      for (let i = 0; i < questions.length; i++) {
        const gq = questions[i];
        await base44.entities.QuizQuestion.create({
          quiz_set_id: quizSetId,
          order: order + i,
          prompt: gq.question_text,
          question_type: gq.question_type === 'mcq' ? 'multiple_choice' : 'short_answer',
          options: gq.choices || [],
          correct_index: gq.choices ? gq.choices.indexOf(gq.correct_answer) : undefined,
          correct_answer: gq.correct_answer,
          explanation: gq.explanation,
          difficulty: gq.difficulty,
          year_group: gq.year_group,
          source_global_id: gq.id
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['quizQuestions']);
      onAddQuestions?.(selectedQuestions.length);
      handleClose();
    }
  });

  const filteredQuestions = globalQuestions.filter(q => {
    if (selectedYearGroup !== 'all' && q.year_group !== parseInt(selectedYearGroup)) return false;
    if (selectedDifficulty !== 'all' && q.difficulty !== selectedDifficulty) return false;
    if (selectedType !== 'all' && q.question_type !== selectedType) return false;
    if (searchQuery && !q.question_text.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleClose = () => {
    setScreen('subjects');
    setSelectedSubject(null);
    setSelectedYearGroup('7');
    setSelectedDifficulty('all');
    setSelectedType('all');
    setSearchQuery('');
    setSelectedQuestions([]);
    onClose();
  };

  const handleSelectSubject = (subject) => {
    setSelectedSubject(subject);
    setScreen('filters');
  };

  const handleApplyFilters = () => {
    setScreen('questions');
  };

  const toggleQuestion = (question) => {
    setSelectedQuestions(prev => 
      prev.find(q => q.id === question.id)
        ? prev.filter(q => q.id !== question.id)
        : [...prev, question]
    );
  };

  const handleAddToQuiz = () => {
    addQuestionsMutation.mutate(selectedQuestions);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] h-[95vh] p-0 gap-0">
        {/* Header */}
        <DialogHeader className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {screen !== 'subjects' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setScreen(screen === 'questions' ? 'filters' : 'subjects')}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              )}
              <div className="flex items-center gap-2">
                <Database className="w-6 h-6 text-blue-600" />
                <DialogTitle className="text-xl">
                  {screen === 'subjects' && 'Global Question Bank'}
                  {screen === 'filters' && `${selectedSubject?.name} - Filters`}
                  {screen === 'questions' && `${selectedSubject?.name} - Questions`}
                </DialogTitle>
              </div>
            </div>
            {screen === 'questions' && (
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-sm">
                  {selectedQuestions.length} selected
                </Badge>
                <Button
                  onClick={handleAddToQuiz}
                  disabled={selectedQuestions.length === 0 || addQuestionsMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {addQuestionsMutation.isPending ? 'Adding...' : `Add ${selectedQuestions.length} to Quiz`}
                </Button>
              </div>
            )}
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Subjects Screen */}
          {screen === 'subjects' && (
            <div>
              <p className="text-slate-600 mb-6">
                Select a subject to browse global questions. Total questions: <strong>{globalQuestions.length}</strong>
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjects.map(subject => (
                  <Card
                    key={subject.id}
                    className="p-6 hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => handleSelectSubject(subject)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-xl bg-${subject.color}-100 flex items-center justify-center`}>
                        <BookOpen className={`w-7 h-7 text-${subject.color}-600`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-slate-900">{subject.name}</h3>
                        <p className="text-sm text-slate-500">{subject.description || 'Browse questions'}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Filters Screen */}
          {screen === 'filters' && (
            <div className="max-w-2xl mx-auto">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Filter Questions</h3>
                <p className="text-sm text-slate-600">Narrow down questions by year, difficulty, and type</p>
              </div>

              <div className="space-y-6 bg-slate-50 rounded-xl p-6">
                <div>
                  <Label className="mb-2">Year Group</Label>
                  <Select value={selectedYearGroup} onValueChange={setSelectedYearGroup}>
                    <SelectTrigger>
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
                  <Label className="mb-2">Difficulty</Label>
                  <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                    <SelectTrigger>
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
                  <Label className="mb-2">Question Type</Label>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger>
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
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  <Filter className="w-5 h-5 mr-2" />
                  Apply Filters
                </Button>
              </div>
            </div>
          )}

          {/* Questions Screen */}
          {screen === 'questions' && (
            <div>
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    placeholder="Search questions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2 mt-4">
                  <Badge variant="outline">Year {selectedYearGroup}</Badge>
                  {selectedDifficulty !== 'all' && <Badge variant="outline">{selectedDifficulty}</Badge>}
                  {selectedType !== 'all' && <Badge variant="outline">{selectedType}</Badge>}
                  <Badge className="ml-auto">{filteredQuestions.length} questions found</Badge>
                </div>
              </div>

              <div className="space-y-3">
                {filteredQuestions.map((question, idx) => {
                  const isSelected = selectedQuestions.find(q => q.id === question.id);
                  return (
                    <Card
                      key={question.id}
                      className={`p-4 cursor-pointer transition-all ${
                        isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'
                      }`}
                      onClick={() => toggleQuestion(question)}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'bg-blue-600' : 'bg-slate-100'
                        }`}>
                          {isSelected ? (
                            <Check className="w-5 h-5 text-white" />
                          ) : (
                            <span className="text-sm font-medium text-slate-600">{idx + 1}</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-slate-900 font-medium mb-2">{question.question_text}</p>
                          {question.choices && question.choices.length > 0 && (
                            <div className="space-y-1 mb-3">
                              {question.choices.map((choice, i) => (
                                <div key={i} className={`text-sm px-3 py-1.5 rounded ${
                                  choice === question.correct_answer
                                    ? 'bg-green-50 text-green-700 border border-green-200'
                                    : 'bg-slate-50 text-slate-600'
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
                            <Badge variant="outline" className="text-xs">
                              {question.question_type === 'mcq' ? 'Multiple Choice' :
                               question.question_type === 'numeric' ? 'Numeric' : 'Short Answer'}
                            </Badge>
                            <Badge variant="outline" className="text-xs">Year {question.year_group}</Badge>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}

                {filteredQuestions.length === 0 && (
                  <div className="text-center py-12">
                    <Database className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">No questions found with the selected filters</p>
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