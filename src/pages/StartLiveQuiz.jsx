import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/ui/GlassCard';
import { ChevronLeft, Play, Users, Clock, FileText, Sparkles } from 'lucide-react';

export default function StartLiveQuiz() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const urlParams = new URLSearchParams(window.location.search);
const setId = urlParams.get('quizSetId') || urlParams.get('setId');
  const classId = urlParams.get('classId');

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    fetchUser();
  }, []);

  // ✅ Use QuizSet (matches createLiveQuizSession.ts)
  const { data: quizSet, isLoading } = useQuery({
    queryKey: ['quizSet', setId],
    queryFn: async () => {
      if (!setId) return null;
      const sets = await base44.entities.QuizSet.filter({ id: setId });
      return sets?.[0] || null;
    },
    enabled: !!setId
  });

  // ✅ Use QuizQuestion (matches quiz_set_id)
  const { data: questions = [] } = useQuery({
    queryKey: ['quizQuestions', setId],
    queryFn: async () => {
      if (!setId) return [];
      return base44.entities.QuizQuestion.filter({ quiz_set_id: setId }, 'order');
    },
    enabled: !!setId
  });

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      if (!user?.email) throw new Error('User not loaded');
      if (!classId) throw new Error('Missing classId');
      if (!setId) throw new Error('Missing setId');
      if (!quizSet) throw new Error('Quiz set not loaded');
      if (!questions || questions.length === 0) throw new Error('This quiz has no questions');

      // ✅ Create a session using quiz_set_id (not live_quiz_set_id)
     const session = await base44.entities.LiveQuizSession.create({
  class_id: classId,
  host_email: user.email,

  // ✅ store BOTH ids for full compatibility
  quiz_set_id: setId,
  live_quiz_set_id: setId,

  status: 'lobby',
  current_question_index: -1,
  player_count: 0,
  settings: {
    time_per_question: quizSet.time_limit_per_question || 15000,
    base_points: 500,
    round_multiplier_increment: 0.25
  }
});


      console.log('LIVE QUIZ SESSION CREATED:', session);
      return session;
    },
    onSuccess: (session) => {
      navigate(createPageUrl(`TeacherLiveQuizLobby?sessionId=${session.id}`));
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-purple-500/50" />
      </div>
    );
  }

  if (!quizSet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
        <GlassCard className="p-8 text-center">
          <h2 className="text-white font-semibold mb-4">Quiz not found</h2>
          <Button onClick={() => navigate(createPageUrl('QuizLibrary'))}>
            Go to Library
          </Button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6 flex items-center justify-center">
      <div className="max-w-2xl w-full">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="text-slate-400 hover:text-white mb-6"
        >
          <ChevronLeft className="w-5 h-5 mr-2" />
          Back
        </Button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard className="p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/50">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">{quizSet.title}</h1>
              <p className="text-slate-400">{quizSet.description}</p>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-purple-400" />
                </div>
                <p className="text-2xl font-bold text-white">{questions.length}</p>
                <p className="text-sm text-slate-400">Questions</p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-blue-400" />
                </div>
                <p className="text-2xl font-bold text-white">
                  {(quizSet.time_limit_per_question || 15000) / 1000}s
                </p>
                <p className="text-sm text-slate-400">Per Question</p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-emerald-400" />
                </div>
                <p className="text-2xl font-bold text-white">∞</p>
                <p className="text-sm text-slate-400">Players</p>
              </div>
            </div>

            <Button
              onClick={() => createSessionMutation.mutate()}
              disabled={createSessionMutation.isPending || questions.length === 0}
              className="w-full h-14 text-lg bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 shadow-lg shadow-purple-500/30"
            >
              {createSessionMutation.isPending ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Start Live Quiz
                </>
              )}
            </Button>

            {questions.length === 0 && (
              <p className="text-center text-red-400 text-sm mt-4">
                This quiz has no questions yet. Please add questions before starting.
              </p>
            )}
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}
