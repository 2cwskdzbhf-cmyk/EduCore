import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/ui/GlassCard';
import { Play, Pause, RotateCcw } from 'lucide-react';

export default function Stopwatch() {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // ms
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const accumulatedRef = useRef(0);

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  const start = () => {
    if (running) return;
    startTimeRef.current = Date.now();
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setElapsed(accumulatedRef.current + (Date.now() - startTimeRef.current));
    }, 10);
  };

  const pause = () => {
    if (!running) return;
    clearInterval(intervalRef.current);
    accumulatedRef.current += Date.now() - startTimeRef.current;
    setRunning(false);
  };

  const reset = () => {
    clearInterval(intervalRef.current);
    setRunning(false);
    accumulatedRef.current = 0;
    setElapsed(0);
  };

  const minutes = Math.floor(elapsed / 60000);
  const seconds = Math.floor((elapsed % 60000) / 1000);
  const ms = Math.floor((elapsed % 1000) / 10);

  const pad = (n, len = 2) => String(n).padStart(len, '0');

  return (
    <GlassCard className="p-6">
      <h2 className="text-xl font-bold text-white mb-6">⏱ Stopwatch</h2>
      <div className="text-center">
        <div className="font-mono text-6xl font-bold text-white mb-8 tracking-widest">
          <span>{pad(minutes)}</span>
          <span className="text-purple-400">:</span>
          <span>{pad(seconds)}</span>
          <span className="text-purple-400">:</span>
          <span className="text-4xl text-slate-300">{pad(ms)}</span>
        </div>
        <div className="flex justify-center gap-4">
          {!running ? (
            <Button onClick={start} className="bg-emerald-500 hover:bg-emerald-600 px-8">
              <Play className="w-5 h-5 mr-2" /> Start
            </Button>
          ) : (
            <Button onClick={pause} className="bg-amber-500 hover:bg-amber-600 px-8">
              <Pause className="w-5 h-5 mr-2" /> Pause
            </Button>
          )}
          <Button onClick={reset} className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 shadow-lg shadow-purple-500/30 px-8">
            <RotateCcw className="w-5 h-5 mr-2" /> Reset
          </Button>
        </div>
      </div>
    </GlassCard>
  );
}