import React from 'react';
import WorkspaceCenterPanel from './workspace/WorkspaceCenterPanel';

/**
 * AITutorMode — thin wrapper that renders the unified WorkspaceCenterPanel
 * in tutor mode. All data flows through the same shared layer as the Studio.
 */
export default function AITutorMode({ notebook, user, sources, resources, onResourceCreated }) {
  return (
    <div className="h-full">
      <WorkspaceCenterPanel
        notebook={notebook}
        user={user}
        selectedSources={[]}
        allSources={sources}
        resources={resources}
        onResourceCreated={onResourceCreated}
        tutorMode={true}
      />
    </div>
  );
}