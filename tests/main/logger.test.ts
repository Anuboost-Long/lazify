import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  paths: { logs: "", crashDumps: "" },
}));

vi.mock("electron", () => ({
  app: {
    getPath: (name: "logs" | "crashDumps") => mocks.paths[name],
    getVersion: () => "1.0.0",
  },
}));

let dir: string;

beforeEach(async () => {
  dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "lazify-logs-"));
  mocks.paths.logs = path.join(dir, "logs");
  mocks.paths.crashDumps = path.join(dir, "crashes");
  vi.resetModules();
  // The log also goes to the console; keep the test output readable.
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(async () => {
  vi.restoreAllMocks();
  await fs.promises.rm(dir, { recursive: true, force: true });
});

const loadLogger = () => import("../../src/main/diagnostics/logger");

describe("logger", () => {
  it("creates the log directory on first write", async () => {
    const { logError, getLogFilePath } = await loadLogger();

    expect(fs.existsSync(mocks.paths.logs)).toBe(false);
    logError("pty-runner", "node-pty failed to load");

    expect(fs.readFileSync(getLogFilePath(), "utf8")).toContain(
      "ERROR [pty-runner] node-pty failed to load"
    );
  });

  it("keeps an error's stack, which is the part worth having", async () => {
    const { logError, getLogFilePath } = await loadLogger();

    logError("main", "Uncaught exception", new Error("kaboom"));

    const written = fs.readFileSync(getLogFilePath(), "utf8");
    expect(written).toContain("Uncaught exception");
    expect(written).toContain("Error: kaboom");
    expect(written).toMatch(/at /);
  });

  it("stringifies a non-Error detail rather than writing [object Object]", async () => {
    const { logError, getLogFilePath } = await loadLogger();

    logError("child-process", "gone", { type: "GPU", exitCode: 139 });

    const written = fs.readFileSync(getLogFilePath(), "utf8");
    expect(written).toContain('"type":"GPU"');
    expect(written).not.toContain("[object Object]");
  });

  it("rotates once past the cap, keeping one generation", async () => {
    const { logInfo, getLogFilePath } = await loadLogger();
    const file = getLogFilePath();

    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, "x".repeat(2 * 1024 * 1024 + 1));

    logInfo("app", "after the cap");

    // The oversized content moved aside; the new file holds only what follows.
    expect(fs.existsSync(`${file}.1`)).toBe(true);
    expect(fs.statSync(`${file}.1`).size).toBeGreaterThan(2 * 1024 * 1024);
    const current = fs.readFileSync(file, "utf8");
    expect(current).toContain("after the cap");
    expect(current.length).toBeLessThan(500);
  });

  it("never throws when the log cannot be written", async () => {
    const { logError } = await loadLogger();
    // A file where the directory should be — mkdir and append both fail.
    fs.writeFileSync(mocks.paths.logs, "not a directory");

    expect(() => logError("main", "still fine")).not.toThrow();
  });

  it("reports the paths a bug report needs", async () => {
    const { getDiagnosticsPaths } = await loadLogger();
    const info = getDiagnosticsPaths();

    expect(info.logFile).toBe(path.join(mocks.paths.logs, "lazify.log"));
    expect(info.crashDumpDirectory).toBe(mocks.paths.crashDumps);
    expect(info.appVersion).toBe("1.0.0");
    expect(info.platform).toBe(process.platform);
    expect(info.arch).toBe(process.arch);
  });
});
