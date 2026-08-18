import { ApiStudioPage } from "@renderer/features/api-studio/pages/ApiStudioPage";
import { useLazifyStore } from "@renderer/shared/hooks/use-lazify-store";

export function ApiStudioRoute() {
  const {
    syncedWorkspaceProjects,
    activeProjectPath,
    setActiveProjectPath,
    syncWorkspaceProject
  } = useLazifyStore();

  const syncProject = async () => {
    const project = await syncWorkspaceProject();
    if (project) setActiveProjectPath(project.projectPath);
    return project;
  };

  return (
    <ApiStudioPage
      projects={syncedWorkspaceProjects}
      activeProjectPath={activeProjectPath}
      onActiveProjectChange={setActiveProjectPath}
      onSyncProject={syncProject}
    />
  );
}
