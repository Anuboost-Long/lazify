import { expectationsFor, type Expectation } from "./expectations";
import type { ScriptCheck } from "./types";

type Logger = (...values: unknown[]) => void;

const MAX_LOGS = 50;
const MAX_LOG_LENGTH = 2_000;

function printable(value: unknown): string {
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

export interface Recorder {
  logs: string[];
  checks: ScriptCheck[];
  log: (...values: unknown[]) => void;
  console: { log: Logger; info: Logger; warn: Logger; error: Logger; debug: Logger };
  test: (name: string, body: () => void) => void;
  expect: (actual: unknown) => Expectation;
}

export function createRecorder(): Recorder {
  const logs: string[] = [];
  const checks: ScriptCheck[] = [];
  const log: Logger = (...values) => {
    if (logs.length >= MAX_LOGS) return;

    logs.push(values.map(printable).join(" ").slice(0, MAX_LOG_LENGTH));
  };

  return {
    logs,
    checks,
    log,
    console: { log, info: log, warn: log, error: log, debug: log },
    test: (name, body) => {
      try {
        body();
        checks.push({ name: String(name), passed: true, detail: null });
      } catch (error) {
        checks.push({
          name: String(name),
          passed: false,
          detail: error instanceof Error ? error.message : String(error)
        });
      }
    },
    expect: expectationsFor
  };
}
