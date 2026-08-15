import { database } from "../db";
import type { ContextEntry } from "./types";

/**
 * The base rules every project starts with.
 *
 * Deliberately about how to work rather than what the project is: what a
 * project is differs per project and is the user's to fill in, while these hold
 * for any codebase an agent is let loose in. Every one can be switched off, and
 * the pack can be switched off as a whole.
 */

/** Ids carry this so the app can tell a shipped rule from the user's own. */
export const BUILTIN_CONTEXT_PREFIX = "ctx-builtin-";

export const CORE_PACK = "Core working rules";
export const VERIFY_PACK = "Verification";

type SeedEntry = Omit<ContextEntry, "scope" | "scopeKey">;

const CORE: SeedEntry[] = (
  [
    ["required", "change only what the task requires, leaving unrelated code alone"],
    ["forbidden", "refactor anything the task did not ask about"],
    ["required", "inspect the existing implementation before changing how it works"],
    ["preferred", "reuse what exists before adding a component, service or dependency"],
    ["required", "match the style, naming and structure of the file being edited"],
    ["required", "preserve existing behavior, validation, error handling and API contracts"],
    ["forbidden", "delete existing functionality the task did not ask to remove"],
    ["preferred", "the simplest implementation that fully does the job"]
  ] as const
).map(([strength, action], index) => ({
  id: `${BUILTIN_CONTEXT_PREFIX}core-${index + 1}`,
  type: "rule" as const,
  category: "Coding Rules",
  payload: { strength, action },
  appliesTo: [],
  pack: CORE_PACK,
  isActive: true,
  sortOrder: index
}));

const VERIFY: SeedEntry[] = (
  [
    ["required", "verify the project still builds after changing code"],
    ["required", "report which files changed and summarize what was done"],
    ["required", "say plainly what could not be verified, rather than implying it works"]
  ] as const
).map(([strength, action], index) => ({
  id: `${BUILTIN_CONTEXT_PREFIX}verify-${index + 1}`,
  type: "rule" as const,
  category: "Agent Instructions",
  payload: { strength, action },
  appliesTo: [],
  pack: VERIFY_PACK,
  isActive: true,
  sortOrder: 100 + index
}));

/**
 * Inserts the shipped rules once. An entry the user edited or switched off
 * keeps their version, because the row is already there.
 */
export function seedBuiltinContext(): void {
  const now = new Date().toISOString();

  const insert = database().prepare(`
    INSERT OR IGNORE INTO context_entries
      (id, scope, scope_key, kind, category, context_value, payload,
       applies_to, pack, is_active, sort_order, created_at, updated_at)
    VALUES (?, 'global', '', ?, ?, '', ?, '', ?, 1, ?, ?, ?)
  `);

  for (const entry of [...CORE, ...VERIFY]) {
    insert.run(
      entry.id,
      entry.type,
      entry.category,
      JSON.stringify(entry.payload),
      entry.pack,
      entry.sortOrder,
      now,
      now
    );
  }
}

export function isBuiltinContext(id: string): boolean {
  return id.startsWith(BUILTIN_CONTEXT_PREFIX);
}
