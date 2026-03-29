import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Zap,
  RotateCcw,
  User,
  BookOpen,
} from 'lucide-react';

export default function StudentGapRow({ student, topics, expanded, onToggle, onTriggerAnalysis, onOverride, overrideLoading }) {
  const [selectedTopicOverride, setSelectedTopicOverride] = useState('');
  const [customGaps, setCustomGaps] = useState('');
  const [triggering, setTriggering] = useState(false);

  const scoreColor = student.avgScore === null ? 'text-slate-400'
    : student.avgScore >= 80 ? 'text-emerald-400'
    : student.avgScore >= 60 ? 'text-yellow-400'
    : 'text-red-400';

  const scoreBg = student.avgScore === null ? 'bg-slate-700/30'
    : student.avgScore >= 80 ? 'bg-emerald-500/10'
    : student.avgScore >= 60 ? 'bg-yellow-500/10'
    : 'bg-red-500/10';

  const handleTriggerAnalysis = async () => {
    if (!student.latestAttempt) return;
    setTriggering(true);
    await onTriggerAnalysis(student.latestAttempt.id);
    setTriggering(false);
  };

  const handleOverride = () => {
    const topicId = selectedTopicOverride || student.latestAttempt?.topic_id;
    if (!topicId) return;
    const areas = customGaps
      ? customGaps.split(',').map(g => g.trim()).filter(Boolean)
      : student.topGaps;
    onOverride(topicId, areas);
  };

  const shortEmail = student.email.split('@')[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border transition-all ${student.isStruggling ? 'border-red-500/30 bg-red-500/5' : 'border-white/10 bg-white/5'}`}
    >
      {/* Row Header */}
      <button
        className="w-full flex items-center gap-4 p-4 text-left"
        onClick={onToggle}
      >
        {/* Avatar */}
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${scoreBg}`}>
          <span className={scoreColor}>{shortEmail.charAt(0).toUpperCase()}</span>
        </div>

        {/* Email */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium truncate">{student.email}</p>
          <p className="text-xs text-slate-500">{student.attemptsCount} attempt{student.attemptsCount !== 1 ? 's' : ''}</p>
        </div>

        {/* Score */}
        <div className="text-right flex-shrink-0 mr-2">
          <p className={`text-xl font-bold ${scoreColor}`}>
            {student.avgScore !== null ? `${student.avgScore}%` : '—'}
          </p>
          <p className="text-xs text-slate-500">avg score</p>
        </div>

        {/* Status badges */}
        <div className="flex gap-2 flex-shrink-0">
          {student.isStruggling && (
            <Badge className="bg-red-500/20 text-red-300 text-xs">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Struggling
            </Badge>
          )}
          {student.hasAnalysis ? (
            <Badge className="bg-emerald-500/20 text-emerald-300 text-xs">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Analysed
            </Badge>
          ) : student.latestAttempt ? (
            <Badge className="bg-yellow-500/20 text-yellow-300 text-xs">Pending</Badge>
          ) : (
            <Badge className="bg-slate-700/40 text-slate-400 text-xs">No Attempts</Badge>
          )}
        </div>

        {/* Top gaps preview */}
        <div className="hidden md:flex gap-1 flex-shrink-0 max-w-[200px] flex-wrap">
          {student.topGaps.slice(0, 3).map((gap, i) => (
            <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-white/8 text-slate-400 truncate max-w-[80px]" title={gap}>
              {gap}
            </span>
          ))}
        </div>

        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
        )}
      </button>

      {/* Expanded Detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-5 border-t border-white/10 pt-4 space-y-5">

              {/* Identified Gaps */}
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Identified Knowledge Gaps</p>
                {student.topGaps.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {student.topGaps.map((gap, i) => (
                      <Badge key={i} className="bg-red-500/15 text-red-300 capitalize">{gap}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">No gaps identified yet</p>
                )}
              </div>

              {/* Latest Analysis Recommendation */}
              {student.latestAttempt?.ai_analysis?.recommendations && (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">AI Recommendation</p>
                  <p className="text-sm text-slate-300 bg-white/5 rounded-lg p-3 border border-white/8">
                    {student.latestAttempt.ai_analysis.recommendations}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-3 items-end">

                {/* Trigger / Re-run Analysis */}
                {student.latestAttempt && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleTriggerAnalysis}
                    disabled={triggering}
                    className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
                  >
                    <Zap className="w-3 h-3 mr-1.5" />
                    {triggering ? 'Running...' : student.hasAnalysis ? 'Re-run Analysis' : 'Run Analysis'}
                  </Button>
                )}

                {/* Manual Override Section */}
                <div className="flex items-end gap-2 flex-wrap flex-1">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Override topic</p>
                    <Select value={selectedTopicOverride} onValueChange={setSelectedTopicOverride}>
                      <SelectTrigger className="w-48 h-8 bg-white/5 border-white/10 text-white text-xs">
                        <SelectValue placeholder="Auto (from attempt)" />
                      </SelectTrigger>
                      <SelectContent>
                        {topics.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Override gaps (comma-separated)</p>
                    <input
                      type="text"
                      value={customGaps}
                      onChange={e => setCustomGaps(e.target.value)}
                      placeholder="e.g. fractions, algebra"
                      className="h-8 px-2 rounded-md bg-white/5 border border-white/10 text-white text-xs w-52 placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={handleOverride}
                    disabled={overrideLoading || (!selectedTopicOverride && !student.latestAttempt?.topic_id)}
                    className="bg-gradient-to-r from-purple-500 to-blue-500 h-8"
                  >
                    <BookOpen className="w-3 h-3 mr-1.5" />
                    {overrideLoading ? 'Assigning...' : 'Assign Practice'}
                  </Button>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}