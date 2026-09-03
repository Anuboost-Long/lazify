import type {
	ArtifactRef,
	EvidenceItem,
	RunEvent,
	RunState,
	StepResult,
} from "@main/diagnostic-tests/types";

export interface LiveRun {
	runId: string;
	fileName: string;
	state: RunState;
	steps: StepResult[];
	evidence: EvidenceItem[];
	artifacts: ArtifactRef[];
	startedAt: number;
}

export function beginLiveRun(fileName: string): LiveRun {
	return {
		runId: "",
		fileName,
		state: "queued",
		steps: [],
		evidence: [],
		artifacts: [],
		startedAt: Date.now(),
	};
}

function withStep(steps: StepResult[], step: StepResult): StepResult[] {
	const at = steps.findIndex((existing) => existing.index === step.index);
	if (at === -1) return [...steps, step].sort((left, right) => left.index - right.index);

	return steps.map((existing) => (existing.index === step.index ? step : existing));
}

export function reduceRunEvent(current: LiveRun | null, event: RunEvent): LiveRun | null {
	if (!current) return current;
	if (current.runId && current.runId !== event.runId) return current;

	const claimed = { ...current, runId: event.runId };

	switch (event.type) {
		case "state":
			return { ...claimed, state: event.state };
		case "step":
			return { ...claimed, steps: withStep(claimed.steps, event.step) };
		case "evidence":
			return { ...claimed, evidence: [...claimed.evidence, event.item] };
		case "artifact":
			return { ...claimed, artifacts: [...claimed.artifacts, event.artifact] };
		case "finished":
			return {
				...claimed,
				state: event.record.state,
				steps: event.record.steps,
				evidence: event.record.evidence,
			};
	}
}
