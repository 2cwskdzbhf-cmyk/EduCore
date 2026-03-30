import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import GlassCard from '@/components/ui/GlassCard';
import { Plus, Trash2, ExternalLink, X } from 'lucide-react';

const DEFAULT_LINKS = [
  { id: 1, name: 'Google Classroom', url: 'https://classroom.google.com' },
  { id: 2, name: 'Google Drive', url: 'https://drive.google.com' },
  { id: 3, name: 'BBC Bitesize', url: 'https://www.bbc.co.uk/bitesize' },
];

export default function QuickLinks() {
  const [links, setLinks] = useState(DEFAULT_LINKS);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');

  const addLink = () => {
    if (!name.trim() || !url.trim()) return;
    const href = url.startsWith('http') ? url.trim() : `https://${url.trim()}`;
    setLinks([...links, { id: Date.now(), name: name.trim(), url: href }]);
    setName('');
    setUrl('');
    setAdding(false);
  };

  const removeLink = (id) => setLinks(links.filter(l => l.id !== id));

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">🔗 Quick Links</h2>
        <Button
          onClick={() => setAdding(!adding)}
          size="sm"
          className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
        >
          {adding ? <X className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
          {adding ? 'Cancel' : 'Add Link'}
        </Button>
      </div>

      {adding && (
        <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
          <Input
            placeholder="Link name (e.g. Google Classroom)"
            value={name}
            onChange={e => setName(e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
          />
          <Input
            placeholder="URL (e.g. https://classroom.google.com)"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addLink()}
            className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
          />
          <Button onClick={addLink} disabled={!name.trim() || !url.trim()} className="w-full bg-emerald-500 hover:bg-emerald-600">
            <Plus className="w-4 h-4 mr-2" /> Save Link
          </Button>
        </div>
      )}

      {links.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-4">No links yet. Add some above!</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {links.map(link => (
            <div key={link.id} className="group flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 flex-1 min-w-0"
              >
                <ExternalLink className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span className="text-white text-sm font-medium truncate">{link.name}</span>
              </a>
              <button
                onClick={() => removeLink(link.id)}
                className="text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}