import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { 
  GraduationCap, 
  Brain, 
  Trophy, 
  Sparkles, 
  BookOpen, 
  Users, 
  Target,
  ChevronRight,
  Zap,
  Star
} from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  // If user is already logged in and has completed onboarding, redirect to their dashboard
  useEffect(() => {
    const checkExistingAuth = async () => {
      const isAuthenticated = await base44.auth.isAuthenticated();
      if (isAuthenticated) {
        const user = await base44.auth.me();
        if (user.user_type === 'student') {
          navigate(createPageUrl('StudentDashboard'));
        } else if (user.user_type === 'teacher') {
          navigate(createPageUrl('TeacherDashboard'));
        } else if (user.user_type === 'admin' || user.role === 'admin') {
          navigate(createPageUrl('AdminPanel'));
        } else {
          // User is logged in but hasn't completed onboarding
          navigate(createPageUrl('Onboarding'));
        }
      }
    };
    checkExistingAuth();
  }, [navigate]);
  const features = [
    {
      icon: Brain,
      title: "AI Personal Tutor",
      description: "Get personalised help that adapts to your learning style and identifies your strengths and weaknesses.",
      color: "from-[#3D52A0] to-[#7091E6]"
    },
    {
      icon: Trophy,
      title: "Gamified Learning",
      description: "Earn XP, unlock badges, and maintain streaks as you master new topics and skills.",
      color: "from-amber-500 to-orange-600"
    },
    {
      icon: BookOpen,
      title: "Interactive Lessons",
      description: "Short, engaging lessons with quizzes that auto-mark and provide instant feedback.",
      color: "from-[#7091E6] to-[#8697C4]"
    },
    {
      icon: Target,
      title: "Adaptive Difficulty",
      description: "Content that adjusts to your performance, keeping you challenged but not overwhelmed.",
      color: "from-[#8697C4] to-[#ADB8DA]"
    }
  ];

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0c1024 0%, #1a2450 50%, #0c1024 100%)' }}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg" style={{ background: 'rgba(8,12,26,0.85)', borderBottom: '1px solid rgba(112,145,230,0.15)' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7091E6, #3D52A0)' }}>
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold" style={{ color: '#ADB8DA' }}>
              EduCore
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              className="text-white/70 hover:text-white"
              onClick={() => base44.auth.redirectToLogin()}
            >
              Login
            </Button>
            <Button 
              className="text-white shadow-lg"
              style={{ background: 'linear-gradient(135deg, #3D52A0, #7091E6)', boxShadow: '0 4px 15px rgba(61,82,160,0.4)' }}
              onClick={() => base44.auth.redirectToLogin()}
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6" style={{ background: 'rgba(112,145,230,0.15)', color: '#7091E6', border: '1px solid rgba(112,145,230,0.3)' }}>
                <Sparkles className="w-4 h-4" />
                AI-Powered Learning Platform
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight mb-6 text-white">
                Learn Smarter,
                <span style={{ background: 'linear-gradient(135deg, #7091E6, #ADB8DA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}> Not Harder</span>
              </h1>
              <p className="text-xl mb-8 leading-relaxed" style={{ color: '#ADB8DA' }}>
                The all-in-one learning hub for secondary school students. 
                Combine interactive lessons, AI tutoring, and gamified progress tracking 
                to master your subjects.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button 
                  size="lg" 
                  className="text-white h-14 px-8 text-lg shadow-xl"
                  style={{ background: 'linear-gradient(135deg, #3D52A0, #7091E6)', boxShadow: '0 8px 25px rgba(61,82,160,0.45)' }}
                  onClick={() => base44.auth.redirectToLogin()}
                >
                  Start Learning Free
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-2 text-white/70 hover:text-white" style={{ borderColor: 'rgba(112,145,230,0.4)', background: 'rgba(112,145,230,0.05)' }}>
                  Watch Demo
                </Button>
              </div>
              <div className="flex items-center gap-6 mt-10 pt-6 border-t border-slate-100">
                <div className="flex -space-x-3">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 border-2 border-white" />
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-slate-600">Loved by 10,000+ students</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="relative"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="relative z-10 rounded-3xl shadow-2xl p-8 border" style={{ background: 'rgba(18,24,52,0.9)', borderColor: 'rgba(112,145,230,0.2)', boxShadow: '0 25px 60px rgba(61,82,160,0.25)' }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #3D52A0, #7091E6)' }}>
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Daily Progress</h3>
                    <p className="text-sm" style={{ color: '#8697C4' }}>Keep your streak alive!</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="rounded-xl p-4 border" style={{ background: 'rgba(61,82,160,0.15)', borderColor: 'rgba(112,145,230,0.2)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium" style={{ color: '#ADB8DA' }}>Today's XP</span>
                      <span className="text-sm font-bold" style={{ color: '#7091E6' }}>45/50</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(61,82,160,0.2)' }}>
                      <motion.div 
                        className="h-full rounded-full"
                        style={{ background: 'linear-gradient(90deg, #3D52A0, #7091E6)' }}
                        initial={{ width: 0 }}
                        animate={{ width: "90%" }}
                        transition={{ duration: 1, delay: 0.5 }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[['12', 'Day Streak'], ['Level 8', 'Current'], ['5', 'Badges']].map(([val, label]) => (
                      <div key={label} className="rounded-xl p-3 text-center" style={{ background: 'rgba(61,82,160,0.12)', border: '1px solid rgba(112,145,230,0.15)' }}>
                        <p className="text-2xl font-bold text-white">{val}</p>
                        <p className="text-xs" style={{ color: '#8697C4' }}>{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 w-24 h-24 rounded-2xl -z-10 rotate-12" style={{ background: 'linear-gradient(135deg, #7091E6, #3D52A0)' }} />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 rounded-2xl -z-10 -rotate-12" style={{ background: 'linear-gradient(135deg, #3D52A0, #ADB8DA)' }} />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6" style={{ background: 'rgba(61,82,160,0.06)' }}>
        <div className="max-w-7xl mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-xl max-w-2xl mx-auto" style={{ color: '#ADB8DA' }}>
              Powerful tools designed to make learning engaging, effective, and fun.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <motion.div
                key={feature.title}
                className="rounded-2xl p-6 transition-shadow hover:shadow-xl"
                style={{ background: 'rgba(18,24,52,0.8)', border: '1px solid rgba(112,145,230,0.15)' }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 shadow-lg`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#8697C4' }}>{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-white mb-6">
              Ready to Transform Your Learning?
            </h2>
            <p className="text-xl mb-8" style={{ color: '#ADB8DA' }}>
              Join thousands of students who are already learning smarter with EduCore.
            </p>
            <Button 
              size="lg" 
              className="text-white h-14 px-10 text-lg shadow-xl"
              style={{ background: 'linear-gradient(135deg, #3D52A0, #7091E6)', boxShadow: '0 8px 25px rgba(61,82,160,0.45)' }}
              onClick={() => base44.auth.redirectToLogin()}
            >
              Get Started for Free
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6" style={{ background: '#080c1a', borderTop: '1px solid rgba(112,145,230,0.1)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7091E6, #3D52A0)' }}>
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">EduCore</span>
            </div>
            <div className="flex items-center gap-8 text-sm" style={{ color: '#8697C4' }}>
              <a href="#" className="hover:text-white transition-colors">About</a>
              <a href="#" className="hover:text-white transition-colors">Features</a>
              <a href="#" className="hover:text-white transition-colors">Pricing</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>
            <p className="text-sm" style={{ color: '#8697C4' }}>© 2024 EduCore. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}