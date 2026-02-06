import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, FileText, Users, X } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TemplateSelectorDialog({ open, onClose, onSelectTemplate, userEmail }) {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['quizTemplates'],
    queryFn: async () => {
      const myTemplates = await base44.entities.QuizTemplate.filter({ owner_email: userEmail });
      const sharedTemplates = await base44.entities.QuizTemplate.filter({ is_shared: true });
      return [...myTemplates, ...sharedTemplates.filter(t => t.owner_email !== userEmail)];
    },
    enabled: open && !!userEmail
  });

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 border-white/10">
        <DialogHeader className="border-b border-white/10 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Select Quiz Template</h2>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="p-6 overflow-y-auto">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white"
            />
          </div>

          {isLoading ? (
            <div className="text-center text-slate-400 py-8">Loading templates...</div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center text-slate-400 py-8">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No templates found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTemplates.map((template, idx) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card
                    className="p-5 bg-white/5 border-white/10 hover:bg-white/10 cursor-pointer transition-all"
                    onClick={() => {
                      onSelectTemplate(template);
                      onClose();
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold text-white">{template.name}</h3>
                      {template.is_shared && (
                        <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                          <Users className="w-3 h-3 mr-1" />
                          Shared
                        </Badge>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-sm text-slate-400 mb-3 line-clamp-2">{template.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{template.questions?.length || 0} questions</span>
                      <span>•</span>
                      <span>Used {template.usage_count || 0} times</span>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}