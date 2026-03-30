import React from 'react';
import { motion } from 'framer-motion';
import SpinWheel from '@/components/tools/SpinWheel';
import Stopwatch from '@/components/tools/Stopwatch';
import CountdownTimer from '@/components/tools/CountdownTimer';
import QuickLinks from '@/components/tools/QuickLinks';
import { Wrench } from 'lucide-react';

export default function UsefulTools() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Useful Tools</h1>
          </div>
          <p className="text-slate-400 ml-13">Handy tools for teachers and students</p>
        </motion.div>

        <div className="space-y-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <SpinWheel />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid md:grid-cols-2 gap-8"
          >
            <Stopwatch />
            <CountdownTimer />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <QuickLinks />
          </motion.div>
        </div>
      </div>
    </div>
  );
}