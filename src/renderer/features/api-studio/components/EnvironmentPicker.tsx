import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { ApiEnvironment } from "../types";

interface EnvironmentPickerProps {
  environments: ApiEnvironment[];
  activeId: string;
  missingCount: number;
  onSelect: (id: string) => void;
  onManage: () => void;
}

export function EnvironmentPicker({
  environments,
  activeId,
  missingCount,
  onSelect,
  onManage
}: Readonly<EnvironmentPickerProps>) {
  const { t } = useTranslation();

  return (
    <div
      className={clsx(
        "flex h-10 items-center rounded-lg border border-border",
        "bg-soft transition-colors focus-within:border-accent/45"
      )}
    >
      <label className="relative flex h-full items-center">
        <span className="sr-only">{t(translation.ApiStudio.SwitchEnvironment)}</span>
        <UiIcon name="key" className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted" />
        <select
          value={activeId}
          onChange={(event) => onSelect(event.target.value)}
          className={clsx(
            "h-full appearance-none rounded-l-lg bg-transparent pl-8 pr-2",
            "text-xs font-medium text-text outline-none"
          )}
        >
          {environments.map((environment) => (
            <option key={environment.id} value={environment.id}>
              {environment.name}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={onManage}
        title={t(translation.ApiStudio.Environment)}
        className={clsx(
          "flex h-full items-center gap-1.5 rounded-r-lg border-l border-border px-2.5",
          "text-muted transition-colors hover:text-accent"
        )}
      >
        <UiIcon name="settings" className="h-3.5 w-3.5" />
        {missingCount > 0 ? (
          <span className="rounded-full bg-warning/15 px-1.5 text-[10px] font-semibold text-warning">
            {missingCount}
          </span>
        ) : null}
      </button>
    </div>
  );
}
