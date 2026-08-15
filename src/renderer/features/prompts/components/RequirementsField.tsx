import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { SmallText } from "@renderer/shared/typography";
import { fieldChromeClassName } from "@renderer/shared/ui/form/FormInput";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

interface RequirementsFieldProps {
  requirements: string[];
  onChange: (requirements: string[]) => void;
}

/**
 * The structured half of a task.
 *
 * Requirements are typed as separate lines rather than left inside the prose,
 * because a list is the one thing the builder can turn into instructions
 * without guessing at what the sentence meant.
 */
export function RequirementsField({ requirements, onChange }: Readonly<RequirementsFieldProps>) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");

  const add = () => {
    const value = draft.trim();
    if (!value) return;

    onChange([...requirements, value]);
    setDraft("");
  };

  return (
    <div className="flex flex-col gap-1.5">
      {requirements.map((requirement, index) => (
        <div
          key={`${requirement}-${index}`}
          className="group flex items-center gap-2 rounded-lg border border-border bg-soft px-2.5 py-1.5"
        >
          <UiIcon name="check-circle" className="h-3 w-3 shrink-0 text-accent" />
          <SmallText className="!text-text min-w-0 flex-1 truncate">{requirement}</SmallText>
          <button
            type="button"
            onClick={() => onChange(requirements.filter((_item, at) => at !== index))}
            aria-label={t(translation.GlobalTerm.Remove)}
            className="shrink-0 rounded p-0.5 text-muted opacity-0 hover:text-error group-hover:opacity-100"
          >
            <UiIcon name="xmark" className="h-3 w-3" />
          </button>
        </div>
      ))}

      <div className="flex items-center gap-1.5">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            add();
          }}
          placeholder={t(translation.PromptBuilder.RequirementPlaceholder)}
          className={clsx(fieldChromeClassName("default", "sm"), "min-w-0 flex-1")}
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim()}
          aria-label={t(translation.GlobalTerm.Add)}
          className={clsx(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border",
            "text-muted enabled:hover:border-accent/40 enabled:hover:text-accent",
            "disabled:cursor-not-allowed disabled:opacity-40"
          )}
        >
          <UiIcon name="plus" className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
