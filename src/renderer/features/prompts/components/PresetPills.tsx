import clsx from "clsx";
import { useTranslation } from "react-i18next";

import type { PromptPreset } from "@main/prompts/types";
import { translation } from "@renderer/i18n/translation";
import { SmallText } from "@renderer/shared/typography";
import { Tooltip } from "@renderer/shared/ui/Tooltip";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

interface PresetPillsProps {
  presets: PromptPreset[];
  selectedId: string | null;
  /** What the wording reads like, marked until the user chooses for themselves. */
  suggestedId: string | null;
  onSelect: (id: string) => void;
}

export function PresetPills({
  presets,
  selectedId,
  suggestedId,
  onSelect
}: Readonly<PresetPillsProps>) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap gap-1.5">
      {presets.map((preset) => {
        const selected = preset.id === selectedId;
        const suggested = !selectedId && preset.id === suggestedId;

        return (
          <Tooltip key={preset.id} content={preset.description} side="bottom">
            <button
              type="button"
              onClick={() => onSelect(preset.id)}
              aria-pressed={selected}
              className={clsx(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-colors",
                selected
                  ? "border-accent bg-accent/10"
                  : "border-border bg-soft hover:border-accent/40"
              )}
            >
              {suggested ? (
                <UiIcon name="sparks" className="h-3 w-3 text-accent" />
              ) : null}
              <SmallText className={clsx(selected ? "!text-accent" : "!text-text")}>
                {preset.name}
              </SmallText>
            </button>
          </Tooltip>
        );
      })}

      {suggestedId && !selectedId ? (
        <SmallText className="!text-muted self-center pl-1">
          {t(translation.PromptBuilder.PresetSuggested)}
        </SmallText>
      ) : null}
    </div>
  );
}
