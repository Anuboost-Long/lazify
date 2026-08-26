import { ipcRenderer } from "electron";

import type { BuiltPrompt } from "../../main/prompts/types";
import type {
	Task,
	TaskAgentRun,
	TaskAgentRunInput,
	TaskInput,
	TaskStatus,
	TaskStatusEvent,
	TaskStatusSource,
} from "../../main/tasks/types";
export const tasksApi = {
	listTasks: (projectPath: string): Promise<Task[]> =>
		ipcRenderer.invoke("lazify:list-tasks", projectPath),
	listAllTasks: (): Promise<Task[]> => ipcRenderer.invoke("lazify:list-all-tasks"),
	createTask: (input: TaskInput): Promise<Task> => ipcRenderer.invoke("lazify:create-task", input),
	updateTask: (id: string, input: TaskInput): Promise<boolean> =>
		ipcRenderer.invoke("lazify:update-task", id, input),
	setTaskStatus: (
		id: string,
		status: TaskStatus,
		source: TaskStatusSource = "manual",
	): Promise<boolean> => ipcRenderer.invoke("lazify:set-task-status", id, status, source),
	listTaskStatusEvents: (taskId: string): Promise<TaskStatusEvent[]> =>
		ipcRenderer.invoke("lazify:list-task-status-events", taskId),
	reorderTask: (id: string, sortOrder: number): Promise<boolean> =>
		ipcRenderer.invoke("lazify:reorder-task", id, sortOrder),
	deleteTask: (id: string): Promise<boolean> => ipcRenderer.invoke("lazify:delete-task", id),
	buildTaskPrompt: (taskId: string): Promise<BuiltPrompt | null> =>
		ipcRenderer.invoke("lazify:build-task-prompt", taskId),
	recordTaskRun: (input: TaskAgentRunInput): Promise<TaskAgentRun> =>
		ipcRenderer.invoke("lazify:record-task-run", input),
	listTaskRuns: (taskId: string): Promise<TaskAgentRun[]> =>
		ipcRenderer.invoke("lazify:list-task-runs", taskId),
	completeTaskRun: (id: string): Promise<boolean> =>
		ipcRenderer.invoke("lazify:complete-task-run", id),
	completeAgentTaskRuns: (agentRunId: string): Promise<number> =>
		ipcRenderer.invoke("lazify:complete-agent-task-runs", agentRunId),
};
