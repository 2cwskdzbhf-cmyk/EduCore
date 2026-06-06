/**
 * AITutorMode — renders the full new AI Tutor layout.
 * Pass notebook + user + onBack to launch.
 */
import AITutorLayout from './tutor/AITutorLayout';

export default function AITutorMode({ notebook, user, onBack, onResourceCreated }) {
  return (
    <AITutorLayout
      notebook={notebook}
      user={user}
      onBack={onBack || (() => {})}
    />
  );
}