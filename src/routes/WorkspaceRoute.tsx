import { WorkspacePage } from "@/features/workspace/pages/WorkspacePage";
import { useLazifyStore } from "@/shared/hooks/use-lazify-store";
import { useRecentProjects } from "@/shared/hooks/use-recent-projects";

export function WorkspaceRoute() {
  const {
    removeSyncedWorkspaceProject,
    syncWorkspaceProject,
    syncedWorkspaceProjects,
    activeProjectPath,
  } = useLazifyStore();
  const { recent } = useRecentProjects();

  return (
    <WorkspacePage
      syncedProjects={syncedWorkspaceProjects}
      recentProjectPaths={recent}
      activeProjectPath={activeProjectPath}
      onSyncProject={syncWorkspaceProject}
      onRemoveProject={removeSyncedWorkspaceProject}
    />
  );
}
