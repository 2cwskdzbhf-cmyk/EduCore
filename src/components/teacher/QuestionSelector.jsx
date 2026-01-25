import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Filter } from 'lucide-react';

export default function QuestionSelector({ open, onOpenChange, classYearGroup, onSelectQuestions }) {
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedQuestions, setSelectedQuestions] = useState([]);

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => base44.entities.Subject.list(),
    enabled: open
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['topics', selectedSubject],
    queryFn: () => {
      if (selectedSubject === 'all') return base44.entities.Topic.list();
      return base44.entities.Topic.filter({ subject_id: selectedSubject });
    },
    enabled: open
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['questions-filtered', classYearGroup, selectedSubject, selectedTopic, selectedDifficulty, selectedType],
    queryFn: async () => {
      const filter = {
        is_active: true,
        year_group: classYearGroup
      };
      if (selectedSubject !== 'all') filter.subject_id = selectedSubject;
      if (selectedTopic !== 'all') filter.topic_id = selectedTopic;
      if (selectedDifficulty !== 'all') filter.difficulty = selectedDifficulty;
      if (selectedType !== 'all') filter.question_type = selectedType;
      return base44.entities.Question.filter(filter);
    },
    enabled: open && !!classYearGroup
  });

  const filteredQuestions = questions.filter(q =>
    search === '' || q.question_text.toLowerCase().includes(search.toLowerCase())
  );

  const toggleQuestion = (qId) => {
    setSelectedQuestions(prev =>
      prev.includes(qId) ? prev.filter(id => id !== qId) : [...prev, qId]
    );
  };

  const handleAdd = () => {
    const questionsToAdd = questions.filter(q => selectedQuestions.includes(q.id));
    onSelectQuestions(questionsToAdd);
    setSelectedQuestions([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-white/10 max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            Select Questions (Year {classYearGroup} only)
            <Badge className="bg-blue-500/20 text-blue-300">Year {classYearGroup}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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

          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {filteredQuestions.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Filter className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No Year {classYearGroup} questions found for these filters</p>
              </div>
            ) : (
              filteredQuestions.map(q => (
                <div
                  key={q.id}
                  onClick={() => toggleQuestion(q.id)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedQuestions.includes(q.id)
                      ? 'bg-purple-500/20 border-purple-500/50'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-white font-medium mb-2">{q.question_text}</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-xs">{q.question_type?.replace('_', ' ')}</Badge>
                        <Badge variant="outline" className="text-xs">{q.difficulty}</Badge>
                        <Badge className="text-xs bg-green-500/20 text-green-300">{q.marks} mark(s)</Badge>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      selectedQuestions.includes(q.id)
                        ? 'bg-purple-500 border-purple-500'
                        : 'border-slate-400'
                    }`}>
                      {selectedQuestions.includes(q.id) && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-white/10">
          <span className="text-sm text-slate-400">
            {selectedQuestions.length} selected
          </span>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="border-white/20 text-white">
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={selectedQuestions.length === 0}
              className="bg-gradient-to-r from-purple-500 to-blue-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Questions
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}