import { useCallback } from "react";

import { SyncedProjectPage } from "@/features/workspace/pages/SyncedProjectPage";
import { useLazifyStore } from "@/shared/hooks/use-lazify-store";
import { useRecentProjects } from "@/shared/hooks/use-recent-projects";

export function SyncedProjectRoute() {
  const {
    busy,
    syncedWorkspaceProjects,
    updateProjectNodeVersion,
    setActiveProjectPath
  } = useLazifyStore();
  const { rememberProject } = useRecentProjects();

  const openProject = useCallback(
    (projectPath: string) => {
      setActiveProjectPath(projectPath);
      rememberProject(projectPath);
    },
    [setActiveProjectPath, rememberProject]
  );

  return (
    <SyncedProjectPage
      busy={busy}
      syncedProjects={syncedWorkspaceProjects}
      onNodeVersionChange={updateProjectNodeVersion}
      onActiveProject={openProject}
    />
  );
}
