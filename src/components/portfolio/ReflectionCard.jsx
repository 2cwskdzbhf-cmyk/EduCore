import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Smile, Meh, Frown, AlertCircle, Sparkles, Pencil, Trash2, Lock, Unlock } from 'lucide-react';
import { format } from 'date-fns';

const moodIcons = {
  confident: { icon: Sparkles, color: 'text-green-400', bg: 'bg-green-500/20' },
  learning: { icon: Smile, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  challenged: { icon: Meh, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  confused: { icon: Frown, color: 'text-orange-400', bg: 'bg-orange-500/20' },
  excited: { icon: Sparkles, color: 'text-purple-400', bg: 'bg-purple-500/20' }
};

export default function ReflectionCard({ reflection, onEdit, onDelete }) {
  const moodConfig = moodIcons[reflection.mood] || moodIcons.learning;
  const MoodIcon = moodConfig.icon;

  return (
    <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-all">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${moodConfig.bg}`}>
              <MoodIcon className={`w-5 h-5 ${moodConfig.color}`} />
            </div>
            <div>
              <CardTitle className="text-white text-lg">{reflection.title}</CardTitle>
              <p className="text-xs text-slate-400 mt-1">
                {format(new Date(reflection.created_date), 'dd MMM yyyy')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {reflection.is_private ? (
              <Lock className="w-4 h-4 text-slate-400" />
            ) : (
              <Unlock className="w-4 h-4 text-slate-400" />
            )}
            <Button variant="ghost" size="sm" onClick={() => onEdit(reflection)}>
              <Pencil className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(reflection.id)}>
              <Trash2 className="w-4 h-4 text-red-400" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-slate-300 text-sm mb-3 line-clamp-3">{reflection.content}</p>
        
        {reflection.learning_goals && reflection.learning_goals.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <p className="text-xs text-slate-400 mb-2">Learning Goals:</p>
            <div className="flex flex-wrap gap-2">
              {reflection.learning_goals.map((goal, i) => (
                <Badge key={i} className="bg-purple-500/20 text-purple-200 text-xs">
                  {goal}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}