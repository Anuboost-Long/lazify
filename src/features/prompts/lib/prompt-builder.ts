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
export async function buildPrompt(input: BuildPromptInput): Promise<BuiltPrompt> {
  const preset = (await getPreset(input.presetId ?? DEFAULT_PRESET_ID)) ?? (await getPreset(DEFAULT_PRESET_ID));

  return assemblePrompt(preset, await listEntries(input.projectPath), input);
}
