import { SyncedProjectPage } from "@/features/workspace/pages/SyncedProjectPage";
import { useLazifyStore } from "@/shared/hooks/use-lazify-store";

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
