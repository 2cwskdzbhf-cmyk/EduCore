import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';

function OptionRow({ opt, color, onChange, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(opt);

  const commit = () => {
    setEditing(false);
    if (val.trim()) onChange(val.trim());
    else setVal(opt);
  };

  return (
    <div className="flex items-center gap-2 group">
      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
      {editing ? (
        <input
          autoFocus
          value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setVal(opt); setEditing(false); } }}
          className="flex-1 bg-white/10 border border-white/20 rounded px-2 py-0.5 text-white text-sm outline-none"
        />
      ) : (
        <span
          className="text-white flex-1 text-sm cursor-pointer hover:text-purple-300 transition-colors"
          onClick={() => setEditing(true)}
          title="Click to edit"
        >
          {opt}
        </span>
      )}
      <button onClick={onDelete} className="flex items-center justify-center w-7 h-7 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-400 hover:text-red-300 transition-all border border-red-500/30 flex-shrink-0">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

const COLORS = [
  '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#06b6d4', '#84cc16',
  '#f97316', '#6366f1',
];

export default function SpinWheel() {
  const canvasRef = useRef(null);
  const [options, setOptions] = useState(['Yes', 'No']);
  const [newOption, setNewOption] = useState('');
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const spinRef = useRef({ angle: 0, velocity: 0, animId: null });

  const entries = options.filter(o => o.trim() !== '');

  const drawWheel = (angle = 0) => {
    const canvas = canvasRef.current;
    if (!canvas || entries.length === 0) return;
    const ctx = canvas.getContext('2d');
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = cx - 10;
    const slice = (2 * Math.PI) / entries.length;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    entries.forEach((opt, i) => {
      const start = angle + i * slice;
      const end = start + slice;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + slice / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.min(16, Math.max(10, 120 / entries.length))}px sans-serif`;
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.fillText(opt.length > 12 ? opt.slice(0, 12) + '…' : opt, r - 10, 5);
      ctx.restore();
    });

    // Centre circle
    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, 2 * Math.PI);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Pointer (top)
    ctx.beginPath();
    ctx.moveTo(cx - 12, 0);
    ctx.lineTo(cx + 12, 0);
    ctx.lineTo(cx, 22);
    ctx.closePath();
    ctx.fillStyle = '#fff';
    ctx.fill();
  };

  React.useEffect(() => {
    drawWheel(spinRef.current.angle);
  }, [entries.join(',')]);

  const spin = () => {
    if (spinning || entries.length < 2) return;
    setResult(null);
    setSpinning(true);
    spinRef.current.velocity = 0.3 + Math.random() * 0.25;
    const friction = 0.985;

    const animate = () => {
      spinRef.current.angle += spinRef.current.velocity;
      spinRef.current.velocity *= friction;
      drawWheel(spinRef.current.angle);

      if (spinRef.current.velocity > 0.002) {
        spinRef.current.animId = requestAnimationFrame(animate);
      } else {
        setSpinning(false);
        const slice = (2 * Math.PI) / entries.length;
        // pointer is at top = -π/2, normalize
        const normalised = (((-spinRef.current.angle - Math.PI / 2) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const idx = Math.floor(normalised / slice) % entries.length;
        setResult(entries[idx]);
      }
    };
    animate();
  };

  const addOption = () => {
    if (newOption.trim()) {
      setOptions([...options, newOption.trim()]);
      setNewOption('');
    }
  };

  const removeOption = (i) => setOptions(options.filter((_, idx) => idx !== i));

  return (
    <GlassCard className="p-6">
      <h2 className="text-xl font-bold text-white mb-4">🎡 Spin the Wheel</h2>
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Wheel */}
        <div className="flex flex-col items-center gap-4 flex-shrink-0">
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={300}
              height={300}
              className="rounded-full cursor-pointer select-none"
              onClick={spin}
              style={{ display: 'block' }}
            />
            {/* Spin hint overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-white/60 text-xs font-semibold bg-black/40 px-2 py-1 rounded-full">
                {spinning ? 'Spinning…' : 'Tap to spin'}
              </span>
            </div>
          </div>
          {result && (
            <div className="text-center px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-blue-500 shadow-lg shadow-purple-500/30">
              <p className="text-white/70 text-sm mb-1">Result</p>
              <p className="text-2xl font-bold text-white">{result} 🎉</p>
            </div>
          )}
        </div>

        {/* Options panel */}
        <div className="flex-1 w-full">
          <p className="text-slate-300 text-sm font-semibold mb-3">Options ({entries.length})</p>
          <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
            {options.map((opt, i) => (
              <OptionRow
                key={i}
                opt={opt}
                color={COLORS[i % COLORS.length]}
                onChange={val => {
                  const updated = [...options];
                  updated[i] = val;
                  setOptions(updated);
                }}
                onDelete={() => removeOption(i)}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newOption}
              onChange={e => setNewOption(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addOption()}
              placeholder="Add option..."
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
            />
            <Button onClick={addOption} size="sm" className="bg-purple-500 hover:bg-purple-600">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {entries.length < 2 && (
            <p className="text-amber-400 text-xs mt-2">Add at least 2 options to spin</p>
          )}
        </div>
      </div>
    </GlassCard>
  );
}