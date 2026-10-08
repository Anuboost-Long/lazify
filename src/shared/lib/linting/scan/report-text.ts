import { engineName } from "../engine-names";
import type { FindingReference } from "../types";
import type { SonarScanReport } from "./types";

/**
 * The scan as plain text, for pasting somewhere Lazify does not reach.
 *
 * Locations and rules only. Whoever reads this has the repository open, and the
 * code behind each finding travels on the paths that hand work to an agent —
 * putting it here as well would make a report nobody scrolls to the end of.
 */

const ruleOf = ({ diagnostic }: FindingReference) =>
	diagnostic.code ? `${diagnostic.code} (${diagnostic.rule})` : diagnostic.rule;

function lineOf(finding: FindingReference): string {
	const { diagnostic } = finding;
	const where = `${diagnostic.line}:${diagnostic.column}`;

	return `  ${where}  ${ruleOf(finding)}  ${diagnostic.message}${
		diagnostic.url ? `  ${diagnostic.url}` : ""
	}`;
}

export function buildScanReportText(report: SonarScanReport): string {
	const engines = report.engines.map(engineName).join(" and ") || "No engine";
	const scope = report.roots.join(", ");

	return [
		`${engines} · ${report.findingCount} ${report.findingCount === 1 ? "finding" : "findings"} in ${
			report.files.length
		} of ${report.fileCount} files`,
		`Scanned ${scope} in ${report.projectPath} on ${report.scannedAt}`,
		...(report.batch.total > report.batch.end - report.batch.start + 1
			? [`Files ${report.batch.start}-${report.batch.end} of ${report.batch.total}.`]
			: []),
		...(report.skippedCount > 0 ? [`${report.skippedCount} files were not read.`] : []),
		"",
		...report.files.flatMap((file) => [file.path, ...file.findings.map(lineOf), ""]),
	]
		.join("\n")
		.trimEnd();
}
