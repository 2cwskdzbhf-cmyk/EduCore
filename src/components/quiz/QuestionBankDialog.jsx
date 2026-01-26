import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, Plus, Filter, Folder, History, Users, Upload, Star, Sparkles, TrendingUp, Calendar, User, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FolderManager from './FolderManager';
import VersionHistoryDialog from './VersionHistoryDialog';
import BulkImportCSVDialog from './BulkImportCSVDialog';

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
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [sortBy, setSortBy] = useState('created_date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [selectedCreator, setSelectedCreator] = useState('all');
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const { data: allQuestions = [] } = useQuery({
    queryKey: ['questionBankAll'],
    queryFn: async () => {
      console.log('🔍 Fetching questions from entity: QuizQuestion');
      const questions = await base44.entities.QuizQuestion.list('-created_date', 5000);
      console.log(`✅ Loaded ${questions.length} QuizQuestion records from database`);
      
      // Filter by access - show owned questions, shared questions, or questions where teacher is collaborator
      const accessibleQuestions = questions.filter(q => 
        q.owner_email === teacherEmail || 
        q.collaborator_emails?.includes(teacherEmail) ||
        !q.owner_email // legacy questions without owner
      );
      
      console.log(`✅ ${accessibleQuestions.length} questions accessible to teacher`);
      return accessibleQuestions;
    },
    enabled: open && !!teacherEmail
  });

  // Apply filters client-side
  const questions = allQuestions.filter(q => {
    // Folder filter
    if (selectedFolder !== 'all' && q.folder_id !== selectedFolder) return false;
    return true;
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

  const { data: topics = [] } = useQuery({
    queryKey: ['topics'],
    queryFn: () => base44.entities.Topic.list(),
    enabled: open
  });

  const { data: allCreators = [] } = useQuery({
    queryKey: ['questionCreators'],
    queryFn: async () => {
      const allQuestions = await base44.entities.QuizQuestion.filter({ is_reusable: true });
      const creators = [...new Set(allQuestions.map(q => q.owner_email).filter(Boolean))];
      return creators;
    },
    enabled: open
  });

  console.log(`📊 Fetched ${allQuestions.length} questions before filters`);
  console.log(`📊 ${questions.length} after folder filter`);

  const filteredQuestions = questions
    .filter(q => {
      if (search && !q.prompt?.toLowerCase().includes(search.toLowerCase())) return false;
      if (selectedType !== 'all' && q.question_type !== selectedType) return false;
      if (selectedDifficulty !== 'all' && q.difficulty !== selectedDifficulty) return false;
      if (selectedTags.length > 0 && !selectedTags.some(tag => q.tags?.includes(tag))) return false;
      if (selectedTopic !== 'all' && q.topic_id !== selectedTopic) return false;
      if (selectedCreator !== 'all' && q.owner_email !== selectedCreator) return false;
      return true;
    })
    .sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'created_date':
          aVal = new Date(a.created_date || 0).getTime();
          bVal = new Date(b.created_date || 0).getTime();
          break;
        case 'rating':
          aVal = a.average_rating || 0;
          bVal = b.average_rating || 0;
          break;
        case 'usage':
          aVal = a.usage_count || 0;
          bVal = b.usage_count || 0;
          break;
        case 'effectiveness':
          aVal = a.effectiveness_score || 0;
          bVal = b.effectiveness_score || 0;
          break;
        default:
          return 0;
      }
      
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });

  console.log(`📊 Showing ${filteredQuestions.length} after all filters`);

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

  const handleBulkImport = async (importedQuestions) => {
    for (const q of importedQuestions) {
      await base44.entities.QuizQuestion.create({
        ...q,
        quiz_set_id: 'bank',
        usage_count: 0,
        rating_count: 0
      });
    }
    queryClient.invalidateQueries(['questionBank']);
  };

  const rateQuestionMutation = useMutation({
    mutationFn: async ({ questionId, rating }) => {
      const existing = await base44.entities.QuestionRating.filter({
        question_id: questionId,
        teacher_email: teacherEmail
      });

      if (existing.length > 0) {
        await base44.entities.QuestionRating.update(existing[0].id, { rating });
      } else {
        await base44.entities.QuestionRating.create({
          question_id: questionId,
          teacher_email: teacherEmail,
          rating
        });
      }

      const allRatings = await base44.entities.QuestionRating.filter({ question_id: questionId });
      const avgRating = allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;

      await base44.entities.QuizQuestion.update(questionId, {
        average_rating: avgRating,
        rating_count: allRatings.length
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['questionBankAll']);
    }
  });

  const getSimilarQuestions = async (questionId) => {
    setLoadingAI(true);
    try {
      const question = questions.find(q => q.id === questionId);
      if (!question) return;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Given this question: "${question.prompt}"
        
Analyze this question and:
1. Suggest 3 related questions that could be asked on the same topic
2. Check if there might be duplicates in this question bank and list their IDs if any seem very similar

Available questions in bank:
${questions.slice(0, 50).map(q => `ID: ${q.id}, Prompt: ${q.prompt}`).join('\n')}

Respond in JSON format.`,
        response_json_schema: {
          type: 'object',
          properties: {
            related_questions: {
              type: 'array',
              items: { type: 'string' }
            },
            potential_duplicates: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        }
      });

      setAiSuggestions(response);
      setShowAISuggestions(true);
    } catch (error) {
      console.error('AI suggestions failed:', error);
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-white/10 max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-white">Question Bank</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="browse" className="space-y-4">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="browse">Browse</TabsTrigger>
            <TabsTrigger value="import">Bulk Import</TabsTrigger>
            <TabsTrigger value="ai">AI Tools</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search questions..."
                className="pl-10 bg-white/5 border-white/10 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_date">Date Created</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                  <SelectItem value="usage">Usage Count</SelectItem>
                  <SelectItem value="effectiveness">Effectiveness</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Descending</SelectItem>
                  <SelectItem value="asc">Ascending</SelectItem>
                </SelectContent>
              </Select>
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

            <Select value={selectedCreator} onValueChange={setSelectedCreator}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Creator" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Creators</SelectItem>
                {allCreators.map(email => (
                  <SelectItem key={email} value={email}>{email}</SelectItem>
                ))}
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

            {/* Questions List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 max-h-96">
              <div className="mb-3 p-2 bg-purple-500/10 border border-purple-500/30 rounded text-xs text-purple-300">
                Loaded: {allQuestions.length} questions | After filters: {filteredQuestions.length}
              </div>
          {filteredQuestions.length === 0 ? (
            <div className="text-center py-8">
              <Filter className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-50" />
              {allQuestions.length === 0 ? (
                <>
                  <p className="text-amber-400 font-semibold">No questions in the Question Bank yet</p>
                  <p className="text-slate-400 text-sm mt-1">Create reusable questions to see them here</p>
                </>
              ) : (
                <>
                  <p className="text-blue-400 font-semibold">No questions match the current filters</p>
                  <p className="text-slate-400 text-sm mt-1">{allQuestions.length} questions available - adjust filters to see them</p>
                </>
              )}
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
                      {q.average_rating && (
                        <Badge className="text-xs bg-amber-500/20 text-amber-300 flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-300" />
                          {q.average_rating.toFixed(1)}
                        </Badge>
                      )}
                      {q.usage_count > 0 && (
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {q.usage_count}
                        </Badge>
                      )}
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
                        getSimilarQuestions(q.id);
                      }}
                      className="h-8 w-8 text-slate-400 hover:text-purple-400"
                      title="AI Suggestions"
                    >
                      <Sparkles className="w-4 h-4" />
                    </Button>
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
          </TabsContent>

          <TabsContent value="import">
            <div className="p-6 text-center">
              <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Bulk Import Questions</h3>
              <p className="text-sm text-slate-400 mb-6">Import multiple questions at once from a CSV file</p>
              <Button
                onClick={() => setShowBulkImport(true)}
                className="bg-gradient-to-r from-purple-500 to-blue-500"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import from CSV
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="ai">
            <div className="p-6 space-y-4">
              <div className="text-center">
                <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">AI-Powered Tools</h3>
                <p className="text-sm text-slate-400 mb-6">Use AI to find duplicates, get suggestions, and improve questions</p>
              </div>

              {showAISuggestions && aiSuggestions && (
                <div className="space-y-4">
                  {aiSuggestions.potential_duplicates?.length > 0 && (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-5 h-5 text-amber-400" />
                        <h4 className="font-semibold text-amber-400">Potential Duplicates Found</h4>
                      </div>
                      <p className="text-sm text-slate-300">
                        {aiSuggestions.potential_duplicates.length} similar question(s) detected
                      </p>
                    </div>
                  )}

                  {aiSuggestions.related_questions?.length > 0 && (
                    <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <h4 className="font-semibold text-blue-400 mb-3">Related Question Suggestions</h4>
                      <div className="space-y-2">
                        {aiSuggestions.related_questions.map((suggestion, idx) => (
                          <div key={idx} className="text-sm text-slate-300 p-2 bg-white/5 rounded">
                            {suggestion}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!showAISuggestions && (
                <p className="text-sm text-slate-400 text-center">
                  Click the <Sparkles className="w-4 h-4 inline" /> icon on any question to get AI-powered suggestions
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>

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

        {/* Bulk Import Dialog */}
        <BulkImportCSVDialog
          open={showBulkImport}
          onOpenChange={setShowBulkImport}
          onImport={handleBulkImport}
          teacherEmail={teacherEmail}
          topicId={subjectId}
        />

        <div className="flex justify-between items-center pt-4 border-t border-white/10 mt-4">
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
      </DialogContent>
    </Dialog>
  );
}