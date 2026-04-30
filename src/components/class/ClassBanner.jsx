import React from 'react';

const THEME_GRADIENTS = {
  default: 'from-slate-800 via-slate-900 to-slate-950',
  purple: 'from-purple-900 via-purple-950 to-slate-950',
  blue: 'from-blue-900 via-blue-950 to-slate-950',
  emerald: 'from-emerald-900 via-emerald-950 to-slate-950',
  amber: 'from-amber-900 via-orange-950 to-slate-950',
  rose: 'from-rose-900 via-pink-950 to-slate-950',
  cyan: 'from-cyan-900 via-sky-950 to-slate-950',
};

export default function ClassBanner({ classData, subject, studentCount, role, showRole = true }) {
  const theme = classData?.theme_preset || 'default';
  const gradient = THEME_GRADIENTS[theme] || THEME_GRADIENTS.default;
  const icon = classData?.icon_emoji || '📚';

  return (
    <div className={`relative rounded-2xl overflow-hidden mb-4 bg-gradient-to-r ${gradient}`}>
      {/* Background banner image */}
      {classData?.banner_url && (
        <img
          src={classData.banner_url}
          alt="Class banner"
          className="absolute inset-0 w-full h-full object-cover opacity-20"
        />
      )}

      <div className="relative p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-3xl flex-shrink-0 shadow-lg">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white truncate">{classData?.name}</h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {subject && <span className="text-sm text-white/70">{subject.name}</span>}
              {classData?.year_group && <span className="text-sm text-white/50">· Year {classData.year_group}</span>}
              {studentCount !== undefined && <span className="text-sm text-white/50">· {studentCount} students</span>}
            </div>
          </div>
          {showRole && role && (
            <div className={`px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
              role === 'teacher' ? 'bg-purple-500/30 text-purple-200 border border-purple-400/30' :
              role === 'co_teacher' ? 'bg-blue-500/30 text-blue-200 border border-blue-400/30' :
              role === 'assistant' ? 'bg-amber-500/30 text-amber-200 border border-amber-400/30' :
              'bg-white/10 text-white/60 border border-white/10'
            }`}>
              {role === 'teacher' ? '👑 Teacher' :
               role === 'co_teacher' ? '🎓 Co-Teacher' :
               role === 'assistant' ? '🤝 Assistant' :
               '👤 Student'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}