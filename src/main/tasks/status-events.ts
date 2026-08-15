import { database } from "../db";
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
export function recordStatusEvent(
  taskId: string,
  status: TaskStatus,
  source: TaskStatusSource
): TaskStatusEvent {
  const createdAt = new Date().toISOString();

  const result = database()
    .prepare(
      `INSERT INTO task_status_events (task_id, status, source, created_at)
       VALUES (?, ?, ?, ?)`
    )
    .run(taskId, status, source, createdAt);

  return { id: Number(result.lastInsertRowid), taskId, status, source, createdAt };
}

/** Oldest first: this is a history, and a history is read forwards. */
export function listStatusEvents(taskId: string): TaskStatusEvent[] {
  const rows = database()
    .prepare("SELECT * FROM task_status_events WHERE task_id = ? ORDER BY id")
    .all(taskId) as unknown as EventRow[];

  return rows.map(toEvent);
}
