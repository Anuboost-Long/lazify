import clsx from "clsx";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@/i18n/translation";
import { formatDate, useDateTimeFormat } from "@/shared/hooks/use-date-time-format";
import { CaptionText, CardTitle } from "@/shared/typography";
import { IconButton } from "@/shared/ui/IconButton";
import UiIcon, { type UiIconName } from "@/shared/ui/icons/UiIcon";

import { useNow } from "../clock/use-now";
import type { DesktopWidgetId } from "../personalize/use-desktop-personalization";
import { useDesktopNote } from "./use-desktop-note";
import { formatCountdown, useFocusTimer } from "./use-focus-timer";
import { useGitSummary, type GitSummary } from "./use-git-summary";

export interface DesktopWidgetData {
	now: Date;
	openTasks: number;
	doneTasks: number;
	projectCount: number;
	runningAgents: number;
	waitingAgents: number;
	activeProjectPath: string | null;
}

interface DesktopWidgetsProps {
	widgets: DesktopWidgetId[];
	data: DesktopWidgetData;
	onOpenAgents: () => void;
	onOpenProject: (projectPath: string) => void;
}

interface Cell {
	id: DesktopWidgetId;
	icon: UiIconName;
	value: string;
	label: string;
	/** 0–1, drawn as a rule under the value. Absent leaves the cell plain. */
	progress?: number;
	/** Makes the whole cell a button. */
	onSelect?: () => void;
	/** Controls at the end of the cell, for a cell that is not itself a button. */
	controls?: ReactNode;
}

function WidgetCell({ cell }: Readonly<{ cell: Cell }>) {
	const body = (
		<>
			<span
				className={clsx(
					"flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px]",
					"bg-accent/10 text-accent",
				)}
			>
				<UiIcon name={cell.icon} className="h-4 w-4" />
			</span>

			<div className="min-w-0 flex-1 text-left">
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

			{cell.controls}
		</>
	);

	if (cell.onSelect) {
		return (
			<button
				type="button"
				onClick={cell.onSelect}
				className={clsx(
					"flex min-w-40 flex-1 basis-0 items-center gap-3 px-4 py-3",
					"transition-colors hover:bg-text/5",
					"focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accentSoft",
				)}
			>
				{body}
			</button>
		);
	}

	return <div className="flex min-w-40 flex-1 basis-0 items-center gap-3 px-4 py-3">{body}</div>;
}

const MAX_CELLS_PER_ROW = 3;

/** Sized by the widest row, so every row shares one edge and a lone widget is not stretched across the screen. */
const PANEL_WIDTH_CLASS: Record<number, string> = {
	1: "max-w-xs",
	2: "max-w-lg",
	3: "max-w-2xl",
};

/** Splits cells into rows of at most three, as even as possible: 4 → 2 + 2, 5 → 3 + 2, 7 → 3 + 2 + 2. */
export function balancedRows<T>(items: T[]): T[][] {
	const rowCount = Math.ceil(items.length / MAX_CELLS_PER_ROW);
	const rows: T[][] = [];
	let start = 0;

	for (let row = 0; row < rowCount; row++) {
		const size = Math.ceil((items.length - start) / (rowCount - row));
		rows.push(items.slice(start, start + size));
		start += size;
	}

	return rows;
}

function gitCell(
	summary: GitSummary | null,
	projectPath: string | null,
	t: (key: string, options?: Record<string, unknown>) => string,
): Pick<Cell, "value" | "label"> {
	if (!projectPath) return { value: "—", label: t(translation.Home.GitNoProject) };
	if (!summary?.isGitRepo) return { value: "—", label: t(translation.Home.GitNotRepo) };

	return {
		value: summary.branch ?? "—",
		label:
			summary.changedFiles === 0
				? t(translation.Home.GitClean)
				: t(translation.Home.GitChanges, { count: summary.changedFiles }),
	};
}

function TimerControls({ timer }: Readonly<{ timer: ReturnType<typeof useFocusTimer> }>) {
	const { t } = useTranslation();
	const toggleLabel = t(timer.running ? translation.Home.TimerPause : translation.Home.TimerStart);

	return (
		<span className="flex shrink-0 items-center gap-0.5">
			{timer.done ? null : (
				<IconButton
					icon={timer.running ? "pause" : "play"}
					title={toggleLabel}
					aria-label={toggleLabel}
					onClick={timer.running ? timer.pause : timer.start}
				/>
			)}
			<IconButton
				icon="refresh-circle"
				title={t(translation.Home.TimerReset)}
				aria-label={t(translation.Home.TimerReset)}
				onClick={timer.reset}
			/>
		</span>
	);
}

function DesktopNote() {
	const { t } = useTranslation();
	const { note, setNote } = useDesktopNote();

	return (
		<textarea
			value={note}
			onChange={(event) => setNote(event.target.value)}
			aria-label={t(translation.Home.WidgetNote)}
			placeholder={t(translation.Home.NotePlaceholder)}
			rows={3}
			className={clsx(
				"block w-full resize-none",
				"bg-transparent",
				"text-sm text-text placeholder:text-muted",
				"px-4 py-3",
				"focus-visible:outline-hidden",
			)}
		/>
	);
}

export function DesktopWidgets({
	widgets,
	data,
	onOpenAgents,
	onOpenProject,
}: Readonly<DesktopWidgetsProps>) {
	const { t } = useTranslation();
	const { dateFormat } = useDateTimeFormat();
	const now = useNow();
	const timer = useFocusTimer(now);
	const git = useGitSummary(data.activeProjectPath, widgets.includes("git"));
	const { activeProjectPath } = data;

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
			{
				id: "agents",
				icon: "radar",
				value: String(data.runningAgents),
				label:
					data.waitingAgents > 0
						? t(translation.Home.AgentsCellWaiting, { count: data.waitingAgents })
						: t(translation.Home.AgentsCellRunning),
				onSelect: onOpenAgents,
			},
			{
				id: "git",
				icon: "git-branch",
				...gitCell(git, activeProjectPath, t),
				onSelect: activeProjectPath ? () => onOpenProject(activeProjectPath) : undefined,
			},
			{
				id: "timer",
				icon: "history",
				value: formatCountdown(timer.remainingMs),
				label: t(timer.done ? translation.Home.TimerDone : translation.Home.TimerFocus),
				controls: <TimerControls timer={timer} />,
			},
		] satisfies Cell[]
	).filter((cell) => widgets.includes(cell.id));

	const showNote = widgets.includes("note");
	const rows = balancedRows(cells);

	if (cells.length === 0 && !showNote) return null;

	return (
		<div
			className={clsx(
				"flex w-full flex-col overflow-hidden rounded-2xl",
				PANEL_WIDTH_CLASS[rows[0]?.length ?? 1],
				"divide-y divide-border",
				"bg-soft/60 shadow-panel backdrop-blur-xl",
			)}
		>
			{rows.map((row) => (
				<div key={row[0].id} className="flex items-stretch divide-x divide-border">
					{row.map((cell) => (
						<WidgetCell key={cell.id} cell={cell} />
					))}
				</div>
			))}

			{showNote ? <DesktopNote /> : null}
		</div>
	);
}
