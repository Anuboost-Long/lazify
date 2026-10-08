/** Which engine reported a finding, so groups stay tellable apart. */
export type DiagnosticSource = "sonarlint" | "tailwindcss";

/** One thing an engine found, placed on the exact span it is talking about. */
export interface Diagnostic {
	source: DiagnosticSource;
	/** The rule that reported it, e.g. `sonarjs/no-dead-store`. */
	rule: string;
	/** Sonar's own rule number, e.g. `S1854`, for the reader who knows them. */
	code: string | null;
	message: string;
	/** The rule's page in Sonar's rule index. */
	url: string | null;
	/** 1-based, and `end` is exclusive — ESLint's own convention, kept. */
	line: number;
	column: number;
	endLine: number;
	endColumn: number;
}

export interface LintResult {
	/** The file this describes, as it was asked about. */
	path: string;
	/** Every engine's findings, in engine order — what the underlines paint from. */
	diagnostics: Diagnostic[];
}

/**
 * A finding, with the code it is about.
 *
 * A rule reports the span it objects to, which on its own is often a fragment —
 * half a condition, one identifier. Anything that has to act on it later needs
 * the statement it sits in, so the surrounding lines travel with it.
 */
export interface FindingReference {
	diagnostic: Diagnostic;
	/** Absolute, so whoever picks this up opens the file rather than hunts it. */
	filePath: string;
	snippet: string;
	/** 1-based line the snippet starts at, so lines can be counted from it. */
	snippetStartLine: number;
}
