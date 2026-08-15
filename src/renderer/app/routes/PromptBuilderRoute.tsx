import { PromptBuilderPage } from "@renderer/features/prompts/pages/PromptBuilderPage";
import { useLazifyStore } from "@renderer/shared/hooks/use-lazify-store";

export function PromptBuilderRoute() {
  const { syncedWorkspaceProjects, activeProjectPath, setActiveProjectPath } = useLazifyStore();

  return (
    <PromptBuilderPage
      projects={syncedWorkspaceProjects}
      activeProjectPath={activeProjectPath}
      onActiveProjectChange={setActiveProjectPath}
    />
  );
}
