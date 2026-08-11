import { AgentsPage } from "@renderer/features/agents/pages/AgentsPage";
import { useLazifyStore } from "@renderer/shared/hooks/use-lazify-store";
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

export function AgentsRoute() {
  const {
    syncedWorkspaceProjects,
    syncWorkspaceProject,
    reorderSyncedWorkspaceProjects,
    activeProjectPath,
    setActiveProjectPath,
  } = useLazifyStore();

  // ?project=… lands the page on one project directly — that is how the
  // workbench's agent button hands its project over. It only seeds the shared
  // active project, so switching projects here still works afterwards.
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedProjectPath = searchParams.get("project");

  useEffect(() => {
    if (!requestedProjectPath) return;

    setActiveProjectPath(requestedProjectPath);
    setSearchParams({}, { replace: true });
  }, [requestedProjectPath, setActiveProjectPath, setSearchParams]);

  return (
    <AgentsPage
      projects={syncedWorkspaceProjects}
      onSyncProject={syncWorkspaceProject}
      onReorderProjects={reorderSyncedWorkspaceProjects}
      activeProjectPath={requestedProjectPath ?? activeProjectPath}
      onActiveProjectChange={setActiveProjectPath}
    />
  );
}
