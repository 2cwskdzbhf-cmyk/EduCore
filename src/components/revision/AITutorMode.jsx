/**
 * AITutorMode — Studio-powered AI chat, fully source-linked.
 * Re-uses WorkspaceCenterPanel so both the Workspace and any legacy
 * notebook views share identical AI capabilities, source context,
 * batched flashcard generation, and Studio save behaviour.
 */
import WorkspaceCenterPanel from './workspace/WorkspaceCenterPanel';

export default function AITutorMode({ notebook, user, sources, onResourceCreated }) {
  return (
    <WorkspaceCenterPanel
      notebook={notebook}
      user={user}
      selectedSources={[]}
      allSources={sources || []}
      onResourceCreated={onResourceCreated || (() => {})}
    />
  );
}