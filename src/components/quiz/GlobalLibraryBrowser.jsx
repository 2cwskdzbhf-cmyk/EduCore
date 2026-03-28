import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import GlassCard from '@/components/ui/GlassCard';
import { Search, Globe, ChevronDown, ChevronUp, CheckCircle2, BookOpen } from 'lucide-react';

const DIFFICULTY_COLORS = {
  easy: 'bg-emerald-500/20 text-emerald-300',
  medium: 'bg-amber-500/20 text-amber-300',
  hard: 'bg-red-500/20 text-red-300',
};

const TYPE_LABELS = {
  mcq: 'Multiple Choice',
  numeric: 'Numeric',
  short: 'Short Answer',
};

function QuestionCard({ q, index }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <GlassCard className="p-5">
      <div className="flex items-start gap-3">
        <span className="text-slate-500 text-sm font-mono mt-0.5 w-6 flex-shrink-0">{index + 1}.</span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-2 mb-2">
            <Badge className="bg-blue-500/20 text-blue-300">Year {q.year_group}</Badge>
            <Badge className={DIFFICULTY_COLORS[q.difficulty] || 'bg-white/10 text-slate-300'}>
              {q.difficulty}
            </Badge>
            <Badge className="bg-purple-500/20 text-purple-300">
              {TYPE_LABELS[q.question_type] || q.question_type}
            </Badge>
            {q.subject_name && (
              <Badge className="bg-slate-500/20 text-slate-300">{q.subject_name}</Badge>
            )}
          </div>

          <p className="text-white font-medium leading-snug mb-3">{q.question_text}</p>

          {/* MCQ choices */}
          {q.question_type === 'mcq' && q.choices?.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-3">
              {q.choices.map((choice, idx) => (
                <div
                  key={idx}
                  className={`text-sm px-3 py-1.5 rounded-lg flex items-center gap-2 ${
                    choice === q.correct_answer
                      ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/50'
                      : 'bg-white/5 text-slate-300'
                  }`}
                >
                  {choice === q.correct_answer && <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />}
                  <span>{String.fromCharCode(65 + idx)}. {choice}</span>
                </div>
              ))}
            </div>
          )}

          {/* Non-MCQ answer */}
          {q.question_type !== 'mcq' && q.correct_answer && (
            <div className="text-sm px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-300 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Answer: <strong>{q.correct_answer}</strong></span>
            </div>
          )}

          {/* Explanation toggle */}
          {q.explanation && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expanded ? 'Hide explanation' : 'Show explanation'}
            </button>
          )}
          {expanded && q.explanation && (
            <div className="mt-2 text-sm text-slate-300 bg-white/5 rounded-lg px-3 py-2 border-l-2 border-purple-500/50">
              {q.explanation}
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

export default function GlobalLibraryBrowser() {
  const [search, setSearch] = useState('');
  const [yearGroup, setYearGroup] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [questionType, setQuestionType] = useState('all');

  const { data: allQuestions = [], isLoading } = useQuery({
    queryKey: ['globalQuestions'],
    queryFn: () => base44.entities.GlobalQuestion.list('-created_date', 5000),
    staleTime: 60000,
  });

  const filtered = allQuestions.filter(q => {
    if (yearGroup !== 'all' && q.year_group !== parseInt(yearGroup)) return false;
    if (difficulty !== 'all' && q.difficulty !== difficulty) return false;
    if (questionType !== 'all' && q.question_type !== questionType) return false;
    if (search && !q.question_text?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: allQuestions.length,
    easy: allQuestions.filter(q => q.difficulty === 'easy').length,
    medium: allQuestions.filter(q => q.difficulty === 'medium').length,
    hard: allQuestions.filter(q => q.difficulty === 'hard').length,
  };

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="flex flex-wrap gap-3">
        <GlassCard className="px-4 py-2 flex items-center gap-2">
          <Globe className="w-4 h-4 text-purple-400" />
          <span className="text-white font-semibold">{stats.total}</span>
          <span className="text-slate-400 text-sm">total questions</span>
        </GlassCard>
        <GlassCard className="px-4 py-2">
          <span className="text-emerald-400 font-semibold">{stats.easy}</span>
          <span className="text-slate-400 text-sm ml-1">easy</span>
        </GlassCard>
        <GlassCard className="px-4 py-2">
          <span className="text-amber-400 font-semibold">{stats.medium}</span>
          <span className="text-slate-400 text-sm ml-1">medium</span>
        </GlassCard>
        <GlassCard className="px-4 py-2">
          <span className="text-red-400 font-semibold">{stats.hard}</span>
          <span className="text-slate-400 text-sm ml-1">hard</span>
        </GlassCard>
        <GlassCard className="px-4 py-2">
          <span className="text-blue-400 font-semibold">{filtered.length}</span>
          <span className="text-slate-400 text-sm ml-1">showing</span>
        </GlassCard>
      </div>

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search questions..."
              className="pl-10 bg-white/5 border-white/10 text-white"
            />
          </div>

          <Select value={yearGroup} onValueChange={setYearGroup}>
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

          <Select value={difficulty} onValueChange={setDifficulty}>
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

          <Select value={questionType} onValueChange={setQuestionType}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="mcq">Multiple Choice</SelectItem>
              <SelectItem value="numeric">Numeric</SelectItem>
              <SelectItem value="short">Short Answer</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </GlassCard>

      {/* Questions list */}
      {isLoading ? (
        <GlassCard className="p-12 text-center">
          <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading global library...</p>
        </GlassCard>
      ) : allQuestions.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <Globe className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <p className="text-white font-semibold mb-2">Global library is empty</p>
          <p className="text-slate-400 text-sm">Ask an admin to seed the algebra question bank from the Admin panel.</p>
        </GlassCard>
      ) : filtered.length === 0 ? (
        <GlassCard className="p-10 text-center">
          <BookOpen className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-400">No questions match your filters.</p>
          <Button variant="ghost" onClick={() => { setSearch(''); setYearGroup('all'); setDifficulty('all'); setQuestionType('all'); }} className="mt-3 text-purple-400">
            Clear filters
          </Button>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {filtered.map((q, idx) => (
            <QuestionCard key={q.id} q={q} index={idx} />
          ))}
        </div>
      )}
    </div>
  );
}