import { useTranslation } from "react-i18next";

import { translation } from "@/i18n/translation";

import type { AgentRailTab } from "./AgentTabBar";
import { RailButton } from "./AgentToolRail";

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
		<div data-tour="monitor-tools" className="flex shrink-0 items-center gap-1">
			<RailButton
				tooltipSide="bottom"
				icon="journal-page"
				label={forTarget(t(translation.Agents.Changes))}
				selected={railTab === "changes"}
				badge={changeCount}
				disabled={!scoped}
				onClick={() => onToggleRail("changes")}
			/>

			<RailButton
				tooltipSide="bottom"
				icon="git-branch"
				label={forTarget(t(translation.Agents.GitChanges))}
				selected={railTab === "git"}
				disabled={!scoped}
				onClick={() => onToggleRail("git")}
			/>

			<RailButton
				tooltipSide="bottom"
				icon="folder"
				label={forTarget(t(translation.Agents.Files))}
				selected={railTab === "files"}
				disabled={!scoped}
				onClick={() => onToggleRail("files")}
			/>

			<RailButton
				tooltipSide="bottom"
				icon="key"
				label={forTarget(t(translation.EnvPane.Title))}
				selected={railTab === "env"}
				disabled={!scoped}
				onClick={() => onToggleRail("env")}
			/>

			<RailButton
				tooltipSide="bottom"
				icon="check-circle"
				label={forTarget(t(translation.Tasks.Title))}
				selected={railTab === "tasks"}
				disabled={!scoped}
				onClick={() => onToggleRail("tasks")}
			/>

			<span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-border" />

			<RailButton
				tooltipSide="bottom"
				icon="terminal"
				label={forTarget(t(translation.Agents.Console))}
				selected={false}
				disabled={!scoped}
				onClick={onOpenConsole}
			/>

			<RailButton
				tooltipSide="bottom"
				icon="folder-plus"
				label={forTarget(t(translation.Agents.PathToAgent))}
				selected={false}
				disabled={!onPickPath}
				onClick={() => onPickPath?.()}
			/>

			<span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-border" />

			<RailButton
				tooltipSide="bottom"
				icon="bell"
				label={t(translation.Agents.Activity)}
				selected={railTab === "activity"}
				badge={activityUnread}
				onClick={() => onToggleRail("activity")}
			/>

			<RailButton
				tooltipSide="bottom"
				icon="activity"
				label={t(translation.Agents.Usage)}
				selected={railTab === "usage"}
				onClick={() => onToggleRail("usage")}
			/>
		</div>
	);
}
