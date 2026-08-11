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

  const forTarget = (label: string) =>
    scoped ? `${label} — ${targetLabel}` : `${label} (${t(translation.Agents.MonitorNoTarget)})`;

  return (
    <div
      className={clsx(
        "flex h-full w-10 shrink-0 flex-col items-center gap-1",
        "border-l border-border bg-soft py-2"
      )}
    >
      <RailButton
        icon="journal-page"
        label={forTarget(t(translation.Agents.Changes))}
        selected={railTab === "changes"}
        badge={changeCount}
        disabled={!scoped}
        onClick={() => onToggleRail("changes")}
      />

      <RailButton
        icon="folder"
        label={forTarget(t(translation.Agents.Files))}
        selected={railTab === "files"}
        disabled={!scoped}
        onClick={() => onToggleRail("files")}
      />

      <RailButton
        icon="terminal"
        label={forTarget(t(translation.Agents.Console))}
        selected={false}
        disabled={!scoped}
        onClick={onOpenConsole}
      />

      <RailButton
        icon="folder-plus"
        label={forTarget(t(translation.Agents.PathToAgent))}
        selected={false}
        disabled={!onPickPath}
        onClick={() => onPickPath?.()}
      />

      <span aria-hidden className="my-1 h-px w-5 shrink-0 rounded-full bg-border" />

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
