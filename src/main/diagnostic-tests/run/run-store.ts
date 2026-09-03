import { database } from "../../db";
import type { DiagnosticPlatform, EvidenceItem, RunRecord, RunState, StepResult } from "../types";

interface RunRow {
	id: string;
	project_path: string;
	project_name: string;
	flow_name: string;
	flow_path: string;
	branch: string;
	commit_sha: string;
	platform: string;
	target_url: string;
	target_app_id: string;
	target_device: string;
	state: string;
	started_at: string;
	ended_at: string | null;
	duration_ms: number;
	failure_summary: string;
	artifact_dir: string;
	steps: string;
	evidence: string;
}

export interface RunSummary {
	id: string;
	flowName: string;
	state: RunState;
	startedAt: string;
	durationMs: number;
	failureSummary: string;
	passed: number;
	failed: number;
}

function parseJson<T>(text: string, fallback: T): T {
	try {
		return JSON.parse(text) as T;
	} catch {
		return fallback;
	}
}

function toRecord(row: RunRow): RunRecord {
	return {
		id: row.id,
		projectPath: row.project_path,
		projectName: row.project_name,
		flowName: row.flow_name,
		flowPath: row.flow_path,
		branch: row.branch,
		commit: row.commit_sha,
		target: {
			platform: row.platform as DiagnosticPlatform,
			url: row.target_url,
			appId: row.target_app_id,
			device: row.target_device,
		},
		state: row.state as RunState,
		startedAt: row.started_at,
		endedAt: row.ended_at,
		durationMs: row.duration_ms,
		failureSummary: row.failure_summary,
		artifactDir: row.artifact_dir,
		steps: parseJson<StepResult[]>(row.steps, []),
		evidence: parseJson<EvidenceItem[]>(row.evidence, []),
	};
}

export function saveRun(record: RunRecord): void {
	database()
		.prepare(
			`INSERT OR REPLACE INTO diagnostic_runs (
        id, project_path, project_name, flow_name, flow_path, branch, commit_sha,
        platform, target_url, target_app_id, target_device, state, started_at,
        ended_at, duration_ms, failure_summary, artifact_dir, steps, evidence
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		)
		.run(
			record.id,
			record.projectPath,
			record.projectName,
			record.flowName,
			record.flowPath,
			record.branch,
			record.commit,
			record.target.platform,
			record.target.url,
			record.target.appId,
			record.target.device,
			record.state,
			record.startedAt,
			record.endedAt,
			record.durationMs,
			record.failureSummary,
			record.artifactDir,
			JSON.stringify(record.steps),
			JSON.stringify(record.evidence),
		);
}

export function readRun(id: string): RunRecord | null {
	const row = database().prepare("SELECT * FROM diagnostic_runs WHERE id = ?").get(id) as
		RunRow | undefined;

	return row ? toRecord(row) : null;
}

export function listRuns(projectPath: string, limit = 50): RunSummary[] {
	const rows = database()
		.prepare(
			`SELECT id, flow_name, state, started_at, duration_ms, failure_summary, steps
         FROM diagnostic_runs
        WHERE project_path = ?
        ORDER BY started_at DESC
        LIMIT ?`,
		)
		.all(projectPath, limit) as Array<
		Pick<
			RunRow,
			"id" | "flow_name" | "state" | "started_at" | "duration_ms" | "failure_summary" | "steps"
		>
	>;

	return rows.map((row) => {
		const steps = parseJson<StepResult[]>(row.steps, []);

		return {
			id: row.id,
			flowName: row.flow_name,
			state: row.state as RunState,
			startedAt: row.started_at,
			durationMs: row.duration_ms,
			failureSummary: row.failure_summary,
			passed: steps.filter((step) => step.status === "passed").length,
			failed: steps.filter((step) => step.status === "failed").length,
		};
	});
}

export function forgetRunsBeyond(projectPath: string, keep: number): string[] {
	const stale = database()
		.prepare(
			`SELECT id, artifact_dir FROM diagnostic_runs
        WHERE project_path = ?
        ORDER BY started_at DESC
        LIMIT -1 OFFSET ?`,
		)
		.all(projectPath, keep) as Array<{ id: string; artifact_dir: string }>;

	const remove = database().prepare("DELETE FROM diagnostic_runs WHERE id = ?");
	for (const run of stale) remove.run(run.id);

	return stale.map((run) => run.artifact_dir).filter(Boolean);
}

export function deleteRun(id: string): string {
	const row = database().prepare("SELECT artifact_dir FROM diagnostic_runs WHERE id = ?").get(id) as
		{ artifact_dir: string } | undefined;

	database().prepare("DELETE FROM diagnostic_runs WHERE id = ?").run(id);

	return row?.artifact_dir ?? "";
}

export function clearRuns(projectPath: string): string[] {
	const rows = database()
		.prepare("SELECT artifact_dir FROM diagnostic_runs WHERE project_path = ?")
		.all(projectPath) as Array<{ artifact_dir: string }>;

	database().prepare("DELETE FROM diagnostic_runs WHERE project_path = ?").run(projectPath);

	return rows.map((row) => row.artifact_dir).filter(Boolean);
}
