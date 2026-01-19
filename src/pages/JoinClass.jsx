import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  ChevronLeft,
  Check,
  AlertCircle
} from 'lucide-react';

export default function JoinClass() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    fetchUser();
  }, []);

  const joinClassMutation = useMutation({
    mutationFn: async () => {
      setError('');
      
      // Find class by join code
      const classes = await base44.entities.Class.filter({ join_code: joinCode.toUpperCase() });
      
      if (classes.length === 0) {
        throw new Error('Invalid join code. Please check and try again.');
      }

      const classToJoin = classes[0];
      const studentEmails = classToJoin.student_emails || [];

      if (studentEmails.includes(user.email)) {
        throw new Error('You are already in this class!');
      }

      // Add student to class
      await base44.entities.Class.update(classToJoin.id, {
        student_emails: [...studentEmails, user.email]
      });

      return classToJoin;
    },
    onSuccess: () => {
      setSuccess(true);
      queryClient.invalidateQueries(['classes']);
      setTimeout(() => {
        navigate(createPageUrl('StudentDashboard'));
      }, 2000);
    },
    onError: (err) => {
      setError(err.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (joinCode.trim()) {
      joinClassMutation.mutate();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-6">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>

        <div className="bg-white rounded-3xl shadow-xl shadow-indigo-500/10 p-8 border border-slate-100">
          {success ? (
            <motion.div
              className="text-center py-8"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <div className="w-20 h-20 mx-auto mb-6 bg-emerald-100 rounded-full flex items-center justify-center">
                <Check className="w-10 h-10 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">You're in!</h2>
              <p className="text-slate-500">Successfully joined the class. Redirecting...</p>
            </motion.div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Join a Class</h1>
                <p className="text-slate-500">Enter the code your teacher gave you</p>
              </div>

              <form onSubmit={handleSubmit}>
                <Input
                  placeholder="Enter join code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="text-center text-2xl font-mono tracking-widest h-16 mb-4"
                  maxLength={6}
                />

                {error && (
                  <motion.div
                    className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl mb-4"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm">{error}</span>
                  </motion.div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                  disabled={!joinCode.trim() || joinClassMutation.isPending}
                >
                  {joinClassMutation.isPending ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Join Class'
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}