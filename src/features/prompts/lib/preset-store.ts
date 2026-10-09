import { database } from "@/platform/database";

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
export async function seedBuiltinPresets(): Promise<void> {
  const db = await database();
  const now = new Date().toISOString();

  for (const preset of BUILTIN_PRESETS) {
    await db.execute(
      `INSERT INTO prompt_presets
        (id, name, description, template, is_builtin, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, ?, ?, ?)
      ON CONFLICT (id) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        template = excluded.template,
        sort_order = excluded.sort_order,
        updated_at = excluded.updated_at`,
      [preset.id, preset.name, preset.description, preset.template, preset.sortOrder, now, now]
    );
  }
}

export async function listPresets(): Promise<PromptPreset[]> {
  const rows = await (await database()).query<PresetRow>(
    "SELECT * FROM prompt_presets ORDER BY is_builtin DESC, sort_order, name"
  );

  return rows.map(toPreset);
}

export async function getPreset(id: string): Promise<PromptPreset | null> {
  const [row] = await (await database()).query<PresetRow>("SELECT * FROM prompt_presets WHERE id = ?", [id]);

  return row ? toPreset(row) : null;
}

export async function createPreset(input: PromptPresetInput): Promise<PromptPreset> {
  const now = new Date().toISOString();
  const id = `preset-${crypto.randomUUID()}`;

  await (await database()).execute(
    `INSERT INTO prompt_presets
       (id, name, description, template, is_builtin, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, 0, 0, ?, ?)`,
    [id, input.name, input.description, input.template, now, now]
  );

  return { id, ...input, isBuiltin: false, sortOrder: 0 };
}

/** Built-ins are read-only, so the defaults are always there to go back to. */
export async function updatePreset(id: string, input: PromptPresetInput): Promise<PromptPreset | null> {
  const existing = await getPreset(id);
  if (!existing || existing.isBuiltin) return null;

  await (await database()).execute(
    `UPDATE prompt_presets
       SET name = ?, description = ?, template = ?, updated_at = ?
     WHERE id = ?`,
    [input.name, input.description, input.template, new Date().toISOString(), id]
  );

  return { ...existing, ...input };
}

export async function deletePreset(id: string): Promise<boolean> {
  const existing = await getPreset(id);
  if (!existing || existing.isBuiltin) return false;

  await (await database()).execute("DELETE FROM prompt_presets WHERE id = ?", [id]);
  return true;
}
