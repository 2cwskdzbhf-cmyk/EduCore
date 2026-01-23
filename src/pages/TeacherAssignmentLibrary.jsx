import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import GlassCard from '@/components/ui/GlassCard';
import { 
  ChevronLeft, BookOpen, Trophy, Calendar, CheckCircle2
} from 'lucide-react';

export default function TeacherAssignmentLibrary() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [assignClass, setAssignClass] = useState('');
  const [assignDueDate, setAssignDueDate] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    fetchUser();
  }, []);

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => base44.entities.Subject.filter({ is_active: true }, 'order')
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['topics', selectedSubject],
    queryFn: () => base44.entities.Topic.filter({ subject_id: selectedSubject }, 'order'),
    enabled: !!selectedSubject
  });

  const { data: quizzes = [] } = useQuery({
    queryKey: ['quizzes', topics.map(t => t.id).join(',')],
    queryFn: async () => {
      if (topics.length === 0) return [];
      const topicIds = topics.map(t => t.id);
      return base44.entities.Quiz.filter({ topic_id: { $in: topicIds } });
    },
    enabled: topics.length > 0
  });

  const { data: teacherClasses = [] } = useQuery({
    queryKey: ['teacherClasses', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Class.filter({ teacher_email: user.email, is_active: true });
    },
    enabled: !!user?.email
  });

  const assignMutation = useMutation({
    mutationFn: async ({ topic, classId, dueDate }) => {
      const quiz = quizzes.find(q => q.topic_id === topic.id);
      
      const assignment = await base44.entities.Assignment.create({
        title: `${topic.name} Quiz`,
        description: topic.description || '',
        class_id: classId,
        teacher_email: user.email,
        topic_id: topic.id,
        assignment_type: 'quiz',
        quiz_id: quiz?.id || null,
        due_date: dueDate || null,
        status: 'published'
      });

      // Create initial submissions for all students
      const classData = teacherClasses.find(c => c.id === classId);
      if (classData?.student_emails) {
        for (const studentEmail of classData.student_emails) {
          await base44.entities.AssignmentSubmission.create({
            assignment_id: assignment.id,
            student_email: studentEmail,
            class_id: classId,
            status: 'not_started',
            questions_answered: 0,
            correct_answers: 0,
            time_spent_seconds: 0
          });
        }
      }

      return assignment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['assignments']);
      setAssignDialogOpen(false);
      setSelectedTopic(null);
      setAssignClass('');
      setAssignDueDate('');
      alert('Assignment created successfully!');
    }
  });

  const handleAssignClick = (topic) => {
    setSelectedTopic(topic);
    setAssignDialogOpen(true);
  };

  const handleAssignConfirm = () => {
    if (!selectedTopic || !assignClass) return;
    assignMutation.mutate({
      topic: selectedTopic,
      classId: assignClass,
      dueDate: assignDueDate
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <Link
            to={createPageUrl('TeacherDashboard')}
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Back to Dashboard
          </Link>

          <h1 className="text-3xl font-bold text-white mb-2">Assignment Library</h1>
          <p className="text-slate-400 mb-8">Browse topics and assign quizzes to your classes</p>

          <div className="mb-8">
            <Label className="text-white mb-2">Select Subject</Label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Choose a subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedSubject && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-400" />
                Topics
              </h2>

              {topics.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {topics.map((topic, index) => {
                    const topicQuiz = quizzes.find(q => q.topic_id === topic.id);
                    
                    return (
                      <motion.div
                        key={topic.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <GlassCard className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h3 className="font-semibold text-white mb-1">{topic.name}</h3>
                              <p className="text-sm text-slate-400 mb-3">{topic.description}</p>
                              <div className="flex items-center gap-4 text-sm text-slate-500">
                                <span className="flex items-center gap-1">
                                  <Trophy className="w-4 h-4" />
                                  {topicQuiz ? '1 Quiz' : 'No Quiz'}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  topic.difficulty_level === 'foundation' ? 'bg-green-500/20 text-green-400' :
                                  topic.difficulty_level === 'intermediate' ? 'bg-amber-500/20 text-amber-400' :
                                  'bg-red-500/20 text-red-400'
                                }`}>
                                  {topic.difficulty_level}
                                </span>
                              </div>
                            </div>
                          </div>

                          <Button
                            onClick={() => handleAssignClick(topic)}
                            disabled={!topicQuiz || assignMutation.isPending}
                            className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Assign to Class
                          </Button>
                        </GlassCard>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <GlassCard className="p-12 text-center">
                  <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-400">No topics available for this subject</p>
                </GlassCard>
              )}
            </motion.div>
          )}

          {!selectedSubject && (
            <GlassCard className="p-12 text-center">
              <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-400">Select a subject to view available topics and quizzes</p>
            </GlassCard>
          )}
        </motion.div>

        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent className="bg-slate-950/95 backdrop-blur-xl border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">Assign Quiz: {selectedTopic?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Class *</Label>
                <Select value={assignClass} onValueChange={setAssignClass}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {teacherClasses.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-slate-300">Due Date (optional)</Label>
                <Input
                  type="datetime-local"
                  value={assignDueDate}
                  onChange={(e) => setAssignDueDate(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setAssignDialogOpen(false)}
                  className="border-white/20 text-white"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAssignConfirm}
                  disabled={!assignClass || assignMutation.isPending}
                  className="bg-gradient-to-r from-purple-500 to-blue-500"
                >
                  {assignMutation.isPending ? 'Creating...' : 'Create Assignment'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}