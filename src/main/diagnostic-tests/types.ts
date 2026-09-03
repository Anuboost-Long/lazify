export type DiagnosticTargetKind = "web" | "mobile";

export type DiagnosticPlatform = "web" | "android" | "ios";

export interface ElementSelector {
	id?: string;
	label?: string;
	role?: string;
	name?: string;
	text?: string;
	point?: { x: number; y: number };
}

export type ScrollDirection = "up" | "down" | "left" | "right";

export interface FlowStart {
	script?: string;
	url?: string;
	readyTimeoutMs?: number;
}

export interface FlowAppId {
	android?: string;
	ios?: string;
}

export interface FlowSource {
	filePath: string;
	relativePath: string;
	text: string;
}

export interface DiagnosticConfig {
	defaultTarget: DiagnosticTargetKind;
	baseUrl: string;
	/** Where flow files live, relative to the project. */
	flowsDir: string;
	/** Where screenshots and transcripts land. Empty keeps them in app data. */
	artifactsDir: string;
	secrets: string[];
	retainRuns: number;
	stepTimeoutMs: number;
}

export type RunState =
	| "queued"
	| "validating"
	| "preparing"
	| "waiting-for-target"
	| "running"
	| "collecting"
	| "passed"
	| "failed"
	| "cancelled"
	| "infrastructure-error";

export type StepStatus = "pending" | "running" | "passed" | "failed" | "skipped";

export type EvidenceSource =
	| "assertion"
	| "browser-console"
	| "browser-network"
	| "terminal"
	| "metro"
	| "android-logcat"
	| "ios-simulator"
	| "driver";

export type EvidenceSeverity = "info" | "warning" | "error";

export interface EvidenceItem {
	source: EvidenceSource;
	timestamp: string;
	flowName: string;
	stepIndex: number | null;
	severity: EvidenceSeverity;
	summary: string;
	details: string;
	artifacts: string[];
}

export interface ArtifactRef {
	name: string;
	filePath: string;
	kind: "screenshot" | "log";
	capturedAt: string;
}

export interface StepResult {
	index: number;
	kind: string;
	description: string;
	status: StepStatus;
	startedAt: string | null;
	durationMs: number;
	message: string;
	artifacts: ArtifactRef[];
}

export interface RunTargetInfo {
	platform: DiagnosticPlatform;
	url: string;
	appId: string;
	device: string;
}

export interface RunRecord {
	id: string;
	projectPath: string;
	projectName: string;
	flowName: string;
	flowPath: string;
	branch: string;
	commit: string;
	target: RunTargetInfo;
	state: RunState;
	startedAt: string;
	endedAt: string | null;
	durationMs: number;
	failureSummary: string;
	steps: StepResult[];
	evidence: EvidenceItem[];
	artifactDir: string;
}

export type RunEvent =
	| { type: "state"; runId: string; state: RunState }
	| { type: "step"; runId: string; step: StepResult }
	| { type: "evidence"; runId: string; item: EvidenceItem }
	| { type: "artifact"; runId: string; artifact: ArtifactRef }
	| { type: "finished"; runId: string; record: RunRecord };
