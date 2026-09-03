import fs from "node:fs/promises";

import type { ArtifactRef, EvidenceItem, RunRecord, StepResult } from "../types";
import { REPORT_STYLES } from "./report-styles";

const ESCAPES: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#39;",
};

function escapeHtml(value: string): string {
	return value.replace(/[&<>"']/g, (character) => ESCAPES[character]);
}

function seconds(milliseconds: number): string {
	return `${(milliseconds / 1000).toFixed(1)}s`;
}

function metaRows(record: RunRecord): string {
	const rows: Array<[string, string]> = [
		["Project", `${record.projectName} — ${record.projectPath}`],
		["Flow", record.flowPath],
		["Target", `${record.target.platform} ${record.target.url || record.target.appId}`.trim()],
		["Started", record.startedAt],
		["Duration", seconds(record.durationMs)],
	];

	if (record.branch) rows.splice(2, 0, ["Branch", `${record.branch} ${record.commit}`.trim()]);
	if (record.failureSummary) rows.push(["Failure", record.failureSummary]);

	return rows
		.map(([label, value]) => `<div>${escapeHtml(label)}</div><div>${escapeHtml(value)}</div>`)
		.join("");
}

function stepRow(step: StepResult): string {
	const detail = step.message ? `<pre>${escapeHtml(step.message)}</pre>` : "";

	return `<div class="row">
  <div class="index">${step.index + 1}</div>
  <div class="body">
    <div>${escapeHtml(step.description)}</div>
    ${detail}
  </div>
  <div class="duration">${seconds(step.durationMs)}</div>
  <div class="status ${step.status}">${step.status}</div>
</div>`;
}

function evidenceRow(item: EvidenceItem): string {
	const detail =
		item.details && item.details !== item.summary ? `<pre>${escapeHtml(item.details)}</pre>` : "";
	const step = item.stepIndex === null ? "" : ` · step ${item.stepIndex + 1}`;

	return `<div class="row severity-${item.severity}">
  <div class="body">
    <div class="source">${escapeHtml(item.source)}${step}</div>
    <div class="summary">${escapeHtml(item.summary)}</div>
    ${detail}
  </div>
</div>`;
}

async function screenshotFigure(artifact: ArtifactRef): Promise<string> {
	try {
		const data = await fs.readFile(artifact.filePath);

		return `<figure>
  <img alt="${escapeHtml(artifact.name)}" src="data:image/png;base64,${data.toString("base64")}" />
  <figcaption>${escapeHtml(artifact.name)}</figcaption>
</figure>`;
	} catch {
		return "";
	}
}

function panel(content: string, emptyMessage: string): string {
	const inner = content || `<div class="empty">${escapeHtml(emptyMessage)}</div>`;

	return `<div class="panel">${inner}</div>`;
}

function tally(steps: StepResult[]): string {
	const counted = (status: StepResult["status"]) =>
		steps.filter((step) => step.status === status).length;

	return `${counted("passed")} passed · ${counted("failed")} failed · ${counted("skipped")} skipped`;
}

export async function renderHtmlReport(record: RunRecord): Promise<string> {
	const screenshots = record.steps.flatMap((step) => step.artifacts);
	const figures = (await Promise.all(screenshots.map(screenshotFigure))).join("");

	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(record.flowName)} — diagnostic run</title>
<style>${REPORT_STYLES}</style>
</head>
<body>
<main>
  <h1>${escapeHtml(record.flowName)}</h1>
  <p class="verdict ${record.state}">${escapeHtml(record.state)} — ${tally(record.steps)}</p>

  <h2>Run</h2>
  <div class="panel meta">${metaRows(record)}</div>

  <h2>Steps</h2>
  ${panel(record.steps.map(stepRow).join(""), "No steps ran.")}

  <h2>Findings</h2>
  ${panel(record.evidence.map(evidenceRow).join(""), "Nothing was reported.")}

  <h2>Screenshots</h2>
  ${panel(figures, "No screenshots were captured.")}
</main>
</body>
</html>`;
}
