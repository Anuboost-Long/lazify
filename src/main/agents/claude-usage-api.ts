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
/**
 * The panel refreshes every 15s, but the endpoint is metered and answers 429
 * long before that pays off — the percentages only move once per turn anyway.
 */
const LIVE_TTL_MS = 60_000;
/** How long to stop asking after the account turns us away. */
const COOLDOWN_MS = 5 * 60_000;

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
 * The last reading the account itself gave us, and the moment we may ask again.
 * Kept across refreshes: a 429 says nothing about the numbers, so the previous
 * live answer stays a far better report than the copy Claude Code left on disk
 * hours ago.
 */
let lastLive: ClaudeUtilization | null = null;
let nextAttemptMs = 0;

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

    // A window that has already reset says nothing about the one running now.
    const unexpired = (window: UtilizationWindow | null | undefined) => {
      if (!window) return null;
      const resetsMs = window.resets_at ? Date.parse(window.resets_at) : 0;
      return resetsMs && resetsMs <= Date.now() ? null : window;
    };

    return {
      observedAt: new Date(cachedUsage.fetchedAtMs ?? Date.now()).toISOString(),
      fiveHour: unexpired(cachedUsage.utilization.five_hour),
      sevenDay: unexpired(cachedUsage.utilization.seven_day),
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

    if (!response.ok) {
      // Rate limited or rejected: stand down for a while rather than spending
      // every 15s refresh on another refusal.
      const retryAfter = Number(response.headers.get("retry-after"));
      nextAttemptMs =
        Date.now() +
        (Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1_000
          : COOLDOWN_MS);
      return null;
    }

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
    // Offline or timed out.
    nextAttemptMs = Date.now() + COOLDOWN_MS;
    return null;
  }
}

/** True once a reading is old enough that the account may have moved on. */
function isFresh(reading: ClaudeUtilization | null, ttlMs: number): boolean {
  if (!reading) return false;
  const observedMs = Date.parse(reading.observedAt);
  return Number.isFinite(observedMs) && Date.now() - observedMs < ttlMs;
}

/**
 * Live percentages when the account can be reached, otherwise whatever Claude
 * Code last cached on disk. Null only when neither is available.
 */
export function getClaudeUtilization(): Promise<ClaudeUtilization | null> {
  // Still within the TTL, or told to back off: answer from what we already have
  // instead of asking again.
  if (isFresh(lastLive, LIVE_TTL_MS) || Date.now() < nextAttemptMs) {
    return Promise.resolve(lastLive ?? readCachedUtilization());
  }

  inFlight ??= fetchUtilization()
    .then((live) => {
      if (live) {
        lastLive = live;
        nextAttemptMs = 0;
      }
      return live ?? lastLive ?? readCachedUtilization();
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}
