import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { BodyText, CaptionText, OverlineText, SectionTitle } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { BaseModal } from "@renderer/shared/ui/modal/BaseModal";
import {
  MONITOR_PANEL_SIZES,
  type MonitorPanelSize,
} from "../hooks/use-monitor-panels";

interface AgentMonitorSizeModalProps {
  panelLabel: string | null;
  current: MonitorPanelSize;
  onSelect: (size: MonitorPanelSize) => void;
  onClose: () => void;
}

const SIZE_CELLS: Record<MonitorPanelSize, boolean[]> = {
  default: [true, false, false, false],
  wide: [true, true, false, false],
  large: [true, true, true, true],
};

const SIZE_LABEL: Record<MonitorPanelSize, string> = {
  default: translation.Agents.MonitorSizeDefault,
  wide: translation.Agents.MonitorSizeWide,
  large: translation.Agents.MonitorSizeLarge,
};

const SIZE_DESC: Record<MonitorPanelSize, string> = {
  default: translation.Agents.MonitorSizeDefaultDesc,
  wide: translation.Agents.MonitorSizeWideDesc,
  large: translation.Agents.MonitorSizeLargeDesc,
};

function SizePreview({ size }: Readonly<{ size: MonitorPanelSize }>) {
  return (
    <div
      aria-hidden
      className={clsx(
        "grid h-9 w-9 shrink-0 grid-cols-2 grid-rows-2 gap-[3px]",
        "rounded-lg border border-border bg-soft p-1"
      )}
    >
      {SIZE_CELLS[size].map((filled, cell) => (
        <span
          key={cell}
          className={clsx("rounded-[2px]", filled ? "bg-accent/70" : "bg-text/10")}
        />
      ))}
    </div>
  );
}

export function AgentMonitorSizeModal({
  panelLabel,
  current,
  onSelect,
  onClose,
}: Readonly<AgentMonitorSizeModalProps>) {
  const { t } = useTranslation();

  return (
    <BaseModal open={panelLabel !== null} onClose={onClose}>
      <div
        className={clsx(
          "w-[26rem] max-w-[calc(100vw-2rem)] overflow-hidden",
          "rounded-shell border border-border bg-soft shadow-panel"
        )}
      >
        <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-5">
          <div className="min-w-0">

            <OverlineText className="truncate text-muted">
              {panelLabel ?? ""}
            </OverlineText>
            <SectionTitle className="mt-1 truncate text-2xl">
              {t(translation.Agents.MonitorSizeTitle)}
            </SectionTitle>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t(translation.GlobalTerm.Close)}
            className={clsx(
              "shrink-0 rounded-xl border border-border bg-bg p-2 transition-colors duration-150",
              "text-muted hover:border-accent/30 hover:text-text"
            )}
          >
            <UiIcon name="xmark" className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-2 px-6 py-5">
          <CaptionText tone="muted">{t(translation.Agents.MonitorSizeDesc)}</CaptionText>

          {MONITOR_PANEL_SIZES.map((size) => {
            const selected = size === current;

            return (
              <button
                key={size}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  onSelect(size);
                  onClose();
                }}
                className={clsx(
                  "flex items-center gap-3 rounded-2xl border px-4 py-3 text-left",
                  "transition-colors duration-150",
                  selected
                    ? "border-accent/50 bg-accent/[0.06]"
                    : "border-border bg-bg hover:border-accent/50 hover:bg-accent/[0.06]"
                )}
              >
                <SizePreview size={size} />

                <div className="min-w-0 flex-1">
                  <BodyText className="truncate">{t(SIZE_LABEL[size])}</BodyText>
                  <CaptionText tone="muted" className="truncate">
                    {t(SIZE_DESC[size])}
                  </CaptionText>
                </div>

                <UiIcon
                  name="check-circle"
                  className={clsx(
                    "h-4 w-4 shrink-0 text-accent",
                    selected ? "opacity-100" : "opacity-0"
                  )}
                />
              </button>
            );
          })}
        </div>
      </div>
    </BaseModal>
  );
}
