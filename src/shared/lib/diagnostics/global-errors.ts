import { logError } from "./logger";

/**
 * An error nothing in the app caught.
 *
 * There is no separate process watching this one from outside, the way
 * Electron's main process watches its renderer — this *is* the renderer, so
 * the best it can do about its own uncaught errors is write them down and
 * stop pretending the window still works. A second error while the first is
 * already shown is still logged, just not shown again — the same "don't
 * prompt twice" rule Electron's fatal-error handling used.
 *
 * An unhandled promise rejection is logged but never fatal, carried over from
 * Electron's own reasoning for that one exactly: it's usually a failed fetch
 * or a call to a feature this app hasn't ported yet, not a corrupted window —
 * showing the fatal screen over one would throw away work for something nothing
 * here actually depended on recovering from.
 */

export interface FatalError {
	scope: string;
	message: string;
	detail: unknown;
}

let fatal: FatalError | null = null;
const listeners = new Set<(error: FatalError) => void>();

export const getFatalError = () => fatal;

export function onFatalError(callback: (error: FatalError) => void): () => void {
	listeners.add(callback);

	return () => {
		listeners.delete(callback);
	};
}

function recordFatal(scope: string, message: string, detail: unknown) {
	void logError(scope, fatal ? `Further error while showing one: ${message}` : message, detail);

	if (fatal) return;

	fatal = { scope, message, detail };
	listeners.forEach((listener) => listener(fatal!));
}

let installed = false;

export function installGlobalErrorLogging(): void {
	if (installed) return;

	installed = true;

	globalThis.addEventListener("error", (event) => {
		recordFatal("window", event.message, event.error ?? event.message);
	});

	globalThis.addEventListener("unhandledrejection", (event) => {
		void logError("window", "Unhandled rejection", event.reason);
	});
}

/** Test seam: the module-level fatal state is deliberately sticky. */
export function resetFatalErrorForTests(): void {
	fatal = null;
}
