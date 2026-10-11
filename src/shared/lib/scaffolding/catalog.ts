import type { TemplateDefinition } from "./harmonizer";

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
 * Electron's registry ladder (a pinned, hash-checked catalog fetched in the
 * background) is not ported: its pin is null there, so only the seed is ever
 * read. Port it when Electron sets one.
 */
const SEED_FILES = import.meta.glob<string>("/templates/*.json", {
  eager: true,
  query: "?raw",
  import: "default",
});

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

/** Ordered by file name, as Electron's `readdirSync` returned them. */
export function readCatalog(): TemplateDefinition[] {
  return Object.keys(SEED_FILES)
    .sort()
    .flatMap((file) => parseEntries(SEED_FILES[file]));
}
