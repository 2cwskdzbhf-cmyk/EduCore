import React from 'react';
import WorkspaceCenterPanel from './workspace/WorkspaceCenterPanel';

/**
 * NotebookAIChat — delegates to the unified WorkspaceCenterPanel.
 * This ensures the old NotebookDetail AI chat path has full Studio capabilities.
 */
export default function NotebookAIChat({ notebook, user, sources, resources, onResourceCreated }) {
  return (
    <div className="h-[calc(100vh-180px)] min-h-[500px] flex flex-col">
      <WorkspaceCenterPanel
        notebook={notebook}
        user={user}
        selectedSources={[]}
        allSources={sources || []}
        resources={resources || []}
        flashcards={[]}
        onResourceCreated={onResourceCreated || (() => {})}
        tutorMode={false}
      />
    </div>
  );
}