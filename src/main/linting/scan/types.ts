import type { DiagnosticSource, FindingReference } from "../types";

/** One file's findings, named the way the report shows them. */
export interface ScanFileFindings {
	/** Project-relative, so a report reads the same wherever the project sits. */
	path: string;
	findings: FindingReference[];
}

export interface SonarScanReport {
	projectPath: string;
	/** The top-level folders the files came from, e.g. `["src", "tests"]`. */
	roots: string[];
	/** Engines that were installed when this ran: a missing one found nothing. */
	engines: DiagnosticSource[];
	scannedAt: string;
	durationMs: number;
	fileCount: number;
	findingCount: number;
	/** Files left unread, so a partial answer never reads as a complete one. */
	skippedCount: number;
	/** Only files with something to say — a clean file is not a row. */
	files: ScanFileFindings[];
}

export type SonarScanStatus = "idle" | "running" | "done" | "stopped" | "failed";

/** Why a run ended with nothing, for the surface that has to say so. */
export type SonarScanFailure = "no-engines" | "no-files";

export interface SonarScanState {
	projectPath: string;
	status: SonarScanStatus;
	scanned: number;
	total: number;
	/** The file being analysed, project-relative. */
	current: string | null;
	findingCount: number;
	/** The finished run's report, or the last one read back off disk. */
	report: SonarScanReport | null;
	failure: SonarScanFailure | null;
}
