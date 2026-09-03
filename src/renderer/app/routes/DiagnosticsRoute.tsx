import { DiagnosticsPage } from "@renderer/features/diagnostics/pages/DiagnosticsPage";
import { useLazifyStore } from "@renderer/shared/hooks/use-lazify-store";

export function DiagnosticsRoute() {
	const { syncedWorkspaceProjects, activeProjectPath, setActiveProjectPath, syncWorkspaceProject } =
		useLazifyStore();

	const syncProject = async () => {
		const project = await syncWorkspaceProject();
		if (project) setActiveProjectPath(project.projectPath);

		return project;
	};

	return (
		<DiagnosticsPage
			projects={syncedWorkspaceProjects}
			activeProjectPath={activeProjectPath}
			onActiveProjectChange={setActiveProjectPath}
			onSyncProject={syncProject}
		/>
	);
}
