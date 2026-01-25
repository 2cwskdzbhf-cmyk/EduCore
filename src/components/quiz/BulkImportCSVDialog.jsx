import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { Upload, FileText, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function BulkImportCSVDialog({ open, onOpenChange, onImport, teacherEmail, topicId }) {
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const downloadTemplate = () => {
    const template = `prompt,question_type,options,correct_index,correct_answer,difficulty,tags,explanation
"What is 2+2?",multiple_choice,"2,3,4,5",2,,easy,"math,addition","2+2 equals 4"
"Is the Earth round?",true_false,"True,False",0,,easy,"science,geography","The Earth is approximately spherical"
"Capital of France?",short_answer,,,Paris,medium,"geography,capitals","Paris is the capital of France"`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'question_bank_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) throw new Error('CSV must have at least a header row and one data row');

    const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const questions = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g);
      if (!values) continue;

      const row = {};
      values.forEach((val, idx) => {
        if (header[idx]) {
          row[header[idx]] = val.trim().replace(/^"|"$/g, '');
        }
      });

      if (!row.prompt) continue;

      const question = {
        prompt: row.prompt,
        question_type: row.question_type || 'multiple_choice',
        difficulty: row.difficulty || 'medium',
        tags: row.tags ? row.tags.split(',').map(t => t.trim()) : [],
        explanation: row.explanation || '',
        is_reusable: true,
        owner_email: teacherEmail,
        topic_id: topicId || null
      };

      if (row.options) {
        question.options = row.options.split(',').map(o => o.trim());
      }

      if (row.correct_index) {
        question.correct_index = parseInt(row.correct_index);
      }

      if (row.correct_answer) {
        question.correct_answer = row.correct_answer;
      }

      questions.push(question);
    }

    return questions;
  };

  const handleImport = async () => {
    setImporting(true);
    setResult(null);

    try {
      const questions = parseCSV(csvText);
      
      if (questions.length === 0) {
        throw new Error('No valid questions found in CSV');
      }

      await onImport(questions);

      setResult({
        success: true,
        message: `Successfully imported ${questions.length} question(s)`,
        count: questions.length
      });

      setCsvText('');
      setTimeout(() => {
        onOpenChange(false);
        setResult(null);
      }, 2000);

    } catch (error) {
      setResult({
        success: false,
        message: error.message || 'Failed to import questions'
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-white/10 max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Bulk Import from CSV
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              <span className="text-sm text-blue-400">Download CSV template to see the format</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={downloadTemplate}
              className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
            >
              <Download className="w-4 h-4 mr-2" />
              Template
            </Button>
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-2 block">Paste CSV Content</label>
            <Textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="prompt,question_type,options,correct_index,correct_answer,difficulty,tags,explanation&#10;What is 2+2?,multiple_choice,2|3|4|5,2,,easy,math,..."
              className="bg-white/5 border-white/10 text-white font-mono text-sm min-h-[300px]"
            />
          </div>

          {result && (
            <Alert className={result.success ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-red-500/20 border-red-500/30'}>
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-400" />
                )}
                <span className={result.success ? 'text-emerald-400' : 'text-red-400'}>
                  {result.message}
                </span>
              </div>
            </Alert>
          )}

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={importing}
              className="border-white/20 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!csvText.trim() || importing}
              className="bg-gradient-to-r from-purple-500 to-blue-500"
            >
              {importing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Import Questions
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}