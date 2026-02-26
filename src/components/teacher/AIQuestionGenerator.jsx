import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Sparkles, Copy, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AIQuestionGenerator({ onQuestionsGenerated }) {
  const [formData, setFormData] = useState({
    text: '',
    topic: '',
    questionTypes: ['multiple_choice', 'matching', 'ordering', 'fill_in_blank'],
    count: 8
  });
  const [generatedQuestions, setGeneratedQuestions] = useState([]);

  const generateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('generateDiverseQuestions', data);
      return response.data;
    },
    onSuccess: (data) => {
      setGeneratedQuestions(data.questions);
      toast.success(`Generated ${data.questions.length} questions`);
    },
    onError: (error) => {
      toast.error('Failed to generate questions');
      console.error(error);
    }
  });

  const questionTypeLabels = {
    multiple_choice: 'Multiple Choice',
    matching: 'Matching',
    ordering: 'Ordering',
    fill_in_blank: 'Fill in the Blank'
  };

  const toggleQuestionType = (type) => {
    setFormData(prev => ({
      ...prev,
      questionTypes: prev.questionTypes.includes(type)
        ? prev.questionTypes.filter(t => t !== type)
        : [...prev.questionTypes, type]
    }));
  };

  const copyQuestion = (question) => {
    navigator.clipboard.writeText(JSON.stringify(question, null, 2));
    toast.success('Question copied to clipboard');
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            AI Question Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-white">Paste Text or Enter Topic</Label>
            <Textarea
              value={formData.text}
              onChange={(e) => setFormData({ ...formData, text: e.target.value, topic: '' })}
              placeholder="Paste lesson content or learning material here..."
              className="mt-1 bg-white/5 border-white/10 text-white min-h-[120px]"
            />
            <div className="text-center text-slate-400 text-sm my-2">OR</div>
            <Input
              value={formData.topic}
              onChange={(e) => setFormData({ ...formData, topic: e.target.value, text: '' })}
              placeholder="Enter a topic (e.g., 'Photosynthesis', 'World War II')"
              className="bg-white/5 border-white/10 text-white"
            />
          </div>

          <div>
            <Label className="text-white mb-3 block">Question Types</Label>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(questionTypeLabels).map(([type, label]) => (
                <div key={type} className="flex items-center gap-2">
                  <Checkbox
                    checked={formData.questionTypes.includes(type)}
                    onCheckedChange={() => toggleQuestionType(type)}
                    id={type}
                  />
                  <label htmlFor={type} className="text-white text-sm cursor-pointer">
                    {label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-white">Number of Questions</Label>
            <Input
              type="number"
              value={formData.count}
              onChange={(e) => setFormData({ ...formData, count: parseInt(e.target.value) })}
              min={1}
              max={20}
              className="mt-1 bg-white/5 border-white/10 text-white"
            />
          </div>

          <Button
            onClick={() => generateMutation.mutate(formData)}
            disabled={generateMutation.isPending || (!formData.text && !formData.topic) || formData.questionTypes.length === 0}
            className="w-full bg-gradient-to-r from-purple-500 to-blue-500"
          >
            {generateMutation.isPending ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Questions
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {generatedQuestions.length > 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Generated Questions ({generatedQuestions.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {generatedQuestions.map((question, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 bg-white/5 rounded-lg border border-white/10"
              >
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="outline" className="text-xs">
                    {questionTypeLabels[question.type] || question.type}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyQuestion(question)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-white font-medium mb-2">{question.question}</p>

                {question.type === 'multiple_choice' && (
                  <div className="space-y-1">
                    {question.options?.map((opt, i) => (
                      <div key={i} className={`text-sm ${opt === question.correct_answer ? 'text-green-400 font-medium' : 'text-slate-300'}`}>
                        {opt} {opt === question.correct_answer && '✓'}
                      </div>
                    ))}
                  </div>
                )}

                {question.type === 'matching' && (
                  <div className="space-y-1">
                    {question.pairs?.map((pair, i) => (
                      <div key={i} className="text-sm text-slate-300">
                        {pair.left} → {pair.right}
                      </div>
                    ))}
                  </div>
                )}

                {question.type === 'ordering' && (
                  <div className="space-y-1">
                    {question.correct_order?.map((idx, i) => (
                      <div key={i} className="text-sm text-slate-300">
                        {i + 1}. {question.items[idx]}
                      </div>
                    ))}
                  </div>
                )}

                {question.type === 'fill_in_blank' && (
                  <div className="text-sm text-green-400 font-medium">
                    Answer: {question.answer}
                  </div>
                )}

                {question.explanation && (
                  <div className="mt-2 text-xs text-slate-400 italic">
                    {question.explanation}
                  </div>
                )}
              </motion.div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}