import React, { useState } from 'react';
import { Link2, UserCheck, Settings } from 'lucide-react';
import ClassSettingsPanel from './ClassSettingsPanel';
import ClassInvitePanel from './ClassInvitePanel';
import ClassJoinRequestsPanel from './ClassJoinRequestsPanel';

export default function SettingsModalContent({ classId, classData, pendingRequests, onUpdate }) {
  const [tab, setTab] = useState('settings');

  const tabs = [
    { id: 'settings', icon: '⚙️', label: 'General' },
    { id: 'invites', icon: '🔗', label: 'Invite Links' },
    { id: 'requests', icon: '🙋', label: 'Join Requests', badge: pendingRequests?.length },
  ];

  return (
    <>
      {/* Tab bar */}
      <div className="flex gap-1 px-6 pt-4 flex-shrink-0 border-b border-white/10 pb-0">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`relative px-4 py-2.5 rounded-t-xl font-bold text-sm transition-all flex items-center gap-1.5 ${
              tab === t.id
                ? 'bg-white/10 text-white border-b-2 border-purple-400'
                : 'text-slate-400 hover:text-white'
            }`}>
            <span>{t.icon}</span>
            <span>{t.label}</span>
            {t.badge > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center font-black ml-0.5">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'settings' && (
          <ClassSettingsPanel classId={classId} classData={classData} onUpdate={onUpdate} />
        )}
        {tab === 'invites' && (
          <ClassInvitePanel classId={classId} classData={classData} />
        )}
        {tab === 'requests' && (
          <ClassJoinRequestsPanel classId={classId} classData={classData} />
        )}
      </div>
    </>
  );
}