import { installExtension } from "./manager";
import { refreshWrittenManifests } from "./project-manifest";
import { providerFor } from "./providers";
import type { InstallJob, InstallStage } from "./types";

/**
 * An install, tracked where the window cannot lose it.
 *
 * A language server is tens of megabytes: the download outlives the panel that
 * started it, and walking to another page and back used to leave a card that
 * looked untouched — with a button offering to start the whole thing again. So
 * the run lives here, the panel only ever reads it, and coming back to a page
 * shows the download exactly where it had got to.
 *
 * One install per extension. Asking again while one is running hands back the
 * run already going rather than starting a second onto the same folder.
 */

const RUNNING = new Set<InstallStage>(["queued", "downloading", "unpacking"]);

export const isInstalling = (job: InstallJob | null | undefined): boolean =>
	Boolean(job && RUNNING.has(job.stage));

const jobs = new Map<string, InstallJob>();
const listeners = new Set<(job: InstallJob) => void>();

export function onInstallProgress(listener: (job: InstallJob) => void): () => void {
	listeners.add(listener);

	return () => listeners.delete(listener);
}

function publish(job: InstallJob): InstallJob {
	jobs.set(job.id, job);
	listeners.forEach((listener) => listener(job));

	return job;
}

/** Everything the window needs to know on its way back in. */
export const installJobs = (): InstallJob[] => [...jobs.values()];

/**
 * Drops what is remembered about an extension, so a failure that has since been
 * dealt with — by removing what half-landed — stops being reported on the card.
 */
export const forgetInstallJob = (id: string): void => {
	jobs.delete(id);
};

export function beginInstall(id: string): InstallJob {
	const current = jobs.get(id);

	if (isInstalling(current)) return current as InstallJob;

	const provider = providerFor(id);

	if (!provider) throw new Error(`Unknown extension ${id}`);

	/**
	 * An engine that cannot run without a runtime nobody has installed is not
	 * worth the download. The card says so and disables its own button; this is
	 * the same answer for anything that asks anyway.
	 */
	if (!provider.requirement().satisfied) {
		return publish({
			id,
			stage: "failed",
			receivedBytes: 0,
			totalBytes: null,
			error: provider.requirement().note,
			startedAt: new Date().toISOString(),
		});
	}

	const started = publish({
		id,
		stage: "queued",
		receivedBytes: 0,
		totalBytes: null,
		error: null,
		startedAt: new Date().toISOString(),
	});

	void installExtension(id, (progress) => {
		const job = jobs.get(id);

		if (!isInstalling(job)) return;

		publish(
			progress.stage === "downloading"
				? { ...(job as InstallJob), ...progress }
				: { ...(job as InstallJob), stage: "unpacking" },
		);
	})
		.then(async () => {
			publish({ ...(jobs.get(id) as InstallJob), stage: "done" });
			await refreshWrittenManifests();
		})
		.catch((cause: unknown) => {
			publish({
				...(jobs.get(id) as InstallJob),
				stage: "failed",
				error: cause instanceof Error ? cause.message : String(cause),
			});
		});

	return started;
}
