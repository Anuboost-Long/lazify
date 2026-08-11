import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { CaptionText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

interface AgentMonitorSlotProps {
  index: number;

  onAdd: () => void;
}

export function AgentMonitorSlot({ index, onAdd }: Readonly<AgentMonitorSlotProps>) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onAdd}
      aria-label={t(translation.Agents.MonitorAddPanel)}
      className={clsx(
        "group relative flex h-full items-center justify-center overflow-hidden",
        "rounded-xl border border-dashed border-border bg-soft/40",
        "transition-colors duration-200",
        "hover:bg-text/[0.03] focus:outline-none focus-visible:bg-text/[0.03]"
      )}
    >

      <span
        aria-hidden
        className={clsx(
          "pointer-events-none absolute inset-0 rounded-xl border border-accent/30",
          "opacity-0 transition-opacity duration-200",
          "group-hover:opacity-100 group-focus-visible:opacity-100"
        )}
      />

      <span
        aria-hidden
        className={clsx(
          "absolute left-3 top-3 font-mono text-[10px] leading-none text-muted",
          "opacity-50 transition-opacity duration-200",
          "group-hover:opacity-0 group-focus-visible:opacity-0"
        )}
      >
        {String(index).padStart(2, "0")}
      </span>

      <span
        className={clsx(
          "flex translate-y-1 scale-95 flex-col items-center gap-2 opacity-0",
          "transition-all duration-200 ease-out",
          "group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100",
          "group-focus-visible:translate-y-0 group-focus-visible:scale-100",
          "group-focus-visible:opacity-100"
        )}
      >
        <span
          className={clsx(
            "flex h-10 w-10 items-center justify-center rounded-full",
            "border border-accent/30 bg-accent/10 text-accent"
          )}
        >
          <UiIcon name="plus" className="h-5 w-5" />
        </span>

        <CaptionText className="!text-muted">
          {t(translation.Agents.MonitorAddPanel)}
        </CaptionText>
      </span>
    </button>
  );
}
