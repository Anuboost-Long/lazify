import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { RailButton } from "./AgentToolRail";
import type { AgentRailTab } from "./AgentTabBar";

interface AgentMonitorRailProps {
  railTab: AgentRailTab | null;
  onToggleRail: (tab: AgentRailTab) => void;

  targetLabel: string | null;

  changeCount: number;
  activityUnread: number;

  onPickPath: (() => void) | null;
  onOpenConsole: () => void;
}

export function AgentMonitorRail({
  railTab,
  onToggleRail,
  targetLabel,
  changeCount,
  activityUnread,
  onPickPath,
  onOpenConsole,
}: Readonly<AgentMonitorRailProps>) {
  const { t } = useTranslation();
  const scoped = targetLabel !== null;
  const horizontal = { indicator: "bottom" as const };

  const forTarget = (label: string) =>
    scoped ? `${label} — ${targetLabel}` : `${label} (${t(translation.Agents.MonitorNoTarget)})`;

  return (
    <div
      className={clsx(
        "flex shrink-0 items-center gap-1"
      )}
    >
      <RailButton
        icon="journal-page"
        label={forTarget(t(translation.Agents.Changes))}
        selected={railTab === "changes"}
        badge={changeCount}
        disabled={!scoped}
        onClick={() => onToggleRail("changes")}
        {...horizontal}
      />

      <RailButton
        icon="git-branch"
        label={forTarget(t(translation.Agents.GitChanges))}
        selected={railTab === "git"}
        disabled={!scoped}
        onClick={() => onToggleRail("git")}
        {...horizontal}
      />

      <RailButton
        icon="folder"
        label={forTarget(t(translation.Agents.Files))}
        selected={railTab === "files"}
        disabled={!scoped}
        onClick={() => onToggleRail("files")}
        {...horizontal}
      />

      <RailButton
        icon="key"
        label={forTarget(t(translation.EnvPane.Title))}
        selected={railTab === "env"}
        disabled={!scoped}
        onClick={() => onToggleRail("env")}
        {...horizontal}
      />

      <RailButton
        icon="check-circle"
        label={forTarget(t(translation.Tasks.Title))}
        selected={railTab === "tasks"}
        disabled={!scoped}
        onClick={() => onToggleRail("tasks")}
        {...horizontal}
      />

      <RailButton
        icon="terminal"
        label={forTarget(t(translation.Agents.Console))}
        selected={false}
        disabled={!scoped}
        onClick={onOpenConsole}
        {...horizontal}
      />

      <RailButton
        icon="folder-plus"
        label={forTarget(t(translation.Agents.PathToAgent))}
        selected={false}
        disabled={!onPickPath}
        onClick={() => onPickPath?.()}
        {...horizontal}
      />

      <span aria-hidden className="mx-1 h-5 w-px shrink-0 rounded-full bg-border" />

      <RailButton
        icon="bell"
        label={t(translation.Agents.Activity)}
        selected={railTab === "activity"}
        badge={activityUnread}
        onClick={() => onToggleRail("activity")}
        {...horizontal}
      />

      <RailButton
        icon="activity"
        label={t(translation.Agents.Usage)}
        selected={railTab === "usage"}
        onClick={() => onToggleRail("usage")}
        {...horizontal}
      />
    </div>
  );
}
