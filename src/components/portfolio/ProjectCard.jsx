import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, File, Star, Pencil, Trash2, Award } from 'lucide-react';
import { format } from 'date-fns';

const projectTypeColors = {
  research: 'bg-blue-500/20 text-blue-200',
  creative: 'bg-purple-500/20 text-purple-200',
  practical: 'bg-green-500/20 text-green-200',
  presentation: 'bg-orange-500/20 text-orange-200',
  experiment: 'bg-red-500/20 text-red-200',
  other: 'bg-slate-500/20 text-slate-200'
};

export default function ProjectCard({ project, onEdit, onDelete }) {
  return (
    <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-all">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-white text-lg">{project.title}</CardTitle>
              {project.is_featured && (
                <Award className="w-5 h-5 text-yellow-400" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge className={projectTypeColors[project.project_type]}>
                {project.project_type}
              </Badge>
              {project.completion_date && (
                <span className="text-xs text-slate-400">
                  {format(new Date(project.completion_date), 'MMM yyyy')}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => onEdit(project)}>
              <Pencil className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(project.id)}>
              <Trash2 className="w-4 h-4 text-red-400" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-slate-300 text-sm mb-3">{project.description}</p>
        
        {project.skills_demonstrated && project.skills_demonstrated.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-slate-400 mb-2">Skills Demonstrated:</p>
            <div className="flex flex-wrap gap-2">
              {project.skills_demonstrated.map((skill, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {project.self_rating && (
          <div className="flex items-center gap-1 mb-3">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${i < project.self_rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`}
              />
            ))}
            <span className="text-xs text-slate-400 ml-2">Self-rating</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-3 border-t border-white/10">
          {project.external_link && (
            <Button variant="outline" size="sm" asChild>
              <a href={project.external_link} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                View Project
              </a>
            </Button>
          )}
          {project.files && project.files.length > 0 && (
            <Button variant="outline" size="sm">
              <File className="w-4 h-4 mr-2" />
              {project.files.length} file{project.files.length !== 1 ? 's' : ''}
            </Button>
          )}
        </div>

        {project.teacher_feedback && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <p className="text-xs text-slate-400 mb-1">Teacher Feedback:</p>
            <p className="text-sm text-green-300">{project.teacher_feedback}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}