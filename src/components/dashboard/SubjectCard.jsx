import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ChevronRight } from 'lucide-react';
import ProgressRing from '@/components/ui/ProgressRing';

export default function SubjectCard({ subject, progress = 0, topicsCount = 0, completedTopics = 0, delay = 0 }) {
  const colorMap = {
    blue: { bg: "from-blue-500 to-blue-600", ring: "#3b82f6" },
    green: { bg: "from-emerald-500 to-emerald-600", ring: "#10b981" },
    purple: { bg: "from-purple-500 to-purple-600", ring: "#8b5cf6" },
    orange: { bg: "from-orange-500 to-orange-600", ring: "#f97316" },
    pink: { bg: "from-pink-500 to-pink-600", ring: "#ec4899" },
    indigo: { bg: "from-indigo-500 to-indigo-600", ring: "#6366f1" },
  };

  const color = colorMap[subject.color] || colorMap.indigo;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <Link to={createPageUrl(`Subject?id=${subject.id}`)}>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${color.bg} flex items-center justify-center shadow-lg mb-4`}>
                <span className="text-2xl text-white font-bold">
                  {subject.name?.charAt(0)}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-1">{subject.name}</h3>
              <p className="text-sm text-slate-500 mb-3">{subject.description}</p>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span>{completedTopics}/{topicsCount} topics</span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <ProgressRing progress={progress} size={70} strokeWidth={6} color={color.ring}>
                <span className="text-sm font-bold text-slate-700">{Math.round(progress)}%</span>
              </ProgressRing>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-sm font-medium text-indigo-600">Continue learning</span>
            <ChevronRight className="w-4 h-4 text-indigo-600" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}