import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import GlassCard from '@/components/ui/GlassCard';
import CollabDocEditor from './CollabDocEditor';
import { Plus, FileText, Trash2, Users, Clock, HardDrive } from 'lucide-react';

export default function CollabDocsTab({ user, classId }) {
  const queryClient = useQueryClient();
  const [editingDoc, setEditingDoc] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['collabDocs', classId, user?.email],
    queryFn: async () => {
      const all = await base44.entities.CollabDoc.list('-updated_date', 50);
      return all.filter(d =>
        d.owner_email === user?.email ||
        (d.collaborator_emails || []).includes(user?.email) ||
        (classId && d.class_id === classId)
      );
    },
    enabled: !!user?.email,
    refetchInterval: 5000,
  });

  const createMutation = useMutation({
    mutationFn: () => base44.entities.CollabDoc.create({
      title: newTitle.trim() || 'Untitled Document',
      owner_email: user.email,
      class_id: classId || null,
      collaborator_emails: [],
      content: '',
    }),
    onSuccess: (doc) => {
      queryClient.invalidateQueries(['collabDocs']);
      setCreating(false);
      setNewTitle('');
      setEditingDoc(doc);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CollabDoc.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['collabDocs']),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-400" />
          <h2 className="text-white font-bold text-xl">Collaborative Docs</h2>
          <span className="text-slate-500 text-sm">({docs.length})</span>
        </div>
        {!creating && (
          <Button onClick={() => setCreating(true)} className="bg-gradient-to-r from-emerald-500 to-teal-500 h-9 text-sm">
            <Plus className="w-4 h-4 mr-1.5" /> New Doc
          </Button>
        )}
      </div>

      <AnimatePresence>
        {creating && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <GlassCard className="p-4 border-emerald-500/30" hover={false}>
              <p className="text-sm text-slate-400 mb-3">Name your new document</p>
              <div className="flex gap-2">
                <Input
                  autoFocus
                  placeholder="e.g. Chapter 3 Notes"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') createMutation.mutate(); if (e.key === 'Escape') setCreating(false); }}
                  className="bg-white/5 border-white/10 text-white flex-1"
                />
                <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="bg-emerald-500">
                  {createMutation.isPending ? 'Creating...' : 'Create'}
                </Button>
                <Button variant="outline" onClick={() => setCreating(false)} className="border-white/20 text-white">Cancel</Button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}
        </div>
      ) : docs.length === 0 ? (
        <GlassCard className="p-12 text-center" hover={false}>
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 font-medium">No documents yet</p>
          <p className="text-slate-500 text-sm mt-1">Create a shared doc to collaborate in real-time with classmates.</p>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {docs.map((doc, i) => (
            <motion.div key={doc.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <GlassCard className="p-4 flex items-center gap-3 cursor-pointer hover:bg-white/10 transition-all group"
                hover={false} onClick={() => setEditingDoc(doc)}>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{doc.title}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {doc.last_edited_name && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Users className="w-3 h-3" /> {doc.last_edited_name}
                      </span>
                    )}
                    {doc.updated_date && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {new Date(doc.updated_date).toLocaleDateString()}
                      </span>
                    )}
                    {doc.drive_file_url && (
                      <span className="text-xs text-blue-400 flex items-center gap-1">
                        <HardDrive className="w-3 h-3" /> Drive
                      </span>
                    )}
                    {(doc.collaborator_emails || []).length > 0 && (
                      <span className="text-xs text-purple-400">{doc.collaborator_emails.length} collaborator{doc.collaborator_emails.length !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                </div>
                {doc.owner_email === user?.email && (
                  <button
                    onClick={e => { e.stopPropagation(); if (confirm('Delete this document?')) deleteMutation.mutate(doc.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {editingDoc && (
          <CollabDocEditor
            doc={editingDoc}
            user={user}
            onClose={() => setEditingDoc(null)}
            onSaved={() => queryClient.invalidateQueries(['collabDocs'])}
          />
        )}
      </AnimatePresence>
    </div>
  );
}