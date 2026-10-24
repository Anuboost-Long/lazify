import { useSetAtom } from "jotai";
import { useCallback, useEffect, useState } from "react";

import { grantedFolderPaths } from "@/platform/folders";
import { syncedWorkspaceProjectsAtom } from "@/shared/hooks/lazify-store/atoms";
import { readStoredWorkspaceProjects } from "@/shared/hooks/lazify-store/storage";
import { AlreadySyncedError, useWorkspaceProjects } from "@/shared/hooks/lazify-store/use-workspace-projects";
import {
	offerElectronImport,
	runElectronImport,
	type ElectronImportResult,
	type ImportOffer,
} from "@/shared/lib/migration/electron-import";

export type ImportState =
	| { kind: "checking" }
	| { kind: "none" }
	| { kind: "offer"; offer: ImportOffer }
	| { kind: "importing"; offer: ImportOffer }
	| { kind: "done"; result: ElectronImportResult }
	| { kind: "error"; offer: ImportOffer; message: string };

const messageOf = (error: unknown) =>
	error instanceof Error ? error.message : ((error as { message?: string } | null)?.message ?? String(error));

const isInside = (folders: string[], path: string) =>
	folders.some((folder) => path === folder || path.startsWith(`${folder}/`));

export function useElectronImport() {
	const [state, setState] = useState<ImportState>({ kind: "checking" });
	const [granted, setGranted] = useState<string[]>([]);
	const { syncWorkspaceProject } = useWorkspaceProjects();
	const setSyncedWorkspaceProjects = useSetAtom(syncedWorkspaceProjectsAtom);

	useEffect(() => {
		let cancelled = false;
		void offerElectronImport().then(
			(offer) => {
				if (!cancelled) setState(offer ? { kind: "offer", offer } : { kind: "none" });
			},
			() => {
				if (!cancelled) setState({ kind: "none" });
			},
		);
		void grantedFolderPaths().then((paths) => {
			if (!cancelled) setGranted(paths);
		});

		return () => {
			cancelled = true;
		};
	}, []);

	const startImport = useCallback(async () => {
		if (state.kind !== "offer" && state.kind !== "error") return;

		const { offer } = state;
		setState({ kind: "importing", offer });
		let result: ElectronImportResult;
		try {
			result = await runElectronImport(localStorage);
		} catch (error) {
			setState({ kind: "error", offer, message: messageOf(error) });
			return;
		}

		setSyncedWorkspaceProjects(readStoredWorkspaceProjects());
		const reachable = await grantedFolderPaths();
		await Promise.all(
			result.projects
				.filter((project) => project.exists && isInside(reachable, project.path))
				.map((project) => syncWorkspaceProject(project.path).catch(() => undefined)),
		);
		setState({ kind: "done", result });
	}, [state, setSyncedWorkspaceProjects, syncWorkspaceProject]);

	const chooseProjectFolders = useCallback(async () => {
		try {
			await syncWorkspaceProject();
		} catch (error) {
			if (!(error instanceof AlreadySyncedError)) throw error;
		}
		setGranted(await grantedFolderPaths());
	}, [syncWorkspaceProject]);

	return { state, granted, startImport, chooseProjectFolders };
}
