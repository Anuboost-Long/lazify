import clsx from "clsx";
import type { ReactNode } from "react";

import { projectStackIconName } from "@/shared/lib/icon-map";
import { formatStackLabel } from "@/shared/lib/stack-label";
import type { SyncedWorkspaceProject } from "@/shared/types/lazify";
import DevIcon from "@/shared/ui/icons/DevIcon";

interface ProjectPickerItemProps {
	project: SyncedWorkspaceProject;
	active: boolean;
	isDragging?: boolean;
	before?: ReactNode;
	titleAccessory?: ReactNode;
	detail?: ReactNode;
	/** Sits beside the row rather than in it, so it can be a button of its own. */
	action?: ReactNode;
	interactionProps?: Record<string, unknown>;
	onSelect: (projectPath: string) => void;
}

export function ProjectPickerItem({
	project,
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
			{...interactionProps}
			className={clsx(
				"group relative flex items-center rounded-xl",
				active ? "bg-text/8" : "hover:bg-text/4",
				"transition-colors duration-150",
				interactionProps?.draggable === true && "cursor-grab active:cursor-grabbing",
				isDragging && "opacity-40",
			)}
		>
			{before}

			<button
				type="button"
				title={project.projectPath}
				aria-current={active || undefined}
				onClick={() => onSelect(project.projectPath)}
				className={clsx(
					"flex min-w-0 flex-1 items-center gap-3 rounded-xl",
					"text-left",
					"px-2.5 py-2",
					"focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
				)}
			>
				<span
					className={clsx(
						"flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
						"bg-bg",
						"border",
						active ? "border-accent/40" : "border-border",
						"text-lg text-text",
					)}
				>
					<DevIcon name={projectStackIconName(project.stack)} />
				</span>

				<span className="min-w-0 flex-1">
					<span className="flex items-center gap-1.5">
						<span className="truncate text-sm font-semibold text-text">{project.projectName}</span>
						{titleAccessory}
					</span>
					<span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted">
						<span className="shrink-0">{formatStackLabel(project.stack)}</span>
						{detail ? (
							<>
								<span aria-hidden>·</span>
								<span className="truncate">{detail}</span>
							</>
						) : null}
					</span>
				</span>
			</button>

			{action ? <div className="shrink-0 pr-2">{action}</div> : null}
		</div>
	);
}
