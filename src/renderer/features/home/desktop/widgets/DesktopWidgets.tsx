import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { formatDate, useDateTimeFormat } from "@renderer/shared/hooks/use-date-time-format";
import { CaptionText, CardTitle } from "@renderer/shared/typography";
import UiIcon, { type UiIconName } from "@renderer/shared/ui/icons/UiIcon";

import type { DesktopWidgetId } from "../personalize/use-desktop-personalization";

export interface DesktopWidgetData {
	now: Date;
	openTasks: number;
	doneTasks: number;
	projectCount: number;
}

interface DesktopWidgetsProps {
	widgets: DesktopWidgetId[];
	data: DesktopWidgetData;
}

interface Cell {
	id: DesktopWidgetId;
	icon: UiIconName;
	value: string;
	label: string;
	/** 0–1, drawn as a rule under the value. Absent leaves the cell plain. */
	progress?: number;
}

function WidgetCell({ cell }: Readonly<{ cell: Cell }>) {
	return (
		<div className="flex min-w-[9rem] items-center gap-3 px-4 py-3">
			<span
				className={clsx(
					"flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px]",
					"bg-accent/10 text-accent",
				)}
			>
				<UiIcon name={cell.icon} className="h-4 w-4" />
			</span>

			<div className="min-w-0 flex-1">
				<CardTitle as="p" className="truncate tabular-nums">
					{cell.value}
				</CardTitle>

				{cell.progress === undefined ? null : (
					<span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-text/10">
						<span
							style={{ width: `${Math.round(cell.progress * 100)}%` }}
							className="block h-full rounded-full bg-accent"
						/>
					</span>
				)}

				<CaptionText as="span" tone="muted" className="mt-1 block truncate">
					{cell.label}
				</CaptionText>
			</div>
		</div>
	);
}

export function DesktopWidgets({ widgets, data }: Readonly<DesktopWidgetsProps>) {
	const { t } = useTranslation();
	const { dateFormat } = useDateTimeFormat();

	const totalTasks = data.openTasks + data.doneTasks;

	const cells: Cell[] = (
		[
			{
				id: "date",
				icon: "journal-page",
				value: formatDate(data.now, dateFormat),
				label: t(translation.Home.WidgetDate),
			},
			{
				id: "tasks",
				icon: "check-circle",
				value: `${data.openTasks}/${totalTasks}`,
				label: t(translation.Home.WidgetTasks),
				progress: totalTasks === 0 ? 0 : data.doneTasks / totalTasks,
			},
			{
				id: "projects",
				icon: "folder",
				value: String(data.projectCount),
				label: t(translation.Home.WidgetProjects),
			},
		] satisfies Cell[]
	).filter((cell) => widgets.includes(cell.id));

	if (cells.length === 0) return null;

	return (
		<div
			className={clsx(
				"flex items-stretch overflow-hidden rounded-2xl",
				"divide-x divide-border/40",
				"bg-soft/60 shadow-panel backdrop-blur-xl",
			)}
		>
			{cells.map((cell) => (
				<WidgetCell key={cell.id} cell={cell} />
			))}
		</div>
	);
}
