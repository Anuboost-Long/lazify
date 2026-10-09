import { environmentVariable } from "@/platform/exec";
import { listFolder, readFileSlice } from "@/platform/folders";

/**
 * Past conversations, so a session can be picked up instead of restarted.
 *
 * Both CLIs already keep every session as a JSONL transcript on disk — Claude
 * under a directory named after the project, Codex under a date tree with the
 * project recorded inside each file. Reading them is enough to offer "carry on
 * where you left off"; resuming itself is the CLI's own flag.
 *
 * Only the head of a transcript is ever read: the opening prompt is what the
 * list shows, and these files grow to megabytes.
 */

export interface AgentSessionSummary {
  /** Which CLI owns the session, and so which resume flag applies. */
  agentId: string;
  sessionId: string;
  /** The prompt the session opened with, for recognising it. Can be empty. */
  title: string;
  /** Epoch ms of the last write, i.e. when it was last worked in. */
  updatedAt: number;
}

/** Long enough to recognise a session, short enough for a list row. */
const MAX_TITLE = 160;
/**
 * How far into a transcript the scan may go before giving up.
 *
 * It normally stops within the first few lines, but a single record can be
 * enormous — Claude opens with a file-history snapshot, Codex with its base
 * instructions — so this is a ceiling rather than the expected read.
 */
const SCAN_BYTES = 4 * 1024 * 1024;
/**
 * Codex keeps one flat archive for every project, so its files are stated and
 * probed newest-first. This bounds that walk on a long-lived machine.
 */
const MAX_CODEX_PROBES = 400;
const CHUNK_BYTES = 64 * 1024;

const sessionIdOf = (file: string) => file.slice(file.lastIndexOf("/") + 1).replace(/\.jsonl$/, "");

const homeDir = async () => (await environmentVariable("HOME")) ?? "";

function parseLine(line: string): Record<string, unknown> | null {
  if (!line.trim()) return null;

  try {
    const value: unknown = JSON.parse(line);
    return typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    // A truncated last line is expected: the head cut it mid-record.
    return null;
  }
}

/**
 * Reads a transcript record by record until `pick` recognises one, then stops.
 *
 * Streaming rather than reading a fixed head: what is being looked for is
 * usually in the first line or two, but the records before it can be
 * arbitrarily large, so a head of any fixed size either misses them or reads
 * far more than it needs to.
 */
async function scanRecords<T>(
  file: string,
  pick: (record: Record<string, unknown>) => T | null
): Promise<T | null> {
  const decoder = new TextDecoder();
  let pending = "";

  const pickFrom = (line: string) => {
    const record = parseLine(line);
    return record ? pick(record) : null;
  };

  try {
    for (let offset = 0; offset < SCAN_BYTES; offset += CHUNK_BYTES) {
      const chunk = await readFileSlice(file, offset, Math.min(CHUNK_BYTES, SCAN_BYTES - offset));
      if (chunk.length === 0) break;

      const lines = (pending + decoder.decode(chunk, { stream: true })).split(/\r\n|\n|\r/);
      pending = lines.pop() ?? "";

      for (const line of lines) {
        const found = pickFrom(line);
        if (found !== null) return found;
      }
    }

    return pickFrom(pending + decoder.decode());
  } catch {
    // Unreadable or vanished mid-read: the session is simply not listed.
    return null;
  }
}

/**
 * True for text that is scaffolding rather than something the user typed —
 * injected instructions, slash-command envelopes, resumption banners. Skipping
 * it is what makes the title the actual first ask.
 */
function isBoilerplate(text: string): boolean {
  const head = text.trimStart();

  return head.startsWith("<") || head.startsWith("#") || head.startsWith("Caveat:");
}

function toTitle(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();

  return flat.length > MAX_TITLE ? `${flat.slice(0, MAX_TITLE - 1)}…` : flat;
}

/** Claude names each project's directory after its path, with the separators flattened. */
async function claudeProjectDir(projectPath: string): Promise<string> {
  return `${await homeDir()}/.claude/projects/${projectPath.replace(/[^a-zA-Z0-9]/g, "-")}`;
}

/** The first thing the user actually asked, from one Claude record. */
function claudeTitleOf(record: Record<string, unknown>): string | null {
  if (record.type !== "user" || record.isSidechain === true) return null;

  const message = record.message as { content?: unknown } | undefined;
  const content = message?.content;

  if (typeof content === "string") {
    return isBoilerplate(content) ? null : toTitle(content);
  }

  // A prompt carrying an image (or any attachment) is stored as blocks
  // instead of a string; the text blocks are still what the user typed.
  if (!Array.isArray(content)) return null;

  const text = content
    .filter((block): block is { type: string; text: string } => {
      const candidate = block as { type?: unknown; text?: unknown };
      return candidate?.type === "text" && typeof candidate.text === "string";
    })
    .map((block) => block.text)
    .join(" ");

  // No text blocks at all means this record is a tool result being replayed.
  return !text || isBoilerplate(text) ? null : toTitle(text);
}

async function listClaudeSessions(
  projectPath: string,
  limit: number
): Promise<AgentSessionSummary[]> {
  let entries;
  try {
    entries = await listFolder(await claudeProjectDir(projectPath));
  } catch {
    // Claude has never run in this project.
    return [];
  }

  const newest = entries
    .filter((entry) => entry.kind === "file" && entry.name.endsWith(".jsonl"))
    .map((entry) => ({ file: entry.path, updatedAt: entry.modifiedMs }))
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, limit);

  return Promise.all(
    newest.map(async ({ file, updatedAt }) => ({
      agentId: "claude",
      sessionId: sessionIdOf(file),
      title: (await scanRecords(file, claudeTitleOf)) ?? "",
      updatedAt
    }))
  );
}

/** The first user turn in a Codex rollout, past the context Codex injects. */
function codexTitleOf(record: Record<string, unknown>): string | null {
  const payload = record.payload as Record<string, unknown> | undefined;
  if (!payload) return null;

  // Newer rollouts emit the prompt as its own event; older ones only have the
  // response item, whose leading blocks are the instructions Codex injects.
  if (record.type === "event_msg" && payload.type === "user_message") {
    const message = payload.message;

    return typeof message === "string" && !isBoilerplate(message)
      ? toTitle(message)
      : null;
  }

  if (record.type !== "response_item" || payload.role !== "user") return null;

  const content = Array.isArray(payload.content) ? payload.content : [];

  for (const block of content) {
    const text = (block as { type?: string; text?: unknown })?.text;
    if (typeof text !== "string" || isBoilerplate(text)) continue;

    return toTitle(text);
  }

  return null;
}

/** Every rollout file under the year/month/day tree, newest write first. */
async function codexRolloutFiles(): Promise<{ file: string; updatedAt: number }[]> {
  const root = `${await homeDir()}/.codex/sessions`;
  const found: { file: string; updatedAt: number }[] = [];

  const walk = async (directory: string, depth: number): Promise<void> => {
    let entries;
    try {
      entries = await listFolder(directory);
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.kind === "folder") {
        // year / month / day, and no deeper.
        if (depth < 3) await walk(entry.path, depth + 1);
        continue;
      }

      if (entry.kind === "file" && entry.name.endsWith(".jsonl")) {
        found.push({ file: entry.path, updatedAt: entry.modifiedMs });
      }
    }
  };

  await walk(root, 0);

  return found.sort((a, b) => b.updatedAt - a.updatedAt);
}

async function listCodexSessions(
  projectPath: string,
  limit: number
): Promise<AgentSessionSummary[]> {
  const files = (await codexRolloutFiles()).slice(0, MAX_CODEX_PROBES);
  const sessions: AgentSessionSummary[] = [];

  for (const { file, updatedAt } of files) {
    if (sessions.length >= limit) break;

    // The opening record says which project the session ran in, which is what
    // decides whether this file is one of the project's at all — so the probe
    // costs a single line, however big the rest of the transcript is.
    const meta = await scanRecords(file, (record) => record);
    if (meta?.type !== "session_meta") continue;

    const payload = (meta.payload ?? {}) as { id?: unknown; cwd?: unknown };
    if (payload.cwd !== projectPath) continue;

    sessions.push({
      agentId: "codex",
      sessionId:
        typeof payload.id === "string" ? payload.id : sessionIdOf(file),
      title: (await scanRecords(file, codexTitleOf)) ?? "",
      updatedAt
    });
  }

  return sessions;
}

/** Recent sessions for a project, newest first, across the built-in agents. */
export async function listAgentSessions(
  projectPath: string,
  limit = 15
): Promise<AgentSessionSummary[]> {
  const [claude, codex] = await Promise.all([
    listClaudeSessions(projectPath, limit),
    listCodexSessions(projectPath, limit)
  ]);

  return [...claude, ...codex]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, limit);
}
