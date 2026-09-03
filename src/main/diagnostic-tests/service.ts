import fs from "node:fs/promises";
import path from "node:path";

import { app } from "electron";

import type { PtyRunner } from "../pty-runner";
import { WebDiagnosticDriver } from "./drivers/web";
import { PageErrorLog } from "./drivers/web/page-errors";
import { describeError } from "./errors";
import type { EvidenceSink } from "./evidence/sink";
import { EXAMPLE_FLOW_FILE, EXAMPLE_FLOW_TEXT } from "./flow/example-flow";
import {
	deleteFlowFile,
	listFlowFiles,
	readDiagnosticConfig,
	readFlowFile,
	resolveInProject,
	writeDiagnosticConfig,
	writeFlowFile,
} from "./flow/flow-files";
import { parseFlow } from "./flow/parse-flow";
import { toValidatedFlowYaml } from "./recorder/flow-yaml";
import type { RecordedStep } from "./recorder/recorded-step";
import { RecorderSession, type RecorderEvent } from "./recorder/recorder-session";
import { renderHtmlReport } from "./report/html-report";
import { pruneRunDirectories } from "./run/artifact-store";
import { DiagnosticRun, type RunRequest } from "./run/coordinator";
import { readGitContext } from "./run/git-context";
import {
	clearRuns,
	deleteRun,
	forgetRunsBeyond,
	listRuns,
	readRun,
	saveRun,
	type RunSummary,
} from "./run/run-store";
import type { DiagnosticConfig, RunEvent, RunRecord } from "./types";

export interface FlowStepSummary {
	index: number;
	kind: string;
	description: string;
}

export interface FlowSummary {
	fileName: string;
	relativePath: string;
	name: string;
	target: string;
	startUrl: string;
	steps: FlowStepSummary[];
	requiredSecrets: string[];
	error: string;
}

export interface RecordingHandle {
	id: string;
	url: string;
}

export class DiagnosticTestService {
	private readonly active = new Map<string, DiagnosticRun>();
	private recorder: RecorderSession | null = null;

	constructor(
		private readonly emit: (event: RunEvent) => void,
		private readonly emitRecorder: (event: RecorderEvent) => void,
		private readonly ptyRunner?: PtyRunner,
	) {}

	private artifactRoot(projectPath: string, config: DiagnosticConfig): string {
		if (config.artifactsDir) return resolveInProject(projectPath, config.artifactsDir);

		return path.join(app.getPath("userData"), "diagnostic-runs");
	}

	readConfig(projectPath: string): Promise<DiagnosticConfig> {
		return readDiagnosticConfig(projectPath);
	}

	saveConfig(projectPath: string, config: DiagnosticConfig): Promise<DiagnosticConfig> {
		return writeDiagnosticConfig(projectPath, config);
	}

	async listFlows(projectPath: string): Promise<FlowSummary[]> {
		const config = await readDiagnosticConfig(projectPath);
		const sources = await listFlowFiles(projectPath, config);

		return sources.map((source) => {
			const fileName = path.basename(source.filePath);

			try {
				const flow = parseFlow(source.text);

				return {
					fileName,
					relativePath: source.relativePath,
					name: flow.name,
					target: flow.target,
					startUrl: flow.start.url ?? "",
					steps: flow.steps.map((step) => ({
						index: step.index,
						kind: step.kind,
						description: step.description,
					})),
					requiredSecrets: flow.requiredSecrets,
					error: "",
				};
			} catch (error) {
				return {
					fileName,
					relativePath: source.relativePath,
					name: fileName,
					target: "",
					startUrl: "",
					steps: [],
					requiredSecrets: [],
					error: describeError(error),
				};
			}
		});
	}

	async startRun(projectPath: string, fileName: string): Promise<RunRecord> {
		const config = await readDiagnosticConfig(projectPath);
		const [flow, git] = await Promise.all([
			readFlowFile(projectPath, config, fileName),
			readGitContext(projectPath),
		]);

		const request: RunRequest = {
			projectPath,
			projectName: path.basename(projectPath),
			flow,
			config,
			platform: "web",
			branch: git.branch,
			commit: git.commit,
		};

		const run = new DiagnosticRun(request, {
			artifactRoot: this.artifactRoot(projectPath, config),
			createDriver: (runId: string, sink: EvidenceSink) =>
				new WebDiagnosticDriver(runId, new PageErrorLog(sink)),
			observeTerminal: this.ptyRunner
				? (listener) => this.ptyRunner!.observe((event) => listener(event.data))
				: undefined,
			emit: this.emit,
		});

		this.active.set(run.id, run);

		try {
			const record = await run.start();

			saveRun(record);
			await this.applyRetention(projectPath, config);

			return record;
		} finally {
			this.active.delete(run.id);
		}
	}

	cancelRun(runId: string): boolean {
		const run = this.active.get(runId);
		run?.cancel();

		return Boolean(run);
	}

	listRuns(projectPath: string, limit?: number): RunSummary[] {
		return listRuns(projectPath, limit);
	}

	readRun(runId: string): RunRecord | null {
		return readRun(runId);
	}

	async deleteRun(runId: string): Promise<void> {
		await removeDirectories([deleteRun(runId)]);
	}

	async clearRuns(projectPath: string): Promise<void> {
		await removeDirectories(clearRuns(projectPath));
	}

	async exportReport(runId: string, filePath: string): Promise<string> {
		const record = readRun(runId);
		if (!record) throw new Error(`Run ${runId} is no longer stored`);

		await fs.writeFile(filePath, await renderHtmlReport(record), "utf8");

		return filePath;
	}

	async saveFlow(projectPath: string, fileName: string, text: string) {
		parseFlow(text);

		return writeFlowFile(projectPath, await readDiagnosticConfig(projectPath), fileName, text);
	}

	async deleteFlow(projectPath: string, fileName: string): Promise<void> {
		await deleteFlowFile(projectPath, await readDiagnosticConfig(projectPath), fileName);
	}

	async createExampleFlow(projectPath: string) {
		const config = await readDiagnosticConfig(projectPath);

		return writeFlowFile(projectPath, config, EXAMPLE_FLOW_FILE, EXAMPLE_FLOW_TEXT);
	}

	async startRecording(projectPath: string, url: string): Promise<RecordingHandle> {
		await this.stopRecording();

		const config = await readDiagnosticConfig(projectPath);
		const target = url || config.baseUrl;

		if (!target) {
			throw new Error("Set a base url for this project before recording a flow.");
		}

		const session = new RecorderSession(`rec-${Date.now()}`, this.emitRecorder);
		this.recorder = session;

		await session.start(target);

		return { id: session.id, url: target };
	}

	async stopRecording(): Promise<RecordedStep[]> {
		const session = this.recorder;
		if (!session) return [];

		this.recorder = null;

		return session.stop();
	}

	async saveRecording(projectPath: string, fileName: string, name: string, steps: RecordedStep[]) {
		const config = await readDiagnosticConfig(projectPath);
		const text = toValidatedFlowYaml({ name, baseUrl: config.baseUrl, steps });

		return writeFlowFile(projectPath, config, fileName, text);
	}

	private async applyRetention(projectPath: string, config: DiagnosticConfig): Promise<void> {
		await removeDirectories(forgetRunsBeyond(projectPath, config.retainRuns));
		await pruneRunDirectories(
			this.artifactRoot(projectPath, config),
			Math.max(config.retainRuns, 50),
		);
	}
}

function removeDirectories(directories: string[]): Promise<unknown> {
	return Promise.all(
		directories
			.filter(Boolean)
			.map((directory) => fs.rm(directory, { recursive: true, force: true })),
	);
}
