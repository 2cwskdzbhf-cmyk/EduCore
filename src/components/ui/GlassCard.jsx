import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function GlassCard({ children, className, hover = true, onClick, ...props }) {
  return (
    <motion.div
      className={cn(
        "relative backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10",
        "shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]",
        hover && "transition-all duration-300 hover:bg-white/10 hover:shadow-[0_8px_48px_0_rgba(139,92,246,0.3)] hover:-translate-y-1",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StatCard({ icon: Icon, label, value, onClick, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: 'easeOut' }}
    >
      <GlassCard 
        hover={true} 
        onClick={onClick}
        className="p-8 text-center"
      >
        {Icon && (
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <Icon className="w-6 h-6 text-white" />
          </div>
        )}
        <p className="text-4xl font-bold text-white mb-2">{value}</p>
        <p className="text-sm text-slate-400">{label}</p>
      </GlassCard>
    </motion.div>
  );
}