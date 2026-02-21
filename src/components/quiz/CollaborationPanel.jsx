import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, Share2, Star, TrendingUp, Clock } from 'lucide-react';

export default function CollaborationPanel({ teacherEmail }) {
  // Fetch questions shared with me
  const { data: sharedWithMe = [] } = useQuery({
    queryKey: ['sharedQuestions', teacherEmail],
    queryFn: async () => {
      const allQuestions = await base44.entities.QuizQuestion.list('-updated_date', 100);
      return allQuestions.filter(q => 
        q.collaborator_emails?.includes(teacherEmail) && 
        q.owner_email !== teacherEmail
      );
    },
    enabled: !!teacherEmail
  });

  // Fetch questions I've shared
  const { data: mySharedQuestions = [] } = useQuery({
    queryKey: ['mySharedQuestions', teacherEmail],
    queryFn: async () => {
      const myQuestions = await base44.entities.QuizQuestion.filter({ 
        owner_email: teacherEmail 
      });
      return myQuestions.filter(q => 
        (q.collaborator_emails?.length > 0) || q.is_shared
      );
    },
    enabled: !!teacherEmail
  });

  // Fetch my ratings
  const { data: myRatings = [] } = useQuery({
    queryKey: ['myRatings', teacherEmail],
    queryFn: () => base44.entities.QuestionRating.filter({ 
      teacher_email: teacherEmail 
    }, '-created_date'),
    enabled: !!teacherEmail
  });

  // Fetch top rated questions
  const { data: topRatedQuestions = [] } = useQuery({
    queryKey: ['topRatedQuestions'],
    queryFn: async () => {
      const allQuestions = await base44.entities.QuizQuestion.list();
      return allQuestions
        .filter(q => q.average_rating && q.rating_count >= 3)
        .sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0))
        .slice(0, 5);
    }
  });

  return (
    <div className="grid gap-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Share2 className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{sharedWithMe.length}</div>
                <p className="text-sm text-slate-400">Shared with You</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{mySharedQuestions.length}</div>
                <p className="text-sm text-slate-400">You're Sharing</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <Star className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{myRatings.length}</div>
                <p className="text-sm text-slate-400">Your Reviews</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shared With Me */}
      {sharedWithMe.length > 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Share2 className="w-5 h-5 text-blue-400" />
              Recently Shared with You
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sharedWithMe.slice(0, 5).map(q => (
                <div key={q.id} className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium mb-1">{q.prompt}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {q.question_type?.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs text-slate-400">by {q.owner_email?.split('@')[0]}</span>
                        {q.average_rating && (
                          <div className="flex items-center gap-1 text-yellow-400">
                            <Star className="w-3 h-3 fill-yellow-400" />
                            <span className="text-xs">{q.average_rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Clock className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Rated Questions */}
      {topRatedQuestions.length > 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Top Rated Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topRatedQuestions.map((q, idx) => (
                <div key={q.id} className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-yellow-400">#{idx + 1}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium mb-1">{q.prompt}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-bold text-yellow-400">{q.average_rating.toFixed(1)}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {q.rating_count} review{q.rating_count !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}