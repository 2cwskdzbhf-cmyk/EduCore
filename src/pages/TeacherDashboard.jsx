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
  Check,
  Trophy,
  Sparkles
} from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { StatCard } from '@/components/ui/GlassCard';
import NotificationPanel from '@/components/teacher/NotificationPanel';

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
      if (!user?.email) return;
      
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
          <p className="text-slate-400">
            Welcome back{user?.full_name ? `, ${user.full_name}` : ''}
          </p>
        </motion.div>

        <div className="flex justify-end mb-8">
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
                    <Link to={createPageUrl(`TeacherClassDetail?id=${classObj.id}`)}>
                      <GlassCard className="p-6 hover:scale-[1.02]">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-semibold text-white">{classObj.name}</h3>
                            <p className="text-sm text-slate-400">{subject?.name || 'No subject'}</p>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-slate-400">
                            <Users className="w-4 h-4" />
                            {classObj.student_emails?.length || 0}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Avg Accuracy: {stats.avgAccuracy}%</span>
                          <ChevronRight className="w-4 h-4 text-slate-500" />
                        </div>
                      </GlassCard>
                    </Link>
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

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <StatCard
            icon={Users}
            label="Total Students"
            value={getTotalStudents()}
            delay={0}
          />
          <StatCard
            icon={BookOpen}
            label="Classes"
            value={classes.length}
            delay={0.1}
          />
          <StatCard
            icon={ClipboardList}
            label="Assignments"
            value={assignments.length}
            delay={0.2}
          />
        </div>

        {/* Notifications */}
        {user && (
          <div className="mb-8">
            <NotificationPanel teacherEmail={user.email} />
          </div>
        )}

      </div>
    </div>
  );
}