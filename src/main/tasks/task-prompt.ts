import path from "node:path";

import { buildPrompt, type BuiltPrompt } from "../prompts";
import { getTask } from "./task-store";

/** §12's `buildPrompt(taskId)`: the stored task, straight to an agent prompt. */
export function buildPromptForTask(taskId: string): BuiltPrompt | null {
  const task = getTask(taskId);
  if (!task) return null;

  return buildPrompt({
    projectPath: task.projectPath,
    projectName: path.basename(task.projectPath),
    presetId: task.presetId,
    taskName: task.name,
    description: task.description,
    requirements: task.requirements,
    notes: task.notes,
    priority: task.priority,
    deadline: task.deadline
  });
}
