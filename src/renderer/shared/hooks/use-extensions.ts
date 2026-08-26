import { useCallback, useEffect, useState } from "react";

import type { ExtensionState } from "@main/extensions";

export type ExtensionAction = "install" | "update" | "remove" | "toggle";

export interface ExtensionsState {
	extensions: ExtensionState[];
	loading: boolean;
	busyId: string | null;
	error: string | null;
	refresh: () => void;
	install: (id: string) => void;
	remove: (id: string) => void;
	setEnabled: (id: string, enabled: boolean) => void;
}

export function useExtensions(active: boolean): ExtensionsState {
	const [extensions, setExtensions] = useState<ExtensionState[]>([]);
	const [loading, setLoading] = useState(false);
	const [busyId, setBusyId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback((refresh: boolean) => {
		setLoading(true);
		void globalThis.lazify
			.listExtensions(refresh)
			.then(setExtensions)
			.catch(() => setExtensions([]))
			.finally(() => setLoading(false));
	}, []);

	useEffect(() => {
		if (active) load(false);
	}, [active, load]);

	const perform = useCallback((id: string, work: () => Promise<ExtensionState[]>) => {
		setBusyId(id);
		setError(null);
		void work()
			.then(setExtensions)
			.catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)))
			.finally(() => setBusyId(null));
	}, []);

	return {
		extensions,
		loading,
		busyId,
		error,
		refresh: useCallback(() => load(true), [load]),
		install: useCallback(
			(id: string) => perform(id, () => globalThis.lazify.installExtension(id)),
			[perform],
		),
		remove: useCallback(
			(id: string) => perform(id, () => globalThis.lazify.removeExtension(id)),
			[perform],
		),
		setEnabled: useCallback(
			(id: string, enabled: boolean) =>
				perform(id, () => globalThis.lazify.toggleExtension(id, enabled)),
			[perform],
		),
	};
}
