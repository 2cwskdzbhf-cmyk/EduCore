import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import GlassCard from '@/components/ui/GlassCard';
import { Plus, Trash2, Edit2, X, Link as LinkIcon, Calendar, Clock, ChevronRight } from 'lucide-react';

const SUBJECTS = [
  { label: 'Maths', value: 'Maths', color: 'from-blue-500 to-blue-600' },
  { label: 'English', value: 'English', color: 'from-red-500 to-red-600' },
  { label: 'Science', value: 'Science', color: 'from-green-500 to-green-600' },
  { label: 'Geography', value: 'Geography', color: 'from-amber-500 to-amber-600' },
  { label: 'History', value: 'History', color: 'from-purple-500 to-purple-600' },
  { label: 'Spanish', value: 'Spanish', color: 'from-pink-500 to-pink-600' },
  { label: 'Computer Science', value: 'Computer Science', color: 'from-cyan-500 to-cyan-600' },
  { label: 'Other', value: 'Other', color: 'from-slate-500 to-slate-600' },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const getSubjectColor = (subject) => {
  return SUBJECTS.find(s => s.value === subject)?.color || SUBJECTS[7].color;
};

const getCurrentWeek = () => {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const diff = now - jan1;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  const weekNumber = Math.ceil((dayOfYear + jan1.getDay() + 1) / 7);
  return weekNumber % 2 === 0 ? 2 : 1;
};

const getTodayDay = () => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date().getDay()];
};

const getTomorrowDay = () => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[(new Date().getDay() + 1) % 7];
};

export default function MyTimetable() {
  const [user, setUser] = useState(null);
  const [timetableMode, setTimetableMode] = useState('1-week'); // '1-week' or '2-week'
  const [currentWeek, setCurrentWeek] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    subject: '',
    lesson_name: '',
    teacher_name: '',
    day_of_week: 'Monday',
    start_time: '',
    duration_minutes: 60,
    link: '',
    notes: '',
    linked_class_id: '',
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    fetchUser();

    if (timetableMode === '2-week') {
      setCurrentWeek(getCurrentWeek());
    }
  }, [timetableMode]);

  const { data: lessons = [] } = useQuery({
    queryKey: ['timetableLessons', user?.email, currentWeek],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.TimetableLesson.filter(
        { student_email: user.email, week_number: timetableMode === '2-week' ? currentWeek : 1 },
        'order_index'
      );
    },
    enabled: !!user?.email,
  });

  const { data: joinedClasses = [] } = useQuery({
    queryKey: ['studentClasses', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const classes = await base44.entities.Class.filter({
        student_emails: { $in: [user.email] },
      });
      return classes;
    },
    enabled: !!user?.email,
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.TimetableLesson.create({
        student_email: user.email,
        ...data,
        week_number: timetableMode === '2-week' ? currentWeek : 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['timetableLessons']);
      resetForm();
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.TimetableLesson.update(editingId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['timetableLessons']);
      resetForm();
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return base44.entities.TimetableLesson.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['timetableLessons']);
    },
  });

  const resetForm = () => {
    setFormData({
      subject: '',
      lesson_name: '',
      teacher_name: '',
      day_of_week: 'Monday',
      start_time: '',
      duration_minutes: 60,
      link: '',
      notes: '',
      linked_class_id: '',
    });
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!formData.subject || !formData.lesson_name || !formData.day_of_week) {
      alert('Please fill in required fields');
      return;
    }

    if (editingId) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (lesson) => {
    setFormData({
      subject: lesson.subject,
      lesson_name: lesson.lesson_name,
      teacher_name: lesson.teacher_name || '',
      day_of_week: lesson.day_of_week,
      start_time: lesson.start_time || '',
      duration_minutes: lesson.duration_minutes,
      link: lesson.link || '',
      notes: lesson.notes || '',
      linked_class_id: lesson.linked_class_id || '',
    });
    setEditingId(lesson.id);
    setShowForm(true);
  };



  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    const newDay = destination.droppableId;
    const lesson = lessons.find(l => l.id === draggableId);
    
    if (lesson && lesson.day_of_week !== newDay) {
      updateMutation.mutate({
        ...lesson,
        day_of_week: newDay,
      });
    }
  };

  const todayDay = getTodayDay();
  const tomorrowDay = getTomorrowDay();
  const isWeekday = DAYS.includes(todayDay);

  const nextLesson = useMemo(() => {
    if (!isWeekday) return null;
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    return lessons
      .filter(l => l.day_of_week === todayDay && l.start_time && l.start_time > currentTime)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))[0];
  }, [lessons, todayDay, isWeekday]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4 flex items-center gap-3">
            <Calendar className="w-10 h-10 text-purple-400" />
            My Timetable
          </h1>

          {/* Mode Toggle */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex gap-2 bg-white/10 border border-white/20 rounded-lg p-1">
              <Button
                onClick={() => { setTimetableMode('1-week'); setCurrentWeek(1); }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  timetableMode === '1-week'
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                    : 'bg-transparent text-slate-300 hover:text-white'
                }`}
              >
                1-Week View
              </Button>
              <Button
                onClick={() => { setTimetableMode('2-week'); setCurrentWeek(getCurrentWeek()); }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  timetableMode === '2-week'
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                    : 'bg-transparent text-slate-300 hover:text-white'
                }`}
              >
                2-Week View
              </Button>
            </div>

            {timetableMode === '2-week' && (
              <div className="ml-auto px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-sm text-purple-200">
                Week {currentWeek}
              </div>
            )}
          </div>

          {/* Today's Status */}
          {isWeekday && (
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <GlassCard className="p-4">
                <p className="text-sm text-slate-400 mb-2">Today - {todayDay}</p>
                <p className="text-2xl font-bold text-white">
                  {lessons.filter(l => l.day_of_week === todayDay).length} lessons
                </p>
              </GlassCard>

              {nextLesson && (
                <GlassCard className="p-4 border-purple-500/50">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm text-purple-300 mb-1 flex items-center gap-2">
                        <ChevronRight className="w-4 h-4" />
                        Next Lesson
                      </p>
                      <p className="text-lg font-bold text-white">{nextLesson.lesson_name}</p>
                      <p className="text-sm text-slate-400">
                        {nextLesson.start_time} ({nextLesson.duration_minutes} min)
                      </p>
                    </div>
                  </div>
                </GlassCard>
              )}
            </div>
          )}
        </div>

        {/* Add Lesson Button */}
        <Button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="bg-gradient-to-r from-purple-500 to-blue-500 mb-6"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Lesson
        </Button>

        {/* Add/Edit Lesson Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
            >
              <motion.div
                className="bg-slate-950 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">
                    {editingId ? 'Edit Lesson' : 'Add New Lesson'}
                  </h2>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setShowForm(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-white mb-2 block">Subject *</Label>
                      <Select
                        value={formData.subject}
                        onValueChange={(value) =>
                          setFormData({ ...formData, subject: value })
                        }
                      >
                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {SUBJECTS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-white mb-2 block">Lesson Name *</Label>
                      <Input
                        placeholder="e.g., Algebra, Photosynthesis"
                        value={formData.lesson_name}
                        onChange={(e) =>
                          setFormData({ ...formData, lesson_name: e.target.value })
                        }
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>

                    <div>
                      <Label className="text-white mb-2 block">Day of Week *</Label>
                      <Select
                        value={formData.day_of_week}
                        onValueChange={(value) =>
                          setFormData({ ...formData, day_of_week: value })
                        }
                      >
                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DAYS.map((day) => (
                            <SelectItem key={day} value={day}>
                              {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-white mb-2 block">Teacher Name</Label>
                      <Input
                        placeholder="Optional"
                        value={formData.teacher_name}
                        onChange={(e) =>
                          setFormData({ ...formData, teacher_name: e.target.value })
                        }
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>

                    <div>
                      <Label className="text-white mb-2 block">Start Time</Label>
                      <Input
                        type="time"
                        value={formData.start_time}
                        onChange={(e) =>
                          setFormData({ ...formData, start_time: e.target.value })
                        }
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>

                    <div>
                      <Label className="text-white mb-2 block">Duration (minutes) *</Label>
                      <Input
                        type="number"
                        value={formData.duration_minutes}
                        onChange={(e) =>
                          setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 60 })
                        }
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label className="text-white mb-2 block">Link Class (Optional)</Label>
                      <Select
                        value={formData.linked_class_id || ''}
                        onValueChange={(value) =>
                          setFormData({ ...formData, linked_class_id: value || '' })
                        }
                      >
                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                          <SelectValue placeholder="Select a class to link" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={null}>None</SelectItem>
                          {joinedClasses.map((cls) => (
                            <SelectItem key={cls.id} value={cls.id}>
                              {cls.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="md:col-span-2">
                      <Label className="text-white mb-2 block">Link (Google Meet, Drive, etc.)</Label>
                      <Input
                        placeholder="https://..."
                        value={formData.link}
                        onChange={(e) =>
                          setFormData({ ...formData, link: e.target.value })
                        }
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label className="text-white mb-2 block">Notes</Label>
                      <Textarea
                        placeholder="Optional notes..."
                        value={formData.notes}
                        onChange={(e) =>
                          setFormData({ ...formData, notes: e.target.value })
                        }
                        className="bg-white/5 border-white/10 text-white h-20"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end pt-4 border-t border-white/10">
                    <Button
                      variant="outline"
                      onClick={() => setShowForm(false)}
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={createMutation.isPending || updateMutation.isPending}
                      className="bg-gradient-to-r from-purple-500 to-blue-500"
                    >
                      {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Lesson'}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Timetable Grid */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {DAYS.map((day) => {
              const dayLessons = lessons
                .filter(l => l.day_of_week === day)
                .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
              const isToday = day === todayDay;

              return (
                <Droppable key={day} droppableId={day}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`rounded-2xl border-2 p-4 min-h-[600px] transition-all ${
                        isToday
                          ? 'border-purple-500/50 bg-gradient-to-b from-purple-500/10 to-transparent'
                          : 'border-white/10 bg-white/[0.02]'
                      } ${snapshot.isDraggingOver ? 'bg-white/10' : ''}`}
                    >
                      {/* Day Header */}
                      <h3 className={`font-bold mb-4 pb-3 border-b ${isToday ? 'border-purple-500/30 text-purple-300' : 'border-white/10 text-white'}`}>
                        <span className="text-lg">{day}</span>
                        {isToday && <span className="ml-2 text-xs bg-purple-500/30 px-2 py-1 rounded-full">Today</span>}
                      </h3>

                      {/* Lessons */}
                      <div className="space-y-2">
                        {dayLessons.map((lesson, index) => (
                          <Draggable key={lesson.id} draggableId={lesson.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={snapshot.isDragging ? 'opacity-50' : ''}
                              >
                                <motion.div
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className={`rounded-lg p-3 border border-white/10 bg-gradient-to-br ${getSubjectColor(lesson.subject)} bg-opacity-10`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-semibold text-white text-sm truncate">
                                        {lesson.lesson_name}
                                      </h4>
                                      {lesson.teacher_name && (
                                        <p className="text-xs text-slate-400">{lesson.teacher_name}</p>
                                      )}
                                      <div className="flex items-center gap-2 mt-2 text-xs text-slate-300">
                                        {lesson.start_time && (
                                          <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {lesson.start_time}
                                          </span>
                                        )}
                                        <span>{lesson.duration_minutes}m</span>
                                      </div>
                                      {lesson.link && (
                                        <a
                                          href={lesson.link}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs text-blue-400 hover:underline mt-1 flex items-center gap-1"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <LinkIcon className="w-3 h-3" />
                                          Join
                                        </a>
                                      )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-1 flex-shrink-0">
                                      <button
                                        onClick={() => handleEdit(lesson)}
                                        className="p-1 hover:bg-white/20 rounded text-blue-400"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => deleteMutation.mutate(lesson.id)}
                                        className="p-1 hover:bg-white/20 rounded text-red-400"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                  {lesson.notes && (
                                    <p className="text-xs text-slate-400 mt-2 pt-2 border-t border-white/10">
                                      {lesson.notes}
                                    </p>
                                  )}
                                </motion.div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}

                        {dayLessons.length === 0 && (
                          <div className="text-center py-8 text-slate-500 text-sm">
                            No lessons
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}