import type { Diagnostic, FindingReference } from "./types";

/**
 * The code a finding is about, plus enough around it to act on.
 *
 * A rule reports the span it objects to, which on its own is often a fragment —
 * half a condition, one identifier. Whoever fixes it needs the statement it
 * sits in, so a few lines either side come along.
 */

/** Enough to see the function the finding sits in, without sending the file. */
const PADDING = 4;

export interface DiagnosticSnippet {
	text: string;
	/** 1-based line the snippet starts at. */
	startLine: number;
}

export function snippetAround(content: string, diagnostic: Diagnostic): DiagnosticSnippet {
	const lines = content.split("\n");
	const startLine = Math.max(1, diagnostic.line - PADDING);
	const endLine = Math.min(lines.length, diagnostic.endLine + PADDING);

	return { text: lines.slice(startLine - 1, endLine).join("\n"), startLine };
}

/**
 * A finding packed with the code around it, ready to hand on. Null where the
 * file cannot be named — nothing downstream could open it.
 */
export function findingReference(
	content: string,
	filePath: string | null | undefined,
	diagnostic: Diagnostic,
): FindingReference | null {
	if (!filePath) return null;

	const snippet = snippetAround(content, diagnostic);

	return {
		diagnostic,
		filePath,
		snippet: snippet.text,
		snippetStartLine: snippet.startLine,
	};
}
