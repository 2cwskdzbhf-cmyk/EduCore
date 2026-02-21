import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Search, Filter, Edit, Trash2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import GlassCard from '@/components/ui/GlassCard';
import { createPageUrl } from '@/utils';
import ErrorBoundary from '@/components/ErrorBoundary';
import CollaborationPanel from '@/components/quiz/CollaborationPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function QuestionBankContent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [selectedYearGroup, setSelectedYearGroup] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [search, setSearch] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => base44.entities.Subject.list()
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['topics', selectedSubject],
    queryFn: () => {
      if (selectedSubject === 'all') return base44.entities.Topic.list();
      return base44.entities.Topic.filter({ subject_id: selectedSubject });
    }
  });

  const { data: allQuestions = [], isLoading: questionsLoading } = useQuery({
    queryKey: ['allQuestions'],
    queryFn: async () => {
      console.log('🔍 Fetching questions from entity: Question');
      const questions = await base44.entities.Question.list('-created_date', 5000);
      console.log(`✅ Loaded ${questions.length} questions from database`);
      return questions;
    },
    enabled: !!user,
    refetchOnWindowFocus: false,
    staleTime: 30000
  });

  // Apply filters client-side
  const questions = allQuestions.filter(q => {
    if (selectedSubject !== 'all' && q.subject_id !== selectedSubject) return false;
    if (selectedTopic !== 'all' && q.topic_id !== selectedTopic) return false;
    if (selectedYearGroup !== 'all' && q.year_group !== parseInt(selectedYearGroup)) return false;
    if (selectedDifficulty !== 'all' && q.difficulty !== selectedDifficulty) return false;
    if (selectedType !== 'all' && q.question_type !== selectedType) return false;
    return true;
  });

  const filteredQuestions = questions.filter(q =>
    search === '' || q.question_text.toLowerCase().includes(search.toLowerCase())
  );

  const deleteQuestionMutation = useMutation({
    mutationFn: (id) => base44.entities.Question.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['allQuestions'])
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <Tabs defaultValue="questions" className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(createPageUrl('TeacherDashboard'))}
              className="text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">Question Bank</h1>
              <div className="flex items-center gap-4 mt-1">
                <p className="text-slate-400">Browse and manage questions by year group</p>
                <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Loaded: {allQuestions.length} questions
                </Badge>
                <Badge className="bg-purple-500/20 text-purple-300">
                  Filtered: {questions.length}
                </Badge>
                <Badge className="bg-blue-500/20 text-blue-300">
                  {topics.length} topic(s)
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <TabsList className="bg-white/5 border border-white/10 mb-6">
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="collaboration">Collaboration</TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="space-y-6">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setEditingQuestion(null);
                setShowCreateDialog(true);
              }}
              className="bg-gradient-to-r from-purple-500 to-blue-500"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Question
            </Button>
          </div>

        <GlassCard className="p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search questions..."
                className="pl-10 bg-white/5 border-white/10 text-white"
              />
            </div>

            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedTopic} onValueChange={setSelectedTopic}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Topic" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Topics</SelectItem>
                {topics.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedYearGroup} onValueChange={setSelectedYearGroup}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Year Group" />
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
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulties</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                <SelectItem value="true_false">True/False</SelectItem>
                <SelectItem value="short_answer">Short Answer</SelectItem>
                <SelectItem value="written_answer">Written Answer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </GlassCard>

        <div className="grid gap-4">
          {questionsLoading ? (
            <GlassCard className="p-12 text-center">
              <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-400">Loading questions...</p>
            </GlassCard>
          ) : allQuestions.length === 0 ? (
            <GlassCard className="p-12 text-center bg-amber-500/10 border-amber-500/30">
              <BookOpen className="w-12 h-12 text-amber-400 mx-auto mb-4" />
              <p className="text-amber-400 font-semibold mb-2">⚠️ No questions in database!</p>
              <p className="text-slate-400 text-sm mb-4">Seed the database with 60+ questions to get started.</p>
              <Button
                onClick={() => {
                  const url = createPageUrl('AdminSeedQuestions');
                  console.log('Navigating to AdminSeedQuestions:', url);
                  navigate(url);
                }}
                className="bg-gradient-to-r from-amber-500 to-orange-500"
              >
                Open AdminSeedQuestions
              </Button>
            </GlassCard>
          ) : filteredQuestions.length === 0 ? (
            <GlassCard className="p-12 text-center bg-blue-500/10 border-blue-500/30">
              <Filter className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <p className="text-blue-400 font-semibold mb-2">
                {allQuestions.length} questions exist, but none match your filters
              </p>
              <p className="text-slate-400 text-sm">Try adjusting your filters to see more results.</p>
            </GlassCard>
          ) : (
            filteredQuestions.map(q => {
              const subject = subjects.find(s => s.id === q.subject_id);
              const topic = topics.find(t => t.id === q.topic_id);
              
              return (
                <GlassCard key={q.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge className="bg-blue-500/20 text-blue-300">
                          Year {q.year_group || '?'}
                        </Badge>
                        <Badge variant="outline">{q.difficulty || 'Unknown'}</Badge>
                        <Badge variant="outline">{q.question_type?.replace('_', ' ') || 'Unknown type'}</Badge>
                        <Badge className="bg-green-500/20 text-green-300">{q.marks || 1} mark(s)</Badge>
                        <Badge className={subject ? "bg-purple-500/20 text-purple-300" : "bg-amber-500/20 text-amber-300"}>
                          {subject ? subject.name : '⚠️ Unlinked subject'}
                        </Badge>
                        <Badge className={topic ? "bg-cyan-500/20 text-cyan-300" : "bg-amber-500/20 text-amber-300"}>
                          {topic ? topic.name : '⚠️ Unlinked topic'}
                        </Badge>
                      </div>
                      <p className="text-white text-lg font-medium mb-3">{q.question_text || 'No question text'}</p>
                    {q.options && q.options.length > 0 && (
                      <div className="space-y-1 mb-3">
                        {q.options.map((opt, idx) => (
                          <div
                            key={idx}
                            className={`text-sm px-3 py-2 rounded ${
                              opt === q.correct_answer
                                ? 'bg-green-500/20 text-green-300'
                                : 'bg-white/5 text-slate-300'
                            }`}
                          >
                            {opt}
                          </div>
                        ))}
                      </div>
                    )}
                    {q.question_type !== 'multiple_choice' && (
                      <p className="text-sm text-green-300 bg-green-500/10 px-3 py-2 rounded">
                        Answer: {q.correct_answer}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditingQuestion(q);
                        setShowCreateDialog(true);
                      }}
                      className="text-slate-400 hover:text-white"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm('Deactivate this question?')) {
                          deleteQuestionMutation.mutate(q.id);
                        }
                      }}
                      className="text-slate-400 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </GlassCard>
              );
            })
          )}
        </div>

        <QuestionFormDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          question={editingQuestion}
          subjects={subjects}
          topics={topics}
          teacherEmail={user?.email}
        />
        </TabsContent>

        <TabsContent value="collaboration">
          <CollaborationPanel teacherEmail={user?.email} />
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}

function QuestionFormDialog({ open, onOpenChange, question, subjects, topics, teacherEmail }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    subject_id: '',
    topic_id: '',
    year_group: 7,
    difficulty: 'medium',
    question_type: 'multiple_choice',
    question_text: '',
    options: ['', '', '', ''],
    correct_answer: '',
    marks: 1,
    explanation: '',
    ...question
  });

  React.useEffect(() => {
    if (question) {
      setFormData({ ...question });
    } else {
      setFormData({
        subject_id: '',
        topic_id: '',
        year_group: 7,
        difficulty: 'medium',
        question_type: 'multiple_choice',
        question_text: '',
        options: ['', '', '', ''],
        correct_answer: '',
        marks: 1,
        explanation: ''
      });
    }
  }, [question, open]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        ...data,
        created_by: teacherEmail,
        is_active: true
      };
      if (question) {
        return base44.entities.Question.update(question.id, payload);
      }
      return base44.entities.Question.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allQuestions']);
      onOpenChange(false);
    }
  });

  const handleSubmit = () => {
    const data = { ...formData };
    if (formData.question_type !== 'multiple_choice') {
      delete data.options;
    }
    saveMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">
            {question ? 'Edit Question' : 'Create Question'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-white">Subject</Label>
              <Select value={formData.subject_id} onValueChange={(v) => setFormData({ ...formData, subject_id: v })}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white">Topic</Label>
              <Select value={formData.topic_id} onValueChange={(v) => setFormData({ ...formData, topic_id: v })}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Select topic" />
                </SelectTrigger>
                <SelectContent>
                  {topics.filter(t => t.subject_id === formData.subject_id).map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-white">Year Group</Label>
              <Select value={String(formData.year_group)} onValueChange={(v) => setFormData({ ...formData, year_group: parseInt(v) })}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[7, 8, 9, 10, 11].map(y => (
                    <SelectItem key={y} value={String(y)}>Year {y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white">Difficulty</Label>
              <Select value={formData.difficulty} onValueChange={(v) => setFormData({ ...formData, difficulty: v })}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white">Marks</Label>
              <Input
                type="number"
                value={formData.marks}
                onChange={(e) => setFormData({ ...formData, marks: parseInt(e.target.value) })}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
          </div>

          <div>
            <Label className="text-white">Question Type</Label>
            <Select value={formData.question_type} onValueChange={(v) => setFormData({ ...formData, question_type: v })}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                <SelectItem value="true_false">True/False</SelectItem>
                <SelectItem value="short_answer">Short Answer</SelectItem>
                <SelectItem value="written_answer">Written Answer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-white">Question Text</Label>
            <Textarea
              value={formData.question_text}
              onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
              className="bg-white/5 border-white/10 text-white"
              rows={3}
            />
          </div>

          {formData.question_type === 'multiple_choice' && (
            <div>
              <Label className="text-white">Options</Label>
              {formData.options.map((opt, idx) => (
                <Input
                  key={idx}
                  value={opt}
                  onChange={(e) => {
                    const newOpts = [...formData.options];
                    newOpts[idx] = e.target.value;
                    setFormData({ ...formData, options: newOpts });
                  }}
                  placeholder={`Option ${idx + 1}`}
                  className="bg-white/5 border-white/10 text-white mb-2"
                />
              ))}
            </div>
          )}

          <div>
            <Label className="text-white">Correct Answer</Label>
            {formData.question_type === 'multiple_choice' ? (
              <Select value={formData.correct_answer} onValueChange={(v) => setFormData({ ...formData, correct_answer: v })}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Select correct option" />
                </SelectTrigger>
                <SelectContent>
                  {formData.options.filter(o => o).map((opt, idx) => (
                    <SelectItem key={idx} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={formData.correct_answer}
                onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
              />
            )}
          </div>

          <div>
            <Label className="text-white">Explanation (Optional)</Label>
            <Textarea
              value={formData.explanation}
              onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
              className="bg-white/5 border-white/10 text-white"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="border-white/20 text-white">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.subject_id || !formData.topic_id || !formData.question_text || !formData.correct_answer}
              className="bg-gradient-to-r from-purple-500 to-blue-500"
            >
              {question ? 'Update' : 'Create'} Question
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function QuestionBank() {
  return (
    <ErrorBoundary>
      <QuestionBankContent />
    </ErrorBoundary>
  );
}