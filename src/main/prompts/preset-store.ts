import { randomUUID } from "node:crypto";

import { database } from "../db";
import { BUILTIN_PRESETS } from "./builtin-presets";
import type { PromptPreset, PromptPresetInput } from "./types";

interface PresetRow {
  id: string;
  name: string;
  description: string;
  template: string;
  is_builtin: number;
  sort_order: number;
}

function toPreset(row: PresetRow): PromptPreset {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    template: row.template,
    isBuiltin: row.is_builtin === 1,
    sortOrder: row.sort_order
  };
}

/**
 * Puts the shipped presets in place, and puts back any the user deleted before
 * the app knew how to stop them. Custom presets are never touched.
 */
export function seedBuiltinPresets(): void {
  const db = database();
  const now = new Date().toISOString();

  const insert = db.prepare(`
    INSERT INTO prompt_presets
      (id, name, description, template, is_builtin, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, 1, ?, ?, ?)
    ON CONFLICT (id) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      template = excluded.template,
      sort_order = excluded.sort_order,
      updated_at = excluded.updated_at
  `);

  for (const preset of BUILTIN_PRESETS) {
    insert.run(
      preset.id,
      preset.name,
      preset.description,
      preset.template,
      preset.sortOrder,
      now,
      now
    );
  }
}

export function listPresets(): PromptPreset[] {
  const rows = database()
    .prepare("SELECT * FROM prompt_presets ORDER BY is_builtin DESC, sort_order, name")
    .all() as unknown as PresetRow[];

  return rows.map(toPreset);
}

export function getPreset(id: string): PromptPreset | null {
  const row = database()
    .prepare("SELECT * FROM prompt_presets WHERE id = ?")
    .get(id) as unknown as PresetRow | undefined;

  return row ? toPreset(row) : null;
}

export function createPreset(input: PromptPresetInput): PromptPreset {
  const db = database();
  const now = new Date().toISOString();
  const id = `preset-${randomUUID()}`;

  db.prepare(
    `INSERT INTO prompt_presets
       (id, name, description, template, is_builtin, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, 0, 0, ?, ?)`
  ).run(id, input.name, input.description, input.template, now, now);

  return { id, ...input, isBuiltin: false, sortOrder: 0 };
}

/** Built-ins are read-only, so the defaults are always there to go back to. */
export function updatePreset(id: string, input: PromptPresetInput): PromptPreset | null {
  const existing = getPreset(id);
  if (!existing || existing.isBuiltin) return null;

  database()
    .prepare(
      `UPDATE prompt_presets
         SET name = ?, description = ?, template = ?, updated_at = ?
       WHERE id = ?`
    )
    .run(input.name, input.description, input.template, new Date().toISOString(), id);

  return { ...existing, ...input };
}

export function deletePreset(id: string): boolean {
  const existing = getPreset(id);
  if (!existing || existing.isBuiltin) return false;

  database().prepare("DELETE FROM prompt_presets WHERE id = ?").run(id);
  return true;
}
