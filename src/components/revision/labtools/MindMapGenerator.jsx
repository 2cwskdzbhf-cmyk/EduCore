import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Network, Loader2, Plus, Trash2, Edit3, Check, X, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

const NODE_COLORS = {
  root: { bg: '#7c3aed', border: '#a78bfa', text: '#fff' },
  branch: { bg: '#1e1b4b', border: '#4c1d95', text: '#c4b5fd' },
  leaf: { bg: '#0f172a', border: '#334155', text: '#94a3b8' },
};

function MindMapCanvas({ nodes, edges, onUpdateNode, onDeleteNode, onAddChild }) {
  const svgRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [isPanning, setIsPanning] = useState(false);
  const lastMouse = useRef(null);

  const handleMouseDown = (e, nodeId) => {
    e.stopPropagation();
    setDragging(nodeId);
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handleSvgMouseDown = (e) => {
    setIsPanning(true);
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = useCallback((e) => {
    if (!lastMouse.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    if (dragging) {
      onUpdateNode(dragging, { x: (nodes.find(n => n.id === dragging)?.x || 0) + dx / zoom, y: (nodes.find(n => n.id === dragging)?.y || 0) + dy / zoom });
    } else if (isPanning) {
      setPan(p => ({ x: p.x + dx, y: p.y + dy }));
    }
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, [dragging, isPanning, nodes, zoom, onUpdateNode]);

  const handleMouseUp = () => {
    setDragging(null);
    setIsPanning(false);
    lastMouse.current = null;
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [handleMouseMove]);

  const startEdit = (node) => {
    setEditingId(node.id);
    setEditText(node.label);
  };

  const commitEdit = () => {
    if (editText.trim()) onUpdateNode(editingId, { label: editText.trim() });
    setEditingId(null);
  };

  const W = 140, H = 44;

  return (
    <div className="relative bg-slate-950 rounded-2xl border border-white/10 overflow-hidden" style={{ height: 520 }}>
      {/* Controls */}
      <div className="absolute top-3 right-3 z-10 flex gap-1.5">
        <button onClick={() => setZoom(z => Math.min(z + 0.2, 2.5))} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-slate-400 hover:text-white transition-all"><ZoomIn className="w-4 h-4" /></button>
        <button onClick={() => setZoom(z => Math.max(z - 0.2, 0.3))} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-slate-400 hover:text-white transition-all"><ZoomOut className="w-4 h-4" /></button>
        <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-slate-400 hover:text-white transition-all"><Maximize2 className="w-4 h-4" /></button>
      </div>
      <div className="absolute bottom-3 left-3 z-10 text-xs text-slate-600">Drag to pan · Drag nodes to reposition · Double-click to edit</div>

      <svg
        ref={svgRef}
        className="w-full h-full cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleSvgMouseDown}
      >
        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
          {/* Edges */}
          {edges.map((e, i) => {
            const from = nodes.find(n => n.id === e.from);
            const to = nodes.find(n => n.id === e.to);
            if (!from || !to) return null;
            const x1 = from.x + W / 2, y1 = from.y + H / 2;
            const x2 = to.x + W / 2, y2 = to.y + H / 2;
            const cx = (x1 + x2) / 2;
            return (
              <path key={i}
                d={`M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`}
                stroke="#334155" strokeWidth="1.5" fill="none" strokeDasharray={to.level === 2 ? '4 2' : ''} />
            );
          })}

          {/* Nodes */}
          {nodes.map(node => {
            const colors = NODE_COLORS[node.level === 0 ? 'root' : node.level === 1 ? 'branch' : 'leaf'];
            return (
              <g key={node.id}
                transform={`translate(${node.x},${node.y})`}
                onMouseDown={e => handleMouseDown(e, node.id)}
                onDoubleClick={() => startEdit(node)}
                style={{ cursor: 'move' }}>
                <rect width={W} height={H} rx={node.level === 0 ? 14 : 10}
                  fill={colors.bg} stroke={colors.border} strokeWidth={node.level === 0 ? 2 : 1} />
                {editingId === node.id ? (
                  <foreignObject x={4} y={4} width={W - 8} height={H - 8}>
                    <input
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingId(null); }}
                      onBlur={commitEdit}
                      autoFocus
                      className="w-full h-full bg-transparent text-white text-xs font-medium outline-none text-center px-1"
                    />
                  </foreignObject>
                ) : (
                  <text x={W / 2} y={H / 2 + 1} textAnchor="middle" dominantBaseline="middle"
                    fill={colors.text} fontSize={node.level === 0 ? 12 : 11} fontWeight={node.level === 0 ? 700 : 500}
                    style={{ pointerEvents: 'none' }}>
                    {node.label.length > 16 ? node.label.slice(0, 15) + '…' : node.label}
                  </text>
                )}

                {/* Action buttons on hover — rendered as small circles */}
                <g opacity={0.7}>
                  <circle cx={W - 8} cy={8} r={7} fill="#1e1b4b" stroke="#4c1d95" strokeWidth={1}
                    onClick={e => { e.stopPropagation(); onAddChild(node.id); }}
                    style={{ cursor: 'pointer' }}>
                  </circle>
                  <text x={W - 8} y={9} textAnchor="middle" dominantBaseline="middle" fill="#a78bfa" fontSize={10} fontWeight={700} style={{ pointerEvents: 'none' }}>+</text>
                  {node.level > 0 && (
                    <>
                      <circle cx={W - 22} cy={8} r={7} fill="#1e1b4b" stroke="#7f1d1d" strokeWidth={1}
                        onClick={e => { e.stopPropagation(); onDeleteNode(node.id); }}
                        style={{ cursor: 'pointer' }} />
                      <text x={W - 22} y={9} textAnchor="middle" dominantBaseline="middle" fill="#ef4444" fontSize={10} fontWeight={700} style={{ pointerEvents: 'none' }}>×</text>
                    </>
                  )}
                </g>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

// Layout: radial from root
function layoutNodes(rawNodes, rawEdges) {
  if (!rawNodes.length) return rawNodes;
  const root = rawNodes.find(n => n.level === 0);
  if (!root) return rawNodes.map((n, i) => ({ ...n, x: 200 + i * 160, y: 200 }));

  const cx = 400, cy = 250;
  const placed = new Map();
  placed.set(root.id, { x: cx - 70, y: cy - 22 });

  const children1 = rawEdges.filter(e => e.from === root.id).map(e => e.to);
  const r1 = 200;
  children1.forEach((cid, i) => {
    const angle = (2 * Math.PI * i) / children1.length - Math.PI / 2;
    placed.set(cid, { x: cx + r1 * Math.cos(angle) - 70, y: cy + r1 * Math.sin(angle) - 22 });
  });

  children1.forEach(cid => {
    const children2 = rawEdges.filter(e => e.from === cid).map(e => e.to);
    const parent = placed.get(cid);
    if (!parent) return;
    children2.forEach((gid, i) => {
      const offset = (i - (children2.length - 1) / 2) * 60;
      const dx = parent.x + 70 - cx;
      const dy = parent.y + 22 - cy;
      const angle = Math.atan2(dy, dx);
      placed.set(gid, {
        x: parent.x + 160 * Math.cos(angle) + offset * Math.sin(angle),
        y: parent.y + 160 * Math.sin(angle) - offset * Math.cos(angle),
      });
    });
  });

  return rawNodes.map(n => ({ ...n, ...(placed.get(n.id) || { x: 100, y: 100 }) }));
}

export default function MindMapGenerator({ user }) {
  const [input, setInput] = useState('');
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const generate = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Convert the following notes/topic into a structured mind map.
Notes: ${input}

Return JSON with exactly this structure:
{
  "root": "Central topic title (short, max 3 words)",
  "branches": [
    {
      "label": "Branch name (2-4 words)",
      "children": ["leaf concept 1", "leaf concept 2", "leaf concept 3"]
    }
  ]
}

Create 4-7 branches, each with 2-4 children. Keep labels SHORT (2-5 words max).`,
        response_json_schema: {
          type: 'object',
          properties: {
            root: { type: 'string' },
            branches: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  label: { type: 'string' },
                  children: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
      });

      // Build graph
      const rawNodes = [];
      const rawEdges = [];
      let idCounter = 0;
      const rootId = `n${idCounter++}`;
      rawNodes.push({ id: rootId, label: res.root, level: 0, x: 0, y: 0 });

      res.branches?.forEach(branch => {
        const bid = `n${idCounter++}`;
        rawNodes.push({ id: bid, label: branch.label, level: 1, x: 0, y: 0 });
        rawEdges.push({ from: rootId, to: bid });
        branch.children?.forEach(child => {
          const cid = `n${idCounter++}`;
          rawNodes.push({ id: cid, label: child, level: 2, x: 0, y: 0 });
          rawEdges.push({ from: bid, to: cid });
        });
      });

      const laid = layoutNodes(rawNodes, rawEdges);
      setNodes(laid);
      setEdges(rawEdges);
      setGenerated(true);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const updateNode = (id, updates) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
  };

  const deleteNode = (id) => {
    const toDelete = new Set([id]);
    // Also delete children recursively
    let changed = true;
    while (changed) {
      changed = false;
      edges.forEach(e => {
        if (toDelete.has(e.from) && !toDelete.has(e.to)) { toDelete.add(e.to); changed = true; }
      });
    }
    setNodes(prev => prev.filter(n => !toDelete.has(n.id)));
    setEdges(prev => prev.filter(e => !toDelete.has(e.from) && !toDelete.has(e.to)));
  };

  const addChild = (parentId) => {
    const parent = nodes.find(n => n.id === parentId);
    if (!parent) return;
    const newId = `n${Date.now()}`;
    const newNode = { id: newId, label: 'New Node', level: Math.min(parent.level + 1, 2), x: parent.x + 160, y: parent.y + 40 };
    setNodes(prev => [...prev, newNode]);
    setEdges(prev => [...prev, { from: parentId, to: newId }]);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <label className="text-sm text-slate-400 font-medium mb-2 block">Paste your notes or describe a topic</label>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="e.g. The Water Cycle includes evaporation, condensation, precipitation, and collection. Evaporation is driven by solar energy..."
          rows={4}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-violet-500/50 resize-none"
        />
        <button onClick={generate} disabled={loading || !input.trim()}
          className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Network className="w-4 h-4" />}
          {loading ? 'Generating Mind Map...' : generated ? 'Regenerate' : 'Generate Mind Map'}
        </button>
      </div>

      <AnimatePresence>
        {nodes.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-400">{nodes.length} nodes · {edges.length} connections</div>
              <div className="flex gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-violet-600 inline-block" />Root</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-indigo-900 border border-indigo-700 inline-block" />Branch</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-900 border border-slate-600 inline-block" />Leaf</span>
              </div>
            </div>
            <MindMapCanvas
              nodes={nodes}
              edges={edges}
              onUpdateNode={updateNode}
              onDeleteNode={deleteNode}
              onAddChild={addChild}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}