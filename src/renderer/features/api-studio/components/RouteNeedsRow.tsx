import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

interface RouteNeedsRowProps {
  names: string[];
  unset: string[];
  onOpenEnvironment: () => void;
}

export function RouteNeedsRow({ names, unset, onOpenEnvironment }: Readonly<RouteNeedsRowProps>) {
  const { t } = useTranslation();

  if (names.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted">
        {t(translation.ApiStudio.Needs)}
      </span>

      {names.map((name) => (
        <button
          key={name}
          type="button"
          onClick={onOpenEnvironment}
          title={unset.includes(name) ? t(translation.ApiStudio.VariableMissing) : undefined}
          className={clsx(
            "flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[10px] transition-colors",
            unset.includes(name)
              ? "bg-warning/10 text-warning hover:bg-warning/[0.16]"
              : "bg-text/[0.06] text-muted hover:text-text"
          )}
        >
          {unset.includes(name) ? <UiIcon name="warning-triangle" className="h-2.5 w-2.5" /> : null}
          {name}
        </button>
      ))}
    </div>
  );
}
