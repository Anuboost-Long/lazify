import { randomUUID } from "node:crypto";

import { database } from "../db";
import { getTask, setTaskStatus } from "./task-store";
import type { TaskAgentRun, TaskAgentRunInput } from "./types";

interface RunRow {
  id: string;
  task_id: string;
  agent_run_id: string;
  agent_label: string;
  preset_id: string | null;
  generated_prompt: string;
  started_at: string;
  completed_at: string | null;
  status: string;
}

function toRun(row: RunRow): TaskAgentRun {
  return {
    id: row.id,
    taskId: row.task_id,
    agentRunId: row.agent_run_id,
    agentLabel: row.agent_label,
    presetId: row.preset_id,
    generatedPrompt: row.generated_prompt,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    status: row.status === "done" ? "done" : "sent"
  };
}

/**
 * Keeps the exact prompt an agent was handed.
 *
 * Stored as sent rather than rebuilt later: presets and context move on, and a
 * run you cannot reproduce is a run you cannot learn anything from.
 */
export function recordRun(input: TaskAgentRunInput): TaskAgentRun {
  const id = `run-${randomUUID()}`;
  const startedAt = new Date().toISOString();

  database()
    .prepare(
      `INSERT INTO task_agent_runs
         (id, task_id, agent_run_id, agent_label, preset_id, generated_prompt, started_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'sent')`
    )
    .run(
      id,
      input.taskId,
      input.agentRunId,
      input.agentLabel,
      input.presetId,
      input.generatedPrompt,
      startedAt
    );

  // Handing a task to an agent is the work starting, so the task says so
  // without being asked. Done is never set this way — an agent finishing its
  // turn is not the task being finished, and that call stays the user's.
  const task = getTask(input.taskId);
  if (task?.status === "todo") setTaskStatus(task.id, "doing", "auto");

  return { id, ...input, startedAt, completedAt: null, status: "sent" };
}

export function listRuns(taskId: string): TaskAgentRun[] {
  const rows = database()
    .prepare("SELECT * FROM task_agent_runs WHERE task_id = ? ORDER BY started_at DESC")
    .all(taskId) as unknown as RunRow[];

  return rows.map(toRun);
}

export function completeRun(id: string): boolean {
  const result = database()
    .prepare("UPDATE task_agent_runs SET status = 'done', completed_at = ? WHERE id = ?")
    .run(new Date().toISOString(), id);

  return result.changes > 0;
}

/**
 * Closes off whatever that agent was still working on.
 *
 * The agent reports finishing by its own run id, which is what a task run was
 * filed under when it was sent — so the two meet here. The task itself is left
 * where it is: the run is over, the work may not be.
 */
export function completeRunsForAgent(agentRunId: string): number {
  const result = database()
    .prepare(
      `UPDATE task_agent_runs
          SET status = 'done', completed_at = ?
        WHERE agent_run_id = ? AND status = 'sent'`
    )
    .run(new Date().toISOString(), agentRunId);

  return Number(result.changes);
}
