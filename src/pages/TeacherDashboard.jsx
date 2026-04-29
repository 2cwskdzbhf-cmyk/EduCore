import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
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
  Check,
  Trophy,
  Sparkles,
  BrainCircuit,
  Trash2,
  X
} from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { StatCard } from '@/components/ui/GlassCard';
import NotificationPanel from '@/components/teacher/NotificationPanel';

export default function TeacherDashboard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [newClassOpen, setNewClassOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedYearGroup, setSelectedYearGroup] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);
  const [deleteConfirmClass, setDeleteConfirmClass] = useState(null);


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

  const generateUniqueJoinCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 7; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  };

  const createClassMutation = useMutation({
    mutationFn: async () => {
      if (!user?.email || !selectedSubject) throw new Error('Subject is required');
      
      let joinCode = generateUniqueJoinCode();
      let isUnique = false;
      let attempts = 0;
      
      while (!isUnique && attempts < 5) {
        const existing = await base44.entities.Class.filter({ join_code: joinCode });
        if (existing.length === 0) {
          isUnique = true;
        } else {
          joinCode = generateUniqueJoinCode();
          attempts++;
        }
      }
      
      return base44.entities.Class.create({
        name: newClassName,
        teacher_email: user.email,
        subject_id: selectedSubject,
        year_group: selectedYearGroup ? parseInt(selectedYearGroup) : null,
        join_code: joinCode,
        student_emails: [],
        is_active: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['teacherClasses']);
      setNewClassOpen(false);
      setNewClassName('');
      setSelectedSubject('');
      setSelectedYearGroup('');
    },
    onError: (error) => {
      alert(error.message || 'Failed to create class');
    }
  });

  const deleteClassMutation = useMutation({
    mutationFn: async (classId) => {
      // Delete all assignments for this class
      const classAssignments = await base44.entities.Assignment.filter({ class_id: classId });
      for (const assignment of classAssignments) {
        const submissions = await base44.entities.AssignmentSubmission.filter({ assignment_id: assignment.id });
        for (const sub of submissions) {
          await base44.entities.AssignmentSubmission.delete(sub.id);
        }
        await base44.entities.Assignment.delete(assignment.id);
      }
      
      // Delete the class
      await base44.entities.Class.delete(classId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['teacherClasses']);
      setDeleteConfirmClass(null);
    },
    onError: (error) => {
      console.error('Failed to delete class:', error);
      alert('Failed to delete class. Please try again.');
    }
  });

  const getTotalStudents = () => {
    return classes.reduce((sum, c) => sum + (c.student_emails?.length || 0), 0);
  };

  const getClassStudentProgress = (classObj) => {
    const studentEmails = classObj.student_emails || [];
    const progressData = allProgress.filter(p => studentEmails.includes(p.student_email));
    
    if (progressData.length === 0) return { avgAccuracy: 0, top: null, struggling: null };

    const avgAccuracy = progressData.reduce((sum, p) => sum + (p.accuracy_percent || 0), 0) / progressData.length;
    const sortedByAccuracy = [...progressData].sort((a, b) => (b.accuracy_percent || 0) - (a.accuracy_percent || 0));
    
    return {
      avgAccuracy: Math.round(avgAccuracy * 10) / 10,
      top: sortedByAccuracy[0],
      struggling: sortedByAccuracy[sortedByAccuracy.length - 1]
    };
  };

  const copyJoinCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl font-bold text-white mb-2">
            Teacher Dashboard
          </h1>
          <p className="text-slate-400 mb-6">
            Welcome back{user?.full_name ? `, ${user.full_name}` : ''}
          </p>

          {/* Stats directly under welcome */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 mb-4">
            <StatCard icon={Users} label="Total Students" value={getTotalStudents()} delay={0} />
            <StatCard icon={BookOpen} label="Classes" value={classes.length} delay={0.1} />
            <StatCard icon={ClipboardList} label="Assignments" value={assignments.length} delay={0.2} />
          </div>
        </motion.div>

        <div className="flex justify-end gap-3 mb-8">
          <Dialog open={newClassOpen} onOpenChange={setNewClassOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 shadow-lg shadow-purple-500/30">
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
                  <div>
                    <Label>Year Group</Label>
                    <Select value={selectedYearGroup} onValueChange={setSelectedYearGroup}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select year group" />
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
        </div>

        {/* Classes */}
        <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-6">Your Classes</h2>
        <p className="text-slate-400 mb-6">Click a class to manage assignments, quizzes, and live sessions</p>
          
          {loadingClasses ? (
            <div className="grid md:grid-cols-2 gap-6">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-40 rounded-2xl bg-white/5" />
              ))}
            </div>
          ) : classes.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-6">
              {classes.map((classObj, idx) => {
                const subject = subjects.find(s => s.id === classObj.subject_id);
                const stats = getClassStudentProgress(classObj);

                return (
                  <motion.div
                    key={classObj.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1, duration: 0.3 }}
                  >
                    <GlassCard className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <Link to={createPageUrl(`TeacherClassDetail?id=${classObj.id}`)} className="flex-1">
                          <div>
                            <h3 className="font-semibold text-white hover:text-purple-400 transition-colors">{classObj.name}</h3>
                            <p className="text-sm text-slate-400">{subject?.name || 'No subject'}</p>
                          </div>
                        </Link>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteConfirmClass(classObj)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 ml-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <Link to={createPageUrl(`TeacherClassDetail?id=${classObj.id}`)}>
                        <div className="flex items-center justify-between text-sm cursor-pointer group">
                          <div className="flex items-center gap-3">
                            <span className="text-slate-400"><Users className="w-4 h-4 inline mr-1" />{classObj.student_emails?.length || 0} students</span>
                            <span className="text-slate-400">Avg: {stats.avgAccuracy}%</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-400" />
                        </div>
                      </Link>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <GlassCard className="p-8 text-center">
              <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="font-semibold text-white mb-2">No classes yet</h3>
              <p className="text-slate-400 text-sm mb-4">Create your first class to start adding students</p>
              <Button onClick={() => setNewClassOpen(true)} className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 shadow-lg shadow-purple-500/30">
                <Plus className="w-4 h-4 mr-2" />
                Create Class
              </Button>
            </GlassCard>
          )}
        </div>



        {/* Knowledge Gap Dashboard shortcut */}
        <div className="mb-8">
          <Link to={createPageUrl('ClassKnowledgeGaps')}>
            <GlassCard className="p-5 flex items-center gap-4 hover:scale-[1.01]">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                <BrainCircuit className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">Class Knowledge Gap Dashboard</p>
                <p className="text-sm text-slate-400">View AI-identified gaps, trigger analysis & override practice modules</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-500" />
            </GlassCard>
          </Link>
        </div>

        {/* Notifications */}
        {user && (
          <div className="mb-8">
            <NotificationPanel teacherEmail={user.email} />
          </div>
        )}

        {/* Delete Class Confirmation */}
        {deleteConfirmClass && (
          <motion.div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !deleteClassMutation.isPending && setDeleteConfirmClass(null)}
          >
            <motion.div
              className="max-w-md w-full"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <GlassCard className="p-8">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Delete Class?</h3>
                    <p className="text-slate-400 text-sm mb-1">
                      Are you sure you want to delete <span className="text-white font-semibold">"{deleteConfirmClass.name}"</span>?
                    </p>
                    <p className="text-red-400 text-sm">
                      This will permanently delete the class, all assignments, and student data.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setDeleteConfirmClass(null)}
                    disabled={deleteClassMutation.isPending}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => deleteClassMutation.mutate(deleteConfirmClass.id)}
                    disabled={deleteClassMutation.isPending}
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-500/30"
                  >
                    {deleteClassMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Class
                      </>
                    )}
                  </Button>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}

      </div>
    </div>
  );
}