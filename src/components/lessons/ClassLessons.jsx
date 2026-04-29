import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, BookOpen, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import LessonCard from './LessonCard';
import LessonForm from './LessonForm';

export default function ClassLessons({ classId, user, isTeacher }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [retranscribingId, setRetranscribingId] = useState(null);

  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ['classLessons', classId],
    queryFn: () => base44.entities.ClassLesson.filter({ class_id: classId }, '-created_date'),
    enabled: !!classId,
  });

  const handleSave = () => {
    queryClient.invalidateQueries({ queryKey: ['classLessons', classId] });
    setShowForm(false);
    setEditingLesson(null);
  };

  const handleEdit = (lesson) => {
    setEditingLesson(lesson);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (lesson) => {
    if (!confirm(`Delete "${lesson.title}"? This cannot be undone.`)) return;
    setDeletingId(lesson.id);
    await base44.entities.ClassLesson.delete(lesson.id);
    queryClient.invalidateQueries({ queryKey: ['classLessons', classId] });
    setDeletingId(null);
  };

  const handleRetranscribe = async (mediaItem) => {
    if (!mediaItem?.url) return;
    setRetranscribingId(mediaItem.id);
    try {
      await base44.functions.invoke('transcribeAudio', {
        audio_url: mediaItem.url,
        lesson_id: mediaItem.lesson_id || null,
      });
      queryClient.invalidateQueries({ queryKey: ['classLessons', classId] });
    } catch {}
    setRetranscribingId(null);
  };

  const visibleLessons = isTeacher ? lessons : lessons.filter(l => l.is_published !== false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-purple-400" />
          <h2 className="text-white font-bold text-xl">Lessons</h2>
          <span className="text-slate-500 text-sm">({visibleLessons.length})</span>
        </div>
        {isTeacher && !showForm && (
          <Button onClick={() => { setEditingLesson(null); setShowForm(true); }}
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 font-semibold text-sm">
            <Plus className="w-4 h-4 mr-1.5" /> Create Lesson
          </Button>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <LessonForm
            classId={classId}
            user={user}
            lesson={editingLesson}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditingLesson(null); }}
          />
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
        </div>
      ) : visibleLessons.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <BookOpen className="w-14 h-14 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-300 font-semibold text-lg">No lessons yet</p>
          <p className="text-slate-500 text-sm mt-1">
            {isTeacher ? 'Create your first lesson above.' : "Your teacher hasn't posted any lessons yet."}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {visibleLessons.map(lesson => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              isTeacher={isTeacher}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onRetranscribe={handleRetranscribe}
              retranscribing={retranscribingId}
            />
          ))}
        </div>
      )}
    </div>
  );
}