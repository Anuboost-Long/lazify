import { readTextLossy } from "@/platform/folders";
import { activeExtensionRoot, PROVIDERS } from "@/shared/lib/extensions";
import path from "@/shared/lib/path";

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
/** Runs from the click on: a second click joins one that has not published yet. */
const inFlight = new Set<string>();

const relativeTo = (projectPath: string, filePath: string) =>
	path.relative(path.resolve(projectPath), filePath).split(path.sep).join("/");

async function idle(projectPath: string): Promise<SonarScanState> {
	return {
		projectPath,
		status: "idle",
		scanned: 0,
		total: 0,
		current: null,
		findingCount: 0,
		report: await readScanReport(projectPath),
		failure: null,
	};
}

/** What the panel opens on: the run in flight, or the last one that finished. */
export async function sonarScanState(projectPath: string): Promise<SonarScanState> {
	const known = states.get(projectPath);

	if (known) return known;

	const state = await idle(projectPath);
	// A run may have started while the report was read; it is the newer answer.
	const started = states.get(projectPath);

	if (started) return started;

	states.set(projectPath, state);

	return state;
}

/** Only an installed engine reports anything, so the report says which ran. */
async function activeEngines(): Promise<DiagnosticSource[]> {
	const roots = await Promise.all(PROVIDERS.map((provider) => activeExtensionRoot(provider.entry.id)));

	return PROVIDERS.filter((_provider, index) => roots[index]).map(
		(provider) => provider.diagnosticSource as DiagnosticSource,
	);
}

async function findingsFor(filePath: string): Promise<FindingReference[]> {
	try {
		const content = await readTextLossy(filePath);
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

	if (running?.status === "running" || inFlight.has(projectPath)) return sonarScanState(projectPath);

	inFlight.add(projectPath);

	try {
		return await runScan(projectPath, emit);
	} finally {
		inFlight.delete(projectPath);
	}
}

async function runScan(projectPath: string, emit: ScanListener): Promise<SonarScanState> {
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

	const engines = await activeEngines();
	const previous = (await sonarScanState(projectPath)).report;

	if (engines.length === 0) {
		return publish({ ...(await idle(projectPath)), status: "failed", failure: "no-engines" });
	}

	const { files, roots, batch, nextCursor } = await collectScanFiles(
		projectPath,
		previous?.resumeFrom ?? null,
	);

	if (files.length === 0) {
		return publish({ ...(await idle(projectPath)), status: "failed", failure: "no-files" });
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

	found.sort((left, right) => left.path.localeCompare(right.path));

	const findingCount = found.reduce((count, file) => count + file.findings.length, 0);
	const covered = !stopped && findingCount === 0;

	const report: SonarScanReport = {
		projectPath,
		roots,
		engines,
		scannedAt: new Date().toISOString(),
		durationMs: Date.now() - started,
		fileCount: state.scanned,
		findingCount,
		skippedCount: files.length - state.scanned,
		batch,
		resumeFrom: covered ? nextCursor : relativeTo(projectPath, files[0]),
		files: found,
	};

	await writeScanReport(report);
	cancelled.delete(projectPath);

	return publish({
		...state,
		status: stopped ? "stopped" : "done",
		current: null,
		report,
	});
}

/** The run stops after the files already in flight, and keeps what it found. */
export function stopSonarScan(projectPath: string): Promise<SonarScanState> {
	if (states.get(projectPath)?.status === "running") cancelled.add(projectPath);

	return sonarScanState(projectPath);
}
