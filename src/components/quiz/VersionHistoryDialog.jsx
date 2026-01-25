import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { History, RotateCcw, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

export default function VersionHistoryDialog({ open, onOpenChange, questionId, onRevert }) {
  const queryClient = useQueryClient();

  const { data: versions = [] } = useQuery({
    queryKey: ['questionVersions', questionId],
    queryFn: async () => {
      if (!questionId) return [];
      return base44.entities.QuestionVersion.filter({ question_id: questionId }, '-version_number');
    },
    enabled: !!questionId && open
  });

  const { data: currentQuestion } = useQuery({
    queryKey: ['currentQuestion', questionId],
    queryFn: async () => {
      if (!questionId) return null;
      const questions = await base44.entities.QuizQuestion.filter({ id: questionId });
      return questions[0] || null;
    },
    enabled: !!questionId && open
  });

  const revertMutation = useMutation({
    mutationFn: async (version) => {
      // Update question with version data
      await base44.entities.QuizQuestion.update(questionId, {
        prompt: version.prompt,
        question_type: version.question_type,
        options: version.options,
        correct_index: version.correct_index,
        correct_answer: version.correct_answer,
        explanation: version.explanation,
        tags: version.tags,
        difficulty: version.difficulty,
        current_version: (currentQuestion?.current_version || 0) + 1,
        last_edited_by: version.edited_by,
        last_edited_at: new Date().toISOString()
      });

      // Create new version entry for the revert
      await base44.entities.QuestionVersion.create({
        question_id: questionId,
        version_number: (currentQuestion?.current_version || 0) + 1,
        prompt: version.prompt,
        question_type: version.question_type,
        options: version.options,
        correct_index: version.correct_index,
        correct_answer: version.correct_answer,
        explanation: version.explanation,
        tags: version.tags,
        difficulty: version.difficulty,
        edited_by: version.edited_by,
        change_notes: `Reverted to version ${version.version_number}`
      });

      if (onRevert) onRevert();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['questionVersions']);
      queryClient.invalidateQueries(['currentQuestion']);
      onOpenChange(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-white/10 max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <History className="w-5 h-5" />
            Version History
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {versions.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No version history yet</p>
            </div>
          ) : (
            versions.map((version, i) => (
              <motion.div
                key={version.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white/5 p-4 rounded-xl border border-white/10"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-purple-500/20 rounded text-xs font-bold text-purple-300">
                      v{version.version_number}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatDistanceToNow(new Date(version.created_date), { addSuffix: true })}
                    </span>
                  </div>
                  {i > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (confirm('Revert to this version?')) {
                          revertMutation.mutate(version);
                        }
                      }}
                      className="text-xs"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Revert
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <div>
                    <p className="text-white font-medium">{version.prompt}</p>
                  </div>
                  
                  {version.question_type && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400">Type:</span>
                      <span className="text-slate-300 capitalize">{version.question_type.replace('_', ' ')}</span>
                    </div>
                  )}

                  {version.difficulty && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400">Difficulty:</span>
                      <span className="text-slate-300 capitalize">{version.difficulty}</span>
                    </div>
                  )}

                  {version.tags && version.tags.length > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400">Tags:</span>
                      <span className="text-slate-300">{version.tags.join(', ')}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-slate-400 pt-2 border-t border-white/10">
                    <Clock className="w-3 h-3" />
                    <span>Edited by {version.edited_by?.split('@')[0]}</span>
                    {version.change_notes && (
                      <>
                        <span>•</span>
                        <span className="italic">{version.change_notes}</span>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}