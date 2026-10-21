import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

import { AgentsPage } from "@/features/agents/pages/AgentsPage";
import { useLazifyStore } from "@/shared/hooks/use-lazify-store";
import { useRecentProjects } from "@/shared/hooks/use-recent-projects";

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

	const { rememberProject } = useRecentProjects("agents");
	const shownProjectPath = requestedProjectPath ?? activeProjectPath;

	useEffect(() => {
		if (shownProjectPath) rememberProject(shownProjectPath);
	}, [shownProjectPath, rememberProject]);

	return (
		<AgentsPage
			projects={syncedWorkspaceProjects}
			onSyncProject={syncWorkspaceProject}
			onReorderProjects={reorderSyncedWorkspaceProjects}
			activeProjectPath={shownProjectPath}
			onActiveProjectChange={setActiveProjectPath}
		/>
	);
}
