import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { FolderOpen, Plus, Upload, Star, ExternalLink, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ProjectsSection({ studentEmail }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_type: 'creative',
    skills_demonstrated: [],
    completion_date: '',
    visibility: 'private',
    featured: false
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', studentEmail],
    queryFn: () => base44.entities.StudentProject.filter({ student_email: studentEmail }, '-created_date'),
    enabled: !!studentEmail
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => base44.entities.Subject.list()
  });

  const createProjectMutation = useMutation({
    mutationFn: (data) => base44.entities.StudentProject.create({
      ...data,
      student_email: studentEmail
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      setShowDialog(false);
      setFormData({
        title: '',
        description: '',
        project_type: 'creative',
        skills_demonstrated: [],
        completion_date: '',
        visibility: 'private',
        featured: false
      });
      toast.success('Project added');
    },
    onError: () => toast.error('Failed to add project')
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const { data } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, thumbnail_url: data.file_url });
      toast.success('Image uploaded');
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploadingFile(false);
    }
  };

  const projectTypeLabels = {
    research: 'Research',
    creative: 'Creative',
    technical: 'Technical',
    presentation: 'Presentation',
    other: 'Other'
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            My Projects
          </CardTitle>
          <Button
            onClick={() => setShowDialog(true)}
            className="bg-gradient-to-r from-purple-500 to-blue-500"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Project
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="relative group"
            >
              <Card className="bg-white/5 border-white/10 hover:border-purple-500/50 transition-all h-full">
                <CardContent className="p-4">
                  {project.thumbnail_url && (
                    <img
                      src={project.thumbnail_url}
                      alt={project.title}
                      className="w-full h-32 object-cover rounded-lg mb-3"
                    />
                  )}
                  {project.featured && (
                    <div className="absolute top-2 right-2">
                      <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    </div>
                  )}
                  <h4 className="text-white font-medium mb-2">{project.title}</h4>
                  <p className="text-slate-400 text-sm mb-3 line-clamp-2">{project.description}</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant="outline" className="text-xs">
                      {projectTypeLabels[project.project_type]}
                    </Badge>
                    {project.completion_date && (
                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(project.completion_date).toLocaleDateString()}
                      </Badge>
                    )}
                  </div>
                  {project.skills_demonstrated?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {project.skills_demonstrated.slice(0, 3).map((skill, i) => (
                        <Badge key={i} className="bg-blue-500/20 text-blue-200 text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
        {projects.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Showcase your projects and achievements</p>
          </div>
        )}
      </CardContent>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-slate-900 border-white/10 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Add New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white">Project Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="My Amazing Project"
                className="mt-1 bg-white/5 border-white/10 text-white"
              />
            </div>

            <div>
              <Label className="text-white">Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your project..."
                className="mt-1 bg-white/5 border-white/10 text-white min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Project Type</Label>
                <Select value={formData.project_type} onValueChange={(v) => setFormData({ ...formData, project_type: v })}>
                  <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="research">Research</SelectItem>
                    <SelectItem value="creative">Creative</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="presentation">Presentation</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-white">Completion Date</Label>
                <Input
                  type="date"
                  value={formData.completion_date}
                  onChange={(e) => setFormData({ ...formData, completion_date: e.target.value })}
                  className="mt-1 bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>

            <div>
              <Label className="text-white">Project Thumbnail</Label>
              <div className="mt-1">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploadingFile}
                  />
                  <Button variant="outline" disabled={uploadingFile} type="button">
                    <Upload className="w-4 h-4 mr-2" />
                    {formData.thumbnail_url ? 'Change Image' : 'Upload Image'}
                  </Button>
                </label>
                {formData.thumbnail_url && (
                  <img src={formData.thumbnail_url} alt="Preview" className="mt-2 w-full h-32 object-cover rounded-lg" />
                )}
              </div>
            </div>

            <div>
              <Label className="text-white">Skills Demonstrated (comma-separated)</Label>
              <Input
                value={formData.skills_demonstrated.join(', ')}
                onChange={(e) => setFormData({
                  ...formData,
                  skills_demonstrated: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                })}
                placeholder="Problem solving, Creativity, Research"
                className="mt-1 bg-white/5 border-white/10 text-white"
              />
            </div>

            <Button
              onClick={() => createProjectMutation.mutate(formData)}
              disabled={!formData.title.trim() || !formData.description.trim() || createProjectMutation.isPending}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500"
            >
              Add Project
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}