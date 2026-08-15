import type { DatabaseSync } from "node:sqlite";

/**
 * Schema steps, applied in order and recorded in `user_version`.
 *
 * Append only. A step that has shipped has already run on someone's machine,
 * so editing one leaves their database on a shape nothing will ever correct.
 */
const MIGRATIONS: string[] = [
  `
  CREATE TABLE prompt_presets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    template TEXT NOT NULL,
    is_builtin INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE context_entries (
    id TEXT PRIMARY KEY,
    -- 'global' or 'project' today; the column is what lets workspace, agent or
    -- repository scopes arrive later without a rewrite.
    scope TEXT NOT NULL,
    -- Project path for project scope, empty for global.
    scope_key TEXT NOT NULL DEFAULT '',
    -- 'fact' renders as "Key: value", 'rule' as a bullet.
    kind TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT '',
    context_key TEXT NOT NULL DEFAULT '',
    context_value TEXT NOT NULL,
    -- Preset ids this entry is aimed at, comma separated. Empty means every task.
    applies_to TEXT NOT NULL DEFAULT '',
    -- Group switched on or off as one, so context arrives as packs.
    pack TEXT NOT NULL DEFAULT '',
    is_active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX context_entries_scope ON context_entries (scope, scope_key);
  `,
  `
  CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    project_path TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    -- JSON array: a requirement may contain anything, commas included.
    requirements TEXT NOT NULL DEFAULT '[]',
    notes TEXT NOT NULL DEFAULT '',
    preset_id TEXT,
    status TEXT NOT NULL DEFAULT 'todo',
    priority TEXT NOT NULL DEFAULT 'normal',
    deadline TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT
  );

  CREATE INDEX tasks_project ON tasks (project_path, status);

  -- What an agent was actually given, kept whether or not the task moves on.
  CREATE TABLE task_agent_runs (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    agent_run_id TEXT NOT NULL DEFAULT '',
    agent_label TEXT NOT NULL DEFAULT '',
    preset_id TEXT,
    generated_prompt TEXT NOT NULL,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    status TEXT NOT NULL DEFAULT 'sent'
  );

  CREATE INDEX task_agent_runs_task ON task_agent_runs (task_id, started_at DESC);
  `,
  `
  -- Context is typed: each kind carries its own JSON shape, so a rule reads as
  -- strength, action, condition and reason rather than as a free sentence the
  -- prompt has to hope was written well.
  ALTER TABLE context_entries ADD COLUMN payload TEXT NOT NULL DEFAULT '';

  UPDATE context_entries
     SET payload = json_object('strength', 'required', 'action', context_value)
   WHERE kind = 'rule' AND payload = '';

  UPDATE context_entries
     SET payload = json_object('key', context_key, 'value', context_value)
   WHERE kind = 'fact' AND payload = '';
  `,
  `
  -- Every move a task makes, and who made it.
  --
  -- The task row carries where a task is now; this carries how it got there.
  -- Counted rather than uuid'd, because the order things happened in is the
  -- whole point and an incrementing id keeps it even when two land in the same
  -- second. 'source' separates what the app did on its own from what the user
  -- decided, so an automatic move can always be told apart from a deliberate one.
  CREATE TABLE task_status_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'manual',
    created_at TEXT NOT NULL
  );

  CREATE INDEX task_status_events_task ON task_status_events (task_id, id);
  `
];

export function runMigrations(db: DatabaseSync): void {
  const [{ user_version: applied }] = db.prepare("PRAGMA user_version").all() as Array<{
    user_version: number;
  }>;

  for (let step = applied; step < MIGRATIONS.length; step += 1) {
    db.exec(MIGRATIONS[step]);
    // Pragmas take no parameters, and the value is a loop counter.
    db.exec(`PRAGMA user_version = ${step + 1}`);
  }
}
