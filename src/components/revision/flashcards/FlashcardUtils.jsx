// ─── Clean markdown from flashcard text ──────────────────────────────────────
export function cleanText(text = '') {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}

// ─── Spaced Repetition ────────────────────────────────────────────────────────
export function getNextReview(rating, interval = 1, ease = 2.5) {
  const now = new Date();
  let newInterval = interval;
  let newEase = ease;
  if (rating === 'again')  { newInterval = 1; newEase = Math.max(1.3, ease - 0.2); }
  else if (rating === 'hard')   { newInterval = Math.max(1, interval * 1.2); newEase = Math.max(1.3, ease - 0.15); }
  else if (rating === 'medium') { newInterval = interval * ease; }
  else if (rating === 'easy')   { newInterval = interval * ease * 1.3; newEase = ease + 0.15; }
  newInterval = Math.round(newInterval);
  const next = new Date(now.getTime() + newInterval * 24 * 60 * 60 * 1000);
  return { next_review: next.toISOString(), interval_days: newInterval, ease_factor: newEase };
}

// ─── Card type config ────────────────────────────────────────────────────────
export const CARD_TYPES = [
  { id: 'definition', label: 'Definition', emoji: '📖', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  { id: 'example',    label: 'Example',    emoji: '💡', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  { id: 'formula',    label: 'Formula',    emoji: '🔢', color: 'text-cyan-400',  bg: 'bg-cyan-500/10 border-cyan-500/20' },
  { id: 'diagram',    label: 'Diagram',    emoji: '🗺️', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  { id: 'comparison', label: 'Comparison', emoji: '⚖️', color: 'text-rose-400',  bg: 'bg-rose-500/10 border-rose-500/20' },
  { id: 'process',    label: 'Process',    emoji: '⚙️', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  { id: 'cause_effect', label: 'Cause/Effect', emoji: '🔗', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
];

export const DIFFICULTY_CONFIG = {
  easy:   { label: 'Easy',   color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/25' },
  medium: { label: 'Medium', color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/25' },
  hard:   { label: 'Hard',   color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/25' },
  again:  { label: 'Again',  color: 'text-red-500',     bg: 'bg-red-500/10 border-red-500/25' },
};

export function getCardTypeConfig(typeId) {
  return CARD_TYPES.find(t => t.id === typeId) || null;
}