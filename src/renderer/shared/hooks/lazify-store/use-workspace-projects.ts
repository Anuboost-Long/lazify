import { useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";

import type { SyncedWorkspaceProject } from "@renderer/shared/types/lazify";

import { statusMessageAtom, syncedWorkspaceProjectsAtom, workflowStatusAtom } from "./atoms";
import { persistWorkspaceProjects } from "./storage";

export function useWorkspaceProjects() {
	const syncedWorkspaceProjects = useAtomValue(syncedWorkspaceProjectsAtom);
	const setSyncedWorkspaceProjects = useSetAtom(syncedWorkspaceProjectsAtom);
	const setStatusMessage = useSetAtom(statusMessageAtom);
	const setWorkflowStatus = useSetAtom(workflowStatusAtom);

	const syncWorkspaceProject = useCallback(
		async (projectPath?: string | null) => {
			const pickedPaths = projectPath ? [projectPath] : await globalThis.lazify.selectDirectories();

			if (pickedPaths.length === 0) {
				return null;
			}

			const isNewSync = projectPath == null;
			const pathsToSync = isNewSync
				? pickedPaths.filter((path) => !syncedWorkspaceProjects.some((p) => p.projectPath === path))
				: pickedPaths;

			if (pathsToSync.length === 0) {
				throw new Error(
					pickedPaths.length === 1
						? "This project is already synced to the workspace."
						: "Those projects are already synced to the workspace.",
				);
			}

			const syncedProjects: SyncedWorkspaceProject[] = [];

			for (const path of pathsToSync) {
				const result = await globalThis.lazify.importProjectIndexFromDirectory(path);
				const syncedProject: SyncedWorkspaceProject = {
					id: result.projectPath,
					projectName: result.projectName,
					projectPath: result.projectPath,
					stack: result.stackDetection.stack,
					framework: result.stackDetection.framework,
					metaFramework: result.stackDetection.metaFramework,
					packageManager: result.stackDetection.packageManager,
					confidence: result.stackDetection.confidence,
					lastSyncedAt: new Date().toISOString(),
				};

				syncedProjects.push(syncedProject);

				setSyncedWorkspaceProjects((current) => {
					const nextProjects = [
						syncedProject,
						...current.filter((item) => item.projectPath !== syncedProject.projectPath),
					];
					persistWorkspaceProjects(nextProjects);
					return nextProjects;
				});
			}

			setWorkflowStatus("success");
			setStatusMessage(
				syncedProjects.length === 1
					? `Synced project "${syncedProjects[0].projectName}" into Workspace.`
					: `Synced ${syncedProjects.length} projects into Workspace.`,
			);

			return syncedProjects[0];
		},
		[setStatusMessage, setSyncedWorkspaceProjects, setWorkflowStatus, syncedWorkspaceProjects],
	);

	const removeSyncedWorkspaceProject = useCallback(
		(projectPath: string) => {
			setSyncedWorkspaceProjects((current) => {
				const nextProjects = current.filter((item) => item.projectPath !== projectPath);
				persistWorkspaceProjects(nextProjects);
				return nextProjects;
			});
		},
		[setSyncedWorkspaceProjects],
	);

	/**
	 * Moves one project to another's position. The stored array *is* the order
	 * the lists render in, so persisting it is all the reorder has to do — no
	 * separate index to keep in step with syncs and removals.
	 */
	const reorderSyncedWorkspaceProjects = useCallback(
		(fromProjectPath: string, toProjectPath: string) => {
			if (fromProjectPath === toProjectPath) return;

			setSyncedWorkspaceProjects((current) => {
				const fromIndex = current.findIndex((item) => item.projectPath === fromProjectPath);
				const toIndex = current.findIndex((item) => item.projectPath === toProjectPath);

				// A card dropped on something no longer in the list leaves it as-is.
				if (fromIndex === -1 || toIndex === -1) return current;

				const nextProjects = [...current];
				const [moved] = nextProjects.splice(fromIndex, 1);
				nextProjects.splice(toIndex, 0, moved);

				persistWorkspaceProjects(nextProjects);
				return nextProjects;
			});
		},
		[setSyncedWorkspaceProjects],
	);

	const updateProjectNodeVersion = useCallback(
		(projectPath: string, nodeVersion: string | null) => {
			setSyncedWorkspaceProjects((current) => {
				const nextProjects = current.map((item) =>
					item.projectPath === projectPath ? { ...item, nodeVersion } : item,
				);
				persistWorkspaceProjects(nextProjects);
				return nextProjects;
			});
		},
		[setSyncedWorkspaceProjects],
	);

	return {
		syncedWorkspaceProjects,
		syncWorkspaceProject,
		removeSyncedWorkspaceProject,
		reorderSyncedWorkspaceProjects,
		updateProjectNodeVersion,
	};
}
