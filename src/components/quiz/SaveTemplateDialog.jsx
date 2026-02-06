import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Save, X } from 'lucide-react';

export default function SaveTemplateDialog({ open, onClose, quizData, userEmail }) {
  const queryClient = useQueryClient();
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [isShared, setIsShared] = useState(false);

  const saveTemplateMutation = useMutation({
    mutationFn: async () => {
      if (!templateName.trim()) throw new Error('Template name is required');
      
      await base44.entities.QuizTemplate.create({
        name: templateName.trim(),
        description: templateDescription.trim(),
        owner_email: userEmail,
        subject_id: quizData.subject_id || '',
        topic_id: quizData.topic_id || '',
        time_limit_per_question: quizData.time_limit_per_question || 15000,
        questions: quizData.questions || [],
        is_shared: isShared,
        usage_count: 0
      });
    },
    onSuccess: () => {
      toast.success('Template saved successfully');
      queryClient.invalidateQueries(['quizTemplates']);
      setTemplateName('');
      setTemplateDescription('');
      setIsShared(false);
      onClose();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save template');
    }
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 border-white/10">
        <DialogHeader className="border-b border-white/10 pb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Save as Template</h2>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div>
            <Label className="text-slate-300">Template Name *</Label>
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g., Year 9 Fractions Quiz"
              className="mt-1 bg-white/5 border-white/10 text-white"
            />
          </div>

          <div>
            <Label className="text-slate-300">Description</Label>
            <Textarea
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              placeholder="Describe this template..."
              className="mt-1 bg-white/5 border-white/10 text-white"
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between bg-white/5 p-4 rounded-lg">
            <div>
              <Label className="text-white">Share with other teachers</Label>
              <p className="text-xs text-slate-400">Allow others to use this template</p>
            </div>
            <Switch checked={isShared} onCheckedChange={setIsShared} />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={() => saveTemplateMutation.mutate()}
              disabled={!templateName.trim() || saveTemplateMutation.isPending}
              className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Template
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}