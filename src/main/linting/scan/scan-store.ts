import fs from "node:fs";
import path from "node:path";

import { ensureLazifyDirectory } from "../../projects/lazify-directory";
import type { SonarScanReport } from "./types";

/**
 * The last scan, kept beside the project it describes.
 *
 * A scan costs minutes, so reopening the project shows what was found rather
 * than an empty panel with a button. It lands in `.lazify`, which Lazify keeps
 * out of git — a report is about a working tree at a moment, not about the
 * branch everyone shares.
 */

const REPORT_FILE = path.join(".lazify", "sonar-scan.json");
const REPORT_VERSION = 2;

interface StoredReport {
	version: number;
	report: SonarScanReport;
}

const reportPath = (projectPath: string) => path.join(path.resolve(projectPath), REPORT_FILE);

export function readScanReport(projectPath: string): SonarScanReport | null {
	try {
		const stored = JSON.parse(fs.readFileSync(reportPath(projectPath), "utf8")) as StoredReport;

		return stored?.version === REPORT_VERSION &&
			Array.isArray(stored.report?.files) &&
			stored.report?.batch !== undefined
			? stored.report
			: null;
	} catch {
		return null;
	}
}

export function writeScanReport(report: SonarScanReport): void {
	const filePath = reportPath(report.projectPath);

	try {
		ensureLazifyDirectory(report.projectPath, path.dirname(filePath));
		fs.writeFileSync(
			filePath,
			`${JSON.stringify({ version: REPORT_VERSION, report }, null, 2)}\n`,
			"utf8",
		);
	} catch {
		/** A report that cannot be kept is still worth showing. */
	}
}
