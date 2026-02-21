import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Star, Send, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function RateQuestionDialog({ open, onOpenChange, questionId, teacherEmail }) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedback, setFeedback] = useState('');

  // Fetch existing rating
  const { data: existingRating } = useQuery({
    queryKey: ['questionRating', questionId, teacherEmail],
    queryFn: async () => {
      const ratings = await base44.entities.QuestionRating.filter({
        question_id: questionId,
        teacher_email: teacherEmail
      });
      return ratings[0] || null;
    },
    enabled: open && !!questionId && !!teacherEmail
  });

  // Fetch all reviews for this question
  const { data: allRatings = [] } = useQuery({
    queryKey: ['allQuestionRatings', questionId],
    queryFn: () => base44.entities.QuestionRating.filter({ question_id: questionId }),
    enabled: open && !!questionId
  });

  // Set initial values from existing rating
  React.useEffect(() => {
    if (existingRating) {
      setRating(existingRating.rating || 0);
      setFeedback(existingRating.feedback || '');
    }
  }, [existingRating]);

  const rateQuestionMutation = useMutation({
    mutationFn: async () => {
      if (rating === 0) throw new Error('Please select a rating');

      // Update or create rating
      if (existingRating) {
        await base44.entities.QuestionRating.update(existingRating.id, {
          rating,
          feedback: feedback.trim()
        });
      } else {
        await base44.entities.QuestionRating.create({
          question_id: questionId,
          teacher_email: teacherEmail,
          rating,
          feedback: feedback.trim()
        });
      }

      // Recalculate average rating
      const allRatingsAfter = await base44.entities.QuestionRating.filter({ question_id: questionId });
      const avgRating = allRatingsAfter.reduce((sum, r) => sum + r.rating, 0) / allRatingsAfter.length;

      // Update question with new average
      await base44.entities.QuizQuestion.update(questionId, {
        average_rating: avgRating,
        rating_count: allRatingsAfter.length
      });
    },
    onSuccess: () => {
      toast.success(existingRating ? 'Rating updated' : 'Rating submitted');
      queryClient.invalidateQueries(['questionRating']);
      queryClient.invalidateQueries(['allQuestionRatings']);
      queryClient.invalidateQueries(['questionBank']);
      onOpenChange(false);
      setRating(0);
      setFeedback('');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to submit rating');
    }
  });

  const avgRating = allRatings.length > 0
    ? (allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length).toFixed(1)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-white/10 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400" />
            Rate & Review Question
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overall Stats */}
          {allRatings.length > 0 && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-3xl font-bold text-yellow-400">{avgRating}</div>
                  <div className="text-xs text-slate-400">{allRatings.length} review{allRatings.length !== 1 ? 's' : ''}</div>
                </div>
                <div className="flex-1">
                  {[5, 4, 3, 2, 1].map(stars => {
                    const count = allRatings.filter(r => r.rating === stars).length;
                    const percentage = (count / allRatings.length) * 100;
                    return (
                      <div key={stars} className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-slate-400 w-8">{stars}★</span>
                        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-yellow-400"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400 w-8">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Your Rating */}
          <div>
            <Label className="text-white mb-3 block">Your Rating</Label>
            <div className="flex gap-2 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-10 h-10 ${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-slate-600'
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-center text-sm text-slate-400 mt-2">
                {rating === 5 && '⭐ Excellent!'}
                {rating === 4 && '👍 Good'}
                {rating === 3 && '👌 Average'}
                {rating === 2 && '😐 Below Average'}
                {rating === 1 && '👎 Poor'}
              </p>
            )}
          </div>

          {/* Feedback */}
          <div>
            <Label className="text-white">Feedback (Optional)</Label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Share your thoughts about this question..."
              className="mt-2 bg-white/5 border-white/10 text-white min-h-[100px]"
            />
          </div>

          {/* Recent Reviews */}
          {allRatings.length > 0 && (
            <div>
              <Label className="text-white mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Recent Reviews
              </Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {allRatings.slice(0, 3).map((review, idx) => (
                  <div key={idx} className="p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {Array.from({ length: review.rating }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                        <span className="text-xs text-slate-400">
                          {review.teacher_email === teacherEmail ? 'You' : review.teacher_email.split('@')[0]}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {new Date(review.created_date).toLocaleDateString()}
                      </Badge>
                    </div>
                    {review.feedback && (
                      <p className="text-sm text-slate-300">{review.feedback}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit */}
          <Button
            onClick={() => rateQuestionMutation.mutate()}
            disabled={rating === 0 || rateQuestionMutation.isPending}
            className="w-full bg-gradient-to-r from-purple-500 to-blue-500"
          >
            <Send className="w-4 h-4 mr-2" />
            {existingRating ? 'Update Rating' : 'Submit Rating'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}