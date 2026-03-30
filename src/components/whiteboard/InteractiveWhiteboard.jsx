import React, { useRef, useEffect, useState, useCallback } from 'react';
import GlassCard from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import {
  Pen,
  Eraser,
  Trash2,
  Download,
  Maximize,
  Minimize,
  Type,
  Image as ImageIcon,
  Save,
  MousePointer
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';

const COLORS = ['#ffffff', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#000000'];
const FONTS = ['Arial', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana'];

export default function InteractiveWhiteboard({
  whiteboard,
  canEdit,
  onStrokeAdded,
  onClear,
  isTeacher,
  whiteboardId,
  className = ''
}) {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const containerRef = useRef(null);
  const imageInputRef = useRef(null);

  const [tool, setTool] = useState('pen'); // 'pen' | 'eraser' | 'text' | 'select'
  const [color, setColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(3);
  const [eraserSize, setEraserSize] = useState(15);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // strokes: line strokes drawn on canvas
  const [strokes, setStrokes] = useState(whiteboard?.strokes || []);
  // textBoxes: positioned text objects rendered as DOM overlays
  const [textBoxes, setTextBoxes] = useState(
    (whiteboard?.strokes || []).filter(s => s.type === 'text').map(s => ({
      ...s,
      id: s.id || Math.random().toString(36).slice(2)
    }))
  );

  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState([]);

  const [selectedId, setSelectedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [dragging, setDragging] = useState(null); // { id, startX, startY, origX, origY }

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
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    contextRef.current = ctx;
    redrawCanvas(strokes);
  }, []);

  // Sync incoming whiteboard data
  useEffect(() => {
    if (!whiteboard?.strokes) return;
    const lines = whiteboard.strokes.filter(s => s.type !== 'text');
    const texts = whiteboard.strokes.filter(s => s.type === 'text').map(s => ({
      ...s,
      id: s.id || Math.random().toString(36).slice(2)
    }));
    setStrokes(lines);
    setTextBoxes(texts);
    redrawCanvas(lines);
  }, [whiteboard?.strokes]);

  // Auto-save
  useEffect(() => {
    if (!canEdit) return;
    const timer = setTimeout(() => saveWhiteboardMutation.mutate(), 5000);
    return () => clearTimeout(timer);
  }, [strokes, textBoxes, canEdit]);

  const redrawCanvas = (strokeList) => {
    const ctx = contextRef.current;
    if (!ctx) return;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    (strokeList || strokes).forEach(stroke => {
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

  // ---- Canvas mouse events (pen / eraser only) ----
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
      const newStroke = { type: 'line', points: currentPath, color, width: brushSize };
      setStrokes(prev => [...prev, newStroke]);
    }
    setCurrentPath([]);
  };

  // ---- Canvas click: text tool creates new textbox ----
  const handleCanvasClick = (e) => {
    if (!canEdit || tool !== 'text') return;
    // Commit any currently editing textbox first
    setEditingId(null);

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const id = Math.random().toString(36).slice(2);
    const newBox = {
      id,
      type: 'text',
      content: '',
      x,
      y,
      color: '#ffffff',
      size: 18,
      font: 'Arial',
      width: 200,
    };
    setTextBoxes(prev => [...prev, newBox]);
    setSelectedId(id);
    setEditingId(id);
  };

  // ---- TextBox interactions ----
  const handleTextBoxClick = (e, id) => {
    e.stopPropagation();
    if (tool === 'select' || tool === 'text') {
      setSelectedId(id);
      setEditingId(id);
    }
  };

  const handleTextBoxBlur = (id) => {
    // Remove empty textboxes on blur
    setTextBoxes(prev => prev.filter(tb => tb.id !== id || tb.content.trim() !== ''));
    if (editingId === id) setEditingId(null);
  };

  const handleTextChange = (id, value) => {
    setTextBoxes(prev => prev.map(tb => tb.id === id ? { ...tb, content: value } : tb));
  };

  const deleteTextBox = (id) => {
    setTextBoxes(prev => prev.filter(tb => tb.id !== id));
    setSelectedId(null);
    setEditingId(null);
  };

  const updateTextBoxStyle = (id, key, value) => {
    setTextBoxes(prev => prev.map(tb => tb.id === id ? { ...tb, [key]: value } : tb));
  };

  // ---- Drag to move textboxes ----
  const handleBoxMouseDown = (e, id) => {
    if (editingId === id) return; // don't drag while editing
    e.stopPropagation();
    e.preventDefault();
    const tb = textBoxes.find(t => t.id === id);
    setDragging({ id, startX: e.clientX, startY: e.clientY, origX: tb.x, origY: tb.y });
    setSelectedId(id);
  };

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

  // Deselect when clicking canvas in select mode
  const handleCanvasMouseDown = (e) => {
    if (tool === 'select') {
      setSelectedId(null);
      setEditingId(null);
    }
    handleMouseDown(e);
  };

  // ---- Image insert ----
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
        const ctx = contextRef.current;
        ctx.drawImage(img, 10, 10, width, height);
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

  return (
    <GlassCard className={cn('p-4 flex flex-col', !isFullscreen && className, isFullscreen && 'fixed inset-0 z-50 rounded-none')}>
      {/* Toolbar */}
      {canEdit && (
        <div className="mb-4 p-3 bg-white/5 rounded-lg border border-white/10 flex flex-wrap gap-2 items-center">
          {/* Tool buttons */}
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setTool('pen')}
              className={tool === 'pen' ? 'bg-purple-500' : 'bg-white/10 hover:bg-white/20'} title="Draw">
              <Pen className="w-4 h-4" />
            </Button>
            <Button size="sm" onClick={() => setTool('eraser')}
              className={tool === 'eraser' ? 'bg-red-500' : 'bg-white/10 hover:bg-white/20'} title="Erase">
              <Eraser className="w-4 h-4" />
            </Button>
            <Button size="sm" onClick={() => setTool('text')}
              className={tool === 'text' ? 'bg-blue-500' : 'bg-white/10 hover:bg-white/20'} title="Text — click canvas to add">
              <Type className="w-4 h-4" />
            </Button>
            <Button size="sm" onClick={() => setTool('select')}
              className={tool === 'select' ? 'bg-green-500' : 'bg-white/10 hover:bg-white/20'} title="Select / move">
              <MousePointer className="w-4 h-4" />
            </Button>
            <Button size="sm" onClick={() => imageInputRef.current?.click()}
              className="bg-white/10 hover:bg-white/20" title="Insert image">
              <ImageIcon className="w-4 h-4" />
            </Button>
            <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageInsert} className="hidden" />
          </div>

          {/* Pen color & size */}
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
                <input type="range" min="1" max="20" value={brushSize}
                  onChange={e => setBrushSize(parseInt(e.target.value))} className="w-20" />
                <span className="text-xs text-slate-400">{brushSize}px</span>
              </div>
            </>
          )}

          {tool === 'eraser' && (
            <div className="flex items-center gap-2">
              <input type="range" min="5" max="50" value={eraserSize}
                onChange={e => setEraserSize(parseInt(e.target.value))} className="w-20" />
              <span className="text-xs text-slate-400">{eraserSize}px</span>
            </div>
          )}

          {/* Text style panel — only when a text box is selected */}
          {tool === 'text' && !selectedBox && (
            <span className="text-xs text-slate-400 italic">Click the canvas to add a textbox</span>
          )}
          {selectedBox && (
            <div className="flex flex-wrap items-center gap-3 ml-2 pl-2 border-l border-white/20">
              {/* Color */}
              <div className="flex gap-1">
                {COLORS.map(c => (
                  <button key={c} onClick={() => updateTextBoxStyle(selectedBox.id, 'color', c)}
                    className={cn('w-6 h-6 rounded-full border-2 transition-all', selectedBox.color === c ? 'border-white scale-110' : 'border-white/30')}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
              {/* Font size */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-400">Size</span>
                <input type="range" min="10" max="64" value={selectedBox.size}
                  onChange={e => updateTextBoxStyle(selectedBox.id, 'size', parseInt(e.target.value))}
                  className="w-20" />
                <span className="text-xs text-slate-300">{selectedBox.size}px</span>
              </div>
              {/* Font */}
              <select value={selectedBox.font}
                onChange={e => updateTextBoxStyle(selectedBox.id, 'font', e.target.value)}
                className="bg-white/10 border border-white/20 text-white text-xs rounded px-2 py-1">
                {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              {/* Delete */}
              <Button size="sm" onClick={() => deleteTextBox(selectedBox.id)}
                className="bg-red-500/20 hover:bg-red-500/40 text-red-400 text-xs h-7 px-2">
                Remove
              </Button>
            </div>
          )}

          <div className="flex-1" />

          <Button size="sm" onClick={() => saveWhiteboardMutation.mutate()} variant="outline"
            className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" title="Save">
            <Save className="w-4 h-4" />
          </Button>
          <Button size="sm" onClick={() => setIsFullscreen(!isFullscreen)} variant="outline"
            className="border-white/30 text-slate-300 hover:bg-white/10">
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </Button>
          <Button size="sm" onClick={handleClear} variant="outline"
            className="border-red-500/30 text-red-400 hover:bg-red-500/10">
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button size="sm" onClick={downloadCanvas} variant="outline"
            className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10">
            <Download className="w-4 h-4" />
          </Button>
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
            canEdit && tool === 'text' ? 'cursor-text' : canEdit && tool === 'select' ? 'cursor-default' : canEdit ? 'cursor-crosshair' : 'cursor-default'
          )}
        />

        {/* Text box overlays */}
        {textBoxes.map(tb => (
          <div
            key={tb.id}
            onMouseDown={e => handleBoxMouseDown(e, tb.id)}
            onClick={e => handleTextBoxClick(e, tb.id)}
            style={{
              position: 'absolute',
              left: tb.x,
              top: tb.y,
              minWidth: 80,
              cursor: editingId === tb.id ? 'text' : (tool === 'select' ? 'move' : 'text'),
              outline: selectedId === tb.id ? '2px solid #a78bfa' : tb.content ? '1px dashed rgba(255,255,255,0.2)' : '1px dashed rgba(255,255,255,0.4)',
              borderRadius: 4,
              padding: '2px 4px',
              boxSizing: 'border-box',
              userSelect: editingId === tb.id ? 'text' : 'none',
            }}
          >
            <textarea
              autoFocus={editingId === tb.id}
              readOnly={editingId !== tb.id}
              value={tb.content}
              onChange={e => handleTextChange(tb.id, e.target.value)}
              onBlur={() => handleTextBoxBlur(tb.id)}
              onClick={e => { e.stopPropagation(); setSelectedId(tb.id); setEditingId(tb.id); }}
              placeholder={editingId === tb.id ? 'Type here…' : ''}
              rows={1}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                resize: 'none',
                overflow: 'hidden',
                width: '100%',
                minWidth: 80,
                color: tb.color,
                fontSize: tb.size + 'px',
                fontFamily: tb.font,
                lineHeight: 1.3,
                cursor: editingId === tb.id ? 'text' : 'inherit',
                pointerEvents: editingId === tb.id ? 'auto' : 'none',
              }}
              onInput={e => {
                // Auto-grow height
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
            />
          </div>
        ))}
      </div>

      {!canEdit && (
        <p className="text-xs text-slate-400 mt-2">ℹ️ Teacher has not enabled editing for you yet</p>
      )}
    </GlassCard>
  );
}