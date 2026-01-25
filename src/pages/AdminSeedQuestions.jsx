import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import GlassCard from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Upload, CheckCircle2, AlertCircle, Database, FileJson } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function AdminSeedQuestions() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [jsonText, setJsonText] = useState('');
  const [validation, setValidation] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  React.useEffect(() => {
    const checkAuth = async () => {
      const userData = await base44.auth.me();
      if (userData.role !== 'admin') {
        navigate(createPageUrl('TeacherDashboard'));
      }
      setUser(userData);
    };
    checkAuth();
  }, [navigate]);

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => base44.entities.Subject.list()
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['topics'],
    queryFn: () => base44.entities.Topic.list()
  });

  const { data: existingQuestions = [] } = useQuery({
    queryKey: ['existingQuestions'],
    queryFn: () => base44.entities.Question.list()
  });

  const handleValidate = () => {
    try {
      const questions = JSON.parse(jsonText);
      
      if (!Array.isArray(questions)) {
        throw new Error('JSON must be an array of questions');
      }

      const stats = {
        total: questions.length,
        byYearGroup: {},
        byDifficulty: {},
        byType: {},
        byTopic: {},
        errors: []
      };

      questions.forEach((q, idx) => {
        // Count by year group
        stats.byYearGroup[q.year_group] = (stats.byYearGroup[q.year_group] || 0) + 1;
        
        // Count by difficulty
        stats.byDifficulty[q.difficulty] = (stats.byDifficulty[q.difficulty] || 0) + 1;
        
        // Count by type
        stats.byType[q.question_type] = (stats.byType[q.question_type] || 0) + 1;
        
        // Count by topic
        stats.byTopic[q.topic] = (stats.byTopic[q.topic] || 0) + 1;

        // Validate required fields
        if (!q.subject || !q.topic || !q.year_group || !q.question_type || !q.question_text) {
          stats.errors.push(`Question ${idx + 1}: Missing required fields`);
        }

        // Validate year group
        if (q.year_group < 7 || q.year_group > 11) {
          stats.errors.push(`Question ${idx + 1}: Invalid year_group (must be 7-11)`);
        }

        // Validate question type
        if (!['multiple_choice', 'true_false', 'short_answer', 'written_answer'].includes(q.question_type)) {
          stats.errors.push(`Question ${idx + 1}: Invalid question_type`);
        }

        // Validate difficulty
        if (!['easy', 'medium', 'hard'].includes(q.difficulty)) {
          stats.errors.push(`Question ${idx + 1}: Invalid difficulty`);
        }
      });

      setValidation(stats);
      setResult(null);
    } catch (error) {
      setValidation(null);
      setResult({
        success: false,
        message: `Validation failed: ${error.message}`
      });
    }
  };

  const handleAutoSeed = async () => {
    setImporting(true);
    setResult(null);

    try {
      const response = await base44.functions.invoke('seedQuestionsDatabase', {});
      
      setResult({
        success: true,
        message: `✅ ${response.data.message}\n${response.data.inserted} inserted, ${response.data.skipped} skipped`
      });

    } catch (error) {
      setResult({
        success: false,
        message: `Auto-seed failed: ${error.message}`
      });
    } finally {
      setImporting(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    setResult(null);

    try {
      const questions = JSON.parse(jsonText);
      
      let imported = 0;
      let skipped = 0;
      let failed = 0;

      for (const q of questions) {
        // Find subject ID
        const subject = subjects.find(s => s.name.toLowerCase() === q.subject.toLowerCase());
        if (!subject) {
          failed++;
          continue;
        }

        // Find topic ID
        const topic = topics.find(t => 
          t.name.toLowerCase() === q.topic.toLowerCase() && 
          t.subject_id === subject.id
        );
        if (!topic) {
          failed++;
          continue;
        }

        // Check for duplicates
        const duplicate = existingQuestions.find(eq =>
          eq.year_group === q.year_group &&
          eq.topic_id === topic.id &&
          eq.question_text.toLowerCase().trim() === q.question_text.toLowerCase().trim()
        );

        if (duplicate) {
          skipped++;
          continue;
        }

        // Create question
        try {
          await base44.entities.Question.create({
            subject_id: subject.id,
            topic_id: topic.id,
            year_group: q.year_group,
            difficulty: q.difficulty,
            question_type: q.question_type,
            question_text: q.question_text,
            options: q.options || null,
            correct_answer: q.correct_answer || '',
            marks: q.marks || 1,
            explanation: q.explanation || null,
            tags: q.tags || [],
            created_by: user.email,
            is_active: true
          });
          imported++;
        } catch (err) {
          console.error('Failed to create question:', err);
          failed++;
        }
      }

      setResult({
        success: true,
        message: `Import complete: ${imported} imported, ${skipped} skipped (duplicates), ${failed} failed`
      });

      setJsonText('');
      setValidation(null);

    } catch (error) {
      setResult({
        success: false,
        message: `Import failed: ${error.message}`
      });
    } finally {
      setImporting(false);
    }
  };

  const loadSampleData = () => {
    const sampleData = [
      {
        "subject": "Maths",
        "topic": "Fractions",
        "year_group": 7,
        "difficulty": "easy",
        "question_type": "multiple_choice",
        "question_text": "What is 1/2 + 1/2?",
        "options": ["1", "2", "1/2", "1/4"],
        "correct_answer": "1",
        "marks": 1
      },
      {
        "subject": "Maths",
        "topic": "Fractions",
        "year_group": 7,
        "difficulty": "easy",
        "question_type": "true_false",
        "question_text": "Is 2/4 equivalent to 1/2?",
        "correct_answer": "True",
        "marks": 1
      },
      {
        "subject": "Maths",
        "topic": "Algebra",
        "year_group": 8,
        "difficulty": "easy",
        "question_type": "short_answer",
        "question_text": "Simplify: 5x + 3x",
        "correct_answer": "8x",
        "marks": 1
      }
    ];
    setJsonText(JSON.stringify(sampleData, null, 2));
    setResult({ success: true, message: 'Sample data loaded. Click Validate to review.' });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(createPageUrl('AdminPanel'))}
              className="text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">Seed Question Bank</h1>
              <p className="text-slate-400">Bulk import questions from JSON</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Input */}
          <div className="lg:col-span-2 space-y-6">
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileJson className="w-5 h-5 text-purple-400" />
                  <h2 className="text-lg font-bold text-white">Seed Options</h2>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleAutoSeed}
                    disabled={importing}
                    className="bg-gradient-to-r from-green-500 to-emerald-500"
                  >
                    {importing ? 'Seeding...' : '⚡ Auto-Seed 60+ Questions'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={loadSampleData}
                    className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                  >
                    Load Sample JSON
                  </Button>
                </div>
              </div>

              <Textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder='[&#10;  {&#10;    "subject": "Maths",&#10;    "topic": "Fractions",&#10;    "year_group": 7,&#10;    "difficulty": "easy",&#10;    "question_type": "multiple_choice",&#10;    "question_text": "Which is equivalent to 1/2?",&#10;    "options": ["2/4","3/4","2/3","4/3"],&#10;    "correct_answer": "2/4",&#10;    "marks": 1&#10;  }&#10;]'
                className="bg-white/5 border-white/10 text-white font-mono text-sm min-h-[400px]"
              />

              <div className="flex gap-3 mt-4">
                <Button
                  onClick={handleValidate}
                  disabled={!jsonText.trim()}
                  variant="outline"
                  className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Validate
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!validation || validation.errors.length > 0 || importing}
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
            </GlassCard>

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
          </div>

          {/* Validation Stats */}
          <div className="space-y-6">
            {validation && (
              <>
                <GlassCard className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Database className="w-5 h-5 text-green-400" />
                    <h3 className="font-bold text-white">Validation Summary</h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-slate-400 mb-2">Total Questions</p>
                      <p className="text-2xl font-bold text-white">{validation.total}</p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-400 mb-2">By Year Group</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(validation.byYearGroup).map(([year, count]) => (
                          <Badge key={year} className="bg-blue-500/20 text-blue-300">
                            Year {year}: {count}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-slate-400 mb-2">By Difficulty</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(validation.byDifficulty).map(([diff, count]) => (
                          <Badge key={diff} variant="outline" className="text-xs">
                            {diff}: {count}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-slate-400 mb-2">By Type</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(validation.byType).map(([type, count]) => (
                          <Badge key={type} className="bg-purple-500/20 text-purple-300 text-xs">
                            {type.replace('_', ' ')}: {count}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-slate-400 mb-2">By Topic</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(validation.byTopic).map(([topic, count]) => (
                          <Badge key={topic} className="bg-green-500/20 text-green-300 text-xs">
                            {topic}: {count}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {validation.errors.length > 0 && (
                      <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                        <p className="text-sm font-semibold text-red-400 mb-2">
                          {validation.errors.length} Error(s)
                        </p>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {validation.errors.slice(0, 10).map((err, idx) => (
                            <p key={idx} className="text-xs text-red-300">{err}</p>
                          ))}
                          {validation.errors.length > 10 && (
                            <p className="text-xs text-red-300">...and {validation.errors.length - 10} more</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </GlassCard>

                <GlassCard className="p-6">
                  <h3 className="font-bold text-white mb-3">Format Guide</h3>
                  <div className="space-y-2 text-sm text-slate-400">
                    <p><span className="text-purple-400">multiple_choice:</span> options array + correct_answer (text)</p>
                    <p><span className="text-purple-400">true_false:</span> correct_answer (True/False)</p>
                    <p><span className="text-purple-400">short_answer:</span> correct_answer (text/number)</p>
                    <p><span className="text-purple-400">written_answer:</span> correct_answer (optional)</p>
                  </div>
                </GlassCard>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}