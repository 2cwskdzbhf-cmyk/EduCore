import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import GlassCard from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { ExternalLink, Upload, FileText, Film, Image, File, RefreshCw, HardDrive } from 'lucide-react';

function fileIcon(mimeType) {
  if (!mimeType) return File;
  if (mimeType.includes('video')) return Film;
  if (mimeType.includes('image')) return Image;
  if (mimeType.includes('pdf') || mimeType.includes('text') || mimeType.includes('document')) return FileText;
  return File;
}

function formatSize(bytes) {
  if (!bytes) return '';
  const kb = parseInt(bytes) / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export default function DrivePanel() {
  const [uploading, setUploading] = useState(false);
  const inputRef = React.useRef(null);

  const { data: files = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['driveFiles'],
    queryFn: async () => {
      const res = await base44.functions.invoke('driveListFiles', {});
      return res.data?.files || [];
    },
    staleTime: 30000,
  });

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target.result.split(',')[1];
        await base44.functions.invoke('driveUploadFile', {
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          base64Content: base64,
        });
        refetch();
      };
      reader.readAsDataURL(file);
    } catch (err) {
      alert('Upload failed: ' + err.message);
    }
    setUploading(false);
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-blue-400" />
          <h2 className="text-white font-bold text-xl">Google Drive</h2>
          <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">App files only</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}
            className="border-white/20 text-slate-300 hover:bg-white/10 h-8">
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 h-8 text-xs">
            <Upload className="w-3.5 h-3.5 mr-1" /> {uploading ? 'Uploading...' : 'Upload File'}
          </Button>
          <input ref={inputRef} type="file" className="hidden" onChange={handleUpload} />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : files.length === 0 ? (
        <GlassCard className="p-12 text-center" hover={false}>
          <HardDrive className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 font-medium">No files yet</p>
          <p className="text-slate-500 text-sm mt-1">Upload a file or export a doc to Google Drive to get started.</p>
          <Button onClick={() => inputRef.current?.click()} className="mt-4 bg-gradient-to-r from-blue-500 to-cyan-500">
            <Upload className="w-4 h-4 mr-2" /> Upload First File
          </Button>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {files.map((file, i) => {
            const Icon = fileIcon(file.mimeType);
            return (
              <motion.div key={file.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <GlassCard className="p-3.5 flex items-center gap-3 hover:bg-white/10 transition-all" hover={false}>
                  <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">{file.name}</p>
                    <p className="text-xs text-slate-500">
                      {formatSize(file.size)}
                      {file.modifiedTime && ` · Modified ${new Date(file.modifiedTime).toLocaleDateString()}`}
                    </p>
                  </div>
                  {file.webViewLink && (
                    <a href={file.webViewLink} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors flex-shrink-0">
                      <ExternalLink className="w-3.5 h-3.5" /> Open
                    </a>
                  )}
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}