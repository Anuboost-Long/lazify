import { SyncedProjectPage } from "@renderer/features/workspace/pages/SyncedProjectPage";
import { useLazifyStore } from "@renderer/shared/hooks/use-lazify-store";

export function SyncedProjectRoute() {
  const {
    busy,
    syncedWorkspaceProjects
  } = useLazifyStore();

  return (
    <SyncedProjectPage
      busy={busy}
      syncedProjects={syncedWorkspaceProjects}
    />
  );
}
