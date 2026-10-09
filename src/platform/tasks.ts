import { completeRun, completeRunsForAgent, listRuns, recordRun } from "@/shared/lib/tasks/run-store";
import { listStatusEvents } from "@/shared/lib/tasks/status-events";
import { setTaskStatus as moveTask } from "@/shared/lib/tasks/task-store";
import type { TaskStatus, TaskStatusSource } from "@/shared/lib/tasks/types";

export { createTask, deleteTask, listAllTasks, listTasks, reorderTask, updateTask } from "@/shared/lib/tasks/task-store";

export function setTaskStatus(id: string, status: TaskStatus, source: TaskStatusSource = "manual") {
	return moveTask(id, status, source);
}

export const listTaskStatusEvents = listStatusEvents;
export const recordTaskRun = recordRun;
export const listTaskRuns = listRuns;
export const completeTaskRun = completeRun;
export const completeAgentTaskRuns = completeRunsForAgent;
