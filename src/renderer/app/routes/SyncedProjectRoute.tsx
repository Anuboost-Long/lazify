import { SyncedProjectPage } from "@renderer/features/workspace/pages/SyncedProjectPage";
import { useLazifyStore } from "@renderer/shared/hooks/use-lazify-store";

export function SyncedProjectRoute() {
  const {
    busy,
    syncedWorkspaceProjects,
    updateProjectNodeVersion,
    setActiveProjectPath
  } = useLazifyStore();

  return (
    <SyncedProjectPage
      busy={busy}
      syncedProjects={syncedWorkspaceProjects}
      onNodeVersionChange={updateProjectNodeVersion}
      onActiveProject={setActiveProjectPath}
    />
  );
}
