import { database } from "@/platform/database";

import type { TaskStatus, TaskStatusEvent, TaskStatusSource } from "./types";

interface EventRow {
  id: number;
  task_id: string;
  status: string;
  source: string;
  created_at: string;
}

function toEvent(row: EventRow): TaskStatusEvent {
  return {
    id: row.id,
    taskId: row.task_id,
    status: row.status as TaskStatus,
    source: row.source === "auto" ? "auto" : "manual",
    createdAt: row.created_at
  };
}

/**
 * Writes down that a task moved, and what moved it.
 *
 * Appended, never updated: the trail is what it is. Recorded even when the
 * status lands where it already was, since being told twice is itself a fact
 * about how the work went.
 */
export async function recordStatusEvent(
  taskId: string,
  status: TaskStatus,
  source: TaskStatusSource
): Promise<TaskStatusEvent> {
  const createdAt = new Date().toISOString();

  const result = await (await database()).execute(
    `INSERT INTO task_status_events (task_id, status, source, created_at)
     VALUES (?, ?, ?, ?)`,
    [taskId, status, source, createdAt]
  );

  return { id: result.lastInsertId, taskId, status, source, createdAt };
}

/** Oldest first: this is a history, and a history is read forwards. */
export async function listStatusEvents(taskId: string): Promise<TaskStatusEvent[]> {
  const rows = await (await database()).query<EventRow>(
    "SELECT * FROM task_status_events WHERE task_id = ? ORDER BY id",
    [taskId]
  );

  return rows.map(toEvent);
}
