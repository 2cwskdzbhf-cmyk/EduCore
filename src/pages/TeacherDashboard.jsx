import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
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
import { 
  Users, 
  BookOpen, 
  ClipboardList,
  Plus,
  ChevronRight,
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Award,
  Copy,
  Check
} from 'lucide-react';

export default function TeacherDashboard() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [newClassOpen, setNewClassOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    fetchUser();
  }, []);

  const { data: classes = [], isLoading: loadingClasses } = useQuery({
    queryKey: ['teacherClasses', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Class.filter({ teacher_email: user.email });
    },
    enabled: !!user?.email
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => base44.entities.Subject.list()
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['teacherAssignments', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Assignment.filter({ teacher_email: user.email }, '-created_date');
    },
    enabled: !!user?.email
  });

  const { data: allProgress = [] } = useQuery({
    queryKey: ['allStudentProgress'],
    queryFn: () => base44.entities.StudentProgress.list()
  });

  const createClassMutation = useMutation({
    mutationFn: async () => {
      const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      await base44.entities.Class.create({
        name: newClassName,
        teacher_email: user.email,
        subject_id: selectedSubject,
        student_emails: [],
        join_code: joinCode
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['teacherClasses']);
      setNewClassOpen(false);
      setNewClassName('');
      setSelectedSubject('');
    }
  });

  const getTotalStudents = () => {
    return classes.reduce((sum, c) => sum + (c.student_emails?.length || 0), 0);
  };

  const getClassStudentProgress = (classObj) => {
    const studentEmails = classObj.student_emails || [];
    const progressData = allProgress.filter(p => studentEmails.includes(p.student_email));
    
    if (progressData.length === 0) return { avg: 0, top: null, struggling: null };

    const avgXp = progressData.reduce((sum, p) => sum + (p.total_xp || 0), 0) / progressData.length;
    const sortedByXp = [...progressData].sort((a, b) => (b.total_xp || 0) - (a.total_xp || 0));
    
    return {
      avg: Math.round(avgXp),
      top: sortedByXp[0],
      struggling: sortedByXp[sortedByXp.length - 1]
    };
  };

  const copyJoinCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Teacher Dashboard
            </h1>
            <p className="text-slate-500 mt-1">
              Welcome back{user?.full_name ? `, ${user.full_name}` : ''}
            </p>
          </div>
          <div className="flex gap-3">
            <Dialog open={newClassOpen} onOpenChange={setNewClassOpen}>
              <DialogTrigger asChild>
                <Button className="bg-indigo-500 hover:bg-indigo-600">
                  <Plus className="w-4 h-4 mr-2" />
                  New Class
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Class</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>Class Name</Label>
                    <Input
                      placeholder="e.g., Year 9 Maths Set 1"
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Subject</Label>
                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select a subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map(subject => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => createClassMutation.mutate()}
                    disabled={!newClassName || !selectedSubject || createClassMutation.isPending}
                  >
                    {createClassMutation.isPending ? 'Creating...' : 'Create Class'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Link to={createPageUrl('CreateAssignment')}>
              <Button variant="outline">
                <ClipboardList className="w-4 h-4 mr-2" />
                New Assignment
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div
            className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{getTotalStudents()}</p>
                <p className="text-sm text-slate-500">Total Students</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{classes.length}</p>
                <p className="text-sm text-slate-500">Classes</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg">
                <ClipboardList className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{assignments.length}</p>
                <p className="text-sm text-slate-500">Assignments</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">
                  {assignments.filter(a => new Date(a.due_date) > new Date()).length}
                </p>
                <p className="text-sm text-slate-500">Active Assignments</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Classes */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Your Classes</h2>
          
          {loadingClasses ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-48 rounded-2xl" />
              ))}
            </div>
          ) : classes.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map((classObj, idx) => {
                const subject = subjects.find(s => s.id === classObj.subject_id);
                const stats = getClassStudentProgress(classObj);

                return (
                  <motion.div
                    key={classObj.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Link to={createPageUrl(`ClassDetails?id=${classObj.id}`)}>
                      <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-semibold text-slate-800">{classObj.name}</h3>
                            <p className="text-sm text-slate-500">{subject?.name || 'No subject'}</p>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-slate-500">
                            <Users className="w-4 h-4" />
                            {classObj.student_emails?.length || 0}
                          </div>
                        </div>

                        <div className="bg-slate-50 rounded-lg p-3 mb-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500">Join Code:</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-700">{classObj.join_code}</span>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  copyJoinCode(classObj.join_code);
                                }}
                                className="p-1 hover:bg-slate-200 rounded"
                              >
                                {copiedCode === classObj.join_code ? (
                                  <Check className="w-4 h-4 text-emerald-500" />
                                ) : (
                                  <Copy className="w-4 h-4 text-slate-400" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">Avg XP: {stats.avg}</span>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="font-semibold text-slate-700 mb-2">No classes yet</h3>
              <p className="text-slate-500 text-sm mb-4">Create your first class to start adding students</p>
              <Button onClick={() => setNewClassOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Class
              </Button>
            </Card>
          )}
        </div>

        {/* Recent Assignments */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900">Recent Assignments</h2>
            <Link to={createPageUrl('CreateAssignment')} className="text-indigo-600 text-sm font-medium hover:underline">
              View all
            </Link>
          </div>

          {assignments.length > 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-100">
              {assignments.slice(0, 5).map(assignment => {
                const classObj = classes.find(c => c.id === assignment.class_id);
                const isPastDue = new Date(assignment.due_date) < new Date();

                return (
                  <div key={assignment.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isPastDue ? 'bg-slate-100' : 'bg-indigo-100'
                      }`}>
                        <ClipboardList className={`w-5 h-5 ${
                          isPastDue ? 'text-slate-500' : 'text-indigo-600'
                        }`} />
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-800">{assignment.title}</h4>
                        <p className="text-sm text-slate-500">
                          {classObj?.name} • Due {new Date(assignment.due_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        assignment.type === 'quiz' 
                          ? 'bg-amber-100 text-amber-700' 
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {assignment.type}
                      </span>
                      {!assignment.ai_help_enabled && (
                        <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                          No AI
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="font-semibold text-slate-700 mb-2">No assignments yet</h3>
              <p className="text-slate-500 text-sm mb-4">Create assignments for your students</p>
              <Link to={createPageUrl('CreateAssignment')}>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Assignment
                </Button>
              </Link>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}