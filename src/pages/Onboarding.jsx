import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  GraduationCap, 
  User, 
  BookOpen, 
  ChevronRight, 
  ChevronLeft,
  Sparkles,
  Check
} from 'lucide-react';

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [formData, setFormData] = useState({
    user_type: '',
    year_group: null,
    subjects: []
  });

  // Check if user is authenticated and if they've already completed onboarding
  useEffect(() => {
    const checkAuth = async () => {
      const isAuthenticated = await base44.auth.isAuthenticated();
      if (!isAuthenticated) {
        // Not logged in - redirect to login
        base44.auth.redirectToLogin(createPageUrl('Onboarding'));
        return;
      }
      
      // Check if user already has a user_type (already onboarded)
      const user = await base44.auth.me();
      if (user.user_type) {
        // Already onboarded - redirect to appropriate dashboard
        if (user.user_type === 'student') {
          navigate(createPageUrl('StudentDashboard'));
        } else if (user.user_type === 'teacher') {
          navigate(createPageUrl('TeacherDashboard'));
        } else {
          navigate(createPageUrl('AdminPanel'));
        }
        return;
      }
      
      setCheckingAuth(false);
    };
    checkAuth();
  }, [navigate]);

  const userTypes = [
    { id: 'student', label: 'Student', icon: User, description: 'I want to learn and practice' },
    { id: 'teacher', label: 'Teacher', icon: BookOpen, description: 'I want to teach and track progress' },
  ];

  const yearGroups = [7, 8, 9, 10, 11];

  const handleComplete = async () => {
    setLoading(true);
    try {
      await base44.auth.updateMe(formData);
      
      // Create initial progress for students
      if (formData.user_type === 'student') {
        const user = await base44.auth.me();
        const existingProgress = await base44.entities.StudentProgress.filter({ student_email: user.email });
        if (existingProgress.length === 0) {
          await base44.entities.StudentProgress.create({
            student_email: user.email,
            total_xp: 0,
            level: 1,
            current_streak: 0,
            longest_streak: 0,
            badges: [],
            completed_lessons: [],
            topic_mastery: {},
            weak_areas: [],
            strong_areas: [],
            daily_xp_goal: 50,
            today_xp: 0
          });
        }
      }

      if (formData.user_type === 'student') {
        navigate(createPageUrl('StudentDashboard'));
      } else {
        navigate(createPageUrl('TeacherDashboard'));
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
    setLoading(false);
  };

  // Show loading while checking auth
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-6">
      <motion.div
        className="w-full max-w-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              EduCore
            </span>
          </div>
        </div>

        {/* Progress Dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2].map(i => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? 'w-8 bg-indigo-500' : i < step ? 'w-2 bg-indigo-500' : 'w-2 bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-indigo-500/10 p-8 border border-slate-100">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="text-center mb-8">
                  <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome! Let's get started</h1>
                  <p className="text-slate-500">What best describes you?</p>
                </div>

                <div className="space-y-4">
                  {userTypes.map(type => (
                    <button
                      key={type.id}
                      onClick={() => setFormData({ ...formData, user_type: type.id })}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-4 ${
                        formData.user_type === type.id
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        formData.user_type === type.id
                          ? 'bg-indigo-500 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        <type.icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-800">{type.label}</h3>
                        <p className="text-sm text-slate-500">{type.description}</p>
                      </div>
                      {formData.user_type === type.id && (
                        <Check className="w-5 h-5 text-indigo-500" />
                      )}
                    </button>
                  ))}
                </div>

                <Button
                  className="w-full mt-8 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                  disabled={!formData.user_type}
                  onClick={() => setStep(2)}
                >
                  Continue
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </motion.div>
            )}

            {step === 2 && formData.user_type === 'student' && (
              <motion.div
                key="step2-student"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="text-center mb-8">
                  <h1 className="text-2xl font-bold text-slate-900 mb-2">What year are you in?</h1>
                  <p className="text-slate-500">This helps us personalise your experience</p>
                </div>

                <div className="grid grid-cols-5 gap-3">
                  {yearGroups.map(year => (
                    <button
                      key={year}
                      onClick={() => setFormData({ ...formData, year_group: year })}
                      className={`p-4 rounded-xl border-2 transition-all font-semibold ${
                        formData.year_group === year
                          ? 'border-indigo-500 bg-indigo-500 text-white'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      Y{year}
                    </button>
                  ))}
                </div>

                <div className="flex gap-3 mt-8">
                  <Button
                    variant="outline"
                    className="flex-1 h-12"
                    onClick={() => setStep(1)}
                  >
                    <ChevronLeft className="w-5 h-5 mr-2" />
                    Back
                  </Button>
                  <Button
                    className="flex-1 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                    disabled={!formData.year_group || loading}
                    onClick={handleComplete}
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Start Learning
                        <Sparkles className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 2 && formData.user_type === 'teacher' && (
              <motion.div
                key="step2-teacher"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="text-center mb-8">
                  <h1 className="text-2xl font-bold text-slate-900 mb-2">Almost there!</h1>
                  <p className="text-slate-500">You're all set to create classes and assignments</p>
                </div>

                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-2">Teacher Account</h3>
                  <p className="text-sm text-slate-600">
                    Create classes, assign work, and track your students' progress all in one place.
                  </p>
                </div>

                <div className="flex gap-3 mt-8">
                  <Button
                    variant="outline"
                    className="flex-1 h-12"
                    onClick={() => setStep(1)}
                  >
                    <ChevronLeft className="w-5 h-5 mr-2" />
                    Back
                  </Button>
                  <Button
                    className="flex-1 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                    disabled={loading}
                    onClick={handleComplete}
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Go to Dashboard
                        <ChevronRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}