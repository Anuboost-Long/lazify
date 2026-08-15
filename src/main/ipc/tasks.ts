import { ipcMain } from "electron";

import {
  buildPromptForTask,
  completeRun,
  completeRunsForAgent,
  createTask,
  deleteTask,
  listAllTasks,
  listRuns,
  listStatusEvents,
  listTasks,
  recordRun,
  reorderTask,
  setTaskStatus,
  updateTask,
  type TaskAgentRunInput,
  type TaskInput,
  type TaskStatus,
  type TaskStatusSource
} from "../tasks";

export function registerTaskHandlers() {
  ipcMain.handle("lazify:list-tasks", async (_event, projectPath: string) =>
    listTasks(projectPath)
  );

  ipcMain.handle("lazify:list-all-tasks", async () => listAllTasks());

  ipcMain.handle("lazify:create-task", async (_event, input: TaskInput) => createTask(input));

  ipcMain.handle("lazify:update-task", async (_event, id: string, input: TaskInput) =>
    updateTask(id, input)
  );

  ipcMain.handle(
    "lazify:set-task-status",
    async (_event, id: string, status: TaskStatus, source: TaskStatusSource = "manual") =>
      setTaskStatus(id, status, source)
  );

  ipcMain.handle("lazify:list-task-status-events", async (_event, taskId: string) =>
    listStatusEvents(taskId)
  );

  ipcMain.handle("lazify:reorder-task", async (_event, id: string, sortOrder: number) =>
    reorderTask(id, sortOrder)
  );

  ipcMain.handle("lazify:delete-task", async (_event, id: string) => deleteTask(id));

  ipcMain.handle("lazify:build-task-prompt", async (_event, taskId: string) =>
    buildPromptForTask(taskId)
  );

  ipcMain.handle("lazify:record-task-run", async (_event, input: TaskAgentRunInput) =>
    recordRun(input)
  );

  ipcMain.handle("lazify:list-task-runs", async (_event, taskId: string) => listRuns(taskId));

  ipcMain.handle("lazify:complete-task-run", async (_event, id: string) => completeRun(id));

  // Called when an agent reports it has finished: whatever it was still holding
  // open gets closed off, without the renderer having to know which runs those were.
  ipcMain.handle("lazify:complete-agent-task-runs", async (_event, agentRunId: string) =>
    completeRunsForAgent(agentRunId)
  );
}
