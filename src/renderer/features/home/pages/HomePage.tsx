import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import type { Task, TaskStatus } from "@main/tasks/types";
import { appRoute, getAgentsRoute, getWorkspaceProjectRoute } from "@renderer/app/app-routes";
import { translation } from "@renderer/i18n/translation";
import type { SyncedWorkspaceProject } from "@renderer/shared/types/lazify";
import type { UiIconName } from "@renderer/shared/ui/icons/UiIcon";
import { ProjectPickerModal } from "@renderer/shared/ui/project-picker/ProjectPickerModal";

import { usePromptPresets } from "../../prompts";
import { DeleteTaskConfirm } from "../../tasks/components/DeleteTaskConfirm";
import { SendTaskModal } from "../../tasks/components/SendTaskModal";
import { TaskDetailModal } from "../../tasks/components/TaskDetailModal";
import { ProjectsPanel } from "../components/ProjectsPanel";
import { TasksPanel, type TaskFilter } from "../components/TasksPanel";
import { HomeDesktop, type DesktopShortcut } from "../desktop/HomeDesktop";
import { CustomizePanel } from "../desktop/personalize/CustomizePanel";
import type { DesktopWindowId } from "../desktop/windows/window-frame";

interface HomePageProps {
	projects: SyncedWorkspaceProject[];
	activeProjectPath: string | null;
	onActiveProjectChange: (projectPath: string) => void;
}

const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
	todo: "doing",
	doing: "done",
	done: "todo",
};

/**
 * Where the app opens: a clock, a few icons, and nothing else until you ask.
 *
 * The dashboard did not go anywhere — tasks and projects are the same panels
 * they always were, moved inside windows you open, move and close. What the
 * screen says when you have not asked for anything is the time.
 */
export function HomePage({
	projects,
	activeProjectPath,
	onActiveProjectChange,
}: Readonly<HomePageProps>) {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { presets } = usePromptPresets();

	const [tasks, setTasks] = useState<Task[]>([]);
	const [filter, setFilter] = useState<TaskFilter>("open");
	const [pickingProject, setPickingProject] = useState(false);
	const [sending, setSending] = useState<Task | null>(null);
	// One editor for both jobs: a task to work on, or null to write a new one in
	// the project it is being added to.
	const [editor, setEditor] = useState<{ task: Task | null; projectPath: string } | null>(null);
	const opened = editor?.task ?? null;
	const [deleting, setDeleting] = useState<Task | null>(null);

	const refresh = useCallback(async () => {
		setTasks(await globalThis.lazify.listAllTasks());
	}, []);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	const projectNames = useMemo(
		() => Object.fromEntries(projects.map((project) => [project.projectPath, project.projectName])),
		[projects],
	);

	const shown = filter === "open" ? tasks.filter((task) => task.status !== "done") : tasks;

	const cycle = async (task: Task) => {
		await globalThis.lazify.setTaskStatus(task.id, NEXT_STATUS[task.status]);
		await refresh();
	};

	const removeTask = async (task: Task) => {
		setDeleting(null);
		await globalThis.lazify.deleteTask(task.id);
		setEditor((current) => (current?.task?.id === task.id ? null : current));
		await refresh();
	};

	const startNewTask = () => {
		if (projects.length === 0) {
			navigate(appRoute.workspace);
			return;
		}

		if (activeProjectPath) setEditor({ task: null, projectPath: activeProjectPath });
		else setPickingProject(true);
	};

	const openAgents = (projectPath: string) => {
		onActiveProjectChange(projectPath);
		navigate(getAgentsRoute(projectPath));
	};

	const shortcuts: DesktopShortcut[] = [
		{
			id: "tasks",
			label: t(translation.Home.TasksWindow),
			icon: "journal-page",
			windowId: "tasks",
		},
		{
			id: "projects",
			label: t(translation.Home.ProjectsWindow),
			icon: "folder",
			windowId: "projects",
		},
		{
			id: "agents",
			label: t(translation.Navigation.Agents),
			icon: "code",
			onSelect: () => (activeProjectPath ? openAgents(activeProjectPath) : navigate(appRoute.agents)),
		},
		{
			id: "workspace",
			label: t(translation.Navigation.Workspace),
			icon: "multi-window",
			onSelect: () => navigate(appRoute.workspace),
		},
		{
			id: "settings",
			label: t(translation.Navigation.Settings),
			icon: "settings",
			onSelect: () => navigate(appRoute.settings),
		},
		{
			id: "customize",
			label: t(translation.Home.Customize),
			icon: "sparks",
			windowId: "customize",
		},
	];

	const windowTitles: Record<DesktopWindowId, { title: string; icon: UiIconName }> = {
		tasks: { title: t(translation.Home.YourTasks), icon: "journal-page" },
		projects: { title: t(translation.Agents.Projects), icon: "folder" },
		customize: { title: t(translation.Home.Customize), icon: "sparks" },
	};

	const renderWindow = (id: DesktopWindowId) => {
		if (id === "customize") return <CustomizePanel />;

		if (id === "tasks") {
			return (
				<TasksPanel
					tasks={tasks}
					shown={shown}
					filter={filter}
					projectNames={projectNames}
					onFilterChange={setFilter}
					onAddTask={startNewTask}
					onOpenTask={(task) => setEditor({ task, projectPath: task.projectPath })}
					onCycleStatus={(task) => void cycle(task)}
					onSendPrompt={setSending}
					onOpenAgents={(task) => openAgents(task.projectPath)}
					onDeleteTask={setDeleting}
				/>
			);
		}

		return (
			<ProjectsPanel
				projects={projects}
				tasks={tasks}
				activeProjectPath={activeProjectPath}
				onOpenProject={(projectPath) => {
					onActiveProjectChange(projectPath);
					navigate(getWorkspaceProjectRoute(projectPath));
				}}
				onOpenWorkspace={() => navigate(appRoute.workspace)}
			/>
		);
	};

	return (
		<>
			<HomeDesktop
				shortcuts={shortcuts}
				windowTitles={windowTitles}
				widgetData={{
					now: new Date(),
					openTasks: tasks.filter((task) => task.status !== "done").length,
					doneTasks: tasks.filter((task) => task.status === "done").length,
					projectCount: projects.length,
				}}
				renderWindow={renderWindow}
			/>

			<TaskDetailModal
				open={editor !== null}
				task={opened}
				projects={projects}
				projectPath={editor?.projectPath ?? ""}
				projectName={
					editor ? (projectNames[editor.projectPath] ?? editor.projectPath.split("/").at(-1) ?? "") : ""
				}
				presets={presets}
				onSetStatus={(status) => {
					if (!editor?.task) return;
					void globalThis.lazify.setTaskStatus(editor.task.id, status).then(refresh);
					setEditor({ ...editor, task: { ...editor.task, status } });
				}}
				onDeleteTask={() => setDeleting(opened)}
				onSaveTask={(input) => {
					if (!editor) return;

					if (editor.task) {
						void globalThis.lazify.updateTask(editor.task.id, input).then(refresh);
						return;
					}

					// Saved for the first time: the pane stays open on the task that now
					// exists, so its status, history and agents are there to use.
					void globalThis.lazify.createTask(input).then((created) => {
						setEditor({ task: created, projectPath: created.projectPath });
						void refresh();
					});
				}}
				onSent={() => {
					setEditor(null);
					void refresh();
				}}
				onClose={() => setEditor(null)}
			/>

			<DeleteTaskConfirm
				task={deleting}
				onConfirm={(task) => void removeTask(task)}
				onCancel={() => setDeleting(null)}
			/>

			<SendTaskModal
				open={sending !== null}
				task={sending}
				onSent={(session) => {
					// Sending starts the task, so the list is asked again on the way out.
					void refresh();
					// Follow the prompt: the paste lands when that terminal is on screen.
					openAgents(session.projectPath);
				}}
				onClose={() => setSending(null)}
			/>

			<ProjectPickerModal
				open={pickingProject}
				projects={projects}
				selectedPath={activeProjectPath ?? ""}
				title={translation.PromptBuilder.ChooseProject}
				emptyMessage={translation.Tasks.SyncFirst}
				onSelect={(projectPath) => {
					onActiveProjectChange(projectPath);
					setEditor({ task: null, projectPath });
				}}
				onClose={() => setPickingProject(false)}
			/>
		</>
	);
}
