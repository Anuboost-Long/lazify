import { useEffect, useState } from "react";

import type { Diagnostic } from "@main/linting";

/**
 * Code quality findings for the one file being looked at.
 *
 * Analysis is per file and per buffer, never per project: the file in front of
 * the reader is the only one whose findings anyone can act on, and scanning a
 * thousand others to underline this one would cost seconds for an answer that
 * is thrown away on the next click. So a scan is one path and one string.
 *
 * The buffer travels rather than the path, so an unsaved edit is analysed as it
 * stands — the same reason a linter in an editor does not wait for a save.
 */

/** Long enough that a burst of typing is one scan, short enough to feel live. */
const SETTLE_MS = 400;

export interface DiagnosticsState {
	diagnostics: Diagnostic[];
	scanning: boolean;
}

const IDLE: DiagnosticsState = { diagnostics: [], scanning: false };

export function useDiagnostics(
	filePath: string | null | undefined,
	content: string,
	enabled = true,
): DiagnosticsState {
	const [state, setState] = useState<DiagnosticsState>(IDLE);

	useEffect(() => {
		if (!enabled || !filePath) {
			setState(IDLE);
			return;
		}

		// Kept over the whole effect rather than only the timer: the scan itself is
		// a round trip, and its answer belongs to the buffer that asked for it.
		let live = true;

		setState((current) => ({ ...current, scanning: true }));

		const timer = globalThis.setTimeout(() => {
			void globalThis.lazify.lintFile(filePath, content).then((result) => {
				if (!live) return;

				setState({ diagnostics: result.diagnostics, scanning: false });
			});
		}, SETTLE_MS);

		return () => {
			live = false;
			clearTimeout(timer);
		};
	}, [filePath, content, enabled]);

	return state;
}
