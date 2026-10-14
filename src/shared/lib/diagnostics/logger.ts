import { currentArch, currentOs } from "@/platform/exec";
import { appDataPath, createFolder, fileStat, movePath, pathExists, readTextFile, writeTextFile } from "@/platform/folders";
import path from "@/shared/lib/path";

/**
 * A log file on disk, because an error in a packaged app has no terminal
 * anyone is looking at. When a user says "it doesn't work", this is the
 * difference between guessing and reading.
 *
 * Everything stays local. Nothing is uploaded, which is the whole reason this
 * is a log file rather than telemetry — it costs the user nothing and asks
 * them for nothing.
 */

/** Rotated at 2 MB, one generation kept. Errors only, so this is generous. */
const MAX_LOG_BYTES = 2 * 1024 * 1024;

export type LogLevel = "info" | "warn" | "error";

export interface DiagnosticsPaths {
	logFile: string;
	logDirectory: string;
	appVersion: string;
	platform: string;
	arch: string;
}

async function logDirectory(): Promise<string> {
	return path.join(await appDataPath(), "logs");
}

export async function getLogFilePath(): Promise<string> {
	return path.join(await logDirectory(), "lazify.log");
}

export async function getDiagnosticsPaths(): Promise<DiagnosticsPaths> {
	return {
		logFile: await getLogFilePath(),
		logDirectory: await logDirectory(),
		appVersion: __APP_VERSION__,
		platform: await currentOs(),
		arch: await currentArch(),
	};
}

/** Keeps the current file from growing without bound, one generation back. */
async function rotateIfNeeded(file: string): Promise<void> {
	try {
		if (!(await pathExists(file))) return;
		if ((await fileStat(file)).size < MAX_LOG_BYTES) return;

		await movePath(file, `${file}.1`);
	} catch {
		// A rename that loses a race still leaves the append below working, and
		// a log that cannot rotate is better than no log.
	}
}

/** Errors carry a stack; everything else is whatever it stringifies to. */
function describe(detail: unknown): string {
	if (detail instanceof Error) {
		return detail.stack ?? `${detail.name}: ${detail.message}`;
	}

	if (typeof detail === "string") return detail;

	try {
		return JSON.stringify(detail);
	} catch {
		return String(detail);
	}
}

function writeToConsole(level: LogLevel, line: string) {
	if (level === "error") console.error(line);
	else console.log(line);
}

export async function log(
	level: LogLevel,
	scope: string,
	message: string,
	detail?: unknown,
): Promise<void> {
	const line = `${new Date().toISOString()} ${level.toUpperCase().padEnd(5)} [${scope}] ${message}${
		detail === undefined ? "" : `\n${describe(detail)}`
	}\n`;

	// Still goes to the console, so devtools reads exactly as it always did.
	writeToConsole(level, line.trimEnd());

	try {
		const file = await getLogFilePath();

		await createFolder(path.dirname(file));
		await rotateIfNeeded(file);

		const existing = (await readTextFile(file)) ?? "";

		await writeTextFile(file, existing + line);
	} catch {
		// Logging must never be the thing that breaks the app.
	}
}

export const logInfo = (scope: string, message: string, detail?: unknown) =>
	log("info", scope, message, detail);

export const logWarn = (scope: string, message: string, detail?: unknown) =>
	log("warn", scope, message, detail);

export const logError = (scope: string, message: string, detail?: unknown) =>
	log("error", scope, message, detail);
