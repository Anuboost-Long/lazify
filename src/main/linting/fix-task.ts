import path from "node:path";

import { createTask, type Task, type TaskInput } from "../tasks";
import type { FindingReference } from "./types";

/**
 * A batch of findings, written down as a task.
 *
 * The task table already holds the shape this needs: `requirements` is a list
 * of things that must each be true when the work is done, which is exactly what
 * a set of findings is. So one finding becomes one requirement, and the code
 * behind them goes to notes — no schema of its own, and the board, the prompt
 * presets and the agent-run history all work on it the day it is created.
 *
 * What is written has to stand on its own. Whoever opens this task later — a
 * person, or an agent handed the built prompt — was not there when the scan
 * ran, so the rule, its wording, its page, the file, the line and the code are
 * all recorded rather than left to be looked up again.
 */

/** Past this, the notes are longer than anything will read. */
const MAX_NOTES_LENGTH = 16_000;

const FENCE_LANGUAGE: Record<string, string> = {
	mjs: "js",
	cjs: "js",
	mts: "ts",
	cts: "ts",
};

function fenceLanguage(filePath: string): string {
	const extension = path.extname(filePath).slice(1).toLowerCase();

	return FENCE_LANGUAGE[extension] ?? extension;
}

function relativeTo(projectPath: string, filePath: string): string {
	const relative = path.relative(projectPath, filePath);

	// A file outside the project is named in full: a `../../` path would read as
	// if it were somewhere in the tree.
	return relative && !relative.startsWith("..") ? relative : filePath;
}

function spanOf({ diagnostic }: FindingReference): string {
	return diagnostic.line === diagnostic.endLine
		? `${diagnostic.line}`
		: `${diagnostic.line}-${diagnostic.endLine}`;
}

const ruleOf = ({ diagnostic }: FindingReference) => diagnostic.code ?? diagnostic.rule;

/** What the task is called, which is what anyone scanning the board reads. */
function nameFor(findings: FindingReference[], projectPath: string): string {
	const files = new Set(findings.map((finding) => finding.filePath));
	const where =
		files.size === 1
			? `in ${relativeTo(projectPath, findings[0].filePath)}`
			: `across ${files.size} files`;

	return findings.length === 1
		? `Fix ${ruleOf(findings[0])} ${where}`
		: `Fix ${findings.length} ${engineOf(findings)} findings ${where}`;
}

const ENGINE_NAME: Record<string, string> = {
	sonarlint: "SonarQube for IDE",
	tailwindcss: "Tailwind CSS",
};

function engineOf(findings: FindingReference[]): string {
	const sources = new Set(findings.map((finding) => finding.diagnostic.source));

	return sources.size === 1 ? (ENGINE_NAME[[...sources][0]] ?? "Code quality") : "Code quality";
}

function descriptionFor(findings: FindingReference[], projectPath: string): string {
	const files = new Set(findings.map((finding) => finding.filePath));
	const where =
		files.size === 1 ? relativeTo(projectPath, findings[0].filePath) : `${files.size} files`;

	return [
		`${engineOf(findings)} reported ${findings.length} ${findings.length === 1 ? "finding" : "findings"} in ${where}.`,
		"",
		"Each requirement below is one finding. Fix it in place, leave the",
		"surrounding behaviour unchanged, and do not reformat code the rule is",
		"not about.",
	].join("\n");
}

/** One line per finding: the rule, where it is, and what it objects to. */
function requirementsFor(findings: FindingReference[], projectPath: string): string[] {
	return findings.map(
		(finding) =>
			`${ruleOf(finding)} · ${relativeTo(projectPath, finding.filePath)}:${spanOf(finding)} — ${finding.diagnostic.message}`,
	);
}

/** The rule pages, listed once each however many findings quote them. */
function rulesSection(findings: FindingReference[]): string[] {
	const pages = new Map<string, string>();

	for (const finding of findings) {
		if (finding.diagnostic.url) pages.set(ruleOf(finding), finding.diagnostic.url);
	}

	if (pages.size === 0) return [];

	return ["Rules", ...Array.from(pages, ([rule, url]) => `  ${rule}  ${url}`), ""];
}

/**
 * The code behind each finding, until the notes get longer than anyone reads.
 * What is dropped is said out loud rather than silently missing — the file and
 * line are already in the requirements, so the work is still doable.
 */
function snippetsSection(findings: FindingReference[], projectPath: string): string[] {
	const lines: string[] = [];
	let length = 0;
	let dropped = 0;

	for (const finding of findings) {
		const fence = "```";
		const block = [
			`${relativeTo(projectPath, finding.filePath)}:${spanOf(finding)} (${ruleOf(finding)}), shown from line ${finding.snippetStartLine}:`,
			`${fence}${fenceLanguage(finding.filePath)}`,
			finding.snippet,
			fence,
			"",
		];
		const size = block.join("\n").length;

		if (length + size > MAX_NOTES_LENGTH) {
			dropped += 1;
			continue;
		}

		lines.push(...block);
		length += size;
	}

	if (dropped > 0) {
		lines.push(`(${dropped} more finding${dropped === 1 ? "" : "s"} listed above without code.)`);
	}

	return lines;
}

export interface FixTaskInput {
	projectPath: string;
	findings: FindingReference[];
	/** Preset the prompt is usually built with, or null to decide each time. */
	presetId?: string | null;
}

/** The task as it will be stored, without storing it — for a preview. */
export function describeFixTask({
	projectPath,
	findings,
	presetId = null,
}: FixTaskInput): TaskInput | null {
	if (findings.length === 0) return null;

	return {
		projectPath,
		name: nameFor(findings, projectPath),
		description: descriptionFor(findings, projectPath),
		requirements: requirementsFor(findings, projectPath),
		notes: [...rulesSection(findings), ...snippetsSection(findings, projectPath)]
			.join("\n")
			.trimEnd(),
		presetId,
		priority: "normal",
		deadline: null,
	};
}

export function createFixTask(input: FixTaskInput): Task | null {
	const described = describeFixTask(input);

	return described ? createTask(described) : null;
}
