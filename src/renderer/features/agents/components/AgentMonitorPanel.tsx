import clsx from "clsx";
import { memo, useRef } from "react";
import { useTranslation } from "react-i18next";

import { XTermPanel } from "@renderer/features/workspace/components/XTermPanel";
import { translation } from "@renderer/i18n/translation";
import { CaptionText, SmallText } from "@renderer/shared/typography";
import { IconButton } from "@renderer/shared/ui/IconButton";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { AgentGlyph } from "./AgentGlyph";
import type { MonitorPanel, MonitorPanelSize } from "../hooks/use-monitor-panels";

const SIZE_SPAN: Record<MonitorPanelSize, string> = {
  default: "",
  wide: "md:col-span-2",
  large: "md:col-span-2 row-span-2",
};

const SIZE_LABEL: Record<MonitorPanelSize, string> = {
  default: translation.Agents.MonitorSizeDefault,
  wide: translation.Agents.MonitorSizeWide,
  large: translation.Agents.MonitorSizeLarge,
};

interface AgentMonitorPanelProps {
  panel: MonitorPanel;
  selected: boolean;
  waiting: boolean;
  allowSpan: boolean;
  dragging: boolean;
  dropTarget: boolean;
  onSelect: (runId: string) => void;
  onPickSize: (runId: string) => void;
  onRename: (runId: string) => void;
  onClear: (runId: string) => void;
  onDragStart: (runId: string) => void;
  onDragOver: (runId: string) => void;
  onDragLeave: (runId: string) => void;
  onDrop: (runId: string) => void;
  onDragEnd: () => void;
}

export const AgentMonitorPanel = memo(function AgentMonitorPanel({
  panel,
  selected,
  waiting,
  allowSpan,
  onSelect,
  onPickSize,
  onRename,
  onClear,
  dragging,
  dropTarget,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: Readonly<AgentMonitorPanelProps>) {
  const { t } = useTranslation();
  const { runId } = panel;

  const rootRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={rootRef}

      onMouseDownCapture={() => onSelect(runId)}
      onFocusCapture={() => onSelect(runId)}

      onDragOver={(event) => {
        if (!dragging) event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        onDragOver(runId);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        onDragLeave(runId);
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop(runId);
      }}
      className={clsx(
        "flex h-full flex-col overflow-hidden rounded-xl bg-bg",
        "border transition-colors duration-150",
        allowSpan && SIZE_SPAN[panel.size],
        dragging && "opacity-40",

        waiting && "shadow-glow",
        dropTarget
          ? "border-accent"
          : waiting
            ? "border-accent"
            : selected
              ? "border-accent/60"
              : "border-border"
      )}
    >
      <div

        draggable
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "move";

          event.dataTransfer.setData("text/plain", panel.id);
          if (rootRef.current) {
            event.dataTransfer.setDragImage(rootRef.current, 24, 16);
          }
          onDragStart(runId);
        }}
        onDragEnd={onDragEnd}
        title={t(translation.Agents.MonitorReorder)}
        className={clsx(
          "flex shrink-0 items-center gap-2",
          "border-b border-border px-2.5 py-2",
          "cursor-grab active:cursor-grabbing"
        )}
      >
        <div
          className={clsx(
            "flex h-6 w-6 shrink-0 items-center justify-center",
            "rounded-lg border border-border bg-soft"
          )}
        >
          {panel.kind === "agent" ? (
            <AgentGlyph agentId={panel.sourceId} className="h-3.5 w-3.5" />
          ) : (
            <UiIcon name="play" className="h-3 w-3 text-muted" />
          )}
        </div>

        <button
          type="button"
          onClick={() => onRename(runId)}
          title={t(translation.Agents.MonitorRename)}
          className={clsx(
            "min-w-0 flex-1 rounded-md px-1 py-0.5 text-left transition-colors",
            "hover:bg-text/[0.06]"
          )}
        >
          <SmallText className="block truncate !text-text">{panel.displayName}</SmallText>
          <CaptionText tone="muted" className="block truncate">
            {panel.projectName}
          </CaptionText>
        </button>

        {waiting ? (
          <span className="flex shrink-0 items-center gap-1.5">
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse"
            />
            <CaptionText className="!text-accent">
              {t(translation.Agents.NeedsAttention)}
            </CaptionText>
          </span>
        ) : null}

        {selected && !waiting ? (
          <CaptionText className="!text-accent shrink-0">
            {t(translation.Agents.MonitorTarget)}
          </CaptionText>
        ) : null}

        {panel.exited ? (
          <CaptionText tone="muted" className="shrink-0">
            {t(translation.Agents.MonitorPanelExited)}
          </CaptionText>
        ) : null}

        <IconButton
          icon={panel.size === "large" ? "collapse" : "expand"}
          title={t(translation.Agents.MonitorResize, {
            size: t(SIZE_LABEL[panel.size]),
          })}
          aria-label={t(translation.Agents.MonitorResize, {
            size: t(SIZE_LABEL[panel.size]),
          })}
          onClick={() => onPickSize(runId)}
        />

        <IconButton
          icon="xmark"
          title={t(translation.Agents.MonitorClearPanel)}
          aria-label={t(translation.Agents.MonitorClearPanel)}
          onClick={() => onClear(runId)}
        />
      </div>

      <div className="min-h-0 flex-1 p-1.5">

        <XTermPanel runId={panel.runId} isActive />
      </div>
    </div>
  );
});
