import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import {
  Pen,
  Eraser,
  Trash2,
  Download,
  RotateCcw,
  Circle as CircleIcon,
  Square
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function InteractiveWhiteboard({
  whiteboard,
  canEdit,
  onStrokeAdded,
  onClear,
  onUndo,
  isTeacher,
  className = ''
}) {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(3);
  const [strokes, setStrokes] = useState(whiteboard?.strokes || []);

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const context = canvas.getContext('2d');
    context.lineCap = 'round';
    context.lineJoin = 'round';
    contextRef.current = context;

    redrawCanvas();
  }, []);

  useEffect(() => {
    setStrokes(whiteboard?.strokes || []);
    redrawCanvas();
  }, [whiteboard?.strokes]);

  const redrawCanvas = () => {
    const context = contextRef.current;
    if (!context) return;

    context.fillStyle = '#0f172a';
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);

    strokes.forEach((stroke) => {
      if (stroke.type === 'line') {
        context.strokeStyle = stroke.color;
        context.lineWidth = stroke.width;
        context.beginPath();
        stroke.points.forEach((point, idx) => {
          if (idx === 0) context.moveTo(point.x, point.y);
          else context.lineTo(point.x, point.y);
        });
        context.stroke();
      } else if (stroke.type === 'erase') {
        context.clearRect(stroke.x - stroke.width / 2, stroke.y - stroke.width / 2, stroke.width, stroke.width);
      }
    });
  };

  const startDrawing = (event) => {
    if (!canEdit) return;

    const { offsetX, offsetY } = event.nativeEvent;
    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const finishDrawing = () => {
    contextRef.current.closePath();
    setIsDrawing(false);
  };

  const draw = (event) => {
    if (!isDrawing || !canEdit) return;

    const { offsetX, offsetY } = event.nativeEvent;
    const context = contextRef.current;

    if (tool === 'pen') {
      context.strokeStyle = color;
      context.lineWidth = brushSize;
      context.lineTo(offsetX, offsetY);
      context.stroke();
    } else if (tool === 'eraser') {
      context.clearRect(offsetX - brushSize / 2, offsetY - brushSize / 2, brushSize, brushSize);
    }
  };

  const handleClear = () => {
    if (!canEdit) return;
    const context = contextRef.current;
    context.fillStyle = '#0f172a';
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);
    setStrokes([]);
    onClear?.();
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = 'whiteboard.png';
    link.click();
  };

  return (
    <GlassCard className={cn('p-4 flex flex-col', className)}>
      {/* Toolbar */}
      {canEdit && (
        <div className="mb-4 p-3 bg-white/5 rounded-lg border border-white/10 space-y-3">
          <div className="flex flex-wrap gap-2">
            {/* Tools */}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => setTool('pen')}
                className={tool === 'pen' ? 'bg-purple-500' : 'bg-white/10 hover:bg-white/20'}
              >
                <Pen className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                onClick={() => setTool('eraser')}
                className={tool === 'eraser' ? 'bg-red-500' : 'bg-white/10 hover:bg-white/20'}
              >
                <Eraser className="w-4 h-4" />
              </Button>
            </div>

            {/* Color Picker */}
            {tool === 'pen' && (
              <div className="flex gap-2">
                {['#ffffff', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={cn(
                      'w-8 h-8 rounded-full border-2 transition-all',
                      color === c ? 'border-white scale-110' : 'border-white/30 hover:border-white'
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            )}

            {/* Brush Size */}
            {tool === 'pen' && (
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  className="w-24"
                />
                <span className="text-xs text-slate-400">{brushSize}px</span>
              </div>
            )}

            {/* Clear Button */}
            <Button
              size="sm"
              onClick={handleClear}
              variant="outline"
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>

            {/* Download Button */}
            <Button
              size="sm"
              onClick={downloadCanvas}
              variant="outline"
              className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>

          {!isTeacher && (
            <p className="text-xs text-slate-400">
              ✓ You can edit this whiteboard
            </p>
          )}
        </div>
      )}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseUp={finishDrawing}
        onMouseMove={draw}
        onMouseLeave={finishDrawing}
        className={cn(
          'flex-1 bg-slate-900 rounded-lg border border-white/10 cursor-crosshair min-h-[400px]',
          !canEdit && 'cursor-default opacity-80'
        )}
      />

      {!canEdit && (
        <p className="text-xs text-slate-400 mt-2">
          ℹ️ Teacher has not enabled editing for you yet
        </p>
      )}
    </GlassCard>
  );
}