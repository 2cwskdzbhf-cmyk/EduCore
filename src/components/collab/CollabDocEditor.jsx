import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import GlassCard from '@/components/ui/GlassCard';
import { X, Save, Users, Clock, CheckCircle2, Upload } from 'lucide-react';

function Avatar({ name, email }) {
  const letter = (name || email || '?').charAt(0).toUpperCase();
  return (
    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0" title={name || email}>
      {letter}
    </div>
  );
}

export default function CollabDocEditor({ doc, user, onClose, onSaved }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(doc.title);
  const [content, setContent] = useState(doc.content || '');
  const [savedAt, setSavedAt] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const autoSaveRef = useRef(null);
  const textareaRef = useRef(null);

  // Real-time sync: poll for changes every 4s when not actively editing
  const [lastSyncedContent, setLastSyncedContent] = useState(doc.content || '');
  const isEditingRef = useRef(false);

  useEffect(() => {
    const unsubscribe = base44.entities.CollabDoc.subscribe((event) => {
      if (event.id !== doc.id) return;
      if (event.data?.last_edited_by === user.email) return; // own update
      if (!isEditingRef.current) {
        setContent(event.data?.content || '');
        setTitle(event.data?.title || title);
        setLastSyncedContent(event.data?.content || '');
      }
    });
    return unsubscribe;
  }, [doc.id, user.email]);

  const saveMutation = useMutation({
    mutationFn: () => base44.entities.CollabDoc.update(doc.id, {
      title,
      content,
      last_edited_by: user.email,
      last_edited_name: user.full_name || user.email.split('@')[0],
    }),
    onSuccess: () => {
      setSavedAt(new Date());
      setIsDirty(false);
      queryClient.invalidateQueries(['collabDocs']);
      if (onSaved) onSaved();
    }
  });

  // Autosave after 2s of inactivity
  const handleContentChange = useCallback((val) => {
    setContent(val);
    setIsDirty(true);
    isEditingRef.current = true;
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => {
      isEditingRef.current = false;
    }, 3000);
  }, []);

  // Autosave trigger
  useEffect(() => {
    if (!isDirty) return;
    const t = setTimeout(() => {
      saveMutation.mutate();
    }, 2000);
    return () => clearTimeout(t);
  }, [content, title, isDirty]);

  // Upload to Drive
  const [uploading, setUploading] = useState(false);
  const handleExportToDrive = async () => {
    setUploading(true);
    try {
      const base64 = btoa(unescape(encodeURIComponent(content)));
      const res = await base44.functions.invoke('driveUploadFile', {
        fileName: `${title}.txt`,
        mimeType: 'text/plain',
        base64Content: base64,
      });
      if (res.data?.file) {
        await base44.entities.CollabDoc.update(doc.id, {
          drive_file_id: res.data.file.id,
          drive_file_url: res.data.file.webViewLink,
        });
        queryClient.invalidateQueries(['collabDocs']);
        alert(`Saved to Drive: ${res.data.file.name}`);
      }
    } catch (e) {
      alert('Drive export failed: ' + e.message);
    }
    setUploading(false);
  };

  const collaboratorNames = doc.collaborator_emails || [];

  return (
    <motion.div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-4xl max-h-[90vh] flex flex-col"
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
      >
        <GlassCard className="flex flex-col h-full overflow-hidden" hover={false}>
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-white/10 flex-shrink-0">
            <Input
              value={title}
              onChange={e => { setTitle(e.target.value); setIsDirty(true); }}
              className="bg-transparent border-none text-white text-lg font-semibold focus-visible:ring-0 px-0 flex-1"
              placeholder="Document title..."
            />
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Collaborators */}
              <div className="flex -space-x-1">
                {collaboratorNames.slice(0, 3).map(email => (
                  <Avatar key={email} email={email} name={email.split('@')[0]} />
                ))}
              </div>
              {/* Status */}
              <span className="text-xs text-slate-500 whitespace-nowrap">
                {saveMutation.isPending ? (
                  <span className="text-amber-400 flex items-center gap-1"><Clock className="w-3 h-3" /> Saving...</span>
                ) : savedAt ? (
                  <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Saved</span>
                ) : null}
              </span>
              {/* Drive export */}
              <Button size="sm" variant="outline" onClick={handleExportToDrive} disabled={uploading}
                className="border-white/20 text-slate-300 hover:bg-white/10 text-xs h-8">
                <Upload className="w-3 h-3 mr-1" />
                {uploading ? 'Uploading...' : 'Save to Drive'}
              </Button>
              {doc.drive_file_url && (
                <a href={doc.drive_file_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 underline whitespace-nowrap">View in Drive</a>
              )}
              <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-8 text-xs">
                <Save className="w-3 h-3 mr-1" /> Save
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-white h-8 w-8">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Last edited */}
          {doc.last_edited_name && (
            <div className="px-4 py-1.5 border-b border-white/5 flex-shrink-0">
              <p className="text-xs text-slate-500">
                Last edited by <span className="text-slate-400">{doc.last_edited_name}</span>
                {doc.updated_date && ` · ${new Date(doc.updated_date).toLocaleString()}`}
              </p>
            </div>
          )}

          {/* Editor */}
          <div className="flex-1 overflow-hidden p-4">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={e => handleContentChange(e.target.value)}
              placeholder="Start writing... Changes are saved automatically and synced with collaborators in real-time."
              className="w-full h-full bg-transparent text-white text-sm leading-relaxed resize-none focus:outline-none placeholder:text-slate-600 font-mono"
            />
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}