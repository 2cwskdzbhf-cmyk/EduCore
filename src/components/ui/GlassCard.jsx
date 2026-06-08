import React from 'react';
import { motion } from 'framer-motion';

const glassStyle = {
  background: 'rgba(255,255,255,0.2)',
  backdropFilter: 'blur(25px)',
  WebkitBackdropFilter: 'blur(25px)',
  border: '1px solid rgba(255,255,255,0.35)',
  boxShadow: '0 4px 20px rgba(61,82,160,0.15)',
};

export function GlassCard({ children, className = '', onClick, hover = true }) {
  return (
    <motion.div
      className={`rounded-2xl ${className}`}
      style={glassStyle}
      whileHover={hover ? { scale: 1.01, boxShadow: '0 8px 32px rgba(112,145,230,0.25)' } : {}}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}

export function StatCard({ icon: Icon, value, label, color = '#7091E6', className = '' }) {
  return (
    <GlassCard className={`p-5 ${className}`}>
      <motion.div
        className="flex items-center gap-4"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}20`, border: `1px solid ${color}30` }}>
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
        <div>
          <p className="text-2xl font-bold" style={{ color: '#3D52A0' }}>{value}</p>
          <p className="text-sm" style={{ color: '#8697C4' }}>{label}</p>
        </div>
      </motion.div>
    </GlassCard>
  );
}

export default GlassCard;