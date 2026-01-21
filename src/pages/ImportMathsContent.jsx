import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { importMathsContent } from '@/components/data/mathsContent';
import { Loader2, CheckCircle, AlertCircle, BookOpen, Upload } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ImportMathsContent() {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const handleImport = async () => {
    setImporting(true);
    setResult(null);

    try {
      const importResult = await importMathsContent();
      setResult(importResult);
    } catch (error) {
      setResult({ 
        success: false, 
        error: error.message 
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-6">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle>Import Maths Content</CardTitle>
                  <CardDescription>
                    Import all structured Maths lessons, topics, and quizzes into EduCore
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
                <p className="font-medium text-slate-700">This will import:</p>
                <ul className="space-y-1 text-slate-600 ml-4">
                  <li>• 1 Mathematics Subject</li>
                  <li>• 24 Topics across 5 categories</li>
                  <li>• 24 Comprehensive Lessons</li>
                  <li>• 24 Quizzes with ~190 Questions</li>
                </ul>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                <p className="font-medium mb-1">⚠️ Important:</p>
                <p>Only run this once. It will create new database records.</p>
              </div>

              {!result && (
                <Button
                  onClick={handleImport}
                  disabled={importing}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                  size="lg"
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 mr-2" />
                      Start Import
                    </>
                  )}
                </Button>
              )}

              {result && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`rounded-lg p-4 ${
                    result.success 
                      ? 'bg-green-50 border border-green-200' 
                      : 'bg-red-50 border border-red-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {result.success ? (
                      <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <h3 className={`font-semibold mb-1 ${
                        result.success ? 'text-green-900' : 'text-red-900'
                      }`}>
                        {result.success ? 'Import Successful!' : 'Import Failed'}
                      </h3>
                      {result.success ? (
                        <div className="text-sm text-green-700 space-y-1">
                          <p>✓ Created {result.topicCount} topics</p>
                          <p>✓ Created 24 lessons with full content</p>
                          <p>✓ Created 24 quizzes with questions</p>
                          <p className="mt-3 font-medium">All Maths content is now live in your app!</p>
                        </div>
                      ) : (
                        <p className="text-sm text-red-700">{result.error}</p>
                      )}
                    </div>
                  </div>

                  {result.success && (
                    <Button
                      onClick={() => window.location.href = '/Subject?id=' + result.subjectId}
                      className="w-full mt-4"
                      variant="outline"
                    >
                      View Maths Subject →
                    </Button>
                  )}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}