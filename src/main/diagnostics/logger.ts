import fs from "node:fs";
import path from "node:path";

import { app } from "electron";

/**
 * A log file on disk, because `console.error` in a packaged app writes to a
 * terminal nobody is looking at. When a user says "it doesn't work", this is
 * the difference between guessing and reading.
 *
 * Everything stays local. Nothing is uploaded, which is the whole reason this
 * is a log file rather than telemetry — it costs the user nothing and asks
 * them for nothing.
 *
 * Writes are synchronous on purpose: the last line before a crash is the one
 * worth having, and an async write loses exactly that line.
 */

/** Rotated at 2 MB, one generation kept. Errors only, so this is generous. */
const MAX_LOG_BYTES = 2 * 1024 * 1024;

export type LogLevel = "info" | "warn" | "error";

export interface DiagnosticsPaths {
	logFile: string;
	logDirectory: string;
	crashDumpDirectory: string;
	appVersion: string;
	platform: string;
	arch: string;
	electronVersion: string;
}

function logDirectory(): string {
	// Resolves to ~/Library/Logs/Lazify on macOS and %APPDATA%\Lazify\logs on
	// Windows — where a user (or a support request) would think to look.
	return app.getPath("logs");
}

export function getLogFilePath(): string {
	return path.join(logDirectory(), "lazify.log");
}

export function getDiagnosticsPaths(): DiagnosticsPaths {
	return {
		logFile: getLogFilePath(),
		logDirectory: logDirectory(),
		crashDumpDirectory: app.getPath("crashDumps"),
		appVersion: app.getVersion(),
		platform: process.platform,
		arch: process.arch,
		electronVersion: process.versions.electron,
	};
}

/** Keeps the current file from growing without bound, one generation back. */
function rotateIfNeeded(file: string) {
	try {
		if (fs.statSync(file).size < MAX_LOG_BYTES) return;
		fs.renameSync(file, `${file}.1`);
	} catch {
		// No file yet, or the rename lost a race. Either way the append below
		// still works, and a log that cannot rotate is better than no log.
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

let consoleIsOpen = true;

export function silenceConsole() {
	consoleIsOpen = false;
}

export function ignoreBrokenConsolePipe() {
	for (const stream of [process.stdout, process.stderr]) {
		stream.on("error", silenceConsole);
	}
}

function writeToConsole(level: LogLevel, line: string) {
	if (!consoleIsOpen || process.stdout.destroyed || process.stderr.destroyed) return;

	try {
		if (level === "error") {
			console.error(line);
		} else {
			console.log(line);
		}
	} catch {
		silenceConsole();
	}
}

export function log(level: LogLevel, scope: string, message: string, detail?: unknown) {
	const line = `${new Date().toISOString()} ${level.toUpperCase().padEnd(5)} [${scope}] ${message}${
		detail === undefined ? "" : `\n${describe(detail)}`
	}\n`;

	// Still goes to the console, so `yarn dev` reads exactly as it always did.
	writeToConsole(level, line.trimEnd());

	try {
		const file = getLogFilePath();
		fs.mkdirSync(path.dirname(file), { recursive: true });
		rotateIfNeeded(file);
		fs.appendFileSync(file, line);
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
