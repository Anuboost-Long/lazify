import { desktop, type UpdatesStatus } from "@chain/sdk";

import type { UpdateState } from "@/shared/types/updates";

/**
 * In-app updates, on `desktop.updates`. Electron's `updater.ts` flow: a check
 * only reports, downloading and installing are each the user's own click.
 */

let state: UpdateState = { status: "idle" };
const listeners = new Set<(next: UpdateState) => void>();
/** The version the last check offered, named once its download is done. */
let offered: string | null = null;

function setState(next: UpdateState) {
	state = next;
	for (const listener of listeners) listener(next);
}

export function onUpdateStateChanged(callback: (next: UpdateState) => void): () => void {
	listeners.add(callback);
	return () => {
		listeners.delete(callback);
	};
}

const UNSUPPORTED_REASONS: Partial<Record<NonNullable<UpdatesStatus["reason"]>, "development" | "read-only" | "not-configured">> = {
	"dev-build": "development",
	"read-only": "read-only",
	"not-configured": "not-configured",
};

function unsupportedState(status: UpdatesStatus): UpdateState | null {
	return status.supported ? null : { status: "unsupported", reason: status.reason && UNSUPPORTED_REASONS[status.reason] };
}

function failed(error: unknown, fallback: string): UpdateState {
	return { status: "error", message: error instanceof Error ? error.message : fallback };
}

/**
 * The page restarts by reloading, but Chain keeps a downloaded update until
 * quit, so a fresh page asks Chain rather than starting from nothing.
 */
export async function getUpdateState(): Promise<UpdateState> {
	if (state.status !== "idle") return state;

	const status = await desktop.updates.status();
	const settled = unsupportedState(status) ?? (status.downloaded ? { status: "downloaded" as const, version: status.downloaded } : null);
	if (settled) setState(settled);

	return state;
}

/** Asks the feed what is out there. Never throws: the state says. */
export async function checkForUpdates(): Promise<UpdateState> {
	const status = await desktop.updates.status();
	const unsupported = unsupportedState(status);
	if (unsupported) {
		setState(unsupported);
		return state;
	}

	setState({ status: "checking" });
	try {
		const found = await desktop.updates.check();
		offered = found?.version ?? null;
		setState(
			found
				? { status: "available", version: found.version, releaseDate: found.date ?? null, releaseNotes: found.notes ?? null }
				: { status: "current", version: status.currentVersion },
		);
	} catch (error) {
		setState(failed(error, "Update check failed."));
	}

	return state;
}

/** Pulls and verifies the update the last check found. Progress arrives as state changes. */
export async function downloadUpdate(): Promise<UpdateState> {
	const unsupported = unsupportedState(await desktop.updates.status());
	if (unsupported) {
		setState(unsupported);
		return state;
	}

	const started = performance.now();
	setState({ status: "downloading", percent: 0, bytesPerSecond: 0, transferred: 0, total: 0 });
	const stopListening = desktop.updates.onProgress(({ downloaded, total }) => {
		const seconds = (performance.now() - started) / 1000;
		setState({
			status: "downloading",
			percent: total ? (downloaded / total) * 100 : 0,
			bytesPerSecond: seconds > 0 ? downloaded / seconds : 0,
			transferred: downloaded,
			total: total ?? 0,
		});
	});

	try {
		await desktop.updates.download();
		setState({ status: "downloaded", version: offered ?? "" });
	} catch (error) {
		setState(failed(error, "Update download failed."));
	} finally {
		stopListening();
	}

	return state;
}

/**
 * Swaps in the downloaded update and relaunches. Everything the app runs goes
 * down with it, so this is only ever called from a deliberate click.
 */
export async function quitAndInstallUpdate(): Promise<void> {
	if (state.status !== "downloaded") return;

	try {
		await desktop.updates.installAndRelaunch();
	} catch (error) {
		setState(failed(error, "Installing the update failed."));
	}
}
