/**
 * NotebookAIChat — delegates to the Studio-powered WorkspaceCenterPanel.
 * This ensures the legacy NotebookDetail view has the same full AI capabilities
 * as the main NotebookWorkspace, including batched flashcard generation,
 * source linking, and auto-save to Studio resources.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import WorkspaceCenterPanel from './workspace/WorkspaceCenterPanel';

export default function NotebookAIChat({ notebook, user, sources }) {
  const queryClient = useQueryClient();

  const handleResourceCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['notebookResources', notebook.id] });
    queryClient.invalidateQueries({ queryKey: ['revisionFlashcards', notebook.id] });
  };

  return (
    <div className="h-[calc(100vh-200px)] min-h-[500px]">
      <WorkspaceCenterPanel
        notebook={notebook}
        user={user}
        selectedSources={[]}
        allSources={sources || []}
        onResourceCreated={handleResourceCreated}
      />
    </div>
  );
}