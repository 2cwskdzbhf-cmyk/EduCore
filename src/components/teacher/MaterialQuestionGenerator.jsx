import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Upload, Sparkles, FileText, CheckCircle, Loader2 } from 'lucide-react';

export default function MaterialQuestionGenerator({ onQuestionsGenerated, topicId }) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [materialUrl, setMaterialUrl] = useState('');
  const [materialType, setMaterialType] = useState('pdf');
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState('medium');
  const [generatedQuestions, setGeneratedQuestions] = useState([]);

  const handleFileUpload = async (file) => {
    if (!file) return;

    setUploading(true);
    try {
      const { data } = await base44.integrations.Core.UploadFile({ file });
      setMaterialUrl(data.file_url);
      
      // Detect file type
      const ext = file.name.split('.').pop().toLowerCase();
      if (['pdf'].includes(ext)) setMaterialType('pdf');
      else if (['doc', 'docx', 'txt'].includes(ext)) setMaterialType('document');
      else setMaterialType('text');
      
      toast.success('Material uploaded!');
    } catch (error) {
      toast.error('Failed to upload material');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleGenerate = async () => {
    if (!materialUrl) {
      toast.error('Please upload a material first');
      return;
    }

    setGenerating(true);
    try {
      const response = await base44.functions.invoke('generateQuestionsFromMaterial', {
        materialUrl,
        materialType,
        questionCount,
        difficulty,
        topicId
      });

      setGeneratedQuestions(response.data.questions);
      toast.success(`Generated ${response.data.count} questions!`);
    } catch (error) {
      toast.error('Failed to generate questions: ' + error.message);
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const handleAddToQuiz = () => {
    if (generatedQuestions.length === 0) return;
    onQuestionsGenerated(generatedQuestions);
    setOpen(false);
    setGeneratedQuestions([]);
    setMaterialUrl('');
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} className="bg-gradient-to-r from-purple-500 to-pink-500">
        <Sparkles className="w-4 h-4 mr-2" />
        Generate from Material
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              AI Question Generator
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Upload Section */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-sm">1. Upload Learning Material</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e.target.files[0])}
                      disabled={uploading}
                    />
                    <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-purple-500/50 transition-colors">
                      {uploading ? (
                        <Loader2 className="w-8 h-8 mx-auto text-purple-400 animate-spin" />
                      ) : materialUrl ? (
                        <div className="flex items-center justify-center gap-2 text-green-400">
                          <CheckCircle className="w-5 h-5" />
                          <span>Material uploaded</span>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                          <p className="text-sm text-slate-300">Click to upload PDF, Word, or Text file</p>
                        </>
                      )}
                    </div>
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Settings Section */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-sm">2. Configure Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-300">Number of Questions</Label>
                    <Select value={String(questionCount)} onValueChange={(v) => setQuestionCount(Number(v))}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 questions</SelectItem>
                        <SelectItem value="5">5 questions</SelectItem>
                        <SelectItem value="7">7 questions</SelectItem>
                        <SelectItem value="10">10 questions</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-slate-300">Difficulty Level</Label>
                    <Select value={difficulty} onValueChange={setDifficulty}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={!materialUrl || generating}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500"
              size="lg"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating Questions...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Questions
                </>
              )}
            </Button>

            {/* Generated Questions Preview */}
            {generatedQuestions.length > 0 && (
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white text-sm">Generated Questions ({generatedQuestions.length})</CardTitle>
                    <Button onClick={handleAddToQuiz} className="bg-green-500">
                      Add to Quiz
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto">
                    {generatedQuestions.map((q, idx) => (
                      <div key={idx} className="p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="flex items-start gap-3">
                          <Badge className="bg-purple-500/20 text-purple-200">{idx + 1}</Badge>
                          <div className="flex-1">
                            <p className="text-white font-medium mb-2">{q.prompt}</p>
                            <div className="grid grid-cols-2 gap-2 mb-2">
                              {q.options.map((opt, i) => (
                                <div
                                  key={i}
                                  className={`p-2 rounded text-sm ${
                                    i === q.correct_index
                                      ? 'bg-green-500/20 text-green-200 border border-green-500/30'
                                      : 'bg-white/5 text-slate-300'
                                  }`}
                                >
                                  {opt}
                                </div>
                              ))}
                            </div>
                            {q.explanation && (
                              <p className="text-xs text-slate-400 mt-2">
                                <span className="font-semibold">Explanation:</span> {q.explanation}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}