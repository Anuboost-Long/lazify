import { HomePage } from "@renderer/features/home/pages/HomePage";
import { useLazifyStore } from "@renderer/shared/hooks/use-lazify-store";

export function HomeRoute() {
  const { syncedWorkspaceProjects, activeProjectPath, setActiveProjectPath } = useLazifyStore();

  return (
    <HomePage
      projects={syncedWorkspaceProjects}
      activeProjectPath={activeProjectPath}
      onActiveProjectChange={setActiveProjectPath}
    />
  );
}
