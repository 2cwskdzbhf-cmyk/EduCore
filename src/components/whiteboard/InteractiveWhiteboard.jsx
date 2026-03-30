import React, { useRef, useEffect, useState } from 'react';
import GlassCard from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import {
  Pen, Eraser, Trash2, Download, Maximize, Minimize,
  Type, Image as ImageIcon, Save, MousePointer
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';

const COLORS = ['#ffffff', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#000000'];
const FONTS = ['Arial', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana'];
const HANDLE_SIZE = 10;

export default function InteractiveWhiteboard({
  whiteboard, canEdit, onClear, isTeacher, whiteboardId, className = ''
}) {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const containerRef = useRef(null);
  const imageInputRef = useRef(null);
  const textareaRefs = useRef({});

  const [tool, setTool] = useState('pen'); // 'pen' | 'eraser' | 'text' | 'select'
  const [color, setColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(3);
  const [eraserSize, setEraserSize] = useState(15);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [strokes, setStrokes] = useState([]);
  const [textBoxes, setTextBoxes] = useState([]);

  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState([]);

  const [selectedId, setSelectedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [resizing, setResizing] = useState(null); // { id, handle, startX, startY, origW, origH, origX, origY }

  const saveWhiteboardMutation = useMutation({
    mutationFn: async () => {
      if (!whiteboardId) return;
      const allStrokes = [
        ...strokes,
        ...textBoxes.map(tb => ({ ...tb, type: 'text' }))
      ];
      await base44.entities.LiveSessionWhiteboard.update(whiteboardId, {
        strokes: allStrokes,
        drawing_data: canvasRef.current?.toDataURL('image/png')
      });
    }
  });

  // Init canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    contextRef.current = ctx;
    redrawCanvas([]);
  }, []);

  // Sync incoming whiteboard data
  useEffect(() => {
    if (!whiteboard?.strokes) return;
    const lines = whiteboard.strokes.filter(s => s.type !== 'text');
    const texts = whiteboard.strokes.filter(s => s.type === 'text').map(s => ({
      ...s,
      id: s.id || Math.random().toString(36).slice(2),
      content: s.content || '',
      width: s.width || 180,
      height: s.height || 40,
    }));
    setStrokes(lines);
    setTextBoxes(texts);
    redrawCanvas(lines);
  }, [whiteboard?.strokes]);

  // Auto-save
  useEffect(() => {
    if (!canEdit || (strokes.length === 0 && textBoxes.length === 0)) return;
    const timer = setTimeout(() => saveWhiteboardMutation.mutate(), 5000);
    return () => clearTimeout(timer);
  }, [strokes, textBoxes, canEdit]);

  // Global keydown: Delete selected textbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && editingId === null) {
        e.preventDefault();
        deleteTextBox(selectedId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, editingId]);

  const redrawCanvas = (strokeList) => {
    const ctx = contextRef.current;
    if (!ctx) return;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    (strokeList ?? strokes).forEach(stroke => {
      if (stroke.type === 'line') {
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        stroke.points.forEach((pt, i) => {
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
      } else if (stroke.type === 'image' && stroke.src) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, stroke.x, stroke.y, stroke.width, stroke.height);
        img.src = stroke.src;
      }
    });
  };

  // --- Canvas mouse events (pen/eraser) ---
  const handleMouseDown = (e) => {
    if (!canEdit || tool === 'text' || tool === 'select') return;
    const { offsetX, offsetY } = e.nativeEvent;
    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    setIsDrawing(true);
    setCurrentPath([{ x: offsetX, y: offsetY }]);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = e.nativeEvent;
    const ctx = contextRef.current;
    if (tool === 'pen') {
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.lineTo(offsetX, offsetY);
      ctx.stroke();
    } else if (tool === 'eraser') {
      ctx.clearRect(offsetX - eraserSize / 2, offsetY - eraserSize / 2, eraserSize, eraserSize);
    }
    setCurrentPath(prev => [...prev, { x: offsetX, y: offsetY }]);
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    contextRef.current.closePath();
    setIsDrawing(false);
    if (currentPath.length > 1) {
      setStrokes(prev => [...prev, { type: 'line', points: currentPath, color, width: brushSize }]);
    }
    setCurrentPath([]);
  };

  // --- Canvas click: text tool creates new textbox ---
  const handleCanvasClick = (e) => {
    if (!canEdit || tool !== 'text') return;
    // Stop propagation from textbox clicks reaching canvas
    if (e.target !== canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const id = Math.random().toString(36).slice(2);
    const newBox = {
      id, type: 'text', content: '', x, y,
      color: '#ffffff', size: 18, font: 'Arial',
      width: 180, height: 40,
    };
    setTextBoxes(prev => [...prev, newBox]);
    setSelectedId(id);
    setEditingId(id);
    // Focus the textarea after render
    setTimeout(() => textareaRefs.current[id]?.focus(), 30);
  };

  // --- Deselect when clicking bare canvas in select mode ---
  const handleCanvasMouseDown = (e) => {
    if (tool === 'select' && e.target === canvasRef.current) {
      setSelectedId(null);
      setEditingId(null);
    }
    handleMouseDown(e);
  };

  // --- TextBox interactions ---
  const handleTextBoxMouseDown = (e, id) => {
    e.stopPropagation();
    setSelectedId(id);
    if (tool === 'select' && editingId !== id) {
      const tb = textBoxes.find(t => t.id === id);
      setDragging({ id, startX: e.clientX, startY: e.clientY, origX: tb.x, origY: tb.y });
    }
  };

  const handleTextBoxDoubleClick = (e, id) => {
    e.stopPropagation();
    setEditingId(id);
    setTimeout(() => textareaRefs.current[id]?.focus(), 10);
  };

  const handleTextBoxBlur = (id) => {
    setTextBoxes(prev => prev.filter(tb => tb.id !== id || (tb.content || '').trim() !== ''));
    if (editingId === id) setEditingId(null);
  };

  const handleTextChange = (id, value) => {
    setTextBoxes(prev => prev.map(tb => tb.id === id ? { ...tb, content: value } : tb));
  };

  const handleTextKeyDown = (e, id) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      textareaRefs.current[id]?.blur();
    }
    e.stopPropagation();
  };

  const deleteTextBox = (id) => {
    setTextBoxes(prev => prev.filter(tb => tb.id !== id));
    setSelectedId(null);
    setEditingId(null);
  };

  const updateTextBoxStyle = (id, key, value) => {
    setTextBoxes(prev => prev.map(tb => tb.id === id ? { ...tb, [key]: value } : tb));
  };

  // --- Drag to move textboxes ---
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const dx = e.clientX - dragging.startX;
      const dy = e.clientY - dragging.startY;
      setTextBoxes(prev => prev.map(tb =>
        tb.id === dragging.id ? { ...tb, x: dragging.origX + dx, y: dragging.origY + dy } : tb
      ));
    };
    const onUp = () => setDragging(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragging]);

  // --- Resize handles ---
  const handleResizeMouseDown = (e, id, handle) => {
    e.stopPropagation();
    e.preventDefault();
    const tb = textBoxes.find(t => t.id === id);
    setResizing({ id, handle, startX: e.clientX, startY: e.clientY, origW: tb.width, origH: tb.height, origX: tb.x, origY: tb.y });
  };

  useEffect(() => {
    if (!resizing) return;
    const onMove = (e) => {
      const dx = e.clientX - resizing.startX;
      const dy = e.clientY - resizing.startY;
      setTextBoxes(prev => prev.map(tb => {
        if (tb.id !== resizing.id) return tb;
        let newW = resizing.origW;
        let newH = resizing.origH;
        let newX = resizing.origX;
        let newY = resizing.origY;
        if (resizing.handle === 'se') {
          newW = Math.max(60, resizing.origW + dx);
          newH = Math.max(30, resizing.origH + dy);
        } else if (resizing.handle === 'sw') {
          newW = Math.max(60, resizing.origW - dx);
          newX = resizing.origX + dx;
          newH = Math.max(30, resizing.origH + dy);
        } else if (resizing.handle === 'ne') {
          newW = Math.max(60, resizing.origW + dx);
          newH = Math.max(30, resizing.origH - dy);
          newY = resizing.origY + dy;
        } else if (resizing.handle === 'nw') {
          newW = Math.max(60, resizing.origW - dx);
          newX = resizing.origX + dx;
          newH = Math.max(30, resizing.origH - dy);
          newY = resizing.origY + dy;
        } else if (resizing.handle === 'e') {
          newW = Math.max(60, resizing.origW + dx);
        } else if (resizing.handle === 'w') {
          newW = Math.max(60, resizing.origW - dx);
          newX = resizing.origX + dx;
        } else if (resizing.handle === 's') {
          newH = Math.max(30, resizing.origH + dy);
        }
        return { ...tb, width: newW, height: newH, x: newX, y: newY };
      }));
    };
    const onUp = () => setResizing(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [resizing]);

  // --- Image insert ---
  const handleImageInsert = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(300 / img.width, 300 / img.height);
        const width = img.width * scale;
        const height = img.height * scale;
        contextRef.current.drawImage(img, 10, 10, width, height);
        setStrokes(prev => [...prev, { type: 'image', src: ev.target.result, x: 10, y: 10, width, height }]);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleClear = () => {
    if (!canEdit) return;
    const ctx = contextRef.current;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    setStrokes([]);
    setTextBoxes([]);
    setSelectedId(null);
    setEditingId(null);
    onClear?.();
  };

  const downloadCanvas = () => {
    const url = canvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = 'whiteboard.png';
    link.click();
  };

  const selectedBox = textBoxes.find(tb => tb.id === selectedId);
  const isSelected = (id) => selectedId === id;
  const isEditing = (id) => editingId === id;

  return (
    <GlassCard className={cn('p-4 flex flex-col', !isFullscreen && className, isFullscreen && 'fixed inset-0 z-50 rounded-none')}>
      {canEdit && (
        <div className="mb-4 p-3 bg-white/5 rounded-lg border border-white/10 flex flex-wrap gap-2 items-center">
          {/* Tool buttons */}
          <div className="flex gap-2">
            {[
              { id: 'pen', Icon: Pen, label: 'Draw', active: 'bg-purple-500' },
              { id: 'eraser', Icon: Eraser, label: 'Erase', active: 'bg-red-500' },
              { id: 'text', Icon: Type, label: 'Text', active: 'bg-blue-500' },
              { id: 'select', Icon: MousePointer, label: 'Select / Move', active: 'bg-green-500' },
            ].map(({ id, Icon, label, active }) => (
              <Button key={id} size="sm" title={label} onClick={() => { setTool(id); setEditingId(null); }}
                className={tool === id ? active : 'bg-white/10 hover:bg-white/20'}>
                <Icon className="w-4 h-4" />
              </Button>
            ))}
            <Button size="sm" onClick={() => imageInputRef.current?.click()}
              className="bg-white/10 hover:bg-white/20" title="Insert image">
              <ImageIcon className="w-4 h-4" />
            </Button>
            <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageInsert} className="hidden" />
          </div>

          {/* Pen options */}
          {tool === 'pen' && (
            <>
              <div className="flex gap-1">
                {['#ffffff', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7'].map(c => (
                  <button key={c} onClick={() => setColor(c)}
                    className={cn('w-7 h-7 rounded-full border-2 transition-all', color === c ? 'border-white scale-110' : 'border-white/30')}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input type="range" min="1" max="20" value={brushSize} onChange={e => setBrushSize(+e.target.value)} className="w-20" />
                <span className="text-xs text-slate-400">{brushSize}px</span>
              </div>
            </>
          )}

          {/* Eraser options */}
          {tool === 'eraser' && (
            <div className="flex items-center gap-2">
              <input type="range" min="5" max="50" value={eraserSize} onChange={e => setEraserSize(+e.target.value)} className="w-20" />
              <span className="text-xs text-slate-400">{eraserSize}px</span>
            </div>
          )}

          {/* Text hint */}
          {tool === 'text' && !selectedBox && (
            <span className="text-xs text-slate-400 italic">Click the canvas to place a textbox</span>
          )}

          {/* Text style panel for selected box */}
          {selectedBox && (
            <div className="flex flex-wrap items-center gap-2 ml-2 pl-2 border-l border-white/20">
              <div className="flex gap-1">
                {COLORS.map(c => (
                  <button key={c} onClick={() => updateTextBoxStyle(selectedBox.id, 'color', c)}
                    className={cn('w-6 h-6 rounded-full border-2 transition-all', selectedBox.color === c ? 'border-white scale-110' : 'border-white/30')}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-400">Size</span>
                <input type="range" min="10" max="64" value={selectedBox.size}
                  onChange={e => updateTextBoxStyle(selectedBox.id, 'size', +e.target.value)} className="w-20" />
                <span className="text-xs text-slate-300">{selectedBox.size}px</span>
              </div>
              <select value={selectedBox.font} onChange={e => updateTextBoxStyle(selectedBox.id, 'font', e.target.value)}
                className="bg-white/10 border border-white/20 text-white text-xs rounded px-2 py-1">
                {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <Button size="sm" onClick={() => deleteTextBox(selectedBox.id)}
                className="bg-red-500/20 hover:bg-red-500/40 text-red-400 text-xs h-7 px-2">
                Delete
              </Button>
            </div>
          )}

          <div className="flex-1" />
          <Button size="sm" onClick={() => saveWhiteboardMutation.mutate()} variant="outline"
            className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"><Save className="w-4 h-4" /></Button>
          <Button size="sm" onClick={() => setIsFullscreen(f => !f)} variant="outline"
            className="border-white/30 text-slate-300 hover:bg-white/10">
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </Button>
          <Button size="sm" onClick={handleClear} variant="outline"
            className="border-red-500/30 text-red-400 hover:bg-red-500/10"><Trash2 className="w-4 h-4" /></Button>
          <Button size="sm" onClick={downloadCanvas} variant="outline"
            className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"><Download className="w-4 h-4" /></Button>
        </div>
      )}

      {/* Canvas + text overlay container */}
      <div ref={containerRef} className="relative flex-1 min-h-[400px]">
        <canvas
          ref={canvasRef}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleCanvasClick}
          className={cn(
            'absolute inset-0 w-full h-full bg-slate-900 rounded-lg border border-white/10',
            !canEdit && 'opacity-80',
            canEdit && tool === 'text' ? 'cursor-text'
              : canEdit && tool === 'select' ? 'cursor-default'
              : canEdit ? 'cursor-crosshair' : 'cursor-default'
          )}
        />

        {/* Text box overlays */}
        {textBoxes.map(tb => {
          const editing = isEditing(tb.id);
          const selected = isSelected(tb.id);

          return (
            <div
              key={tb.id}
              onMouseDown={e => handleTextBoxMouseDown(e, tb.id)}
              onDoubleClick={e => handleTextBoxDoubleClick(e, tb.id)}
              style={{
                position: 'absolute',
                left: tb.x,
                top: tb.y,
                width: tb.width,
                height: tb.height,
                boxSizing: 'border-box',
                cursor: tool === 'select' && !editing ? 'move' : 'text',
                // Only show outline while actively editing
                outline: editing ? '2px solid #a78bfa' : 'none',
                borderRadius: 4,
              }}
            >
              <textarea
                ref={el => { if (el) textareaRefs.current[tb.id] = el; else delete textareaRefs.current[tb.id]; }}
                value={tb.content || ''}
                onChange={e => handleTextChange(tb.id, e.target.value)}
                onBlur={() => handleTextBoxBlur(tb.id)}
                onKeyDown={e => handleTextKeyDown(e, tb.id)}
                onClick={e => { e.stopPropagation(); setSelectedId(tb.id); if (tool === 'text') { setEditingId(tb.id); } }}
                onFocus={() => { setSelectedId(tb.id); setEditingId(tb.id); }}
                placeholder={editing ? 'Type here…' : ''}
                readOnly={!editing && tool !== 'text'}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  width: '100%',
                  height: '100%',
                  color: tb.color || '#ffffff',
                  fontSize: (tb.size || 18) + 'px',
                  fontFamily: tb.font || 'Arial',
                  lineHeight: 1.4,
                  padding: '4px 6px',
                  cursor: 'inherit',
                  pointerEvents: (tool === 'text' || tool === 'select') ? 'auto' : 'none',
                  userSelect: editing ? 'text' : 'none',
                  boxSizing: 'border-box',
                }}
              />

              {/* Resize handles (shown when selected in select mode) */}
              {selected && tool === 'select' && !editing && (
                <>
                  {/* Selection border */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    border: '1px dashed rgba(167,139,250,0.6)',
                    borderRadius: 4, pointerEvents: 'none'
                  }} />
                  {[
                    { handle: 'nw', style: { top: -5, left: -5, cursor: 'nw-resize' } },
                    { handle: 'ne', style: { top: -5, right: -5, cursor: 'ne-resize' } },
                    { handle: 'sw', style: { bottom: -5, left: -5, cursor: 'sw-resize' } },
                    { handle: 'se', style: { bottom: -5, right: -5, cursor: 'se-resize' } },
                    { handle: 'n', style: { top: -5, left: '50%', transform: 'translateX(-50%)', cursor: 'n-resize' } },
                    { handle: 's', style: { bottom: -5, left: '50%', transform: 'translateX(-50%)', cursor: 's-resize' } },
                    { handle: 'e', style: { right: -5, top: '50%', transform: 'translateY(-50%)', cursor: 'e-resize' } },
                    { handle: 'w', style: { left: -5, top: '50%', transform: 'translateY(-50%)', cursor: 'w-resize' } },
                  ].map(({ handle, style }) => (
                    <div key={handle}
                      onMouseDown={e => { e.stopPropagation(); handleResizeMouseDown(e, tb.id, handle); }}
                      style={{
                        position: 'absolute',
                        width: HANDLE_SIZE, height: HANDLE_SIZE,
                        background: '#a78bfa',
                        borderRadius: 2,
                        ...style,
                        zIndex: 10,
                      }}
                    />
                  ))}
                </>
              )}
            </div>
          );
        })}
      </div>

      {!canEdit && (
        <p className="text-xs text-slate-400 mt-2">ℹ️ Teacher has not enabled editing for you yet</p>
      )}
    </GlassCard>
  );
}