import type { FlowSummary } from "@main/diagnostic-tests/service";
import type { ArtifactRef, EvidenceItem, RunRecord, RunState } from "@main/diagnostic-tests/types";
import { translation } from "@renderer/i18n/translation";

import type { TimelineStep } from "../components/StepRow";
import { formatDuration, formatRunTime } from "./format-run";
import type { LiveRun } from "./live-run";
import { isRunSettled } from "./run-verdict";

export interface PanelFact {
	label: string;
	value: string;
}

export interface PanelModel {
	title: string;
	subtitle: string;
	state: RunState | null;
	facts: PanelFact[];
	steps: TimelineStep[];
	evidence: EvidenceItem[];
	artifacts: ArtifactRef[];
	runId: string;
	fileName: string;
	canRun: boolean;
	running: boolean;
}

function fact(label: string, value: string): PanelFact[] {
	return value ? [{ label, value }] : [];
}

function plannedSteps(flow: FlowSummary | null): TimelineStep[] {
	return (flow?.steps ?? []).map((step) => ({
		index: step.index,
		description: step.description,
	}));
}

function mergeSteps(flow: FlowSummary | null, live: LiveRun): TimelineStep[] {
	const planned = plannedSteps(flow);
	if (planned.length === 0) return live.steps;

	return planned.map((step) => {
		const actual = live.steps.find((entry) => entry.index === step.index);
		if (!actual) return step;

		return {
			index: actual.index,
			description: actual.description,
			status: actual.status,
			durationMs: actual.durationMs,
			message: actual.message,
		};
	});
}

function recordSteps(record: RunRecord): TimelineStep[] {
	return record.steps.map((step) => ({
		index: step.index,
		description: step.description,
		status: step.status,
		durationMs: step.durationMs,
		message: step.message,
	}));
}

export function flowPanel(flow: FlowSummary): PanelModel {
	return {
		title: flow.name,
		subtitle: flow.error || flow.relativePath,
		state: null,
		facts: [
			...fact(translation.Diagnostics.Target, flow.startUrl || flow.target),
			...fact(translation.Diagnostics.NeedsSecrets, flow.requiredSecrets.join(", ")),
		],
		steps: plannedSteps(flow),
		evidence: [],
		artifacts: [],
		runId: "",
		fileName: flow.fileName,
		canRun: !flow.error,
		running: false,
	};
}

export function livePanel(live: LiveRun, flow: FlowSummary | null, elapsedMs: number): PanelModel {
	const settled = isRunSettled(live.state);

	return {
		title: flow?.name ?? live.fileName,
		subtitle: live.fileName,
		state: live.state,
		facts: [
			...fact(translation.Diagnostics.Target, flow?.startUrl ?? ""),
			{ label: translation.Diagnostics.Duration, value: formatDuration(elapsedMs) },
		],
		steps: mergeSteps(flow, live),
		evidence: live.evidence,
		artifacts: live.artifacts,
		runId: live.runId,
		fileName: live.fileName,
		canRun: settled,
		running: !settled,
	};
}

export function recordPanel(record: RunRecord): PanelModel {
	return {
		title: record.flowName,
		subtitle: record.failureSummary || record.flowPath,
		state: record.state,
		facts: [
			...fact(translation.Diagnostics.Target, record.target.url || record.target.platform),
			...fact(
				translation.Diagnostics.Branch,
				[record.branch, record.commit].filter(Boolean).join(" "),
			),
			{ label: translation.Diagnostics.Duration, value: formatDuration(record.durationMs) },
			...fact(translation.Diagnostics.Started, formatRunTime(record.startedAt)),
		],
		steps: recordSteps(record),
		evidence: record.evidence,
		artifacts: record.steps.flatMap((step) => step.artifacts),
		runId: record.id,
		fileName: record.flowName,
		canRun: false,
		running: false,
	};
}
