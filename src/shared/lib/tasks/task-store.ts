import { database } from "@/platform/database";

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
export async function listTasks(projectPath: string): Promise<Task[]> {
  const rows = await (await database()).query<TaskRow>(
    `SELECT * FROM tasks
      WHERE project_path = ?
      ORDER BY CASE status WHEN 'doing' THEN 0 WHEN 'todo' THEN 1 ELSE 2 END,
               sort_order, created_at`,
    [projectPath]
  );

  return rows.map(toTask);
}

/**
 * Every project's tasks, for the home dashboard.
 *
 * Ordered the way the dashboard reads them: what is being worked on, then what
 * is waiting, then what is done — and inside each, the most pressing first.
 */
export async function listAllTasks(): Promise<Task[]> {
  const rows = await (await database()).query<TaskRow>(
    `SELECT * FROM tasks
      ORDER BY CASE status WHEN 'doing' THEN 0 WHEN 'todo' THEN 1 ELSE 2 END,
               CASE priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END,
               COALESCE(deadline, '9999-12-31'),
               sort_order`
  );

  return rows.map(toTask);
}

export async function getTask(id: string): Promise<Task | null> {
  const [row] = await (await database()).query<TaskRow>("SELECT * FROM tasks WHERE id = ?", [id]);

  return row ? toTask(row) : null;
}

export async function createTask(input: TaskInput): Promise<Task> {
  const now = new Date().toISOString();
  const id = `task-${crypto.randomUUID()}`;
  const storage = await database();

  const [{ next }] = await storage.query<{ next: number }>(
    "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM tasks WHERE project_path = ?",
    [input.projectPath]
  );

  await storage.execute(
    `INSERT INTO tasks
       (id, project_path, name, description, requirements, notes, preset_id,
        status, priority, deadline, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'todo', ?, ?, ?, ?, ?)`,
    [
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
    ]
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

export async function updateTask(id: string, input: TaskInput): Promise<boolean> {
  const result = await (await database()).execute(
    `UPDATE tasks
        SET name = ?, description = ?, requirements = ?, notes = ?,
            preset_id = ?, priority = ?, deadline = ?, updated_at = ?
      WHERE id = ?`,
    [
      input.name,
      input.description,
      JSON.stringify(input.requirements),
      input.notes,
      input.presetId,
      input.priority,
      input.deadline,
      new Date().toISOString(),
      id
    ]
  );

  return result.rowsAffected > 0;
}

/** Finishing stamps the time; reopening clears it, so "done" never lies. */
/**
 * Moves a task, and writes down that it moved.
 *
 * `source` is not optional on purpose: everything that can move a task has to
 * say whether a person decided it or the app did, because the trail is worth
 * nothing if half of it is guesswork.
 */
export async function setTaskStatus(id: string, status: TaskStatus, source: TaskStatusSource): Promise<boolean> {
  const now = new Date().toISOString();

  const result = await (await database()).execute(
    "UPDATE tasks SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?",
    [status, status === "done" ? now : null, now, id]
  );

  if (result.rowsAffected === 0) return false;

  await recordStatusEvent(id, status, source);
  return true;
}

export async function reorderTask(id: string, sortOrder: number): Promise<boolean> {
  const result = await (await database()).execute(
    "UPDATE tasks SET sort_order = ?, updated_at = ? WHERE id = ?",
    [sortOrder, new Date().toISOString(), id]
  );

  return result.rowsAffected > 0;
}

export async function deleteTask(id: string): Promise<boolean> {
  const result = await (await database()).execute("DELETE FROM tasks WHERE id = ?", [id]);
  return result.rowsAffected > 0;
}
