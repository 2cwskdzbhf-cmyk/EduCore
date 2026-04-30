import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import GlassCard from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Save, Image, Users, Palette, Pin } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const THEME_PRESETS = [
  { id: 'default', label: 'Default', from: 'from-slate-700', to: 'to-slate-800', accent: '#6366f1' },
  { id: 'purple', label: 'Purple', from: 'from-purple-700', to: 'to-purple-900', accent: '#7c3aed' },
  { id: 'blue', label: 'Blue', from: 'from-blue-700', to: 'to-blue-900', accent: '#2563eb' },
  { id: 'emerald', label: 'Emerald', from: 'from-emerald-700', to: 'to-emerald-900', accent: '#059669' },
  { id: 'amber', label: 'Amber', from: 'from-amber-600', to: 'to-orange-800', accent: '#d97706' },
  { id: 'rose', label: 'Rose', from: 'from-rose-700', to: 'to-pink-900', accent: '#e11d48' },
  { id: 'cyan', label: 'Cyan', from: 'from-cyan-600', to: 'to-sky-900', accent: '#0891b2' },
];

const ICON_OPTIONS = ['📐', '📚', '🔬', '🧪', '🌍', '💻', '🎨', '🎵', '📝', '🏛️', '⚽', '🧮', '🔭', '📖', '🗺️', '💡'];

export default function ClassSettingsPanel({ classId, classData, onUpdate }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [bannerUrl, setBannerUrl] = useState(classData?.banner_url || '');
  const [iconEmoji, setIconEmoji] = useState(classData?.icon_emoji || '📚');
  const [themePreset, setThemePreset] = useState(classData?.theme_preset || 'default');
  const [requireApproval, setRequireApproval] = useState(classData?.require_join_approval ?? false);
  const [coTeacherInput, setCoTeacherInput] = useState('');
  const [assistantInput, setAssistantInput] = useState('');

  useEffect(() => {
    setBannerUrl(classData?.banner_url || '');
    setIconEmoji(classData?.icon_emoji || '📚');
    setThemePreset(classData?.theme_preset || 'default');
    setRequireApproval(classData?.require_join_approval ?? false);
  }, [classData]);

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.Class.update(classId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['class', classId]);
      if (onUpdate) onUpdate();
      toast({ title: 'Settings saved' });
    },
  });

  const addCoTeacher = () => {
    if (!coTeacherInput.trim()) return;
    const current = classData?.co_teacher_emails || [];
    if (!current.includes(coTeacherInput.trim())) {
      saveMutation.mutate({ co_teacher_emails: [...current, coTeacherInput.trim()] });
    }
    setCoTeacherInput('');
  };

  const removeCoTeacher = (email) => {
    const current = classData?.co_teacher_emails || [];
    saveMutation.mutate({ co_teacher_emails: current.filter(e => e !== email) });
  };

  const addAssistant = () => {
    if (!assistantInput.trim()) return;
    const current = classData?.assistant_teacher_emails || [];
    if (!current.includes(assistantInput.trim())) {
      saveMutation.mutate({ assistant_teacher_emails: [...current, assistantInput.trim()] });
    }
    setAssistantInput('');
  };

  const removeAssistant = (email) => {
    const current = classData?.assistant_teacher_emails || [];
    saveMutation.mutate({ assistant_teacher_emails: current.filter(e => e !== email) });
  };

  const saveMain = () => {
    saveMutation.mutate({
      banner_url: bannerUrl || null,
      icon_emoji: iconEmoji,
      theme_preset: themePreset,
      require_join_approval: requireApproval,
    });
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <h2 className="text-2xl font-bold text-white">Class Settings</h2>

      {/* Appearance */}
      <GlassCard className="p-6 space-y-5">
        <h3 className="text-white font-semibold flex items-center gap-2"><Palette className="w-4 h-4 text-purple-400" /> Appearance</h3>

        {/* Theme presets */}
        <div>
          <Label className="text-slate-400 text-xs mb-2 block">Theme</Label>
          <div className="flex flex-wrap gap-2">
            {THEME_PRESETS.map(t => (
              <button key={t.id} onClick={() => setThemePreset(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  themePreset === t.id
                    ? 'border-purple-400 text-white bg-purple-500/20'
                    : 'border-white/10 text-slate-400 bg-white/5 hover:text-white'
                }`}>
                <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5" style={{ background: t.accent }} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Icon */}
        <div>
          <Label className="text-slate-400 text-xs mb-2 block">Class Icon</Label>
          <div className="flex flex-wrap gap-2">
            {ICON_OPTIONS.map(em => (
              <button key={em} onClick={() => setIconEmoji(em)}
                className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                  iconEmoji === em ? 'bg-purple-500/40 ring-2 ring-purple-400' : 'bg-white/5 hover:bg-white/10'
                }`}>
                {em}
              </button>
            ))}
          </div>
        </div>

        {/* Banner */}
        <div>
          <Label className="text-slate-400 text-xs mb-1 block flex items-center gap-1"><Image className="w-3 h-3" /> Banner Image URL (optional)</Label>
          <Input value={bannerUrl} onChange={e => setBannerUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="bg-white/5 border-white/10 text-white" />
          {bannerUrl && (
            <img src={bannerUrl} alt="Banner preview" className="mt-2 w-full h-24 object-cover rounded-xl opacity-70" />
          )}
        </div>
      </GlassCard>

      {/* Access */}
      <GlassCard className="p-6 space-y-4">
        <h3 className="text-white font-semibold flex items-center gap-2"><Pin className="w-4 h-4 text-amber-400" /> Access Control</h3>

        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-white text-sm font-medium">Require Join Approval</p>
            <p className="text-slate-500 text-xs">Students must be approved before joining the class</p>
          </div>
          <Switch checked={requireApproval} onCheckedChange={setRequireApproval} />
        </div>
      </GlassCard>

      {/* Teachers */}
      <GlassCard className="p-6 space-y-4">
        <h3 className="text-white font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-blue-400" /> Teaching Staff</h3>

        {/* Primary teacher */}
        <div>
          <Label className="text-slate-400 text-xs mb-1 block">Primary Teacher</Label>
          <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border border-white/10">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
              {(classData?.teacher_email || '?').charAt(0).toUpperCase()}
            </div>
            <p className="text-white text-sm">{classData?.teacher_email}</p>
            <span className="ml-auto text-xs text-purple-400 bg-purple-500/15 px-2 py-0.5 rounded-full">Owner</span>
          </div>
        </div>

        {/* Co-teachers */}
        <div>
          <Label className="text-slate-400 text-xs mb-1 block">Co-Teachers</Label>
          <div className="space-y-2 mb-2">
            {(classData?.co_teacher_emails || []).map(email => (
              <div key={email} className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border border-white/10">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">
                  {email.charAt(0).toUpperCase()}
                </div>
                <p className="text-white text-sm flex-1">{email}</p>
                <span className="text-xs text-blue-400 bg-blue-500/15 px-2 py-0.5 rounded-full">Co-teacher</span>
                <button onClick={() => removeCoTeacher(email)} className="text-slate-500 hover:text-red-400 text-xs ml-1">✕</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={coTeacherInput} onChange={e => setCoTeacherInput(e.target.value)}
              placeholder="teacher@school.com" className="bg-white/5 border-white/10 text-white flex-1"
              onKeyDown={e => e.key === 'Enter' && addCoTeacher()} />
            <Button size="sm" onClick={addCoTeacher} variant="outline" className="border-white/20 text-white">Add</Button>
          </div>
        </div>

        {/* Assistant teachers */}
        <div>
          <Label className="text-slate-400 text-xs mb-1 block">Assistant Teachers</Label>
          <div className="space-y-2 mb-2">
            {(classData?.assistant_teacher_emails || []).map(email => (
              <div key={email} className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border border-white/10">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white text-xs font-bold">
                  {email.charAt(0).toUpperCase()}
                </div>
                <p className="text-white text-sm flex-1">{email}</p>
                <span className="text-xs text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full">Assistant</span>
                <button onClick={() => removeAssistant(email)} className="text-slate-500 hover:text-red-400 text-xs ml-1">✕</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={assistantInput} onChange={e => setAssistantInput(e.target.value)}
              placeholder="assistant@school.com" className="bg-white/5 border-white/10 text-white flex-1"
              onKeyDown={e => e.key === 'Enter' && addAssistant()} />
            <Button size="sm" onClick={addAssistant} variant="outline" className="border-white/20 text-white">Add</Button>
          </div>
        </div>
      </GlassCard>

      <Button onClick={saveMain} disabled={saveMutation.isPending} className="w-full bg-gradient-to-r from-purple-500 to-blue-500 h-11">
        <Save className="w-4 h-4 mr-2" />
        {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
      </Button>
    </div>
  );
}