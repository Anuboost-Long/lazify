import { useCallback, useEffect, useState } from "react";

import type { ExtensionState, InstallJob } from "@main/extensions";

export type ExtensionAction = "install" | "update" | "remove" | "toggle";

export interface ExtensionsState {
	extensions: ExtensionState[];
	loading: boolean;
	busyId: string | null;
	/** The install running or last finished for each extension, keyed by id. */
	jobs: Record<string, InstallJob>;
	error: string | null;
	refresh: () => void;
	install: (id: string) => void;
	remove: (id: string) => void;
	setEnabled: (id: string, enabled: boolean) => void;
}

const RUNNING_STAGES = new Set(["queued", "downloading", "unpacking"]);

export const isInstalling = (job: InstallJob | undefined): boolean =>
	Boolean(job && RUNNING_STAGES.has(job.stage));

/**
 * The extensions, and what is being downloaded for them.
 *
 * Nothing about an install is kept here: it runs in the main process and this
 * only ever reads it. That is what makes leaving the page and coming back
 * harmless — the jobs are asked for again on mount, so a download that started
 * ten minutes ago is still a download in progress rather than a button waiting
 * to be pressed a second time.
 */
export function useExtensions(active: boolean): ExtensionsState {
	const [extensions, setExtensions] = useState<ExtensionState[]>([]);
	const [loading, setLoading] = useState(false);
	const [busyId, setBusyId] = useState<string | null>(null);
	const [jobs, setJobs] = useState<Record<string, InstallJob>>({});
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
		if (!active) return;

		load(false);
		void globalThis.lazify.extensionInstallJobs().then((running) => {
			setJobs(Object.fromEntries(running.map((job) => [job.id, job])));
		});
	}, [active, load]);

	// A finished install changes what the card offers to do next, so the list is
	// asked for again the moment the download stops.
	useEffect(
		() =>
			globalThis.lazify.onExtensionInstall((job) => {
				setJobs((current) => ({ ...current, [job.id]: job }));

				if (!isInstalling(job)) load(false);
			}),
		[load],
	);

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
		jobs,
		error,
		refresh: useCallback(() => load(true), [load]),
		install: useCallback((id: string) => {
			setError(null);
			void globalThis.lazify
				.installExtension(id)
				.then((job) => setJobs((current) => ({ ...current, [id]: job })))
				.catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)));
		}, []),
		remove: useCallback(
			(id: string) => {
				// Removing settles whatever the last install had to say about it.
				setJobs(({ [id]: dropped, ...rest }) => rest);
				perform(id, () => globalThis.lazify.removeExtension(id));
			},
			[perform],
		),
		setEnabled: useCallback(
			(id: string, enabled: boolean) =>
				perform(id, () => globalThis.lazify.toggleExtension(id, enabled)),
			[perform],
		),
	};
}
