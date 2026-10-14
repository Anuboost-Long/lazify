import { readTextFile, writeTextFile } from "@/platform/folders";
import path from "@/shared/lib/path";
import { ensureLazifyDirectory } from "@/shared/lib/projects/lazify-directory";

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

export async function readScanReport(projectPath: string): Promise<SonarScanReport | null> {
	try {
		const stored = JSON.parse((await readTextFile(reportPath(projectPath))) ?? "null") as StoredReport | null;

		return stored?.version === REPORT_VERSION &&
			Array.isArray(stored.report?.files) &&
			stored.report?.batch !== undefined
			? stored.report
			: null;
	} catch {
		return null;
	}
}

export async function writeScanReport(report: SonarScanReport): Promise<void> {
	const filePath = reportPath(report.projectPath);

	try {
		await ensureLazifyDirectory(report.projectPath, path.dirname(filePath));
		await writeTextFile(filePath, `${JSON.stringify({ version: REPORT_VERSION, report }, null, 2)}\n`);
	} catch {
		/** A report that cannot be kept is still worth showing. */
	}
}
