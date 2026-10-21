import { atom, useAtom } from "jotai";
import { useCallback } from "react";

import type { SyncedWorkspaceProject } from "@/shared/types/lazify";

/** Where a project counts as opened: its workbench, or the AI Agents page. */
const storageKeys = {
	workbench: "lazify-recent-projects",
	agents: "lazify-recent-agent-projects",
} as const;
export type RecentList = keyof typeof storageKeys;
const KEPT = 5;

function readRecent(list: RecentList): string[] {
	try {
		const stored = JSON.parse(globalThis.localStorage.getItem(storageKeys[list]) ?? "[]") as unknown;
		return Array.isArray(stored) ? stored.filter((path) => typeof path === "string") : [];
	} catch {
		return [];
	}
}

const recentAtoms = {
	workbench: atom(readRecent("workbench")),
	agents: atom(readRecent("agents")),
};

/** Opened most recently first; projects never opened follow, synced most recently first. */
export function sortByRecentlyOpened(projects: SyncedWorkspaceProject[], recent: string[]) {
	const rank = (project: SyncedWorkspaceProject) => {
		const at = recent.indexOf(project.projectPath);
		return at === -1 ? recent.length : at;
	};

	return [...projects].sort((a, b) => rank(a) - rank(b) || b.lastSyncedAt.localeCompare(a.lastSyncedAt));
}

/** Project paths opened in `list`, latest first. */
export function useRecentProjects(list: RecentList = "workbench") {
	const [recent, setRecent] = useAtom(recentAtoms[list]);

	const rememberProject = useCallback(
		(projectPath: string) =>
			setRecent((current) => {
				if (current[0] === projectPath) return current;
				const next = [projectPath, ...current.filter((path) => path !== projectPath)].slice(0, KEPT);
				try {
					globalThis.localStorage.setItem(storageKeys[list], JSON.stringify(next));
				} catch {
					// A recent list is a convenience, never a reason to fail.
				}
				return next;
			}),
		[list, setRecent],
	);

	return { recent, rememberProject };
}
