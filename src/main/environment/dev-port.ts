import fs from "node:fs";
import net from "node:net";
import path from "node:path";

import type { PackageManager } from "./scanner";

/**
 * Keeps a project's dev server off an occupied port.
 *
 * When the port a dev script would use is already listening, we step up by 1
 * until a free port is found and hand it to the tool through both the `PORT`
 * env var and an appended `--port` flag — between them that covers Vite, Next,
 * CRA, Nuxt, Angular and friends. When the base port is free, or the script is
 * not a recognised dev server, the launch is left exactly as-is.
 */

/** Script names we treat as "run the dev server". */
const DEV_SCRIPTS = new Set(["dev", "start", "serve"]);

/** Default listen ports per tool, used when the script does not name one. */
const FRAMEWORK_PORTS: Array<{ test: RegExp; port: number }> = [
  { test: /\bvite\b/, port: 5173 },
  { test: /\bastro\b/, port: 4321 },
  { test: /\bnext\b/, port: 3000 },
  { test: /\bnuxt\b/, port: 3000 },
  { test: /\bremix\b/, port: 3000 },
  { test: /\breact-scripts\b/, port: 3000 },
  { test: /\bng\b[\s\S]*\bserve\b|@angular/, port: 4200 },
  { test: /\bgatsby\b/, port: 8000 },
  { test: /\bexpo\b/, port: 8081 },
  { test: /\bvue-cli-service\b/, port: 8080 },
  { test: /\bwebpack(-dev-server)?\b/, port: 8080 },
];

export interface DevPortInjection {
  /** Extra CLI args to forward to the script (empty when no change is needed). */
  extraArgs: string[];
  /** Extra env for the process (empty when no change is needed). */
  env: Record<string, string>;
}

const NO_INJECTION: DevPortInjection = { extraArgs: [], env: {} };

/** Resolves true only if the port can currently be bound locally. */
export function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once("error", () => resolve(false));
    tester.once("listening", () => tester.close(() => resolve(true)));
    tester.listen(port, "0.0.0.0");
  });
}

/** First free port at or above `start`, stepping up by 1. */
export async function findFreePort(start: number, maxTries = 100): Promise<number> {
  let port = start;
  for (let attempt = 0; attempt < maxTries; attempt += 1) {
    if (await isPortFree(port)) return port;
    port += 1;
  }
  return start;
}

function readScriptCommand(projectPath: string, scriptName: string): string {
  try {
    const raw = JSON.parse(
      fs.readFileSync(path.join(projectPath, "package.json"), "utf8")
    ) as { scripts?: Record<string, string> };
    return raw.scripts?.[scriptName] ?? "";
  } catch {
    return "";
  }
}

function explicitPort(command: string): number | null {
  const match = command.match(/(?:--port[=\s]+|(?:^|\s)-p\s+|(?:^|\s)PORT=)(\d{2,5})/);
  return match ? Number(match[1]) : null;
}

/** The port a dev script would use, or null when it cannot be determined. */
export function resolveBasePort(command: string): number | null {
  const explicit = explicitPort(command);
  if (explicit !== null) return explicit;
  return FRAMEWORK_PORTS.find(({ test }) => test.test(command))?.port ?? null;
}

/**
 * Works out whether a dev script needs its port bumped, and how to launch it.
 * Returns empty extras when no change is needed, so callers can spread blindly.
 */
export async function resolveDevPortInjection(
  projectPath: string,
  scriptName: string,
  packageManager: PackageManager
): Promise<DevPortInjection> {
  if (!DEV_SCRIPTS.has(scriptName)) return NO_INJECTION;

  const basePort = resolveBasePort(readScriptCommand(projectPath, scriptName));
  if (basePort === null) return NO_INJECTION;
  if (await isPortFree(basePort)) return NO_INJECTION;

  const freePort = await findFreePort(basePort + 1);
  const portArgs = ["--port", String(freePort)];

  return {
    // npm needs `--` to forward args to the underlying tool; yarn forwards directly.
    extraArgs: packageManager === "npm" ? ["--", ...portArgs] : portArgs,
    env: { PORT: String(freePort) },
  };
}
