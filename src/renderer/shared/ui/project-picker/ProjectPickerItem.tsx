import clsx from "clsx";
import type { ReactNode } from "react";

import { getTechIconName } from "@renderer/shared/lib/icon-map";
import { formatStackLabel } from "@renderer/shared/lib/stack-label";
import type { SyncedWorkspaceProject } from "@renderer/shared/types/lazify";
import { CaptionText, CardTitle, PillText } from "@renderer/shared/typography";
import { CardShapes } from "@renderer/shared/ui/card/CardShapes";
import { SheetStack } from "@renderer/shared/ui/card/SheetStack";
import DevIcon from "@renderer/shared/ui/icons/DevIcon";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

interface ProjectPickerItemProps {
	project: SyncedWorkspaceProject;
	index: number;
	active: boolean;
	isDragging?: boolean;
	before?: ReactNode;
	titleAccessory?: ReactNode;
	detail?: ReactNode;
	action?: ReactNode;
	interactionProps?: Record<string, unknown>;
	onSelect: (projectPath: string) => void;
}

export function ProjectPickerItem({
	project,
	index,
	active,
	isDragging = false,
	before,
	titleAccessory,
	detail,
	action,
	interactionProps,
	onSelect,
}: Readonly<ProjectPickerItemProps>) {
	return (
		<div
			role="button"
			tabIndex={0}
			{...interactionProps}
			onClick={() => onSelect(project.projectPath)}
			onKeyDown={(event) => {
				if (event.key !== "Enter" && event.key !== " ") return;
				event.preventDefault();
				onSelect(project.projectPath);
			}}
			style={{ animationDelay: `${index * 45}ms` }}
			className={clsx(
				"group relative flex w-full animate-fadeIn flex-col gap-2.5 overflow-hidden",
				"rounded-[20px] border p-3 text-left",
				"transition-[transform,box-shadow,border-color] duration-300",
				"hover:-translate-y-1 hover:shadow-panel active:scale-[0.98]",
				interactionProps?.draggable === true && "cursor-grab active:cursor-grabbing",
				isDragging && "opacity-40",
				active ? "border-accent bg-bg shadow-panel" : "border-border bg-bg/80 hover:border-accent/40",
			)}
		>
			{before}
			<CardShapes variant={(index % 3) as 0 | 1 | 2} />

			<div className="relative flex items-start gap-2.5">
				<SheetStack active={active} icon={<DevIcon name={getTechIconName(project.stack)} />} />
				<div className="min-w-0 flex-1">
					<div className="flex items-start gap-1.5">
						<CardTitle className="min-w-0 flex-1 truncate text-sm">{project.projectName}</CardTitle>
						{titleAccessory}
					</div>
					<CaptionText
						tone="muted"
						className="mt-0.5 line-clamp-2 break-all !text-[10px] leading-[14px]"
					>
						{project.projectPath}
					</CaptionText>
				</div>
			</div>

			<div className="relative flex items-center justify-between gap-2">
				<div className="flex min-w-0 items-center gap-2">
					<PillText
						as="span"
						className={clsx(
							"shrink-0 rounded-full border px-2 py-0.5",
							active ? "border-accent/30 bg-accent/10 text-accent" : "border-border bg-soft text-muted",
						)}
					>
						{formatStackLabel(project.stack)}
					</PillText>
					{detail}
				</div>

				{action ?? (
					<span
						className={clsx(
							"flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
							"transition-transform duration-300 group-hover:translate-x-0.5",
							active ? "border-accent/50 text-accent" : "border-border text-muted",
						)}
					>
						<UiIcon name="arrow-right" className="h-3 w-3" />
					</span>
				)}
			</div>
		</div>
	);
}
