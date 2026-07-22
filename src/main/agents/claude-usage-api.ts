import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

/**
 * The 5-hour and 7-day percentages behind Claude Code's `/usage`.
 *
 * Claude Code mirrors its last reading into ~/.claude.json, but only writes it
 * while the CLI itself is running, so that copy is routinely hours stale — and
 * the limit is shared with claude.ai and the desktop app, whose usage never
 * touches this machine at all. Local transcripts cannot stand in for it either:
 * the windows are model-weighted, so tokens counted here do not convert to a
 * percentage. So the account is asked directly, exactly as `/usage` does, and
 * the cached file is kept only as an offline fallback.
 */

const USAGE_URL = "https://api.anthropic.com/api/oauth/usage";
/** Named after the Keychain entry the Claude Code CLI stores its login under. */
const KEYCHAIN_SERVICE = "Claude Code-credentials";
/** Where the CLI keeps the same credentials when there is no Keychain. */
const CREDENTIALS_FILE = path.join(os.homedir(), ".claude", ".credentials.json");
const CLAUDE_CONFIG = path.join(os.homedir(), ".claude.json");
const REQUEST_TIMEOUT_MS = 8_000;

const run = promisify(execFile);

export interface UtilizationWindow {
  utilization?: number | null;
  resets_at?: string | null;
}

export interface ClaudeUtilization {
  observedAt: string;
  fiveHour: UtilizationWindow | null;
  sevenDay: UtilizationWindow | null;
  /** False when this came from the stale on-disk copy rather than the account. */
  live: boolean;
}

interface StoredCredentials {
  claudeAiOauth?: { accessToken?: string; expiresAt?: number };
}

/**
 * The call in progress, so overlapping refreshes share one request instead of
 * queueing several. Cleared as soon as it settles: nothing is held between
 * refreshes, and each refresh reports the account as it is right then.
 */
let inFlight: Promise<ClaudeUtilization | null> | null = null;

/**
 * The CLI's own OAuth token: Keychain on macOS, a plain file elsewhere. Read
 * only, and only ever sent to Anthropic — it is the same token, and the same
 * request, the CLI already makes on this machine.
 */
async function readAccessToken(): Promise<string | null> {
  let raw: string | null = null;

  if (process.platform === "darwin") {
    try {
      const { stdout } = await run("security", [
        "find-generic-password",
        "-s",
        KEYCHAIN_SERVICE,
        "-w",
      ]);
      raw = stdout;
    } catch {
      // Not logged in through the CLI, or the user denied Keychain access.
    }
  }

  if (raw === null) {
    try {
      raw = fs.readFileSync(CREDENTIALS_FILE, "utf8");
    } catch {
      return null;
    }
  }

  try {
    const oauth = (JSON.parse(raw) as StoredCredentials).claudeAiOauth;
    if (!oauth?.accessToken) return null;

    // An expired token would only earn a 401; fall back without spending it.
    if (oauth.expiresAt && oauth.expiresAt <= Date.now()) return null;

    return oauth.accessToken;
  } catch {
    return null;
  }
}

/** The percentages Claude Code last wrote to ~/.claude.json, however old. */
function readCachedUtilization(): ClaudeUtilization | null {
  try {
    const cachedUsage = (
      JSON.parse(fs.readFileSync(CLAUDE_CONFIG, "utf8")) as {
        cachedUsageUtilization?: {
          fetchedAtMs?: number;
          utilization?: {
            five_hour?: UtilizationWindow | null;
            seven_day?: UtilizationWindow | null;
          };
        };
      }
    ).cachedUsageUtilization;

    if (!cachedUsage?.utilization) return null;

    return {
      observedAt: new Date(cachedUsage.fetchedAtMs ?? Date.now()).toISOString(),
      fiveHour: cachedUsage.utilization.five_hour ?? null,
      sevenDay: cachedUsage.utilization.seven_day ?? null,
      live: false,
    };
  } catch {
    return null;
  }
}

async function fetchUtilization(): Promise<ClaudeUtilization | null> {
  const token = await readAccessToken();
  if (!token) return null;

  try {
    const response = await fetch(USAGE_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
        "anthropic-beta": "oauth-2025-04-20",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) return null;

    const body = (await response.json()) as {
      five_hour?: UtilizationWindow | null;
      seven_day?: UtilizationWindow | null;
    };

    return {
      observedAt: new Date().toISOString(),
      fiveHour: body.five_hour ?? null,
      sevenDay: body.seven_day ?? null,
      live: true,
    };
  } catch {
    // Offline, rate limited, or the token was rejected.
    return null;
  }
}

/**
 * Live percentages when the account can be reached, otherwise whatever Claude
 * Code last cached on disk. Null only when neither is available.
 */
export function getClaudeUtilization(): Promise<ClaudeUtilization | null> {
  inFlight ??= fetchUtilization()
    .then((live) => live ?? readCachedUtilization())
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}
