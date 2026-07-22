import { AgentsPage } from "@renderer/features/agents/pages/AgentsPage";
import { useLazifyStore } from "@renderer/shared/hooks/use-lazify-store";

export function AgentsRoute() {
  const { syncedWorkspaceProjects, syncWorkspaceProject } = useLazifyStore();

  return (
    <AgentsPage
      projects={syncedWorkspaceProjects}
      onSyncProject={syncWorkspaceProject}
    />
  );
}
