import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import GlassCard from '@/components/ui/GlassCard';
import { Play, Pause, RotateCcw } from 'lucide-react';

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.6, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1.2);
  } catch {}
}

export default function CountdownTimer() {
  const [inputMinutes, setInputMinutes] = useState('5');
  const [inputSeconds, setInputSeconds] = useState('0');
  const [remaining, setRemaining] = useState(null); // ms, null = not started
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef(null);
  const endTimeRef = useRef(null);

  useEffect(() => () => clearInterval(intervalRef.current), []);

  const totalMs = () => {
    const m = parseInt(inputMinutes) || 0;
    const s = parseInt(inputSeconds) || 0;
    return (m * 60 + s) * 1000;
  };

  const start = () => {
    if (running) return;
    const ms = remaining ?? totalMs();
    if (ms <= 0) return;
    setFinished(false);
    endTimeRef.current = Date.now() + ms;
    setRunning(true);
    intervalRef.current = setInterval(() => {
      const left = Math.max(0, endTimeRef.current - Date.now());
      setRemaining(left);
      if (left === 0) {
        clearInterval(intervalRef.current);
        setRunning(false);
        setFinished(true);
        beep();
      }
    }, 100);
  };

  const pause = () => {
    if (!running) return;
    clearInterval(intervalRef.current);
    setRemaining(Math.max(0, endTimeRef.current - Date.now()));
    setRunning(false);
  };

  const reset = () => {
    clearInterval(intervalRef.current);
    setRunning(false);
    setRemaining(null);
    setFinished(false);
  };

  const display = remaining ?? totalMs();
  const minutes = Math.floor(display / 60000);
  const seconds = Math.floor((display % 60000) / 1000);
  const pad = (n) => String(n).padStart(2, '0');
  const pct = remaining != null ? (remaining / totalMs()) * 100 : 100;

  return (
    <GlassCard className="p-6">
      <h2 className="text-xl font-bold text-white mb-6">⏳ Countdown Timer</h2>

      {/* Input row */}
      {remaining === null && !running && (
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="text-center">
            <label className="text-slate-400 text-xs mb-1 block">Minutes</label>
            <Input
              type="number"
              min="0"
              max="99"
              value={inputMinutes}
              onChange={e => setInputMinutes(e.target.value)}
              className="bg-white/5 border-white/10 text-white w-20 text-center text-lg"
            />
          </div>
          <span className="text-white text-3xl font-bold mt-4">:</span>
          <div className="text-center">
            <label className="text-slate-400 text-xs mb-1 block">Seconds</label>
            <Input
              type="number"
              min="0"
              max="59"
              value={inputSeconds}
              onChange={e => setInputSeconds(e.target.value)}
              className="bg-white/5 border-white/10 text-white w-20 text-center text-lg"
            />
          </div>
        </div>
      )}

      {/* Display */}
      <div className="text-center mb-6">
        {/* Progress ring */}
        <div className="relative w-40 h-40 mx-auto mb-4">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="44" fill="none"
              stroke={finished ? '#ef4444' : '#8b5cf6'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 44}`}
              strokeDashoffset={`${2 * Math.PI * 44 * (1 - pct / 100)}`}
              style={{ transition: 'stroke-dashoffset 0.1s linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-3xl font-bold text-white">
              {pad(minutes)}:{pad(seconds)}
            </span>
          </div>
        </div>

        {finished && (
          <div className="text-2xl font-bold text-red-400 animate-pulse mb-4">⏰ Time is up!</div>
        )}
      </div>

      <div className="flex justify-center gap-4">
        {!running ? (
          <Button onClick={start} disabled={totalMs() === 0} className="bg-emerald-500 hover:bg-emerald-600 px-8">
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
    </GlassCard>
  );
}