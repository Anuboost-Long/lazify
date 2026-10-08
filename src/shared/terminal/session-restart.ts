/**
 * Sessions whose ending is expected, because something is replacing them.
 *
 * A killed session normally means the run is over: the terminal is disposed,
 * its tab is dropped, its monitor panel disappears. A restart kills one on
 * purpose and puts another in its place, so everything that reacts to the death
 * asks here first — the tab, the panel and the terminal all stay exactly where
 * they are while the new session takes over behind them.
 *
 * Deliberately its own module rather than a corner of the terminal pool: the
 * tab strip and the monitor wall need the same answer, and neither of them owns
 * a terminal.
 */

const restarting = new Set<string>();

export const beginRestart = (runId: string): void => {
	restarting.add(runId);
};

export const isRestarting = (runId: string): boolean => restarting.has(runId);

export const endRestart = (runId: string): void => {
	restarting.delete(runId);
};

/**
 * A run replaced by another, or by nothing when the restart failed.
 *
 * The same session can be on screen twice — a tab in the workspace and a panel
 * on the monitor wall — and both are holding the old run id. Announcing the
 * swap once lets each of them follow it without either needing to know the
 * other exists, or which of them asked for the restart.
 */
export interface RunReplacement {
	fromRunId: string;
	toRunId: string | null;
}

const replacementListeners = new Set<(replacement: RunReplacement) => void>();

export function onRunReplaced(listener: (replacement: RunReplacement) => void): () => void {
	replacementListeners.add(listener);

	return () => replacementListeners.delete(listener);
}

export function announceReplacement(fromRunId: string, toRunId: string | null): void {
	replacementListeners.forEach((listener) => listener({ fromRunId, toRunId }));
}

/** For tests, which need this as empty as a fresh app. */
export const forgetAllRestarts = (): void => {
	restarting.clear();
};
