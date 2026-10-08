import { HomePage } from "@/features/home/pages/HomePage";
import { useLazifyStore } from "@/shared/hooks/use-lazify-store";

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
