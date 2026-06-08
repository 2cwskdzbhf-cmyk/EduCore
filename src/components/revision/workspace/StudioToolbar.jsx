import React from 'react';
import {
  Layers, Zap, Timer,
  Calculator, FlaskConical, BarChart2, Network,
  Video, Mic2, MessageSquare,
  FileText, StickyNote, BookOpen,
  BrainCircuit
} from 'lucide-react';

export const TOOL_GROUPS = [
  {
    group: 'AI Tutor',
    items: [
      { id: 'chat', label: 'AI Tutor', icon: BrainCircuit, color: 'from-violet-500 to-purple-600', desc: 'Ask anything about your sources' },
    ],
  },
  {
    group: 'Study Tools',
    items: [
      { id: 'flashcards', label: 'Flashcards', icon: Layers, color: 'from-amber-500 to-orange-500', desc: 'Spaced repetition cards' },
      { id: 'quiz', label: 'Quiz', icon: Zap, color: 'from-indigo-500 to-blue-600', desc: 'Auto-marked quiz' },
      { id: 'exam_sim', label: 'Exam Simulation', icon: Timer, color: 'from-red-500 to-orange-600', desc: 'Timed exam + analytics' },
    ],
  },
  {
    group: 'AI Tools',
    items: [
      { id: 'equation', label: 'Equation Solver', icon: Calculator, color: 'from-violet-500 to-purple-600', desc: 'Step-by-step maths' },
      { id: 'chemistry', label: 'Chemistry Balancer', icon: FlaskConical, color: 'from-emerald-500 to-teal-600', desc: 'Balance equations' },
      { id: 'graph', label: 'Graph Generator', icon: BarChart2, color: 'from-blue-500 to-cyan-600', desc: 'Plot functions & data' },
      { id: 'mindmap', label: 'Mind Map', icon: Network, color: 'from-pink-500 to-rose-600', desc: 'Visual concept map' },
    ],
  },
  {
    group: 'Media Tools',
    items: [
      { id: 'explainer', label: 'Explainer Video', icon: Video, color: 'from-blue-600 to-indigo-600', desc: 'AI video explanation' },
      { id: 'podcast', label: 'Podcast Mode', icon: Mic2, color: 'from-violet-600 to-purple-700', desc: 'AI audio discussion' },
      { id: 'voice_tutor', label: 'Voice Tutor', icon: MessageSquare, color: 'from-emerald-600 to-teal-700', desc: 'Real-time voice Q&A' },
    ],
  },
  {
    group: 'Source Tools',
    items: [
      { id: 'summary', label: 'Summary', icon: FileText, color: 'from-cyan-500 to-sky-600', desc: 'Summarise sources' },
      { id: 'notes', label: 'Notes', icon: StickyNote, color: 'from-amber-500 to-yellow-600', desc: 'Personal study notes' },
      { id: 'topic_breakdown', label: 'Topic Breakdown', icon: BookOpen, color: 'from-slate-500 to-slate-600', desc: 'Full topic overview' },
    ],
  },
];

export const ALL_TOOLS = TOOL_GROUPS.flatMap(g => g.items);

export default function StudioToolbar({ activeTool, onSelectTool }) {
  return (
    <div className="flex-shrink-0 border-b border-white/10 bg-slate-950/80 backdrop-blur-sm">
      <div className="flex items-center gap-0 overflow-x-auto scrollbar-hide px-2 py-1">
        {TOOL_GROUPS.map((group, gi) => (
          <React.Fragment key={group.group}>
            {gi > 0 && <div className="w-px h-5 bg-white/10 mx-1 flex-shrink-0" />}
            <div className="flex items-center gap-0.5">
              {group.items.map(tool => {
                const isActive = activeTool === tool.id;
                return (
                  <button
                    key={tool.id}
                    onClick={() => onSelectTool(tool.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
                      isActive
                        ? `bg-gradient-to-br ${tool.color} text-white shadow-sm`
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <tool.icon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{tool.label}</span>
                  </button>
                );
              })}
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}