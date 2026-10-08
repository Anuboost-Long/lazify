import { WorkspacePage } from "@/features/workspace/pages/WorkspacePage";
import { useLazifyStore } from "@/shared/hooks/use-lazify-store";

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
