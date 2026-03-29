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
  const [resizeHandle, setResizeHandle] = useState(null);
  const [textFontSize, setTextFontSize] = useState(16);
  const [textColor, setTextColor] = useState('#ffffff');
  const [textFont, setTextFont] = useState('Arial');
  const [editingTextIdx, setEditingTextIdx] = useState(null);
  const [inlineTextValue, setInlineTextValue] = useState('');
  const inlineInputRef = useRef(null);
  const [inputPosition, setInputPosition] = useState(null);
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [dragSelectStart, setDragSelectStart] = useState(null);
  const [activeGuides, setActiveGuides] = useState({ vertical: null, horizontal: null });
  const [lastClickTime, setLastClickTime] = useState(null);
  const [lastClickIdx, setLastClickIdx] = useState(null);

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

    // Draw alignment guides
    if (activeGuides.vertical !== null) {
      context.strokeStyle = 'rgba(251, 191, 36, 0.6)';
      context.lineWidth = 2;
      context.setLineDash([5, 5]);
      context.beginPath();
      context.moveTo(activeGuides.vertical, 0);
      context.lineTo(activeGuides.vertical, context.canvas.height);
      context.stroke();
      context.setLineDash([]);
    }
    
    if (activeGuides.horizontal !== null) {
      context.strokeStyle = 'rgba(251, 191, 36, 0.6)';
      context.lineWidth = 2;
      context.setLineDash([5, 5]);
      context.beginPath();
      context.moveTo(0, activeGuides.horizontal);
      context.lineTo(context.canvas.width, activeGuides.horizontal);
      context.stroke();
      context.setLineDash([]);
    }

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
        
        if (selectedIndices.includes(idx)) {
          context.strokeStyle = '#fbbf24';
          context.lineWidth = 2;
          context.strokeRect(stroke.x - 5, stroke.y - stroke.size - 5, stroke.width, stroke.height + 5);
          
          // Draw resize handle only if single selection
          if (selectedIndices.length === 1) {
            const handleX = stroke.x + stroke.width - 5;
            const handleY = stroke.y + stroke.height;
            context.fillStyle = '#fbbf24';
            context.fillRect(handleX, handleY, 10, 10);
          }
        }
      } else if (stroke.type === 'image' && stroke.src) {
        const img = new Image();
        img.src = stroke.src;
        img.onload = () => {
          context.drawImage(img, stroke.x, stroke.y, stroke.width, stroke.height);
          if (selectedIndices.includes(idx)) {
            context.strokeStyle = '#fbbf24';
            context.lineWidth = 2;
            context.strokeRect(stroke.x, stroke.y, stroke.width, stroke.height);
            
            // Draw resize handle only if single selection
            if (selectedIndices.length === 1) {
              context.fillStyle = '#fbbf24';
              context.fillRect(stroke.x + stroke.width - 5, stroke.y + stroke.height - 5, 10, 10);
            }
          }
        };
      }
    });
  };

  const startDrawing = (event) => {
    if (!canEdit) return;

    const { offsetX, offsetY } = event.nativeEvent;
    const isShiftClick = event.shiftKey;

    if (tool === 'select') {
      // Check if clicking on a resize handle
      if (selectedIndices.length > 0) {
        const firstSelected = strokes[selectedIndices[0]];
        if (selectedIndices.length === 1 && (firstSelected.type === 'image' || firstSelected.type === 'text')) {
          const handleX = firstSelected.x + firstSelected.width;
          const handleY = firstSelected.y + firstSelected.height;
          if (Math.abs(offsetX - handleX) < 10 && Math.abs(offsetY - handleY) < 10) {
            setResizeHandle('br');
            setIsDragging(true);
            setDragStart({ x: offsetX, y: offsetY });
            return;
          }
        }
      }

      // Check if clicking on an object
      let clickedIdx = -1;
      for (let i = strokes.length - 1; i >= 0; i--) {
        const stroke = strokes[i];
        const padding = 8;
        if (stroke.type === 'text') {
          if (offsetX >= stroke.x - padding && offsetX <= stroke.x + stroke.width + padding && 
              offsetY >= stroke.y - stroke.size - padding && offsetY <= stroke.y + padding) {
            clickedIdx = i;
            break;
          }
        } else if (stroke.type === 'image') {
          if (offsetX >= stroke.x - padding && offsetX <= stroke.x + stroke.width + padding && 
              offsetY >= stroke.y - padding && offsetY <= stroke.y + stroke.height + padding) {
            clickedIdx = i;
            break;
          }
        }
      }

      if (clickedIdx >= 0) {
        // Check for double-click to edit text
        if (strokes[clickedIdx].type === 'text' && Date.now() - (lastClickTime || 0) < 300 && lastClickIdx === clickedIdx) {
          setEditingTextIdx(clickedIdx);
          setInlineTextValue(strokes[clickedIdx].content);
          const rect = canvasRef.current.getBoundingClientRect();
          setInputPosition({ 
            x: strokes[clickedIdx].x, 
            y: strokes[clickedIdx].y, 
            canvasX: rect.left, 
            canvasY: rect.top, 
            idx: clickedIdx 
          });
          setTimeout(() => inlineInputRef.current?.focus(), 0);
          setLastClickTime(Date.now());
          setLastClickIdx(clickedIdx);
          return;
        }
        
        if (isShiftClick) {
          // Toggle selection with shift
          if (selectedIndices.includes(clickedIdx)) {
            setSelectedIndices(selectedIndices.filter(i => i !== clickedIdx));
          } else {
            setSelectedIndices([...selectedIndices, clickedIdx]);
          }
        } else if (!selectedIndices.includes(clickedIdx)) {
          setSelectedIndices([clickedIdx]);
        }
        
        // Start dragging selected objects
        setIsDragging(true);
        setDragStart({ x: offsetX, y: offsetY });
        setLastClickTime(Date.now());
        setLastClickIdx(clickedIdx);
      } else {
        // Click on empty space - start drag selection
        if (!isShiftClick) setSelectedIndices([]);
        setDragSelectStart({ x: offsetX, y: offsetY });
        setLastClickIdx(null);
      }
      return;
    }

    // Text tool - create new textbox at click position
    if (textMode) {
      const newStroke = {
        type: 'text',
        content: '',
        x: offsetX,
        y: offsetY,
        width: 150,
        height: textFontSize,
        color: textColor,
        size: textFontSize,
        font: textFont,
        rotation: 0,
        timestamp: new Date().toISOString(),
        drawn_by: 'user'
      };
      const newIdx = strokes.length;
      const newStrokes = [...strokes, newStroke];
      setStrokes(newStrokes);
      setEditingTextIdx(newIdx);
      setInlineTextValue('');
      const rect = canvasRef.current?.getBoundingClientRect();
      setInputPosition({ 
        x: offsetX, 
        y: offsetY, 
        canvasX: rect?.left || 0, 
        canvasY: rect?.top || 0, 
        idx: newIdx 
      });
      // Ensure focus with proper timing
      setTimeout(() => {
        if (inlineInputRef.current) {
          inlineInputRef.current.focus();
          inlineInputRef.current.select();
        }
      }, 0);
      return;
    }

    const { offsetX: ox, offsetY: oy } = event.nativeEvent;
    contextRef.current.beginPath();
    contextRef.current.moveTo(ox, oy);
    setIsDrawing(true);
  };

  const finishDrawing = () => {
    if (isDrawing) contextRef.current.closePath();
    setIsDrawing(false);
    setIsDragging(false);
    setDragStart(null);
    setResizeHandle(null);
    setActiveGuides({ vertical: null, horizontal: null });
    
    // Finish drag selection
    if (dragSelectStart) {
      const rect = canvasRef.current.getBoundingClientRect();
      const endX = event?.nativeEvent?.offsetX;
      const endY = event?.nativeEvent?.offsetY;
      
      if (endX && endY) {
        const minX = Math.min(dragSelectStart.x, endX);
        const maxX = Math.max(dragSelectStart.x, endX);
        const minY = Math.min(dragSelectStart.y, endY);
        const maxY = Math.max(dragSelectStart.y, endY);
        
        const newly = [];
        strokes.forEach((stroke, i) => {
          if (stroke.type === 'text') {
            if (stroke.x >= minX && stroke.x + stroke.width <= maxX && 
                stroke.y >= minY && stroke.y - stroke.size <= maxY) {
              newly.push(i);
            }
          } else if (stroke.type === 'image') {
            if (stroke.x >= minX && stroke.x + stroke.width <= maxX && 
                stroke.y >= minY && stroke.y + stroke.height <= maxY) {
              newly.push(i);
            }
          }
        });
        setSelectedIndices(newly);
      }
      setDragSelectStart(null);
    }
  };

  const getSnapPoints = (stroke) => {
    return {
      left: stroke.x,
      right: stroke.x + stroke.width,
      centerX: stroke.x + stroke.width / 2,
      top: stroke.y - (stroke.type === 'text' ? stroke.size : 0),
      bottom: stroke.y + (stroke.type === 'text' ? 0 : stroke.height),
      centerY: stroke.y + (stroke.type === 'text' ? -stroke.size / 2 : stroke.height / 2)
    };
  };

  const checkSnapping = (movedStrokes, snapThreshold = 8) => {
    const guides = { vertical: null, horizontal: null };
    const movedIndices = new Set(selectedIndices);
    
    // Get canvas center
    const canvasCenter = canvasRef.current?.width / 2 || 400;
    
    selectedIndices.forEach(idx => {
      const stroke = movedStrokes[idx];
      const moved = getSnapPoints(stroke);
      let snappedVertically = false;
      let snappedHorizontally = false;
      
      // Check against canvas center (lower priority)
      if (!snappedVertically && Math.abs(moved.centerX - canvasCenter) < snapThreshold) {
        guides.vertical = canvasCenter;
        stroke.x = canvasCenter - stroke.width / 2;
        snappedVertically = true;
      }
      
      // Check against other objects (higher priority)
      strokes.forEach((otherStroke, oIdx) => {
        if (movedIndices.has(oIdx)) return;
        
        const other = getSnapPoints(otherStroke);
        
        // Vertical alignment - prioritize left edge snap
        if (!snappedVertically) {
          if (Math.abs(moved.left - other.left) < snapThreshold) {
            guides.vertical = other.left;
            stroke.x = other.left;
            snappedVertically = true;
          } else if (Math.abs(moved.right - other.right) < snapThreshold) {
            guides.vertical = other.right;
            stroke.x = other.right - stroke.width;
            snappedVertically = true;
          } else if (Math.abs(moved.centerX - other.centerX) < snapThreshold) {
            guides.vertical = other.centerX;
            stroke.x = other.centerX - stroke.width / 2;
            snappedVertically = true;
          }
        }
        
        // Horizontal alignment
        if (!snappedHorizontally) {
          if (Math.abs(moved.top - other.top) < snapThreshold) {
            guides.horizontal = other.top;
            stroke.y = other.top + (stroke.type === 'text' ? stroke.size : 0);
            snappedHorizontally = true;
          } else if (Math.abs(moved.bottom - other.bottom) < snapThreshold) {
            guides.horizontal = other.bottom;
            stroke.y = other.bottom - (stroke.type === 'text' ? 0 : stroke.height);
            snappedHorizontally = true;
          } else if (Math.abs(moved.centerY - other.centerY) < snapThreshold) {
            guides.horizontal = other.centerY;
            stroke.y = other.centerY + (stroke.type === 'text' ? stroke.size / 2 : stroke.height / 2);
            snappedHorizontally = true;
          }
        }
      });
    });
    
    return guides;
  };

  const handleDragMove = (event) => {
    if (!isDragging || !dragStart) return;

    const { offsetX, offsetY } = event.nativeEvent;
    const dx = offsetX - dragStart.x;
    const dy = offsetY - dragStart.y;

    const newStrokes = [...strokes];

    if (resizeHandle && selectedIndices.length === 1) {
      const stroke = newStrokes[selectedIndices[0]];
      if (resizeHandle === 'br' && (stroke.type === 'image' || stroke.type === 'text')) {
        stroke.width = Math.max(30, stroke.width + dx);
        stroke.height = Math.max(20, stroke.height + dy);
      }
    } else {
      // Move all selected objects
      selectedIndices.forEach(idx => {
        newStrokes[idx].x += dx;
        newStrokes[idx].y += dy;
      });
      
      // Check for snapping
      const guides = checkSnapping(newStrokes);
      setActiveGuides(guides);
    }

    setStrokes(newStrokes);
    setDragStart({ x: offsetX, y: offsetY });
  };

  const draw = (event) => {
    if (!canEdit) return;

    const { offsetX, offsetY } = event.nativeEvent;

    if (isDragging) {
      handleDragMove(event);
      redrawCanvas();
      return;
    }

    if (dragSelectStart) {
      // Drag selection box
      redrawCanvas();
      return;
    }

    if (!isDrawing) return;

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
      // Start inline text editing directly on canvas
      setTextPosition(null);
      setInputPosition({ x, y, canvasX: rect.left, canvasY: rect.top });
      setInlineTextValue('');
      setEditingTextIdx(null);
      setTimeout(() => inlineInputRef.current?.focus(), 0);
    } else if (tool === 'select') {
      // Check if clicking on a text or image with more forgiving hit area
      let found = false;
      for (let i = strokes.length - 1; i >= 0; i--) {
        const stroke = strokes[i];
        if (stroke.type === 'text') {
          const padding = 8;
          if (x >= stroke.x - padding && x <= stroke.x + stroke.width + padding && 
              y >= stroke.y - stroke.size - padding && y <= stroke.y + padding) {
            setSelectedStroke(i);
            setEditingTextIdx(null);
            found = true;
            break;
          }
        } else if (stroke.type === 'image') {
          const padding = 5;
          if (x >= stroke.x - padding && x <= stroke.x + stroke.width + padding && 
              y >= stroke.y - padding && y <= stroke.y + stroke.height + padding) {
            setSelectedStroke(i);
            setEditingTextIdx(null);
            found = true;
            break;
          }
        }
      }
      if (!found) setSelectedStroke(null);
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

      {/* Inline Text Input on Canvas */}
      {inputPosition !== null && (
        <div
          className="fixed z-50"
          style={{
            left: (inputPosition.canvasX + inputPosition.x) + 'px',
            top: (inputPosition.canvasY + inputPosition.y) + 'px',
            pointerEvents: 'auto'
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.stopPropagation()}
        >
          <div className="bg-slate-950 border-2 border-purple-500/50 rounded p-2 shadow-xl shadow-purple-500/20 space-y-2">
            <input
              ref={inlineInputRef}
              autoFocus
              autoComplete="off"
              spellCheck="false"
              type="text"
              value={textInput}
              onChange={(e) => {
                const newText = e.target.value;
                setTextInput(newText);
                // Update stroke immediately as user types
                if (inputPosition?.idx !== undefined) {
                  const newStrokes = [...strokes];
                  newStrokes[inputPosition.idx].content = newText;
                  newStrokes[inputPosition.idx].width = Math.max(150, newText.length * (textFontSize * 0.6));
                  setStrokes(newStrokes);
                }
              }}
              onBlur={() => {
                if (inputPosition?.idx !== undefined) {
                  const newStrokes = [...strokes];
                  newStrokes[inputPosition.idx].content = textInput;
                  setStrokes(newStrokes);
                }
                setInputPosition(null);
                setEditingTextIdx(null);
              }}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') {
                  if (inputPosition?.idx !== undefined) {
                    const newStrokes = [...strokes];
                    newStrokes[inputPosition.idx].content = textInput;
                    setStrokes(newStrokes);
                  }
                  setInputPosition(null);
                  setEditingTextIdx(null);
                }
                if (e.key === 'Escape') {
                  setInputPosition(null);
                  setEditingTextIdx(null);
                }
              }}
              placeholder="Type text..."
              className="w-full bg-white/5 border border-white/10 text-white rounded px-2 py-1 text-sm outline-none focus:border-purple-400/50 focus:ring-1 focus:ring-purple-400/30"
              style={{ fontSize: textFontSize + 'px', fontFamily: textFont, color: textColor, width: Math.max(150, textInput.length * (textFontSize * 0.6)) + 'px' }}
            />

            {/* Font Size */}
            <div className="text-xs">
              <label className="text-slate-400 block mb-1">Size: {textFontSize}px</label>
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
            <div className="text-xs">
              <label className="text-slate-400 block mb-1">Font</label>
              <select
                value={textFont}
                onChange={(e) => setTextFont(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white rounded px-2 py-1 text-xs"
              >
                <option value="Arial" style={{ fontFamily: 'Arial' }}>Arial</option>
                <option value="Georgia" style={{ fontFamily: 'Georgia' }}>Georgia</option>
                <option value="Times New Roman" style={{ fontFamily: 'Times New Roman' }}>Times New Roman</option>
                <option value="Courier New" style={{ fontFamily: 'Courier New' }}>Courier New</option>
                <option value="Verdana" style={{ fontFamily: 'Verdana' }}>Verdana</option>
              </select>
            </div>

            {/* Color */}
            <div className="text-xs">
              <label className="text-slate-400 block mb-1">Color</label>
              <div className="flex gap-1 flex-wrap">
                {['#ffffff', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#000000'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setTextColor(c)}
                    className={cn(
                      'w-5 h-5 rounded-full border-2 transition-all',
                      textColor === c ? 'border-white scale-110' : 'border-white/30'
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Text Edit for Selected Text */}
      {editingTextIdx !== null && selectedStroke === editingTextIdx && tool === 'select' && (
        <motion.div
          className="fixed z-40 bg-slate-950 border border-white/20 rounded-lg p-4 shadow-lg"
          style={{
            left: strokes[editingTextIdx].x + 'px',
            top: (strokes[editingTextIdx].y - 60) + 'px'
          }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
        >
          <div className="w-48 space-y-2">
            <input
              ref={inlineInputRef}
              autoFocus
              type="text"
              value={inlineTextValue}
              onChange={(e) => setInlineTextValue(e.target.value)}
              onBlur={() => {
                const newStrokes = [...strokes];
                newStrokes[editingTextIdx].content = inlineTextValue;
                setStrokes(newStrokes);
                setEditingTextIdx(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') {
                  const newStrokes = [...strokes];
                  newStrokes[editingTextIdx].content = inlineTextValue;
                  setStrokes(newStrokes);
                  setEditingTextIdx(null);
                }
              }}
              className="w-full bg-white/5 border border-white/10 text-white rounded px-2 py-1 text-sm"
            />

            {/* Font Size */}
            <div className="text-xs">
              <label className="text-slate-400 block mb-1">Size: {strokes[editingTextIdx]?.size || 16}px</label>
              <input
                type="range"
                min="8"
                max="48"
                value={strokes[editingTextIdx]?.size || 16}
                onChange={(e) => {
                  const newStrokes = [...strokes];
                  newStrokes[editingTextIdx].size = parseInt(e.target.value);
                  setStrokes(newStrokes);
                }}
                className="w-full"
              />
            </div>

            {/* Font */}
            <div className="text-xs">
              <label className="text-slate-400 block mb-1">Font</label>
              <select
                value={strokes[editingTextIdx]?.font || 'Arial'}
                onChange={(e) => {
                  const newStrokes = [...strokes];
                  newStrokes[editingTextIdx].font = e.target.value;
                  setStrokes(newStrokes);
                }}
                className="w-full bg-white/5 border border-white/10 text-white rounded px-2 py-1 text-xs"
              >
                <option value="Arial" style={{ fontFamily: 'Arial' }}>Arial</option>
                <option value="Georgia" style={{ fontFamily: 'Georgia' }}>Georgia</option>
                <option value="Times New Roman" style={{ fontFamily: 'Times New Roman' }}>Times New Roman</option>
                <option value="Courier New" style={{ fontFamily: 'Courier New' }}>Courier New</option>
                <option value="Verdana" style={{ fontFamily: 'Verdana' }}>Verdana</option>
              </select>
            </div>

            {/* Color */}
            <div className="text-xs">
              <label className="text-slate-400 block mb-1">Color</label>
              <div className="flex gap-1">
                {['#ffffff', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#000000'].map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      const newStrokes = [...strokes];
                      newStrokes[editingTextIdx].color = c;
                      setStrokes(newStrokes);
                    }}
                    className={cn(
                      'w-6 h-6 rounded-full border-2 transition-all',
                      (strokes[editingTextIdx]?.color || '#ffffff') === c ? 'border-white scale-110' : 'border-white/30'
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
}