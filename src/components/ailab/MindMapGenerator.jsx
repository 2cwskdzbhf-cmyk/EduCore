import React, { useState, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Network, Sparkles, RotateCcw, Plus, X, Edit3, Check } from 'lucide-react';

function NodeCard({ node, onEdit, onDelete, onAddChild, depth = 0 }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(node.label);

  const COLORS = [
    'from-violet-500 to-purple-600',
    'from-blue-500 to-cyan-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-600',
  ];
  const color = COLORS[depth % COLORS.length];
  const bgColors = [
    'bg-violet-500/10 border-violet-500/30',
    'bg-blue-500/10 border-blue-500/30',
    'bg-emerald-500/10 border-emerald-500/30',
    'bg-amber-500/10 border-amber-500/30',
    'bg-rose-500/10 border-rose-500/30',
  ];
  const bg = bgColors[depth % bgColors.length];

  const save = () => {
    onEdit(node.id, text);
    setEditing(false);
  };

  return (
    <div className="flex flex-col items-center">
      <div className={`relative group border rounded-xl px-4 py-2 min-w-[100px] max-w-[180px] text-center ${bg} transition-all`}>
        {editing ? (
          <div className="flex items-center gap-1">
            <input autoFocus value={text} onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
              className="bg-transparent text-white text-sm w-full focus:outline-none text-center" />
            <button onClick={save} className="text-emerald-400 flex-shrink-0"><Check className="w-3 h-3" /></button>
          </div>
        ) : (
          <span className={`text-sm font-semibold bg-gradient-to-r ${color} bg-clip-text text-transparent`}>{node.label}</span>
        )}
        <div className="absolute -top-2 -right-2 hidden group-hover:flex gap-0.5">
          <button onClick={() => setEditing(true)} className="w-5 h-5 bg-slate-700 rounded-full flex items-center justify-center hover:bg-slate-600 transition-all">
            <Edit3 className="w-2.5 h-2.5 text-slate-300" />
          </button>
          <button onClick={() => onAddChild(node.id)} className="w-5 h-5 bg-slate-700 rounded-full flex items-center justify-center hover:bg-emerald-600 transition-all">
            <Plus className="w-2.5 h-2.5 text-slate-300" />
          </button>
          {depth > 0 && <button onClick={() => onDelete(node.id)} className="w-5 h-5 bg-slate-700 rounded-full flex items-center justify-center hover:bg-red-600 transition-all">
            <X className="w-2.5 h-2.5 text-slate-300" />
          </button>}
        </div>
      </div>

      {node.children?.length > 0 && (
        <div className="relative mt-2">
          <div className="w-0.5 h-4 bg-white/20 mx-auto" />
          <div className="flex gap-4 items-start">
            {node.children.map((child, i) => (
              <div key={child.id} className="flex flex-col items-center">
                <div className="w-0.5 h-3 bg-white/20 mx-auto" />
                <NodeCard node={child} onEdit={onEdit} onDelete={onDelete} onAddChild={onAddChild} depth={depth + 1} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

let nextId = 1000;

export default function MindMapGenerator({ preloadedText = '' }) {
  const [notes, setNotes] = useState(preloadedText);
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!notes.trim()) return;
    setLoading(true);
    setTree(null);
    try {
      const res = await base44.functions.invoke('callOpenAI', {
        prompt: `You are an expert educator. Convert the following notes into a hierarchical mind map. Auto-group related concepts. Create a central topic with 3-6 main branches, each with 1-4 sub-concepts. Keep labels short (2-5 words).

Notes:
${notes}`,
        response_json_schema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            label: { type: 'string' },
            children: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  label: { type: 'string' },
                  children: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        label: { type: 'string' },
                        children: { type: 'array', items: { type: 'string' } },
                      },
                      required: ['id', 'label', 'children'],
                      additionalProperties: false,
                    },
                  },
                },
                required: ['id', 'label', 'children'],
                additionalProperties: false,
              },
            },
          },
          required: ['id', 'label', 'children'],
          additionalProperties: false,
        },
      });
      setTree(res.data);
    } catch (e) {
      setTree({ error: true });
    }
    setLoading(false);
  };

  const editNode = useCallback((id, newLabel) => {
    const update = (node) => {
      if (node.id === id) return { ...node, label: newLabel };
      return { ...node, children: node.children?.map(update) || [] };
    };
    setTree(t => update(t));
  }, []);

  const deleteNode = useCallback((id) => {
    const remove = (node) => ({
      ...node,
      children: (node.children || []).filter(c => c.id !== id).map(remove),
    });
    setTree(t => remove(t));
  }, []);

  const addChild = useCallback((parentId) => {
    const newNode = { id: `custom-${nextId++}`, label: 'New Concept', children: [] };
    const add = (node) => {
      if (node.id === parentId) return { ...node, children: [...(node.children || []), newNode] };
      return { ...node, children: node.children?.map(add) || [] };
    };
    setTree(t => add(t));
  }, []);

  return (
    <div className="space-y-4">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <label className="text-slate-300 text-sm font-semibold mb-2 block">Paste your notes or topic overview</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Paste notes, bullet points, or a topic summary here... The AI will organise them into a visual mind map."
          rows={6}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500/50 text-sm resize-none"
        />
        <div className="flex gap-3 mt-3">
          <button onClick={generate} disabled={loading || !notes.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white rounded-xl font-semibold transition-all">
            <Network className="w-4 h-4" />
            {loading ? 'Generating...' : 'Generate Mind Map'}
          </button>
          {tree && !tree.error && <button onClick={() => { setTree(null); setNotes(''); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-slate-400 hover:text-white rounded-xl transition-all">
            <RotateCcw className="w-4 h-4" /> Clear
          </button>}
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-slate-400 p-4">
          <div className="w-5 h-5 border-2 border-pink-400 border-t-transparent rounded-full animate-spin" />
          Generating your mind map...
        </div>
      )}

      {tree?.error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">Failed to generate mind map. Please try again.</div>
      )}

      <AnimatePresence>
        {tree && !tree.error && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-pink-400" /> Mind Map
                </h3>
                <p className="text-slate-500 text-xs">Hover over nodes to edit, add children, or delete</p>
              </div>
              <div className="overflow-x-auto pb-4">
                <div className="min-w-max flex justify-center py-4">
                  <NodeCard node={tree} onEdit={editNode} onDelete={deleteNode} onAddChild={addChild} depth={0} />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}