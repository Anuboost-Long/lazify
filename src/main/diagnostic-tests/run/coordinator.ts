import { randomBytes } from "node:crypto";
import path from "node:path";

import { throwIfCancelled } from "../cancellation";
import type { DiagnosticDriver } from "../drivers/types";
import { describeError, FlowError, InfrastructureError, RunCancelled } from "../errors";
import { createRedactor } from "../evidence/redact";
import { EvidenceSink } from "../evidence/sink";
import { TerminalCollector } from "../evidence/terminal-collector";
import type { ParsedFlow } from "../flow/parse-flow";
import type { SecretVault } from "../secrets";
import type { StepContext } from "../steps";
import type {
	ArtifactRef,
	DiagnosticConfig,
	DiagnosticPlatform,
	EvidenceItem,
	FlowSource,
	RunEvent,
	RunRecord,
	RunState,
	StepResult,
} from "../types";
import { ArtifactStore } from "./artifact-store";
import { buildRunRecord } from "./build-record";
import { executeSteps, type StepOutcome } from "./execute-steps";
import { waitForTarget } from "./target-readiness";
import { validateRun, type ValidatedRun } from "./validate-run";

export interface RunRequest {
	projectPath: string;
	projectName: string;
	flow: FlowSource;
	config: DiagnosticConfig;
	platform: DiagnosticPlatform;
	branch?: string;
	commit?: string;
}

export interface RunEnvironment {
	artifactRoot: string;
	createDriver(runId: string, sink: EvidenceSink): DiagnosticDriver;
	observeTerminal?(listener: (data: string) => void): () => void;
	emit(event: RunEvent): void;
}

function newRunId(now: Date): string {
	return `${now.toISOString().replace(/[:.]/g, "-")}-${randomBytes(3).toString("hex")}`;
}

export class DiagnosticRun {
	private readonly controller = new AbortController();
	private readonly startedAt = new Date();
	private readonly sink: EvidenceSink;
	private readonly artifacts: ArtifactStore;
	private readonly pendingArtifacts: ArtifactRef[] = [];
	private readonly terminal: TerminalCollector;
	private readonly driver: DiagnosticDriver;

	private stopObservingTerminal: (() => void) | null = null;
	private state: RunState = "queued";
	private flowName = "";
	private steps: StepResult[] = [];

	readonly id: string;

	constructor(
		private readonly request: RunRequest,
		private readonly environment: RunEnvironment,
	) {
		this.id = newRunId(this.startedAt);
		this.sink = new EvidenceSink(path.basename(request.flow.relativePath));
		this.terminal = new TerminalCollector(this.sink);
		this.artifacts = new ArtifactStore(path.join(environment.artifactRoot, this.id));
		this.driver = environment.createDriver(this.id, this.sink);
	}

	cancel(): void {
		this.controller.abort();
	}

	private moveTo(state: RunState): void {
		this.state = state;
		this.environment.emit({ type: "state", runId: this.id, state });
	}

	private async screenshot(name: string): Promise<ArtifactRef> {
		const filePath = this.artifacts.pathFor(name, ".png");

		await this.driver.screenshot(filePath);

		const artifact = this.artifacts.registerScreenshot(name, filePath);

		this.pendingArtifacts.push(artifact);
		this.environment.emit({ type: "artifact", runId: this.id, artifact });

		return artifact;
	}

	private stepContext(flow: ParsedFlow, vault: SecretVault, baseUrl: string): StepContext {
		return {
			driver: this.driver,
			baseUrl,
			defaultTimeoutMs: this.request.config.stepTimeoutMs,
			signal: this.controller.signal,
			secret: (name) => vault.resolve(name),
			screenshot: (name) => this.screenshot(name),
		};
	}

	private resolveBaseUrl(flow: ParsedFlow): string {
		return flow.start.url || this.request.config.baseUrl;
	}

	private validate(): Promise<ValidatedRun> {
		this.moveTo("validating");

		return validateRun(this.request.projectPath, this.request.flow, this.request.config, this.driver);
	}

	private async prepare(flow: ParsedFlow): Promise<void> {
		this.moveTo("preparing");

		await this.artifacts.prepare();

		this.stopObservingTerminal =
			this.environment.observeTerminal?.((data) => this.terminal.record(data)) ?? null;

		await this.driver.connect({
			platform: this.request.platform,
			projectPath: this.request.projectPath,
			baseUrl: this.resolveBaseUrl(flow),
			appId: flow.appId.android ?? flow.appId.ios ?? "",
			device: "",
		});
	}

	private async awaitTarget(flow: ParsedFlow): Promise<void> {
		const baseUrl = this.resolveBaseUrl(flow);
		if (this.request.platform !== "web" || !baseUrl) return;

		this.moveTo("waiting-for-target");

		const ready = await waitForTarget(
			baseUrl,
			flow.start.readyTimeoutMs ?? 60_000,
			this.controller.signal,
		);

		if (!ready) {
			throw new InfrastructureError(
				`${baseUrl} never became ready. Start the project's dev server, or set start.script.`,
			);
		}
	}

	private async runSteps(flow: ParsedFlow, vault: SecretVault) {
		this.moveTo("running");

		const context = this.stepContext(flow, vault, this.resolveBaseUrl(flow));

		return executeSteps(flow.steps, context, {
			onStep: (step) => {
				this.sink.stepIndex = step.index;
				this.environment.emit({ type: "step", runId: this.id, step });
			},
			captureFailure: async (step) => {
				try {
					return [await this.screenshot(`step-${step.index + 1}-failure`)];
				} catch {
					return [];
				}
			},
			drainArtifacts: () => this.pendingArtifacts.splice(0, this.pendingArtifacts.length),
		});
	}

	private async collect(vault: SecretVault | null): Promise<EvidenceItem[]> {
		this.moveTo("collecting");

		this.stopObservingTerminal?.();
		this.stopObservingTerminal = null;
		this.terminal.finish();

		const redact = createRedactor(vault?.values() ?? []);
		const transcript = this.terminal.transcript();

		if (transcript) await this.artifacts.writeText("terminal", redact(transcript));

		return this.sink.all().map((item) => ({
			...item,
			summary: redact(item.summary),
			details: redact(item.details),
		}));
	}

	private finish(state: RunState, summary: string, evidence: EvidenceItem[]): RunRecord {
		this.moveTo(state);

		const record = buildRunRecord({
			id: this.id,
			request: this.request,
			flowName: this.flowName,
			state,
			failureSummary: summary,
			steps: this.steps,
			evidence,
			artifactDir: this.artifacts.directory,
			startedAt: this.startedAt,
			endedAt: new Date(),
		});

		this.environment.emit({ type: "finished", runId: this.id, record });

		return record;
	}

	private stateFor(outcome: StepOutcome): RunState {
		return outcome === "passed" ? "passed" : outcome;
	}

	async start(): Promise<RunRecord> {
		let vault: SecretVault | null = null;

		try {
			const validated = await this.validate();
			vault = validated.vault;
			this.flowName = validated.flow.name;

			await this.prepare(validated.flow);
			await this.awaitTarget(validated.flow);
			throwIfCancelled(this.controller.signal);

			const execution = await this.runSteps(validated.flow, vault);
			this.steps = execution.results;

			const evidence = await this.collect(vault);

			return this.finish(this.stateFor(execution.outcome), execution.summary, evidence);
		} catch (error) {
			const state = error instanceof RunCancelled ? "cancelled" : "infrastructure-error";

			if (error instanceof FlowError || error instanceof InfrastructureError) {
				this.sink.add({ source: "driver", severity: "error", summary: error.message });
			}

			return this.finish(state, describeError(error), await this.collect(vault));
		} finally {
			this.stopObservingTerminal?.();
			await this.driver.close().catch(() => undefined);
		}
	}

	snapshot(): RunState {
		return this.state;
	}
}
