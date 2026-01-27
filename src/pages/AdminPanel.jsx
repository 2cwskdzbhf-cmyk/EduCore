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
  Shield,
  Database
} from 'lucide-react';

export default function AdminPanel() {
  const queryClient = useQueryClient();
  const [newSubjectOpen, setNewSubjectOpen] = useState(false);
  const [newTopicOpen, setNewTopicOpen] = useState(false);
  const [newSubject, setNewSubject] = useState({ name: '', description: '', color: 'indigo', icon: 'BookOpen' });
  const [newTopic, setNewTopic] = useState({ name: '', description: '', subject_id: '', difficulty_level: 'beginner', xp_reward: 50 });
  const [merging, setMerging] = useState(false);
  const [mergeResult, setMergeResult] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState(null);
  const [selectedYearGroup, setSelectedYearGroup] = useState('7');
  const [selectedSubject, setSelectedSubject] = useState('Maths');

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
      // Check for duplicate (case-insensitive, trimmed)
      const normalizedName = newSubject.name.trim().toLowerCase();
      const duplicate = subjects.find(s => 
        s.name.trim().toLowerCase() === normalizedName
      );
      
      if (duplicate) {
        throw new Error(`Subject "${duplicate.name}" already exists`);
      }
      
      await base44.entities.Subject.create({
        ...newSubject,
        name: newSubject.name.trim()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['subjects']);
      setNewSubjectOpen(false);
      setNewSubject({ name: '', description: '', color: 'indigo', icon: 'BookOpen' });
    },
    onError: (error) => {
      alert(error.message);
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

  const handleMergeSubjects = async () => {
    setMerging(true);
    setMergeResult(null);
    try {
      const response = await base44.functions.invoke('mergeSubjects', {});
      setMergeResult({ success: true, data: response.data });
      queryClient.invalidateQueries(['subjects']);
      queryClient.invalidateQueries(['topics']);
    } catch (error) {
      setMergeResult({ success: false, message: error.message });
    } finally {
      setMerging(false);
    }
  };

  const handleSeedGlobalQuestions = async (pack) => {
    setSeeding(true);
    setSeedResult(null);
    try {
      // Call the seed function
      const response = await base44.functions.invoke('seedGlobalQuestions', { pack });
      
      // Verify the seeding worked
      const allQuestions = await base44.entities.QuizQuestion.list('-created_date', 100);
      const globalQuestions = allQuestions.filter(q => q.visibility === 'global');
      
      console.log('🔍 Verification after seeding:');
      console.log(`   Total questions: ${allQuestions.length}`);
      console.log(`   Global questions: ${globalQuestions.length}`);
      console.log(`   First 3 global IDs:`, globalQuestions.slice(0, 3).map(q => q.id));
      
      setSeedResult({ 
        success: true, 
        data: {
          ...response.data,
          verified_total: allQuestions.length,
          verified_global: globalQuestions.length,
          sample_global_ids: globalQuestions.slice(0, 3).map(q => q.id)
        }
      });
      queryClient.invalidateQueries(['questionBankGlobal']);
      queryClient.invalidateQueries(['questions']);
    } catch (error) {
      console.error('Seeding error:', error);
      setSeedResult({ success: false, message: error.message });
    } finally {
      setSeeding(false);
    }
  };

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
            <TabsTrigger value="library">Global Library</TabsTrigger>
          </TabsList>

          <TabsContent value="subjects">
            {mergeResult && (
              <div className={`mb-4 p-4 rounded-lg ${mergeResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <p className={mergeResult.success ? 'text-green-800' : 'text-red-800'}>
                  {mergeResult.success ? mergeResult.data.message : mergeResult.message}
                </p>
                {mergeResult.success && (
                  <div className="text-sm text-green-700 mt-2">
                    <p>• Subjects deleted: {mergeResult.data.subjects_deleted}</p>
                    <p>• Topics updated: {mergeResult.data.topics_updated}</p>
                    <p>• Questions updated: {mergeResult.data.questions_updated}</p>
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-slate-900">Subjects</h2>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleMergeSubjects}
                  disabled={merging}
                  className="text-orange-600 border-orange-300 hover:bg-orange-50"
                >
                  {merging ? 'Merging...' : 'Merge Duplicates'}
                </Button>
              </div>
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

          <TabsContent value="library">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900 mb-1">Global Question Library</h2>
              <p className="text-sm text-slate-500">Seed shared questions for all teachers by year group, subject, and topic</p>
            </div>

            {seedResult && (
              <div className={`mb-4 p-4 rounded-lg ${seedResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <p className={seedResult.success ? 'text-green-800 font-semibold' : 'text-red-800'}>
                  {seedResult.success ? seedResult.data.message : seedResult.message}
                </p>
                {seedResult.success && (
                  <div className="text-sm text-green-700 mt-3 space-y-1">
                    <p className="font-semibold">📊 Seeding Results:</p>
                    <p>✅ Created: {seedResult.data.created}</p>
                    <p>⏭️  Skipped: {seedResult.data.skipped}</p>
                    <p>🌍 Total global questions: {seedResult.data.total_global}</p>
                    {seedResult.data.sample_ids && seedResult.data.sample_ids.length > 0 && (
                      <p>🆔 Sample IDs: {seedResult.data.sample_ids.join(', ')}</p>
                    )}
                    <div className="mt-3 pt-3 border-t border-green-300">
                      <p className="font-semibold">✓ Verification:</p>
                      <p>📝 Total questions in DB: {seedResult.data.verified_total}</p>
                      <p>🌍 Global questions found: {seedResult.data.verified_global}</p>
                      {seedResult.data.sample_global_ids && seedResult.data.sample_global_ids.length > 0 && (
                        <p>🔍 Sample global IDs: {seedResult.data.sample_global_ids.join(', ')}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl border border-purple-200 p-6 mb-6">
              <h3 className="font-semibold text-slate-900 mb-4">Quick Filters</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-700 mb-2 block">Year Group</Label>
                  <Select value={selectedYearGroup} onValueChange={setSelectedYearGroup}>
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Year 7</SelectItem>
                      <SelectItem value="8">Year 8</SelectItem>
                      <SelectItem value="9">Year 9</SelectItem>
                      <SelectItem value="10">Year 10</SelectItem>
                      <SelectItem value="11">Year 11</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-700 mb-2 block">Subject</Label>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Maths">Maths</SelectItem>
                      <SelectItem value="Science">Science</SelectItem>
                      <SelectItem value="English">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900">Available Seed Packs</h3>
              
              <div className="grid gap-4">
                <Card className="p-5 hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Database className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-slate-900">Maths Year 7 - Fractions</h4>
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">15 questions</span>
                      </div>
                      <p className="text-sm text-slate-600 mb-3">
                        Basic fractions, simplification, addition, subtraction, multiplication, division. (5 easy, 5 medium, 5 hard)
                      </p>
                      <Button
                        onClick={() => handleSeedGlobalQuestions('y7-maths-fractions')}
                        disabled={seeding}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {seeding ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" /> : <Database className="w-4 h-4 mr-2" />}
                        Seed Pack
                      </Button>
                    </div>
                  </div>
                </Card>

                <Card className="p-5 hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <Database className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-slate-900">Maths Year 8 - Algebra</h4>
                        <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">15 questions</span>
                      </div>
                      <p className="text-sm text-slate-600 mb-3">
                        Solving equations, simplifying expressions, expanding brackets, substitution. (5 easy, 5 medium, 5 hard)
                      </p>
                      <Button
                        onClick={() => handleSeedGlobalQuestions('y8-maths-algebra')}
                        disabled={seeding}
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700"
                      >
                        {seeding ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" /> : <Database className="w-4 h-4 mr-2" />}
                        Seed Pack
                      </Button>
                    </div>
                  </div>
                </Card>

                <Card className="p-5 hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                      <Database className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-slate-900">Science Year 7 - Biology</h4>
                        <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">15 questions</span>
                      </div>
                      <p className="text-sm text-slate-600 mb-3">
                        Cells, photosynthesis, human body systems, organs, microorganisms. (5 easy, 5 medium, 5 hard)
                      </p>
                      <Button
                        onClick={() => handleSeedGlobalQuestions('y7-science-biology')}
                        disabled={seeding}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {seeding ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" /> : <Database className="w-4 h-4 mr-2" />}
                        Seed Pack
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}