import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import GlassCard from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { BookOpen, Edit2, Trash2, Play, Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

export default function QuizManagement({ teacherEmail }) {
  const queryClient = useQueryClient();

  const { data: quizSets = [], isLoading } = useQuery({
    queryKey: ['teacherQuizSets', teacherEmail],
    queryFn: async () => {
      if (!teacherEmail) return [];
      return base44.entities.QuizSet.filter({ owner_email: teacherEmail }, '-created_date');
    },
    enabled: !!teacherEmail
  });

  const deleteQuizMutation = useMutation({
    mutationFn: async (quizSetId) => {
      // Delete questions first
      const questions = await base44.entities.QuizQuestion.filter({ quiz_set_id: quizSetId });
      await Promise.all(questions.map(q => base44.entities.QuizQuestion.delete(q.id)));
      // Delete quiz set
      await base44.entities.QuizSet.delete(quizSetId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['teacherQuizSets']);
    }
  });

  if (isLoading) {
    return (
      <GlassCard className="p-6">
        <Skeleton className="h-8 w-48 mb-4 bg-white/10" />
        <div className="space-y-3">
          <Skeleton className="h-20 bg-white/10" />
          <Skeleton className="h-20 bg-white/10" />
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-bold text-white">My Quizzes</h3>
        </div>
        <Link to={createPageUrl('CreateQuiz')}>
          <Button size="sm" className="bg-gradient-to-r from-purple-500 to-blue-500">
            Create Quiz
          </Button>
        </Link>
      </div>

      {quizSets.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No quizzes created yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {quizSets.slice(0, 5).map((quiz, i) => (
            <motion.div
              key={quiz.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white/5 p-4 rounded-xl hover:bg-white/10 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-white mb-1">{quiz.title}</h4>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>{quiz.question_count || 0} questions</span>
                    <span>•</span>
                    <span className={`capitalize ${quiz.status === 'published' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {quiz.status}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-slate-400 hover:text-white"
                    onClick={() => {/* View quiz */}}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-red-400 hover:text-red-300"
                    onClick={() => {
                      if (confirm('Delete this quiz?')) {
                        deleteQuizMutation.mutate(quiz.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
          {quizSets.length > 5 && (
            <Link to={createPageUrl('QuizLibrary')}>
              <Button variant="ghost" className="w-full text-slate-400 hover:text-white">
                View all {quizSets.length} quizzes
              </Button>
            </Link>
          )}
        </div>
      )}
    </GlassCard>
  );
}