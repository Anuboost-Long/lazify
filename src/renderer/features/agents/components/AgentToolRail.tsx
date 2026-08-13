import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { Tooltip } from "@renderer/shared/ui/Tooltip";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { UiIconName } from "@renderer/shared/ui/icons/UiIcon";
import type { AgentRailTab } from "./AgentTabBar";

interface AgentToolRailProps {
  railTab: AgentRailTab | null;
  onToggleRail: (tab: AgentRailTab) => void;

  showDebug: boolean;

  isScriptRunning: boolean;

  previewActive: boolean;

  onSelectPreview: () => void;

  changeCount: number;

  activityUnread: number;

  onPickPath: (() => void) | null;

  onOpenConsole: () => void;

  onOpenMonitor: () => void;
}

export interface RailButtonProps {
  icon: UiIconName;
  label: string;
  selected: boolean;
  onClick: () => void;

  live?: boolean;

  badge?: number;

  disabled?: boolean;
}

export function RailButton({
  icon,
  label,
  selected,
  onClick,
  live,
  badge,
  disabled = false,
}: Readonly<RailButtonProps>) {
  return (
    <Tooltip content={label} side="left">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        aria-pressed={selected}
        className={clsx(
          "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors",
          selected
            ? "bg-accent/10 text-accent"
            : "text-muted enabled:hover:bg-accent/[0.06] enabled:hover:text-text",
          disabled && "cursor-not-allowed opacity-40"
        )}
      >

        {selected ? (
          <span aria-hidden className="absolute inset-y-1 -right-2 w-0.5 rounded-full bg-accent" />
        ) : null}

        <UiIcon
          name={icon}
          filled={selected}
          className={clsx("h-4 w-4", live && !selected && "text-accent")}
        />

        {badge && badge > 0 ? (
          <span
            className={clsx(
              "absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center",
              "rounded-full bg-accent px-1 text-[9px] font-semibold leading-none text-bg"
            )}
          >
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </button>
    </Tooltip>
  );
}

export function AgentToolRail({
  railTab,
  onToggleRail,
  showDebug,
  isScriptRunning,
  previewActive,
  onSelectPreview,
  changeCount,
  activityUnread,
  onPickPath,
  onOpenConsole,
  onOpenMonitor,
}: Readonly<AgentToolRailProps>) {
  const { t } = useTranslation();

  return (
    <div
      className={clsx(
        "flex h-full w-10 shrink-0 flex-col items-center gap-1",
        "border-l border-border bg-soft py-2"
      )}
    >

      <RailButton
        icon="multi-window"
        label={t(translation.Agents.LiveMonitor)}
        selected={false}
        onClick={onOpenMonitor}
      />

      <span aria-hidden className="my-1 h-px w-5 shrink-0 rounded-full bg-border" />

      {showDebug ? (
        <RailButton
          icon="bug"
          label={t(translation.Agents.Debug)}
          selected={railTab === "debug"}
          live={isScriptRunning}
          onClick={() => onToggleRail("debug")}
        />
      ) : null}

      <RailButton
        icon="globe"
        label={t(translation.Agents.Preview)}
        selected={previewActive}
        live={isScriptRunning}
        onClick={onSelectPreview}
      />

      <RailButton
        icon="journal-page"
        label={t(translation.Agents.Changes)}
        selected={railTab === "changes"}
        badge={changeCount}
        onClick={() => onToggleRail("changes")}
      />

      <RailButton
        icon="folder"
        label={t(translation.Agents.Files)}
        selected={railTab === "files"}
        onClick={() => onToggleRail("files")}
      />

      <RailButton
        icon="key"
        label={t(translation.EnvPane.Title)}
        selected={railTab === "env"}
        onClick={() => onToggleRail("env")}
      />

      <RailButton
        icon="terminal"
        label={t(translation.Agents.Console)}
        selected={false}
        onClick={onOpenConsole}
      />

      {onPickPath ? (
        <RailButton
          icon="folder-plus"
          label={t(translation.Agents.PathToAgent)}
          selected={false}
          onClick={onPickPath}
        />
      ) : null}

      <RailButton
        icon="bell"
        label={t(translation.Agents.Activity)}
        selected={railTab === "activity"}
        badge={activityUnread}
        onClick={() => onToggleRail("activity")}
      />

      <RailButton
        icon="activity"
        label={t(translation.Agents.Usage)}
        selected={railTab === "usage"}
        onClick={() => onToggleRail("usage")}
      />
    </div>
  );
}
