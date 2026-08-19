import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { SmallText } from "@renderer/shared/typography";
import type { DiffViewMode } from "./DiffView";

interface DiffModeToggleProps {
  value: DiffViewMode;
  onChange: (mode: DiffViewMode) => void;
}

export function DiffModeToggle({
  value,
  onChange,
}: Readonly<DiffModeToggleProps>) {
  const { t } = useTranslation();

  return (
    <div className="flex shrink-0 items-center rounded-md border border-border p-0.5">
      {(["unified", "split"] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={clsx(
            "rounded px-2 py-0.5 transition-colors",
            value === mode ? "bg-text/10" : "hover:bg-text/[0.06]",
          )}
        >
          <SmallText
            as="span"
            className={value === mode ? "!text-text" : "!text-muted"}
          >
            {t(
              mode === "unified"
                ? translation.Agents.DiffUnified
                : translation.Agents.DiffSplit,
            )}
          </SmallText>
        </button>
      ))}
    </div>
  );
}
