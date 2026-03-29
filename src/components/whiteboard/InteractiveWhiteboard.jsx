import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Pen,
  Eraser,
  Trash2,
  Download,
  RotateCcw,
  Circle as CircleIcon,
  Square,
  Maximize,
  Minimize,
  Type,
  Image as ImageIcon,
  Save
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';

export default function InteractiveWhiteboard({
  whiteboard,
  canEdit,
  onStrokeAdded,
  onClear,
  onUndo,
  isTeacher,
  whiteboardId,
  className = ''
}) {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const imageInputRef = useRef(null);
  const textInputRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(3);
  const [eraserSize, setEraserSize] = useState(15);
  const [strokes, setStrokes] = useState(whiteboard?.strokes || []);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [textMode, setTextMode] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState(null);
  const [selectedStroke, setSelectedStroke] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [textFontSize, setTextFontSize] = useState(16);
  const [textColor, setTextColor] = useState('#ffffff');
  const [textFont, setTextFont] = useState('Arial');

  const saveWhiteboardMutation = useMutation({
    mutationFn: async () => {
      if (!whiteboardId) return;
      await base44.entities.LiveSessionWhiteboard.update(whiteboardId, {
        strokes,
        drawing_data: canvasRef.current?.toDataURL('image/png')
      });
    }
  });

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

  // Auto-save every 5 seconds
  useEffect(() => {
    if (canEdit && strokes.length > 0) {
      const timer = setTimeout(() => {
        saveWhiteboardMutation.mutate();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [strokes, canEdit]);

  const redrawCanvas = () => {
    const context = contextRef.current;
    if (!context) return;

    context.fillStyle = '#0f172a';
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);

    strokes.forEach((stroke, idx) => {
      if (stroke.type === 'line') {
        context.strokeStyle = stroke.color;
        context.lineWidth = stroke.width;
        context.beginPath();
        stroke.points.forEach((point, i) => {
          if (i === 0) context.moveTo(point.x, point.y);
          else context.lineTo(point.x, point.y);
        });
        context.stroke();
      } else if (stroke.type === 'text') {
        context.fillStyle = stroke.color || '#ffffff';
        context.font = `${stroke.size || 16}px ${stroke.font || 'Arial'}`;
        context.fillText(stroke.content, stroke.x, stroke.y);
        
        if (selectedStroke === idx) {
          const metrics = context.measureText(stroke.content);
          context.strokeStyle = '#fbbf24';
          context.lineWidth = 2;
          context.strokeRect(stroke.x - 5, stroke.y - stroke.size - 5, metrics.width + 10, stroke.size + 10);
        }
      } else if (stroke.type === 'image' && stroke.src) {
        const img = new Image();
        img.src = stroke.src;
        img.onload = () => {
          context.drawImage(img, stroke.x, stroke.y, stroke.width, stroke.height);
          if (selectedStroke === idx) {
            context.strokeStyle = '#fbbf24';
            context.lineWidth = 2;
            context.strokeRect(stroke.x, stroke.y, stroke.width, stroke.height);
          }
        };
      }
    });
  };

  const startDrawing = (event) => {
    if (!canEdit) return;

    if (tool === 'select' && selectedStroke !== null) {
      const { offsetX, offsetY } = event.nativeEvent;
      setIsDragging(true);
      setDragStart({ x: offsetX, y: offsetY });
      return;
    }

    if (tool === 'select') {
      handleCanvasClick(event);
      return;
    }

    const { offsetX, offsetY } = event.nativeEvent;
    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const finishDrawing = () => {
    contextRef.current.closePath();
    setIsDrawing(false);
    setIsDragging(false);
    setDragStart(null);
  };

  const handleDragMove = (event) => {
    if (!isDragging || selectedStroke === null || !dragStart) return;

    const { offsetX, offsetY } = event.nativeEvent;
    const dx = offsetX - dragStart.x;
    const dy = offsetY - dragStart.y;

    const newStrokes = [...strokes];
    newStrokes[selectedStroke] = {
      ...newStrokes[selectedStroke],
      x: newStrokes[selectedStroke].x + dx,
      y: newStrokes[selectedStroke].y + dy
    };
    setStrokes(newStrokes);
    setDragStart({ x: offsetX, y: offsetY });
  };

  const draw = (event) => {
    if (!canEdit) return;

    if (isDragging) {
      handleDragMove(event);
      redrawCanvas();
      return;
    }

    if (!isDrawing) return;

    const { offsetX, offsetY } = event.nativeEvent;
    const context = contextRef.current;

    if (tool === 'pen') {
      context.strokeStyle = color;
      context.lineWidth = brushSize;
      context.lineTo(offsetX, offsetY);
      context.stroke();
    } else if (tool === 'eraser') {
      context.clearRect(offsetX - eraserSize / 2, offsetY - eraserSize / 2, eraserSize, eraserSize);
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

  const handleTextAdd = (x, y) => {
    const context = contextRef.current;
    context.fillStyle = textColor;
    context.font = `${textFontSize}px ${textFont}`;
    context.fillText(textInput, x, y);
    
    const newStroke = {
      type: 'text',
      content: textInput,
      x,
      y,
      width: textInput.length * (textFontSize * 0.6),
      height: textFontSize,
      color: textColor,
      size: textFontSize,
      font: textFont,
      timestamp: new Date().toISOString(),
      drawn_by: 'user'
    };
    setStrokes([...strokes, newStroke]);
    setTextInput('');
    setTextPosition(null);
    setTextMode(false);
  };

  const handleImageInsert = async (e) => {
    if (!canEdit) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const context = contextRef.current;
        const scale = Math.min(300 / img.width, 300 / img.height);
        const width = img.width * scale;
        const height = img.height * scale;
        context.drawImage(img, 10, 10, width, height);
        
        const newStroke = {
          type: 'image',
          src: event.target.result,
          x: 10,
          y: 10,
          width,
          height,
          timestamp: new Date().toISOString(),
          drawn_by: 'user'
        };
        setStrokes([...strokes, newStroke]);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleCanvasClick = (e) => {
    if (!canEdit) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (textMode) {
      setTextPosition({ x, y });
      setTimeout(() => textInputRef.current?.focus(), 0);
    } else if (tool === 'select') {
      // Check if clicking on a stroke
      const clicked = strokes.findIndex(stroke => {
        if (stroke.type === 'text' && stroke.x && stroke.y) {
          return x >= stroke.x && x <= stroke.x + stroke.width && y >= stroke.y - stroke.size && y <= stroke.y;
        }
        return false;
      });
      setSelectedStroke(clicked >= 0 ? clicked : null);
    }
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
    <>
      <GlassCard className={cn('p-4 flex flex-col', !isFullscreen && className, isFullscreen && 'fixed inset-0 z-50 rounded-none')}>
        {/* Toolbar */}
        {canEdit && (
          <div className="mb-4 p-3 bg-white/5 rounded-lg border border-white/10 space-y-3">
            <div className="flex flex-wrap gap-2">
              {/* Tools */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => { setTool('pen'); setTextMode(false); }}
                  className={tool === 'pen' ? 'bg-purple-500' : 'bg-white/10 hover:bg-white/20'}
                  title="Draw"
                >
                  <Pen className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={() => { setTool('eraser'); setTextMode(false); }}
                  className={tool === 'eraser' ? 'bg-red-500' : 'bg-white/10 hover:bg-white/20'}
                  title="Erase"
                >
                  <Eraser className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={() => { setTool('select'); setTextMode(false); }}
                  className={tool === 'select' ? 'bg-green-500' : 'bg-white/10 hover:bg-white/20'}
                  title="Select & move"
                >
                  ➢
                </Button>
                <Button
                  size="sm"
                  onClick={() => { setTextMode(!textMode); setTool(null); }}
                  className={textMode ? 'bg-blue-500' : 'bg-white/10 hover:bg-white/20'}
                  title="Add text"
                >
                  <Type className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={() => imageInputRef.current?.click()}
                  className="bg-white/10 hover:bg-white/20"
                  title="Insert image"
                >
                  <ImageIcon className="w-4 h-4" />
                </Button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageInsert}
                  className="hidden"
                />
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

              {/* Eraser Size */}
              {tool === 'eraser' && (
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="5"
                    max="50"
                    value={eraserSize}
                    onChange={(e) => setEraserSize(parseInt(e.target.value))}
                    className="w-24"
                  />
                  <span className="text-xs text-slate-400">{eraserSize}px</span>
                </div>
              )}

              {/* Spacer */}
              <div className="flex-1" />

              {/* Save Button */}
              <Button
                size="sm"
                onClick={() => saveWhiteboardMutation.mutate()}
                variant="outline"
                className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                title="Save whiteboard"
              >
                <Save className="w-4 h-4" />
              </Button>

              {/* Fullscreen Button */}
              <Button
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
                variant="outline"
                className="border-white/30 text-slate-300 hover:text-white hover:bg-white/10"
                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </Button>

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
          onClick={handleCanvasClick}
          className={cn(
            'flex-1 bg-slate-900 rounded-lg border border-white/10 min-h-[400px]',
            canEdit && textMode ? 'cursor-text' : canEdit && tool === 'select' ? 'cursor-move' : canEdit ? 'cursor-crosshair' : 'cursor-default opacity-80'
          )}
        />

        {!canEdit && (
          <p className="text-xs text-slate-400 mt-2">
            ℹ️ Teacher has not enabled editing for you yet
          </p>
        )}
      </GlassCard>

      {/* Text Input Modal */}
      <AnimatePresence>
        {textMode && textPosition && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-40 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setTextMode(false)}
          >
            <motion.div
              className="bg-slate-950 border border-white/20 rounded-lg p-6 shadow-lg max-w-sm w-full mx-4"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            >
              <Input
                ref={textInputRef}
                autoFocus
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleTextAdd(textPosition.x, textPosition.y);
                  }
                }}
                placeholder="Type text..."
                className="bg-white/5 border-white/10 text-white mb-4"
              />

              <div className="space-y-3 mb-4">
                {/* Font Size */}
                <div>
                  <label className="text-xs text-slate-400 mb-2 block">Size: {textFontSize}px</label>
                  <input
                    type="range"
                    min="8"
                    max="48"
                    value={textFontSize}
                    onChange={(e) => setTextFontSize(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Font */}
                <div>
                  <label className="text-xs text-slate-400 mb-2 block">Font</label>
                  <select
                    value={textFont}
                    onChange={(e) => setTextFont(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-white rounded px-3 py-2 text-sm"
                  >
                    <option value="Arial">Arial</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Verdana">Verdana</option>
                  </select>
                </div>

                {/* Color */}
                <div>
                  <label className="text-xs text-slate-400 mb-2 block">Color</label>
                  <div className="flex gap-2">
                    {['#ffffff', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#000000'].map((c) => (
                      <button
                        key={c}
                        onClick={() => setTextColor(c)}
                        className={cn(
                          'w-8 h-8 rounded-full border-2 transition-all',
                          textColor === c ? 'border-white scale-110' : 'border-white/30 hover:border-white'
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleTextAdd(textPosition.x, textPosition.y)}
                  className="flex-1 bg-purple-500"
                >
                  Add
                </Button>
                <Button
                  size="sm"
                  onClick={() => setTextMode(false)}
                  variant="outline"
                  className="flex-1 border-white/20"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}