import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Folder, Plus, Trash2, Edit2, Users, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Switch } from '@/components/ui/switch';

export default function FolderManager({ open, onOpenChange, teacherEmail, onSelectFolder }) {
  const queryClient = useQueryClient();
  const [editingFolder, setEditingFolder] = useState(null);
  const [newFolder, setNewFolder] = useState({ name: '', description: '', is_shared: false });

  const { data: folders = [] } = useQuery({
    queryKey: ['questionFolders', teacherEmail],
    queryFn: async () => {
      const owned = await base44.entities.QuestionFolder.filter({ owner_email: teacherEmail });
      const shared = await base44.entities.QuestionFolder.filter({ is_shared: true });
      return [...owned, ...shared.filter(s => !owned.find(o => o.id === s.id))];
    },
    enabled: !!teacherEmail && open
  });

  const createFolderMutation = useMutation({
    mutationFn: async (folderData) => {
      return base44.entities.QuestionFolder.create({
        ...folderData,
        owner_email: teacherEmail,
        collaborator_emails: []
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['questionFolders']);
      setNewFolder({ name: '', description: '', is_shared: false });
    }
  });

  const updateFolderMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return base44.entities.QuestionFolder.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['questionFolders']);
      setEditingFolder(null);
    }
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (folderId) => {
      return base44.entities.QuestionFolder.delete(folderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['questionFolders']);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-white/10 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white">Manage Question Folders</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Create New Folder */}
          <div className="bg-white/5 p-4 rounded-xl border border-white/10">
            <h4 className="text-white font-semibold mb-3">Create New Folder</h4>
            <div className="space-y-3">
              <div>
                <Label className="text-slate-300">Folder Name</Label>
                <Input
                  value={newFolder.name}
                  onChange={(e) => setNewFolder({ ...newFolder, name: e.target.value })}
                  placeholder="e.g., Algebra Questions"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">Description</Label>
                <Textarea
                  value={newFolder.description}
                  onChange={(e) => setNewFolder({ ...newFolder, description: e.target.value })}
                  placeholder="Brief description..."
                  className="bg-white/5 border-white/10 text-white"
                  rows={2}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newFolder.is_shared}
                    onCheckedChange={(checked) => setNewFolder({ ...newFolder, is_shared: checked })}
                  />
                  <Label className="text-slate-300">Share with all teachers</Label>
                </div>
                <Button
                  onClick={() => createFolderMutation.mutate(newFolder)}
                  disabled={!newFolder.name || createFolderMutation.isPending}
                  className="bg-gradient-to-r from-purple-500 to-blue-500"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create
                </Button>
              </div>
            </div>
          </div>

          {/* Existing Folders */}
          <div>
            <h4 className="text-white font-semibold mb-3">Your Folders</h4>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {folders.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Folder className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No folders yet</p>
                </div>
              ) : (
                folders.map((folder, i) => (
                  <motion.div
                    key={folder.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white/5 p-4 rounded-xl hover:bg-white/10 transition-all cursor-pointer"
                    onClick={() => {
                      onSelectFolder(folder.id);
                      onOpenChange(false);
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <Folder className="w-5 h-5 text-purple-400 flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <h5 className="text-white font-medium">{folder.name}</h5>
                          {folder.description && (
                            <p className="text-xs text-slate-400 mt-1">{folder.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            {folder.is_shared && (
                              <span className="flex items-center gap-1 text-xs text-emerald-400">
                                <Share2 className="w-3 h-3" />
                                Shared
                              </span>
                            )}
                            {folder.owner_email === teacherEmail && (
                              <span className="text-xs text-slate-400">Owner</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {folder.owner_email === teacherEmail && (
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-red-400 hover:text-red-300"
                            onClick={() => {
                              if (confirm('Delete this folder?')) {
                                deleteFolderMutation.mutate(folder.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}