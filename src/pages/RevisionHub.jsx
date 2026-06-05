import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen, LayoutDashboard, Layers, Zap, Brain, Search, Plus, ChevronLeft
} from 'lucide-react';
import RevisionDashboard from '@/components/revision/RevisionDashboard';
import NotebooksView from '@/components/revision/NotebooksView';
import NotebookDetail from '@/components/revision/NotebookDetail';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'notebooks', label: 'Notebooks', icon: BookOpen },
];

export default function RevisionHub() {
  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [openNotebook, setOpenNotebook] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [quickUploadNotebook, setQuickUploadNotebook] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: notebooks = [], refetch: refetchNotebooks } = useQuery({
    queryKey: ['revisionNotebooks', user?.email],
    queryFn: () => base44.entities.RevisionNotebook.filter({ student_email: user.email }, '-updated_date'),
    enabled: !!user?.email,
  });

  if (openNotebook) {
    return (
      <NotebookDetail
        notebook={openNotebook}
        user={user}
        onBack={() => { setOpenNotebook(null); setQuickUploadNotebook(null); refetchNotebooks(); }}
        autoOpenUpload={quickUploadNotebook?.id === openNotebook?.id}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-900/20 to-slate-900 flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-56 flex-shrink-0 flex-col bg-slate-950/60 backdrop-blur-xl border-r border-white/10 py-6 px-3">
        <div className="flex items-center gap-2 px-3 mb-8">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-black text-base">Revision Hub</span>
        </div>
        <nav className="space-y-1 flex-1">
          {NAV.map(item => (
            <button key={item.id} onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeSection === item.id
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}>
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="mt-4 px-3">
          <div className="text-xs text-slate-600 font-semibold uppercase tracking-wider mb-2">Recent</div>
          {notebooks.slice(0, 4).map(nb => (
            <button key={nb.id} onClick={() => setOpenNotebook(nb)}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-all text-left truncate">
              <span>{nb.icon || '📚'}</span>
              <span className="truncate">{nb.name}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-20 bg-slate-950/80 backdrop-blur-xl border-b border-white/10 px-6 py-3 flex items-center gap-4">
          <div className="flex lg:hidden items-center gap-2">
            {NAV.map(item => (
              <button key={item.id} onClick={() => setActiveSection(item.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeSection === item.id ? 'bg-violet-500/20 text-violet-300' : 'text-slate-400 hover:text-white'
                }`}>
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex-1 relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search notebooks, flashcards, notes..."
              className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50"
            />
          </div>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {activeSection === 'dashboard' && (
              <motion.div key="dashboard" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                <RevisionDashboard
                  user={user}
                  notebooks={notebooks}
                  onOpenNotebook={setOpenNotebook}
                  onGoToNotebooks={() => setActiveSection('notebooks')}
                  onQuickUpload={() => {
                    if (notebooks.length > 0) {
                      setQuickUploadNotebook(notebooks[0]);
                      setOpenNotebook(notebooks[0]);
                    } else {
                      setActiveSection('notebooks');
                    }
                  }}
                />
              </motion.div>
            )}
            {activeSection === 'notebooks' && (
              <motion.div key="notebooks" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                <NotebooksView
                  user={user}
                  notebooks={notebooks}
                  searchQuery={searchQuery}
                  onOpenNotebook={setOpenNotebook}
                  onRefresh={refetchNotebooks}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}