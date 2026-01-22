import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import GlassCard from '@/components/ui/GlassCard';
import { 
  ChevronLeft, Plus, Play, Edit2, Trash2, Search, 
  FileText, Clock, Sparkles
} from 'lucide-react';

export default function QuizLibrary() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    fetchUser();
  }, []);

  const { data: quizSets = [], isLoading } = useQuery({
    queryKey: ['quizSets', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.QuizSet.filter({ owner_email: user.email }, '-updated_date');
    },
    enabled: !!user?.email
  });

  const filteredQuizSets = quizSets.filter(q =>
    q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link to={createPageUrl('TeacherDashboard')}>
            <Button variant="ghost" className="text-slate-400 hover:text-white mb-4">
              <ChevronLeft className="w-5 h-5 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Quiz Library</h1>
              <p className="text-slate-400">Manage your live quiz sets</p>
            </div>
            <Link to={createPageUrl('CreateQuiz')}>
              <Button className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 shadow-lg shadow-purple-500/30">
                <Plus className="w-4 h-4 mr-2" />
                Create Quiz
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search quizzes..."
            className="pl-10 bg-white/5 border-white/10 text-white"
          />
        </div>

        {/* Quiz Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <GlassCard key={i} className="h-48 animate-pulse" />
            ))}
          </div>
        ) : filteredQuizSets.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredQuizSets.map((quiz, idx) => (
              <motion.div
                key={quiz.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.3 }}
              >
                <GlassCard className="p-6 hover:scale-[1.02] transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-1">{quiz.title}</h3>
                      <p className="text-sm text-slate-400 line-clamp-2">
                        {quiz.description || 'No description'}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      quiz.status === 'published' 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {quiz.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-slate-400 mb-4">
                    <span className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      {quiz.question_count || 0} questions
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {(quiz.time_limit_per_question || 15000) / 1000}s
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Link to={createPageUrl(`StartLiveQuiz?quizSetId=${quiz.id}`)} className="flex-1">
                      <Button className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600">
                        <Play className="w-4 h-4 mr-2" />
                        Start Live
                      </Button>
                    </Link>
                    <Button 
                      size="icon" 
                      variant="ghost"
                      className="text-slate-400 hover:text-white"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        ) : (
          <GlassCard className="p-12 text-center">
            <Sparkles className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-white font-semibold mb-2">
              {searchQuery ? 'No quizzes found' : 'No quizzes yet'}
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              {searchQuery 
                ? 'Try a different search term' 
                : 'Create your first live quiz to get started'}
            </p>
            {!searchQuery && (
              <Link to={createPageUrl('CreateQuiz')}>
                <Button className="bg-gradient-to-r from-purple-500 to-blue-500">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Quiz
                </Button>
              </Link>
            )}
          </GlassCard>
        )}
      </div>
    </div>
  );
}