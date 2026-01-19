import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Sparkles, AlertTriangle } from 'lucide-react';

export default function WeakStrongAreas({ weakAreas = [], strongAreas = [], topics = [] }) {
  const getTopicName = (topicId) => {
    const topic = topics.find(t => t.id === topicId);
    return topic?.name || 'Unknown Topic';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Strong Areas */}
      <motion.div
        className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl p-5 border border-emerald-200"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-semibold text-emerald-800">Strong Areas</h3>
          <Sparkles className="w-4 h-4 text-emerald-500 ml-auto" />
        </div>
        {strongAreas.length > 0 ? (
          <div className="space-y-2">
            {strongAreas.slice(0, 3).map((topicId, idx) => (
              <div key={topicId} className="flex items-center gap-2 bg-white/70 rounded-lg px-3 py-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-sm text-emerald-700 font-medium">{getTopicName(topicId)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-emerald-600/70 italic">Keep learning to discover your strengths!</p>
        )}
      </motion.div>

      {/* Weak Areas */}
      <motion.div
        className="bg-gradient-to-br from-amber-50 to-orange-100/50 rounded-2xl p-5 border border-amber-200"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
            <TrendingDown className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-semibold text-amber-800">Needs Practice</h3>
          <AlertTriangle className="w-4 h-4 text-amber-500 ml-auto" />
        </div>
        {weakAreas.length > 0 ? (
          <div className="space-y-2">
            {weakAreas.slice(0, 3).map((topicId, idx) => (
              <div key={topicId} className="flex items-center gap-2 bg-white/70 rounded-lg px-3 py-2">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-sm text-amber-700 font-medium">{getTopicName(topicId)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-amber-600/70 italic">Great job! No weak areas detected yet.</p>
        )}
      </motion.div>
    </div>
  );
}