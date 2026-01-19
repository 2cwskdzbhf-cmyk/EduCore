import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Users, 
  BookOpen, 
  Layers,
  Plus,
  Settings,
  Trash2,
  Edit,
  Shield
} from 'lucide-react';

export default function AdminPanel() {
  const queryClient = useQueryClient();
  const [newSubjectOpen, setNewSubjectOpen] = useState(false);
  const [newTopicOpen, setNewTopicOpen] = useState(false);
  const [newSubject, setNewSubject] = useState({ name: '', description: '', color: 'indigo', icon: 'BookOpen' });
  const [newTopic, setNewTopic] = useState({ name: '', description: '', subject_id: '', difficulty_level: 'beginner', xp_reward: 50 });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => base44.entities.Subject.list()
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['topics'],
    queryFn: () => base44.entities.Topic.list()
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => base44.entities.Class.list()
  });

  const createSubjectMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Subject.create(newSubject);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['subjects']);
      setNewSubjectOpen(false);
      setNewSubject({ name: '', description: '', color: 'indigo', icon: 'BookOpen' });
    }
  });

  const createTopicMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Topic.create(newTopic);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['topics']);
      setNewTopicOpen(false);
      setNewTopic({ name: '', description: '', subject_id: '', difficulty_level: 'beginner', xp_reward: 50 });
    }
  });

  const deleteSubjectMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.Subject.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['subjects']);
    }
  });

  const colors = ['indigo', 'blue', 'green', 'purple', 'orange', 'pink'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="flex items-center gap-4 mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Admin Panel</h1>
            <p className="text-slate-500">Manage users, subjects, and content</p>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{users.length}</p>
                <p className="text-sm text-slate-500">Total Users</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{subjects.length}</p>
                <p className="text-sm text-slate-500">Subjects</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <Layers className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{topics.length}</p>
                <p className="text-sm text-slate-500">Topics</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <Settings className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{classes.length}</p>
                <p className="text-sm text-slate-500">Classes</p>
              </div>
            </div>
          </Card>
        </div>

        <Tabs defaultValue="subjects" className="space-y-6">
          <TabsList className="bg-white border border-slate-200">
            <TabsTrigger value="subjects">Subjects</TabsTrigger>
            <TabsTrigger value="topics">Topics</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="subjects">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-900">Subjects</h2>
              <Dialog open={newSubjectOpen} onOpenChange={setNewSubjectOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Subject
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Subject</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <Label>Subject Name</Label>
                      <Input
                        value={newSubject.name}
                        onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                        placeholder="e.g., Mathematics"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={newSubject.description}
                        onChange={(e) => setNewSubject({ ...newSubject, description: e.target.value })}
                        placeholder="Brief description..."
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Color</Label>
                      <Select value={newSubject.color} onValueChange={(v) => setNewSubject({ ...newSubject, color: v })}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {colors.map(color => (
                            <SelectItem key={color} value={color}>
                              <div className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded bg-${color}-500`} />
                                {color}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => createSubjectMutation.mutate()}
                      disabled={!newSubject.name || createSubjectMutation.isPending}
                    >
                      {createSubjectMutation.isPending ? 'Creating...' : 'Create Subject'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-100">
              {subjects.map(subject => (
                <div key={subject.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl bg-${subject.color}-100 flex items-center justify-center`}>
                      <BookOpen className={`w-5 h-5 text-${subject.color}-600`} />
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-800">{subject.name}</h4>
                      <p className="text-sm text-slate-500">{subject.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">
                      {topics.filter(t => t.subject_id === subject.id).length} topics
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteSubjectMutation.mutate(subject.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
              {subjects.length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  No subjects yet. Create one to get started.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="topics">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-900">Topics</h2>
              <Dialog open={newTopicOpen} onOpenChange={setNewTopicOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Topic
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Topic</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <Label>Subject</Label>
                      <Select value={newTopic.subject_id} onValueChange={(v) => setNewTopic({ ...newTopic, subject_id: v })}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {subjects.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Topic Name</Label>
                      <Input
                        value={newTopic.name}
                        onChange={(e) => setNewTopic({ ...newTopic, name: e.target.value })}
                        placeholder="e.g., Fractions"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={newTopic.description}
                        onChange={(e) => setNewTopic({ ...newTopic, description: e.target.value })}
                        placeholder="What will students learn?"
                        className="mt-1"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Difficulty</Label>
                        <Select value={newTopic.difficulty_level} onValueChange={(v) => setNewTopic({ ...newTopic, difficulty_level: v })}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="beginner">Beginner</SelectItem>
                            <SelectItem value="intermediate">Intermediate</SelectItem>
                            <SelectItem value="advanced">Advanced</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>XP Reward</Label>
                        <Input
                          type="number"
                          value={newTopic.xp_reward}
                          onChange={(e) => setNewTopic({ ...newTopic, xp_reward: parseInt(e.target.value) })}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => createTopicMutation.mutate()}
                      disabled={!newTopic.name || !newTopic.subject_id || createTopicMutation.isPending}
                    >
                      {createTopicMutation.isPending ? 'Creating...' : 'Create Topic'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-100">
              {topics.map(topic => {
                const subject = subjects.find(s => s.id === topic.subject_id);
                return (
                  <div key={topic.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                        <Layers className="w-5 h-5 text-slate-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-800">{topic.name}</h4>
                        <p className="text-sm text-slate-500">{subject?.name || 'No subject'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        topic.difficulty_level === 'beginner' ? 'bg-green-100 text-green-700' :
                        topic.difficulty_level === 'intermediate' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {topic.difficulty_level}
                      </span>
                      <span className="text-sm text-slate-500">+{topic.xp_reward} XP</span>
                    </div>
                  </div>
                );
              })}
              {topics.length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  No topics yet. Create subjects first, then add topics.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="users">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Users</h2>
            <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-100">
              {users.map(user => (
                <div key={user.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold">
                      {user.full_name?.charAt(0) || user.email?.charAt(0) || '?'}
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-800">{user.full_name || 'No name'}</h4>
                      <p className="text-sm text-slate-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                      user.user_type === 'admin' ? 'bg-red-100 text-red-700' :
                      user.user_type === 'teacher' ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {user.user_type || 'student'}
                    </span>
                    {user.year_group && (
                      <span className="text-sm text-slate-500">Year {user.year_group}</span>
                    )}
                  </div>
                </div>
              ))}
              {users.length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  No users registered yet.
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}