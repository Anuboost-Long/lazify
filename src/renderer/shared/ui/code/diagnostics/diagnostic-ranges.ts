/**
 * Placing a finding on the code that was actually painted.
 *
 * Sonar answers in line and column over the file's text; the surface renders a
 * tree of coloured spans. Rather than reconciling the two, the painted text is
 * read back out of the DOM — the same reading find and go-to-definition work
 * from — and the finding's span is measured against that. So the underline
 * lands on the right characters no matter how the highlighter split them.
 */

import type { Diagnostic } from "@main/linting";

import { rangeBetween, scanTextNodes } from "../find/text-ranges";

export interface PlacedDiagnostic {
	diagnostic: Diagnostic;
	range: Range;
}

/** Where each line begins in the scanned text, so a column can be resolved. */
function lineStarts(text: string): number[] {
	const starts = [0];

	for (let at = text.indexOf("\n"); at !== -1; at = text.indexOf("\n", at + 1)) {
		starts.push(at + 1);
	}

	return starts;
}

export function placeDiagnostics(
	root: HTMLElement,
	diagnostics: readonly Diagnostic[],
): PlacedDiagnostic[] {
	const { text, pieces } = scanTextNodes(root);

	if (pieces.length === 0) return [];

	const starts = lineStarts(text);

	/** Null when the finding names a line this surface is not showing. */
	const offsetAt = (line: number, column: number): number | null => {
		const start = starts[line - 1];

		if (start === undefined) return null;

		// Held inside its own line: a column past the end would otherwise reach
		// into the next one and underline the wrong code.
		return Math.min(start + Math.max(column - 1, 0), (starts[line] ?? text.length + 1) - 1);
	};

	const placed: PlacedDiagnostic[] = [];

	for (const diagnostic of diagnostics) {
		const from = offsetAt(diagnostic.line, diagnostic.column);
		const to = offsetAt(diagnostic.endLine, diagnostic.endColumn);

		if (from === null || to === null) continue;

		// A rule that points at a spot rather than a span still has to underline
		// something, so it takes the character it is pointing at.
		placed.push({ diagnostic, range: rangeBetween(pieces, from, Math.max(to, from + 1)) });
	}

	return placed;
}
