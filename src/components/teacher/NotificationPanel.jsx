import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, UserPlus, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/ui/GlassCard';

export default function NotificationPanel({ teacherEmail }) {
  const [dismissed, setDismissed] = useState([]);
  const [lastCheck, setLastCheck] = useState(Date.now());

  const { data: classes = [] } = useQuery({
    queryKey: ['teacherClasses', teacherEmail],
    queryFn: async () => {
      if (!teacherEmail) return [];
      return base44.entities.Class.filter({ teacher_email: teacherEmail });
    },
    enabled: !!teacherEmail
  });

  const { data: recentSubmissions = [] } = useQuery({
    queryKey: ['recentSubmissions', teacherEmail, lastCheck],
    queryFn: async () => {
      if (!teacherEmail || classes.length === 0) return [];
      const classIds = classes.map(c => c.id);
      const allSubmissions = await Promise.all(
        classIds.map(id => base44.entities.AssignmentSubmission.filter({ class_id: id }, '-created_date'))
      );
      const submissions = allSubmissions.flat();
      // Get submissions from the last 24 hours
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      return submissions.filter(s => 
        s.status === 'submitted' && 
        new Date(s.submitted_at).getTime() > oneDayAgo
      ).slice(0, 5);
    },
    enabled: !!teacherEmail && classes.length > 0,
    refetchInterval: 30000
  });

  // Track new enrollments by comparing student counts
  const [previousStudentCounts, setPreviousStudentCounts] = useState({});
  const [newEnrollments, setNewEnrollments] = useState([]);

  useEffect(() => {
    if (classes.length === 0) return;

    const currentCounts = {};
    const enrollments = [];

    classes.forEach(cls => {
      const currentCount = cls.student_emails?.length || 0;
      currentCounts[cls.id] = currentCount;

      if (previousStudentCounts[cls.id] !== undefined && currentCount > previousStudentCounts[cls.id]) {
        const newStudentCount = currentCount - previousStudentCounts[cls.id];
        enrollments.push({
          id: `enroll-${cls.id}-${Date.now()}`,
          classId: cls.id,
          className: cls.name,
          count: newStudentCount,
          timestamp: Date.now()
        });
      }
    });

    if (enrollments.length > 0) {
      setNewEnrollments(prev => [...enrollments, ...prev].slice(0, 10));
    }
    setPreviousStudentCounts(currentCounts);
  }, [classes]);

  const notifications = [
    ...newEnrollments
      .filter(e => !dismissed.includes(e.id))
      .map(e => ({
        id: e.id,
        type: 'enrollment',
        icon: UserPlus,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/20',
        borderColor: 'border-blue-500/30',
        message: `${e.count} new student${e.count > 1 ? 's' : ''} joined ${e.className}`,
        timestamp: e.timestamp
      })),
    ...recentSubmissions
      .filter(s => !dismissed.includes(s.id))
      .map(s => ({
        id: s.id,
        type: 'submission',
        icon: CheckCircle2,
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/20',
        borderColor: 'border-emerald-500/30',
        message: `New submission from ${s.student_email?.split('@')[0]}`,
        timestamp: new Date(s.submitted_at).getTime()
      }))
  ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);

  const handleDismiss = (id) => {
    setDismissed([...dismissed, id]);
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-5 h-5 text-amber-400" />
        <h3 className="text-lg font-bold text-white">Notifications</h3>
        {notifications.length > 0 && (
          <span className="px-2 py-1 bg-amber-500/30 rounded-full text-xs font-bold text-amber-200">
            {notifications.length}
          </span>
        )}
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {notifications.map((notif) => {
            const Icon = notif.icon;
            return (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className={`flex items-start gap-3 p-3 rounded-lg ${notif.bgColor} border ${notif.borderColor}`}
              >
                <Icon className={`w-5 h-5 ${notif.color} flex-shrink-0 mt-0.5`} />
                <p className="text-sm text-white flex-1">{notif.message}</p>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-slate-400 hover:text-white"
                  onClick={() => handleDismiss(notif.id)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </GlassCard>
  );
}