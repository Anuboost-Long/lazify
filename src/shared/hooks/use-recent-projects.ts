import { atom, useAtom } from "jotai";
import { useCallback } from "react";

import type { SyncedWorkspaceProject } from "@/shared/types/lazify";

const RECENT_PROJECTS_KEY = "lazify-recent-projects";
const KEPT = 5;

function readRecent(): string[] {
	try {
		const stored = JSON.parse(globalThis.localStorage.getItem(RECENT_PROJECTS_KEY) ?? "[]") as unknown;
		return Array.isArray(stored) ? stored.filter((path) => typeof path === "string") : [];
	} catch {
		return [];
	}
}

const recentAtom = atom(readRecent());

/** Opened most recently first; projects never opened follow, synced most recently first. */
export function sortByRecentlyOpened(projects: SyncedWorkspaceProject[], recent: string[]) {
	const rank = (project: SyncedWorkspaceProject) => {
		const at = recent.indexOf(project.projectPath);
		return at === -1 ? recent.length : at;
	};

	return [...projects].sort((a, b) => rank(a) - rank(b) || b.lastSyncedAt.localeCompare(a.lastSyncedAt));
}

/** Project paths whose workbench was opened, latest first. */
export function useRecentProjects() {
	const [recent, setRecent] = useAtom(recentAtom);

	const rememberProject = useCallback(
		(projectPath: string) =>
			setRecent((current) => {
				if (current[0] === projectPath) return current;
				const next = [projectPath, ...current.filter((path) => path !== projectPath)].slice(0, KEPT);
				try {
					globalThis.localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(next));
				} catch {
					// A recent list is a convenience, never a reason to fail.
				}
				return next;
			}),
		[setRecent],
	);

	return { recent, rememberProject };
}
