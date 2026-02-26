import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { BookOpen, Plus, Smile, Brain, Target, Award, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ReflectionsSection({ studentEmail }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    reflection_type: 'learning_journal',
    mood: 'confident',
    visibility: 'private',
    tags: []
  });

  const { data: reflections = [] } = useQuery({
    queryKey: ['reflections', studentEmail],
    queryFn: () => base44.entities.StudentReflection.filter({ student_email: studentEmail }, '-created_date'),
    enabled: !!studentEmail
  });

  const createReflectionMutation = useMutation({
    mutationFn: (data) => base44.entities.StudentReflection.create({
      ...data,
      student_email: studentEmail
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['reflections']);
      setShowDialog(false);
      setFormData({
        title: '',
        content: '',
        reflection_type: 'learning_journal',
        mood: 'confident',
        visibility: 'private',
        tags: []
      });
      toast.success('Reflection saved');
    },
    onError: () => toast.error('Failed to save reflection')
  });

  const moodIcons = {
    confident: '😊',
    confused: '🤔',
    excited: '🎉',
    challenged: '💪',
    proud: '🌟'
  };

  const reflectionTypeLabels = {
    self_assessment: 'Self Assessment',
    learning_journal: 'Learning Journal',
    goal_setting: 'Goal Setting',
    achievement: 'Achievement'
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            My Reflections
          </CardTitle>
          <Button
            onClick={() => setShowDialog(true)}
            className="bg-gradient-to-r from-purple-500 to-blue-500"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Reflection
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {reflections.map((reflection, index) => (
            <motion.div
              key={reflection.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-4 bg-white/5 rounded-lg border border-white/10"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{moodIcons[reflection.mood]}</span>
                    <h4 className="text-white font-medium">{reflection.title || 'Reflection'}</h4>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      {reflectionTypeLabels[reflection.reflection_type]}
                    </Badge>
                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                      {reflection.visibility === 'private' ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {reflection.visibility}
                    </Badge>
                  </div>
                </div>
                <span className="text-xs text-slate-400">
                  {new Date(reflection.created_date).toLocaleDateString()}
                </span>
              </div>
              <p className="text-slate-300 text-sm">{reflection.content}</p>
            </motion.div>
          ))}
          {reflections.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Start documenting your learning journey</p>
            </div>
          )}
        </div>
      </CardContent>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-slate-900 border-white/10 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">New Reflection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white">Title (Optional)</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Give your reflection a title..."
                className="mt-1 bg-white/5 border-white/10 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Type</Label>
                <Select value={formData.reflection_type} onValueChange={(v) => setFormData({ ...formData, reflection_type: v })}>
                  <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="learning_journal">Learning Journal</SelectItem>
                    <SelectItem value="self_assessment">Self Assessment</SelectItem>
                    <SelectItem value="goal_setting">Goal Setting</SelectItem>
                    <SelectItem value="achievement">Achievement</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-white">How are you feeling?</Label>
                <Select value={formData.mood} onValueChange={(v) => setFormData({ ...formData, mood: v })}>
                  <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confident">😊 Confident</SelectItem>
                    <SelectItem value="confused">🤔 Confused</SelectItem>
                    <SelectItem value="excited">🎉 Excited</SelectItem>
                    <SelectItem value="challenged">💪 Challenged</SelectItem>
                    <SelectItem value="proud">🌟 Proud</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-white">Your Thoughts</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="What did you learn? What challenges did you face? What are your goals?"
                className="mt-1 bg-white/5 border-white/10 text-white min-h-[150px]"
              />
            </div>

            <div>
              <Label className="text-white">Visibility</Label>
              <Select value={formData.visibility} onValueChange={(v) => setFormData({ ...formData, visibility: v })}>
                <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private (Only Me)</SelectItem>
                  <SelectItem value="teacher">Share with Teacher</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={() => createReflectionMutation.mutate(formData)}
              disabled={!formData.content.trim() || createReflectionMutation.isPending}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500"
            >
              Save Reflection
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}