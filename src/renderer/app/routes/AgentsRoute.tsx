import { AgentsPage } from "@renderer/features/agents/pages/AgentsPage";
import { useLazifyStore } from "@renderer/shared/hooks/use-lazify-store";

export function AgentsRoute() {
  const {
    syncedWorkspaceProjects,
    syncWorkspaceProject,
    reorderSyncedWorkspaceProjects,
    activeProjectPath,
    setActiveProjectPath,
  } = useLazifyStore();

  return (
    <AgentsPage
      projects={syncedWorkspaceProjects}
      onSyncProject={syncWorkspaceProject}
      onReorderProjects={reorderSyncedWorkspaceProjects}
      activeProjectPath={activeProjectPath}
      onActiveProjectChange={setActiveProjectPath}
    />
  );
}
