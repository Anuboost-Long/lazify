import clsx from "clsx";
import { useTranslation } from "react-i18next";

import type { PromptPreset } from "@main/prompts/types";
import { translation } from "@renderer/i18n/translation";
import { CaptionText, OverlineText } from "@renderer/shared/typography";
import { PresetPills } from "./PresetPills";
import { RequirementsField } from "./RequirementsField";
import { fieldBase, fieldTextarea } from "./form-fields";
import type { PromptDraft } from "../hooks/use-prompt-draft";

interface PromptComposerProps {
  draft: PromptDraft;
  presets: PromptPreset[];
  suggestedPresetId: string | null;
  onPatch: (values: Partial<PromptDraft>) => void;
}

function Field({
  label,
  hint,
  children
}: Readonly<{ label: string; hint?: string; children: React.ReactNode }>) {
  return (
    <div className="flex flex-col gap-1.5">
      <OverlineText tone="muted">{label}</OverlineText>
      {children}
      {hint ? <CaptionText tone="muted">{hint}</CaptionText> : null}
    </div>
  );
}

/** What the user writes: for a person, in their own words. */
export function PromptComposer({
  draft,
  presets,
  suggestedPresetId,
  onPatch
}: Readonly<PromptComposerProps>) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1">
      <div className="flex flex-col gap-1.5">
        <OverlineText tone="muted">{t(translation.PromptBuilder.Preset)}</OverlineText>

        <PresetPills
          presets={presets}
          selectedId={draft.presetId}
          suggestedId={suggestedPresetId}
          onSelect={(id) => onPatch({ presetId: id === draft.presetId ? null : id })}
        />
      </div>

      <Field label={t(translation.PromptBuilder.TaskName)}>
        <input
          value={draft.taskName}
          onChange={(event) => onPatch({ taskName: event.target.value })}
          placeholder={t(translation.PromptBuilder.TaskNamePlaceholder)}
          className={fieldBase}
        />
      </Field>

      <Field
        label={t(translation.PromptBuilder.Description)}
        hint={t(translation.PromptBuilder.DescriptionHint)}
      >
        <textarea
          value={draft.description}
          onChange={(event) => onPatch({ description: event.target.value })}
          rows={6}
          placeholder={t(translation.PromptBuilder.DescriptionPlaceholder)}
          className={clsx(fieldTextarea, "resize-none")}
        />
      </Field>

      <Field
        label={t(translation.PromptBuilder.Requirements)}
        hint={t(translation.PromptBuilder.RequirementsHint)}
      >
        <RequirementsField
          requirements={draft.requirements}
          onChange={(requirements) => onPatch({ requirements })}
        />
      </Field>

      <Field
        label={t(translation.PromptBuilder.Notes)}
        hint={t(translation.PromptBuilder.NotesHint)}
      >
        <textarea
          value={draft.notes}
          onChange={(event) => onPatch({ notes: event.target.value })}
          rows={3}
          placeholder={t(translation.PromptBuilder.NotesPlaceholder)}
          className={clsx(fieldTextarea, "resize-none")}
        />
      </Field>
    </div>
  );
}
