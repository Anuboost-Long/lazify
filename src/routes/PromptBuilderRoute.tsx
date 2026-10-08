import { PromptBuilderPage } from "@/features/prompts/pages/PromptBuilderPage";
import { useLazifyStore } from "@/shared/hooks/use-lazify-store";

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
