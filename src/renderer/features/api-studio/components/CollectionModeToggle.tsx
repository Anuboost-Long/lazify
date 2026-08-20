import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import UiIcon, { type UiIconName } from "@renderer/shared/ui/icons/UiIcon";
import type { CollectionMode } from "../custom-collection";

interface CollectionModeToggleProps {
  mode: CollectionMode;
  discoveredCount: number;
  customCount: number;
  onChange: (mode: CollectionMode) => void;
}

const MODES: Array<{ id: CollectionMode; label: string; icon: UiIconName }> = [
  { id: "discovered", label: translation.ApiStudio.FromProject, icon: "import" },
  { id: "custom", label: translation.ApiStudio.CustomCollection, icon: "folder" }
];

export function CollectionModeToggle({
  mode,
  discoveredCount,
  customCount,
  onChange
}: Readonly<CollectionModeToggleProps>) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border bg-bg/45 p-0.5">
      {MODES.map((option) => {
        const selected = option.id === mode;
        const count = option.id === "discovered" ? discoveredCount : customCount;

        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.id)}
            className={clsx(
              "flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium",
              "transition-colors",
              selected ? "bg-text/[0.07] text-text" : "text-muted hover:text-text"
            )}
          >
            <UiIcon name={option.icon} className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{t(option.label)}</span>
            {count > 0 ? (
              <span className="shrink-0 rounded-full bg-text/[0.06] px-1.5 text-[10px] text-muted">
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
