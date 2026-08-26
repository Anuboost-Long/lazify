import type { SyncedWorkspaceProject } from "@renderer/shared/types/lazify";

const PROJECT_DIRECTORY_STORAGE_KEY = "lazify-project-directory";

const WORKSPACE_PROJECTS_STORAGE_KEY = "lazify-workspace-projects";

const ACTIVE_PROJECT_STORAGE_KEY = "lazify-active-project";

export function readStoredProjectDirectory() {
	if (typeof window === "undefined") {
		return "";
	}

	return globalThis.localStorage.getItem(PROJECT_DIRECTORY_STORAGE_KEY) ?? "";
}

export function persistProjectDirectory(value: string) {
	if (typeof window === "undefined") {
		return;
	}

	globalThis.localStorage.setItem(PROJECT_DIRECTORY_STORAGE_KEY, value);
}

export function readStoredWorkspaceProjects() {
	if (typeof window === "undefined") {
		return [] as SyncedWorkspaceProject[];
	}

	const rawValue = globalThis.localStorage.getItem(WORKSPACE_PROJECTS_STORAGE_KEY);

	if (!rawValue) {
		return [] as SyncedWorkspaceProject[];
	}

	try {
		const parsed = JSON.parse(rawValue);
		return Array.isArray(parsed) ? (parsed as SyncedWorkspaceProject[]) : [];
	} catch {
		return [] as SyncedWorkspaceProject[];
	}
}

export function persistWorkspaceProjects(value: SyncedWorkspaceProject[]) {
	if (typeof window === "undefined") {
		return;
	}

	globalThis.localStorage.setItem(WORKSPACE_PROJECTS_STORAGE_KEY, JSON.stringify(value));
}

// The project the user last had open, so leaving a page and returning lands
// back on it instead of resetting to the first in the list.

// The project the user last had open, so leaving a page and returning lands
// back on it instead of resetting to the first in the list.
export function readStoredActiveProjectPath() {
	if (typeof window === "undefined") {
		return "";
	}

	return globalThis.localStorage.getItem(ACTIVE_PROJECT_STORAGE_KEY) ?? "";
}

export function persistActiveProjectPath(value: string) {
	if (typeof window === "undefined") {
		return;
	}

	globalThis.localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, value);
}
