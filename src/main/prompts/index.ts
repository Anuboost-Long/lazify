import { seedBuiltinContext } from "./builtin-context";
import { seedBuiltinPresets } from "./preset-store";

export { BUILTIN_PRESETS, DEFAULT_PRESET_ID } from "./builtin-presets";
export { isBuiltinContext } from "./builtin-context";
export {
  createEntry,
  deleteEntry,
  listEntries,
  setEntryActive,
  setPackActive,
  updateEntry
} from "./context-store";
export { createPreset, deletePreset, getPreset, listPresets, updatePreset } from "./preset-store";
export { buildPrompt } from "./prompt-builder";
export { suggestPreset } from "./preset-suggester";
export { renderTemplate, templateVariables } from "./template-renderer";
export type * from "./types";

/** Puts the shipped presets and rules in place. Called once at startup. */
export function initPromptBuilder(): void {
  seedBuiltinPresets();
  seedBuiltinContext();
}
