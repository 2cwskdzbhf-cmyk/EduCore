import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles, FolderOpen, BookOpen, Layers, CheckCircle, AlertCircle, ChevronDown, ChevronRight, Play, Loader2 } from 'lucide-react';

export default function TopicAutoDetection({ user, notebooks }) {
  const [selectedNotebook, setSelectedNotebook] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [expandedTopics, setExpandedTopics] = useState({});
  const [error, setError] = useState(null);
  const queryClient = useQueryClient();

  const { data: sources = [] } = useQuery({
    queryKey: ['revisionSources', selectedNotebook?.id],
    queryFn: () => base44.entities.RevisionSource.filter({ notebook_id: selectedNotebook.id }),
    enabled: !!selectedNotebook?.id,
  });

  const handleScan = async () => {
    if (!selectedNotebook || sources.length === 0) return;
    setIsScanning(true);
    setError(null);
    setScanResult(null);

    const combinedText = sources
      .map(s => `[Source: ${s.name}]\n${s.content_text || s.summary || ''}`)
      .filter(t => t.length > 20)
      .join('\n\n')
      .slice(0, 12000);

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert academic study planner. Analyse the following study material and extract a structured topic map.

Return a JSON object with this exact structure:
{
  "topics": [
    {
      "name": "Topic Name",
      "description": "Brief description",
      "subtopics": ["Subtopic A", "Subtopic B", "Subtopic C"],
      "flashcard_prompts": ["Key concept 1?", "Define term X?", "What is Y?"],
      "quiz_questions": [
        { "question": "Question text?", "answer": "Answer text" }
      ]
    }
  ]
}

Generate 3-7 topics. Each topic should have 2-5 subtopics, 3-6 flashcard prompts, and 2-4 quiz questions.

Study material:
${combinedText}`,
      response_json_schema: {
        type: 'object',
        properties: {
          topics: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                subtopics: { type: 'array', items: { type: 'string' } },
                flashcard_prompts: { type: 'array', items: { type: 'string' } },
                quiz_questions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: { question: { type: 'string' }, answer: { type: 'string' } }
                  }
                }
              }
            }
          }
        }
      }
    });

    const topics = res.topics || [];

    // Create flashcards and resources for each topic
    for (const topic of topics) {
      // Create flashcards
      const flashcards = topic.flashcard_prompts?.map(prompt => ({
        notebook_id: selectedNotebook.id,
        student_email: user.email,
        front: prompt,
        back: `[AI Generated — from topic: ${topic.name}]`,
        is_ai_generated: true,
        difficulty_rating: 'medium',
      })) || [];

      if (flashcards.length > 0) {
        await base44.entities.RevisionFlashcard.bulkCreate(flashcards);
      }

      // Create a study guide resource for the topic
      const content = `# ${topic.name}\n\n${topic.description}\n\n## Subtopics\n${topic.subtopics?.map(s => `- ${s}`).join('\n') || ''}\n\n## Quiz Questions\n${topic.quiz_questions?.map((q, i) => `**Q${i + 1}:** ${q.question}\n**A:** ${q.answer}`).join('\n\n') || ''}`;

      await base44.entities.NotebookResource.create({
        notebook_id: selectedNotebook.id,
        student_email: user.email,
        title: `${topic.name} — Study Guide`,
        resource_type: 'study_guide',
        content,
        source_count: sources.length,
      });
    }

    setScanResult(topics);
    queryClient.invalidateQueries({ queryKey: ['revisionFlashcards'] });
    queryClient.invalidateQueries({ queryKey: ['notebookResources'] });
    setIsScanning(false);
  };

  const toggleTopic = (i) => setExpandedTopics(prev => ({ ...prev, [i]: !prev[i] }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Topic Auto-Detection</h2>
          <p className="text-slate-400 text-sm">AI scans your sources and builds topic folders, flashcards & quizzes</p>
        </div>
      </div>

      {/* Notebook selector */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <label className="text-sm text-slate-400 mb-2 block">Select a notebook to scan</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {notebooks.map(nb => (
            <button
              key={nb.id}
              onClick={() => { setSelectedNotebook(nb); setScanResult(null); }}
              className={`p-3 rounded-xl border text-left transition-all ${
                selectedNotebook?.id === nb.id
                  ? 'border-violet-500 bg-violet-500/20 text-white'
                  : 'border-white/10 bg-white/5 text-slate-400 hover:text-white hover:border-white/20'
              }`}
            >
              <div className="text-lg mb-1">{nb.icon || '📚'}</div>
              <div className="text-sm font-medium truncate">{nb.name}</div>
              <div className="text-xs text-slate-500">{nb.source_count || 0} sources</div>
            </button>
          ))}
        </div>
      </div>

      {selectedNotebook && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white font-medium">{selectedNotebook.name}</p>
              <p className="text-slate-400 text-sm">{sources.length} sources loaded</p>
            </div>
            <button
              onClick={handleScan}
              disabled={isScanning || sources.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white rounded-xl font-medium text-sm transition-all"
            >
              {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {isScanning ? 'Scanning…' : 'Run AI Scan'}
            </button>
          </div>

          {sources.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-4">No sources in this notebook yet. Add some sources first.</p>
          )}

          {isScanning && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-12 h-12 rounded-full bg-violet-500/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-violet-400 animate-pulse" />
              </div>
              <p className="text-slate-400 text-sm">AI is analysing your sources and building topics…</p>
              <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {scanResult && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            {scanResult.length} topics detected — flashcards & study guides created!
          </div>
          {scanResult.map((topic, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
            >
              <button
                onClick={() => toggleTopic(i)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                    <FolderOpen className="w-4 h-4 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{topic.name}</p>
                    <p className="text-slate-400 text-xs">{topic.subtopics?.length || 0} subtopics • {topic.flashcard_prompts?.length || 0} flashcards • {topic.quiz_questions?.length || 0} quiz Qs</p>
                  </div>
                </div>
                {expandedTopics[i] ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
              </button>

              <AnimatePresence>
                {expandedTopics[i] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-white/10"
                  >
                    <div className="p-4 grid md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Layers className="w-3 h-3" /> Subtopics</p>
                        <ul className="space-y-1">
                          {topic.subtopics?.map((s, j) => (
                            <li key={j} className="text-slate-300 text-sm flex items-center gap-2">
                              <div className="w-1 h-1 rounded-full bg-violet-400" />{s}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1"><BookOpen className="w-3 h-3" /> Flashcards</p>
                        <ul className="space-y-1">
                          {topic.flashcard_prompts?.map((f, j) => (
                            <li key={j} className="text-slate-300 text-xs bg-white/5 rounded-lg px-2 py-1">{f}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Quiz Questions</p>
                        <ul className="space-y-2">
                          {topic.quiz_questions?.map((q, j) => (
                            <li key={j} className="text-xs">
                              <p className="text-slate-300 font-medium">{q.question}</p>
                              <p className="text-slate-500 mt-0.5">→ {q.answer}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}