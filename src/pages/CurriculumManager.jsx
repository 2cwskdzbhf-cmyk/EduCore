import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import GlassCard from '@/components/ui/GlassCard';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  ChevronLeft, Plus, Trash2, Edit2, Save, X, GripVertical,
  BookOpen, FileText, Link2, ChevronDown, ChevronRight, Layers,
  Upload, ExternalLink, Pencil, ClipboardList
} from 'lucide-react';

const COLORS = ['purple', 'blue', 'emerald', 'amber', 'rose', 'cyan'];
const colorMap = {
  purple: 'from-purple-500 to-purple-600',
  blue: 'from-blue-500 to-blue-600',
  emerald: 'from-emerald-500 to-emerald-600',
  amber: 'from-amber-500 to-amber-600',
  rose: 'from-rose-500 to-rose-600',
  cyan: 'from-cyan-500 to-cyan-600',
};

export default function CurriculumManager() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [expandedTopics, setExpandedTopics] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [addingType, setAddingType] = useState(null); // {type:'subject'|'topic'|'lesson', parentId?}
  const [newName, setNewName] = useState('');
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [lessonForm, setLessonForm] = useState({});

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: subjects = [] } = useQuery({
    queryKey: ['curriculumSubjects', user?.email],
    queryFn: () => base44.entities.CurriculumSubject.filter({ teacher_email: user.email }, 'order_index'),
    enabled: !!user?.email,
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['curriculumTopics', user?.email],
    queryFn: () => base44.entities.CurriculumTopic.filter({ teacher_email: user.email }, 'order_index'),
    enabled: !!user?.email,
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ['curriculumLessons', user?.email],
    queryFn: () => base44.entities.CurriculumLesson.filter({ teacher_email: user.email }, 'order_index'),
    enabled: !!user?.email,
  });

  const createSubjectMutation = useMutation({
    mutationFn: (name) => base44.entities.CurriculumSubject.create({
      teacher_email: user.email, name,
      color: COLORS[subjects.length % COLORS.length],
      order_index: subjects.length
    }),
    onSuccess: () => { queryClient.invalidateQueries(['curriculumSubjects']); setAddingType(null); setNewName(''); }
  });

  const createTopicMutation = useMutation({
    mutationFn: ({ name, subjectId }) => base44.entities.CurriculumTopic.create({
      teacher_email: user.email, name, subject_id: subjectId,
      order_index: topics.filter(t => t.subject_id === subjectId).length
    }),
    onSuccess: () => { queryClient.invalidateQueries(['curriculumTopics']); setAddingType(null); setNewName(''); }
  });

  const createLessonMutation = useMutation({
    mutationFn: ({ name, topicId, subjectId, type }) => base44.entities.CurriculumLesson.create({
      teacher_email: user.email, title: name, topic_id: topicId, subject_id: subjectId,
      lesson_type: type || 'lesson',
      order_index: lessons.filter(l => l.topic_id === topicId).length
    }),
    onSuccess: () => { queryClient.invalidateQueries(['curriculumLessons']); setAddingType(null); setNewName(''); }
  });

  const updateSubjectMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CurriculumSubject.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['curriculumSubjects']); setEditingId(null); }
  });

  const updateTopicMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CurriculumTopic.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['curriculumTopics']); setEditingId(null); }
  });

  const updateLessonMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CurriculumLesson.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['curriculumLessons']); setSelectedLesson(null); }
  });

  const deleteSubjectMutation = useMutation({
    mutationFn: (id) => base44.entities.CurriculumSubject.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['curriculumSubjects'])
  });

  const deleteTopicMutation = useMutation({
    mutationFn: (id) => base44.entities.CurriculumTopic.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['curriculumTopics'])
  });

  const deleteLessonMutation = useMutation({
    mutationFn: (id) => base44.entities.CurriculumLesson.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['curriculumLessons'])
  });

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId, type } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    if (type === 'lesson') {
      const topicId = destination.droppableId;
      const subjectId = topics.find(t => t.id === topicId)?.subject_id;
      await updateLessonMutation.mutateAsync({ id: draggableId, data: { topic_id: topicId, subject_id: subjectId, order_index: destination.index } });
      queryClient.invalidateQueries(['curriculumLessons']);
    }
  };

  const toggleSubject = (id) => setExpandedSubjects(p => ({ ...p, [id]: !p[id] }));
  const toggleTopic = (id) => setExpandedTopics(p => ({ ...p, [id]: !p[id] }));

  const startEdit = (id, currentName) => { setEditingId(id); setEditingText(currentName); };
  const openLessonEditor = (lesson) => { setSelectedLesson(lesson); setLessonForm({ ...lesson }); };

  const lessonTypeIcon = (type) => type === 'assignment' ? ClipboardList : type === 'whiteboard' ? Pencil : BookOpen;
  const lessonTypeColor = (type) => type === 'assignment' ? 'text-amber-400' : type === 'whiteboard' ? 'text-blue-400' : 'text-emerald-400';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <Link to={createPageUrl('TeacherDashboard')} className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
            <ChevronLeft className="w-5 h-5" /> Back to Dashboard
          </Link>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">Curriculum Manager</h1>
              <p className="text-slate-400">Organise your subjects, topics, and lessons</p>
            </div>
            <Button
              onClick={() => setAddingType({ type: 'subject' })}
              className="bg-gradient-to-r from-purple-500 to-blue-500"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Subject
            </Button>
          </div>

          {/* Add Subject Form */}
          <AnimatePresence>
            {addingType?.type === 'subject' && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <GlassCard className="p-4 mb-4 flex gap-3">
                  <Input
                    autoFocus
                    placeholder="Subject name (e.g. Mathematics)"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && newName.trim() && createSubjectMutation.mutate(newName.trim())}
                    className="bg-white/5 border-white/10 text-white"
                  />
                  <Button onClick={() => newName.trim() && createSubjectMutation.mutate(newName.trim())} className="bg-emerald-500 hover:bg-emerald-600"><Save className="w-4 h-4" /></Button>
                  <Button variant="ghost" onClick={() => { setAddingType(null); setNewName(''); }} className="text-slate-400"><X className="w-4 h-4" /></Button>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Subjects Tree */}
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="space-y-4">
              {subjects.map(subject => {
                const subjectTopics = topics.filter(t => t.subject_id === subject.id);
                const isExpanded = expandedSubjects[subject.id] ?? true;
                const gradient = colorMap[subject.color] || colorMap.purple;

                return (
                  <GlassCard key={subject.id} className="overflow-hidden">
                    {/* Subject Header */}
                    <div className="flex items-center gap-3 p-4">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
                        <Layers className="w-5 h-5 text-white" />
                      </div>
                      <button onClick={() => toggleSubject(subject.id)} className="flex-1 flex items-center gap-2 text-left">
                        {editingId === subject.id ? (
                          <Input
                            value={editingText}
                            onChange={e => setEditingText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && updateSubjectMutation.mutate({ id: subject.id, data: { name: editingText } })}
                            className="bg-white/10 border-white/20 text-white h-8 w-48"
                            onClick={e => e.stopPropagation()}
                            autoFocus
                          />
                        ) : (
                          <span className="font-semibold text-white text-lg">{subject.name}</span>
                        )}
                        <span className="text-xs text-slate-400 ml-2">{subjectTopics.length} topics</span>
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400 ml-auto" /> : <ChevronRight className="w-4 h-4 text-slate-400 ml-auto" />}
                      </button>
                      <div className="flex gap-1">
                        {editingId === subject.id ? (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => updateSubjectMutation.mutate({ id: subject.id, data: { name: editingText } })} className="text-emerald-400 h-8 w-8 p-0"><Save className="w-4 h-4" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="text-slate-400 h-8 w-8 p-0"><X className="w-4 h-4" /></Button>
                          </>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => startEdit(subject.id, subject.name)} className="text-slate-400 hover:text-white h-8 w-8 p-0"><Edit2 className="w-4 h-4" /></Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => deleteSubjectMutation.mutate(subject.id)} className="text-red-400 hover:text-red-300 h-8 w-8 p-0"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>

                    {/* Topics */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                          <div className="pb-3 px-4 space-y-2 border-t border-white/10 pt-3">
                            {subjectTopics.map(topic => {
                              const topicLessons = lessons.filter(l => l.topic_id === topic.id).sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
                              const isTopicExpanded = expandedTopics[topic.id] ?? true;

                              return (
                                <div key={topic.id} className="ml-4 bg-white/5 rounded-xl border border-white/10">
                                  <div className="flex items-center gap-3 p-3">
                                    <button onClick={() => toggleTopic(topic.id)} className="flex-1 flex items-center gap-2 text-left">
                                      <FileText className="w-4 h-4 text-slate-400" />
                                      {editingId === topic.id ? (
                                        <Input
                                          value={editingText}
                                          onChange={e => setEditingText(e.target.value)}
                                          onKeyDown={e => e.key === 'Enter' && updateTopicMutation.mutate({ id: topic.id, data: { name: editingText } })}
                                          className="bg-white/10 border-white/20 text-white h-7 w-40"
                                          onClick={e => e.stopPropagation()}
                                          autoFocus
                                        />
                                      ) : (
                                        <span className="font-medium text-white">{topic.name}</span>
                                      )}
                                      <span className="text-xs text-slate-500 ml-1">{topicLessons.length} items</span>
                                      {isTopicExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-500 ml-auto" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500 ml-auto" />}
                                    </button>
                                    <div className="flex gap-1">
                                      {editingId === topic.id ? (
                                        <>
                                          <Button size="sm" variant="ghost" onClick={() => updateTopicMutation.mutate({ id: topic.id, data: { name: editingText } })} className="text-emerald-400 h-7 w-7 p-0"><Save className="w-3 h-3" /></Button>
                                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="text-slate-400 h-7 w-7 p-0"><X className="w-3 h-3" /></Button>
                                        </>
                                      ) : (
                                        <Button size="sm" variant="ghost" onClick={() => startEdit(topic.id, topic.name)} className="text-slate-400 hover:text-white h-7 w-7 p-0"><Edit2 className="w-3 h-3" /></Button>
                                      )}
                                      <Button size="sm" variant="ghost" onClick={() => deleteTopicMutation.mutate(topic.id)} className="text-red-400 h-7 w-7 p-0"><Trash2 className="w-3 h-3" /></Button>
                                    </div>
                                  </div>

                                  <AnimatePresence>
                                    {isTopicExpanded && (
                                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                        <Droppable droppableId={topic.id} type="lesson">
                                          {(provided, snapshot) => (
                                            <div
                                              ref={provided.innerRef}
                                              {...provided.droppableProps}
                                              className={`px-3 pb-3 space-y-1 min-h-[8px] rounded-b-xl transition-colors ${snapshot.isDraggingOver ? 'bg-purple-500/10' : ''}`}
                                            >
                                              {topicLessons.map((lesson, idx) => {
                                                const Icon = lessonTypeIcon(lesson.lesson_type);
                                                return (
                                                  <Draggable key={lesson.id} draggableId={lesson.id} index={idx}>
                                                    {(prov, snap) => (
                                                      <div
                                                        ref={prov.innerRef}
                                                        {...prov.draggableProps}
                                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all group ${snap.isDragging ? 'shadow-lg shadow-purple-500/30 scale-[1.01]' : ''}`}
                                                      >
                                                        <span {...prov.dragHandleProps} className="text-slate-500 hover:text-slate-300 cursor-grab">
                                                          <GripVertical className="w-4 h-4" />
                                                        </span>
                                                        <Icon className={`w-4 h-4 flex-shrink-0 ${lessonTypeColor(lesson.lesson_type)}`} />
                                                        <span className="text-sm text-slate-200 flex-1">{lesson.title}</span>
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                          <Button size="sm" variant="ghost" onClick={() => openLessonEditor(lesson)} className="text-blue-400 h-6 w-6 p-0"><Edit2 className="w-3 h-3" /></Button>
                                                          <Button size="sm" variant="ghost" onClick={() => deleteLessonMutation.mutate(lesson.id)} className="text-red-400 h-6 w-6 p-0"><Trash2 className="w-3 h-3" /></Button>
                                                        </div>
                                                      </div>
                                                    )}
                                                  </Draggable>
                                                );
                                              })}
                                              {provided.placeholder}
                                            </div>
                                          )}
                                        </Droppable>

                                        {/* Add Lesson */}
                                        {addingType?.type === 'lesson' && addingType?.topicId === topic.id ? (
                                          <div className="px-3 pb-3 flex gap-2">
                                            <select
                                              value={addingType.lessonType || 'lesson'}
                                              onChange={e => setAddingType(p => ({ ...p, lessonType: e.target.value }))}
                                              className="bg-white/10 border border-white/20 text-white text-xs rounded px-2 py-1"
                                            >
                                              <option value="lesson">Lesson</option>
                                              <option value="assignment">Assignment</option>
                                              <option value="whiteboard">Whiteboard</option>
                                            </select>
                                            <Input
                                              autoFocus
                                              placeholder="Lesson title..."
                                              value={newName}
                                              onChange={e => setNewName(e.target.value)}
                                              onKeyDown={e => e.key === 'Enter' && newName.trim() && createLessonMutation.mutate({ name: newName.trim(), topicId: topic.id, subjectId: subject.id, type: addingType.lessonType })}
                                              className="bg-white/10 border-white/20 text-white h-8 text-sm"
                                            />
                                            <Button size="sm" onClick={() => newName.trim() && createLessonMutation.mutate({ name: newName.trim(), topicId: topic.id, subjectId: subject.id, type: addingType.lessonType })} className="bg-emerald-500 h-8 px-2"><Save className="w-3 h-3" /></Button>
                                            <Button size="sm" variant="ghost" onClick={() => { setAddingType(null); setNewName(''); }} className="text-slate-400 h-8 px-2"><X className="w-3 h-3" /></Button>
                                          </div>
                                        ) : (
                                          <div className="px-3 pb-3">
                                            <button
                                              onClick={() => setAddingType({ type: 'lesson', topicId: topic.id, subjectId: subject.id })}
                                              className="flex items-center gap-2 text-xs text-slate-500 hover:text-purple-400 transition-colors"
                                            >
                                              <Plus className="w-3 h-3" /> Add lesson or assignment
                                            </button>
                                          </div>
                                        )}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })}

                            {/* Add Topic */}
                            {addingType?.type === 'topic' && addingType?.subjectId === subject.id ? (
                              <div className="ml-4 flex gap-2">
                                <Input
                                  autoFocus
                                  placeholder="Topic name..."
                                  value={newName}
                                  onChange={e => setNewName(e.target.value)}
                                  onKeyDown={e => e.key === 'Enter' && newName.trim() && createTopicMutation.mutate({ name: newName.trim(), subjectId: subject.id })}
                                  className="bg-white/5 border-white/10 text-white h-9"
                                />
                                <Button size="sm" onClick={() => newName.trim() && createTopicMutation.mutate({ name: newName.trim(), subjectId: subject.id })} className="bg-emerald-500"><Save className="w-4 h-4" /></Button>
                                <Button size="sm" variant="ghost" onClick={() => { setAddingType(null); setNewName(''); }} className="text-slate-400"><X className="w-4 h-4" /></Button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setAddingType({ type: 'topic', subjectId: subject.id })}
                                className="ml-4 flex items-center gap-2 text-sm text-slate-500 hover:text-blue-400 transition-colors py-1"
                              >
                                <Plus className="w-4 h-4" /> Add topic
                              </button>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </GlassCard>
                );
              })}

              {subjects.length === 0 && (
                <GlassCard className="p-12 text-center">
                  <Layers className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 mb-2">No curriculum yet</p>
                  <p className="text-slate-500 text-sm mb-4">Click "Add Subject" to start building your curriculum</p>
                </GlassCard>
              )}
            </div>
          </DragDropContext>
        </motion.div>
      </div>

      {/* Lesson Editor Modal */}
      <AnimatePresence>
        {selectedLesson && (
          <motion.div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSelectedLesson(null)}
          >
            <motion.div
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
            >
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Edit Lesson</h2>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedLesson(null)} className="text-slate-400"><X className="w-5 h-5" /></Button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Title</label>
                    <Input value={lessonForm.title || ''} onChange={e => setLessonForm(p => ({ ...p, title: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Type</label>
                    <select
                      value={lessonForm.lesson_type || 'lesson'}
                      onChange={e => setLessonForm(p => ({ ...p, lesson_type: e.target.value }))}
                      className="w-full bg-white/10 border border-white/20 text-white rounded-md px-3 py-2"
                    >
                      <option value="lesson">Lesson</option>
                      <option value="assignment">Assignment</option>
                      <option value="whiteboard">Whiteboard Activity</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Instructions / Notes</label>
                    <Textarea
                      value={lessonForm.instructions || ''}
                      onChange={e => setLessonForm(p => ({ ...p, instructions: e.target.value }))}
                      placeholder="Add instructions, notes or learning objectives..."
                      className="bg-white/5 border-white/10 text-white min-h-[100px]"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">Links</label>
                    {(lessonForm.links || []).map((link, i) => (
                      <div key={i} className="flex gap-2 mb-2">
                        <Input value={link.title} onChange={e => { const l = [...(lessonForm.links || [])]; l[i] = { ...l[i], title: e.target.value }; setLessonForm(p => ({ ...p, links: l })); }} placeholder="Title" className="bg-white/5 border-white/10 text-white text-sm" />
                        <Input value={link.url} onChange={e => { const l = [...(lessonForm.links || [])]; l[i] = { ...l[i], url: e.target.value }; setLessonForm(p => ({ ...p, links: l })); }} placeholder="URL" className="bg-white/5 border-white/10 text-white text-sm" />
                        <Button size="sm" variant="ghost" onClick={() => { const l = (lessonForm.links || []).filter((_, j) => j !== i); setLessonForm(p => ({ ...p, links: l })); }} className="text-red-400 px-2"><X className="w-4 h-4" /></Button>
                      </div>
                    ))}
                    <Button size="sm" variant="outline" onClick={() => setLessonForm(p => ({ ...p, links: [...(p.links || []), { title: '', url: '' }] }))} className="border-white/20 text-slate-300 text-xs">
                      <Link2 className="w-3 h-3 mr-1" /> Add Link
                    </Button>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button
                      onClick={() => updateLessonMutation.mutate({ id: selectedLesson.id, data: { title: lessonForm.title, lesson_type: lessonForm.lesson_type, instructions: lessonForm.instructions, links: lessonForm.links || [] } })}
                      className="bg-gradient-to-r from-purple-500 to-blue-500 flex-1"
                    >
                      <Save className="w-4 h-4 mr-2" /> Save Changes
                    </Button>
                    <Button variant="outline" onClick={() => setSelectedLesson(null)} className="border-white/20 text-white">Cancel</Button>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}