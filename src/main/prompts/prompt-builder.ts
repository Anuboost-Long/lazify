import { assemblePrompt } from "./assemble";
import { DEFAULT_PRESET_ID } from "./builtin-presets";
import { listEntries } from "./context-store";
import { getPreset } from "./preset-store";
import type { BuildPromptInput, BuiltPrompt } from "./types";

/**
 * Turns what the user wrote into what an agent is given.
 *
 * The database half of the job: load the preset and the context, then hand both
 * to the assembler the renderer's preview uses too. Nothing here reaches the
 * network or a model, so the same inputs always produce the same prompt — which
 * is what makes an agent run worth repeating.
 */
export function buildPrompt(input: BuildPromptInput): BuiltPrompt {
  const preset = getPreset(input.presetId ?? DEFAULT_PRESET_ID) ?? getPreset(DEFAULT_PRESET_ID);

  return assemblePrompt(preset, listEntries(input.projectPath), input);
}
