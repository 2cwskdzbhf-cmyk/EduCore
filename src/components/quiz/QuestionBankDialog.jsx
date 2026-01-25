import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, Plus, Filter, Folder, History, Users } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FolderManager from './FolderManager';
import VersionHistoryDialog from './VersionHistoryDialog';

export default function QuestionBankDialog({ open, onOpenChange, onAddQuestions, subjectId, topicId, teacherEmail }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [showFolderManager, setShowFolderManager] = useState(false);
  const [versionHistoryQuestion, setVersionHistoryQuestion] = useState(null);

  const { data: questions = [] } = useQuery({
    queryKey: ['questionBank', subjectId, topicId, selectedFolder],
    queryFn: async () => {
      let filter = { is_reusable: true };
      if (selectedFolder !== 'all') {
        filter.folder_id = selectedFolder;
      }
      const allQuestions = await base44.entities.QuizQuestion.filter(filter);
      // Filter by access - show owned questions, shared questions, or questions where teacher is collaborator
      return allQuestions.filter(q => 
        q.owner_email === teacherEmail || 
        q.collaborator_emails?.includes(teacherEmail) ||
        !q.owner_email // legacy questions without owner
      );
    },
    enabled: open && !!teacherEmail
  });

  const { data: folders = [] } = useQuery({
    queryKey: ['questionFolders', teacherEmail],
    queryFn: async () => {
      const owned = await base44.entities.QuestionFolder.filter({ owner_email: teacherEmail });
      const shared = await base44.entities.QuestionFolder.filter({ is_shared: true });
      return [...owned, ...shared.filter(s => !owned.find(o => o.id === s.id))];
    },
    enabled: !!teacherEmail && open
  });

  const filteredQuestions = questions.filter(q => {
    if (search && !q.prompt.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedType !== 'all' && q.question_type !== selectedType) return false;
    if (selectedDifficulty !== 'all' && q.difficulty !== selectedDifficulty) return false;
    if (selectedTags.length > 0 && !selectedTags.some(tag => q.tags?.includes(tag))) return false;
    return true;
  });

  const allTags = [...new Set(questions.flatMap(q => q.tags || []))];

  const toggleQuestion = (questionId) => {
    setSelectedQuestions(prev =>
      prev.includes(questionId) ? prev.filter(id => id !== questionId) : [...prev, questionId]
    );
  };

  const handleAdd = () => {
    const questionsToAdd = questions.filter(q => selectedQuestions.includes(q.id));
    onAddQuestions(questionsToAdd);
    setSelectedQuestions([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-white/10 max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-white">Question Bank</DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions..."
              className="pl-10 bg-white/5 border-white/10 text-white"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Select value={selectedFolder} onValueChange={setSelectedFolder}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Folder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Folders</SelectItem>
                {folders.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
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
                <SelectItem value="written">Written</SelectItem>
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
          </div>

          <Button
            variant="outline"
            onClick={() => setShowFolderManager(true)}
            className="w-full"
          >
            <Folder className="w-4 h-4 mr-2" />
            Manage Folders
          </Button>

          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setSelectedTags(prev =>
                    prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                  )}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Questions List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {filteredQuestions.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Filter className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No questions found</p>
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
                    <p className="text-white font-medium mb-2">{q.prompt}</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs">
                        {q.question_type?.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {q.difficulty}
                      </Badge>
                      {q.tags?.map(tag => (
                        <Badge key={tag} className="text-xs bg-blue-500/20 text-blue-300">
                          {tag}
                        </Badge>
                      ))}
                      {q.collaborator_emails && q.collaborator_emails.length > 0 && (
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {q.collaborator_emails.length}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setVersionHistoryQuestion(q.id);
                      }}
                      className="h-8 w-8 text-slate-400 hover:text-white"
                    >
                      <History className="w-4 h-4" />
                    </Button>
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
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t border-white/10">
          <span className="text-sm text-slate-400">
            {selectedQuestions.length} selected
          </span>
          <Button
            onClick={handleAdd}
            disabled={selectedQuestions.length === 0}
            className="bg-gradient-to-r from-purple-500 to-blue-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add to Quiz
          </Button>
        </div>

        {/* Folder Manager Dialog */}
        <FolderManager
          open={showFolderManager}
          onOpenChange={setShowFolderManager}
          teacherEmail={teacherEmail}
          onSelectFolder={(folderId) => {
            setSelectedFolder(folderId);
            setShowFolderManager(false);
          }}
        />

        {/* Version History Dialog */}
        <VersionHistoryDialog
          open={!!versionHistoryQuestion}
          onOpenChange={(open) => !open && setVersionHistoryQuestion(null)}
          questionId={versionHistoryQuestion}
          onRevert={() => {
            queryClient.invalidateQueries(['questionBank']);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}