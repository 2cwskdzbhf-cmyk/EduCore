import React from 'react';
import { motion } from 'framer-motion';

export default function StatsCard({ icon: Icon, label, value, color = "indigo", delay = 0, onClick }) {
  const colorClasses = {
    indigo: "from-indigo-500 to-indigo-600 shadow-indigo-500/25",
    emerald: "from-emerald-500 to-emerald-600 shadow-emerald-500/25",
    amber: "from-amber-500 to-amber-600 shadow-amber-500/25",
    rose: "from-rose-500 to-rose-600 shadow-rose-500/25",
    purple: "from-purple-500 to-purple-600 shadow-purple-500/25",
  };

  return (
    <motion.div
      className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-lg shadow-black/20 transition-all duration-300 hover:bg-white/10 hover:scale-[1.02] p-8 text-center cursor-pointer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      onClick={onClick}
    >
      <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
        <Icon className="w-6 h-6 text-white" />
      </div>
      <p className="text-4xl font-bold text-white mb-2">{value}</p>
      <p className="text-sm text-slate-400">{label}</p>
    </motion.div>
  );
}