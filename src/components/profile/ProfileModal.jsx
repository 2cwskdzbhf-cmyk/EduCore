import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Upload, Camera } from 'lucide-react';
import { toast } from 'sonner';
import GlassCard from '@/components/ui/GlassCard';

export default function ProfileModal({ open, onClose, user, onUpdateUser }) {
  const [formData, setFormData] = useState({
    avatar_url: user?.avatar_url || '',
    date_of_birth: user?.date_of_birth || '',
    bio: user?.bio || '',
    interests: user?.interests || [],
    career_goal: user?.career_goal || '',
    theme: user?.theme || 'dark',
    notifications_enabled: user?.notifications_enabled !== false,
    email_notifications: user?.email_notifications !== false,
  });

  const [newInterest, setNewInterest] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);

  const updateMutation = useMutation({
    mutationFn: async () => {
      let avatar_url = formData.avatar_url;
      
      if (avatarFile) {
        const uploadRes = await base44.integrations.Core.UploadFile({ file: avatarFile });
        avatar_url = uploadRes.file_url;
      }

      await base44.auth.updateMe({
        avatar_url,
        date_of_birth: formData.date_of_birth || null,
        bio: formData.bio || null,
        interests: formData.interests.filter(i => i.trim()),
        career_goal: formData.career_goal || null,
        theme: formData.theme,
        notifications_enabled: formData.notifications_enabled,
        email_notifications: formData.email_notifications,
      });
    },
    onSuccess: () => {
      toast.success('Profile updated successfully');
      onUpdateUser?.();
      onClose?.();
    },
    onError: (error) => {
      toast.error('Failed to update profile: ' + (error?.message || 'Unknown error'));
    }
  });

  const handleAddInterest = () => {
    if (newInterest.trim() && !formData.interests.includes(newInterest.trim())) {
      setFormData({
        ...formData,
        interests: [...formData.interests, newInterest.trim()]
      });
      setNewInterest('');
    }
  };

  const handleRemoveInterest = (index) => {
    setFormData({
      ...formData,
      interests: formData.interests.filter((_, i) => i !== index)
    });
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData({ ...formData, avatar_url: event.target?.result });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-950/98 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-purple-900/30 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white">Edit Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Profile Picture */}
          <GlassCard className="p-6">
            <Label className="text-white font-semibold mb-3 block">Profile Picture</Label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 overflow-hidden">
                {formData.avatar_url ? (
                  <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  user?.full_name?.charAt(0) || '?'
                )}
              </div>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 rounded-lg transition-colors">
                  <Camera className="w-4 h-4 text-purple-300" />
                  <span className="text-sm text-purple-300">Upload Photo</span>
                </div>
              </label>
            </div>
          </GlassCard>

          {/* Basic Info */}
          <GlassCard className="p-6">
            <div className="space-y-4">
              <div>
                <Label className="text-white mb-2 block">Date of Birth (Optional)</Label>
                <Input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div>
                <Label className="text-white mb-2 block">Bio (Optional)</Label>
                <Textarea
                  placeholder="Tell us about yourself..."
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="bg-white/5 border-white/10 text-white min-h-[100px]"
                />
              </div>

              <div>
                <Label className="text-white mb-2 block">Career Goal (Optional)</Label>
                <Input
                  placeholder="What job do you want to do in the future?"
                  value={formData.career_goal}
                  onChange={(e) => setFormData({ ...formData, career_goal: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>
          </GlassCard>

          {/* Interests */}
          <GlassCard className="p-6">
            <Label className="text-white font-semibold mb-3 block">Interests & Hobbies</Label>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Add an interest..."
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddInterest()}
                  className="bg-white/5 border-white/10 text-white"
                />
                <Button
                  onClick={handleAddInterest}
                  className="bg-purple-500 hover:bg-purple-600 text-white"
                >
                  Add
                </Button>
              </div>

              {formData.interests.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.interests.map((interest, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/50"
                    >
                      <span className="text-sm text-purple-300">{interest}</span>
                      <button
                        onClick={() => handleRemoveInterest(idx)}
                        className="text-purple-400 hover:text-purple-300"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </GlassCard>

          {/* App Preferences */}
          <GlassCard className="p-6">
            <Label className="text-white font-semibold mb-4 block">App Preferences</Label>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">Theme</Label>
                  <p className="text-xs text-slate-400">Choose your preferred app theme</p>
                </div>
                <Select value={formData.theme} onValueChange={(value) => setFormData({ ...formData, theme: value })}>
                  <SelectTrigger className="w-32 bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white">Notifications</Label>
                    <p className="text-xs text-slate-400">Receive in-app notifications</p>
                  </div>
                  <Switch
                    checked={formData.notifications_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, notifications_enabled: checked })}
                  />
                </div>
              </div>

              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white">Email Notifications</Label>
                    <p className="text-xs text-slate-400">Receive email notifications</p>
                  </div>
                  <Switch
                    checked={formData.email_notifications}
                    onCheckedChange={(checked) => setFormData({ ...formData, email_notifications: checked })}
                  />
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-white/10">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 shadow-lg shadow-purple-500/30"
            >
              {updateMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}