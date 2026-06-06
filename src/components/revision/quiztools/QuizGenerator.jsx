import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Loader2, Sparkles, ChevronRight, Settings2 } from 'lucide-react';

const FORMATS = [
  { id: 'multiple_choice', label: 'Multiple Choice', emoji: '🔘', desc: '4 options, one correct answer' },
  { id: 'short_answer', label: 'Short Answer', emoji: '✏️', desc: '1–3 sentence responses' },
  { id: 'long_answer', label: 'Long Answer', emoji: '📝', desc: 'Extended essay/paragraph answers' },
  { id: 'fill_blank', label: 'Fill in the Blank', emoji: '___', desc: 'Complete the missing word or phrase' },
  { id: 'true_false', label: 'True / False', emoji: '✅', desc: 'Decide if the statement is correct' },
  { id: 'mixed', label: 'Mixed Mode', emoji: '🎯', desc: 'All formats combined' },
];

const DIFFICULTIES = ['Foundation', 'Intermediate', 'Higher', 'Mixed'];
const QUESTION_COUNTS = [5, 10, 15, 20];

export default function QuizGenerator({ notebook, user, sources, onStartQuiz }) {
  const [selectedFormat, setSelectedFormat] = useState('multiple_choice');
  const [difficulty, setDifficulty] = useState('Mixed');
  const [questionCount, setQuestionCount] = useState(10);
  const [selectedSourceIds, setSelectedSourceIds] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  const validSources = sources.filter(s => s.content_text?.trim());
  const sourcesToUse = selectedSourceIds.length > 0
    ? validSources.filter(s => selectedSourceIds.includes(s.id))
    : validSources;

  const toggleSource = (id) => {
    setSelectedSourceIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const generate = async () => {
    if (!sourcesToUse.length) { setError('No sources with text content found. Upload sources first.'); return; }
    setIsGenerating(true);
    setError(null);

    const combinedText = sourcesToUse.map(s => `[Source: ${s.name}]\n${s.content_text}`).join('\n\n---\n\n').slice(0, 12000);
    const formatConfig = FORMATS.find(f => f.id === selectedFormat);

    const formatInstructions = {
      multiple_choice: `Generate ${questionCount} multiple choice questions. Each must have a "question", "options" array of exactly 4 strings, "correct_index" (0-3), and "explanation".`,
      short_answer: `Generate ${questionCount} short answer questions. Each must have a "question", "model_answer" (2-4 sentences), "mark_points" array of 3-5 key marking points, and "marks" (1-4).`,
      long_answer: `Generate ${questionCount} long answer questions worth 6-12 marks each. Each must have a "question", "model_answer" (full paragraph answer), "mark_scheme" array of marking points, and "marks" (6-12).`,
      fill_blank: `Generate ${questionCount} fill-in-the-blank questions. Each must have a "sentence" with "___" where the answer goes, "answer" (the missing word/phrase), and "hint" (optional context clue).`,
      true_false: `Generate ${questionCount} true/false statements. Each must have a "statement", "answer" (true or false), and "explanation" (why it's true or false).`,
      mixed: `Generate ${questionCount} questions mixing all formats: multiple choice, short answer, fill in the blank, and true/false. Use a "type" field for each: "multiple_choice", "short_answer", "fill_blank", or "true_false". Include all relevant fields for each type.`,
    };

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert ${notebook.exam_board || 'GCSE/A-Level'} examiner creating a ${difficulty} difficulty ${formatConfig.label} quiz for "${notebook.subject || notebook.name}".

INSTRUCTIONS:
${formatInstructions[selectedFormat]}

RULES:
- All questions must be directly based on the source material below.
- Difficulty: ${difficulty}
- Subject: ${notebook.subject || notebook.name}
- Exam board style: ${notebook.exam_board || 'GCSE/A-Level'}
- No markdown in question or answer text. Plain English only.

SOURCE MATERIAL:
${combinedText}`,
      response_json_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          questions: { type: 'array', items: { type: 'object' } }
        }
      }
    });

    if (!result?.questions?.length) {
      setError('Could not generate questions. Try selecting different sources or reducing question count.');
      setIsGenerating(false);
      return;
    }

    onStartQuiz({
      questions: result.questions,
      title: result.title || `${formatConfig.label} Quiz — ${notebook.name}`,
      format: selectedFormat,
      difficulty,
      examBoard: notebook.exam_board || '',
    });

    setIsGenerating(false);
  };

  return (
    <div className="space-y-5">
      {/* Format selector */}
      <div>
        <p className="text-sm text-slate-400 font-semibold mb-3">Quiz Format</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {FORMATS.map(f => (
            <button key={f.id} onClick={() => setSelectedFormat(f.id)}
              className={`p-3 rounded-2xl border text-left transition-all ${
                selectedFormat === f.id
                  ? 'bg-violet-500/20 border-violet-500/40 text-white'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-white'
              }`}>
              <div className="text-xl mb-1">{f.emoji}</div>
              <div className="font-semibold text-xs">{f.label}</div>
              <div className="text-xs opacity-60 mt-0.5">{f.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Settings row */}
      <div className="flex flex-wrap gap-4">
        <div>
          <p className="text-xs text-slate-500 mb-2">Difficulty</p>
          <div className="flex gap-1.5">
            {DIFFICULTIES.map(d => (
              <button key={d} onClick={() => setDifficulty(d)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                  difficulty === d ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-white/5 border-white/10 text-slate-500 hover:text-white'
                }`}>
                {d}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-2">Questions</p>
          <div className="flex gap-1.5">
            {QUESTION_COUNTS.map(n => (
              <button key={n} onClick={() => setQuestionCount(n)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                  questionCount === n ? 'bg-violet-500/20 border-violet-500/40 text-violet-300' : 'bg-white/5 border-white/10 text-slate-500 hover:text-white'
                }`}>
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Source selector */}
      {validSources.length > 1 && (
        <div>
          <p className="text-xs text-slate-500 mb-2">Sources to use <span className="text-slate-600">(leave blank = all)</span></p>
          <div className="flex flex-wrap gap-1.5">
            {validSources.map(s => (
              <button key={s.id} onClick={() => toggleSource(s.id)}
                className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                  selectedSourceIds.includes(s.id) ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'bg-white/5 border-white/10 text-slate-500 hover:text-white'
                }`}>
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>}

      <button onClick={generate} disabled={isGenerating || !sourcesToUse.length}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-black text-sm hover:brightness-110 disabled:opacity-40 transition-all">
        {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating Quiz…</> : <><Sparkles className="w-4 h-4" /> Generate {questionCount}-Question {FORMATS.find(f => f.id === selectedFormat)?.label} Quiz</>}
      </button>

      {!sourcesToUse.length && (
        <p className="text-slate-600 text-xs text-center">Upload sources with text content to generate a quiz.</p>
      )}
    </div>
  );
}