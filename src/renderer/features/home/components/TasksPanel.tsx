import clsx from "clsx";
import { useTranslation } from "react-i18next";

import type { Task } from "@main/tasks/types";
import { translation } from "@renderer/i18n/translation";
import { CaptionText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { SegmentedTabs, type SegmentedTab } from "@renderer/shared/ui/SegmentedTabs";

import { HomeTaskRow } from "./HomeTaskRow";
import { TaskStatTiles } from "./TaskStatTiles";

export type TaskFilter = "open" | "all";

const FILTERS: SegmentedTab<TaskFilter>[] = [
	{ id: "open", label: translation.Home.FilterOpen, icon: "play" },
	{ id: "all", label: translation.Home.FilterAll, icon: "journal-page" },
];

interface TasksPanelProps {
	tasks: Task[];
	shown: Task[];
	filter: TaskFilter;
	projectNames: Record<string, string>;
	onFilterChange: (filter: TaskFilter) => void;
	onAddTask: () => void;
	onOpenTask: (task: Task) => void;
	onCycleStatus: (task: Task) => void;
	onSendPrompt: (task: Task) => void;
	onOpenAgents: (task: Task) => void;
	onDeleteTask: (task: Task) => void;
}

export function TasksPanel({
	tasks,
	shown,
	filter,
	projectNames,
	onFilterChange,
	onAddTask,
	onOpenTask,
	onCycleStatus,
	onSendPrompt,
	onOpenAgents,
	onDeleteTask,
}: Readonly<TasksPanelProps>) {
	const { t } = useTranslation();

	return (
		<div className="flex flex-col">
			<div className="border-b border-border px-4 py-4">
				<TaskStatTiles tasks={tasks} />
			</div>

			<header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
				<SegmentedTabs tabs={FILTERS} active={filter} onSelect={onFilterChange} />
				<button
					type="button"
					onClick={onAddTask}
					className={clsx(
						"inline-flex h-8 items-center gap-2 rounded-[10px] border border-accent/70 bg-accent px-3.5",
						"text-xs font-semibold text-white transition-colors hover:bg-accentHover",
						"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
					)}
				>
					<UiIcon name="plus" className="h-4 w-4" strokeWidth={2.2} />
					{t(translation.Tasks.AddTask)}
				</button>
			</header>

			<div className="flex flex-col">
				{shown.map((task) => (
					<HomeTaskRow
						key={task.id}
						task={task}
						projectName={projectNames[task.projectPath] ?? task.projectPath.split("/").at(-1) ?? ""}
						onOpen={() => onOpenTask(task)}
						onCycleStatus={() => onCycleStatus(task)}
						onSendPrompt={() => onSendPrompt(task)}
						onOpenAgents={() => onOpenAgents(task)}
						onDelete={() => onDeleteTask(task)}
					/>
				))}

				{shown.length === 0 ? (
					<div className="flex flex-col items-center gap-3 py-12">
						<span className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-muted">
							<UiIcon name="check-circle" className="h-5 w-5" />
						</span>
						<CaptionText tone="muted">
							{t(filter === "open" ? translation.Home.AllClear : translation.Tasks.Empty)}
						</CaptionText>
						<button
							type="button"
							onClick={onAddTask}
							className={clsx(
								"rounded-[10px] border border-accent/30 bg-accent/10 px-4 py-2",
								"text-[12px] font-semibold text-accent hover:bg-accent/15",
								"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
							)}
						>
							{t(translation.Tasks.AddTask)}
						</button>
					</div>
				) : null}
			</div>
		</div>
	);
}
