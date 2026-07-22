import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type { AgentRateLimit } from "../../renderer/shared/types/lazify";

/**
 * Codex's rate-limit window, read from the account rather than the transcripts.
 *
 * Codex only learns its own limits from the responses it gets back, so the
 * `rate_limits` block in a rollout file is a snapshot of whenever it last ran —
 * routinely hours old, and blind to Codex usage from any other machine. The
 * ChatGPT backend reports the same window live, so it is asked directly and the
 * transcript value is kept only as a fallback.
 */

const USAGE_URL = "https://chatgpt.com/backend-api/wham/usage";
const AUTH_FILE = path.join(os.homedir(), ".codex", "auth.json");
const REQUEST_TIMEOUT_MS = 8_000;

interface RawWindow {
  used_percent?: number | null;
  limit_window_seconds?: number | null;
  reset_at?: number | null;
}

interface StoredAuth {
  tokens?: { access_token?: string; account_id?: string };
}

/**
 * The call in progress, so overlapping refreshes share one request instead of
 * queueing several. Cleared as soon as it settles: nothing is held between
 * refreshes, and each refresh reports the account as it is right then.
 */
let inFlight: Promise<AgentRateLimit | null> | null = null;

/** `exp` out of a JWT, so an expired token is never spent on a doomed call. */
function expiresAt(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;

    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { exp?: number };

    return typeof claims.exp === "number" ? claims.exp * 1000 : null;
  } catch {
    return null;
  }
}

function readAuth(): { token: string; accountId: string } | null {
  try {
    const tokens = (JSON.parse(fs.readFileSync(AUTH_FILE, "utf8")) as StoredAuth)
      .tokens;

    if (!tokens?.access_token || !tokens.account_id) return null;

    const expiry = expiresAt(tokens.access_token);
    if (expiry !== null && expiry <= Date.now()) return null;

    return { token: tokens.access_token, accountId: tokens.account_id };
  } catch {
    // Codex is not installed, or the user has not signed in with ChatGPT.
    return null;
  }
}

function toRateLimit(
  window: RawWindow | null | undefined,
  planType: string | null,
): AgentRateLimit | null {
  if (!window || typeof window.used_percent !== "number") return null;

  return {
    source: "reported",
    usedPercent: window.used_percent,
    windowMinutes: window.limit_window_seconds
      ? Math.round(window.limit_window_seconds / 60)
      : null,
    resetsAt: window.reset_at
      ? new Date(window.reset_at * 1000).toISOString()
      : null,
    planType,
    observedAt: new Date().toISOString(),
  };
}

/**
 * The live window, or null when Codex is not signed in or cannot be reached —
 * in which case the caller keeps whatever the transcripts last recorded.
 */
export function getCodexRateLimit(): Promise<AgentRateLimit | null> {
  inFlight ??= fetchRateLimit().finally(() => {
    inFlight = null;
  });

  return inFlight;
}

async function fetchRateLimit(): Promise<AgentRateLimit | null> {
  const auth = readAuth();
  if (!auth) return null;

  try {
    const response = await fetch(USAGE_URL, {
      headers: {
        Authorization: `Bearer ${auth.token}`,
        "chatgpt-account-id": auth.accountId,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) return null;

    const body = (await response.json()) as {
      plan_type?: string | null;
      rate_limit?: {
        primary_window?: RawWindow | null;
        secondary_window?: RawWindow | null;
      } | null;
    };

    const plan = body.plan_type ?? null;

    return (
      toRateLimit(body.rate_limit?.primary_window, plan) ??
      toRateLimit(body.rate_limit?.secondary_window, plan)
    );
  } catch {
    return null;
  }
}
