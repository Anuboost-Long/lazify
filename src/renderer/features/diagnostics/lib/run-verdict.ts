import type { EvidenceSource, RunState, StepStatus } from "@main/diagnostic-tests/types";
import { translation } from "@renderer/i18n/translation";

export type VerdictTone = "success" | "error" | "warning" | "accent" | "muted";

const RUN_STATES: Record<RunState, { label: string; tone: VerdictTone }> = {
	queued: { label: translation.Diagnostics.StateQueued, tone: "muted" },
	validating: { label: translation.Diagnostics.StateValidating, tone: "accent" },
	preparing: { label: translation.Diagnostics.StatePreparing, tone: "accent" },
	"waiting-for-target": {
		label: translation.Diagnostics.StateWaitingForTarget,
		tone: "accent",
	},
	running: { label: translation.Diagnostics.StateRunning, tone: "accent" },
	collecting: { label: translation.Diagnostics.StateCollecting, tone: "accent" },
	passed: { label: translation.Diagnostics.StatePassed, tone: "success" },
	failed: { label: translation.Diagnostics.StateFailed, tone: "error" },
	cancelled: { label: translation.Diagnostics.StateCancelled, tone: "warning" },
	"infrastructure-error": {
		label: translation.Diagnostics.StateInfrastructureError,
		tone: "warning",
	},
};

const STEP_STATUSES: Record<StepStatus, { label: string; tone: VerdictTone }> = {
	pending: { label: translation.Diagnostics.StepPending, tone: "muted" },
	running: { label: translation.Diagnostics.StepRunning, tone: "accent" },
	passed: { label: translation.Diagnostics.StepPassed, tone: "success" },
	failed: { label: translation.Diagnostics.StepFailed, tone: "error" },
	skipped: { label: translation.Diagnostics.StepSkipped, tone: "muted" },
};

const EVIDENCE_SOURCES: Record<EvidenceSource, string> = {
	assertion: translation.Diagnostics.SourceAssertion,
	"browser-console": translation.Diagnostics.SourceBrowserConsole,
	"browser-network": translation.Diagnostics.SourceBrowserNetwork,
	terminal: translation.Diagnostics.SourceTerminal,
	metro: translation.Diagnostics.SourceMetro,
	"android-logcat": translation.Diagnostics.SourceAndroidLogcat,
	"ios-simulator": translation.Diagnostics.SourceIosSimulator,
	driver: translation.Diagnostics.SourceDriver,
};

const SETTLED = new Set<RunState>(["passed", "failed", "cancelled", "infrastructure-error"]);

export function runVerdict(state: RunState) {
	return RUN_STATES[state];
}

export function stepVerdict(status: StepStatus) {
	return STEP_STATUSES[status];
}

export function evidenceSourceLabel(source: EvidenceSource): string {
	return EVIDENCE_SOURCES[source];
}

export function isRunSettled(state: RunState): boolean {
	return SETTLED.has(state);
}

export const toneTextClass: Record<VerdictTone, string> = {
	success: "text-success",
	error: "text-error",
	warning: "text-warning",
	accent: "text-accent",
	muted: "text-muted",
};

export const toneDotClass: Record<VerdictTone, string> = {
	success: "bg-success",
	error: "bg-error",
	warning: "bg-warning",
	accent: "bg-accent",
	muted: "bg-muted",
};
