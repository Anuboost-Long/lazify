import { useCallback, useMemo, useState } from "react";

import { assemblePrompt, findPreset } from "@main/prompts/assemble";
import { suggestPreset } from "@main/prompts/preset-suggester";
import type { PromptPreset, PromptPriority } from "@main/prompts/types";
import { useContextEntries } from "./use-context-entries";

export interface PromptDraft {
  taskName: string;
  description: string;
  requirements: string[];
  notes: string;
  presetId: string | null;
  /** Carried from the task, so the preview matches what the agent is sent. */
  priority: PromptPriority;
  deadline: string | null;
}

const EMPTY_DRAFT: PromptDraft = {
  taskName: "",
  description: "",
  requirements: [],
  notes: "",
  presetId: null,
  priority: "normal",
  deadline: null
};

/**
 * The composer's state and the prompt it produces.
 *
 * The prompt is assembled here, in the renderer, from state already in hand:
 * the presets, the project's context and what has been typed. It is the same
 * `assemblePrompt` the main process runs for a stored task, so the preview is
 * the prompt rather than a likeness of it — but building it costs a string
 * substitution, not a trip across the process boundary, so the text keeps up
 * with the keystroke instead of waiting for a pause in typing.
 *
 * The only reads are the presets a caller passes in and the context loaded once
 * per project. Nothing is written until the user saves or sends.
 *
 * The generated text is editable, and an edit is treated as belonging to this
 * run alone: once the user has touched it, nothing they type on the left
 * overwrites it until they ask for it to be built again.
 */
export function usePromptDraft(
  projectPath: string,
  projectName: string,
  presets: PromptPreset[]
) {
  const [draft, setDraft] = useState<PromptDraft>(EMPTY_DRAFT);
  const [edited, setEdited] = useState<string | null>(null);
  const { entries } = useContextEntries(projectPath);

  const built = useMemo(
    () =>
      assemblePrompt(findPreset(presets, draft.presetId), entries, {
        projectPath,
        projectName,
        presetId: draft.presetId,
        taskName: draft.taskName,
        description: draft.description,
        requirements: draft.requirements,
        notes: draft.notes,
        priority: draft.priority,
        deadline: draft.deadline
      }),
    [presets, entries, projectPath, projectName, draft]
  );

  // Only ever fills a blank: a preset the user picked is never second-guessed.
  const suggestedPresetId = useMemo(
    () =>
      draft.presetId ? null : suggestPreset(`${draft.taskName} ${draft.description}`),
    [draft.presetId, draft.taskName, draft.description]
  );

  const patch = useCallback((values: Partial<PromptDraft>) => {
    setDraft((current) => ({ ...current, ...values }));
  }, []);

  const reset = useCallback(() => {
    setDraft(EMPTY_DRAFT);
    setEdited(null);
  }, []);

  /** Throws away the run-specific edit, leaving the assembled text in view. */
  const regenerate = useCallback(() => setEdited(null), []);

  const prompt = edited ?? built.prompt;

  return {
    draft,
    patch,
    reset,
    prompt,
    built,
    isEdited: edited !== null,
    setEdited,
    regenerate,
    suggestedPresetId
  };
}
