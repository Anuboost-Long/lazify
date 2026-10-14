import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { appFolders, nodeFolders } from "../../../platform/node-folders";

vi.mock("@chain/sdk", () => ({ desktop: { folders: nodeFolders } }));
vi.mock("@/platform/exec", () => ({
	currentOs: async () => "macos",
	currentArch: async () => "arm64",
}));

const { getDiagnosticsPaths, getLogFilePath, log, logError, logInfo } = await import(
	"@/shared/lib/diagnostics/logger"
);

const base = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "lazify-logger-")));
appFolders.data = path.join(base, "data");

afterAll(() => fs.rm(base, { recursive: true, force: true }));

beforeEach(() => {
	vi.spyOn(console, "error").mockImplementation(() => undefined);
	vi.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(async () => {
	vi.restoreAllMocks();
	await fs.rm(appFolders.data, { recursive: true, force: true });
});

describe("logger", () => {
	it("creates the log directory on first write", async () => {
		const file = await getLogFilePath();

		expect(await fs.stat(path.dirname(file)).then(() => true, () => false)).toBe(false);

		await logError("pty-runner", "process spawn failed");

		expect(await fs.readFile(file, "utf8")).toContain("ERROR [pty-runner] process spawn failed");
	});

	it("keeps an error's stack, which is the part worth having", async () => {
		await logError("main", "Uncaught exception", new Error("kaboom"));

		const written = await fs.readFile(await getLogFilePath(), "utf8");

		expect(written).toContain("Uncaught exception");
		expect(written).toContain("Error: kaboom");
		expect(written).toMatch(/at /);
	});

	it("stringifies a non-Error detail rather than writing [object Object]", async () => {
		await logError("child-process", "gone", { type: "GPU", exitCode: 139 });

		const written = await fs.readFile(await getLogFilePath(), "utf8");

		expect(written).toContain('"type":"GPU"');
		expect(written).not.toContain("[object Object]");
	});

	it("rotates once past the cap, keeping one generation", async () => {
		const file = await getLogFilePath();

		await fs.mkdir(path.dirname(file), { recursive: true });
		await fs.writeFile(file, "x".repeat(2 * 1024 * 1024 + 1));

		await logInfo("app", "after the cap");

		// The oversized content moved aside; the new file holds only what follows.
		expect(await fs.stat(`${file}.1`).then((stats) => stats.size)).toBeGreaterThan(2 * 1024 * 1024);

		const current = await fs.readFile(file, "utf8");

		expect(current).toContain("after the cap");
		expect(current.length).toBeLessThan(500);
	});

	it("never throws when the log cannot be written", async () => {
		// A file where the log directory should be — mkdir and the write both fail.
		const logsDirectory = path.dirname(await getLogFilePath());

		await fs.mkdir(path.dirname(logsDirectory), { recursive: true });
		await fs.writeFile(logsDirectory, "not a directory");

		await expect(logError("main", "still fine")).resolves.toBeUndefined();
	});

	it("still goes to the console", async () => {
		await logError("main", "after the terminal closed");

		expect(console.error).toHaveBeenCalledOnce();
	});

	it("reports the paths a bug report needs", async () => {
		const info = await getDiagnosticsPaths();

		expect(info.logFile).toBe(path.join(appFolders.data, "logs", "lazify.log"));
		expect(info.appVersion).toBe(__APP_VERSION__);
		expect(info.platform).toBe("macos");
		expect(info.arch).toBe("arm64");
	});

	it("keeps writing across calls instead of overwriting the last line", async () => {
		await logInfo("app", "first");
		await logInfo("app", "second");

		const written = await fs.readFile(await getLogFilePath(), "utf8");
		const lines = written.trim().split("\n");

		expect(lines).toHaveLength(2);
		expect(lines[0]).toContain("first");
		expect(lines[1]).toContain("second");
	});
});

describe("log levels", () => {
	it("labels each level in the line it writes", async () => {
		await log("warn", "scope", "a warning");

		expect(await fs.readFile(await getLogFilePath(), "utf8")).toContain("WARN  [scope] a warning");
	});
});
