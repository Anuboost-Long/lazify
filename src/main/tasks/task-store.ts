import { randomUUID } from "node:crypto";

import { database } from "../db";
import { recordStatusEvent } from "./status-events";
import type { Task, TaskInput, TaskPriority, TaskStatus, TaskStatusSource } from "./types";

interface TaskRow {
  id: string;
  project_path: string;
  name: string;
  description: string;
  requirements: string;
  notes: string;
  preset_id: string | null;
  status: string;
  priority: string;
  deadline: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

function parseRequirements(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    projectPath: row.project_path,
    name: row.name,
    description: row.description,
    requirements: parseRequirements(row.requirements),
    notes: row.notes,
    presetId: row.preset_id,
    status: row.status as TaskStatus,
    priority: row.priority as TaskPriority,
    deadline: row.deadline,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at
  };
}

/** Open work first, then what is done; each by the order the user put them in. */
export function listTasks(projectPath: string): Task[] {
  const rows = database()
    .prepare(
      `SELECT * FROM tasks
        WHERE project_path = ?
        ORDER BY CASE status WHEN 'doing' THEN 0 WHEN 'todo' THEN 1 ELSE 2 END,
                 sort_order, created_at`
    )
    .all(projectPath) as unknown as TaskRow[];

  return rows.map(toTask);
}

/**
 * Every project's tasks, for the home dashboard.
 *
 * Ordered the way the dashboard reads them: what is being worked on, then what
 * is waiting, then what is done — and inside each, the most pressing first.
 */
export function listAllTasks(): Task[] {
  const rows = database()
    .prepare(
      `SELECT * FROM tasks
        ORDER BY CASE status WHEN 'doing' THEN 0 WHEN 'todo' THEN 1 ELSE 2 END,
                 CASE priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END,
                 COALESCE(deadline, '9999-12-31'),
                 sort_order`
    )
    .all() as unknown as TaskRow[];

  return rows.map(toTask);
}

export function getTask(id: string): Task | null {
  const row = database().prepare("SELECT * FROM tasks WHERE id = ?").get(id) as unknown as
    | TaskRow
    | undefined;

  return row ? toTask(row) : null;
}

export function createTask(input: TaskInput): Task {
  const now = new Date().toISOString();
  const id = `task-${randomUUID()}`;

  const [{ next }] = database()
    .prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM tasks WHERE project_path = ?")
    .all(input.projectPath) as unknown as Array<{ next: number }>;

  database()
    .prepare(
      `INSERT INTO tasks
         (id, project_path, name, description, requirements, notes, preset_id,
          status, priority, deadline, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'todo', ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      input.projectPath,
      input.name,
      input.description,
      JSON.stringify(input.requirements),
      input.notes,
      input.presetId,
      input.priority,
      input.deadline,
      next,
      now,
      now
    );

  return {
    id,
    ...input,
    status: "todo",
    sortOrder: next,
    createdAt: now,
    updatedAt: now,
    completedAt: null
  };
}

export function updateTask(id: string, input: TaskInput): boolean {
  const result = database()
    .prepare(
      `UPDATE tasks
          SET name = ?, description = ?, requirements = ?, notes = ?,
              preset_id = ?, priority = ?, deadline = ?, updated_at = ?
        WHERE id = ?`
    )
    .run(
      input.name,
      input.description,
      JSON.stringify(input.requirements),
      input.notes,
      input.presetId,
      input.priority,
      input.deadline,
      new Date().toISOString(),
      id
    );

  return result.changes > 0;
}

/** Finishing stamps the time; reopening clears it, so "done" never lies. */
/**
 * Moves a task, and writes down that it moved.
 *
 * `source` is not optional on purpose: everything that can move a task has to
 * say whether a person decided it or the app did, because the trail is worth
 * nothing if half of it is guesswork.
 */
export function setTaskStatus(id: string, status: TaskStatus, source: TaskStatusSource): boolean {
  const now = new Date().toISOString();

  const result = database()
    .prepare("UPDATE tasks SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?")
    .run(status, status === "done" ? now : null, now, id);

  if (result.changes === 0) return false;

  recordStatusEvent(id, status, source);
  return true;
}

export function reorderTask(id: string, sortOrder: number): boolean {
  const result = database()
    .prepare("UPDATE tasks SET sort_order = ?, updated_at = ? WHERE id = ?")
    .run(sortOrder, new Date().toISOString(), id);

  return result.changes > 0;
}

export function deleteTask(id: string): boolean {
  const result = database().prepare("DELETE FROM tasks WHERE id = ?").run(id);
  return result.changes > 0;
}
