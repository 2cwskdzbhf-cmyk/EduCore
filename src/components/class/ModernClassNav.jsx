import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function ModernClassNav({ items, activeTab, onTabChange, mobileOpen }) {
  return (
    <nav className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {items.map((item, index) => (
          <motion.button
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => {
              onTabChange(item.id);
              mobileOpen?.();
            }}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 relative group',
              activeTab === item.id
                ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            )}>
            <span className="text-lg">{item.icon}</span>
            <span className="flex-1 text-left">{item.label}</span>
            {activeTab === item.id && (
              <motion.div
                layoutId="navIndicator"
                className="absolute left-0 h-full w-1 bg-gradient-to-b from-purple-400 to-blue-400 rounded-r-lg"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </motion.button>
        ))}
      </div>
    </nav>
  );
}