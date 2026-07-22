import { app } from "electron";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";

import type {
  AgentRateLimit,
  AgentSessionWindow,
  AgentUsageReport,
  AgentUsageSummary,
  TokenTotals,
} from "../../renderer/shared/types/lazify";
import { listAgentBudgets } from "./agent-limits-store";
import { listCustomAgents } from "./custom-agents-store";

/**
 * Token usage read straight from the agent CLIs' own local transcripts:
 *   Claude Code — ~/.claude/projects/<slug>/<session>.jsonl, one line per
 *     message, assistant lines carrying `message.usage`.
 *   Codex — ~/.codex/sessions/<y>/<m>/<d>/rollout-*.jsonl, whose `token_count`
 *     events carry both per-turn usage and the account's rate-limit window.
 *
 * Transcripts run to hundreds of megabytes, so files are parsed once and their
 * daily totals cached by size/mtime; only the appended tail of a growing file
 * is re-read on later scans.
 */

const DAILY_HISTORY_DAYS = 30;
/** Hourly detail is only kept long enough to resolve the current 5-hour block. */
const HOURLY_HISTORY_DAYS = 3;
/** Claude Code caches what `/usage` prints here, refreshed while a session runs. */
const CLAUDE_CONFIG = ".claude.json";
/** Claude Code and Codex both meter usage in rolling 5-hour blocks. */
const BLOCK_HOURS = 5;
/** Bumped whenever a cached slice's shape changes, which invalidates the file. */
const CACHE_VERSION = 3;

interface FileSlice {
  size: number;
  mtimeMs: number;
  /** Bytes already folded into `daily`; the tail after it is what we re-read. */
  offset: number;
  daily: Record<string, TokenTotals>;
  /** Keyed "YYYY-MM-DDTHH" (UTC), pruned to the last few days. */
  hourly: Record<string, TokenTotals>;
  /** Earliest timestamp seen in each of those hours, so blocks start exactly. */
  hourlyFirst: Record<string, string>;
  lastActivity: string | null;
  rateLimit: AgentRateLimit | null;
  /** Set for session scans: entries older than this are ignored. */
  since?: string;
}

interface UsageCache {
  version?: number;
  agents: Record<string, Record<string, FileSlice>>;
}

let cache: UsageCache | null = null;

function cachePath(): string {
  return path.join(app.getPath("userData"), "agent-usage-cache.json");
}

function readCache(): UsageCache {
  if (cache) return cache;

  try {
    const parsed = JSON.parse(
      fs.readFileSync(cachePath(), "utf8"),
    ) as UsageCache;
    cache =
      parsed.version === CACHE_VERSION
        ? parsed
        : { version: CACHE_VERSION, agents: {} };
  } catch {
    cache = { version: CACHE_VERSION, agents: {} };
  }

  return cache;
}

function writeCache(): void {
  if (!cache) return;

  try {
    fs.mkdirSync(path.dirname(cachePath()), { recursive: true });
    fs.writeFileSync(cachePath(), JSON.stringify(cache), "utf8");
  } catch {
    // A missing cache only costs a slower next scan.
  }
}

function emptyTotals(): TokenTotals {
  return {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    total: 0,
    messages: 0,
  };
}

function addTotals(target: TokenTotals, source: TokenTotals): void {
  target.input += source.input;
  target.output += source.output;
  target.cacheRead += source.cacheRead;
  target.cacheWrite += source.cacheWrite;
  target.total += source.total;
  target.messages += source.messages;
}

function dayKey(timestamp: string): string {
  return timestamp.slice(0, 10);
}

function hourKey(timestamp: string): string {
  return timestamp.slice(0, 13);
}

/** Folds one turn's tokens into both the daily and hourly buckets. */
function record(
  slice: FileSlice,
  timestamp: string,
  totals: TokenTotals,
): void {
  const day = dayKey(timestamp);
  const hour = hourKey(timestamp);

  slice.daily[day] ??= emptyTotals();
  addTotals(slice.daily[day], totals);

  slice.hourly[hour] ??= emptyTotals();
  addTotals(slice.hourly[hour], totals);

  const first = slice.hourlyFirst[hour];
  if (!first || timestamp < first) slice.hourlyFirst[hour] = timestamp;
}

/** Drops hourly detail past the retention window so the cache stays small. */
function pruneHourly(slice: FileSlice, cutoffHour: string): void {
  for (const hour of Object.keys(slice.hourly)) {
    if (hour < cutoffHour) {
      delete slice.hourly[hour];
      delete slice.hourlyFirst[hour];
    }
  }
}

/**
 * Both CLIs meter in rolling 5-hour blocks that open with the first message
 * after the previous block expired, so the same walk works for either: replay
 * the hourly buckets in order and cut a new block whenever the open one has
 * run out.
 */
function currentBlock(
  hourly: Record<string, TokenTotals>,
  hourlyFirst: Record<string, string>,
  budget: number | null,
): AgentSessionWindow | null {
  const hours = Object.keys(hourly).sort((a, b) => a.localeCompare(b));

  if (hours.length === 0) return null;

  let startMs = 0;
  let totals = emptyTotals();

  for (const hour of hours) {
    // Hour keys are UTC, matching the timestamps they were derived from.
    const hourMs = Date.parse(`${hour}:00:00.000Z`);
    if (Number.isNaN(hourMs)) continue;

    if (startMs === 0 || hourMs >= startMs + BLOCK_HOURS * 3_600_000) {
      // The window opens with the first turn of the hour, not on the hour mark.
      const firstTurn = hourlyFirst[hour];
      startMs = firstTurn ? Date.parse(firstTurn) : hourMs;
      totals = emptyTotals();
    }

    addTotals(totals, hourly[hour]);
  }

  const resetsMs = startMs + BLOCK_HOURS * 3_600_000;

  // The last block has already expired — nothing is being metered right now.
  if (resetsMs <= Date.now()) return null;

  return {
    source: "derived",
    startsAt: new Date(startMs).toISOString(),
    resetsAt: new Date(resetsMs).toISOString(),
    hours: BLOCK_HOURS,
    observedAt: null,
    totals,
    budget,
    usedPercent: budget ? Math.min((totals.total / budget) * 100, 100) : null,
  };
}

function listFiles(root: string, depth: number): string[] {
  let entries: fs.Dirent[];

  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries.flatMap((entry) => {
    const full = path.join(root, entry.name);

    if (entry.isDirectory()) return depth > 0 ? listFiles(full, depth - 1) : [];

    return entry.isFile() && entry.name.endsWith(".jsonl") ? [full] : [];
  });
}

/** Streams the bytes after `start`, handing each line to the parser. */
async function readLines(
  filePath: string,
  start: number,
  onLine: (line: string) => void,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const stream = fs.createReadStream(filePath, { start, encoding: "utf8" });
    const lines = readline.createInterface({
      input: stream,
      crlfDelay: Infinity,
    });

    lines.on("line", (line) => {
      if (line.length > 0) onLine(line);
    });
    lines.on("close", resolve);
    stream.on("error", reject);
  });
}

function parseClaudeLine(line: string, slice: FileSlice): void {
  // Cheap reject before the JSON parse — most lines carry no usage at all.
  if (!line.includes('"usage"')) return;

  try {
    const entry = JSON.parse(line) as {
      type?: string;
      timestamp?: string;
      message?: {
        usage?: {
          input_tokens?: number;
          output_tokens?: number;
          cache_read_input_tokens?: number;
          cache_creation_input_tokens?: number;
        };
      };
    };

    const usage = entry.message?.usage;
    if (entry.type !== "assistant" || !usage || !entry.timestamp) return;
    if (slice.since && entry.timestamp < slice.since) return;

    const input = usage.input_tokens ?? 0;
    const output = usage.output_tokens ?? 0;
    const cacheRead = usage.cache_read_input_tokens ?? 0;
    const cacheWrite = usage.cache_creation_input_tokens ?? 0;

    record(slice, entry.timestamp, {
      input,
      output,
      cacheRead,
      cacheWrite,
      total: input + output + cacheRead + cacheWrite,
      messages: 1,
    });

    if (!slice.lastActivity || entry.timestamp > slice.lastActivity) {
      slice.lastActivity = entry.timestamp;
    }
  } catch {
    // Half-written trailing line; the next scan picks it up.
  }
}

function parseCodexLine(line: string, slice: FileSlice): void {
  if (!line.includes('"token_count"')) return;

  try {
    const entry = JSON.parse(line) as {
      timestamp?: string;
      payload?: {
        type?: string;
        info?: {
          last_token_usage?: {
            input_tokens?: number;
            cached_input_tokens?: number;
            output_tokens?: number;
            total_tokens?: number;
          };
        };
        rate_limits?: {
          primary?: RawRateWindow | null;
          secondary?: RawRateWindow | null;
          plan_type?: string | null;
        } | null;
      };
    };

    if (entry.payload?.type !== "token_count" || !entry.timestamp) return;
    if (slice.since && entry.timestamp < slice.since) return;

    // Per-turn usage: summing these reproduces the session's cumulative total.
    const usage = entry.payload.info?.last_token_usage;

    if (usage) {
      const cacheRead = usage.cached_input_tokens ?? 0;
      // Codex counts cached tokens inside input_tokens; split them out.
      const input = Math.max((usage.input_tokens ?? 0) - cacheRead, 0);
      const output = usage.output_tokens ?? 0;

      record(slice, entry.timestamp, {
        input,
        output,
        cacheRead,
        cacheWrite: 0,
        total: usage.total_tokens ?? input + output + cacheRead,
        messages: 1,
      });
    }

    if (!slice.lastActivity || entry.timestamp > slice.lastActivity) {
      slice.lastActivity = entry.timestamp;
    }

    const limits = entry.payload.rate_limits;

    if (limits) {
      const window =
        toRateLimit(
          limits.primary,
          limits.plan_type ?? null,
          entry.timestamp,
        ) ??
        toRateLimit(
          limits.secondary,
          limits.plan_type ?? null,
          entry.timestamp,
        );

      if (window) slice.rateLimit = window;
    }
  } catch {
    // Same as above: skip unparseable lines.
  }
}

interface RawRateWindow {
  used_percent?: number | null;
  window_minutes?: number | null;
  resets_at?: number | null;
}

function toRateLimit(
  window: RawRateWindow | null | undefined,
  planType: string | null,
  observedAt: string,
): AgentRateLimit | null {
  if (!window || typeof window.used_percent !== "number") return null;

  return {
    source: "reported",
    usedPercent: window.used_percent,
    windowMinutes: window.window_minutes ?? null,
    resetsAt: window.resets_at
      ? new Date(window.resets_at * 1000).toISOString()
      : null,
    planType,
    observedAt,
  };
}

/** Re-reads only what changed, then returns every cached slice for the agent. */
async function scanAgent(
  agentId: string,
  files: string[],
  parseLine: (line: string, slice: FileSlice) => void,
): Promise<FileSlice[]> {
  const store = readCache();
  const agentCache = (store.agents[agentId] ??= {});
  const seen = new Set<string>();

  for (const filePath of files) {
    seen.add(filePath);

    let stat: fs.Stats;

    try {
      stat = fs.statSync(filePath);
    } catch {
      continue;
    }

    const cached = agentCache[filePath];

    if (cached?.size === stat.size && cached.mtimeMs === stat.mtimeMs) continue;

    // A file that shrank was rewritten, so its cached totals can't be trusted.
    const reusable = cached && stat.size >= cached.offset ? cached : null;
    const slice: FileSlice = reusable ?? {
      size: 0,
      mtimeMs: 0,
      offset: 0,
      daily: {},
      hourly: {},
      hourlyFirst: {},
      lastActivity: null,
      rateLimit: null,
    };

    await readLines(filePath, slice.offset, (line) => parseLine(line, slice));

    slice.size = stat.size;
    slice.mtimeMs = stat.mtimeMs;
    slice.offset = stat.size;
    agentCache[filePath] = slice;
  }

  const cutoffHour = hourKey(
    new Date(Date.now() - HOURLY_HISTORY_DAYS * 24 * 3_600_000).toISOString(),
  );

  for (const filePath of Object.keys(agentCache)) {
    // Drop transcripts the user deleted so the cache doesn't grow forever.
    if (!seen.has(filePath)) {
      delete agentCache[filePath];
      continue;
    }

    pruneHourly(agentCache[filePath], cutoffHour);
  }

  return Object.values(agentCache);
}

interface UtilizationWindow {
  utilization?: number | null;
  resets_at?: string | null;
}

interface ClaudeUtilization {
  observedAt: string;
  fiveHour: UtilizationWindow | null;
  sevenDay: UtilizationWindow | null;
}

/**
 * The percentages Claude Code shows in `/usage`. It fetches them from the
 * account and caches them in ~/.claude.json, so they are the real limits rather
 * than anything inferred from transcripts — but only as fresh as the last time
 * Claude Code ran, hence `observedAt`.
 */
function readClaudeUtilization(): ClaudeUtilization | null {
  try {
    const raw = fs.readFileSync(path.join(os.homedir(), CLAUDE_CONFIG), "utf8");
    const cached = (
      JSON.parse(raw) as {
        cachedUsageUtilization?: {
          fetchedAtMs?: number;
          utilization?: {
            five_hour?: UtilizationWindow | null;
            seven_day?: UtilizationWindow | null;
          };
        };
      }
    ).cachedUsageUtilization;

    if (!cached?.utilization) return null;

    return {
      observedAt: new Date(cached.fetchedAtMs ?? Date.now()).toISOString(),
      fiveHour: cached.utilization.five_hour ?? null,
      sevenDay: cached.utilization.seven_day ?? null,
    };
  } catch {
    return null;
  }
}

function claudeFiles(): string[] {
  return listFiles(path.join(os.homedir(), ".claude", "projects"), 2);
}

function codexFiles(): string[] {
  return listFiles(path.join(os.homedir(), ".codex", "sessions"), 4);
}

/** Usage recorded after `sinceIso`, read only from transcripts touched since. */
async function scanSince(
  files: string[],
  sinceIso: string,
  parseLine: (line: string, slice: FileSlice) => void,
): Promise<TokenTotals> {
  const sinceMs = Date.parse(sinceIso);
  const totals = emptyTotals();

  for (const filePath of files) {
    try {
      if (fs.statSync(filePath).mtimeMs < sinceMs) continue;
    } catch {
      continue;
    }

    // The parsers drop anything stamped before the session started, so what
    // lands in this throwaway slice is exactly the session's own turns.
    const slice: FileSlice = {
      size: 0,
      mtimeMs: 0,
      offset: 0,
      daily: {},
      hourly: {},
      hourlyFirst: {},
      lastActivity: null,
      rateLimit: null,
      since: sinceIso,
    };

    await readLines(filePath, 0, (line) => parseLine(line, slice));

    for (const totalsForDay of Object.values(slice.daily)) {
      addTotals(totals, totalsForDay);
    }
  }

  return totals;
}

/**
 * Prefers the account's own 5-hour percentage when Claude Code has cached one,
 * keeping the locally derived token counts alongside it; otherwise falls back
 * to the block walked out of the transcripts.
 */
function sessionWindowFor(
  hourly: Record<string, TokenTotals>,
  hourlyFirst: Record<string, string>,
  blockBudget: number | null,
  reported: ClaudeUtilization | null,
): AgentSessionWindow | null {
  const derived = currentBlock(hourly, hourlyFirst, blockBudget);
  const window = reported?.fiveHour;

  if (!window || typeof window.utilization !== "number") return derived;

  const resetsAt = window.resets_at
    ? new Date(window.resets_at).toISOString()
    : null;
  const resetsMs = resetsAt ? Date.parse(resetsAt) : 0;

  // The cached window has already expired, so its percentage says nothing about
  // the block running now — the transcripts are the better answer.
  if (resetsMs && resetsMs <= Date.now()) return derived;

  return {
    source: "reported",
    startsAt: resetsMs
      ? new Date(resetsMs - BLOCK_HOURS * 3_600_000).toISOString()
      : (derived?.startsAt ?? new Date().toISOString()),
    resetsAt: resetsAt ?? derived?.resetsAt ?? new Date().toISOString(),
    hours: BLOCK_HOURS,
    totals: derived?.totals ?? emptyTotals(),
    budget: blockBudget,
    usedPercent: window.utilization,
    observedAt: reported.observedAt,
  };
}

function summarize(
  agentId: string,
  label: string,
  slices: FileSlice[],
  sessionTotals: TokenTotals | null,
  weeklyBudget: number | null,
  blockBudget: number | null,
  reported: ClaudeUtilization | null = null,
): AgentUsageSummary {
  const daily: Record<string, TokenTotals> = {};
  const hourly: Record<string, TokenTotals> = {};
  const hourlyFirst: Record<string, string> = {};
  let lastActivity: string | null = null;
  let rateLimit: AgentRateLimit | null = null;

  for (const slice of slices) {
    for (const [day, totals] of Object.entries(slice.daily)) {
      daily[day] ??= emptyTotals();
      addTotals(daily[day], totals);
    }

    for (const [hour, totals] of Object.entries(slice.hourly)) {
      hourly[hour] ??= emptyTotals();
      addTotals(hourly[hour], totals);
    }

    for (const [hour, first] of Object.entries(slice.hourlyFirst)) {
      if (!hourlyFirst[hour] || first < hourlyFirst[hour])
        hourlyFirst[hour] = first;
    }

    if (
      slice.lastActivity &&
      (!lastActivity || slice.lastActivity > lastActivity)
    ) {
      lastActivity = slice.lastActivity;
    }

    // Keep the most recently observed limit snapshot.
    if (
      slice.rateLimit &&
      (!rateLimit || slice.rateLimit.observedAt > rateLimit.observedAt)
    ) {
      rateLimit = slice.rateLimit;
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const weekStart = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const historyStart = new Date(
    Date.now() - (DAILY_HISTORY_DAYS - 1) * 24 * 60 * 60 * 1000,
  )
    .toISOString()
    .slice(0, 10);

  const allTime = emptyTotals();
  const week = emptyTotals();
  const history: { date: string; total: number }[] = [];

  for (const [day, totals] of Object.entries(daily)) {
    addTotals(allTime, totals);
    if (day >= weekStart) addTotals(week, totals);
    if (day >= historyStart) history.push({ date: day, total: totals.total });
  }

  history.sort((left, right) => left.date.localeCompare(right.date));

  // A reported weekly window beats anything we could infer locally.
  if (reported?.sevenDay && typeof reported.sevenDay.utilization === "number") {
    rateLimit = {
      source: "reported",
      usedPercent: reported.sevenDay.utilization,
      windowMinutes: 7 * 24 * 60,
      resetsAt: reported.sevenDay.resets_at ?? null,
      planType: null,
      observedAt: reported.observedAt,
    };
  }

  // No reported window? Fall back to the user's own weekly budget, if set.
  if (!rateLimit && weeklyBudget) {
    rateLimit = {
      source: "budget",
      usedPercent: Math.min((week.total / weeklyBudget) * 100, 100),
      windowMinutes: 7 * 24 * 60,
      resetsAt: null,
      planType: null,
      observedAt: new Date().toISOString(),
    };
  }

  return {
    agentId,
    label,
    hasData: allTime.messages > 0,
    session: sessionTotals ?? emptyTotals(),
    today: daily[today] ?? emptyTotals(),
    week,
    allTime,
    history,
    lastActivity,
    rateLimit,
    weeklyBudget,
    blockBudget,
    sessionWindow: sessionWindowFor(hourly, hourlyFirst, blockBudget, reported),
  };
}

/**
 * @param sinceIso when set, each agent's `session` totals cover only usage
 * recorded at or after that moment — the app passes the time the agent tab was
 * opened.
 */
export async function getAgentUsage(
  sinceIso?: string,
): Promise<AgentUsageReport> {
  const claudePaths = claudeFiles();
  const codexPaths = codexFiles();

  const [claudeSlices, codexSlices] = await Promise.all([
    scanAgent("claude", claudePaths, parseClaudeLine),
    scanAgent("codex", codexPaths, parseCodexLine),
  ]);

  const [claudeSession, codexSession] = sinceIso
    ? await Promise.all([
        scanSince(claudePaths, sinceIso, parseClaudeLine),
        scanSince(codexPaths, sinceIso, parseCodexLine),
      ])
    : [null, null];

  writeCache();

  const budgets = listAgentBudgets();
  const claudeUtilization = readClaudeUtilization();

  // Custom agents are arbitrary commands, so nothing local reports their usage.
  const customs = listCustomAgents().map(({ id, label }) =>
    summarize(
      id,
      label,
      [],
      null,
      budgets[id] ?? null,
      budgets[`${id}#5h`] ?? null,
    ),
  );

  return {
    generatedAt: new Date().toISOString(),
    since: sinceIso ?? null,
    agents: [
      summarize(
        "claude",
        "Claude",
        claudeSlices,
        claudeSession,
        budgets.claude ?? null,
        budgets["claude#5h"] ?? null,
        claudeUtilization,
      ),
      summarize(
        "codex",
        "Codex",
        codexSlices,
        codexSession,
        budgets.codex ?? null,
        budgets["codex#5h"] ?? null,
      ),
      ...customs,
    ],
  };
}
