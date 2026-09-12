import { describeSelector } from "../flow/read-selector";
import type { ElementSelector } from "../types";

export type RecordedStepKind = "open" | "tap" | "input" | "expectVisible" | "dragDrop" | "uploadFile";

export interface RecordedStep {
	kind: RecordedStepKind;
	selector?: ElementSelector;
	value?: string;
	valueFrom?: string;
	url?: string;
	/** dragDrop only: where the drag ends up. */
	targetSelector?: ElementSelector;
	/** uploadFile only: the fixture file copied into the project, relative to it. */
	file?: string;
	at: number;
	description: string;
}

const FOLLOW_ON_NAVIGATION_MS = 2000;

export function describeRecordedStep(step: RecordedStep): string {
	switch (step.kind) {
		case "open":
			return `Open ${step.url ?? ""}`;
		case "tap":
			return `Tap ${describeSelector(step.selector ?? {})}`;
		case "expectVisible":
			return `Expect visible ${describeSelector(step.selector ?? {})}`;
		case "input": {
			const what = step.valueFrom || JSON.stringify(step.value ?? "");

			return `Enter ${what} into ${describeSelector(step.selector ?? {})}`;
		}
		case "dragDrop":
			return `Drag ${describeSelector(step.selector ?? {})} to ${describeSelector(step.targetSelector ?? {})}`;
		case "uploadFile":
			return `Upload ${step.file ?? ""} to ${describeSelector(step.selector ?? {})}`;
	}
}

function sameTarget(left: RecordedStep, right: RecordedStep): boolean {
	return JSON.stringify(left.selector ?? {}) === JSON.stringify(right.selector ?? {});
}

export function collapseSteps(steps: RecordedStep[]): RecordedStep[] {
	return steps.reduce<RecordedStep[]>((kept, step) => {
		const previous = kept.at(-1);

		if (!previous) return [step];

		if (step.kind === "input" && previous.kind === "input" && sameTarget(previous, step)) {
			return [...kept.slice(0, -1), step];
		}

		if (
			step.kind === "open" &&
			previous.kind !== "open" &&
			step.at - previous.at < FOLLOW_ON_NAVIGATION_MS
		) {
			return kept;
		}

		if (step.kind === "open" && previous.kind === "open" && previous.url === step.url) {
			return kept;
		}

		return [...kept, step];
	}, []);
}
