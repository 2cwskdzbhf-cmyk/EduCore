import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Share2, X, Users, Check, UserPlus } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export default function ShareQuestionDialog({ open, onOpenChange, questionId, currentCollaborators = [], isFolder = false }) {
  const queryClient = useQueryClient();
  const [emailInput, setEmailInput] = useState('');
  const [makePublic, setMakePublic] = useState(false);
  const [collaborators, setCollaborators] = useState(currentCollaborators);

  // Fetch all teachers for suggestions
  const { data: allTeachers = [] } = useQuery({
    queryKey: ['allTeachers'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => u.user_type === 'teacher' || u.role === 'teacher');
    },
    enabled: open
  });

  const addCollaboratorMutation = useMutation({
    mutationFn: async ({ email }) => {
      const entity = isFolder ? 'QuestionFolder' : 'QuizQuestion';
      const current = await base44.entities[entity].filter({ id: questionId });
      
      if (!current[0]) throw new Error('Item not found');
      
      const existingCollabs = current[0].collaborator_emails || [];
      if (existingCollabs.includes(email)) {
        throw new Error('Teacher already has access');
      }

      await base44.entities[entity].update(questionId, {
        collaborator_emails: [...existingCollabs, email]
      });

      return email;
    },
    onSuccess: (email) => {
      setCollaborators(prev => [...prev, email]);
      setEmailInput('');
      toast.success(`Shared with ${email}`);
      queryClient.invalidateQueries(['questionBank']);
      queryClient.invalidateQueries(['questionFolders']);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to share');
    }
  });

  const removeCollaboratorMutation = useMutation({
    mutationFn: async ({ email }) => {
      const entity = isFolder ? 'QuestionFolder' : 'QuizQuestion';
      const current = await base44.entities[entity].filter({ id: questionId });
      
      if (!current[0]) throw new Error('Item not found');
      
      const existingCollabs = current[0].collaborator_emails || [];
      
      await base44.entities[entity].update(questionId, {
        collaborator_emails: existingCollabs.filter(e => e !== email)
      });

      return email;
    },
    onSuccess: (email) => {
      setCollaborators(prev => prev.filter(e => e !== email));
      toast.success(`Removed ${email}`);
      queryClient.invalidateQueries(['questionBank']);
      queryClient.invalidateQueries(['questionFolders']);
    },
    onError: (error) => {
      toast.error('Failed to remove collaborator');
    }
  });

  const togglePublicMutation = useMutation({
    mutationFn: async (isPublic) => {
      const entity = isFolder ? 'QuestionFolder' : 'QuizQuestion';
      await base44.entities[entity].update(questionId, {
        is_shared: isPublic,
        visibility: isPublic ? 'global' : 'private'
      });
    },
    onSuccess: (isPublic) => {
      setMakePublic(isPublic);
      toast.success(isPublic ? 'Made public to all teachers' : 'Made private');
      queryClient.invalidateQueries(['questionBank']);
      queryClient.invalidateQueries(['questionFolders']);
    },
    onError: () => {
      toast.error('Failed to update visibility');
    }
  });

  const handleAddCollaborator = () => {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    
    // Basic email validation
    if (!email.includes('@')) {
      toast.error('Please enter a valid email');
      return;
    }

    addCollaboratorMutation.mutate({ email });
  };

  const filteredTeachers = allTeachers.filter(t => 
    t.email.toLowerCase().includes(emailInput.toLowerCase()) &&
    !collaborators.includes(t.email)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share {isFolder ? 'Folder' : 'Question'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Public Toggle */}
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white font-medium">Make Public</Label>
                <p className="text-xs text-slate-400 mt-1">
                  Share with all teachers in the platform
                </p>
              </div>
              <Switch
                checked={makePublic}
                onCheckedChange={(checked) => togglePublicMutation.mutate(checked)}
              />
            </div>
          </div>

          {/* Add Collaborator */}
          <div>
            <Label className="text-white">Share with specific teacher</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="Enter teacher email..."
                className="bg-white/5 border-white/10 text-white"
                onKeyPress={(e) => e.key === 'Enter' && handleAddCollaborator()}
              />
              <Button
                onClick={handleAddCollaborator}
                disabled={!emailInput.trim() || addCollaboratorMutation.isPending}
                className="bg-purple-500 hover:bg-purple-600"
              >
                <UserPlus className="w-4 h-4" />
              </Button>
            </div>

            {/* Suggestions */}
            {emailInput && filteredTeachers.length > 0 && (
              <div className="mt-2 bg-white/5 border border-white/10 rounded-lg p-2 max-h-40 overflow-y-auto">
                {filteredTeachers.slice(0, 5).map(teacher => (
                  <button
                    key={teacher.email}
                    onClick={() => {
                      setEmailInput(teacher.email);
                      addCollaboratorMutation.mutate({ email: teacher.email });
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-white/10 rounded text-sm text-white flex items-center gap-2"
                  >
                    <Users className="w-3 h-3 text-purple-400" />
                    {teacher.full_name || teacher.email}
                    <span className="text-xs text-slate-400 ml-auto">{teacher.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Current Collaborators */}
          {collaborators.length > 0 && (
            <div>
              <Label className="text-white">Collaborators ({collaborators.length})</Label>
              <div className="mt-2 space-y-2">
                {collaborators.map(email => (
                  <div
                    key={email}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-400" />
                      <span className="text-white text-sm">{email}</span>
                      <Badge className="bg-green-500/20 text-green-200 text-xs">
                        <Check className="w-3 h-3 mr-1" />
                        Can Edit
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeCollaboratorMutation.mutate({ email })}
                      className="text-slate-400 hover:text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {collaborators.length === 0 && !makePublic && (
            <div className="text-center py-6 text-slate-400">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No collaborators yet</p>
              <p className="text-xs mt-1">Add teachers to enable co-editing</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}