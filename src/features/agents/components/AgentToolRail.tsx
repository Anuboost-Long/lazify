import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@/i18n/translation";
import UiIcon from "@/shared/ui/icons/UiIcon";
import type { UiIconName } from "@/shared/ui/icons/UiIcon";
import { Tooltip } from "@/shared/ui/Tooltip";

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
}

export interface RailButtonProps {
	icon: UiIconName;
	label: string;
	selected: boolean;
	onClick: () => void;

	live?: boolean;

	badge?: number;

	disabled?: boolean;

	/** Where the label opens: beside a column of buttons, below a row of them. */
	tooltipSide?: "left" | "bottom";
}

export function RailButton({
	icon,
	label,
	selected,
	onClick,
	live,
	badge,
	disabled = false,
	tooltipSide = "left",
}: Readonly<RailButtonProps>) {
	return (
		<Tooltip content={label} side={tooltipSide}>
			<button
				type="button"
				onClick={onClick}
				disabled={disabled}
				aria-label={label}
				aria-pressed={selected}
				className={clsx(
					"relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors",
					selected ? "bg-accent/10 text-accent" : "text-muted enabled:hover:bg-accent/6 enabled:hover:text-text",
					disabled && "cursor-not-allowed opacity-40",
				)}
			>
				<UiIcon name={icon} filled={selected} className={clsx("h-4 w-4", live && !selected && "text-accent")} />

				{badge && badge > 0 ? (
					<span
						className={clsx(
							"absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center",
							"rounded-full bg-accent px-1 text-[9px] font-semibold leading-none text-bg",
						)}
					>
						{badge > 99 ? "99+" : badge}
					</span>
				) : null}
			</button>
		</Tooltip>
	);
}

const RailGroupBreak = () => <span aria-hidden className="my-2 h-px w-6 shrink-0 bg-border" />;

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
			data-tour="agent-tools"
			className={clsx("flex h-full w-10 shrink-0 flex-col items-center gap-1", "border-l border-border bg-soft py-2")}
		>
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

			<RailGroupBreak />

			<RailButton
				icon="journal-page"
				label={t(translation.Agents.Changes)}
				selected={railTab === "changes"}
				badge={changeCount}
				onClick={() => onToggleRail("changes")}
			/>

			<RailButton
				icon="git-branch"
				label={t(translation.Agents.GitChanges)}
				selected={railTab === "git"}
				onClick={() => onToggleRail("git")}
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
				icon="check-circle"
				label={t(translation.Tasks.Title)}
				selected={railTab === "tasks"}
				onClick={() => onToggleRail("tasks")}
			/>

			<RailGroupBreak />

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
