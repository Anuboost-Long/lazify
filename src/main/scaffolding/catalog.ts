import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { app } from "electron";

import type { TemplateDefinition } from "./harmonizer";
import { logError } from "../diagnostics/logger";

/**
 * Where a stack's starter is cloned from. A tag, never a branch: a push to the
 * starter must not change what an existing pin produces. There is no hash here
 * because the starter is cloned rather than downloaded as a file — see
 * `starter-provisioner.ts`.
 */
export interface StarterSource {
  repo: string;
  ref: string;
}

/**
 * The catalog, unlike a starter, is fetched as a file, so its bytes can be
 * hash-verified — and must be, since a catalog that could be repointed silently
 * could repoint every stack at once. The pin lives here rather than in the
 * registry: a repo that declares its own hash verifies nothing, because the
 * same push rewrites both.
 *
 * Null until the registry repo exists. The ladder then stops at the bundled
 * seed, which is a complete answer on its own rather than a degraded one.
 */
const REGISTRY_PIN: { repo: string; ref: string; sha256: string } | null = null;

const CATALOG_FILE = "catalog.json";

const SEED_DIRECTORY = app.isPackaged
  ? path.join(process.resourcesPath, "templates")
  : path.join(app.getAppPath(), "templates");

const CACHE_DIRECTORY = path.join(app.getPath("userData"), "catalog-cache");

// Keyed on ref, so adopting a new catalog is a natural cache miss.
function cachePath(ref: string) {
  return path.join(CACHE_DIRECTORY, `catalog@${ref}.json`);
}

function sha256(bytes: Buffer) {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * Entries can arrive from a repo that changes without an app release, so a
 * malformed one is dropped rather than allowed to break the picker for every
 * stack. createCommands is required even on entries that have a starter — that
 * is what keeps the CLI route a universal fallback rather than a per-stack
 * accident.
 */
function isUsableEntry(entry: TemplateDefinition | null): entry is TemplateDefinition {
  return Boolean(
    entry?.id &&
      entry.label &&
      entry.createCommands &&
      Object.keys(entry.createCommands).length > 0
  );
}

function parseEntries(raw: string): TemplateDefinition[] {
  try {
    const parsed = JSON.parse(raw) as TemplateDefinition | TemplateDefinition[];
    const entries = Array.isArray(parsed) ? parsed : [parsed];
    return entries.filter(isUsableEntry);
  } catch {
    return [];
  }
}

function readSeedCatalog(): TemplateDefinition[] {
  if (!fs.existsSync(SEED_DIRECTORY)) {
    return [];
  }

  return fs
    .readdirSync(SEED_DIRECTORY)
    .filter((entry) => entry.endsWith(".json"))
    .flatMap((entry) => parseEntries(fs.readFileSync(path.join(SEED_DIRECTORY, entry), "utf8")));
}

function readCachedCatalog(): TemplateDefinition[] {
  // With no pin there is no trusted writer, so there is nothing to read back.
  if (!REGISTRY_PIN) {
    return [];
  }

  const filePath = cachePath(REGISTRY_PIN.ref);

  if (!fs.existsSync(filePath)) {
    return [];
  }

  const bytes = fs.readFileSync(filePath);

  // Re-checked on read, not just on write: the cache sits in a directory the
  // user can edit, and a swapped file would otherwise repoint every stack.
  if (sha256(bytes) !== REGISTRY_PIN.sha256) {
    return [];
  }

  return parseEntries(bytes.toString("utf8"));
}

/**
 * Seed first, so the picker renders instantly, offline, on first run. A cached
 * catalog is preferred only once one has been verified into place.
 */
export function readCatalog(): TemplateDefinition[] {
  const cached = readCachedCatalog();
  return cached.length > 0 ? cached : readSeedCatalog();
}

function pruneStaleCache(keepRef: string) {
  if (!fs.existsSync(CACHE_DIRECTORY)) {
    return;
  }

  for (const entry of fs.readdirSync(CACHE_DIRECTORY)) {
    if (entry.startsWith("catalog@") && entry !== path.basename(cachePath(keepRef))) {
      fs.rmSync(path.join(CACHE_DIRECTORY, entry), { force: true });
    }
  }
}

/**
 * Background refresh. Never blocks the UI and never throws: a picker that has
 * to reach the network before it can list anything has made cold start depend
 * on wifi, which is the thing seed-first exists to avoid.
 */
export async function refreshCatalog(): Promise<void> {
  if (!REGISTRY_PIN) {
    return;
  }

  const filePath = cachePath(REGISTRY_PIN.ref);

  if (fs.existsSync(filePath)) {
    return;
  }

  try {
    const url = `https://raw.githubusercontent.com/${REGISTRY_PIN.repo}/${REGISTRY_PIN.ref}/${CATALOG_FILE}`;
    const response = await fetch(url);

    if (!response.ok) {
      return;
    }

    const bytes = Buffer.from(await response.arrayBuffer());

    // A mismatch is a tampering signal rather than an availability problem, so
    // it is reported and nothing is written — the seed stays in use.
    if (sha256(bytes) !== REGISTRY_PIN.sha256) {
      logError(
        "catalog",
        `Integrity check failed for ${REGISTRY_PIN.repo}@${REGISTRY_PIN.ref}; keeping the bundled catalog.`
      );
      return;
    }

    if (parseEntries(bytes.toString("utf8")).length === 0) {
      return;
    }

    fs.mkdirSync(CACHE_DIRECTORY, { recursive: true });
    fs.writeFileSync(filePath, bytes);
    pruneStaleCache(REGISTRY_PIN.ref);
  } catch {
    // Offline, DNS, a proxy — all of it is the seed's job to cover.
  }
}
