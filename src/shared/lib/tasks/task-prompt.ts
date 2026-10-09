import { buildPrompt } from "@/platform/prompts";
import type { BuiltPrompt } from "@/features/prompts/lib/types";

import { getTask } from "./task-store";

/** §12's `buildPrompt(taskId)`: the stored task, straight to an agent prompt. */
export async function buildPromptForTask(taskId: string): Promise<BuiltPrompt | null> {
  const task = await getTask(taskId);
  if (!task) return null;

  return buildPrompt({
    projectPath: task.projectPath,
    projectName: task.projectPath.slice(task.projectPath.lastIndexOf("/") + 1),
    presetId: task.presetId,
    taskName: task.name,
    description: task.description,
    requirements: task.requirements,
    notes: task.notes,
    priority: task.priority,
    deadline: task.deadline
  });
}
