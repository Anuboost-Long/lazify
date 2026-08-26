import path from "node:path";

import type { Diagnostic, LintResult } from "./types";

/**
 * Findings written for an agent that is mid-edit.
 *
 * Nothing here repeats what the agent already has. It wrote the file a moment
 * ago and can open it again, so no snippet travels — only the rule, where it
 * fired, and the page to read if the wording is not enough. This text is fed
 * back on every write, so its length is a running cost.
 *
 * A clean file produces nothing at all: silence is how the agent is told to
 * carry on.
 */

const ENGINE_NAME: Record<string, string> = {
	sonarlint: "SonarQube for IDE",
	tailwindcss: "Tailwind CSS",
};

function engineOf(results: LintResult[]): string {
	const sources = new Set(
		results.flatMap((result) => result.diagnostics.map((diagnostic) => diagnostic.source)),
	);

	return sources.size === 1 ? (ENGINE_NAME[[...sources][0]] ?? "Code quality") : "Code quality";
}

function relativeTo(projectPath: string, filePath: string): string {
	const relative = path.relative(projectPath, filePath);

	return relative && !relative.startsWith("..") ? relative : filePath;
}

function lineOf(diagnostic: Diagnostic): string {
	const rule = diagnostic.code ? `${diagnostic.code} (${diagnostic.rule})` : diagnostic.rule;
	const where = `${diagnostic.line}:${diagnostic.column}`;

	return `  ${where}  ${rule}  ${diagnostic.message}${diagnostic.url ? `  ${diagnostic.url}` : ""}`;
}

const CLOSING = [
	"Fix these before moving on. Leave the surrounding behaviour unchanged, and",
	"do not reformat code the rules are not about.",
];

export function buildLintReport(results: LintResult[], projectPath: string): string {
	const found = results.filter((result) => result.diagnostics.length > 0);

	if (found.length === 0) return "";

	const total = found.reduce((count, result) => count + result.diagnostics.length, 0);

	return [
		`${total} ${engineOf(found)} ${total === 1 ? "finding" : "findings"} in the ${
			found.length === 1 ? "file you just wrote" : "files you just wrote"
		}:`,
		"",
		...found.flatMap((result) => [
			relativeTo(projectPath, result.path),
			...result.diagnostics.map(lineOf),
			"",
		]),
		...CLOSING,
	].join("\n");
}
