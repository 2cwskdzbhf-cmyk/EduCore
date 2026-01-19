import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ChevronLeft,
  ClipboardList,
  Bot,
  Calendar,
  Save
} from 'lucide-react';

export default function CreateAssignment() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    class_id: '',
    topic_id: '',
    quiz_id: '',
    type: 'quiz',
    due_date: '',
    ai_help_enabled: true,
    difficulty: 'medium',
    max_points: 100
  });

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    fetchUser();
  }, []);

  const { data: classes = [] } = useQuery({
    queryKey: ['teacherClasses', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Class.filter({ teacher_email: user.email });
    },
    enabled: !!user?.email
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['topics'],
    queryFn: () => base44.entities.Topic.list()
  });

  const { data: quizzes = [] } = useQuery({
    queryKey: ['quizzes', formData.topic_id],
    queryFn: async () => {
      if (!formData.topic_id) return [];
      return base44.entities.Quiz.filter({ topic_id: formData.topic_id });
    },
    enabled: !!formData.topic_id
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Assignment.create({
        ...formData,
        teacher_email: user.email
      });
    },
    onSuccess: () => {
      navigate(createPageUrl('TeacherDashboard'));
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createAssignmentMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>

        <motion.div
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <ClipboardList className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Create Assignment</h1>
              <p className="text-slate-500">Set work for your students</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label>Assignment Title</Label>
              <Input
                placeholder="e.g., Algebra Practice Quiz"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="Instructions for students..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Class</Label>
                <Select 
                  value={formData.class_id} 
                  onValueChange={(v) => setFormData({ ...formData, class_id: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Type</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(v) => setFormData({ ...formData, type: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quiz">Quiz</SelectItem>
                    <SelectItem value="written">Written Response</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Topic</Label>
                <Select 
                  value={formData.topic_id} 
                  onValueChange={(v) => setFormData({ ...formData, topic_id: v, quiz_id: '' })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select topic" />
                  </SelectTrigger>
                  <SelectContent>
                    {topics.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.type === 'quiz' && formData.topic_id && (
                <div>
                  <Label>Quiz</Label>
                  <Select 
                    value={formData.quiz_id} 
                    onValueChange={(v) => setFormData({ ...formData, quiz_id: v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select quiz" />
                    </SelectTrigger>
                    <SelectContent>
                      {quizzes.map(q => (
                        <SelectItem key={q.id} value={q.id}>{q.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Due Date</Label>
                <div className="relative mt-1">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="datetime-local"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <Label>Difficulty</Label>
                <Select 
                  value={formData.difficulty} 
                  onValueChange={(v) => setFormData({ ...formData, difficulty: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3">
                <Bot className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="font-medium text-slate-800">Allow AI Tutor Help</p>
                  <p className="text-sm text-slate-500">Students can use the AI tutor during this assignment</p>
                </div>
              </div>
              <Switch
                checked={formData.ai_help_enabled}
                onCheckedChange={(v) => setFormData({ ...formData, ai_help_enabled: v })}
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-indigo-500 hover:bg-indigo-600"
              disabled={createAssignmentMutation.isPending}
            >
              {createAssignmentMutation.isPending ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Create Assignment
                </>
              )}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}