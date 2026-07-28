import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { UiIconName } from "@renderer/shared/ui/icons/UiIcon";
import type { AgentRailTab } from "./AgentTabBar";

/**
 * The vertical icon strip on the right edge of the agents workbench.
 *
 * Same shape as the workbench tool rail: clicking an icon opens its panel,
 * clicking the open one closes it. It lives here rather than in the tab bar
 * because the tab bar scrolls — with a handful of agents open, labelled tool
 * buttons crowded the tabs and then slid out of reach. A fixed strip stays put.
 */

interface AgentToolRailProps {
  /** Which side panel is open, if any. */
  railTab: AgentRailTab | null;
  onToggleRail: (tab: AgentRailTab) => void;
  /** Whether there is a run to debug at all. */
  showDebug: boolean;
  /** True while that run is live, which tints the debug and preview icons. */
  isScriptRunning: boolean;
  /** True while the preview tab is the one on screen. */
  previewActive: boolean;
  /** Opens the preview tab when there is none, and shows it either way. */
  onSelectPreview: () => void;
  /** Files touched since this project's agent session started. */
  changeCount: number;
  /** Alerts recorded since the activity feed was last looked at. */
  activityUnread: number;
}

interface RailButtonProps {
  icon: UiIconName;
  label: string;
  selected: boolean;
  onClick: () => void;
  /** Tinted when the icon is reporting a live run. */
  live?: boolean;
  /** Shown as a count in the corner; zero and below is no badge at all. */
  badge?: number;
}

function RailButton({ icon, label, selected, onClick, live, badge }: Readonly<RailButtonProps>) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={selected}
      className={clsx(
        "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors",
        selected
          ? "bg-accent/10 text-accent"
          : "text-muted hover:bg-accent/[0.06] hover:text-text"
      )}
    >
      {/* Accent rule on the outer edge marks the open panel. */}
      {selected ? (
        <span aria-hidden className="absolute inset-y-1 -right-2 w-0.5 rounded-full bg-accent" />
      ) : null}

      <UiIcon name={icon} className={clsx("h-4 w-4", live && !selected && "text-accent")} />

      {/* The count the label used to carry, now that there is no room for one. */}
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
}: Readonly<AgentToolRailProps>) {
  const { t } = useTranslation();

  return (
    <div
      className={clsx(
        "flex h-full w-10 shrink-0 flex-col items-center gap-1",
        "border-l border-border bg-soft py-2"
      )}
    >
      {/* Only offered once there is a run to control. */}
      {showDebug ? (
        <RailButton
          icon="bug"
          label={t(translation.Agents.Debug)}
          selected={railTab === "debug"}
          live={isScriptRunning}
          onClick={() => onToggleRail("debug")}
        />
      ) : null}

      {/* Not a panel: the preview is a tab, so this shows that tab rather than
          opening a rail beside the terminal. */}
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
