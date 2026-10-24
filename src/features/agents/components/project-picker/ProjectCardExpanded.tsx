import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@/i18n/translation";
import UiIcon from "@/shared/ui/icons/UiIcon";
import { ProjectPickerItem } from "@/shared/ui/project-picker/ProjectPickerItem";
import { Tooltip } from "@/shared/ui/Tooltip";

import type { CardShellProps } from "./types";

export function ProjectCardExpanded({
	project,
	active,
	running,
	waiting,
	tabCount,
	isDragging,
	onSelect,
	onCloseAll,
	dragProps,
	dropLine,
}: Readonly<CardShellProps>) {
	const { t } = useTranslation();

	return (
		<ProjectPickerItem
			project={project}
			active={active}
			isDragging={isDragging}
			before={dropLine}
			interactionProps={dragProps}
			onSelect={onSelect}
			titleAccessory={
				waiting > 0 ? (
					<span title={t(translation.Agents.NeedsAttention)} className="flex shrink-0 text-accent">
						<UiIcon name="bell" className="h-3.5 w-3.5 animate-pulse motion-reduce:animate-none" />
					</span>
				) : null
			}
			detail={running > 0 ? `${running} ${t(translation.Agents.Running)}` : t(translation.Agents.Idle)}
			action={
				tabCount > 0 ? (
					<Tooltip content={t(translation.Agents.CloseProjectTabs)} side="top">
						<button
							type="button"
							onClick={() => onCloseAll(project.projectPath)}
							aria-label={t(translation.Agents.CloseProjectTabs)}
							className={clsx(
								"flex h-6 items-center gap-1 rounded-md",
								"text-xs font-medium text-muted tabular-nums",
								"px-1.5",
								"opacity-0 transition-[opacity,color] group-hover:opacity-100 focus-visible:opacity-100 hover:text-error",
								"focus-visible:outline-2 focus-visible:outline-accent",
							)}
						>
							<UiIcon name="xmark" className="h-3 w-3" />
							{tabCount}
						</button>
					</Tooltip>
				) : null
			}
		/>
	);
}
