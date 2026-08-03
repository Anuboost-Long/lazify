import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { BodyText, CardTitle } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { FlowHint } from "./FlowHint";

interface AppPickerDropzoneProps {
  dragging: boolean;
  onChoose: () => void;
}

/** Nothing picked yet: the panel is one large tactile target. */
export function AppPickerDropzone({ dragging, onChoose }: AppPickerDropzoneProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onChoose}
      className={clsx(
        "flex w-full flex-col items-center gap-3",
        "rounded-[20px] px-6 py-12 text-center",
        "transition-[transform,background-color] duration-300",
        dragging ? "bg-accent/[0.05]" : "hover:-translate-y-1 hover:bg-accent/[0.03]"
      )}
    >
      <span
        className={clsx(
          "flex h-16 w-16 items-center justify-center",
          "border rounded-[22px]",
          // Colours belong in the list: this chip goes muted → accent on hover
          // and on drag-over, and leaving `color` and `background-color` out
          // made the one moment the page is meant to feel responsive snap
          // instead of ease.
          "transition-[transform,box-shadow,border-color,background-color,color]",
          "duration-300",
          dragging
            ? "scale-105 border-accent/40 bg-accent/10 text-accent shadow-accent-icon"
            : "border-border bg-soft text-muted group-hover:-rotate-3 group-hover:scale-105 group-hover:border-accent/20 group-hover:text-accent"
        )}
      >
        <UiIcon name={dragging ? "package" : "hard-drive"} className="h-7 w-7" />
      </span>

      <CardTitle className="text-xl">
        {t(dragging ? translation.DmgCompiler.DropNow : translation.DmgCompiler.ChooseApp)}
      </CardTitle>

      <BodyText tone="muted" className="max-w-sm leading-relaxed">
        {t(translation.DmgCompiler.ChooseAppHint)}
      </BodyText>

      <div className="mt-2">
        <FlowHint />
      </div>
    </button>
  );
}
