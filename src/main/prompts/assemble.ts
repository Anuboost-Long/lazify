import { DEFAULT_PRESET_ID } from "./builtin-presets";
import { formatFacts, formatRules, selectEntries } from "./context-formatter";
import { formatRequirements, splitDescription, titleFrom } from "./requirement-normalizer";
import { formatDeadline, formatPriority } from "./task-metadata";
import { renderTemplate } from "./template-renderer";
import type { BuildPromptInput, BuiltPrompt, ContextEntry, PromptPreset } from "./types";

/**
 * The prompt itself: a preset, the context, and what was typed.
 *
 * Pure on purpose. Everything that reads the database stays in the callers, so
 * this same function runs in the main process for a stored task and in the
 * renderer for a preview — the composer replaces text in state and sees the
 * result on the keystroke, with no round trip and no second implementation of
 * the rules to drift from this one.
 */
export function assemblePrompt(
  preset: PromptPreset | null,
  entries: ContextEntry[],
  input: BuildPromptInput
): BuiltPrompt {
  if (!preset) return { prompt: "", presetId: null, usedEntryIds: [] };

  const selected = selectEntries(entries, {
    projectPath: input.projectPath,
    presetId: preset.id
  });

  const global = selected.filter((entry) => entry.scope === "global");
  const project = selected.filter((entry) => entry.scope === "project");

  const written = splitDescription(input.description);
  const requirements = [...input.requirements, ...written.requirements];

  const prompt = renderTemplate(preset.template, {
    project_name: input.projectName,
    task_name: input.taskName.trim() || titleFrom(written.description),
    task_description: written.description,
    task_requirements: formatRequirements(requirements),
    task_notes: input.notes.trim(),
    priority: formatPriority(input.priority),
    deadline: formatDeadline(input.deadline),
    project_context: formatFacts(project),
    project_rules: formatRules(project),
    global_context: formatFacts(global),
    global_rules: formatRules(global)
  });

  return { prompt, presetId: preset.id, usedEntryIds: selected.map((entry) => entry.id) };
}

/** The preset a draft names, falling back the way the store does. */
export function findPreset(presets: PromptPreset[], id: string | null): PromptPreset | null {
  return (
    presets.find((preset) => preset.id === (id ?? DEFAULT_PRESET_ID)) ??
    presets.find((preset) => preset.id === DEFAULT_PRESET_ID) ??
    null
  );
}
