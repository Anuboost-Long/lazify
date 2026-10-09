import { database } from "@/platform/database";

import { isBuiltinContext } from "./builtin-context";
import type { ContextPayload, ContextTypeId } from "./context-types";
import type { ContextEntry, ContextEntryInput, ContextScope } from "./types";

interface ContextRow {
  id: string;
  scope: string;
  scope_key: string;
  kind: string;
  category: string;
  payload: string;
  applies_to: string;
  pack: string;
  is_active: number;
  sort_order: number;
}

function parsePayload(raw: string): ContextPayload {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as ContextPayload) : {};
  } catch {
    return {};
  }
}

function toEntry(row: ContextRow): ContextEntry {
  return {
    id: row.id,
    scope: row.scope as ContextScope,
    scopeKey: row.scope_key,
    type: row.kind as ContextTypeId,
    category: row.category,
    payload: parsePayload(row.payload),
    appliesTo: row.applies_to ? row.applies_to.split(",") : [],
    pack: row.pack,
    isActive: row.is_active === 1,
    sortOrder: row.sort_order
  };
}

/** Everything in play for a project: its own entries and the global ones. */
export async function listEntries(projectPath: string): Promise<ContextEntry[]> {
  const rows = await (await database()).query<ContextRow>(
    `SELECT * FROM context_entries
      WHERE scope = 'global' OR scope_key = ?
      ORDER BY scope DESC, sort_order, category`,
    [projectPath]
  );

  return rows.map(toEntry);
}

export async function createEntry(input: ContextEntryInput): Promise<ContextEntry> {
  const now = new Date().toISOString();
  const id = `ctx-${crypto.randomUUID()}`;

  await (await database()).execute(
    `INSERT INTO context_entries
       (id, scope, scope_key, kind, category, context_value, payload,
        applies_to, pack, is_active, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.scope,
      input.scopeKey,
      input.type,
      input.category,
      JSON.stringify(input.payload),
      input.appliesTo.join(","),
      input.pack,
      input.isActive ? 1 : 0,
      input.sortOrder,
      now,
      now
    ]
  );

  return { id, ...input };
}

export async function updateEntry(id: string, input: ContextEntryInput): Promise<boolean> {
  const result = await (await database()).execute(
    `UPDATE context_entries
        SET scope = ?, scope_key = ?, kind = ?, category = ?, payload = ?,
            applies_to = ?, pack = ?, is_active = ?, sort_order = ?,
            updated_at = ?
      WHERE id = ?`,
    [
      input.scope,
      input.scopeKey,
      input.type,
      input.category,
      JSON.stringify(input.payload),
      input.appliesTo.join(","),
      input.pack,
      input.isActive ? 1 : 0,
      input.sortOrder,
      new Date().toISOString(),
      id
    ]
  );

  return result.rowsAffected > 0;
}

/** The switch beside every entry. Off means it reaches no prompt at all. */
export async function setEntryActive(id: string, isActive: boolean): Promise<boolean> {
  const result = await (await database()).execute(
    "UPDATE context_entries SET is_active = ?, updated_at = ? WHERE id = ?",
    [isActive ? 1 : 0, new Date().toISOString(), id]
  );

  return result.rowsAffected > 0;
}

/** The same switch for a whole pack, which is how packs are plugged in. */
export async function setPackActive(
  scope: ContextScope,
  scopeKey: string,
  pack: string,
  isActive: boolean
): Promise<number> {
  const result = await (await database()).execute(
    `UPDATE context_entries
        SET is_active = ?, updated_at = ?
      WHERE scope = ? AND scope_key = ? AND pack = ?`,
    [isActive ? 1 : 0, new Date().toISOString(), scope, scopeKey, pack]
  );

  return result.rowsAffected;
}

/** Shipped rules are switched off rather than deleted, so they stay recoverable. */
export async function deleteEntry(id: string): Promise<boolean> {
  if (isBuiltinContext(id)) return false;

  const result = await (await database()).execute("DELETE FROM context_entries WHERE id = ?", [id]);
  return result.rowsAffected > 0;
}
