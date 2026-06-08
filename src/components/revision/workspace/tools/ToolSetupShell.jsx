import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const G = {
  bg: 'linear-gradient(135deg, #EDE8F5 0%, #c8d4f5 100%)',
  glass: { background: 'rgba(255,255,255,0.35)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.4)', boxShadow: '0 4px 24px rgba(61,82,160,0.12)' },
  primary: '#3D52A0',
  secondary: '#8697C4',
  accent: '#7091E6',
  btn: { background: 'linear-gradient(135deg, #7091E6, #3D52A0)', boxShadow: '0 4px 18px rgba(61,82,160,0.3)' },
  select: { background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '12px', color: '#3D52A0', padding: '10px 14px', fontSize: '14px', fontWeight: '500', width: '100%', outline: 'none', cursor: 'pointer' },
  input: { background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '12px', color: '#3D52A0', padding: '10px 14px', fontSize: '14px', fontWeight: '500', width: '100%', outline: 'none' },
};

export { G };

export function ToolLabel({ children }) {
  return <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: G.secondary }}>{children}</label>;
}

export function ToolSelect({ value, onChange, options }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={G.select}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function ToolInput({ value, onChange, placeholder }) {
  return <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={G.input} />;
}

export function Toggle({ value, onChange, label, desc }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.4)' }}>
      <div>
        <p className="text-sm font-semibold" style={{ color: G.primary }}>{label}</p>
        {desc && <p className="text-xs" style={{ color: G.secondary }}>{desc}</p>}
      </div>
      <button onClick={() => onChange(!value)} className="relative w-11 h-6 rounded-full transition-all duration-300 flex-shrink-0"
        style={{ background: value ? 'linear-gradient(135deg, #7091E6, #3D52A0)' : 'rgba(134,151,196,0.3)' }}>
        <motion.span animate={{ x: value ? 20 : 2 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm block" />
      </button>
    </div>
  );
}

export function GenerateBtn({ onClick, disabled, children }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="w-full py-3.5 rounded-2xl text-white font-bold text-base transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
      style={G.btn}>
      {children}
    </button>
  );
}

export function LoadingScreen({ label }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 p-8" style={{ background: G.bg }}>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #7091E6, #3D52A0)' }}>
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
      <p className="font-bold text-lg" style={{ color: G.primary }}>{label}</p>
      <p className="text-sm" style={{ color: G.secondary }}>This may take up to 30 seconds…</p>
    </div>
  );
}

export function SetupShell({ icon: Icon, title, subtitle, onGenerate, generating, generateLabel = '✨ Generate', children }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 overflow-y-auto" style={{ background: G.bg }}>
      <motion.div initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-md rounded-3xl p-8" style={G.glass}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #7091E6, #3D52A0)' }}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-black text-lg" style={{ color: G.primary }}>{title}</h2>
            <p className="text-sm" style={{ color: G.secondary }}>{subtitle}</p>
          </div>
        </div>
        <div className="space-y-4">
          {children}
          <GenerateBtn onClick={onGenerate} disabled={generating}>{generating ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Generating…</span> : generateLabel}</GenerateBtn>
        </div>
      </motion.div>
    </div>
  );
}

export function ResultShell({ title, subtitle, onRegenerate, onBack, extraActions, children }) {
  return (
    <div className="flex flex-col h-full" style={{ background: G.bg }}>
      <div className="flex-shrink-0 px-5 py-3 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.3)' }}>
        <div>
          <h2 className="font-bold text-sm" style={{ color: G.primary }}>{title}</h2>
          {subtitle && <p className="text-xs" style={{ color: G.secondary }}>{subtitle}</p>}
        </div>
        <div className="flex gap-2">
          {extraActions}
          {onRegenerate && (
            <button onClick={onRegenerate} className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:brightness-110"
              style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(112,145,230,0.3)', color: G.primary }}>
              🔄 Regenerate
            </button>
          )}
          {onBack && (
            <button onClick={onBack} className="px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(112,145,230,0.3)', color: G.secondary }}>
              ← Back
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-5">{children}</div>
    </div>
  );
}

export function ProseBlock({ children }) {
  return (
    <div className="rounded-2xl p-5 text-sm leading-relaxed whitespace-pre-wrap"
      style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.4)', color: G.primary }}>
      {children}
    </div>
  );
}

export function TopicRow({ customTopic, setCustomTopic, allSources }) {
  return (
    <div>
      <ToolLabel>Topic / Custom Input</ToolLabel>
      <ToolInput value={customTopic} onChange={setCustomTopic}
        placeholder={allSources?.some(s => s.content_text) ? 'Leave blank to use your sources, or type a topic…' : 'e.g. Photosynthesis, The Water Cycle…'} />
    </div>
  );
}