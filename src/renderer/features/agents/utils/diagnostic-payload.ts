import type { FindingReference } from "@main/linting";

import type { AgentPayload } from "../components/send-to-agent";

/**
 * Findings, written out as an errand an agent can act on.
 *
 * Everything the rule knows goes in — its number, its wording, its page — and
 * so does the code around it, because the agent is being asked to change files
 * it has not read. Locations are absolute so it opens them directly rather than
 * searching.
 *
 * One finding reads as a single instruction; several read as a numbered list,
 * because an agent handed a batch has to be able to tell them apart and report
 * on each.
 */

const FENCE_LANGUAGE: Record<string, string> = {
	mjs: "js",
	cjs: "js",
	mts: "ts",
	cts: "ts",
};

function fenceLanguage(filePath: string): string {
	const extension = filePath.split(".").pop()?.toLowerCase() ?? "";

	if (!extension || extension === filePath) return "";

	return FENCE_LANGUAGE[extension] ?? extension;
}

function relativeTo(projectPath: string, filePath: string): string {
	return projectPath && filePath.startsWith(`${projectPath}/`)
		? filePath.slice(projectPath.length + 1)
		: filePath;
}

function spanOf({ diagnostic }: FindingReference): string {
	return diagnostic.line === diagnostic.endLine
		? `${diagnostic.line}`
		: `${diagnostic.line}-${diagnostic.endLine}`;
}

const ruleOf = ({ diagnostic }: FindingReference) => diagnostic.code ?? diagnostic.rule;

const ENGINE_NAME: Record<string, string> = {
	sonarlint: "SonarQube for IDE",
	tailwindcss: "Tailwind CSS",
};

function engineOf(findings: FindingReference[]): string {
	const sources = new Set(findings.map((finding) => finding.diagnostic.source));

	return sources.size === 1 ? (ENGINE_NAME[[...sources][0]] ?? "code quality") : "code quality";
}

/** The rule, the place, and the code — the body every finding contributes. */
function bodyOf(finding: FindingReference): string[] {
	const { diagnostic } = finding;
	const fence = "```";
	const rule = diagnostic.code ? `${diagnostic.code} (${diagnostic.rule})` : diagnostic.rule;

	return [
		`Rule: ${rule}`,
		diagnostic.message,
		diagnostic.url ?? "",
		"",
		`Reported at ${finding.filePath}:${spanOf(finding)}`,
		`Shown here from line ${finding.snippetStartLine}:`,
		"",
		`${fence}${fenceLanguage(finding.filePath)}`,
		finding.snippet,
		fence,
	];
}

const CLOSING = [
	"Fix the finding in place. Leave the surrounding behaviour unchanged, and",
	"do not reformat code the rule is not about.",
];

const BATCH_CLOSING = [
	"Fix each finding in place. Leave the surrounding behaviour unchanged, and",
	"do not reformat code the rules are not about.",
];

function titleFor(findings: FindingReference[], projectPath: string): string {
	const files = new Set(findings.map((finding) => finding.filePath));

	if (findings.length === 1) {
		const only = findings[0];

		return `${ruleOf(only)} · ${relativeTo(projectPath, only.filePath)}:${spanOf(only)}`;
	}

	return files.size === 1
		? `${findings.length} findings · ${relativeTo(projectPath, findings[0].filePath)}`
		: `${findings.length} findings · ${files.size} files`;
}

export function buildFindingsPayload(
	findings: FindingReference[],
	projectPath: string,
): AgentPayload | null {
	if (findings.length === 0) return null;

	const files = new Set(findings.map((finding) => finding.filePath));

	const lines =
		findings.length === 1
			? [
					`Fix a ${engineOf(findings)} finding in ${relativeTo(projectPath, findings[0].filePath)}.`,
					"",
					...bodyOf(findings[0]),
					"",
					...CLOSING,
				]
			: [
					`Fix ${findings.length} ${engineOf(findings)} findings in ${
						files.size === 1 ? relativeTo(projectPath, findings[0].filePath) : `${files.size} files`
					}.`,
					"",
					...findings.flatMap((finding, index) => [
						`--- ${index + 1} of ${findings.length} ---`,
						"",
						...bodyOf(finding),
						"",
					]),
					...BATCH_CLOSING,
				];

	return {
		title: titleFor(findings, projectPath),
		// A rule with no page of its own leaves a gap where its link would be.
		text: lines.join("\n").replace(/\n{3,}/g, "\n\n"),
	};
}
