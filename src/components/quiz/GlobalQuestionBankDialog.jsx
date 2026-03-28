import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X, Check, Sparkles, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function GlobalQuestionBankDialog({ open, onClose, onAddQuestions, quizSetId }) {
  const [yearGroup, setYearGroup] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setSelected([]);
      setSearch('');
    }
  }, [open]);

  const { data: globalQuestions = [], isLoading } = useQuery({
    queryKey: ['globalQuestions', yearGroup, difficulty],
    queryFn: async () => {
      const filters = {};
      if (yearGroup !== 'all') filters.year_group = Number(yearGroup);
      if (difficulty !== 'all') filters.difficulty = difficulty;
      return base44.entities.GlobalQuestion.filter(filters, '-created_date', 500);
    },
    enabled: open
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return globalQuestions;
    const q = search.toLowerCase();
    return globalQuestions.filter(x => (x.question_text || '').toLowerCase().includes(q));
  }, [globalQuestions, search]);

  const toggle = (q) => {
    setSelected(prev =>
      prev.find(x => x.id === q.id) ? prev.filter(x => x.id !== q.id) : [...prev, q]
    );
  };

  const isSelected = (q) => !!selected.find(x => x.id === q.id);

  const handleApply = () => {
    if (!selected.length) {
      toast.error('Select at least one question');
      return;
    }

    // Map GlobalQuestion fields → QuizQuestion format and pass directly to parent
    const mapped = selected.map(q => {
      const choices = q.choices || q.options || [];
      let correctIndex = typeof q.correct_index === 'number' ? q.correct_index : -1;
      if (correctIndex < 0 && q.correct_answer && choices.length) {
        correctIndex = choices.findIndex(c =>
          String(c).toLowerCase().trim() === String(q.correct_answer).toLowerCase().trim()
        );
      }
      return {
        prompt: q.question_text || '',
        question_type: 'multiple_choice',
        options: choices.length === 4 ? choices : [...choices, ...Array(4 - choices.length).fill('')],
        correct_index: Math.max(0, correctIndex),
        correct_answer: q.correct_answer || (choices[correctIndex] ?? ''),
        difficulty: q.difficulty || 'medium',
        explanation: q.explanation || '',
        tags: q.tags || [],
        image_url: '',
        option_images: ['', '', '', ''],
        source_global_id: q.id,
        _isDraft: false
      };
    });

    onAddQuestions?.(mapped);
    toast.success(`Added ${mapped.length} question${mapped.length !== 1 ? 's' : ''}`);
    onClose?.();
  };

  const difficultyColor = {
    easy: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    medium: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    hard: 'bg-red-500/20 text-red-300 border-red-500/30',
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="max-w-3xl max-h-[92vh] p-0 gap-0 bg-slate-950/95 backdrop-blur-2xl border border-white/10 flex flex-col overflow-hidden rounded-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Global Question Bank</h2>
              <p className="text-xs text-slate-400">{globalQuestions.length} questions available</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-white/10 flex gap-3 items-center flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search questions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 bg-white/5 border-white/10 text-white placeholder:text-slate-500 text-sm"
            />
          </div>

          <Select value={yearGroup} onValueChange={setYearGroup}>
            <SelectTrigger className="w-32 h-9 bg-white/5 border-white/10 text-white text-sm">
              <SelectValue placeholder="Year" />
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
            <SelectTrigger className="w-32 h-9 bg-white/5 border-white/10 text-white text-sm">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>

          {selected.length > 0 && (
            <button
              onClick={() => setSelected([])}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Clear ({selected.length})
            </button>
          )}
        </div>

        {/* Question List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
              <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
              Loading questions…
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-500">No questions match your filters</div>
          ) : (
            filtered.map((q) => {
              const choices = q.choices || q.options || [];
              const sel = isSelected(q);
              return (
                <button
                  key={q.id}
                  onClick={() => toggle(q)}
                  className={cn(
                    "w-full text-left rounded-xl border p-4 transition-all duration-150 group",
                    sel
                      ? "bg-purple-500/15 border-purple-500/50 ring-1 ring-purple-500/40"
                      : "bg-white/3 border-white/8 hover:bg-white/8 hover:border-white/20"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <div className={cn(
                      "w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all",
                      sel ? "bg-purple-500 border-purple-500" : "border-white/20 group-hover:border-white/40"
                    )}>
                      {sel && <Check className="w-3 h-3 text-white" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Meta badges */}
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {q.year_group && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            Year {q.year_group}
                          </span>
                        )}
                        {q.difficulty && (
                          <span className={cn("text-xs px-2 py-0.5 rounded-full border", difficultyColor[q.difficulty] || difficultyColor.medium)}>
                            {q.difficulty}
                          </span>
                        )}
                        {q.topic_name && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-400 border border-slate-500/20">
                            {q.topic_name}
                          </span>
                        )}
                      </div>

                      {/* Question text */}
                      <p className="text-white text-sm font-medium leading-snug mb-3">
                        {q.question_text}
                      </p>

                      {/* Answer choices */}
                      {choices.length > 0 && (
                        <div className="grid grid-cols-2 gap-1.5">
                          {choices.map((c, ci) => {
                            const isCorrect = c === q.correct_answer ||
                              ci === q.correct_index ||
                              (typeof q.correct_index === 'number' && ci === q.correct_index);
                            return (
                              <div
                                key={ci}
                                className={cn(
                                  "text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5",
                                  isCorrect
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                    : "bg-white/5 text-slate-400 border border-white/5"
                                )}
                              >
                                <span className="font-bold text-slate-500">{String.fromCharCode(65 + ci)}.</span>
                                {c}
                                {isCorrect && <Check className="w-3 h-3 ml-auto flex-shrink-0" />}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Explanation */}
                      {q.explanation && (
                        <p className="text-xs text-slate-500 mt-2 italic leading-snug">
                          💡 {q.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between gap-4 bg-slate-950/50">
          <div className="text-sm text-slate-400">
            {selected.length > 0 ? (
              <span className="text-purple-300 font-medium">{selected.length} selected</span>
            ) : (
              <span>Click questions to select</span>
            )}
            {filtered.length > 0 && (
              <button
                onClick={() => setSelected(filtered)}
                className="ml-3 text-xs text-slate-500 hover:text-slate-300 transition-colors underline"
              >
                Select all {filtered.length}
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-slate-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              disabled={!selected.length}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 shadow-lg shadow-purple-500/30 gap-2"
            >
              <ChevronRight className="w-4 h-4" />
              Add {selected.length > 0 ? selected.length : ''} Questions
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}