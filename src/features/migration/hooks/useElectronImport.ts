import { useCallback, useEffect, useState } from "react";

import { grantedFolderPaths } from "@/platform/folders";
import { selectDirectories } from "@/platform/projects";
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

export function useElectronImport() {
	const [state, setState] = useState<ImportState>({ kind: "checking" });
	const [granted, setGranted] = useState<string[]>([]);

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
		try {
			setState({ kind: "done", result: await runElectronImport(localStorage) });
		} catch (error) {
			setState({ kind: "error", offer, message: messageOf(error) });
		}
	}, [state]);

	const chooseProjectFolders = useCallback(async () => {
		await selectDirectories();
		setGranted(await grantedFolderPaths());
	}, []);

	return { state, granted, startImport, chooseProjectFolders };
}
