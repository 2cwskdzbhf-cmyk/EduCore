import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Clock, CheckCircle2, X } from 'lucide-react';

export default function AnnouncementsFeed({ classId, user, isTeacher }) {
  const queryClient = useQueryClient();
  const [creatingNew, setCreatingNew] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  const { data: announcements = [] } = useQuery({
    queryKey: ['classAnnouncements', classId],
    queryFn: () =>
      base44.entities.Announcement.filter(
        { class_id: classId, is_active: true },
        '-created_date'
      ),
    enabled: !!classId,
    refetchInterval: 3000
  });

  const { data: announcementReads = [] } = useQuery({
    queryKey: ['announcementReads', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.AnnouncementRead.filter({
        student_email: user.email
      });
    },
    enabled: !!user?.email
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !message.trim()) throw new Error('Title and message required');
      return base44.entities.Announcement.create({
        class_id: classId,
        teacher_email: user.email,
        title: title.trim(),
        message: message.trim()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classAnnouncements', classId] });
      setTitle('');
      setMessage('');
      setCreatingNew(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) =>
      base44.entities.Announcement.update(id, { is_active: false }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['classAnnouncements', classId] })
  });

  const markDoneMutation = useMutation({
    mutationFn: async (announcementId) => {
      const existing = await base44.entities.AnnouncementRead.filter({
        announcement_id: announcementId,
        student_email: user.email
      });
      if (existing.length === 0) {
        const ann = announcements.find((a) => a.id === announcementId);
        await base44.entities.AnnouncementRead.create({
          announcement_id: announcementId,
          student_email: user.email,
          class_id: ann?.class_id
        });
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['announcementReads', user?.email]
      })
  });

  const unreadAnnouncements = announcements.filter(
    (a) =>
      !announcementReads.some((r) => r.announcement_id === a.id)
  );

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/10 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-10 p-6">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-3xl font-bold text-white">📢 Announcements</h1>
            <p className="text-slate-400 text-sm mt-1">
              {unreadAnnouncements.length} new announcement
              {unreadAnnouncements.length !== 1 ? 's' : ''}
            </p>
          </div>
          {isTeacher && (
            <Button
              onClick={() => setCreatingNew(true)}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600">
              <Plus className="w-4 h-4 mr-2" />
              New Announcement
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-4">
          <AnimatePresence>
            {/* Create Form */}
            {creatingNew && isTeacher && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white">Create Announcement</h2>
                  <button
                    onClick={() => setCreatingNew(false)}
                    className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <Input
                  placeholder="Announcement title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                />
                <Textarea
                  placeholder="Message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-32"
                />
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending}
                  className="w-full bg-gradient-to-r from-purple-500 to-blue-500">
                  {createMutation.isPending ? 'Posting...' : 'Post Announcement'}
                </Button>
              </motion.div>
            )}

            {/* Announcements List */}
            {announcements.length > 0 ? (
              announcements.map((announcement, index) => {
                const isUnread = unreadAnnouncements.some(
                  (a) => a.id === announcement.id
                );
                return (
                  <motion.div
                    key={announcement.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      'backdrop-blur-xl border rounded-2xl p-6 transition-all duration-300 group hover:shadow-xl hover:shadow-purple-500/10',
                      isUnread
                        ? 'bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/30'
                        : 'bg-white/5 border-white/10 opacity-75'
                    )}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-white">
                            {announcement.title}
                          </h3>
                          {isUnread && (
                            <span className="px-2 py-1 bg-purple-500 text-white text-xs rounded-full font-medium">
                              New
                            </span>
                          )}
                        </div>
                        <p className="text-slate-300 mb-4 leading-relaxed">
                          {announcement.message}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <Clock className="w-4 h-4" />
                          {new Date(announcement.created_date).toLocaleDateString()}{' '}
                          at{' '}
                          {new Date(
                            announcement.created_date
                          ).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!isTeacher && isUnread && (
                          <Button
                            size="sm"
                            onClick={() =>
                              markDoneMutation.mutate(announcement.id)
                            }
                            className="bg-purple-500 hover:bg-purple-600">
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Mark Done
                          </Button>
                        )}
                        {isTeacher && (
                          <button
                            onClick={() => deleteMutation.mutate(announcement.id)}
                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-24">
                <p className="text-4xl mb-4">📢</p>
                <p className="text-xl font-semibold text-white mb-2">
                  No announcements yet
                </p>
                <p className="text-slate-400">
                  {isTeacher
                    ? 'Create your first announcement to get started'
                    : 'Check back soon for updates'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}