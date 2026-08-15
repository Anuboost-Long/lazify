import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { CONTEXT_TYPES, type ContextTypeId } from "@main/prompts/context-types";
import { CaptionText, SmallText } from "@renderer/shared/typography";

interface ContextTypePickerProps {
  selected: ContextTypeId;
  onSelect: (type: ContextTypeId) => void;
}

/** Which kind of context this is — chosen first, since it decides the fields. */
export function ContextTypePicker({ selected, onSelect }: Readonly<ContextTypePickerProps>) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 gap-2">
      {CONTEXT_TYPES.map((type) => {
        const active = type.id === selected;

        return (
          <button
            key={type.id}
            type="button"
            onClick={() => onSelect(type.id)}
            aria-pressed={active}
            className={clsx(
              "rounded-xl border p-3 text-left transition-colors",
              active ? "border-accent bg-accent/[0.07]" : "border-border hover:border-accent/40"
            )}
          >
            <SmallText className={clsx("block font-semibold", active && "!text-accent")}>
              {t(type.label)}
            </SmallText>
            <CaptionText tone="muted" className="mt-0.5 block leading-5">
              {t(type.description)}
            </CaptionText>
          </button>
        );
      })}
    </div>
  );
}
