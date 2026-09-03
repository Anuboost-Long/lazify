import { AssertionFailure, describeError, RunCancelled } from "../errors";
import type { ParsedStep, StepContext } from "../steps";
import type { ArtifactRef, StepResult } from "../types";

export type StepOutcome = "passed" | "failed" | "cancelled" | "infrastructure-error";

export interface StepHooks {
	onStep(result: StepResult): void;
	captureFailure(step: ParsedStep): Promise<ArtifactRef[]>;
	drainArtifacts(): ArtifactRef[];
}

export interface StepExecution {
	results: StepResult[];
	outcome: StepOutcome;
	summary: string;
}

function pendingResult(step: ParsedStep): StepResult {
	return {
		index: step.index,
		kind: step.kind,
		description: step.description,
		status: "pending",
		startedAt: null,
		durationMs: 0,
		message: "",
		artifacts: [],
	};
}

function classify(error: unknown): StepOutcome {
	if (error instanceof RunCancelled) return "cancelled";

	return error instanceof AssertionFailure ? "failed" : "infrastructure-error";
}

function detailsOf(error: unknown): string {
	if (!(error instanceof AssertionFailure)) return "";

	const details = error.details.trim();

	return details.startsWith(error.message) ? details.slice(error.message.length).trim() : details;
}

export async function executeSteps(
	steps: ParsedStep[],
	context: StepContext,
	hooks: StepHooks,
): Promise<StepExecution> {
	const results = steps.map(pendingResult);

	for (const step of steps) {
		const result = results[step.index];
		const startedAt = Date.now();

		result.status = "running";
		result.startedAt = new Date().toISOString();
		hooks.onStep(result);

		try {
			await step.run(context);
			result.status = "passed";
			result.artifacts = hooks.drainArtifacts();
			result.durationMs = Date.now() - startedAt;
			hooks.onStep(result);
		} catch (error) {
			const outcome = classify(error);

			result.status = outcome === "cancelled" ? "skipped" : "failed";
			result.durationMs = Date.now() - startedAt;
			result.message = [describeError(error), detailsOf(error)].filter(Boolean).join("\n");
			result.artifacts = [
				...hooks.drainArtifacts(),
				...(outcome === "cancelled" ? [] : await hooks.captureFailure(step)),
			];

			hooks.onStep(result);

			for (const remaining of results.slice(step.index + 1)) {
				remaining.status = "skipped";
				hooks.onStep(remaining);
			}

			return { results, outcome, summary: `${step.description} — ${describeError(error)}` };
		}
	}

	return { results, outcome: "passed", summary: "" };
}
