import {
	disposeLanguageServers,
	type SonarScanState,
	sonarScanState,
	startSonarScan as startScan,
} from "@/shared/lib/linting";

export {
	createFixTask,
	createPhaseTasks,
	lintFile,
	sonarScanState,
	stopSonarScan,
} from "@/shared/lib/linting";

const scanListeners = new Set<(state: SonarScanState) => void>();

const emitScan = (state: SonarScanState) => scanListeners.forEach((listener) => listener(state));

/**
 * Answers with the state the scan starts in and then keeps talking: the window
 * is not waiting on this promise for minutes, it is watching `onSonarScan`.
 */
export async function startSonarScan(projectPath: string): Promise<SonarScanState> {
	void startScan(projectPath, emitScan);

	return sonarScanState(projectPath);
}

export function onSonarScan(callback: (state: SonarScanState) => void): () => void {
	scanListeners.add(callback);

	return () => {
		scanListeners.delete(callback);
	};
}

// A reload loses every handle to the language servers, which would then run
// until Lazify quits; the next page starts its own.
globalThis.addEventListener?.("pagehide", disposeLanguageServers);
