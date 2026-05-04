import { WorkspacePage } from "@renderer/features/workspace/pages/WorkspacePage";
import { useLazifyStore } from "@renderer/shared/hooks/use-lazify-store";

export function WorkspaceRoute() {
  const {
    removeSyncedWorkspaceProject,
    syncWorkspaceProject,
    syncedWorkspaceProjects,
  } = useLazifyStore();

  return (
    <WorkspacePage
      syncedProjects={syncedWorkspaceProjects}
      onSyncProject={syncWorkspaceProject}
      onRemoveProject={removeSyncedWorkspaceProject}
    />
  );
}
