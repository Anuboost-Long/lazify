import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { MIGRATIONS } from "@/shared/lib/db/schema";

const SQLITE = "/usr/bin/sqlite3";

export function sqlite(file: string, script: string) {
	return execFileSync(SQLITE, [file], { input: script, encoding: "utf8" });
}

export function makeHome() {
	return fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "lazify-home-")));
}

export function profileIn(home: string) {
	return path.join(home, "Library/Application Support/lazify");
}

export function write(root: string, relative: string, contents: string | Uint8Array) {
	fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
	fs.writeFileSync(path.join(root, relative), contents);
}

export const SAMPLE_ROWS = `
INSERT INTO prompt_presets VALUES ('builtin-bug-fix', 'Bug fix', '', 'Fix {{task}}', 1, 0, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z');
INSERT INTO prompt_presets VALUES ('custom-1', 'Mine', 'd', 'Do {{task}}', 0, 5, '2026-02-01T00:00:00Z', '2026-02-02T00:00:00Z');
INSERT INTO context_entries (id, scope, scope_key, kind, category, context_key, context_value, applies_to, pack, is_active, sort_order, created_at, updated_at, payload)
  VALUES ('ctx-1', 'project', '/Users/dev/shop', 'rule', 'Coding Rules', '', 'keep diffs small', '', '', 1, 1, '2026-03-01T00:00:00Z', '2026-03-01T00:00:00Z', '{"strength":"required","action":"keep diffs small"}');
INSERT INTO tasks (id, project_path, name, requirements, status, sort_order, created_at, updated_at) VALUES ('task-1', '/Users/dev/shop', 'Add login', '["email","password"]', 'doing', 1, '2026-04-01T00:00:00Z', '2026-04-02T00:00:00Z');
INSERT INTO task_agent_runs (id, task_id, agent_run_id, agent_label, generated_prompt, started_at) VALUES ('run-1', 'task-1', 'pty-1', 'Claude', 'Add login', '2026-04-02T00:00:00Z');
INSERT INTO task_status_events (task_id, status, source, created_at) VALUES ('task-1', 'todo', 'manual', '2026-04-01T00:00:00Z');
INSERT INTO task_status_events (task_id, status, source, created_at) VALUES ('task-1', 'doing', 'agent', '2026-04-02T00:00:00Z');
INSERT INTO diagnostic_runs (id, project_path, flow_name, state, started_at) VALUES ('diag-1', '/Users/dev/shop', 'login', 'passed', '2026-05-01T00:00:00Z');
`;

export function makeProfile(home: string, options: { schemaVersion?: number; rows?: string; wal?: boolean } = {}) {
	const profile = profileIn(home);
	fs.mkdirSync(profile, { recursive: true });
	const db = path.join(profile, "lazify.db");
	const steps = MIGRATIONS.map((step, index) => `${step};\nPRAGMA user_version = ${index + 1};`).join("\n");
	sqlite(db, `PRAGMA journal_mode = ${options.wal ? "WAL" : "DELETE"};\n${steps}\n${options.rows ?? SAMPLE_ROWS}\n${
		options.schemaVersion ? `PRAGMA user_version = ${options.schemaVersion};` : ""
	}`);

	write(profile, "custom-agents.json", JSON.stringify([{ id: "custom-aider", label: "Aider", command: "aider" }]));
	write(profile, "agent-autopilot.json", JSON.stringify({ enabled: true, projects: {} }));
	write(profile, "window-zoom.json", "{ broken");
	write(profile, "imported-templates/shop/template.json", JSON.stringify({ name: "Shop" }));
	write(profile, "imported-templates/shop/files/src/index.ts", "export {};\n");
	write(profile, "api-studio-responses/key-1/r1.json", "{}");
	write(profile, "Local Storage/leveldb/000003.log", new Uint8Array([0, 1, 2, 255]));
	write(profile, "Cache/Cache_Data/index", "cache");
	write(profile, "extensions/eslint/server.js", "installed extension");

	return profile;
}

export function fingerprint(root: string): string {
	const lines: string[] = [];
	const walk = (folder: string) => {
		for (const name of fs.readdirSync(folder).sort()) {
			const full = path.join(folder, name);
			const stats = fs.statSync(full);
			if (stats.isDirectory()) walk(full);
			else lines.push(`${path.relative(root, full)} ${stats.size} ${stats.mtimeMs}`);
		}
	};
	walk(root);

	return lines.join("\n");
}
