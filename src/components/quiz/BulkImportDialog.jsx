import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Upload, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function BulkImportDialog({ open, onOpenChange, onImport }) {
  const [csvText, setCsvText] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) throw new Error('CSV must have headers and at least one question');

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const questions = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const question = {};

      headers.forEach((header, index) => {
        const value = values[index] || '';
        
        if (header === 'prompt' || header === 'question') {
          question.prompt = value;
        } else if (header === 'type' || header === 'question_type') {
          question.question_type = value || 'multiple_choice';
        } else if (header.startsWith('option')) {
          if (!question.options) question.options = [];
          question.options.push(value);
        } else if (header === 'correct' || header === 'correct_index') {
          question.correct_index = parseInt(value) || 0;
        } else if (header === 'correct_answer') {
          question.correct_answer = value;
        } else if (header === 'difficulty') {
          question.difficulty = value || 'medium';
        } else if (header === 'tags') {
          question.tags = value ? value.split(';').map(t => t.trim()) : [];
        } else if (header === 'explanation') {
          question.explanation = value;
        } else if (header === 'points') {
          question.points = parseInt(value) || 1;
        }
      });

      if (question.prompt) {
        questions.push(question);
      }
    }

    return questions;
  };

  const parseJSON = (text) => {
    const data = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error('JSON must be an array of questions');
    
    return data.map(q => ({
      prompt: q.prompt || q.question || '',
      question_type: q.question_type || q.type || 'multiple_choice',
      options: q.options || [],
      correct_index: q.correct_index ?? q.correctIndex ?? 0,
      correct_answer: q.correct_answer || q.correctAnswer || '',
      difficulty: q.difficulty || 'medium',
      tags: q.tags || [],
      explanation: q.explanation || '',
      points: q.points || 1
    }));
  };

  const handleImport = (format) => {
    setError('');
    setSuccess('');

    try {
      const text = format === 'csv' ? csvText : jsonText;
      if (!text.trim()) {
        setError('Please paste your data first');
        return;
      }

      const questions = format === 'csv' ? parseCSV(text) : parseJSON(text);
      
      if (questions.length === 0) {
        setError('No valid questions found');
        return;
      }

      onImport(questions);
      setSuccess(`Imported ${questions.length} question(s)`);
      setTimeout(() => {
        onOpenChange(false);
        setCsvText('');
        setJsonText('');
        setSuccess('');
      }, 1500);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-white/10 max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-white">Bulk Import Questions</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="csv" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white/5">
            <TabsTrigger value="csv">CSV</TabsTrigger>
            <TabsTrigger value="json">JSON</TabsTrigger>
          </TabsList>

          <TabsContent value="csv" className="space-y-4">
            <div>
              <Label className="text-slate-300">Paste CSV Data</Label>
              <p className="text-xs text-slate-400 mb-2">
                Format: prompt,type,option1,option2,option3,option4,correct_index,difficulty,tags,explanation
              </p>
              <Textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="What is 2+2?,multiple_choice,2,3,4,5,2,easy,math;arithmetic,Addition of two numbers"
                className="bg-white/5 border-white/10 text-white font-mono text-sm"
                rows={10}
              />
            </div>
            <Button
              onClick={() => handleImport('csv')}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import from CSV
            </Button>
          </TabsContent>

          <TabsContent value="json" className="space-y-4">
            <div>
              <Label className="text-slate-300">Paste JSON Data</Label>
              <p className="text-xs text-slate-400 mb-2">
                Array of question objects with prompt, type, options, correct_index, etc.
              </p>
              <Textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder='[{"prompt":"What is 2+2?","type":"multiple_choice","options":["2","3","4","5"],"correct_index":2,"difficulty":"easy","tags":["math"]}]'
                className="bg-white/5 border-white/10 text-white font-mono text-sm"
                rows={10}
              />
            </div>
            <Button
              onClick={() => handleImport('json')}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import from JSON
            </Button>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-lg text-emerald-300 text-sm">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}