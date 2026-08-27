import { useCallback, useEffect, useState } from "react";

import type { SonarScanState } from "@main/linting";

/**
 * The scan as this panel sees it.
 *
 * The run itself lives in the main process, so this only ever reflects: the
 * state it is handed on mount is whatever is already true — a run in flight, or
 * the last report read back off disk — and every step after that arrives on the
 * progress channel. Closing the panel or leaving the page changes nothing about
 * the run.
 */
export function useSonarScan(projectPath: string) {
	const [state, setState] = useState<SonarScanState | null>(null);

	/**
	 * A reply to `start` can land after progress has already moved on. Steps
	 * only ever count up, so an older one is dropped rather than shown.
	 *
	 * A step in flight carries no report — it has not changed — so the last one
	 * stays on screen and the list keeps reading while the next run walks the
	 * project.
	 */
	const apply = useCallback((next: SonarScanState) => {
		setState((current) => {
			if (!current || current.projectPath !== next.projectPath) return next;

			const stale =
				next.status === "running" && current.status === "running" && next.scanned < current.scanned;

			return stale ? current : { ...next, report: next.report ?? current.report };
		});
	}, []);

	useEffect(() => {
		let watching = true;

		void globalThis.lazify.sonarScanState(projectPath).then((next) => {
			if (watching) setState(next);
		});

		return () => {
			watching = false;
		};
	}, [projectPath]);

	useEffect(
		() =>
			globalThis.lazify.onSonarScan((next) => {
				if (next.projectPath === projectPath) apply(next);
			}),
		[projectPath, apply],
	);

	return {
		state,
		start: () => void globalThis.lazify.startSonarScan(projectPath).then(apply),
		stop: () => void globalThis.lazify.stopSonarScan(projectPath).then(apply),
	};
}
