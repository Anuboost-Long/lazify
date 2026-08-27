import fs from "node:fs/promises";
import path from "node:path";

import { activeExtensionRoot, PROVIDERS } from "../../extensions";
import { findingReference } from "../finding-snippet";
import { lintFile } from "../lint-file";
import type { DiagnosticSource, FindingReference } from "../types";
import { readScanReport, writeScanReport } from "./scan-store";
import { collectScanFiles } from "./source-files";
import type { ScanFileFindings, SonarScanReport, SonarScanState } from "./types";

/**
 * A whole project put through the same engines the editor uses.
 *
 * The scan outlives the panel that started it: it runs here, keeps its own
 * progress, and pushes each step to whoever is listening, so closing the panel
 * or walking to another page does not lose the run. Asking again while one is
 * running joins that run rather than starting a second.
 *
 * Files go through a few at a time. A language server answers one document at a
 * time anyway, and a queue deeper than this only makes the first answer later.
 */

const CONCURRENCY = 3;

const states = new Map<string, SonarScanState>();
const cancelled = new Set<string>();

const relativeTo = (projectPath: string, filePath: string) =>
	path.relative(path.resolve(projectPath), filePath).split(path.sep).join("/");

function idle(projectPath: string): SonarScanState {
	return {
		projectPath,
		status: "idle",
		scanned: 0,
		total: 0,
		current: null,
		findingCount: 0,
		report: readScanReport(projectPath),
		failure: null,
	};
}

/** What the panel opens on: the run in flight, or the last one that finished. */
export function sonarScanState(projectPath: string): SonarScanState {
	const known = states.get(projectPath);

	if (known) return known;

	const state = idle(projectPath);

	states.set(projectPath, state);

	return state;
}

/** Only an installed engine reports anything, so the report says which ran. */
function activeEngines(): DiagnosticSource[] {
	return PROVIDERS.filter((provider) => activeExtensionRoot(provider.entry.id)).map(
		(provider) => provider.diagnosticSource as DiagnosticSource,
	);
}

async function findingsFor(filePath: string): Promise<FindingReference[]> {
	try {
		const content = await fs.readFile(filePath, "utf8");
		const result = await lintFile(filePath, content);

		return result.diagnostics
			.map((diagnostic) => findingReference(content, filePath, diagnostic))
			.filter((finding): finding is FindingReference => finding !== null);
	} catch {
		return [];
	}
}

export type ScanListener = (state: SonarScanState) => void;

export async function startSonarScan(
	projectPath: string,
	emit: ScanListener,
): Promise<SonarScanState> {
	const running = states.get(projectPath);

	if (running?.status === "running") return running;

	const publish = (next: SonarScanState) => {
		states.set(projectPath, next);
		/**
		 * A step is sent once per file and the report it carries has not changed
		 * since the last one, so progress travels without it. Whoever is watching
		 * keeps the report it already has until a finished run replaces it.
		 */
		emit(next.status === "running" ? { ...next, report: null } : next);

		return next;
	};

	const engines = activeEngines();
	const previous = sonarScanState(projectPath).report;

	if (engines.length === 0) {
		return publish({ ...idle(projectPath), status: "failed", failure: "no-engines" });
	}

	const { files, roots, skipped } = collectScanFiles(projectPath);

	if (files.length === 0) {
		return publish({ ...idle(projectPath), status: "failed", failure: "no-files" });
	}

	cancelled.delete(projectPath);

	const started = Date.now();
	const found: ScanFileFindings[] = [];

	let state = publish({
		projectPath,
		status: "running",
		scanned: 0,
		total: files.length,
		current: relativeTo(projectPath, files[0]),
		findingCount: 0,
		report: previous,
		failure: null,
	});

	let next = 0;

	const consume = async () => {
		while (next < files.length && !cancelled.has(projectPath)) {
			const filePath = files[next++];
			const findings = await findingsFor(filePath);

			if (findings.length > 0) {
				found.push({ path: relativeTo(projectPath, filePath), findings });
			}

			state = publish({
				...state,
				scanned: state.scanned + 1,
				current: relativeTo(projectPath, filePath),
				findingCount: state.findingCount + findings.length,
			});
		}
	};

	await Promise.all(Array.from({ length: Math.min(CONCURRENCY, files.length) }, () => consume()));

	const stopped = cancelled.has(projectPath);
	const report: SonarScanReport = {
		projectPath,
		roots,
		engines,
		scannedAt: new Date().toISOString(),
		durationMs: Date.now() - started,
		fileCount: state.scanned,
		findingCount: found.reduce((count, file) => count + file.findings.length, 0),
		skippedCount: skipped + (files.length - state.scanned),
		files: found.sort((left, right) => left.path.localeCompare(right.path)),
	};

	writeScanReport(report);
	cancelled.delete(projectPath);

	return publish({
		...state,
		status: stopped ? "stopped" : "done",
		current: null,
		report,
	});
}

/** The run stops after the files already in flight, and keeps what it found. */
export function stopSonarScan(projectPath: string): SonarScanState {
	if (states.get(projectPath)?.status === "running") cancelled.add(projectPath);

	return sonarScanState(projectPath);
}
